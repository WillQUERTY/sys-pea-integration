"""
backend/app/cvlac_scraper.py
Fachada de compatibilidad hacia atrás para el extractor de CvLAC.
La lógica modularizada reside en `backend.app.scraping.cvlac`:
  - `scraping.cvlac.client`: Cliente HTTP y validación de endpoints CvLAC.
  - `scraping.cvlac.dtos`: Dataclasses para artículos, libros, capítulos, software, eventos y CvData.
  - `scraping.cvlac.normalizer`: Normalizador de categorías de investigadores Minciencias.
  - `scraping.cvlac.parser`: CvParser con extracción DOM resiliente y fallback de texto plano.
  - `scraping.cvlac.commit_service`: CvCommitService para persistencia transaccional y conciliación.
"""

from .scraping.client import GruplacHttpClient as SourceValidator
from .scraping.cvlac import (
    CVLAC_URL_TEMPLATE,
    CvArticle,
    CvBook,
    CvBookChapter,
    CvCommitService,
    CvData,
    CvEvent,
    CvParser,
    CvProject,
    CvSoftware,
    fetch_cvlac_text,
    normalize_researcher_category,
)
from .scraping.normalizer import GruplacNormalizer

__all__ = [
    "CVLAC_URL_TEMPLATE",
    "CvArticle",
    "CvBook",
    "CvBookChapter",
    "CvCommitService",
    "CvData",
    "CvEvent",
    "CvParser",
    "CvProject",
    "CvSoftware",
    "GruplacNormalizer",
    "SourceValidator",
    "fetch_cvlac_text",
    "normalize_researcher_category",
]
