"""
Informe PDF de grupo de investigación (estilo GrupLAC) con ReportLab.

Estructura institucional del informe GrupLAC:
  - Cabecera y pie corporativo institucional con 'Página X de Y' (NumberedCanvas)
  - Resumen ejecutivo con 4 tarjetas KPI (Integrantes, Productos, Proyectos, Líneas)
  - Datos básicos del grupo y aval institucional
  - Misión, visión y descripción (cajas destacadas)
  - Líneas de investigación declaradas
  - Integrantes del grupo con roles y periodos
  - Producción bibliográfica y académica agrupada por familia y subtipo Minciencias
  - Proyectos de investigación

Compatible 100% con el importador de PDF interno (parse_pdf_gruplac) y
round-trip determinista de pruebas.
"""
import io
import os
import re
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.pdfgen import canvas

from . import repository
from .scraper import GruplacNormalizer

# ------------------------------------------------------------------
# Fuentes: Arial / DejaVu / Liberation TTF soportan Unicode completo;
# Helvetica (Latin-1) como respaldo.
# ------------------------------------------------------------------
_FONT = "Helvetica"
_FONT_BOLD = "Helvetica-Bold"

_font_candidates = [
    (r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\arialbd.ttf"),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
]
for _reg, _bold in _font_candidates:
    if os.path.exists(_reg) and os.path.exists(_bold):
        try:
            pdfmetrics.registerFont(TTFont("PEAi", _reg))
            pdfmetrics.registerFont(TTFont("PEAi-Bold", _bold))
            _FONT = "PEAi"
            _FONT_BOLD = "PEAi-Bold"
            break
        except Exception:
            pass

# ------------------------------------------------------------------
# Paleta de Colores Moderna y Premium (Institucional UPC & Khemia)
# ------------------------------------------------------------------
_AZUL_NAVY = colors.HexColor("#0f294a")       # Azul corporativo profundo
_AZUL_ACCENT = colors.HexColor("#1d4ed8")     # Azul acento vibrante
_AZUL_SUAVE = colors.HexColor("#f0f4f9")      # Fondo alterno muy sutil
_VERDE_UPC = colors.HexColor("#059669")       # Verde institucional UPC
_DORADO = colors.HexColor("#d97706")          # Ámbar para proyectos
_PURPURA = colors.HexColor("#7c3aed")         # Púrpura para líneas
_GRIS_OSCURO = colors.HexColor("#334155")     # Texto principal
_GRIS_MEDIO = colors.HexColor("#64748b")      # Metadatos y etiquetas secundarias
_GRIS_BORDE = colors.HexColor("#cbd5e1")      # Líneas divisoras sutiles
_BLANCO = colors.white

# Compatibilidad de nombres históricos
_AZUL = _AZUL_NAVY
_AZUL_CLARO = _AZUL_SUAVE
_GRIS = _GRIS_MEDIO

# ------------------------------------------------------------------
# Estilos Tipográficos Jerárquicos
# ------------------------------------------------------------------
_S_TITULO = ParagraphStyle(
    "titulo", fontName=_FONT_BOLD, fontSize=18, leading=22,
    textColor=_AZUL_NAVY, spaceAfter=4
)
_S_SIGLA = ParagraphStyle(
    "sigla", fontName=_FONT_BOLD, fontSize=11, leading=14,
    textColor=_VERDE_UPC, spaceAfter=2
)
_S_SUB = ParagraphStyle(
    "sub", fontName=_FONT, fontSize=8.5, leading=12,
    textColor=_GRIS_MEDIO, spaceAfter=10
)
_S_SECCION = ParagraphStyle(
    "seccion", fontName=_FONT_BOLD, fontSize=11, leading=14,
    textColor=colors.white, backColor=_AZUL_NAVY, borderPadding=(5, 8),
    spaceBefore=14, spaceAfter=6, keepWithNext=True
)
_S_SUBTIPO = ParagraphStyle(
    "subtipo", fontName=_FONT_BOLD, fontSize=9.5, leading=13,
    textColor=_AZUL_ACCENT, spaceBefore=8, spaceAfter=4, keepWithNext=True
)
_S_NORMAL = ParagraphStyle(
    "normal", fontName=_FONT, fontSize=9, leading=12.5,
    textColor=_GRIS_OSCURO, spaceAfter=4
)
_S_CALLOUT = ParagraphStyle(
    "callout", fontName=_FONT, fontSize=8.5, leading=12,
    textColor=_GRIS_OSCURO, leftIndent=8
)
_S_ITEM = ParagraphStyle(
    "item", fontName=_FONT_BOLD, fontSize=8.5, leading=12,
    textColor=_GRIS_OSCURO, spaceBefore=4, spaceAfter=1
)
_S_META = ParagraphStyle(
    "meta", fontName=_FONT, fontSize=8, leading=11,
    textColor=_GRIS_MEDIO, leftIndent=8, spaceAfter=3
)
_S_ETIQUETA = ParagraphStyle(
    "etiqueta", fontName=_FONT_BOLD, fontSize=8.5, leading=11.5,
    textColor=_AZUL_NAVY
)
_S_VALOR = ParagraphStyle(
    "valor", fontName=_FONT, fontSize=8.5, leading=11.5,
    textColor=_GRIS_OSCURO
)
_S_CELDA = ParagraphStyle(
    "celda", fontName=_FONT, fontSize=8, leading=11,
    textColor=_GRIS_OSCURO
)
_S_CELDA_HDR = ParagraphStyle(
    "celda_hdr", fontName=_FONT_BOLD, fontSize=8.5, leading=11.5,
    textColor=_BLANCO
)
_S_KPI_NUM = ParagraphStyle(
    "kpi_num", fontName=_FONT_BOLD, fontSize=16, leading=18,
    alignment=1
)
_S_KPI_LBL = ParagraphStyle(
    "kpi_lbl", fontName=_FONT_BOLD, fontSize=7.5, leading=9,
    alignment=1, textColor=_GRIS_MEDIO
)


def _clean_text(s: str) -> str:
    """Repara mojibake de doble codificación heredado en títulos y autores."""
    if not s:
        return ""
    replacements = {
        "Â¿": "¿", "Â¡": "¡",
        "Ã¡": "á", "Ã©": "é", "Ã­": "í", "Ã³": "ó", "Ãº": "ú",
        "Ã": "Á", "Ã‰": "É", "Ã": "Í", "Ã“": "Ó", "Ãš": "Ú",
        "Ã±": "ñ", "Ã‘": "Ñ",
        "Ã?": "Ó",
    }
    for k, v in replacements.items():
        if k in s:
            s = s.replace(k, v)
    return s


def _p(texto: str, estilo) -> Paragraph:
    return Paragraph(_clean_text(str(texto or "")), estilo)


class NumberedCanvas(canvas.Canvas):
    """
    Canvas de dos pasadas para calcular 'Página X de Y' y dibujar cabecera/pie
    corporativo institucional.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_decorations(num_pages)
            super().showPage()
        super().save()

    def _draw_decorations(self, total_pages):
        ancho, alto = A4
        self.saveState()

        # Cabecera superior institucional
        self.setFillColor(_AZUL_NAVY)
        self.rect(0, alto - 1.2 * cm, ancho, 1.2 * cm, stroke=0, fill=1)

        # Línea de acento verde UPC
        self.setFillColor(_VERDE_UPC)
        self.rect(0, alto - 1.24 * cm, ancho, 0.04 * cm, stroke=0, fill=1)

        # Textos de cabecera
        self.setFillColor(_BLANCO)
        self.setFont(_FONT_BOLD, 8)
        self.drawString(2 * cm, alto - 0.75 * cm, "Khemia · PEA-i  |  Sistema de Información de Investigación")
        self.setFont(_FONT, 8)
        self.drawRightString(ancho - 2 * cm, alto - 0.75 * cm, "Universidad Popular del Cesar · Scienti GrupLAC")

        # Línea separadora de pie
        self.setStrokeColor(_GRIS_BORDE)
        self.setLineWidth(0.5)
        self.line(2 * cm, 1.35 * cm, ancho - 2 * cm, 1.35 * cm)

        # Textos de pie
        self.setFillColor(_GRIS_MEDIO)
        self.setFont(_FONT, 7.5)
        now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
        self.drawString(2 * cm, 0.95 * cm, f"Reporte Institucional · Generado el {now_str}")
        self.drawRightString(ancho - 2 * cm, 0.95 * cm, f"Página {self._pageNumber} de {total_pages}")

        self.restoreState()


def _tabla_kpi_metrics(n_miembros: int, n_prods: int, n_proys: int, n_lineas: int) -> Table:
    """Tarjetas métricas horizontales ejecutivas."""
    s_miembros = ParagraphStyle("km", parent=_S_KPI_NUM, textColor=_AZUL_ACCENT)
    s_prods = ParagraphStyle("kp", parent=_S_KPI_NUM, textColor=_VERDE_UPC)
    s_proys = ParagraphStyle("kpr", parent=_S_KPI_NUM, textColor=_DORADO)
    s_lineas = ParagraphStyle("kl", parent=_S_KPI_NUM, textColor=_PURPURA)

    data = [
        [
            Paragraph(str(n_miembros), s_miembros),
            Paragraph(str(n_prods), s_prods),
            Paragraph(str(n_proys), s_proys),
            Paragraph(str(n_lineas), s_lineas),
        ],
        [
            Paragraph("INTEGRANTES", _S_KPI_LBL),
            Paragraph("PRODUCTOS", _S_KPI_LBL),
            Paragraph("PROYECTOS", _S_KPI_LBL),
            Paragraph("LÍNEAS DE INVESTIGACIÓN", _S_KPI_LBL),
        ],
    ]
    t = Table(data, colWidths=[4.25 * cm] * 4)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), _AZUL_SUAVE),
        ("BOX", (0, 0), (-1, -1), 0.75, _GRIS_BORDE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
        ("TOPPADDING", (0, 1), (-1, 1), 0),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 6),
    ]))
    return t


def _tabla_datos_basicos(grupo) -> Table:
    cat_norm = GruplacNormalizer.normalize_classification(grupo.classification or "")
    cat_str = f"Categoría {cat_norm}" if cat_norm else (grupo.classification or "Sin categorizar")

    filas = [
        ("Nombre del grupo", grupo.name),
        ("Sigla", grupo.acronym),
        ("Código GrupLAC", grupo.external_code),
        ("Institución aval", grupo.institution),
        ("Clasificación Minciencias", cat_str),
        ("Fecha de creación declarada", grupo.declared_creation_date),
        ("Área de conocimiento", grupo.knowledge_area),
        ("Subárea", grupo.knowledge_subarea),
        ("Departamento / Ciudad", f"{grupo.department or ''} {grupo.city or ''}".strip()),
        ("Correo electrónico", grupo.email),
        ("Sitio web", grupo.website),
        ("Estado", grupo.status),
    ]
    filas = [(k, v) for k, v in filas if v]

    if grupo.leader_id:
        try:
            lid = int(grupo.leader_id)
            lider = repository.get_researcher(lid)
            filas.insert(len(filas) - 1, ("Líder del grupo", f"{lider.first_names} {lider.last_names}"))
        except Exception:
            pass

    data = [[_p(k, _S_ETIQUETA), _p(v, _S_VALOR)] for k, v in filas]
    tabla = Table(data, colWidths=[5 * cm, 12 * cm])
    tabla.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, _AZUL_SUAVE]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.HexColor("#f1f5f9")),
    ]))
    return tabla


def _tabla_integrantes(members: list) -> Table:
    data = [[_p("Código", _S_CELDA_HDR), _p("Nombre", _S_CELDA_HDR),
             _p("Rol", _S_CELDA_HDR), _p("Vinculación", _S_CELDA_HDR)]]
    for m in members:
        nombre = m.get("researcher_name") or m.get("external_author_name") or ""
        inicio = (m.get("start_date") or "")[:10]
        fin = (m.get("end_date") or "")[:10]
        fechas = inicio if not fin else f"{inicio} – {fin}"
        rol = m.get("role") or "Investigador"
        s_nom = ParagraphStyle("nom", parent=_S_CELDA, fontName=_FONT_BOLD if "Líder" in rol or "Lider" in rol else _FONT)
        data.append([
            _p(m.get("researcher_external_code", ""), _S_CELDA),
            _p(nombre, s_nom),
            _p(rol, _S_CELDA),
            _p(fechas, _S_CELDA),
        ])
    tabla = Table(data, colWidths=[2.6 * cm, 9.4 * cm, 2.5 * cm, 2.5 * cm], repeatRows=1)
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), _AZUL_NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _AZUL_SUAVE]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#f1f5f9")),
    ]))
    return tabla


def _deduce_unclassified_subtype(prod) -> str:
    """
    Deduce una etiqueta legible y descriptiva para productos sin subtipo
    formal Minciencias 2024 a partir de su descripción o contexto original en Scienti.
    """
    desc = prod.description or ""
    m = re.match(r"^\d+\.-\s*([^:]+)\s*:", desc)
    raw_cat = m.group(1).strip() if m else ""
    norm = GruplacNormalizer.match_key(raw_cat)

    if not norm:
        return "Otras actividades declaradas"

    if "pregrado" in norm:
        return "Jurado y comisiones evaluadoras (Pregrado)"
    if "maestr" in norm or "doctor" in norm:
        return "Jurado y comisiones evaluadoras (Posgrado)"
    if "tutor" in norm or "otro tipo" in norm:
        return "Trabajos dirigidos y tutorías de otro tipo"
    if "extensi" in norm:
        return "Extensión y proyección universitaria"
    if any(k in norm for k in ["perfeccionamiento", "capacita", "curso", "diplomado"]):
        return "Cursos de perfeccionamiento y formación continua"
    if any(k in norm for k in ["divulgaci", "periodico", "revista"]):
        return "Publicaciones de divulgación y medios"
    if "acreditaci" in norm:
        return "Acreditación y gestión institucional"
    if any(k in norm for k in ["semillero", "iniciaci"]):
        return "Semilleros e iniciación científica"
    if any(k in norm for k in ["demas", "otro"]):
        return "Demás trabajos institucionales"

    return _clean_text(raw_cat)


def _bloques_produccion(productos: list) -> list:
    catalogos = repository.get_product_catalogs()
    familias = {f["id"]: f["name"] for f in catalogos["families"]}
    subtipos = {s["id"]: (s["family_id"], s["name"]) for s in catalogos["subtypes"]}

    agrupado: dict = {}
    for prod in productos:
        sub = subtipos.get(prod.subtype_id) if prod.subtype_id else None
        fam_id = prod.family_id or (sub[0] if sub else None)
        if sub:
            fam_nombre = familias.get(fam_id, "Otros productos")
            sub_nombre = sub[1]
        else:
            fam_id = 999  # Ubicar actividades institucionales al final
            fam_nombre = "Otras actividades y producción institucional declarada"
            sub_nombre = _deduce_unclassified_subtype(prod)

        agrupado.setdefault((fam_id or 0, fam_nombre), {}).setdefault(sub_nombre, []).append(prod)

    story = []
    for fam_key in sorted(agrupado.keys(), key=lambda k: k[0]):
        fam_nombre = fam_key[1]
        subs = agrupado[fam_key]
        story.append(_p(fam_nombre, _S_SECCION))
        for sub_nombre in sorted(subs.keys()):
            prods = sorted(subs[sub_nombre], key=lambda p: (-(p.year or 0), p.title))
            story.append(_p(f"{sub_nombre}  ({len(prods)})", _S_SUBTIPO))
            for prod in prods:
                meta = []
                if prod.year:
                    meta.append(f"Año: {prod.year}")
                if prod.doi:
                    meta.append(f"DOI: {prod.doi}")
                if prod.validation_status:
                    meta.append(f"Estado: {prod.validation_status}")
                try:
                    autores = repository.get_product_authors(prod.id)
                    nombres = [(a.get("researcher_name") or a.get("external_author_name") or "").strip()
                                for a in autores]
                    nombres = [n for n in nombres if n]
                    if nombres:
                        meta.append("Autores: " + ", ".join(nombres[:8]) +
                                    ("…" if len(nombres) > 8 else ""))
                except Exception:
                    pass
                bloque = [_p(prod.title, _S_ITEM)]
                if meta:
                    bloque.append(_p(" | ".join(meta), _S_META))
                story.append(KeepTogether(bloque))
    return story


def build_group_report_pdf(group_id: int, start_year=None, end_year=None,
                           window_years=None) -> bytes:
    """
    Genera el informe PDF completo del grupo de investigación con diseño institucional.
    Lanza KeyError si el grupo no existe.
    """
    cur_year = datetime.now().year
    eff_start, eff_end = start_year, end_year
    if window_years is not None and window_years > 0:
        eff_start, eff_end = cur_year - window_years, cur_year
    if eff_start is not None and eff_end is not None and eff_start > eff_end:
        eff_start, eff_end = eff_end, eff_start
    window_applied = eff_start is not None or eff_end is not None

    grupo = repository.get_group(group_id)
    miembros = repository.get_group_members_detailed(group_id)
    productos = repository.filter_products(
        group_id=group_id, start_year=eff_start, end_year=eff_end
    )
    proyectos = repository.get_group_projects(group_id)
    lineas = repository.get_group_research_lines(group_id)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2.2 * cm, bottomMargin=2.2 * cm,
        title=f"Informe Oficial {grupo.name}",
        author="Khemia PEA-i",
    )

    sub = "Informe Oficial del Grupo de Investigación · Universidad Popular del Cesar"
    if window_applied:
        rango = f"{eff_start if eff_start is not None else '…'}–{eff_end if eff_end is not None else '…'}"
        sub += f" · Ventana de observación: {rango} (año de obtención)"

    story = [
        _p(grupo.name, _S_TITULO),
    ]
    if grupo.acronym:
        story.append(_p(f"Sigla: {grupo.acronym}  |  Código Oficial: {grupo.external_code}", _S_SIGLA))
    story.append(_p(sub, _S_SUB))
    story.append(Spacer(1, 4))

    # Tarjetas Métricas KPI Ejecutivas
    story.append(_tabla_kpi_metrics(len(miembros), len(productos), len(proyectos), len(lineas)))
    story.append(Spacer(1, 6))

    # 1. Datos básicos
    story.append(_p("Datos básicos", _S_SECCION))
    story.append(_tabla_datos_basicos(grupo))

    # 2. Misión, visión y descripción
    if grupo.description or grupo.mission or grupo.vision:
        story.append(_p("Misión, visión y descripción", _S_SECCION))
        if grupo.mission:
            story.append(_p("Misión", _S_SUBTIPO))
            story.append(_p(grupo.mission, _S_CALLOUT))
        if grupo.vision:
            story.append(_p("Visión", _S_SUBTIPO))
            story.append(_p(grupo.vision, _S_CALLOUT))
        if grupo.description:
            story.append(_p("Descripción", _S_SUBTIPO))
            story.append(_p(grupo.description, _S_CALLOUT))

    # 3. Líneas de investigación
    if lineas:
        story.append(_p("Líneas de investigación declaradas", _S_SECCION))
        for linea in lineas:
            story.append(_p(f"•  {linea}", _S_NORMAL))

    # 4. Integrantes
    if miembros:
        story.append(_p("Integrantes del grupo", _S_SECCION))
        story.append(_tabla_integrantes(miembros))

    # 5. Producción
    if productos:
        story.append(Spacer(1, 8))
        story.append(_p("Producción bibliográfica y académica", _S_SECCION))
        story.extend(_bloques_produccion(productos))

    # 6. Proyectos
    if proyectos:
        story.append(Spacer(1, 8))
        story.append(_p("Proyectos de investigación", _S_SECCION))
        data = [[_p("Título", _S_CELDA_HDR), _p("Tipo", _S_CELDA_HDR),
                 _p("Estado", _S_CELDA_HDR), _p("Inicio – Fin", _S_CELDA_HDR)]]
        for pro in proyectos:
            data.append([
                _p(pro.title, _S_CELDA),
                _p(pro.project_type or "", _S_CELDA),
                _p(pro.status or "", _S_CELDA),
                _p(f"{(pro.start_date or '')[:10]} – {(pro.end_date or '')[:10]}", _S_CELDA),
            ])
        tabla = Table(data, colWidths=[9 * cm, 3 * cm, 2 * cm, 3 * cm], repeatRows=1)
        tabla.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), _AZUL_NAVY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _AZUL_SUAVE]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#f1f5f9")),
        ]))
        story.append(tabla)

    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()
