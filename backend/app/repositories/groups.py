import logging
from typing import List, Optional, Dict, Any

import abpoxx_pybind

from ..models import Group
from .helpers import safe_get_str, sanitize_str
from .undo import undo_push
from . import context

logger = logging.getLogger("peai.repository.groups")

def list_groups() -> List[Group]:
    core_groups = abpoxx_pybind.list_groups()
    groups_list = []
    for g in core_groups:
        try:
            groups_list.append(Group(
                id=g.id,
                external_code=safe_get_str(g, 'external_code'),
                name=safe_get_str(g, 'name'),
                acronym=safe_get_str(g, 'acronym'),
                institution=safe_get_str(g, 'institution'),
                classification=safe_get_str(g, 'classification'),
                description=safe_get_str(g, 'description'),
                mission=safe_get_str(g, 'mission'),
                vision=safe_get_str(g, 'vision'),
                declared_creation_date=safe_get_str(g, 'declared_creation_date'),
                knowledge_area=safe_get_str(g, 'knowledge_area'),
                knowledge_subarea=safe_get_str(g, 'knowledge_subarea'),
                city=safe_get_str(g, 'city'),
                department=safe_get_str(g, 'department'),
                website=safe_get_str(g, 'website'),
                email=safe_get_str(g, 'email'),
                leader_id=g.leader_id,
                status=safe_get_str(g, 'status')
            ))
        except Exception as e:
            logger.error(f"Error parseando grupo: {e}")
            continue
    return groups_list

def get_group(group_id: int) -> Group:
    g = abpoxx_pybind.get_group(group_id)
    if g is None:
        raise KeyError(f"Group {group_id} not found")
    return Group(
        id=g.id,
        external_code=safe_get_str(g, 'external_code'),
        name=safe_get_str(g, 'name'),
        acronym=safe_get_str(g, 'acronym'),
        institution=safe_get_str(g, 'institution'),
        classification=safe_get_str(g, 'classification'),
        description=safe_get_str(g, 'description'),
        mission=safe_get_str(g, 'mission'),
        vision=safe_get_str(g, 'vision'),
        declared_creation_date=safe_get_str(g, 'declared_creation_date'),
        knowledge_area=safe_get_str(g, 'knowledge_area'),
        knowledge_subarea=safe_get_str(g, 'knowledge_subarea'),
        city=safe_get_str(g, 'city'),
        department=safe_get_str(g, 'department'),
        website=safe_get_str(g, 'website'),
        email=safe_get_str(g, 'email'),
        leader_id=g.leader_id,
        status=safe_get_str(g, 'status')
    )

def create_group(group: Group, skip_undo: bool = False) -> Group:
    proto = abpoxx_pybind.Group()
    proto.external_code = sanitize_str(group.external_code)
    proto.name = sanitize_str(group.name)
    proto.acronym = sanitize_str(group.acronym)
    proto.institution = sanitize_str(group.institution)
    proto.classification = sanitize_str(group.classification)
    proto.description = sanitize_str(group.description)
    proto.mission = sanitize_str(group.mission)
    proto.vision = sanitize_str(group.vision)
    proto.declared_creation_date = sanitize_str(group.declared_creation_date)
    proto.knowledge_area = sanitize_str(group.knowledge_area)
    proto.knowledge_subarea = sanitize_str(group.knowledge_subarea)
    proto.city = sanitize_str(group.city)
    proto.department = sanitize_str(group.department)
    proto.website = sanitize_str(group.website)
    proto.email = sanitize_str(group.email)
    proto.leader_id = group.leader_id or 0
    proto.status = sanitize_str(group.status or "active")
    
    created = abpoxx_pybind.create_group(proto)
    if context._active_connection_string:
        abpoxx_pybind.sync_group_to_db(context._active_connection_string, created.id)

    if not skip_undo:
        undo_push("CREATE", "Group", created.id)

    return get_group(created.id)

