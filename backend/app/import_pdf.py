"""
T-13: Importacion de grupos desde PDF (Taller 2, req. 7).

Objetivos realistas del PDF (Scienti NO exporta PDF desde su visor):
  1. El informe "estilo GrupLAC" que el propio sistema genera
     (reports.build_group_report_pdf) — fixture determinista de los tests.
  2. Print-to-PDF de la pagina GrupLAC del visor de Scienti (best effort).

Ambos comparten la estructura de secciones/etiquetas que este parser ataca.
La identidad del grupo es el "Codigo GrupLAC" (COL...); el nro interno de
Scienti NO aparece en el PDF y no se intenta adivinar (trampa de identidad:
ver datos_abiertos_grupos).

El PDF es una fuente fragil: celdas envueltas, secciones ausentes, subtipos
sin match. El parser es tolerante (warnings) y solo exige lo irreducible:
texto extraible, seccion "Datos basicos", codigo COL valido y nombre.
"""

import io
import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

from . import repository
from . import scraper
from .scraper import (
    GruplacNormalizer,
    ScrapedAuthor,
    ScrapedGroupData,
    ScrapedMember,
    ScrapedProduct,
    ScrapedProject,
)

# Banda vertical util del informe (coordenadas top-down de PyMuPDF): fuera
# de [50, 790] viven la barra azul de cabecera (~21pt) y el folio (~811pt).
_BODY_Y_MIN = 50.0
_BODY_Y_MAX = 790.0

# Tolerancia al agrupar palabras en lineas visuales (puntos).
_LINE_Y_TOL = 3.0

_COL_CODE_RE = re.compile(r"^COL\d{4,}$")


class PdfImportError(ValueError):
    """Errores fatales del PDF (el endpoint los mapea a HTTP 400)."""


def _norm(text: str) -> str:
    """Minusculas sin acentos ni espacios multiples: para matchear secciones
    y etiquetas contra alias (agnostico al case real del PDF)."""
    s = GruplacNormalizer.normalize(text)
    nfkd = unicodedata.normalize("NFD", s)
    s = "".join(c for c in nfkd if unicodedata.category(c) != "Mn")
    # Guiones tipograficos de Scienti ('Inicio – Fin') a guion simple.
    return s.replace("–", "-").replace("—", "-").lower()


# Seccion -> clave de parseo. Alias normalizados (_norm) de los banners del
# informe propio y del visor GrupLAC de Scienti.
_SECTION_ALIASES: Dict[str, str] = {}
for _alias, _key in [
    ("datos basicos", "basicos"),
    ("datos generales del grupo", "basicos"),          # visor Scienti
    ("mision, vision y descripcion", "skip"),
    ("lineas de investigacion declaradas", "lineas"),
    ("lineas de investigacion", "lineas"),
    ("integrantes del grupo", "integrantes"),
    ("produccion bibliografica y academica", "produccion"),
    ("produccion bibliografica", "produccion"),
    ("proyectos de investigacion", "proyectos"),
]:
    _SECTION_ALIASES[_norm(_alias)] = _key

# Etiqueta (normalizada) -> clave del dict group. "" = reconocida pero no se
# importa (Sigla/Subarea/Estado viven en columnas propias del sistema).
_LABEL_ALIASES: Dict[str, str] = {}
for _alias, _key in [
    ("nombre del grupo", "name"),
    ("sigla", ""),
    ("codigo gruplac", "external_code"),
    ("institucion aval", "institution"),
    ("clasificacion minciencias", "classification"),
    ("fecha de creacion declarada", "declared_creation_date"),
    ("area de conocimiento", "knowledge_area"),
    ("subarea", ""),
    ("departamento / ciudad", "location"),
    ("departamento - ciudad", "location"),             # visor Scienti
    ("correo electronico", "email"),
    ("e mail", "email"),
    ("sitio web", "website"),
    ("estado", ""),
    ("lider del grupo", "leader_name"),
    ("lider", "leader_name"),                          # visor Scienti
]:
    _LABEL_ALIASES[_norm(_alias)] = _key

# Frontera entre la columna de etiquetas (5cm) y la de valores del informe:
# las palabras a la derecha pertenecen al valor.
_KV_X_SPLIT = 195.0

