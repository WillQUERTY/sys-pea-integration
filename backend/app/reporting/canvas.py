from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

from .theme import (
    _AZUL_NAVY,
    _BLANCO,
    _FONT,
    _FONT_BOLD,
    _GRIS_BORDE,
    _GRIS_MEDIO,
    _VERDE_UPC,
)


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
