"""
Informe PDF de grupo de investigación (estilo GrupLAC) con ReportLab.

Replica la estructura de la página GrupLAC de Scienti: datos básicos,
misión/visión, líneas, integrantes, producción agrupada por familia y
subtipo Minciencias, y proyectos. Se genera bajo demanda desde la RAM
activa (misma fuente que el resto del sistema).

Uso:
    pdf_bytes = build_group_report_pdf(60)
"""
import io
import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from . import repository

# ------------------------------------------------------------------
# Fuentes: Arial TTF soporta el rango Unicode que trae el scraping;
# Helvetica (Latin-1) como respaldo si las fuentes de Windows faltan.
# ------------------------------------------------------------------

_FONT = "Helvetica"
_FONT_BOLD = "Helvetica-Bold"
try:
    _ARIAL = r"C:\Windows\Fonts\arial.ttf"
    _ARIAL_BD = r"C:\Windows\Fonts\arialbd.ttf"
    if os.path.exists(_ARIAL) and os.path.exists(_ARIAL_BD):
        pdfmetrics.registerFont(TTFont("PEAi", _ARIAL))
        pdfmetrics.registerFont(TTFont("PEAi-Bold", _ARIAL_BD))
        _FONT = "PEAi"
        _FONT_BOLD = "PEAi-Bold"
except Exception:  # pragma: no cover - solo entornos sin fuentes
    pass

_AZUL = colors.HexColor("#1e3a5f")
_AZUL_CLARO = colors.HexColor("#eaf1f8")
_GRIS = colors.HexColor("#6b7280")

_S_TITULO = ParagraphStyle("titulo", fontName=_FONT_BOLD, fontSize=16,
                            leading=20, textColor=_AZUL, spaceAfter=2)
_S_SUB = ParagraphStyle("sub", fontName=_FONT, fontSize=9, leading=12,
                        textColor=_GRIS, spaceAfter=10)
_S_SECCION = ParagraphStyle("seccion", fontName=_FONT_BOLD, fontSize=11,
                            leading=14, textColor=colors.white,
                            backColor=_AZUL, borderPadding=(5, 6),
                            spaceBefore=14, spaceAfter=6)
_S_SUBTIPO = ParagraphStyle("subtipo", fontName=_FONT_BOLD, fontSize=9.5,
                            leading=12, textColor=_AZUL, spaceBefore=10,
                            spaceAfter=3)
_S_NORMAL = ParagraphStyle("normal", fontName=_FONT, fontSize=9, leading=12,
                           spaceAfter=4)
_S_ITEM = ParagraphStyle("item", fontName=_FONT_BOLD, fontSize=9, leading=12,
                         spaceBefore=6, spaceAfter=1)
_S_META = ParagraphStyle("meta", fontName=_FONT, fontSize=8, leading=11,
                         textColor=_GRIS, leftIndent=8, spaceAfter=2)
_S_ETIQUETA = ParagraphStyle("etiqueta", fontName=_FONT_BOLD, fontSize=9,
                             leading=12, textColor=_AZUL)
_S_VALOR = ParagraphStyle("valor", fontName=_FONT, fontSize=9, leading=12)
_S_CELDA = ParagraphStyle("celda", fontName=_FONT, fontSize=8.5, leading=11)


def _p(texto: str, estilo) -> Paragraph:
    return Paragraph(str(texto or ""), estilo)


def _encabezado_pie(canvas, doc):
    """Cabecera y pie comunes: barra superior con el sistema y folio."""
    canvas.saveState()
    ancho, _ = A4
    canvas.setFillColor(_AZUL)
    canvas.rect(0, A4[1] - 1.1 * cm, ancho, 1.1 * cm, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont(_FONT_BOLD, 8)
    canvas.drawString(2 * cm, A4[1] - 0.75 * cm, "PEA-i  ·  Informe de grupo de investigación")
    canvas.setFont(_FONT, 8)
    canvas.drawRightString(ancho - 2 * cm, A4[1] - 0.75 * cm, "Scienti / GrupLAC")
    canvas.setFillColor(_GRIS)
    canvas.setFont(_FONT, 8)
    canvas.drawCentredString(ancho / 2, 1.1 * cm, f"Página {doc.page}")
    canvas.restoreState()


def _tabla_datos_basicos(grupo) -> Table:
    filas = [
        ("Nombre del grupo", grupo.name),
        ("Sigla", grupo.acronym),
        ("Código GrupLAC", grupo.external_code),
        ("Institución aval", grupo.institution),
        ("Clasificación Minciencias", grupo.classification),
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
            filas.insert(len(filas) - 1, ("Líder del grupo",
                                          f"{lider.first_names} {lider.last_names}"))
        except Exception:
            pass

    data = [[_p(k, _S_ETIQUETA), _p(v, _S_VALOR)] for k, v in filas]
    tabla = Table(data, colWidths=[5 * cm, 12 * cm])
    tabla.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, _AZUL_CLARO]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return tabla


def _tabla_integrantes(members: list) -> Table:
    data = [[_p("Código", _S_ETIQUETA), _p("Nombre", _S_ETIQUETA),
             _p("Rol", _S_ETIQUETA), _p("Vinculación", _S_ETIQUETA)]]
    for m in members:
        nombre = m.get("researcher_name") or m.get("external_author_name") or ""
        inicio = (m.get("start_date") or "")[:10]
        fin = (m.get("end_date") or "")[:10]
        fechas = inicio if not fin else f"{inicio} – {fin}"
        data.append([
            _p(m.get("researcher_external_code", ""), _S_CELDA),
            _p(nombre, _S_CELDA),
            _p(m.get("role") or "Investigador", _S_CELDA),
            _p(fechas, _S_CELDA),
        ])
    tabla = Table(data, colWidths=[2.6 * cm, 9.4 * cm, 2.5 * cm, 2.5 * cm], repeatRows=1)
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), _AZUL),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _AZUL_CLARO]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return tabla


