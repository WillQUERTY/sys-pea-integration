import io
import re
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .. import repository
from ..scraping import GruplacNormalizer
from .canvas import NumberedCanvas
from .theme import (
    _AZUL_ACCENT,
    _AZUL_NAVY,
    _AZUL_SUAVE,
    _BLANCO,
    _DORADO,
    _FONT,
    _FONT_BOLD,
    _GRIS_BORDE,
    _GRIS_MEDIO,
    _GRIS_OSCURO,
    _PURPURA,
    _S_CALLOUT,
    _S_CELDA,
    _S_CELDA_HDR,
    _S_ETIQUETA,
    _S_ITEM,
    _S_KPI_LBL,
    _S_KPI_NUM,
    _S_META,
    _S_NORMAL,
    _S_SECCION,
    _S_SIGLA,
    _S_SUB,
    _S_SUBTIPO,
    _S_TITULO,
    _S_VALOR,
    _VERDE_UPC,
    _clean_text,
    _p,
)


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
                f"{(pro.start_date or '')[:10]} – {(pro.end_date or '')[:10]}",
            ])
            data[-1][3] = _p(data[-1][3], _S_CELDA)
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
