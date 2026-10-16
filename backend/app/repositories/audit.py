import logging
import abpoxx_pybind
from . import context

logger = logging.getLogger("peai.repository.audit")

def record_import_item(
    job_id: int,
    entity_type: str,
    external_identifier: str,
    action_taken: str,
    summary: str = "",
    details: str = ""
):
    if context._active_connection_string and job_id:
        if not abpoxx_pybind.insert_import_record_db(
            context._active_connection_string, job_id, entity_type,
            external_identifier, action_taken, summary[:500], details
        ):
            logger.warning("Error registrando item de conciliacion en BD")
