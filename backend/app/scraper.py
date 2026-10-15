"""
backend/app/scraper.py
Extractor Estructural, Normalizador y Servicio de Persistencia Transaccional para GrupLAC (Khemia).
Fachada limpia compatible con Clean Architecture que delega en el paquete backend.app.scraping.
"""

import os
import sys
from typing import Any, Dict, List, Optional

from .scraping import (
    ALLOWED_HOSTS,
    GRUPLAC_SEARCH_URL,
    MAX_YEAR,
    MIN_YEAR,
    SECTION_MAP,
    STRUCTURAL_HEADERS,
    GruplacCommitService,
    GruplacHtmlParser,
    GruplacHttpClient,
    GruplacNormalizer,
    ScrapedAuthor,
    ScrapedGroupData,
    ScrapedMember,
    ScrapedProduct,
    ScrapedProject,
    build_preview,
    enrich_members_with_cvlac,
    logger,
    scrape_gruplac,
    scienti,
)


def _busqueda_gruplac_html(fields: Dict[str, str]) -> Optional[str]:
    """Ejecuta el formulario del buscador oficial de Scienti y devuelve el HTML."""
    return scienti._busqueda_gruplac_html(fields)


def buscar_nro_gruplac(nombre: str = "", codigo: str = "") -> Optional[str]:
    """Resuelve el nro interno de GrupLAC de un grupo usando el buscador oficial de Scienti."""
    return scienti.buscar_nro_gruplac(nombre, codigo, search_fn=_busqueda_gruplac_html)


def buscar_grupos_scienti(
    nombre: str = "",
    institucion: str = "",
    departamento: str = "",
    clasificacion: str = "",
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Busca grupos en el buscador oficial de Scienti con soporte para inyección de mock."""
    return scienti.buscar_grupos_scienti(
        nombre=nombre,
        institucion=institucion,
        departamento=departamento,
        clasificacion=clasificacion,
        limit=limit,
        search_fn=_busqueda_gruplac_html,
    )


__all__ = [
    "ALLOWED_HOSTS",
    "GRUPLAC_SEARCH_URL",
    "GruplacCommitService",
    "GruplacHtmlParser",
    "GruplacHttpClient",
    "GruplacNormalizer",
    "MAX_YEAR",
    "MIN_YEAR",
    "SECTION_MAP",
    "STRUCTURAL_HEADERS",
    "ScrapedAuthor",
    "ScrapedGroupData",
    "ScrapedMember",
    "ScrapedProduct",
    "ScrapedProject",
    "_busqueda_gruplac_html",
    "build_preview",
    "buscar_grupos_scienti",
    "buscar_nro_gruplac",
    "enrich_members_with_cvlac",
    "logger",
    "scrape_gruplac",
]

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    preview_mode = "--preview" in sys.argv

    if not args:
        print("Uso: python -m backend.app.scraper <URL_GRUPLAC> [--preview] [--enrich-cvlac] [--cvlac-workers N]")
        print("     --preview      : solo extrae y muestra la vista previa, sin escribir en BD.")
        print("     --enrich-cvlac : tras importar, descarga el CvLAC de cada integrante con cod_rh.")
        print("     --cvlac-workers N : hilos paralelos para la cascada CvLAC (default 8, optimo medido).")
        sys.exit(1)

    url_arg = args[0]
    enrich_mode = "--enrich-cvlac" in sys.argv
    workers = 8
    for a in sys.argv:
        if a.startswith("--cvlac-workers="):
            workers = max(1, int(a.split("=", 1)[1]))
    from .config import settings
    from . import repository
    conn_str = os.environ.get("PEAI_SQLSERVER_CONNECTION") or settings.connection_string
    if not settings.DB_PASSWORD:
        print("Falta DB_PASSWORD: configura backend/.env antes de importar a la BD.")
        sys.exit(1)

    if preview_mode:
        scrape_gruplac(url_arg, preview=True)
    else:
        repository.initialize(repository.InitMode.Database, conn_str)
        repository._active_connection_string = conn_str
        scrape_gruplac(url_arg, conn_str, enrich_cvlac=enrich_mode, cvlac_workers=workers)