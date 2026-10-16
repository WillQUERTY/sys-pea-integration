import json
import logging
from typing import Any, Dict
import abpoxx_pybind

from ..models import Group, Product, Project, Researcher, WorkPlan

logger = logging.getLogger("peai.repository")


def undo_push(op_type: str, entity_type: str, entity_id: int, prev_state: str = ""):
    op = abpoxx_pybind.UndoOperation()
    op.operation_type = op_type
    op.entity_type = entity_type
    op.entity_id = entity_id
    op.previous_state = prev_state
    abpoxx_pybind.undo_push(op)


def undo_top():
    return abpoxx_pybind.undo_top()


def undo_pop():
    return abpoxx_pybind.undo_pop()


def undo_list():
    return abpoxx_pybind.undo_list()


def undo_size() -> int:
    return abpoxx_pybind.undo_size()


def undo_clear():
    abpoxx_pybind.undo_clear()


def undo_perform() -> Dict[str, Any]:
    from .. import repository
    op = abpoxx_pybind.undo_pop()
    if not op:
        return {"status": "empty", "message": "Pila Undo vacía, nada que revertir."}

    op_type = op.operation_type
    e_type = op.entity_type
    e_id = op.entity_id
    prev_state = op.previous_state

    try:
        if op_type == "UPDATE":
            data = json.loads(prev_state)
            if e_type == "Product":
                repository.update_product(e_id, Product(**data), skip_undo=True)
            elif e_type == "Researcher":
                repository.update_researcher(e_id, Researcher(**data), skip_undo=True)
            elif e_type == "Group":
                repository.update_group(e_id, Group(**data), skip_undo=True)
            elif e_type == "WorkPlan":
                repository.update_work_plan(e_id, WorkPlan(**data), skip_undo=True)
            elif e_type == "Project":
                repository.update_project(e_id, Project(**data), skip_undo=True)

        elif op_type in ("DELETE", "RESTORE"):
            data = json.loads(prev_state)
            if e_type == "Product":
                repository.update_product(e_id, Product(**data), skip_undo=True)
            elif e_type == "Researcher":
                repository.update_researcher(e_id, Researcher(**data), skip_undo=True)
            elif e_type == "Group":
                repository.update_group(e_id, Group(**data), skip_undo=True)
            elif e_type == "WorkPlan":
                repository.update_work_plan(e_id, WorkPlan(**data), skip_undo=True)
            elif e_type == "Project":
                repository.update_project(e_id, Project(**data), skip_undo=True)

        elif op_type == "VALIDATE":
            data = json.loads(prev_state)
            prev_status = data.get("validation_status", "pending")
            repository.set_product_validation(
                e_id,
                prev_status,
                data.get("quality_category_id"),
                reason="Reversión Undo de validación",
                skip_undo=True
            )
            if prev_status == "pending":
                try:
                    already_in_queue = any(i.product_id == e_id and i.status == "pending" for i in repository.vq_list())
                    if not already_in_queue:
                        repository.vq_enqueue(e_id, "evaluador_tecnico")
                except Exception as ex:
                    logger.warning(f"No se pudo re-encolar producto {e_id} en FIFO tras undo: {ex}")

        elif op_type == "UPDATE_MEMBERSHIP":
            parts = prev_state.split("\x1F")
            gid, rid = map(int, parts[0].split(":"))
            role = parts[1] if len(parts) > 1 else "Investigador"
            start_date = parts[2] if len(parts) > 2 else ""
            end_date = parts[3] if len(parts) > 3 else ""
            repository.update_member(gid, rid, role, start_date, end_date, skip_undo=True)

        elif op_type == "UNLINK_PRODUCT":
            gid, pid = map(int, prev_state.split(":"))
            repository.link_product_to_group(gid, pid, skip_undo=True)

        elif op_type == "LINK_PRODUCT":
            gid, pid = map(int, prev_state.split(":"))
            repository.unlink_product_from_group(gid, pid, skip_undo=True)

        elif op_type == "UNLINK_MEMBER":
            parts = prev_state.split("\x1F")
            gid, rid = map(int, parts[0].split(":"))
            role = parts[1] if len(parts) > 1 else "Investigador"
            start_date = parts[2] if len(parts) > 2 else ""
            end_date = parts[3] if len(parts) > 3 else ""
            repository.add_member_to_group(gid, rid, role, start_date, end_date, skip_undo=True)

        elif op_type == "LINK_MEMBER":
            parts = prev_state.split("\x1F")
            gid, rid = map(int, parts[0].split(":"))
            repository.remove_member_from_group(gid, rid, skip_undo=True)

        elif op_type == "UNLINK_PROJECT":
            gid, pid = map(int, prev_state.split(":"))
            if abpoxx_pybind.get_project(pid) is not None:
                abpoxx_pybind.link_project_to_group(gid, pid)
                if repository._active_connection_string:
                    abpoxx_pybind.sync_project_link_to_db(repository._active_connection_string, gid, pid)

        elif op_type == "LINK_PROJECT":
            gid, pid = map(int, prev_state.split(":"))
            abpoxx_pybind.unlink_project_from_group(gid, pid)
            if repository._active_connection_string:
                abpoxx_pybind.delete_project_link_from_db(repository._active_connection_string, gid, pid)

        elif op_type == "CREATE":
            if e_type == "Product":
                repository.delete_product(e_id, soft=False, skip_undo=True)
            elif e_type == "Researcher":
                repository.delete_researcher(e_id, soft=False, skip_undo=True)
            elif e_type == "Group":
                repository.delete_group(e_id, soft=False, skip_undo=True)
            elif e_type == "WorkPlan":
                repository.delete_work_plan(e_id, soft=False, skip_undo=True)
            elif e_type == "Project":
                repository.delete_project(e_id, soft=False, skip_undo=True)

        if repository._active_connection_string:
            abpoxx_pybind.insert_audit_log_db(
                repository._active_connection_string, e_type, e_id,
                'UNDO_PERFORMED', 'system', f"Revertida operación {op_type}"
            )

        return {
            "status": "success",
            "operation_type": op_type,
            "entity_type": e_type,
            "entity_id": e_id,
            "message": f"Operación {op_type} sobre {e_type} #{e_id} revertida exitosamente."
        }
    except Exception as e:
        logger.error(f"Error revirtiendo operación undo: {e}")
        return {"status": "error", "error": str(e)}
