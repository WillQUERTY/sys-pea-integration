import logging
from typing import List, Optional, Tuple

import abpoxx_pybind

from ..models import Group, Project
from .helpers import _normalize_text, safe_get_str, sanitize_str
from .undo import undo_push
from .groups import get_group, list_groups
from . import context

logger = logging.getLogger("peai.repository.projects")

def _to_project_model(p) -> Project:
    return Project(
        id=p.id,
        title=safe_get_str(p, 'title'),
        summary=safe_get_str(p, 'summary'),
        project_type=safe_get_str(p, 'project_type'),
        start_date=safe_get_str(p, 'start_date'),
        end_date=safe_get_str(p, 'end_date'),
        status=safe_get_str(p, 'status'),
        funding_type=safe_get_str(p, 'funding_type'),
        budget=p.budget or 0.0,
        principal_investigator_id=p.principal_investigator_id or None
    )

def _to_project_proto(project: Project, base=None):
    proto = abpoxx_pybind.Project()
    proto.id          = base.id if base else 0
    proto.title       = sanitize_str(project.title if project.title is not None else (base.title if base else ""))
    proto.summary     = sanitize_str(project.summary if project.summary is not None else (base.summary if base else ""))
    proto.project_type = sanitize_str(project.project_type if project.project_type is not None else (base.project_type if base else ""))
    proto.start_date  = sanitize_str(project.start_date if project.start_date is not None else (base.start_date if base else ""))
    proto.end_date    = sanitize_str(project.end_date if project.end_date is not None else (base.end_date if base else ""))
    proto.status      = sanitize_str(project.status or (base.status if base else "active"))
    proto.funding_type = sanitize_str(project.funding_type if project.funding_type is not None else (base.funding_type if base else ""))
    proto.budget      = project.budget if project.budget is not None else (base.budget if base else 0.0)
    if project.principal_investigator_id is not None:
        proto.principal_investigator_id = project.principal_investigator_id
    else:
        proto.principal_investigator_id = (base.principal_investigator_id if base else None) or 0
    return proto

def list_projects(skip: int = 0, limit: int = 20, search: Optional[str] = None,
                  status: Optional[str] = None,
                  project_type: Optional[str] = None) -> Tuple[List[Project], int]:
    projects = [_to_project_model(p) for p in abpoxx_pybind.list_projects()]
    if status and status != 'all':
        projects = [p for p in projects if p.status == status]
    if project_type and project_type != 'all':
        pt_norm = _normalize_text(project_type)
        if pt_norm in ('none', 'sin tipo', 'unspecified', 'sin clasificar'):
            projects = [p for p in projects if not (p.project_type or '').strip()]
        else:
            projects = [p for p in projects if _normalize_text(p.project_type or '') == pt_norm]
    if search:
        s = search.lower()
        projects = [p for p in projects if (p.title and s in p.title.lower())
                    or (p.project_type and s in p.project_type.lower())]
    return projects[skip:skip + limit], len(projects)

def get_project(project_id: int) -> Project:
    p = abpoxx_pybind.get_project(project_id)
    if p is None:
        raise KeyError(f"Project {project_id} not found")
    return _to_project_model(p)

def create_project(project: Project, skip_undo: bool = False) -> Project:
    proto = _to_project_proto(project)
    created = abpoxx_pybind.create_project(proto)
    if not skip_undo:
        undo_push("CREATE", "Project", created.id)
    if context._active_connection_string:
        if not abpoxx_pybind.sync_project_to_db(context._active_connection_string, created.id):
            raise RuntimeError(f"Error sincronizando proyecto {created.id} a BD")
    return get_project(created.id)

def update_project(project_id: int, updates: Project, skip_undo: bool = False) -> Project:
    prev = get_project(project_id)
    if not skip_undo:
        undo_push("UPDATE", "Project", project_id, prev.model_dump_json())

    proto = _to_project_proto(updates, base=prev)
    proto.id = project_id
    abpoxx_pybind.update_project(project_id, proto)
    if context._active_connection_string:
        if not abpoxx_pybind.sync_project_to_db(context._active_connection_string, project_id):
            raise RuntimeError(f"Error sincronizando proyecto {project_id} a BD")
    return get_project(project_id)

def delete_project(project_id: int, soft: bool = True, skip_undo: bool = False) -> bool:
    prev = get_project(project_id)
    if not skip_undo:
        undo_push("DELETE", "Project", project_id, prev.model_dump_json())
    if soft:
        proto = _to_project_proto(prev)
        proto.status = "inactive"
        abpoxx_pybind.update_project(project_id, proto)
    else:
        abpoxx_pybind.delete_project(project_id)
    if context._active_connection_string:
        if not abpoxx_pybind.delete_project_from_db(context._active_connection_string, project_id, not soft):
            raise RuntimeError(f"Error en delete del proyecto {project_id}")
    return True

def restore_project(project_id: int, skip_undo: bool = False) -> bool:
    """Reactiva un proyecto inactivo (inverso del soft-delete)."""
    prev = get_project(project_id)
    if not skip_undo:
        undo_push("RESTORE", "Project", project_id, prev.model_dump_json())
    proto = _to_project_proto(prev)
    proto.status = "active"
    abpoxx_pybind.update_project(project_id, proto)
    if context._active_connection_string:
        abpoxx_pybind.sync_project_to_db(context._active_connection_string, project_id)
    return True

def get_group_projects(group_id: int) -> List[Project]:
    get_group(group_id)  # 404 si no existe
    return [_to_project_model(abpoxx_pybind.get_project(pid))
            for pid in abpoxx_pybind.projects_of_group(group_id)
            if abpoxx_pybind.get_project(pid) is not None]

def get_project_groups(project_id: int) -> List[Group]:
    """Grupos vinculados a un proyecto (lookup inverso de la multilista)."""
    get_project(project_id)  # 404 si no existe
    return [g for g in list_groups()
            if g.id is not None and project_id in abpoxx_pybind.projects_of_group(g.id)]

def link_project_to_group(group_id: int, project: Project) -> int:
    get_group(group_id)  # 404 si no existe
    pid = project.id
    if not pid or abpoxx_pybind.get_project(pid) is None:
        pid = create_project(project).id
    if not abpoxx_pybind.link_project_to_group(group_id, pid):
        raise KeyError(f"No se pudo enlazar el proyecto {pid} al grupo {group_id}")
    undo_push("LINK_PROJECT", "Project", pid, f"{group_id}:{pid}")
    if context._active_connection_string:
        if not abpoxx_pybind.sync_project_link_to_db(context._active_connection_string, group_id, pid):
            raise RuntimeError(f"Error sincronizando enlace proyecto {pid} a BD")
    return pid

def unlink_project_from_group(group_id: int, project_id: int):
    get_group(group_id)  # 404 si no existe
    if abpoxx_pybind.get_project(project_id) is None:
        raise KeyError(f"Project {project_id} not found")
    undo_push("UNLINK_PROJECT", "Project", project_id, f"{group_id}:{project_id}")
    abpoxx_pybind.unlink_project_from_group(group_id, project_id)
    if context._active_connection_string:
        abpoxx_pybind.delete_project_link_from_db(context._active_connection_string, group_id, project_id)
