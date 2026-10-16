"""
Fachada de compatibilidad hacia atrás para el módulo de reportes.
La lógica modularizada reside en `backend.app.reporting`:
  - `reporting.theme`: Paleta de colores, tipografía institucional y sanitización de texto.
  - `reporting.canvas`: NumberedCanvas para paginación 'Página X de Y' y marcas de agua.
  - `reporting.csv_exporters`: Exportadores CSV para ranking y productos de grupos.
  - `reporting.gruplac_pdf`: Generación del informe PDF de grupo estilo GrupLAC.
  - `reporting.executive_dossier_pdf`: Generación del Dossier Ejecutivo tripartito (Decanatura/Vicerrectoría).
"""

from .reporting import (
    NumberedCanvas,
    _AZUL,
    _AZUL_ACCENT,
    _AZUL_CLARO,
    _AZUL_NAVY,
    _AZUL_SUAVE,
    _BLANCO,
    _DORADO,
    _FONT,
    _FONT_BOLD,
    _GRIS,
    _GRIS_BORDE,
    _GRIS_MEDIO,
    _GRIS_OSCURO,
    _PURPURA,
    _VERDE_UPC,
    _clean_text,
    _p,
    build_group_executive_dossier_pdf,
    build_group_report_pdf,
    export_group_products_csv,
    export_group_ranking_csv,
)

__all__ = [
    "NumberedCanvas",
    "_AZUL",
    "_AZUL_ACCENT",
    "_AZUL_CLARO",
    "_AZUL_NAVY",
    "_AZUL_SUAVE",
    "_BLANCO",
    "_DORADO",
    "_FONT",
    "_FONT_BOLD",
    "_GRIS",
    "_GRIS_BORDE",
    "_GRIS_MEDIO",
    "_GRIS_OSCURO",
    "_PURPURA",
    "_VERDE_UPC",
    "_clean_text",
    "_p",
    "build_group_executive_dossier_pdf",
    "build_group_report_pdf",
    "export_group_products_csv",
    "export_group_ranking_csv",
]
