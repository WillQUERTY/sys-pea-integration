import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .. import minciencias_evaluator, repository
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
    _PURPURA,
    _S_D_ALERT_BODY,
    _S_D_ALERT_TITLE,
    _S_D_CELDA,
    _S_D_CELDA_BOLD,
    _S_D_CELDA_HDR,
    _S_DOSSIER_DESC,
    _S_DOSSIER_SUB,
    _S_DOSSIER_TITULO,
    _S_KPI_LBL,
    _S_KPI_NUM,
    _S_SECCION_HDR,
    _VERDE_UPC,
    _p,
)


def build_group_executive_dossier_pdf(group_id: int, start_year=None, end_year=None,
                                     window_years=None) -> bytes:
    """
    Genera el Dossier Ejecutivo de Gestión Científica Oficial UPC (Fase 4)
    orientado a Decanatura y Vicerrectoría, estructurado en exactamente 3 páginas ejecutivas:
      - Pág 1: Portada institucional, KPIs clave, Diagnóstico Minciencias 2024 y Familias.
      - Pág 2: Dinámica temporal quinquenal, perfil educativo y Ranking de Investigadores.
      - Pág 3: Red de colaboración y cohesión, Proyectos, Líneas y Bloque de Firmas.
    """
    cur_year = datetime.now().year
    eff_start, eff_end = start_year, end_year
    if window_years is not None and window_years > 0:
        eff_start, eff_end = cur_year - window_years, cur_year
    if eff_start is not None and eff_end is not None and eff_start > eff_end:
        eff_start, eff_end = eff_end, eff_start

    grupo = repository.get_group(group_id)
    stats = repository.get_group_stats(group_id)
    diag = minciencias_evaluator.evaluate_group_minciencias(group_id, repository)
    net = repository.get_group_collaboration_network(group_id)
    miembros = repository.get_group_members_detailed(group_id)
    productos = repository.filter_products(group_id=group_id, start_year=eff_start, end_year=eff_end)
    proyectos = repository.get_group_projects(group_id)
    lineas = repository.get_group_research_lines(group_id)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.6 * cm, rightMargin=1.6 * cm,
        topMargin=2.0 * cm, bottomMargin=2.0 * cm,
        title=f"Dossier Ejecutivo {grupo.name}",
        author="Khemia PEA-i · Universidad Popular del Cesar",
    )

    story = []

    # =========================================================================
    # PÁGINA 1: PORTADA, RESUMEN EJECUTIVO & DIAGNÓSTICO MINCIENCIAS
    # =========================================================================
    story.append(_p("DOSSIER EJECUTIVO DE GESTIÓN CIENTÍFICA", _S_DOSSIER_SUB))
    story.append(_p(grupo.name, _S_DOSSIER_TITULO))
    sub_info = f"Sigla: {grupo.acronym or 'N/A'}  |  Código GrupLAC: {grupo.external_code}  |  Institución: {grupo.institution or 'Universidad Popular del Cesar'}"
    if eff_start or eff_end:
        sub_info += f"  |  Ventana observada: {eff_start or '…'}–{eff_end or '…'}"
    story.append(_p(sub_info, _S_DOSSIER_DESC))
    story.append(Spacer(1, 2))

    # 4 Tarjetas KPI Ejecutivas
    cat_norm = GruplacNormalizer.normalize_classification(grupo.classification or "")
    cat_str = f"Cat. {cat_norm}" if cat_norm else "Sin clasificar"
    total_prods = len(productos)
    total_members = len(miembros)
    phd_count = sum(1 for m in miembros if (m.get("highest_education_level") or "").lower().startswith("doc"))
    msc_count = sum(1 for m in miembros if (m.get("highest_education_level") or "").lower().startswith("maest"))

    net_metrics = net.get("metrics", {})
    cohesion_val = net_metrics.get("cohesion_index", 0.0)
    density_pct = round(net_metrics.get("density", 0.0) * 100, 1)

    s_kp1 = ParagraphStyle("kp1", parent=_S_KPI_NUM, textColor=_AZUL_ACCENT)
    s_kp2 = ParagraphStyle("kp2", parent=_S_KPI_NUM, textColor=_VERDE_UPC)
    s_kp3 = ParagraphStyle("kp3", parent=_S_KPI_NUM, textColor=_DORADO)
    s_kp4 = ParagraphStyle("kp4", parent=_S_KPI_NUM, textColor=_PURPURA)

    kpi_data = [
        [
            Paragraph(str(total_prods), s_kp1),
            Paragraph(f"{total_members}", s_kp2),
            Paragraph(f"{cohesion_val}%", s_kp3),
            Paragraph(cat_str, s_kp4),
        ],
        [
            Paragraph("PRODUCTOS REGISTRADOS", _S_KPI_LBL),
            Paragraph(f"INTEGRANTES ({phd_count} Dr. / {msc_count} Mg.)", _S_KPI_LBL),
            Paragraph(f"COHESIÓN (DENSIDAD {density_pct}%)", _S_KPI_LBL),
            Paragraph("CATEGORIZACIÓN MINCIENCIAS", _S_KPI_LBL),
        ],
    ]
    t_kpis = Table(kpi_data, colWidths=[4.45 * cm] * 4)
    t_kpis.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), _AZUL_SUAVE),
        ("BOX", (0, 0), (-1, -1), 0.75, _GRIS_BORDE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, 0), 4),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
        ("TOPPADDING", (0, 1), (-1, 1), 0),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 4),
    ]))
    story.append(t_kpis)
    story.append(Spacer(1, 5))

    # Diagnóstico Minciencias 2024
    story.append(_p("1. Diagnóstico Estratégico de Categorización Minciencias (Modelo 2024)", _S_SECCION_HDR))
    current_tier = diag.get("current_classification") or "Sin clasificar"
    next_tier = diag.get("next_tier")
    progress = diag.get("next_tier_progress", 0.0)
    gaps = diag.get("next_tier_gap") or []

    diag_header = f"<b>Estado Actual:</b> Categoría {current_tier}"
    if next_tier:
        diag_header += f" &nbsp;&nbsp;|&nbsp;&nbsp; <b>Meta de Ascenso:</b> Categoría {next_tier} (Progreso: {progress:.0f}%)"
    else:
        diag_header += f" &nbsp;&nbsp;|&nbsp;&nbsp; <b>Mantenimiento de Máxima Distinción</b>"

    if gaps:
        diag_text = "<b>Brechas prioritarias a subsanar para la próxima convocatoria institucional:</b><br/>" + "<br/>".join([f"• {g}" for g in gaps])
    else:
        diag_text = "El colectivo cumple con los requisitos base auditados para su rango de clasificación actual."

    t_diag = Table([
        [_p(diag_header, _S_D_ALERT_TITLE)],
        [_p(diag_text, _S_D_ALERT_BODY)],
    ], colWidths=[17.8 * cm])
    t_diag.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.75, _VERDE_UPC if not gaps else _DORADO),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t_diag)
    story.append(Spacer(1, 5))

    # Auditoría por Categorías
    tiers = diag.get("tiers", [])
    if tiers:
        tier_data = [[
            _p("Categoría", _S_D_CELDA_HDR),
            _p("Cumplimiento", _S_D_CELDA_HDR),
            _p("Estado Auditado", _S_D_CELDA_HDR),
            _p("Requisitos y Brechas Clave", _S_D_CELDA_HDR),
        ]]
        for t in tiers:
            t_name = t.get("tier")
            comp = t.get("completion_percentage", 0.0)
            qual = t.get("qualifies", False)
            miss = t.get("missing_summary", [])

            estado_lbl = "CUMPLE REQUISITOS" if qual else f"PENDIENTE ({comp:.0f}%)"
            s_st = ParagraphStyle("st", parent=_S_D_CELDA_BOLD, textColor=_VERDE_UPC if qual else (_DORADO if comp >= 50 else colors.HexColor("#dc2626")))

            detalles = "Todos los criterios alcanzados exitosamente." if not miss else "; ".join(miss[:2])
            tier_data.append([
                _p(f"Categoría {t_name}", _S_D_CELDA_BOLD),
                _p(f"{comp:.0f}%", _S_D_CELDA),
                _p(estado_lbl, s_st),
                _p(detalles, _S_D_CELDA),
            ])
        t_tiers_table = Table(tier_data, colWidths=[2.8 * cm, 2.2 * cm, 3.8 * cm, 9.0 * cm], repeatRows=1)
        t_tiers_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), _AZUL_NAVY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _AZUL_SUAVE]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("LINEBELOW", (0, 1), (-1, -1), 0.3, _GRIS_BORDE),
        ]))
        story.append(t_tiers_table)
        story.append(Spacer(1, 6))

    # Distribución por Familias
    fam_dist = stats.get("families_distribution", [])
    if fam_dist:
        story.append(_p("2. Distribución de la Producción Científica por Familias Minciencias", _S_SECCION_HDR))
        fam_data = [[
            _p("Código", _S_D_CELDA_HDR),
            _p("Familia de Conocimiento", _S_D_CELDA_HDR),
            _p("Productos", _S_D_CELDA_HDR),
            _p("Aporte %", _S_D_CELDA_HDR),
            _p("Distribución Visual", _S_D_CELDA_HDR),
        ]]
        for f in fam_dist:
            code = f.get("code", "")
            name = f.get("name", "")
            cnt = f.get("count", 0)
            pct = f.get("percentage", 0.0)

            bar_len = int(round(pct / 4))
            bar_str = "█" * bar_len + "░" * (25 - bar_len)
            s_bar = ParagraphStyle("bar", fontName=_FONT, fontSize=5.5, textColor=_AZUL_ACCENT)

            fam_data.append([
                _p(code, _S_D_CELDA_BOLD),
                _p(name, _S_D_CELDA),
                _p(str(cnt), _S_D_CELDA),
                _p(f"{pct:.1f}%", _S_D_CELDA_BOLD),
                Paragraph(bar_str, s_bar),
            ])
        t_fams = Table(fam_data, colWidths=[2.2 * cm, 6.8 * cm, 2.2 * cm, 2.2 * cm, 4.4 * cm], repeatRows=1)
        t_fams.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), _AZUL_NAVY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _AZUL_SUAVE]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("LINEBELOW", (0, 1), (-1, -1), 0.3, _GRIS_BORDE),
        ]))
        story.append(t_fams)

    # =========================================================================
    # PÁGINA 2: DINÁMICA TEMPORAL & RANKING DE INVESTIGADORES
    # =========================================================================
    story.append(PageBreak())

    # Dinámica Temporal
    by_year = stats.get("by_year", [])
    if by_year:
        story.append(_p("3. Dinámica Temporal de la Producción Científica", _S_SECCION_HDR))
        recent_years = by_year[-10:] if len(by_year) >= 10 else by_year
        y_hdrs = [_p("Año", _S_D_CELDA_HDR)] + [_p(str(item["year"]), _S_D_CELDA_HDR) for item in recent_years]
        y_vals = [_p("Obras", _S_D_CELDA_BOLD)] + [_p(str(item["count"]), _S_D_CELDA) for item in recent_years]

        col_w = 17.8 / (len(recent_years) + 1)
        t_years = Table([y_hdrs, y_vals], colWidths=[col_w * cm] * (len(recent_years) + 1))
        t_years.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), _AZUL_NAVY),
            ("BACKGROUND", (0, 1), (-1, 1), _AZUL_SUAVE),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("BOX", (0, 0), (-1, -1), 0.5, _GRIS_BORDE),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, _GRIS_BORDE),
        ]))
        story.append(t_years)
        story.append(Spacer(1, 8))

    # Formación académica del colectivo
    edu_dist = stats.get("researchers_education", [])
    if edu_dist:
        story.append(_p("4. Perfil Académico y Formación del Talento Humano", _S_SECCION_HDR))
        edu_data = [[
            _p("Nivel Académico", _S_D_CELDA_HDR),
            _p("Investigadores", _S_D_CELDA_HDR),
            _p("Proporción %", _S_D_CELDA_HDR),
        ]]
        for e in edu_dist:
            edu_data.append([
                _p(e.get("level", ""), _S_D_CELDA_BOLD),
                _p(str(e.get("count", 0)), _S_D_CELDA),
                _p(f"{e.get('percentage', 0):.1f}%", _S_D_CELDA_BOLD),
            ])
        t_edu = Table(edu_data, colWidths=[8.0 * cm, 4.9 * cm, 4.9 * cm], repeatRows=1)
        t_edu.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), _AZUL_NAVY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _AZUL_SUAVE]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("LINEBELOW", (0, 1), (-1, -1), 0.3, _GRIS_BORDE),
        ]))
        story.append(t_edu)
        story.append(Spacer(1, 8))

    # Ranking de Contribución de Investigadores
    top_res = stats.get("top_researchers", [])
    if top_res:
        story.append(_p("5. Ranking de Contribución de Investigadores al Colectivo", _S_SECCION_HDR))
        rank_data = [[
            _p("#", _S_D_CELDA_HDR),
            _p("Investigador", _S_D_CELDA_HDR),
            _p("Nivel Académico", _S_D_CELDA_HDR),
            _p("Obras en Grupo", _S_D_CELDA_HDR),
            _p("Aporte al Grupo %", _S_D_CELDA_HDR),
            _p("Total Obras Personales", _S_D_CELDA_HDR),
        ]]
        for idx, r in enumerate(top_res[:18], 1):
            rank_data.append([
                _p(str(idx), _S_D_CELDA_BOLD),
                _p(r.get("name", ""), _S_D_CELDA_BOLD),
                _p(r.get("highest_education", "Pregrado"), _S_D_CELDA),
                _p(str(r.get("products_count", 0)), _S_D_CELDA),
                _p(f"{r.get('percentage_of_group', 0):.1f}%", _S_D_CELDA_BOLD),
                _p(str(r.get("total_authored_count", 0)), _S_D_CELDA),
            ])
        t_rank = Table(rank_data, colWidths=[1.0 * cm, 6.8 * cm, 3.2 * cm, 2.3 * cm, 2.3 * cm, 2.2 * cm], repeatRows=1)
        t_rank.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), _AZUL_NAVY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _AZUL_SUAVE]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW", (0, 1), (-1, -1), 0.3, _GRIS_BORDE),
        ]))
        story.append(t_rank)

    # =========================================================================
    # PÁGINA 3: RED DE COLABORACIÓN, PROYECTOS & FORMALIZACIÓN
    # =========================================================================
    story.append(PageBreak())

    # Red de Colaboración
    story.append(_p("6. Red Científica Interna y Cohesión de Coautorías", _S_SECCION_HDR))
    net_edges = net_metrics.get("total_edges", 0)
    net_isolated = net_metrics.get("isolated_nodes", 0)
    net_max_weight = net_metrics.get("max_weight", 0)

    net_summary = [
        ("Vínculos Diádicos de Coautoría", f"{net_edges} relaciones científicas directas entre investigadores"),
        ("Índice de Cohesión Científica", f"{cohesion_val}% de densidad de red colaborativa interna"),
        ("Intensidad Máxima Diádica", f"{net_max_weight} publicaciones conjuntas entre los dos miembros con mayor articulación"),
        ("Investigadores Independientes", f"{net_isolated} miembros sin publicaciones internas registradas"),
    ]
    t_net = Table([
        [_p(k, _S_D_CELDA_BOLD), _p(v, _S_D_CELDA)] for k, v in net_summary
    ], colWidths=[6.0 * cm, 11.8 * cm])
    t_net.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, _AZUL_SUAVE]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.3, _GRIS_BORDE),
    ]))
    story.append(t_net)
    story.append(Spacer(1, 8))

    # Proyectos y Líneas
    story.append(_p("7. Proyectos de Investigación y Líneas Declaradas", _S_SECCION_HDR))
    if lineas:
        lineas_str = " • ".join([f"<b>{l}</b>" for l in lineas[:10]])
        story.append(_p(f"<b>Líneas declaradas:</b> {lineas_str}", _S_D_CELDA))
        story.append(Spacer(1, 4))
    if proyectos:
        proy_data = [[
            _p("Proyecto de Investigación", _S_D_CELDA_HDR),
            _p("Tipo", _S_D_CELDA_HDR),
            _p("Estado", _S_D_CELDA_HDR),
            _p("Vigencia", _S_D_CELDA_HDR),
        ]]
        for p in proyectos[:10]:
            inicio = (p.start_date or "")[:10]
            fin = (p.end_date or "")[:10]
            fechas = inicio if not fin else f"{inicio} – {fin}"
            proy_data.append([
                _p(p.title, _S_D_CELDA_BOLD),
                _p(p.project_type or "I+D Institucional", _S_D_CELDA),
                _p(p.status or "Activo", _S_D_CELDA),
                _p(fechas, _S_D_CELDA),
            ])
        t_proys = Table(proy_data, colWidths=[9.8 * cm, 3.2 * cm, 2.3 * cm, 2.5 * cm], repeatRows=1)
        t_proys.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), _AZUL_NAVY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _AZUL_SUAVE]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("LINEBELOW", (0, 1), (-1, -1), 0.3, _GRIS_BORDE),
        ]))
        story.append(t_proys)
        story.append(Spacer(1, 14))

    # Formalización y Firmas
    story.append(Spacer(1, 20))
    s_firma_lbl = ParagraphStyle("f_lbl", fontName=_FONT_BOLD, fontSize=8, leading=10, alignment=1, textColor=_AZUL_NAVY)
    s_firma_sub = ParagraphStyle("f_sub", fontName=_FONT, fontSize=7, leading=9, alignment=1, textColor=_GRIS_MEDIO)

    firmas_data = [
        [
            Paragraph("____________________________________________", s_firma_lbl),
            Paragraph("____________________________________________", s_firma_lbl),
        ],
        [
            Paragraph("LÍDER / DIRECTOR DE GRUPO", s_firma_lbl),
            Paragraph("DECANATURA / VICERRECTORÍA DE INVESTIGACIÓN", s_firma_lbl),
        ],
        [
            Paragraph("Universidad Popular del Cesar", s_firma_sub),
            Paragraph("Sistema de Información Científica Khemia", s_firma_sub),
        ],
    ]
    t_firmas = Table(firmas_data, colWidths=[8.9 * cm, 8.9 * cm])
    t_firmas.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(KeepTogether(t_firmas))

    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()
