import logging
from typing import List, Optional

import abpoxx_pybind

from ..models import Researcher
from .helpers import safe_get_str, sanitize_str
from .undo import undo_push
from . import context

logger = logging.getLogger("peai.repository.researchers")

def list_researchers() -> List[Researcher]:
    core_items = abpoxx_pybind.list_researchers()
    res_list = []
    for r in core_items:
        try:
            res_list.append(Researcher(
                id=r.id,
                external_code=safe_get_str(r, 'external_code'),
                identification_type=safe_get_str(r, 'identification_type'),
                identification_number=safe_get_str(r, 'identification_number'),
                first_names=safe_get_str(r, 'first_names'),
                last_names=safe_get_str(r, 'last_names'),
                nationality=safe_get_str(r, 'nationality'),
                country_of_residence=safe_get_str(r, 'country_of_residence'),
                institutional_email=safe_get_str(r, 'institutional_email'),
                orcid=safe_get_str(r, 'orcid'),
                highest_education_level=safe_get_str(r, 'highest_education_level'),
                education_records=safe_get_str(r, 'education_records'),
                classification_records=safe_get_str(r, 'classification_records'),
                status=safe_get_str(r, 'status')
            ))
        except Exception as e:
            logger.error(f"Error parseando investigador: {e}")
            continue
    return res_list

def get_researcher(res_id: int) -> Researcher:
    r = abpoxx_pybind.get_researcher(res_id)
    if r is None:
        raise KeyError(f"Researcher {res_id} not found")
    return Researcher(
        id=r.id,
        external_code=safe_get_str(r, 'external_code'),
        identification_type=safe_get_str(r, 'identification_type'),
        identification_number=safe_get_str(r, 'identification_number'),
        first_names=safe_get_str(r, 'first_names'),
        last_names=safe_get_str(r, 'last_names'),
        nationality=safe_get_str(r, 'nationality'),
        country_of_residence=safe_get_str(r, 'country_of_residence'),
        institutional_email=safe_get_str(r, 'institutional_email'),
        orcid=safe_get_str(r, 'orcid'),
        highest_education_level=safe_get_str(r, 'highest_education_level'),
        education_records=safe_get_str(r, 'education_records'),
        classification_records=safe_get_str(r, 'classification_records'),
        status=safe_get_str(r, 'status')
    )

def create_researcher(res: Researcher, skip_undo: bool = False) -> Researcher:
    proto = abpoxx_pybind.Researcher()
    proto.external_code = sanitize_str(res.external_code)
    proto.identification_type = sanitize_str(res.identification_type)
    proto.identification_number = sanitize_str(res.identification_number)
    proto.first_names = sanitize_str(res.first_names)
    proto.last_names = sanitize_str(res.last_names)
    proto.nationality = sanitize_str(res.nationality)
    proto.country_of_residence = sanitize_str(res.country_of_residence)
    proto.institutional_email = sanitize_str(res.institutional_email)
    proto.orcid = sanitize_str(res.orcid)
    proto.highest_education_level = sanitize_str(res.highest_education_level)
    proto.education_records = sanitize_str(res.education_records)
    proto.classification_records = sanitize_str(res.classification_records)
    proto.status = sanitize_str(res.status or "active")
    
    created = abpoxx_pybind.create_researcher(proto)
    if context._active_connection_string:
        abpoxx_pybind.sync_researcher_to_db(context._active_connection_string, created.id)

    if not skip_undo:
        undo_push("CREATE", "Researcher", created.id)

    return get_researcher(created.id)

