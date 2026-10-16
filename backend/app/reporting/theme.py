import os
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph

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
# Estilos Tipográficos Jerárquicos - GrupLAC
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

# ------------------------------------------------------------------
# Estilos Tipográficos Jerárquicos - Dossier Ejecutivo
# ------------------------------------------------------------------
_S_DOSSIER_TITULO = ParagraphStyle(
    "dossier_titulo", fontName=_FONT_BOLD, fontSize=16, leading=20,
    textColor=_AZUL_NAVY, spaceAfter=2
)
_S_DOSSIER_SUB = ParagraphStyle(
    "dossier_sub", fontName=_FONT_BOLD, fontSize=8.5, leading=11,
    textColor=_VERDE_UPC, spaceAfter=4
)
_S_DOSSIER_DESC = ParagraphStyle(
    "dossier_desc", fontName=_FONT, fontSize=7.5, leading=10.5,
    textColor=_GRIS_MEDIO, spaceAfter=8
)
_S_SECCION_HDR = ParagraphStyle(
    "d_seccion_hdr", fontName=_FONT_BOLD, fontSize=9.5, leading=12.5,
    textColor=_BLANCO, backColor=_AZUL_NAVY, borderPadding=(3.5, 6),
    spaceBefore=8, spaceAfter=4, keepWithNext=True
)
_S_D_CELDA = ParagraphStyle(
    "d_celda", fontName=_FONT, fontSize=7, leading=9.5,
    textColor=_GRIS_OSCURO
)
_S_D_CELDA_BOLD = ParagraphStyle(
    "d_celda_b", fontName=_FONT_BOLD, fontSize=7, leading=9.5,
    textColor=_GRIS_OSCURO
)
_S_D_CELDA_HDR = ParagraphStyle(
    "d_celda_hdr", fontName=_FONT_BOLD, fontSize=7.5, leading=10,
    textColor=_BLANCO
)
_S_D_ALERT_TITLE = ParagraphStyle(
    "d_alt_title", fontName=_FONT_BOLD, fontSize=8.5, leading=11,
    textColor=_AZUL_NAVY
)
_S_D_ALERT_BODY = ParagraphStyle(
    "d_alt_body", fontName=_FONT, fontSize=7, leading=9.5,
    textColor=_GRIS_OSCURO
)


def _clean_text(s: str) -> str:
    """Repara mojibake de doble codificación heredado en títulos y autores."""
    if not s:
        return ""
    replacements = {
        "Â¿": "¿", "Â¡": "¡",
        "Ã¡": "á", "Ã©": "é", "Ã­": "í", "Ã³": "ó", "Ãº": "ú",
        "Ã ": "Á", "Ã‰": "É", "Ã ": "Í", "Ã“": "Ó", "Ãš": "Ú",
        "Ã±": "ñ", "Ã‘": "Ñ",
        "Ã?": "Ó",
    }
    for k, v in replacements.items():
        if k in s:
            s = s.replace(k, v)
    return s


def _p(texto: str, estilo) -> Paragraph:
    return Paragraph(_clean_text(str(texto or "")), estilo)
