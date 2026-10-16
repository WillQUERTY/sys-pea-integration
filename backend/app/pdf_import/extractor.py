# backend/app/pdf_import/extractor.py
"""
Extracción de texto y segmentación en líneas visuales y secciones desde PDF.
Utiliza PyMuPDF (fitz) con tolerancia vertical y filtrado de cabecera/folio.
"""

from typing import Any, Dict, List, Tuple
import unicodedata

from ..scraper import GruplacNormalizer


class PdfImportError(ValueError):
    """Errores fatales del PDF (el endpoint los mapea a HTTP 400)."""


# Banda vertical útil del informe (coordenadas top-down de PyMuPDF): fuera
# de [50, 790] viven la barra azul de cabecera (~21pt) y el folio (~811pt).
BODY_Y_MIN = 50.0
BODY_Y_MAX = 790.0

# Tolerancia al agrupar palabras en líneas visuales (puntos).
LINE_Y_TOL = 3.0


def norm(text: str) -> str:
    """Minúsculas sin acentos ni espacios múltiples: para matchear secciones
    y etiquetas contra alias (agnóstico al case real del PDF)."""
    s = GruplacNormalizer.normalize(text)
    nfkd = unicodedata.normalize("NFD", s)
    s = "".join(c for c in nfkd if unicodedata.category(c) != "Mn")
    # Guiones tipográficos de Scienti ('Inicio – Fin') a guion simple.
    return s.replace("–", "-").replace("—", "-").lower()


# Sección -> clave de parseo. Alias normalizados (norm) de los banners del
# informe propio y del visor GrupLAC de Scienti.
SECTION_ALIASES: Dict[str, str] = {}
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
    SECTION_ALIASES[norm(_alias)] = _key


def extract_lines(pdf_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Extrae las líneas visuales del PDF (banda-y tolerante) fuera del marco,
    ordenadas por (página, y, x). Cada línea: {"page", "y", "block",
    "words": [(x0, text, block)]} — el bloque de PyMuPDF agrupa las líneas
    envueltas de un mismo párrafo/celda (se usa para unir metas largas).
    PdfImportError si el archivo no es PDF o no tiene texto extraíble.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:  # pragma: no cover - deploy sin PyMuPDF
        try:
            import pymupdf as fitz  # PyMuPDF >= 1.24.10 renombra el módulo
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
            if y0 < BODY_Y_MIN or y0 > BODY_Y_MAX:
                continue  # cabecera azul / folio
            if bands and abs(bands[-1][0] - y0) <= LINE_Y_TOL:
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


def line_text(line: Dict[str, Any]) -> str:
    """Concatena las palabras de una línea visual en orden x horizontal."""
    return " ".join(w[1] for w in line["words"])


def split_section(lines: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Reparte las líneas en secciones según los banners conocidos. Las
    líneas previas al primer banner (título del informe, resumen) se
    descartan salvo el nombre del grupo (línea inicial)."""
    sections: Dict[str, List[Dict[str, Any]]] = {}
    current = "preambulo"
    for line in lines:
        key = SECTION_ALIASES.get(norm(line_text(line)))
        if key is not None:
            current = key
            sections.setdefault(current, [])
            continue
        sections.setdefault(current, []).append(line)
    return sections
