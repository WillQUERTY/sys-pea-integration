import logging
from typing import List

import abpoxx_pybind

from ..models import WorkPlan
from .helpers import safe_get_str, sanitize_str
from .undo import undo_push
from .groups import get_group
from . import context

logger = logging.getLogger("peai.repository.work_plans")

def _to_workplan_model(wp) -> WorkPlan:
    return WorkPlan(
        id=wp.id,
        group_id=wp.group_id,
        title=safe_get_str(wp, 'title'),
        description=safe_get_str(wp, 'description'),
        start_date=safe_get_str(wp, 'start_date'),
        end_date=safe_get_str(wp, 'end_date'),
        status=safe_get_str(wp, 'status')
    )

def list_work_plans_of_group(group_id: int) -> List[WorkPlan]:
    get_group(group_id)  # 404 si no existe
    return [_to_workplan_model(wp) for wp in abpoxx_pybind.plans_of_group(group_id)]

def get_work_plan(plan_id: int) -> WorkPlan:
    wp = abpoxx_pybind.get_work_plan(plan_id)
    if wp is None:
        raise KeyError(f"WorkPlan {plan_id} not found")
    return _to_workplan_model(wp)

def create_work_plan(plan: WorkPlan, skip_undo: bool = False) -> WorkPlan:
    get_group(plan.group_id)  # 404 si no existe
    proto = abpoxx_pybind.WorkPlan()
    proto.group_id    = plan.group_id
    proto.title       = sanitize_str(plan.title)
    proto.description = sanitize_str(plan.description)
    proto.start_date  = sanitize_str(plan.start_date)
    proto.end_date    = sanitize_str(plan.end_date)
    proto.status      = sanitize_str(plan.status or "active")

    created = abpoxx_pybind.create_work_plan(proto)
    if created.id == 0:
        raise KeyError(f"Group {plan.group_id} not found")
    if not skip_undo:
        undo_push("CREATE", "WorkPlan", created.id)
    if context._active_connection_string:
        if not abpoxx_pybind.sync_work_plan_to_db(context._active_connection_string, created.id):
            raise RuntimeError(f"Error sincronizando plan {created.id} a BD")
    return get_work_plan(created.id)

def update_work_plan(plan_id: int, updates: WorkPlan, skip_undo: bool = False) -> WorkPlan:
    prev = get_work_plan(plan_id)
    if not skip_undo:
        undo_push("UPDATE", "WorkPlan", plan_id, prev.model_dump_json())

    proto = abpoxx_pybind.WorkPlan()
    proto.id          = plan_id
    proto.group_id    = prev.group_id
    proto.title       = sanitize_str(updates.title or prev.title)
    proto.description = sanitize_str(updates.description if updates.description is not None else prev.description)
    proto.start_date  = sanitize_str(updates.start_date if updates.start_date is not None else prev.start_date)
    proto.end_date    = sanitize_str(updates.end_date if updates.end_date is not None else prev.end_date)
    proto.status      = sanitize_str(updates.status or prev.status)

    abpoxx_pybind.update_work_plan(plan_id, proto)
    if context._active_connection_string:
        if not abpoxx_pybind.sync_work_plan_to_db(context._active_connection_string, plan_id):
            raise RuntimeError(f"Error sincronizando plan {plan_id} a BD")
    return get_work_plan(plan_id)

def delete_work_plan(plan_id: int, soft: bool = True, skip_undo: bool = False) -> bool:
    prev = get_work_plan(plan_id)
    if not skip_undo:
        undo_push("DELETE", "WorkPlan", plan_id, prev.model_dump_json())
    if soft:
        proto = abpoxx_pybind.WorkPlan()
        proto.id          = prev.id
        proto.group_id    = prev.group_id
        proto.title       = sanitize_str(prev.title)
        proto.description = sanitize_str(prev.description)
        proto.start_date  = sanitize_str(prev.start_date)
        proto.end_date    = sanitize_str(prev.end_date)
        proto.status      = "inactive"
        abpoxx_pybind.update_work_plan(plan_id, proto)
    else:
        abpoxx_pybind.delete_work_plan(plan_id)
    if context._active_connection_string:
        if not abpoxx_pybind.delete_work_plan_from_db(context._active_connection_string, plan_id, not soft):
            raise RuntimeError(f"Error en delete del plan {plan_id}")
    return True

def restore_work_plan(plan_id: int, skip_undo: bool = False) -> bool:
    """Reactiva un plan inactivo (inverso del soft-delete)."""
    prev = get_work_plan(plan_id)
    if not skip_undo:
        undo_push("RESTORE", "WorkPlan", plan_id, prev.model_dump_json())
    proto = abpoxx_pybind.WorkPlan()
    proto.id          = prev.id
    proto.group_id    = prev.group_id
    proto.title       = sanitize_str(prev.title)
    proto.description = sanitize_str(prev.description)
    proto.start_date  = sanitize_str(prev.start_date)
    proto.end_date    = sanitize_str(prev.end_date)
    proto.status      = "active"
    abpoxx_pybind.update_work_plan(plan_id, proto)
    if context._active_connection_string:
        abpoxx_pybind.sync_work_plan_to_db(context._active_connection_string, plan_id)
    return True
