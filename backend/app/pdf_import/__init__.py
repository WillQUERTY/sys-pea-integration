# backend/app/pdf_import/__init__.py
"""
Módulo de importación de grupos desde PDF (T-13 / Taller 2, req. 7).
Soporta informes generados por el sistema y print-to-PDF de GrupLAC Scienti.
"""

from typing import List

from ..scraper import ScrapedGroupData
from .basic_data import parse_basicos
from .extractor import PdfImportError, extract_lines, split_section
from .members_projects import parse_members, parse_projects, parse_research_lines
from .products import parse_products


def parse_pdf_gruplac(file_bytes: bytes) -> ScrapedGroupData:
    """
    PDF estilo GrupLAC -> ScrapedGroupData (el mismo DTO que consume
    GruplacCommitService). Requisitos duros: texto extraíble, sección
    'Datos básicos', código COL válido y nombre del grupo.
    """
    lines = extract_lines(file_bytes)
    sections = split_section(lines)
    if "basicos" not in sections:
        raise PdfImportError(
            "El PDF no trae la seccion 'Datos basicos'. Se espera el informe "
            "del sistema o el print-to-PDF de la pagina GrupLAC de Scienti."
        )

    warnings: List[str] = []
    group, institutions = parse_basicos(sections["basicos"])

    members = parse_members(sections.get("integrantes", []))
    products = parse_products(sections.get("produccion", []), warnings)
    projects = parse_projects(sections.get("proyectos", []))
    research_lines = parse_research_lines(sections.get("lineas", []))

    if not members:
        warnings.append("PDF sin integrantes visibles")
    if not products:
        warnings.append("PDF sin productos visibles")

    return ScrapedGroupData(
        group=group,
        institutions=institutions,
        members=members,
        products=products,
        projects=projects,
        research_lines=research_lines,
        warnings=warnings,
    )


__all__ = ["parse_pdf_gruplac", "PdfImportError"]
