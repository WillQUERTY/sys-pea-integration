from typing import Any
import unicodedata
from .. import repository


def _normalize_text(text: Any) -> str:
    """Normalize text by stripping diacritics and converting to lowercase."""
    if not text:
        return ""
    s = str(text)
    nfkd = unicodedata.normalize('NFKD', s)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip().lower()


def _reload_ram_from_db(conn_str: str) -> bool:
    """
    Decisión de arquitectura (excepción documentada): SOLO los servicios de
    ingesta (GruplacCommitService, CvCommitService) escriben directo a SQL
    Server con pyodbc, porque la ingesta masiva exige transacción atómica y
    conciliación/dedupe canónico que el CRUD del núcleo C++ no expone.
    Todo lo demás pasa por repository.py. Tras cada commit recargamos la RAM
    desde la BD (repository.load_from_db limpia antes de cargar: no duplica).
    Devuelve True si la RAM quedó sincronizada.
    """
    try:
        repository.load_from_db(conn_str)
        return True
    except Exception as e:
        print(f"[WARN] No se pudo recargar la RAM desde la BD tras la ingesta: {e}")
        return False
