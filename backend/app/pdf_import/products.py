# backend/app/pdf_import/products.py
"""
Parseo de la sección de producción bibliográfica y académica del informe PDF.
Identificación de familias, subtipos con conteos, títulos envueltos y metadatos
(Año, DOI, Estado, Autores).
"""

from typing import Any, Dict, List, Optional
import re

from .. import repository
from ..scraper import GruplacNormalizer, ScrapedAuthor, ScrapedProduct
from .extractor import line_text, norm

# Línea de meta de producto ('Año: 2021 | DOI: ... | Estado: ... | Autores: ...').
META_RE = re.compile(r"^\s*(a[nñ]o|doi|estado|autores)\s*:", re.IGNORECASE)


def emit_product(products: List[ScrapedProduct], title: str, subtype_code: Optional[str],
                 warnings: List[str]) -> None:
    """Emite un producto simple sin metadatos detallados."""
    norm_title = GruplacNormalizer.normalize(title)
    products.append(ScrapedProduct(
        title=norm_title,
        raw_text=norm_title,
        section="pdf",
        subtype_code=subtype_code,
        external_code=GruplacNormalizer.product_external_code(
            norm_title, None, ""
        ),
        warnings=[],
    ))


def emit_meta_product(products: List[ScrapedProduct], title_words: List[str],
                      subtype_code: Optional[str], meta: str,
                      warnings: List[str]) -> None:
    """Emite un producto estructurado con metadatos desglosados (año, DOI, autores)."""
    title = GruplacNormalizer.normalize(" ".join(title_words))
    doi = None
    year = None
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
                # perder el último nombre real.
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


def parse_products(lines: List[Dict[str, Any]], warnings: List[str]) -> List[ScrapedProduct]:
    """
    'Producción bibliográfica y académica': bandas de familia, subtipos con
    '(N)' y productos como título + línea de meta ('Año: ... | DOI: ...').
    El subtipo se resuelve por NOMBRE contra el catálogo (funciona sin BD:
    get_product_catalogs cae al archivo); sin match el producto entra sin
    clasificar (ruta auditable del commit).
    """
    name_to_code: Dict[str, str] = {}
    family_names: Dict[str, None] = {}  # set ordenado por claridad
    try:
        catalogs = repository.get_product_catalogs()
        for s in catalogs.get("subtypes", []):
            name_to_code[norm(s["name"])] = s["code"]
        for f in catalogs.get("families", []):
            family_names[norm(f["name"])] = None
    except Exception as exc:
        warnings.append(f"catalogo no disponible: {exc}")
    # Etiquetas literales del informe para agrupaciones sin catálogo.
    family_names[norm("Otros productos")] = None
    family_names[norm("Otras actividades y producción institucional declarada")] = None
    unclassified_label = norm("Sin subtipo clasificado")

    subtype_code: Optional[str] = None
    title_words: List[str] = []
    products: List[ScrapedProduct] = []
    meta_buf: List[str] = []          # línea de meta en curso (puede envolverse)
    meta_block: Optional[int] = None  # bloque PDF de esa línea de meta

    def _flush():
        nonlocal title_words
        if title_words and subtype_code is not None:
            emit_product(products, " ".join(title_words), subtype_code, warnings)
        elif title_words:
            # Título acumulado sin banner de subtipo: familia pura (raro).
            warnings.append(f"producto sin subtipo visible: '{' '.join(title_words)[:60]}...'")
        title_words = []

    def _flush_meta():
        """Emite el producto en curso: su meta terminó de envolverse."""
        nonlocal title_words, meta_buf, meta_block
        if meta_buf:
            emit_meta_product(products, title_words, subtype_code, " ".join(meta_buf), warnings)
            title_words = []
            meta_buf, meta_block = [], None

    for line in lines:
        text = line_text(line)
        # Banner de familia (p.ej. 'Generación de Nuevo Conocimiento'): no es
        # un producto; limpia títulos huérfanos en silencio.
        if norm(text) in family_names:
            _flush_meta()
            title_words = []
            continue
        m = re.match(r"^(.+?)\s+\((\d+)\)\s*$", text)
        if m:
            # Banner de subtipo con conteo. (También atrapa 'Calidad A1 (2)'
            # si la página trajera categorías: se resuelve por nombre igual.)
            _flush_meta()
            _flush()
            sub_name = m.group(1).strip()
            if norm(sub_name) == unclassified_label:
                # Etiqueta del propio informe para productos ya sin subtipo:
                # entran sin clasificar a propósito (ruta auditable del commit).
                subtype_code = None
            else:
                subtype_code = name_to_code.get(norm(sub_name))
                if subtype_code is None:
                    warnings.append(f"subtipo sin match en catalogo: '{sub_name}'")
            continue
        if META_RE.match(text):
            # Línea de meta del producto actual ('Autores: ...' largo se
            # envuelve: la continuación comparte bloque PDF con esta línea).
            _flush_meta()
            meta_buf, meta_block = [text], line.get("block")
            continue
        if meta_buf and line.get("block") is not None and line.get("block") == meta_block:
            meta_buf.append(text)  # envoltura de la meta en curso
            continue
        _flush_meta()
        # Título (puede envolverse en varias líneas).
        title_words.append(text)

    _flush_meta()
    _flush()
    return products
