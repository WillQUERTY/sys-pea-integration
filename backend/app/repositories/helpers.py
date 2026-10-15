import re
import urllib.parse
import unicodedata
from typing import Any, Optional


def sanitize_str(text: Any) -> str:
    """Return clean text while preserving all international characters (ñ, á, etc)."""
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    return text.strip()


def _normalize_text(text: Any) -> str:
    """Normalize text by stripping diacritics and converting to lowercase."""
    if not text:
        return ""
    s = str(text)
    nfkd = unicodedata.normalize('NFKD', s)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip().lower()


def clean_doi(val: Any) -> str:
    """
    Limpia y valida un identificador DOI según la sintaxis estándar de la IDF/Crossref.
    Acepta formatos como:
      - '10.1007/s00339-026-09669-x'
      - 'https://doi.org/10.52152/5'
      - 'http://dx.doi.org/10.15665/esc.v15i1.1118'
      - 'doi: 10.1016/j.jss.2020.110825.'
      - 'http://dx.doi.org/10.24054%2F01204211.v28.n28.2016.2466'
    Rechaza basura (autores, ISSNs, file://, drive.google.com, palabras aleatorias).
    Devuelve el DOI limpio preservando la grafía original del sufijo.
    Devuelve "" si el texto no contiene un DOI válido.
    """
    if val is None:
        return ""
    s = str(val).strip()
    if not s:
        return ""
    s = urllib.parse.unquote(s)
    s = re.sub(r"^https?://(?:dx\.)?doi\.org/", "", s, flags=re.IGNORECASE)
    s = re.sub(r"^(?:doi:\s*|doi/|doi\s+)", "", s, flags=re.IGNORECASE).strip()
    m = re.search(r"\b(10\.\d+/[^\s,;\"'<>]+)", s)
    if not m:
        return ""
    clean = m.group(1).rstrip(".,;()[]\"'")
    return clean.strip()


def safe_get_str(obj: Any, attr_name: str) -> Optional[str]:
    """Safe attribute getter with encoding error handling."""
    try:
        val = getattr(obj, attr_name)
        return val
    except UnicodeDecodeError:
        return "[Error de Codificación]"