# Columnas de la tabla de integrantes (informe): Codigo | Nombre | Rol |
# Vinculacion (2.6 / 9.4 / 2.5 / 2.5 cm desde el margen izquierdo de 2cm).
_MEMBERS_X = (130.0, 397.0, 468.0)

# Columnas de la tabla de proyectos: Titulo | Tipo | Estado | Inicio-Fin
# (9 / 3 / 2 / 3 cm).
_PROJECTS_X = (312.0, 397.0, 454.0)

# Linea de meta de producto ('Año: 2021 | DOI: ... | Estado: ... | Autores: ...').
_META_RE = re.compile(r"^\s*(a[nñ]o|doi|estado|autores)\s*:", re.IGNORECASE)


def _extract_lines(pdf_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Extrae las lineas visuales del PDF (banda-y tolerante) fuera del marco,
    ordenadas por (pagina, y, x). Cada linea: {"page", "y", "block",
    "words": [(x0, text, block)]} — el bloque de PyMuPDF agrupa las lineas
    envueltas de un mismo parrafo/celda (se usa para unir metas largas).
    PdfImportError si el archivo no es PDF o no tiene texto extraible.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:  # pragma: no cover - deploy sin PyMuPDF
        try:
            import pymupdf as fitz  # PyMuPDF >= 1.24.10 renombra el modulo
        except ImportError:
            raise PdfImportError("El servidor no tiene PyMuPDF instalado (import_pdf).")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        raise PdfImportError(f"El archivo no es un PDF legible: {exc}")

    lines: List[Dict[str, Any]] = []
    for pno, page in enumerate(doc):
        words = page.get_text("words")  # (x0, y0, x1, y1, word, block, line, word_no)
        if not words:
            continue
        # Banda por y0 con tolerancia; dentro de la banda, orden por x.
        bands: List[Tuple[float, List[Tuple[float, str, int]]]] = []
        for w in sorted(words, key=lambda t: (round(t[1], 1), t[0])):
            x0, y0, text, block = w[0], w[1], w[4], w[5]
            if y0 < _BODY_Y_MIN or y0 > _BODY_Y_MAX:
                continue  # cabecera azul / folio
            if bands and abs(bands[-1][0] - y0) <= _LINE_Y_TOL:
                bands[-1][1].append((x0, text, block))
            else:
                bands.append((y0, [(x0, text, block)]))
        for y0, ws in bands:
            lines.append({
                "page": pno,
                "y": y0,
                "block": ws[0][2],
                "words": sorted(ws, key=lambda t: t[0]),
            })
    if not lines:
        raise PdfImportError(
            "El PDF no tiene texto extraible (solo imagenes escaneadas). "
            "Exporta el informe con texto real (p. ej. el PDF del sistema)."
        )
    return lines


def _line_text(line: Dict[str, Any]) -> str:
    return " ".join(w[1] for w in line["words"])


def _split_section(lines: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Reparte las lineas en secciones segun los banners conocidos. Las
    lineas previas al primer banner (titulo del informe, resumen) se
    descartan salvo el nombre del grupo (linea inicial)."""
    sections: Dict[str, List[Dict[str, Any]]] = {}
    current = "preambulo"
    for line in lines:
        key = _SECTION_ALIASES.get(_norm(_line_text(line)))
        if key is not None:
            current = key
            sections.setdefault(current, [])
            continue
        sections.setdefault(current, []).append(line)
    return sections


def _match_label(candidate: str) -> Optional[str]:
    """Clave del group dict para una etiqueta conocida (o None si no es)."""
    return _LABEL_ALIASES.get(_norm(candidate))


def _parse_kv_lines(lines: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Tabla 2-columnas del informe (etiqueta | valor) a dict. Tolera etiquetas
    y valores envueltos en varias lineas con un buffer rodante: cada fila
    empieza cuando el texto izquierdo acumulado matchea una etiqueta conocida.
    """
    rows: Dict[str, str] = {}
    pending = ""        # texto de etiqueta acumulandose (posible envoltura)
    pending_value = ""  # valores vistos mientras la etiqueta estaba incompleta
    cur_key: Optional[str] = None
    cur_value = ""

    for line in lines:
        left = " ".join(w[1] for w in line["words"] if w[0] < _KV_X_SPLIT)
        right = " ".join(w[1] for w in line["words"] if w[0] >= _KV_X_SPLIT)
        if left:
            cand = (pending + " " + left).strip()
            key = _match_label(cand)
            if key is not None:
                if cur_key is not None:
                    rows[cur_key] = cur_value
                cur_key = key
                cur_value = (pending_value + " " + right).strip()
                pending, pending_value = "", ""
            else:
                pending = cand
                pending_value = (pending_value + " " + right).strip()
        else:
            # Sin texto izquierdo: continuacion envuelta del valor actual.
            if cur_key is not None:
                cur_value = (cur_value + " " + right).strip()
            elif pending:
                pending_value = (pending_value + " " + right).strip()
    if cur_key is not None:
        rows[cur_key] = cur_value
    # Etiquetas reconocidas pero sin valor importable no producen fila.
    return {k: v for k, v in rows.items() if k}


def _split_location(value: str) -> Tuple[str, str]:
    """"Departamento / Ciudad" del informe viene pegado con espacio
    ('Cesar Valledupar'); se separa con el criterio del scraper si trae
    guion y, si no, departamento = todo menos la ultima palabra."""
    city, dept = GruplacNormalizer.split_city_department(value)
    if city and not dept:
        parts = city.split()
        if len(parts) >= 2:
            return parts[-1], " ".join(parts[:-1])
    return city, dept


def _parse_basicos(lines: List[Dict[str, Any]]) -> Tuple[Dict[str, str], List[str]]:
    """Seccion 'Datos basicos' -> dict group del DTO."""
    kv = _parse_kv_lines(lines)

    code = GruplacNormalizer.normalize(kv.get("external_code", "")).upper()
    if not _COL_CODE_RE.match(code):
        raise PdfImportError(
            f"El PDF no trae un codigo GrupLAC valido (se espera 'COL...'): "
            f"'{code or '(ausente)'}'. El nro interno de Scienti no sirve como "
            "identidad (trampa de identidad COL vs nro)."
        )
    name = GruplacNormalizer.normalize(kv.get("name", ""))
    if not name:
        raise PdfImportError("El PDF no trae el nombre del grupo.")

    city, dept = _split_location(kv.get("location", ""))
    inst_raw = kv.get("institution", "")
    institutions = [p.strip() for p in re.split(r"\s*\|\s*", inst_raw) if p.strip()]

    return {
        "external_code": code,
        "name": name,
        "leader_name": GruplacNormalizer.normalize(kv.get("leader_name", "")),
        "classification": GruplacNormalizer.normalize_classification(kv.get("classification", "")),
        "email": GruplacNormalizer.normalize(kv.get("email", "")),
        "website": GruplacNormalizer.normalize(kv.get("website", "")),
        "city": city,
        "department": dept,
        "declared_creation_date": _parse_creation_date(kv.get("declared_creation_date", "")),
        "knowledge_area": GruplacNormalizer.normalize(kv.get("knowledge_area", "")),
    }, institutions


def _parse_creation_date(value: str) -> str:
    """El informe muestra 'YYYY-MM' (input type=month); tolera ISO completo y
    el 'YYYY - M' del visor Scienti."""
    s = GruplacNormalizer.normalize(value)
    if not s:
        return ""
    m = re.match(r"^(\d{4})-(\d{1,2})", s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}"
    return GruplacNormalizer.normalize_year_month(s)


def _parse_members(lines: List[Dict[str, Any]]) -> List[ScrapedMember]:
    """Tabla 'Integrantes del grupo': Codigo | Nombre | Rol | Vinculacion.
    Fila nueva = columna Codigo con texto (la identidad del integrante); el
    resto de lineas son celdas envueltas de la fila en curso — la vinculacion
    '2021-06-01 – 2023-06-30' no cabe en 2.5cm y salta de linea. Encabezado
    repetido se omite."""
    members: List[ScrapedMember] = []
    cur: Optional[Dict[str, str]] = None
    for line in lines:
        col_code = " ".join(w[1] for w in line["words"] if w[0] < _MEMBERS_X[0])
        col_name = " ".join(w[1] for w in line["words"] if _MEMBERS_X[0] <= w[0] < _MEMBERS_X[1])
        col_role = " ".join(w[1] for w in line["words"] if _MEMBERS_X[1] <= w[0] < _MEMBERS_X[2])
        col_dates = " ".join(w[1] for w in line["words"] if w[0] >= _MEMBERS_X[2])
        # Encabezado (o su repeticion por salto de pagina): ignorar.
        if _norm(f"{col_code} {col_name} {col_role} {col_dates}".strip()) in {
            _norm("codigo nombre rol vinculacion"),
        }:
            continue
        if col_code:
            if cur:
                members.append(_member_from_row(cur))
            cur = {"code": col_code, "name": col_name, "role": col_role, "dates": col_dates}
        elif cur:
            if col_name:
                cur["name"] = (cur["name"] + " " + col_name).strip()
            if col_role:
                cur["role"] = (cur["role"] + " " + col_role).strip()
            if col_dates:
                cur["dates"] = (cur["dates"] + " " + col_dates).strip()
    if cur:
        members.append(_member_from_row(cur))
    return members


def _member_from_row(row: Dict[str, str]) -> ScrapedMember:
    name = GruplacNormalizer.normalize(row["name"])
    start, end = _parse_period(row["dates"])
    return ScrapedMember(
        display_name=name,
        cod_rh=GruplacNormalizer.normalize(row["code"]) or None,
        role=GruplacNormalizer.normalize(row["role"]) or "Investigador",
        period_raw=GruplacNormalizer.normalize(row["dates"]),
        start_date=start,
        end_date=end,
        is_current=not end,
        is_leader_candidate=False,
        warnings=[] if name else ["integrante sin nombre"],
    )


def _parse_period(value: str) -> Tuple[Optional[str], Optional[str]]:
    """'2020-01-01 - 2023-06-30' (el informe usa guion largo –) o una sola
    fecha = vinculacion vigente. Delega los formatos no ISO al scraper."""
    s = GruplacNormalizer.normalize(value)
    if not s:
        return None, None
    iso = re.match(r"^(\d{4}-\d{2}-\d{2})\s*[–-]+\s*(\d{4}-\d{2}-\d{2})$", s)
    if iso:
        return iso.group(1), iso.group(2)
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s, None
    # El visor GrupLAC usa formatos tipo 'julio/2019 - Actual' o '2019 -':
    parsed = scraper.GruplacNormalizer.parse_membership_period(s)
    return parsed.get("start_date"), parsed.get("end_date")


def _parse_products(lines: List[Dict[str, Any]], warnings: List[str]) -> List[ScrapedProduct]:
    """
    'Produccion bibliografica y academica': bandas de familia, subtipos con
    '(N)' y productos como titulo + linea de meta ('Ano: ... | DOI: ...').
    El subtipo se resuelve por NOMBRE contra el catalogo (funciona sin BD:
    get_product_catalogs cae al archivo); sin match el producto entra sin
    clasificar (ruta auditable del commit).
    """
    name_to_code: Dict[str, str] = {}
    family_names: Dict[str, None] = {}  # set ordenado por claridad
    try:
        catalogs = repository.get_product_catalogs()
        for s in catalogs.get("subtypes", []):
            name_to_code[_norm(s["name"])] = s["code"]
        for f in catalogs.get("families", []):
            family_names[_norm(f["name"])] = None
    except Exception as exc:
        warnings.append(f"catalogo no disponible: {exc}")
    # Etiquetas literales del informe para agrupaciones sin catalogo.
    family_names[_norm("Otros productos")] = None
    family_names[_norm("Otras actividades y producción institucional declarada")] = None
    _UNCLASSIFIED_LABEL = _norm("Sin subtipo clasificado")

    subtype_code: Optional[str] = None
    title_words: List[str] = []
    products: List[ScrapedProduct] = []
    meta_buf: List[str] = []          # linea de meta en curso (puede envolverse)
    meta_block: Optional[int] = None  # bloque PDF de esa linea de meta

    def _flush():
        nonlocal title_words
        if title_words and subtype_code is not None:
            _emit_product(products, " ".join(title_words), subtype_code, warnings)
        elif title_words:
            # Titulo acumulado sin banner de subtipo: familia pura (raro).
            warnings.append(f"producto sin subtipo visible: '{' '.join(title_words)[:60]}...'")
        title_words = []

    def _flush_meta():
        """Emite el producto en curso: su meta termino de envolverse."""
        nonlocal title_words, meta_buf, meta_block
        if meta_buf:
            _emit_meta_product(products, title_words, subtype_code, " ".join(meta_buf), warnings)
            title_words = []
            meta_buf, meta_block = [], None

    for line in lines:
        text = _line_text(line)
        # Banner de familia (p.ej. 'Generacion de Nuevo Conocimiento'): no es
        # un producto; limpia titulos huerfanos en silencio.
        if _norm(text) in family_names:
            _flush_meta()
            title_words = []
            continue
        m = re.match(r"^(.+?)\s+\((\d+)\)\s*$", text)
        if m:
            # Banner de subtipo con conteo. (Tambien atrapa 'Calidad A1 (2)'
            # si la pagina trajera categorias: se resuelve por nombre igual.)
            _flush_meta()
            _flush()
            sub_name = m.group(1).strip()
            if _norm(sub_name) == _UNCLASSIFIED_LABEL:
                # Etiqueta del propio informe para productos ya sin subtipo:
                # entran sin clasificar a proposito (ruta auditable del commit).
                subtype_code = None
            else:
                subtype_code = name_to_code.get(_norm(sub_name))
                if subtype_code is None:
                    warnings.append(f"subtipo sin match en catalogo: '{sub_name}'")
            continue
        if _META_RE.match(text):
            # Linea de meta del producto actual ('Autores: ...' largo se
            # envuelve: la continuacion comparte bloque PDF con esta linea).
            _flush_meta()
            meta_buf, meta_block = [text], line.get("block")
            continue
        if meta_buf and line.get("block") is not None and line.get("block") == meta_block:
            meta_buf.append(text)  # envoltura de la meta en curso
            continue
        _flush_meta()
        # Titulo (puede envolverse en varias lineas).
        title_words.append(text)

    _flush_meta()
    _flush()
    return products


def _emit_product(products: List[ScrapedProduct], title: str, subtype_code: str,
                  warnings: List[str]) -> None:
    products.append(ScrapedProduct(
        title=GruplacNormalizer.normalize(title),
        raw_text=GruplacNormalizer.normalize(title),
        section="pdf",
        subtype_code=subtype_code,
        external_code=GruplacNormalizer.product_external_code(
            GruplacNormalizer.normalize(title), None, ""
        ),
        warnings=[],
    ))


def _emit_meta_product(products: List[ScrapedProduct], title_words: List[str],
                       subtype_code: Optional[str], meta: str,
                       warnings: List[str]) -> None:
    title = GruplacNormalizer.normalize(" ".join(title_words))
    doi = year = None
    authors: List[ScrapedAuthor] = []
    for part in meta.split(" | "):
        part = part.strip()
        m = re.match(r"^Año:\s*(\d{4})", part)
        if m:
            year = int(m.group(1))
            continue
        m = re.match(r"^DOI:\s*(.+)$", part)
        if m:
            doi = GruplacNormalizer.normalize_doi(m.group(1)) or None
            continue
        m = re.match(r"^Autores:\s*(.+)$", part)
        if m:
            names = [n.strip() for n in m.group(1).split(",")]
            if "…" in m.group(1) or "..." in m.group(1):
                # El informe trunca a 8 autores con '…': quitar la marca sin
                # perder el ultimo nombre real.
                names[-1] = names[-1].replace("…", "").replace("...", "").strip()
                warnings.append(f"autores truncados en el PDF: '{title[:50]}'")
            authors = [ScrapedAuthor(display_name=n) for n in names if n]
    raw_text = " | ".join(filter(None, [title, meta]))
    products.append(ScrapedProduct(
        title=title,
        raw_text=GruplacNormalizer.normalize(raw_text),
        section="pdf",
        subtype_code=subtype_code,
        doi=doi,
        year=year,
        authors=authors,
        external_code=GruplacNormalizer.product_external_code(
            title, year, doi or "", authors=[a.display_name for a in authors]
        ),
        warnings=[],
    ))
    if not title:
        warnings.append("producto con meta pero sin titulo visible")


def _parse_projects(lines: List[Dict[str, Any]]) -> List[ScrapedProject]:
    """Tabla 'Proyectos': Titulo | Tipo | Estado | Inicio-Fin. Fila nueva =
    titulo con algo en las columnas de la derecha (la primera linea de una
    fila siempre trae tipo/estado/fechas, posiblemente truncadas); lineas sin
    titulo son celdas envueltas de la fila en curso ('Investigación aplicada'
    y '2022-01-01 – 2024-12-31' no caben en 3cm)."""
    projects: List[ScrapedProject] = []
    cur: Optional[Dict[str, str]] = None
    for line in lines:
        col_title = " ".join(w[1] for w in line["words"] if w[0] < _PROJECTS_X[0])
        col_type = " ".join(w[1] for w in line["words"] if _PROJECTS_X[0] <= w[0] < _PROJECTS_X[1])
        col_status = " ".join(w[1] for w in line["words"] if _PROJECTS_X[1] <= w[0] < _PROJECTS_X[2])
        col_dates = " ".join(w[1] for w in line["words"] if w[0] >= _PROJECTS_X[2])
        if _norm(f"{col_title} {col_type} {col_status} {col_dates}".strip()) == \
                _norm("titulo tipo estado inicio - fin"):
            continue
        if col_title and (col_type or col_status or col_dates):
            if cur:
                projects.append(_project_from_row(cur))
            cur = {"title": col_title, "type": col_type, "status": col_status, "dates": col_dates}
        elif cur:
            if col_title:
                cur["title"] = (cur["title"] + " " + col_title).strip()
            if col_type:
                cur["type"] = (cur["type"] + " " + col_type).strip()
            if col_status:
                cur["status"] = (cur["status"] + " " + col_status).strip()
            if col_dates:
                cur["dates"] = (cur["dates"] + " " + col_dates).strip()
    if cur:
        projects.append(_project_from_row(cur))
    return projects


def _project_from_row(row: Dict[str, str]) -> ScrapedProject:
    title = GruplacNormalizer.normalize(row["title"])
    start_m = re.match(r"^(\d{4})", row["dates"] or "")
    return ScrapedProject(
        title=title,
        year=int(start_m.group(1)) if start_m else None,
        raw_text=" | ".join(filter(None, [title, row["type"], row["status"], row["dates"]])),
    )


def _parse_research_lines(lines: List[Dict[str, Any]]) -> List[str]:
    """Bullets '• <linea>' (informe) o lineas planas (visor Scienti)."""
    out: List[str] = []
    for line in lines:
        text = _line_text(line).lstrip("•·- ").strip()
        if text:
            out.append(GruplacNormalizer.normalize(text))
    return out


def parse_pdf_gruplac(file_bytes: bytes) -> ScrapedGroupData:
    """
    PDF estilo GrupLAC -> ScrapedGroupData (el mismo DTO que consume
    GruplacCommitService). Requisitos duros: texto extraible, seccion
    'Datos basicos', codigo COL valido y nombre del grupo.
    """
    lines = _extract_lines(file_bytes)
    sections = _split_section(lines)
    if "basicos" not in sections:
        raise PdfImportError(
            "El PDF no trae la seccion 'Datos basicos'. Se espera el informe "
            "del sistema o el print-to-PDF de la pagina GrupLAC de Scienti."
        )

    warnings: List[str] = []
    group, institutions = _parse_basicos(sections["basicos"])

    members = _parse_members(sections.get("integrantes", []))
    products = _parse_products(sections.get("produccion", []), warnings)
    projects = _parse_projects(sections.get("proyectos", []))
    research_lines = _parse_research_lines(sections.get("lineas", []))

    if not members:
        warnings.append("PDF sin integrantes visibles")
    if not products:
        warnings.append("PDF sin productos visibles")

    return ScrapedGroupData(
        group=group,
        institutions=institutions,
        members=members,
        products=products,
        projects=projects,
        research_lines=research_lines,
        warnings=warnings,
    )