def _bloques_produccion(productos: list) -> list:
    """Arma la producción agrupada por familia -> subtipo (como GrupLAC)."""
    catalogos = repository.get_product_catalogs()
    familias = {f["id"]: f["name"] for f in catalogos["families"]}
    subtipos = {s["id"]: (s["family_id"], s["name"]) for s in catalogos["subtypes"]}

    agrupado: dict = {}
    for prod in productos:
        sub = subtipos.get(prod.subtype_id) if prod.subtype_id else None
        fam_id = prod.family_id or (sub[0] if sub else None)
        fam_nombre = familias.get(fam_id, "Otros productos")
        sub_nombre = sub[1] if sub else "Sin subtipo clasificado"
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


def build_group_report_pdf(group_id: int) -> bytes:
    """Genera el informe PDF completo del grupo. Lanza KeyError si no existe."""
    grupo = repository.get_group(group_id)          # KeyError si no existe
    miembros = repository.get_group_members_detailed(group_id)
    productos = [repository.get_product(pid) for pid in repository.products_of_group(group_id)]
    proyectos = repository.get_group_projects(group_id)
    lineas = repository.get_group_research_lines(group_id)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
        title=f"Informe {grupo.name}",
        author="PEA-i",
    )

    story = [
        _p(grupo.name, _S_TITULO),
        _p(f"Generado el {datetime.now():%d/%m/%Y %H:%M} · PEA-i (Taller 2 · "
           f"Estructura de Datos · Universidad Popular del Cesar)", _S_SUB),
    ]

    # Resumen ejecutivo
    resumen = [
        ("Integrantes", len(miembros)),
        ("Productos", len(productos)),
        ("Proyectos", len(proyectos)),
        ("Líneas de investigación", len(lineas)),
    ]
    data = [[_p(v, _S_ETIQUETA), _p(k, _S_VALOR)] for k, v in resumen]
    t = Table(data, colWidths=[4.25 * cm] * 4)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), _AZUL_CLARO),
        ("BOX", (0, 0), (-1, -1), 0.5, _AZUL),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)

    # 1. Datos básicos
    story.append(_p("Datos básicos", _S_SECCION))
    story.append(_tabla_datos_basicos(grupo))

    # 2. Misión, visión y descripción
    if grupo.description or grupo.mission or grupo.vision:
        story.append(_p("Misión, visión y descripción", _S_SECCION))
        if grupo.mission:
            story.append(_p("Misión", _S_SUBTIPO))
            story.append(_p(grupo.mission, _S_NORMAL))
        if grupo.vision:
            story.append(_p("Visión", _S_SUBTIPO))
            story.append(_p(grupo.vision, _S_NORMAL))
        if grupo.description:
            story.append(_p("Descripción", _S_SUBTIPO))
            story.append(_p(grupo.description, _S_NORMAL))

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
        story.append(PageBreak())
        story.append(_p("Producción bibliográfica y académica", _S_SECCION))
        story.extend(_bloques_produccion(productos))

    # 6. Proyectos
    if proyectos:
        story.append(PageBreak())
        story.append(_p("Proyectos de investigación", _S_SECCION))
        data = [[_p("Título", _S_ETIQUETA), _p("Tipo", _S_ETIQUETA),
                 _p("Estado", _S_ETIQUETA), _p("Inicio – Fin", _S_ETIQUETA)]]
        for pro in proyectos:
            data.append([
                _p(pro.title, _S_CELDA),
                _p(pro.project_type or "", _S_CELDA),
                _p(pro.status or "", _S_CELDA),
                _p(f"{(pro.start_date or '')[:10]} – {(pro.end_date or '')[:10]}", _S_CELDA),
            ])
        tabla = Table(data, colWidths=[9 * cm, 3 * cm, 2 * cm, 3 * cm], repeatRows=1)
        tabla.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), _AZUL),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _AZUL_CLARO]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(tabla)

    doc.build(story, onFirstPage=_encabezado_pie, onLaterPages=_encabezado_pie)
    return buf.getvalue()
