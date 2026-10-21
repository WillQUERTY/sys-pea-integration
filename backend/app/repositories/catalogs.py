import json
import logging
import pathlib
from typing import Optional

logger = logging.getLogger("peai.repository")

_cached_file_catalogs: Optional[dict] = None


def _get_product_catalogs_from_file() -> dict:
    """Lee y normaliza el catalogo canonico 2024 desde database/catalog_2024.json."""
    global _cached_file_catalogs
    if _cached_file_catalogs is not None:
        return _cached_file_catalogs

    cat_path = pathlib.Path(__file__).resolve().parent.parent.parent.parent / "database" / "catalog_2024.json"
    if not cat_path.exists():
        logger.warning(f"No se encontro archivo de catalogo en {cat_path}")
        return {"families": [], "subtypes": [], "quality_categories": []}

    try:
        doc = json.loads(cat_path.read_text(encoding="utf-8"))
        families = []
        subtypes = []
        quality_categories = []

        f_idx = 1
        s_idx = 1
        c_idx = 1

        for fam in doc.get("families", []):
            f_id = f_idx
            f_idx += 1
            families.append({
                "id": f_id,
                "code": fam["code"],
                "name": fam["name"],
                "sort_order": fam.get("sort_order")
            })
            for sub in fam.get("subtypes", []):
                s_id = s_idx
                s_idx += 1
                subtypes.append({
                    "id": s_id,
                    "family_id": f_id,
                    "code": sub["code"],
                    "name": sub["name"],
                    "model_ref": sub.get("model_ref"),
                    "sort_order": sub.get("sort_order")
                })
                for cat in sub.get("categories", []):
                    c_id = c_idx
                    c_idx += 1
                    quality_categories.append({
                        "id": c_id,
                        "code": cat["code"],
                        "name": cat.get("label") or cat.get("name"),
                        "subtype_id": s_id,
                        "measurement_class": cat.get("measurement_class"),
                        "weight": float(cat["weight"]) if cat.get("weight") is not None else None,
                        "global_weight": float(cat["global_weight"]) if cat.get("global_weight") is not None else None,
                        "sort_order": cat.get("sort_order")
                    })

        _cached_file_catalogs = {
            "families": families,
            "subtypes": subtypes,
            "quality_categories": quality_categories
        }
        return _cached_file_catalogs
    except Exception as e:
        logger.error(f"Error parseando catalogo {cat_path}: {e}")
        return {"families": [], "subtypes": [], "quality_categories": []}


def get_product_catalogs(conn_str: str = "") -> dict:
    """Catalogs (families/subtypes/quality categories).

    Reads through the C++ core via pybind11 (abpoxx_pybind.get_product_catalogs_json),
    so all SQL stays inside the C++ core. Falls back to the canonical JSON file
    for offline/dev mode. No pyodbc in this module.
    """
    if not conn_str:
        from .. import repository
        conn_str = repository._active_connection_string

    if conn_str:
        try:
            import abpoxx_pybind
            return json.loads(abpoxx_pybind.get_product_catalogs_json(conn_str))
        except Exception as e:
            logger.warning(f"C++ core catalog read failed: {e}; fallback a catalogo JSON canonico.")

    return _get_product_catalogs_from_file()