def update_group(group_id: int, updates: Group, skip_undo: bool = False) -> Group:
    prev = get_group(group_id)
    if not skip_undo:
        undo_push("UPDATE", "Group", group_id, prev.model_dump_json())

    proto = abpoxx_pybind.Group()
    proto.external_code = sanitize_str(updates.external_code or prev.external_code)
    proto.name = sanitize_str(updates.name or prev.name)
    proto.acronym = sanitize_str(updates.acronym if updates.acronym is not None else prev.acronym)
    proto.description = sanitize_str(updates.description if updates.description is not None else prev.description)
    proto.institution = sanitize_str(updates.institution if updates.institution is not None else prev.institution)
    proto.classification = sanitize_str(updates.classification if updates.classification is not None else prev.classification)
    proto.mission = sanitize_str(updates.mission if updates.mission is not None else prev.mission)
    proto.vision = sanitize_str(updates.vision if updates.vision is not None else prev.vision)
    proto.declared_creation_date = sanitize_str(updates.declared_creation_date if updates.declared_creation_date is not None else prev.declared_creation_date)
    proto.knowledge_area = sanitize_str(updates.knowledge_area if updates.knowledge_area is not None else prev.knowledge_area)
    proto.knowledge_subarea = sanitize_str(updates.knowledge_subarea if updates.knowledge_subarea is not None else prev.knowledge_subarea)
    proto.city = sanitize_str(updates.city if updates.city is not None else prev.city)
    proto.department = sanitize_str(updates.department if updates.department is not None else prev.department)
    proto.website = sanitize_str(updates.website if updates.website is not None else prev.website)
    proto.email = sanitize_str(updates.email if updates.email is not None else prev.email)
    proto.leader_id = updates.leader_id if updates.leader_id is not None else prev.leader_id
    proto.status = sanitize_str(updates.status or prev.status)

    abpoxx_pybind.update_group(group_id, proto)

    if context._active_connection_string:
        if not abpoxx_pybind.sync_group_to_db(context._active_connection_string, group_id):
            raise RuntimeError(f"Error sincronizando grupo {group_id} a BD")

    return get_group(group_id)

def delete_group(group_id: int, soft: bool = True, skip_undo: bool = False) -> bool:
    prev = get_group(group_id)
    if not skip_undo:
        undo_push("DELETE", "Group", group_id, prev.model_dump_json())

    if soft:
        proto = abpoxx_pybind.Group()
        proto.external_code = sanitize_str(prev.external_code)
        proto.name = sanitize_str(prev.name)
        proto.acronym = sanitize_str(prev.acronym)
        proto.institution = sanitize_str(prev.institution)
        proto.classification = sanitize_str(prev.classification)
        proto.description = sanitize_str(prev.description)
        proto.mission = sanitize_str(prev.mission)
        proto.vision = sanitize_str(prev.vision)
        proto.declared_creation_date = sanitize_str(prev.declared_creation_date)
        proto.knowledge_area = sanitize_str(prev.knowledge_area)
        proto.knowledge_subarea = sanitize_str(prev.knowledge_subarea)
        proto.city = sanitize_str(prev.city)
        proto.department = sanitize_str(prev.department)
        proto.website = sanitize_str(prev.website)
        proto.email = sanitize_str(prev.email)
        proto.leader_id = prev.leader_id or 0
        proto.status = "inactive"
        abpoxx_pybind.update_group(group_id, proto)
        if context._active_connection_string:
            if not abpoxx_pybind.delete_group_from_db(context._active_connection_string, group_id, False):
                raise RuntimeError(f"Error en soft-delete del grupo {group_id}")
    else:
        abpoxx_pybind.delete_group(group_id)
        if context._active_connection_string:
            if not abpoxx_pybind.delete_group_from_db(context._active_connection_string, group_id, True):
                raise RuntimeError(f"Error en hard-delete del grupo {group_id}")
    return True

