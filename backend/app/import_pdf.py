# backend/app/import_pdf.py
"""
Fachada backward-compatible para el importador PDF de grupos (T-13).
La implementación detallada reside en el paquete modular backend.app.pdf_import:
  - extractor.py        : Extracción de líneas visuales (PyMuPDF) y detección de secciones
  - basic_data.py       : Parseo de datos básicos del grupo, código COL e instituciones
  - members_projects.py : Parseo de integrantes, proyectos de investigación y líneas
  - products.py         : Parseo de producción bibliográfica, familias y metadatos
"""

from .pdf_import import PdfImportError, parse_pdf_gruplac
from .pdf_import.extractor import (
    extract_lines as _extract_lines,
    line_text as _line_text,
    norm as _norm,
    split_section as _split_section,
)
from .pdf_import.basic_data import (
    match_label as _match_label,
    parse_basicos as _parse_basicos,
    parse_creation_date as _parse_creation_date,
    parse_kv_lines as _parse_kv_lines,
    split_location as _split_location,
)
from .pdf_import.members_projects import (
    member_from_row as _member_from_row,
    parse_members as _parse_members,
    parse_period as _parse_period,
    parse_projects as _parse_projects,
    parse_research_lines as _parse_research_lines,
    project_from_row as _project_from_row,
)
from .pdf_import.products import (
    emit_meta_product as _emit_meta_product,
    emit_product as _emit_product,
    parse_products as _parse_products,
)

__all__ = [
    "parse_pdf_gruplac",
    "PdfImportError",
    "_extract_lines",
    "_line_text",
    "_norm",
    "_split_section",
    "_parse_basicos",
    "_parse_members",
    "_parse_products",
    "_parse_projects",
    "_parse_research_lines",
]
