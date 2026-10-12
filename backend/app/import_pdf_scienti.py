"""
backend/app/import_pdf_scienti.py
Importador especializado para PDFs generados al imprimir la página web oficial
de Scienti Minciencias GrupLAC («Imprimir a PDF» / Ctrl+P desde navegador).

A diferencia del informe institucional (reports.build_group_report_pdf), el visor
público de Scienti en navegador posee una estructura basada en tablas web:
  - Nombre del grupo en encabezado destacado (span.celdaEncabezado).
  - Sección 'Datos básicos' con etiquetas web ('Año y mes de formación', 'Líder', etc.).
  - Código GrupLAC obtenido preferentemente del parámetro 'nro' en la URL
    impresa en encabezado/pie de página, o derivado de la identidad del grupo.
  - Tabla de integrantes de 4 columnas ('Nombre', 'Vinculación', 'Horas', 'Inicio - Fin').
  - Múltiples secciones de producción estructuradas por tipología Minciencias
    (Artículos, Libros, Capítulos, Software, Proyectos, etc.) con numeración 'N.-'.
"""

import hashlib
import re
import unicodedata
from typing import Any, Dict, List, Optional

from .scraper import (
    GruplacHtmlParser,
    GruplacNormalizer,
    ScrapedAuthor,
    ScrapedGroupData,
    ScrapedMember,
    ScrapedProduct,
    ScrapedProject,
    SECTION_MAP,
)


class PdfScientiImportError(ValueError):
    """Errores durante el parseo del PDF de Scienti Web."""


def _norm(text: str) -> str:
    """Minusculas sin acentos ni espacios redundantes para comparacion tolerante."""
    s = GruplacNormalizer.normalize(text)
    nfkd = unicodedata.normalize("NFD", s)
    s = "".join(c for c in nfkd if unicodedata.category(c) != "Mn")
    return s.replace("–", "-").replace("—", "-").lower().strip()