def restore_group(group_id: int) -> bool:
    """Reactiva un grupo inactivo (inverso del soft-delete)."""
    prev = get_group(group_id)
    undo_push("RESTORE", "Group", group_id, prev.model_dump_json())
    proto = abpoxx_pybind.Group()
    proto.external_code = sanitize_str(prev.external_code)
    proto.name = sanitize_str(prev.name)
    proto.acronym = sanitize_str(prev.acronym)
    proto.institution = sanitize_str(prev.institution)
    proto.classification = sanitize_str(prev.classification)
    proto.description = sanitize_str(prev.description)
    proto.mission = sanitize_str(prev.mission)
    proto.vision = sanitize_str(prev.vision)
    proto.declared_creation_date = sanitize_str(prev.declared_creation_date)
    proto.knowledge_area = sanitize_str(prev.knowledge_area)
    proto.knowledge_subarea = sanitize_str(prev.knowledge_subarea)
    proto.city = sanitize_str(prev.city)
    proto.department = sanitize_str(prev.department)
    proto.website = sanitize_str(prev.website)
    proto.email = sanitize_str(prev.email)
    proto.leader_id = prev.leader_id or 0
    proto.status = "active"
    abpoxx_pybind.update_group(group_id, proto)
    if context._active_connection_string:
        abpoxx_pybind.sync_group_to_db(context._active_connection_string, group_id)
    return True

# -------------------------------------------------------------------
# Multilista Link Operations (Write-Through)
# -------------------------------------------------------------------

def validate_membership_period(start_date: str = "", end_date: str = ""):
    """Valida reglas de vinculación temporal (RV-001):
    - RV-001: Rechazar periodo invertido (start_date <= end_date cuando ambas fechas existen).
    """
    s = (start_date or "").strip()
    e = (end_date or "").strip()
    if s and e and s > e:
        raise ValueError("RV-001: Periodo de vinculación invertido. La fecha de inicio no puede ser posterior a la fecha de fin.")

def add_member_to_group(group_id: int, researcher_id: int, role: str = "Investigador", start_date: str = "", end_date: str = "", skip_undo: bool = False):
    s = (start_date or "").strip()
    e = (end_date or "").strip()
    validate_membership_period(s, e)

    prev = abpoxx_pybind.membership_details(group_id, researcher_id)
    # Una membresía desactivada (soft delete) se reactiva al volver a vincular:
    # su periodo es histórico, así que no aplica RV-002 (que protege la
    # vinculación vigente) y el enlace se rehace sobre el mismo nodo.
    if prev and (prev.status or "active") != "inactive":
        ps = (prev.start_date or "").strip()
        pe = (prev.end_date or "").strip()
        if ps or pe:
            if not pe:
                raise ValueError("RV-002: Periodos de vinculación solapados. El investigador ya tiene una vinculación vigente activa en este grupo.")
            if s and not (s > pe or (e and e < ps)):
                raise ValueError(f"RV-002: Periodos de vinculación solapados. El periodo [{s}, {e or 'actual'}] se solapa con el periodo registrado [{ps}, {pe}].")

        if not skip_undo:
            undo_push("UPDATE_MEMBERSHIP", "GroupMembership", prev.membership_id, f"{group_id}:{researcher_id}\x1F{prev.role}\x1F{prev.start_date}\x1F{prev.end_date}")
        abpoxx_pybind.update_membership(group_id, researcher_id, role, start_date, end_date)
        if context._active_connection_string:
            abpoxx_pybind.sync_membership_details_to_db(context._active_connection_string, group_id, researcher_id, role, start_date, end_date)
        return

    abpoxx_pybind.add_member_to_group(group_id, researcher_id, role, start_date, end_date)
    if context._active_connection_string:
        abpoxx_pybind.sync_membership_details_to_db(context._active_connection_string, group_id, researcher_id, role, start_date, end_date)
    if not skip_undo:
        undo_push("LINK_MEMBER", "GroupMembership", group_id, f"{group_id}:{researcher_id}")

def get_group_members_detailed(group_id: int) -> list:
    """Membresias del grupo con rol y fechas (leido de RAM)."""
    members = abpoxx_pybind.members_of_group(group_id)
    rows = []
    for rid in members:
        det = abpoxx_pybind.membership_details(group_id, rid)
        r = abpoxx_pybind.get_researcher(rid)
        if det and r:
            rows.append({
                "group_id": group_id,
                "researcher_id": rid,
                "researcher_external_code": r.external_code,
                "researcher_name": f"{r.first_names} {r.last_names}".strip(),
                "role": det.role,
                "start_date": det.start_date,
                "end_date": det.end_date,
                "is_current": not det.end_date,
                "status": det.status
            })
    return rows

