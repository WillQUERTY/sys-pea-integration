"""
Generador de PDF: Explicación de la Calificación Global Compuesta de Producción
Universidad Popular del Cesar — Ingeniería de Sistemas — Estructura de Datos (Parcial 2)
Diseño Ejecutivo Balanceado en 2 Páginas.
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# Añadir raíz y backend al path
ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(ROOT_DIR))

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

from app.reporting.canvas import NumberedCanvas
from app.reporting.theme import (
    _FONT,
    _FONT_BOLD,
    _AZUL_NAVY,
    _AZUL_ACCENT,
    _AZUL_SUAVE,
    _VERDE_UPC,
    _GRIS_OSCURO,
    _GRIS_MEDIO,
    _GRIS_BORDE,
    _BLANCO,
    _DORADO,
)

OUTPUT_PDF = ROOT_DIR / "docs" / "Explicacion_Calificacion_Global_Compuesta.pdf"

# ------------------------------------------------------------------
# Estilos Tipográficos Compactos y Precisos
# ------------------------------------------------------------------
s_kicker = ParagraphStyle(
    "Kicker",
    fontName=_FONT_BOLD,
    fontSize=8,
    leading=10,
    textColor=_VERDE_UPC,
    spaceAfter=1,
)

s_title = ParagraphStyle(
    "DocTitle",
    fontName=_FONT_BOLD,
    fontSize=15.5,
    leading=18,
    textColor=_AZUL_NAVY,
    spaceAfter=2,
)

s_subtitle = ParagraphStyle(
    "DocSubTitle",
    fontName=_FONT,
    fontSize=8.5,
    leading=11.5,
    textColor=_GRIS_MEDIO,
    spaceAfter=6,
)

s_h1 = ParagraphStyle(
    "SectionH1",
    fontName=_FONT_BOLD,
    fontSize=10.5,
    leading=13.5,
    textColor=_AZUL_NAVY,
    spaceBefore=6,
    spaceAfter=3,
    keepWithNext=True,
)

s_body = ParagraphStyle(
    "Body",
    fontName=_FONT,
    fontSize=7.8,
    leading=10.8,
    textColor=_GRIS_OSCURO,
    spaceAfter=4,
)

s_body_compact = ParagraphStyle(
    "BodyCompact",
    fontName=_FONT,
    fontSize=7.5,
    leading=10.2,
    textColor=_GRIS_OSCURO,
    spaceAfter=2,
)

s_formula_box = ParagraphStyle(
    "FormulaBox",
    fontName=_FONT_BOLD,
    fontSize=8.8,
    leading=12,
    textColor=_AZUL_NAVY,
    alignment=1,  # Centrado
)

s_script_text = ParagraphStyle(
    "ScriptText",
    fontName=_FONT,
    fontSize=7.8,
    leading=11,
    textColor=_GRIS_OSCURO,
)

s_th = ParagraphStyle(
    "TH",
    fontName=_FONT_BOLD,
    fontSize=7.5,
    leading=9.5,
    textColor=_BLANCO,
    alignment=1,
)

s_td = ParagraphStyle(
    "TD",
    fontName=_FONT,
    fontSize=7,
    leading=9.2,
    textColor=_GRIS_OSCURO,
)

s_td_bold = ParagraphStyle(
    "TDBold",
    fontName=_FONT_BOLD,
    fontSize=7,
    leading=9.2,
    textColor=_AZUL_NAVY,
    alignment=1,
)

s_td_num = ParagraphStyle(
    "TDNum",
    fontName=_FONT_BOLD,
    fontSize=7,
    leading=9.2,
    textColor=_AZUL_ACCENT,
    alignment=1,
)


def crear_pdf():
    OUTPUT_PDF.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(OUTPUT_PDF),
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
    )

    story = []

    # =========================================================================
    # PÁGINA 1: Encabezado, Intuición, Los 4 Ejes y La Ecuación del Grupo
    # =========================================================================
    story.append(Paragraph("UNIVERSIDAD POPULAR DEL CESAR · INGENIERÍA DE SISTEMAS · ESTRUCTURA DE DATOS", s_kicker))
    story.append(Paragraph("Calificación Global Compuesta de Producción Científica", s_title))
    story.append(Paragraph(
        "Fundamentación matemática, desglose de términos, origen normativo (Minciencias 2024 §3.10) "
        "y guion didáctico para sustentación en video · Sistema Khemia / PEA-i (Grupo WP-DN-EO)",
        s_subtitle
    ))

    # Caja de Resumen / Intuición
    callout_data = [[
        Paragraph(
            "<b>¿Por qué se llama «Compuesta»? (La Intuición):</b> En ciencia no se evalúa la productividad "
            "contando simplemente cuántos papeles se publicaron. Un artículo Q1 en revista indexada internacional no equivale "
            "a una memoria de congreso, ni un grupo donde todos investigan aislados equivale a un equipo con alta sinergia "
            "y redes interinstitucionales. Esta calificación es <b>compuesta</b> porque integra en un solo índice multidimensional: "
            "<b>(1) Calidad científica</b>, <b>(2) Impacto social</b>, <b>(3) Formación de recurso humano</b> "
            "y <b>(4) Dinámica de cooperación</b>.",
            s_body_compact
        )
    ]]
    t_callout = Table(callout_data, colWidths=[18.0 * cm])
    t_callout.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), _AZUL_SUAVE),
        ('BOX', (0, 0), (-1, -1), 0.8, _AZUL_ACCENT),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_callout)
    story.append(Spacer(1, 4))

    # 1. LOS CUATRO EJES DEL MODELO
    story.append(Paragraph("1. Los Cuatro Ejes Fundamentales del Modelo", s_h1))
    
    ejes_data = [
        [Paragraph("Eje de Medición", s_th), Paragraph("Qué Evalúa", s_th), Paragraph("Tipologías de Productos", s_th), Paragraph("Peso en Escala (10 pts)", s_th)],
        [
            Paragraph("<b>Calidad e Impacto</b><br/>(GNC y DTI)", s_td),
            Paragraph("Nivel de rigor metodológico y reconocimiento por pares.", s_td),
            Paragraph("Artículos A1/Q1, A2/Q2, B/Q3, Patentes de Invención, Libros resultado de investigación, Software certificado.", s_td),
            Paragraph("<b>6.4 pts (64%)</b><br/>TOP: 3.7 | A: 2.3 | B: 0.4", s_td_num),
        ],
        [
            Paragraph("<b>Transferencia y Sociedad</b><br/>(ASC y DPC)", s_td),
            Paragraph("Retorno del conocimiento hacia comunidades y apropiación pública.", s_td),
            Paragraph("Proyectos de apropiación social (AP), políticas públicas, eventos científicos, memorias de congresos (DPC).", s_td),
            Paragraph("<b>2.0 pts (20%)</b><br/>AP: 1.5 | DPC: 0.5", s_td_num),
        ],
        [
            Paragraph("<b>Formación de Talento</b><br/>(FRH)", s_td),
            Paragraph("Capacidad de guiar y graduar nuevos investigadores.", s_td),
            Paragraph("Tesis de Doctorado aprobadas (Fr.A), trabajos de grado de Maestría y Pregrado (Fr.B).", s_td),
            Paragraph("<b>1.2 pts (12%)</b><br/>Fr.A: 1.0 | Fr.B: 0.2", s_td_num),
        ],
        [
            Paragraph("<b>Dinámica y Redes</b><br/>(Cohesión y Cooperación)", s_td),
            Paragraph("Sinergia interna entre integrantes y apertura con grupos externos.", s_td),
            Paragraph("Autores del grupo coincidentes en productos (Cohe) y productos coautorizados con redes externas (Coop).", s_td),
            Paragraph("<b>0.4 pts (4%)</b><br/>Cohe: 0.1 | Coop: 0.3", s_td_num),
        ],
    ]
    t_ejes = Table(ejes_data, colWidths=[3.2 * cm, 4.3 * cm, 7.0 * cm, 3.5 * cm])
    t_ejes.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), _AZUL_NAVY),
        ('GRID', (0, 0), (-1, -1), 0.5, _GRIS_BORDE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [_BLANCO, _AZUL_SUAVE]),
    ]))
    story.append(t_ejes)
    story.append(Spacer(1, 4))

    # 2. LA ECUACIÓN DEL GRUPO
    story.append(Paragraph("2. La Ecuación del Grupo (I_Grupo) — Minciencias 2024 §3.10", s_h1))

    formula_grupo_html = (
        "<b>I_Grupo = 3.7·Nc.Top + 2.3·Nc.A + 0.4·Nc.B + 1.5·AP + 0.5·DPC "
        "+ 1.0·Fr.A + 0.2·Fr.B + 0.1·Cohe + 0.3·Coop</b>"
    )
    t_form_g = Table([[Paragraph(formula_grupo_html, s_formula_box)]], colWidths=[18.0 * cm])
    t_form_g.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), _AZUL_SUAVE),
        ('BOX', (0, 0), (-1, -1), 0.8, _AZUL_NAVY),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_form_g)
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>Propiedad matemática clave:</b> La suma de coeficientes es "
        "<b>3.7 + 2.3 + 0.4 + 1.5 + 0.5 + 1.0 + 0.2 + 0.1 + 0.3 = 10.0</b>, "
        "lo que garantiza que la calificación represente una <b>escala porcentual normalizada sobre 10 puntos</b>.",
        s_body_compact
    ))

    terminos_data = [
        [Paragraph("Término", s_th), Paragraph("Peso", s_th), Paragraph("Concepto Oficial Minciencias", s_th), Paragraph("Criterio y Ejemplos de Productos", s_th)],
        [Paragraph("Nc.Top", s_td_bold), Paragraph("3.7", s_td_num), Paragraph("Producción Científica TOP", s_td), Paragraph("Artículos A1 / Q1 (JCR o SJR), Patentes concedidas, Variedades vegetales, Libros A1.", s_td)],
        [Paragraph("Nc.A", s_td_bold), Paragraph("2.3", s_td_num), Paragraph("Producción Científica Tipo A", s_td), Paragraph("Artículos A2 / Q2, Libros tipo A, Software registrado certificado, Diseños industriales.", s_td)],
        [Paragraph("Nc.B", s_td_bold), Paragraph("0.4", s_td_num), Paragraph("Producción Científica Tipo B", s_td), Paragraph("Artículos B / Q3, Libros tipo B, Prototipos industriales, Innovaciones en procesos.", s_td)],
        [Paragraph("AP", s_td_bold), Paragraph("1.5", s_td_num), Paragraph("Apropiación Social (ASC)", s_td), Paragraph("Proyectos de co-creación social, generación comunitaria de conocimiento, políticas públicas.", s_td)],
        [Paragraph("DPC", s_td_bold), Paragraph("0.5", s_td_num), Paragraph("Divulgación Pública (DPC)", s_td), Paragraph("Ponencias en congresos, memorias publicadas, boletines y divulgación científica abierta.", s_td)],
        [Paragraph("Fr.A", s_td_bold), Paragraph("1.0", s_td_num), Paragraph("Formación Avanzada", s_td), Paragraph("Tesis de Doctorado concluidas y aprobadas dirigidas por integrantes del grupo.", s_td)],
        [Paragraph("Fr.B", s_td_bold), Paragraph("0.2", s_td_num), Paragraph("Formación Profesional", s_td), Paragraph("Tesis de Maestría y trabajos de grado de Pregrado aprobados.", s_td)],
        [Paragraph("Cohe", s_td_bold), Paragraph("0.1", s_td_num), Paragraph("Índice de Cohesión (§2.2.10.1)", s_td), Paragraph("(Autores del grupo coincidentes / Productos GNC+DTI) − 1. Mide trabajo colaborativo interno.", s_td)],
        [Paragraph("Coop", s_td_bold), Paragraph("0.3", s_td_num), Paragraph("Índice de Cooperación (§2.2.10.2)", s_td), Paragraph("(Grupos externos relacionados / Productos) − 1, o productos coautorizados con externos.", s_td)],
    ]
    t_term = Table(terminos_data, colWidths=[1.8 * cm, 1.1 * cm, 4.8 * cm, 10.3 * cm])
    t_term.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), _AZUL_NAVY),
        ('GRID', (0, 0), (-1, -1), 0.5, _GRIS_BORDE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [_BLANCO, _AZUL_SUAVE]),
    ]))
    story.append(t_term)

    # =========================================================================
    # PÁGINA 2: Ecuación del Investigador, Dos Niveles y Guion del Video
    # =========================================================================
    story.append(PageBreak())

    # 3. LA ECUACIÓN DEL INVESTIGADOR
    story.append(Paragraph("3. La Ecuación del Investigador (I_Investigador) y de Dónde Sale", s_h1))
    
    formula_inv_html = (
        "<b>I_Investigador = 3.7·Nc.Top + 2.3·Nc.A + 0.4·Nc.B + 1.5·AP + 0.5·DPC "
        "+ 1.0·Fr.A + 0.2·Fr.B + 0.1·Cohe + 0.3·Coop</b>"
    )
    t_form_i = Table([[Paragraph(formula_inv_html, s_formula_box)]], colWidths=[18.0 * cm])
    t_form_i.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), _AZUL_SUAVE),
        ('BOX', (0, 0), (-1, -1), 0.8, _VERDE_UPC),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_form_i)
    story.append(Spacer(1, 2))

    story.append(Paragraph(
        "<b>Origen normativo (detalle crítico para la sustentación):</b> En Minciencias "
        "(M601PR04G01 v02), <b>un solo indicador de producción científica compuesta está formalmente definido y es el del grupo (§3.10)</b>. "
        "A los investigadores individuales Minciencias los clasifica en categorías ordinales (Junior, Asociado, Senior, Emérito) según umbrales discretos, "
        "sin asignarles una nota continua. Por ende, el cálculo del investigador requerido en el Parcial 2 constituye una "
        "<b>adaptación declarada y auditable</b> con cuatro reglas transparentes:",
        s_body_compact
    ))

    adapt_data = [
        [Paragraph("Aspecto", s_th), Paragraph("En el Grupo (Oficial §3.10)", s_th), Paragraph("En el Investigador (Adaptación Parcial)", s_th)],
        [
            Paragraph("<b>Unidad de Análisis</b>", s_td),
            Paragraph("Portafolio colectivo de productos asociados al grupo en GrupLAC.", s_td),
            Paragraph("Portafolio personal de productos del autor en su hoja de vida CvLAC.", s_td),
        ],
        [
            Paragraph("<b>Ventana Temporal</b>", s_td),
            Paragraph("Período = min(edad del grupo en años, ventana del subtipo).", s_td),
            Paragraph("Período = min(antigüedad académica del investigador, ventana del subtipo).", s_td),
        ],
        [
            Paragraph("<b>Cohesión Interna</b>", s_td),
            Paragraph("Mide coautoría entre integrantes dentro del mismo grupo.", s_td),
            Paragraph("<b>Cohe = 0.0</b> (un investigador individual no tiene cohesión consigo mismo; el término se anula).", s_td),
        ],
        [
            Paragraph("<b>Cooperación</b>", s_td),
            Paragraph("Mide firmas con otros grupos de investigación.", s_td),
            Paragraph("<b>Coop</b> = Productos coautorizados (donde colaboró con otros autores vs. autoría solitaria).", s_td),
        ],
    ]
    t_adapt = Table(adapt_data, colWidths=[3.5 * cm, 6.8 * cm, 7.7 * cm])
    t_adapt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), _VERDE_UPC),
        ('GRID', (0, 0), (-1, -1), 0.5, _GRIS_BORDE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [_BLANCO, _AZUL_SUAVE]),
    ]))
    story.append(t_adapt)
    story.append(Spacer(1, 4))

    # 4. LOS DOS NIVELES DEL PROYECTO
    story.append(Paragraph("4. Los Dos Niveles que Implementa Nuestro Proyecto", s_h1))

    niveles_data = [
        [
            Paragraph("<b>Nivel 1 — Parcial 2 (Taller2.py / Taller2.cpp)</b><br/>"
                      "<i>Conteos crudos en ventana directa</i><br/>"
                      "• Filtra productos por su ventana de tiempo (5, 7 o 10 años).<br/>"
                      "• Suma conteos de calidad según descripción y subtipo.<br/>"
                      "• Reemplaza directamente en la fórmula con ponderaciones oficiales.<br/><br/>"
                      "<b>Resultados del Examen:</b><br/>"
                      "• Grupo del Enunciado: <b>I_Grupo = 12.667</b><br/>"
                      "  (3.7×2 + 2.3×1 + 0.4×2 + 0.5×1 + 1.0×1 + 0.1×0.667 + 0.3×2)<br/>"
                      "• Investigador del Enunciado: <b>I_Investigador = 11.700</b><br/>"
                      "  (3.7×2 + 2.3×1 + 0.4×1 + 1.0×1 + 0.1×0 + 0.3×2)", s_td),
            Paragraph("<b>Nivel 2 — Sistema Khemia (Norma Oficial Minciencias 2024)</b><br/>"
                      "<i>Normalización poblacional logarítmica (§2.2.9 → §3.10)</i><br/>"
                      "1. <b>Tasa logarítmica:</b> λ = ln(n / período + 1) para regular cantidad.<br/>"
                      "2. <b>Peso Global (§3.6):</b> Ancla de Tabla 6 × Peso Relativo del Anexo 1.<br/>"
                      "3. <b>Indicador de Clase (§3.8.1):</b> Ind_Clase = Σ λ · PesoGlobal.<br/>"
                      "4. <b>Normalización (§3.9):</b> Índice = Ind_Clase / max(Ind_Clase_población).<br/><br/>"
                      "<b>Resultado en Khemia:</b><br/>"
                      "• Escala teórica acotada entre <b>0.0 y 10.0 puntos</b>.<br/>"
                      "• Grupo AITICE (#10): <b>0.854</b> (sin validar) a <b>4.554</b> (con calidad A1 validada).<br/>"
                      "• Paridad absoluta verificada entre Python, C++ y contrato golden JSON.", s_td),
        ]
    ]
    t_niveles = Table(niveles_data, colWidths=[8.8 * cm, 9.2 * cm])
    t_niveles.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, _GRIS_BORDE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (0, 0), _BLANCO),
        ('BACKGROUND', (1, 0), (1, 0), _AZUL_SUAVE),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_niveles)
    story.append(Spacer(1, 4))

    # 5. GUION PARA EL VIDEO
    story.append(Paragraph("5. Guion Sugerido para la Sustentación en Video (1 a 2 Minutos)", s_h1))
    
    script_content = (
        "<i>«Buenas tardes, profesor. Para resolver los ejercicios del parcial sobre el indicador de producción científica "
        "del grupo y del investigador, implementamos la fórmula de la <b>Calificación Global Compuesta de Minciencias 2024, "
        "sección 3.10</b>.<br/><br/>"
        "Esta fórmula se llama 'compuesta' porque no se limita a contar publicaciones; integra nueve variables ponderadas: "
        "la producción de alta calidad TOP, Tipo A y Tipo B, la apropiación social del conocimiento, la divulgación científica, "
        "la formación de talento humano en doctorados y maestrías, y finalmente la dinámica de trabajo en equipo con la cohesión interna y la cooperación externa.<br/><br/>"
        "Un detalle matemático clave es que la suma de sus coeficientes —3.7, 2.3, 0.4, 1.5, 0.5, 1.0, 0.2, 0.1 y 0.3— da exactamente 10 puntos, "
        "lo que representa una escala porcentual normalizada donde el 64% de la calificación corresponde a la calidad científica dura.<br/><br/>"
        "Para el grupo de la URL asignada, procesamos los productos en ventana y obtenemos: 2 productos TOP, 1 Tipo A, 2 Tipo B, 1 de divulgación y 1 de formación, "
        "con una cohesión de 0.667 y 2 productos cooperativos. Al sustituir en la ecuación obtenemos exactamente el <b>I_Grupo de 12.667</b>.<br/><br/>"
        "Para el investigador, el modelo oficial de Minciencias no define un puntaje numérico continuo sino categorías de reconocimiento; por tanto, "
        "aplicamos la adaptación solicitada en el parcial: evaluamos su CvLAC personal, anulamos la cohesión interna porque no aplica a una sola persona, "
        "y medimos la cooperación mediante sus coautorías, obteniendo un <b>I_Investigador de 11.700</b>.<br/><br/>"
        "Ambos cálculos fueron implementados tanto en Python como en C++, garantizando paridad exacta de resultados y disponibilidad en el dashboard y la plataforma web Khemia.»</i>"
    )

    t_script = Table([[Paragraph(script_content, s_script_text)]], colWidths=[18.0 * cm])
    t_script.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fefce8")),  # Fondo tenue
        ('BOX', (0, 0), (-1, -1), 0.8, _DORADO),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_script)

    # Compilar PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generado exitosamente en: {OUTPUT_PDF}")


if __name__ == "__main__":
    crear_pdf()
