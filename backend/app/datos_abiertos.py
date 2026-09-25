"""
Enriquecimiento de investigadores desde Datos Abiertos de Colombia (Socrata).

Fuente oficial: dataset «Investigadores Reconocidos por convocatoria» de
Minciencias (https://www.datos.gov.co/d/bqtm-4y2h), indexado por
`id_persona_pr`, que coincide con el `cod_rh` del CvLAC/GrupLAC.

Aporta por investigador: nivel de formación, clasificación Minciencias
(Junior/Asociado/Senior/Emérito), género, geografía de nacimiento/residencia
e institución de filiación. No aporta ORCID ni email (eso queda para CvLAC).

No requiere scraping: es la API pública Socrata de datos.gov.co.
"""

import json
import logging
from typing import Any, Dict, List, Optional

import requests

from . import repository
from .models import Researcher

logger = logging.getLogger("peai.datos_abiertos")

SOCRATA_BASE = "https://www.datos.gov.co/resource/bqtm-4y2h.json"
REQUEST_TIMEOUT = 20


def _normalize_cod_rh(external_code: str) -> Optional[str]:
    """Normaliza el código a formato id_persona_pr (10 dígitos con ceros)."""
    digits = "".join(c for c in (external_code or "") if c.isdigit())
    if not digits:
        return None
    return digits.zfill(10)


def fetch_investigador(cod_rh: str) -> Optional[Dict[str, Any]]:
    """
    Consulta el registro más reciente del investigador por cod_rh en el
    dataset de Investigadores Reconocidos. Devuelve None si no aparece.
    """
    normalized = _normalize_cod_rh(cod_rh)
    if not normalized:
        return None
    params = {
        "$where": f"id_persona_pr='{normalized}'",
        "$order": "ano_convo DESC",
        "$limit": 1,
    }
    try:
        resp = requests.get(SOCRATA_BASE, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        rows = resp.json()
    except Exception as e:
        logger.warning(f"[DatosAbiertos] Error consultando {normalized}: {e}")
        return None
    return rows[0] if rows else None


BATCH_SIZE = 40  # ids por consulta Socrata (los URLs muy largos se rechazan)


def fetch_investigadores_batch(cod_rhs: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Trae TODOS los investigadores en pocas consultas Socrata usando IN(...)
    en lugar de una petición por cod_rh. Devuelve {cod_rh: registro más reciente}.
    Socrata aguanta esto sin problema: es API pública pensada para consultas.
    """
    normalized = []
    for code in cod_rhs:
        n = _normalize_cod_rh(code)
        if n:
            normalized.append(n)
    if not normalized:
        return {}

    latest: Dict[str, Dict[str, Any]] = {}
    for i in range(0, len(normalized), BATCH_SIZE):
        chunk = normalized[i : i + BATCH_SIZE]
        ids = ",".join(f"'{c}'" for c in chunk)
        params = {
            "$where": f"id_persona_pr in({ids})",
            "$limit": len(chunk) * 20,  # un investigador puede salir en varias convocatorias
        }
        try:
            resp = requests.get(SOCRATA_BASE, params=params, timeout=REQUEST_TIMEOUT * 3)
            resp.raise_for_status()
            rows = resp.json()
        except Exception as e:
            logger.warning(f"[DatosAbiertos] Error en lote {i // BATCH_SIZE}: {e}")
            continue
        for row in rows:
            code = row.get("id_persona_pr", "")
            prev = latest.get(code)
            # quedarnos con la convocatoria más reciente
            if not prev or (row.get("ano_convo") or "") > (prev.get("ano_convo") or ""):
                latest[code] = row
    return latest


def _map_fields(record: Dict[str, Any]) -> Dict[str, Any]:
    """Traduce el registro Socrata a campos del modelo Researcher."""
    updates: Dict[str, Any] = {}

    level = (record.get("nme_niv_form_pr") or "").strip()
    if level and level != "No registra":
        updates["highest_education_level"] = level

    birth_country = (record.get("nme_pais_nac_pr") or "").strip()
    if birth_country and birth_country != "No registra":
        updates["nationality"] = birth_country

    residence = (record.get("nme_pais_res_pr") or "").strip()
    if residence and residence != "No registra":
        updates["country_of_residence"] = residence

    classification = (record.get("nme_clasificacion_pr") or "").strip()
    convocatoria = (record.get("nme_convocatoria") or "").strip()
    if classification and classification != "No registra":
        updates["classification_records"] = json.dumps(
            {
                "source": "datos.gov.co/Investigadores-Reconocidos",
                "clasificacion": classification,
                "convocatoria": convocatoria,
                "ano": (record.get("ano_convo") or "")[:4],
            },
            ensure_ascii=False,
        )

    return updates


def enrich_researcher(researcher_id: int) -> Dict[str, Any]:
    """
    Enriquece un investigador consultando datos abiertos por su cod_rh.
    Solo rellena campos vacíos; classification_records siempre se actualiza.
    """
    current = repository.get_researcher(researcher_id)
    record = fetch_investigador(current.external_code)
    return _apply_enrichment(current, record)


def _apply_enrichment(res: Researcher, record: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Aplica un registro Socrata a un investigador (rellena vacíos; refresca clasificación)."""
    if not record:
        return {
            "status": "not_found",
            "researcher_id": res.id,
            "external_code": res.external_code,
            "message": "Sin registro en Investigadores Reconocidos (datos.gov.co)",
        }

    mapped = _map_fields(record)
    updates_payload: Dict[str, Any] = {}
    for field_name, value in mapped.items():
        if field_name == "classification_records":
            updates_payload[field_name] = value
        elif not getattr(res, field_name):
            updates_payload[field_name] = value

    if not updates_payload:
        return {"status": "up_to_date", "researcher_id": res.id, "external_code": res.external_code}

    merged = res.model_dump()
    merged.update(updates_payload)
    merged.pop("id", None)
    repository.update_researcher(res.id, Researcher(**merged))

    return {
        "status": "enriched",
        "researcher_id": res.id,
        "external_code": res.external_code,
        "fields_updated": sorted(updates_payload.keys()),
        "clasificacion": record.get("nme_clasificacion_pr"),
        "convocatoria": record.get("nme_convocatoria"),
    }


def enrich_all(only_missing: bool = True, limit: int = 0) -> Dict[str, Any]:
    """
    Enriquece los investigadores desde datos abiertos en LOTE: una sola consulta
    Socrata por cada 40 cod_rh (sin rate-limit perceptible).
    `only_missing=True` omite los que ya tienen clasificación registrada.
    """
    summary: Dict[str, Any] = {
        "status": "success",
        "processed": 0,
        "enriched": 0,
        "not_found": 0,
        "up_to_date": 0,
        "details": [],
    }

    researchers = repository.list_researchers()
    candidates = [
        r for r in researchers
        if not (only_missing and r.highest_education_level and r.classification_records)
    ]
    if limit:
        candidates = candidates[:limit]

    records = fetch_investigadores_batch([r.external_code for r in candidates])
    by_code = {_normalize_cod_rh(k): v for k, v in records.items()}

    for res in candidates:
        record = by_code.get(_normalize_cod_rh(res.external_code) or "")
        result = _apply_enrichment(res, record)
        summary["processed"] += 1
        key = result.get("status", "not_found")
        if key in ("enriched", "not_found", "up_to_date"):
            summary[key] += 1
        summary["details"].append(result)

    return summary