def update_member(group_id: int, researcher_id: int, role: str, start_date: str = "", end_date: str = "", skip_undo: bool = False):
    """Actualiza rol y fechas de una membresia existente (RAM y upsert en BD)."""
    s = (start_date or "").strip()
    e = (end_date or "").strip()
    validate_membership_period(s, e)

    members = abpoxx_pybind.members_of_group(group_id)
    if researcher_id not in members:
        raise KeyError(f"Researcher {researcher_id} is not a member of group {group_id}")
    
    prev = abpoxx_pybind.membership_details(group_id, researcher_id)
    if prev and not skip_undo:
        undo_push("UPDATE_MEMBERSHIP", "GroupMembership", prev.membership_id, f"{group_id}:{researcher_id}\x1F{prev.role}\x1F{prev.start_date}\x1F{prev.end_date}")

    abpoxx_pybind.update_membership(group_id, researcher_id, role, start_date, end_date)

    if context._active_connection_string:
        if not abpoxx_pybind.sync_membership_details_to_db(context._active_connection_string, group_id, researcher_id, role, start_date, end_date):
            raise RuntimeError("No se pudo actualizar la membresia en la base de datos")

def remove_member_from_group(group_id: int, researcher_id: int, skip_undo: bool = False):
    prev = abpoxx_pybind.membership_details(group_id, researcher_id)
    if not prev:
        return False
    # La desvinculación es lógica (soft delete): la membresía queda inactiva y
    # deja de contar como integrante, pero el nodo se conserva para auditoría.
    removed = abpoxx_pybind.remove_member_from_group(group_id, researcher_id)
    if removed and not skip_undo:
        undo_push("UNLINK_MEMBER", "GroupMembership", group_id, f"{group_id}:{researcher_id}\x1F{prev.role}\x1F{prev.start_date}\x1F{prev.end_date}")
    if context._active_connection_string:
        if not abpoxx_pybind.delete_membership_from_db(context._active_connection_string, group_id, researcher_id):
            raise RuntimeError(f"Error eliminando membresia {group_id}:{researcher_id} en BD")
    return removed

def members_of_group(group_id: int) -> List[int]:
    return abpoxx_pybind.members_of_group(group_id)

def products_of_group(group_id: int) -> List[int]:
    return abpoxx_pybind.products_of_group(group_id)

def link_product_to_group(group_id: int, product_id: int, skip_undo: bool = False):
    abpoxx_pybind.link_product_to_group(group_id, product_id)
    if context._active_connection_string:
        abpoxx_pybind.sync_product_link_to_db(context._active_connection_string, group_id, product_id)
    if not skip_undo:
        undo_push("LINK_PRODUCT", "GroupProductLink", group_id, f"{group_id}:{product_id}")

def unlink_product_from_group(group_id: int, product_id: int, skip_undo: bool = False):
    if not skip_undo:
        undo_push("UNLINK_PRODUCT", "GroupProductLink", group_id, f"{group_id}:{product_id}")
    abpoxx_pybind.unlink_product_from_group(group_id, product_id)
    if context._active_connection_string:
        if not abpoxx_pybind.delete_product_link_from_db(context._active_connection_string, group_id, product_id):
            raise RuntimeError(f"Error eliminando enlace producto-grupo {group_id}:{product_id} en BD")

def propose_product_group_link(
    group_id: int,
    product_id: int,
    status: str = "pending_validation",
    source: str = "gruplac_public",
    reason: str = "Propuesta automatica importada desde GrupLAC"
):
    if context._active_connection_string:
        if not abpoxx_pybind.upsert_product_group_link_db(
            context._active_connection_string, group_id, product_id, status, source, reason
        ):
            logger.warning("Error proponiendo enlace producto-grupo en BD")

def get_group_research_lines(group_id: int) -> List[str]:
    if not context._active_connection_string:
        return []
    return abpoxx_pybind.get_group_research_lines_db(context._active_connection_string, group_id)

def link_research_line_to_group(group_id: int, line_name: str) -> int:
    if not context._active_connection_string:
        raise Exception("No DB connection")
    return abpoxx_pybind.link_research_line_to_group_db(context._active_connection_string, group_id, line_name.strip())

def unlink_research_line_from_group(group_id: int, line_name: str):
    if not context._active_connection_string:
        raise Exception("No DB connection")
    abpoxx_pybind.unlink_research_line_from_group_db(context._active_connection_string, group_id, line_name.strip())