def update_researcher(res_id: int, updates: Researcher, skip_undo: bool = False) -> Researcher:
    prev = get_researcher(res_id)
    if not skip_undo:
        undo_push("UPDATE", "Researcher", res_id, prev.model_dump_json())

    proto = abpoxx_pybind.Researcher()
    proto.external_code = sanitize_str(updates.external_code or prev.external_code)
    proto.identification_type = sanitize_str(updates.identification_type if updates.identification_type is not None else prev.identification_type)
    proto.identification_number = sanitize_str(updates.identification_number if updates.identification_number is not None else prev.identification_number)
    proto.first_names = sanitize_str(updates.first_names or prev.first_names)
    proto.last_names = sanitize_str(updates.last_names or prev.last_names)
    proto.nationality = sanitize_str(updates.nationality if updates.nationality is not None else prev.nationality)
    proto.country_of_residence = sanitize_str(updates.country_of_residence if updates.country_of_residence is not None else prev.country_of_residence)
    proto.institutional_email = sanitize_str(updates.institutional_email if updates.institutional_email is not None else prev.institutional_email)
    proto.orcid = sanitize_str(updates.orcid if updates.orcid is not None else prev.orcid)
    proto.highest_education_level = sanitize_str(updates.highest_education_level if updates.highest_education_level is not None else prev.highest_education_level)
    proto.education_records = sanitize_str(updates.education_records if updates.education_records is not None else prev.education_records)
    proto.classification_records = sanitize_str(updates.classification_records if updates.classification_records is not None else prev.classification_records)
    proto.status = sanitize_str(updates.status or prev.status)

    abpoxx_pybind.update_researcher(res_id, proto)

    if context._active_connection_string:
        if not abpoxx_pybind.sync_researcher_to_db(context._active_connection_string, res_id):
            raise RuntimeError(f"Error sincronizando investigador {res_id} a BD")

    return get_researcher(res_id)

def delete_researcher(res_id: int, soft: bool = True, skip_undo: bool = False) -> bool:
    prev = get_researcher(res_id)
    if not skip_undo:
        undo_push("DELETE", "Researcher", res_id, prev.model_dump_json())

    if soft:
        proto = abpoxx_pybind.Researcher()
        proto.external_code = sanitize_str(prev.external_code)
        proto.identification_type = sanitize_str(prev.identification_type)
        proto.identification_number = sanitize_str(prev.identification_number)
        proto.first_names = sanitize_str(prev.first_names)
        proto.last_names = sanitize_str(prev.last_names)
        proto.nationality = sanitize_str(prev.nationality)
        proto.country_of_residence = sanitize_str(prev.country_of_residence)
        proto.institutional_email = sanitize_str(prev.institutional_email)
        proto.orcid = sanitize_str(prev.orcid)
        proto.highest_education_level = sanitize_str(prev.highest_education_level)
        proto.education_records = sanitize_str(prev.education_records)
        proto.classification_records = sanitize_str(prev.classification_records)
        proto.status = "inactive"
        abpoxx_pybind.update_researcher(res_id, proto)
        if context._active_connection_string:
            if not abpoxx_pybind.delete_researcher_from_db(context._active_connection_string, res_id, False):
                raise RuntimeError(f"Error en soft-delete del investigador {res_id}")
    else:
        abpoxx_pybind.delete_researcher(res_id)
        if context._active_connection_string:
            if not abpoxx_pybind.delete_researcher_from_db(context._active_connection_string, res_id, True):
                raise RuntimeError(f"Error en hard-delete del investigador {res_id}")
    return True

def restore_researcher(res_id: int) -> bool:
    """Reactiva un investigador inactivo (inverso del soft-delete)."""
    prev = get_researcher(res_id)
    undo_push("RESTORE", "Researcher", res_id, prev.model_dump_json())
    proto = abpoxx_pybind.Researcher()
    proto.external_code = sanitize_str(prev.external_code)
    proto.identification_type = sanitize_str(prev.identification_type)
    proto.identification_number = sanitize_str(prev.identification_number)
    proto.first_names = sanitize_str(prev.first_names)
    proto.last_names = sanitize_str(prev.last_names)
    proto.nationality = sanitize_str(prev.nationality)
    proto.country_of_residence = sanitize_str(prev.country_of_residence)
    proto.institutional_email = sanitize_str(prev.institutional_email)
    proto.orcid = sanitize_str(prev.orcid)
    proto.highest_education_level = sanitize_str(prev.highest_education_level)
    proto.education_records = sanitize_str(prev.education_records)
    proto.classification_records = sanitize_str(prev.classification_records)
    proto.status = "active"
    abpoxx_pybind.update_researcher(res_id, proto)
    if context._active_connection_string:
        abpoxx_pybind.sync_researcher_to_db(context._active_connection_string, res_id)
    return True

def groups_of_researcher(researcher_id: int) -> List[int]:
    return abpoxx_pybind.groups_of_researcher(researcher_id)

def products_of_researcher(researcher_id: int) -> List[int]:
    if context._active_connection_string:
        return list(abpoxx_pybind.products_of_researcher_db(context._active_connection_string, researcher_id))
    return []