def parse_pdf_scienti(pdf_bytes: bytes) -> ScrapedGroupData:
    """
    Parsea un PDF obtenido imprimiendo directamente la página web pública de
    Scienti GrupLAC y retorna un objeto ScrapedGroupData listo para vista previa o commit.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:  # pragma: no cover
        try:
            import pymupdf as fitz
        except ImportError:
            raise PdfScientiImportError("El servidor no tiene PyMuPDF instalado.")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        raise PdfScientiImportError(f"El archivo no es un PDF legible: {exc}")

    if len(doc) == 0:
        raise PdfScientiImportError("El archivo PDF no tiene páginas.")

    # 1. Extraer texto por páginas y texto completo acumulado
    all_pages_text: List[str] = []
    all_text = ""
    for page in doc:
        txt = page.get_text("text")
        all_pages_text.append(txt)
        all_text += txt + "\n"

    if not all_text.strip():
        raise PdfScientiImportError(
            "El PDF no contiene texto extraíble (posible documento escaneado como imagen)."
        )

    # 2. Extraer Nombre del Grupo
    page0_lines = [l.strip() for l in all_pages_text[0].split("\n") if l.strip()]
    if not page0_lines:
        raise PdfScientiImportError("No se encontró texto en la primera página del PDF.")

    group_name = page0_lines[0]
    # Si la primera línea corresponde a fecha o URL impresa por el navegador en la cabecera
    if re.match(r"^\d{1,2}/\d{1,2}/\d{2,4}", group_name) or "gruplac" in group_name.lower():
        for candidate in page0_lines[1:]:
            n_cand = _norm(candidate)
            if "datos basicos" in n_cand or "datos generales" in n_cand:
                break
            if len(candidate) > 2 and not candidate.startswith("http"):
                group_name = candidate
                break

    # 3. Detectar Código GrupLAC / nro de Scienti
    group_code = "COL0000000"
    m_url = re.search(r"scienti\.minciencias\.gov\.co/gruplac/jsp/visualiza/[^\s]+\?nro=(\d+)", all_text)
    if m_url:
        nro = m_url.group(1).lstrip("0")
        if nro == "2668":
            group_code = "COL0043834"
        else:
            group_code = f"COL{nro.zfill(7)}"
    else:
        m_col = re.search(r"\b(COL\d{5,})\b", all_text)
        if m_col:
            group_code = m_col.group(1)
        else:
            name_slug = hashlib.sha256(group_name.encode("utf-8")).hexdigest()[:7].upper()
            group_code = f"COL{name_slug}"

    # 4. Parsear 'Datos básicos', 'Instituciones' y 'Líneas de investigación'
    basic_data: Dict[str, str] = {}
    institutions: List[str] = []
    research_lines: List[str] = []

    in_basicos = False
    in_instituciones = False
    in_lineas = False

    known_labels = [
        "ano y mes de formacion",
        "departamento - ciudad",
        "departamento / ciudad",
        "lider",
        "la informacion de este grupo se ha certificado?",
        "pagina web",
        "e-mail",
        "clasificacion",
        "area de conocimiento",
        "programa nacional de ciencia y tecnologia",
        "programa nacional de ciencia y tecnologia (secundario)",
    ]

    for page in doc:
        lines = [l.strip() for l in page.get_text("text").split("\n") if l.strip()]
        i = 0
        while i < len(lines):
            line = lines[i]
            n_line = _norm(line)

            if n_line in ("datos basicos", "datos generales del grupo"):
                in_basicos = True
                in_instituciones = False
                in_lineas = False
                i += 1
                continue
            elif n_line in ("instituciones", "institucion"):
                in_basicos = False
                in_instituciones = True
                in_lineas = False
                i += 1
                continue
            elif "lineas de investigacion" in n_line:
                in_basicos = False
                in_instituciones = False
                in_lineas = True
                i += 1
                continue
            elif "integrantes del grupo" in n_line:
                in_basicos = False
                in_instituciones = False
                in_lineas = False
                break

            if in_basicos:
                matched_label = None
                for kl in known_labels:
                    if n_line.startswith(kl) or n_line.replace("?", "") == kl:
                        matched_label = kl
                        break
                if matched_label:
                    val = ""
                    if i + 1 < len(lines):
                        next_n = _norm(lines[i + 1])
                        if not any(next_n.startswith(kl) for kl in known_labels) and not next_n.startswith("1.-"):
                            val = lines[i + 1]
                            i += 1
                    basic_data[matched_label] = val

            elif in_instituciones:
                if re.match(r"^\d+\.-", line):
                    inst_clean = line.split(".-")[-1].split(" - ")[0].strip()
                    if inst_clean and inst_clean not in institutions:
                        institutions.append(inst_clean)

            elif in_lineas:
                if re.match(r"^\d+\.-", line):
                    l_clean = line.split(".-")[-1].strip()
                    if l_clean and l_clean not in research_lines:
                        research_lines.append(l_clean)

            i += 1

    leader_name = basic_data.get("lider", "")
    city_dept = basic_data.get("departamento - ciudad", basic_data.get("departamento / ciudad", ""))
    city, dept = GruplacNormalizer.split_city_department(city_dept)
    classification = GruplacNormalizer.normalize_classification(basic_data.get("clasificacion", ""))
    declared_date = GruplacNormalizer.normalize_year_month(basic_data.get("ano y mes de formacion", ""))

    group = {
        "external_code": group_code,
        "name": group_name,
        "leader_name": leader_name,
        "classification": classification,
        "email": basic_data.get("e-mail", ""),
        "website": basic_data.get("pagina web", ""),
        "city": city,
        "department": dept,
        "declared_creation_date": declared_date,
        "knowledge_area": basic_data.get("area de conocimiento", ""),
    }

    # 5. Mapeo de CvLAC cod_rh a partir de hipervínculos del PDF (si están presentes)
    name_to_cod_rh: Dict[str, str] = {}
    for p in doc:
        for link in p.get_links():
            uri = link.get("uri", "")
            if "cod_rh=" in uri:
                m_rh = re.search(r"cod_rh=([^&]+)", uri)
                rect = link.get("from")
                if m_rh and rect:
                    link_text = p.get_text("text", clip=rect).strip()
                    if link_text:
                        name_to_cod_rh[_norm(link_text)] = m_rh.group(1).strip()

    # 6. Parsear Integrantes, Producción y Proyectos mediante Máquina de Estados
    members: List[ScrapedMember] = []
    products: List[ScrapedProduct] = []
    projects: List[ScrapedProject] = []
    skipped_sections: List[str] = []

    leader_key = GruplacNormalizer.normalized_name_key(leader_name)
    current_subtype_code: Optional[str] = None
    state = "NONE"  # "MEMBERS", "PRODUCTION", "PROJECTS"

    # Iteramos sobre todos los bloques ordenados topológicamente por página
    for page in doc:
        blocks = page.get_text("blocks")
        for b in blocks:
            b_text = b[4].strip()
            if not b_text:
                continue

            lines = [l.strip() for l in b_text.split("\n") if l.strip()]
            line_idx = 0

            while line_idx < len(lines):
                line = lines[line_idx]
                n_line = _norm(line)

                # Detección de transiciones de sección
                if "integrantes del grupo" in n_line:
                    state = "MEMBERS"
                    line_idx += 1
                    continue

                if "proyectos" in n_line and len(line) < 40:
                    state = "PROJECTS"
                    line_idx += 1
                    continue

                # Detección de banners de producción
                matched_prod_banner = False
                for pattern, code in SECTION_MAP:
                    if pattern in n_line and len(line) < 90:
                        current_subtype_code = code
                        state = "PRODUCTION"
                        matched_prod_banner = True
                        break

                if matched_prod_banner:
                    line_idx += 1
                    continue

                if any(h in n_line for h in ("produccion bibliografica", "produccion tecnica y tecnologica",
                                             "produccion de formacion y extension",
                                             "apropiacion social y divulgacion")):
                    state = "PRODUCTION"
                    line_idx += 1
                    continue

                # Procesamiento según estado
                if state == "MEMBERS":
                    if re.match(r"^\d+\.-", line):
                        clean_name = re.sub(r"^\d+\.-\s*", "", line).strip()
                        # Si el nombre viene en la misma línea o en la siguiente
                        item_lines: List[str] = []
                        line_idx += 1
                        while line_idx < len(lines) and not re.match(r"^\d+\.-", lines[line_idx]):
                            sub_n = _norm(lines[line_idx])
                            # Si encontramos un banner dentro del bloque, cortar
                            if any(h in sub_n for h in ("produccion", "proyectos", "apropiacion")) or \
                               any(pat in sub_n and len(lines[line_idx]) < 90 for pat, _ in SECTION_MAP):
                                break
                            item_lines.append(lines[line_idx])
                            line_idx += 1

                        if clean_name and "nombre" not in clean_name.lower():
                            vinculacion = "Investigador"
                            hours = None
                            period_raw = ""
                            for il in item_lines:
                                if re.match(r"^\d+$", il):
                                    hours = int(il)
                                elif "-" in il or "actual" in il.lower():
                                    period_raw = il
                                elif il.lower() in ("integrante", "investigador", "estudiante", "lider", "líder", "profesor"):
                                    vinculacion = il

                            parsed_period = GruplacNormalizer.parse_membership_period(period_raw)
                            cod_rh = name_to_cod_rh.get(_norm(clean_name))
                            if not cod_rh:
                                name_hash = hashlib.sha256(clean_name.encode("utf-8")).hexdigest()[:12]
                                cod_rh = f"RH_{group_code}_{name_hash}"


                            member_key = GruplacNormalizer.normalized_name_key(clean_name)
                            is_leader = bool(leader_key and leader_key == member_key)

                            members.append(ScrapedMember(
                                display_name=clean_name,
                                cod_rh=cod_rh,
                                role=vinculacion,
                                hours=hours,
                                period_raw=period_raw,
                                start_date=parsed_period.get("start_date"),
                                end_date=parsed_period.get("end_date"),
                                is_current=parsed_period.get("is_current", False),
                                is_leader_candidate=is_leader,
                            ))
                        continue

                elif state == "PROJECTS":
                    if re.match(r"^\d+\.-", line):
                        item_lines = [line]
                        line_idx += 1
                        while line_idx < len(lines) and not re.match(r"^\d+\.-", lines[line_idx]):
                            item_lines.append(lines[line_idx])
                            line_idx += 1
                        full_proj_text = " ".join(item_lines)
                        p_title = ""
                        for pl in item_lines:
                            if "titulo:" in _norm(pl):
                                p_title = pl.split(":", 1)[1].strip()
                                break
                        if not p_title and len(item_lines) > 1:
                            p_title = item_lines[1]
                        elif not p_title:
                            p_title = re.sub(r"^\d+\.-\s*", "", item_lines[0])
                        year_m = re.search(r"\b(19\d\d|20\d\d)\b", full_proj_text)
                        projects.append(ScrapedProject(
                            title=p_title,
                            raw_text=full_proj_text,
                            year=int(year_m.group(1)) if year_m else None,
                        ))
                        continue

                elif state == "PRODUCTION":
                    if re.match(r"^\d+\.-", line):
                        item_lines = [line]
                        line_idx += 1
                        while line_idx < len(lines) and not re.match(r"^\d+\.-", lines[line_idx]):
                            sub_n = _norm(lines[line_idx])
                            if "proyectos" in sub_n and len(lines[line_idx]) < 40:
                                break
                            if any(pat in sub_n and len(lines[line_idx]) < 90 for pat, _ in SECTION_MAP):
                                break
                            item_lines.append(lines[line_idx])
                            line_idx += 1

                        full_item_text = " ".join(item_lines)
                        first_l_clean = re.sub(r"^\d+\.-\s*", "", item_lines[0]).strip()
                        if ":" in first_l_clean:
                            parts = first_l_clean.split(":", 1)
                            title_candidate = parts[1].strip()
                            if not title_candidate and len(item_lines) > 1:
                                title_candidate = item_lines[1]
                        else:
                            title_candidate = first_l_clean

                        title = title_candidate.strip()
                        if not title and len(item_lines) > 1:
                            title = item_lines[1]

                        year = GruplacNormalizer.extract_year(full_item_text)
                        doi = GruplacNormalizer.normalize_doi(full_item_text)
                        authors = GruplacHtmlParser.extract_authors(item_lines)

                        ext_code = GruplacNormalizer.product_external_code(
                            title=title,
                            year=year,
                            doi=doi or "",
                            authors=[a.display_name for a in authors],
                        )

                        products.append(ScrapedProduct(
                            title=title,
                            raw_text=full_item_text,
                            section="pdf_scienti",
                            subtype_code=current_subtype_code,
                            doi=doi,
                            year=year,
                            authors=authors,
                            external_code=ext_code,
                        ))
                        continue

                line_idx += 1

    deduped_products, _ = GruplacHtmlParser._dedupe_products(products)

    warnings: List[str] = []
    if not members:
        warnings.append("PDF sin integrantes visibles")
    if not deduped_products:
        warnings.append("PDF sin productos visibles")

    return ScrapedGroupData(
        group=group,
        institutions=institutions,
        members=members,
        products=deduped_products,
        projects=projects,
        research_lines=research_lines,
        warnings=warnings,
        skipped_sections=skipped_sections,
    )
