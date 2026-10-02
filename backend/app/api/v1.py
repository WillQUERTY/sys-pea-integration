from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from .. import repository
from .. import reports
from ..models import Group, Researcher, Product, Project, WorkPlan, PagedResponse

router = APIRouter()

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

# -------------------------------------------------------------------
# System Initialization and Export
# -------------------------------------------------------------------

@router.get("/dashboard/stats", tags=["System"])
async def get_dashboard_stats():
    """Retrieve aggregated dashboard stats using SQL directly."""
    return repository.get_dashboard_stats()

class InitDatabaseRequest(BaseModel):
    connection_string: str
    replace_existing: bool = False

class InitFileRequest(BaseModel):
    path: str
    replace_existing: bool = False

class InitEmptyRequest(BaseModel):
    confirm: bool = True

@router.post("/system/initialize/database", tags=["System"])
async def initialize_database(req: InitDatabaseRequest):
    if not req.connection_string:
        raise HTTPException(status_code=400, detail="Connection string required")
    success = repository.initialize(repository.InitMode.Database, req.connection_string)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to initialize from database")
    return {"status": "success", "method": "database", "connection": req.connection_string}

class SaveDatabaseRequest(BaseModel):
    connection_string: str

@router.post("/system/save/database", tags=["System"])
async def save_database(req: SaveDatabaseRequest):
    if not req.connection_string:
        raise HTTPException(status_code=400, detail="Connection string required")
    success = repository.save_to_db(req.connection_string)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save to database")
    return {"status": "success", "method": "database", "connection": req.connection_string}

@router.post("/system/initialize/file", tags=["System"])
async def initialize_file(req: InitFileRequest):
    success = repository.initialize(repository.InitMode.File, req.path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to initialize from file")
    return {"status": "success", "method": "file", "path": req.path}

@router.post("/system/initialize/empty", tags=["System"])
async def initialize_empty(_: InitEmptyRequest):
    success = repository.initialize(repository.InitMode.Empty)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to initialize empty state")
    return {"status": "success", "method": "empty"}

@router.get("/system/export", tags=["System"])
async def export_data(path: str = "pea_data.json"):
    success = repository.export_to_file(path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to export data")
    return {"status": "success", "export": path}

# -------------------------------------------------------------------
# LIFO Operation Stack (Undo)
# -------------------------------------------------------------------

@router.get("/system/undo", tags=["System"])
async def get_undo_stack():
    """List all operations stored in the LIFO Undo stack."""
    ops = repository.undo_list()
    return [
        {
            "id": op.id,
            "operation_type": op.operation_type,
            "entity_type": op.entity_type,
            "entity_id": op.entity_id,
            "previous_state": op.previous_state,
            "performed_at": op.performed_at
        } for op in ops
    ]

@router.post("/system/undo", tags=["System"])
async def perform_undo():
    """Revert the most recent operation on the LIFO stack."""
    result = repository.undo_perform()
    if result.get("status") == "empty":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@router.delete("/system/undo", tags=["System"])
async def clear_undo():
    """Clear all operations from the LIFO Undo stack."""
    repository.undo_clear()
    return {"status": "success", "message": "Pila Undo limpiada."}

# -------------------------------------------------------------------
# FIFO Validation Queue (Cola de Validación Técnica)
# -------------------------------------------------------------------

class EnqueueValidationRequest(BaseModel):
    product_id: int
    assigned_to: Optional[str] = "evaluador_tecnico"

@router.get("/system/validation-queue", tags=["Validation Queue"])
async def list_validation_queue():
    """List all pending validation queue items (FIFO order)."""
    items = repository.vq_list()
    return [
        {
            "id": it.id,
            "product_id": it.product_id,
            "enqueued_at": it.enqueued_at,
            "status": it.status,
            "attempts": it.attempts,
            "assigned_to": it.assigned_to,
            "result": it.result,
            "processed_at": it.processed_at
        } for it in items
    ]

@router.post("/system/validation-queue/enqueue", status_code=201, tags=["Validation Queue"])
async def enqueue_validation_item(req: EnqueueValidationRequest):
    """Enqueue a product into the FIFO validation queue."""
    repository.vq_enqueue(req.product_id, req.assigned_to or "")
    return {"status": "success", "product_id": req.product_id, "queue_size": repository.vq_size()}

# Nota: no existe deliberadamente un endpoint «process-next». Marcar válido un
# producto sin la asignación humana de tipología y categoría de calidad viola
# el §3.6 del Modelo de Medición 2024; cada ítem se procesa uno a uno vía
# validar-producto (set_product_validation, transaccional en BD).

@router.delete("/system/validation-queue/{item_id}", tags=["Validation Queue"])
async def cancel_validation_item(item_id: int):
    """Cancel a specific queue item without processing it (RAM + BD)."""
    try:
        product_id = repository.vq_remove_item(item_id)
        return {"status": "cancelled", "item_id": item_id, "product_id": product_id}
    except KeyError:
        raise HTTPException(status_code=404, detail="Queue item not found")

# -------------------------------------------------------------------
# Group Endpoints (CRUD & Multilistas)
# -------------------------------------------------------------------

class AddMemberRequest(BaseModel):
    role: Optional[str] = "Investigador"
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""

@router.get("/groups", response_model=PagedResponse[Group], tags=["Groups"])
async def list_groups_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    classification: Optional[str] = None,
):
    """Return groups stored in the RAM repository with server-side pagination, search and filters."""
    all_groups = repository.list_groups()
    if search:
        s = search.lower()
        all_groups = [g for g in all_groups if (s in g.name.lower()) or (g.acronym and s in g.acronym.lower()) or (s in g.external_code.lower())]
    if status and status != 'all':
        all_groups = [g for g in all_groups if g.status == status]
    if classification and classification != 'all':
        all_groups = [g for g in all_groups if g.classification == classification]
    total = len(all_groups)
    return PagedResponse(items=all_groups[skip : skip + limit], total=total, skip=skip, limit=limit)

@router.get("/groups/{group_id}", response_model=Group, tags=["Groups"])
async def get_group_endpoint(group_id: int):
    """Retrieve a single group by its identifier."""
    try:
        return repository.get_group(group_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")

@router.post("/groups", response_model=Group, status_code=201, tags=["Groups"])
async def create_group_endpoint(group: Group):
    """Create a new research group with write-through to SQL Server."""
    clean_data = group.model_dump(exclude={"id"}, exclude_unset=True)
    new_group = repository.create_group(Group(**clean_data))
    return new_group

@router.put("/groups/{group_id}", response_model=Group, tags=["Groups"])
async def update_group_endpoint(group_id: int, updates: Group):
    """Update group metadata in RAM and write-through to SQL Server (Requerimiento 11)."""
    try:
        return repository.update_group(group_id, updates)
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")

@router.delete("/groups/{group_id}", tags=["Groups"])
async def delete_group_endpoint(group_id: int, soft: bool = Query(True, description="Si es True, realiza baja lógica status='inactive'")):
    """Deactivate or remove a group (Requerimiento 9)."""
    try:
        success = repository.delete_group(group_id, soft=soft)
        return {"status": "success", "group_id": group_id, "soft_delete": soft}
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")

@router.post("/groups/{group_id}/restore", tags=["Groups"])
async def restore_group_endpoint(group_id: int):
    """Reactivate a soft-deleted group (Requerimiento 9, inverso)."""
    try:
        repository.restore_group(group_id)
        return {"status": "success", "group_id": group_id}
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")

@router.get("/groups/{group_id}/members", response_model=List[Researcher], tags=["Groups"])
async def list_group_members(group_id: int):
    """Retrieve all researcher members belonging to this group (Multilista)."""
    try:
        rids = repository.members_of_group(group_id)
        members = []
        for rid in rids:
            try:
                members.append(repository.get_researcher(rid))
            except KeyError:
                pass
        return members
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/groups/{group_id}/members/{researcher_id}", tags=["Groups"])
async def add_member_endpoint(group_id: int, researcher_id: int, req: AddMemberRequest = AddMemberRequest()):
    """Link a researcher to a research group (Multilista write-through)."""
    try:
        repository.add_member_to_group(group_id, researcher_id, req.role or "Investigador", req.start_date or "", req.end_date or "")
        return {"status": "success", "group_id": group_id, "researcher_id": researcher_id, "role": req.role}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/groups/{group_id}/memberships", tags=["Groups"])
async def list_group_memberships(group_id: int):
    """Memberships of a group with role and dates (read from RAM C++ multilist)."""
    try:
        repository.get_group(group_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")
    return repository.get_group_members_detailed(group_id)

@router.put("/groups/{group_id}/members/{researcher_id}", tags=["Groups"])
async def update_member_endpoint(group_id: int, researcher_id: int, req: AddMemberRequest):
    """Update role and dates of an existing membership (keeps history, no unlink)."""
    try:
        repository.update_member(group_id, researcher_id, req.role or "Investigador", req.start_date or "", req.end_date or "")
        return {"status": "success", "group_id": group_id, "researcher_id": researcher_id}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/groups/{group_id}/members/{researcher_id}", tags=["Groups"])
async def remove_member_endpoint(group_id: int, researcher_id: int):
    """Unlink a researcher from a group (Multilista write-through)."""
    try:
        repository.remove_member_from_group(group_id, researcher_id)
        return {"status": "success", "group_id": group_id, "researcher_id": researcher_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/groups/{group_id}/products", response_model=List[Product], tags=["Groups"])
async def list_group_products(group_id: int):
    """Retrieve all products linked to this research group (Multilista)."""
    try:
        pids = repository.products_of_group(group_id)
        products = []
        for pid in pids:
            try:
                products.append(repository.get_product(pid))
            except KeyError:
                pass
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/groups/{group_id}/projects", response_model=List[Project], tags=["Groups"])
async def list_group_projects(group_id: int):
    """Retrieve all projects linked to this research group."""
    try:
        return repository.get_group_projects(group_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/groups/{group_id}/research-lines", response_model=List[str], tags=["Groups"])
async def list_group_research_lines(group_id: int):
    """Retrieve all research lines linked to this research group."""
    try:
        return repository.get_group_research_lines(group_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/groups/{group_id}/report/pdf", tags=["Groups"])
async def get_group_report_pdf(
    group_id: int,
    start_year: Optional[int] = Query(None, description="Año inicial para Ventana de Observación (Requerimiento 10)"),
    end_year: Optional[int] = Query(None, description="Año final para Ventana de Observación (Requerimiento 10)"),
    window_years: Optional[int] = Query(None, description="Ventana de observación en años hacia atrás (ej. 2 o 5 años)"),
):
    """Informe PDF del grupo (estilo GrupLAC): datos basicos, integrantes,
    produccion agrupada por familia/subtipo Minciencias y proyectos.
    La produccion puede restringirse a una ventana de observación (Req. 10)."""
    try:
        pdf = reports.build_group_report_pdf(
            group_id, start_year=start_year, end_year=end_year, window_years=window_years
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando el informe: {e}")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="informe_grupo_{group_id}.pdf"'},
    )

@router.post("/groups/{group_id}/products/{product_id}", tags=["Groups"])
async def link_product_endpoint(group_id: int, product_id: int):
    """Link a scientific product to a research group."""
    try:
        repository.link_product_to_group(group_id, product_id)
        return {"status": "success", "group_id": group_id, "product_id": product_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/groups/{group_id}/products/{product_id}", tags=["Groups"])
async def unlink_product_endpoint(group_id: int, product_id: int):
    """Unlink a product from a research group."""
    try:
        repository.unlink_product_from_group(group_id, product_id)
        return {"status": "success", "group_id": group_id, "product_id": product_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/groups/{group_id}/projects", tags=["Groups"])
async def link_project_endpoint(group_id: int, project: Project):
    """Link (and create if not exists) a project to a research group."""
    try:
        pid = repository.link_project_to_group(group_id, project)
        return {"status": "success", "group_id": group_id, "project_id": pid}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/groups/{group_id}/projects/{project_id}", tags=["Groups"])
async def unlink_project_endpoint(group_id: int, project_id: int):
    """Unlink a project from a research group."""
    try:
        repository.unlink_project_from_group(group_id, project_id)
        return {"status": "success", "group_id": group_id, "project_id": project_id}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ResearchLineRequest(BaseModel):
    name: str

@router.post("/groups/{group_id}/research-lines", tags=["Groups"])
async def link_research_line_endpoint(group_id: int, req: ResearchLineRequest):
    """Link a research line to a group."""
    try:
        line_id = repository.link_research_line_to_group(group_id, req.name)
        return {"status": "success", "group_id": group_id, "line_id": line_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/groups/{group_id}/research-lines/{line_name}", tags=["Groups"])
async def unlink_research_line_endpoint(group_id: int, line_name: str):
    """Unlink a research line from a group."""
    try:
        repository.unlink_research_line_from_group(group_id, line_name)
        return {"status": "success", "group_id": group_id, "line_name": line_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------------
# WorkPlan Endpoints (T-08: planes de trabajo por grupo)
# -------------------------------------------------------------------

@router.get("/groups/{group_id}/plans", response_model=List[WorkPlan], tags=["Groups"])
async def list_group_plans(group_id: int):
    """Retrieve the work plans of a research group (Multilista Grupo → planes)."""
    try:
        return repository.list_work_plans_of_group(group_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")

@router.post("/groups/{group_id}/plans", response_model=WorkPlan, status_code=201, tags=["Groups"])
async def create_plan_endpoint(group_id: int, plan: WorkPlan):
    """Create a work plan for a group (write-through to SQL Server)."""
    try:
        plan.group_id = group_id
        return repository.create_work_plan(plan)
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/plans/{plan_id}", response_model=WorkPlan, tags=["Plans"])
async def update_plan_endpoint(plan_id: int, updates: WorkPlan):
    """Update a work plan (Requerimiento 11)."""
    try:
        return repository.update_work_plan(plan_id, updates)
    except KeyError:
        raise HTTPException(status_code=404, detail="Work plan not found")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/plans/{plan_id}", tags=["Plans"])
async def delete_plan_endpoint(plan_id: int, soft: bool = Query(True, description="Si es True, realiza baja lógica status='inactive'")):
    """Deactivate or remove a work plan (Requerimiento 9)."""
    try:
        repository.delete_work_plan(plan_id, soft=soft)
        return {"status": "success", "plan_id": plan_id, "soft_delete": soft}
    except KeyError:
        raise HTTPException(status_code=404, detail="Work plan not found")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/plans/{plan_id}/restore", tags=["Plans"])
async def restore_plan_endpoint(plan_id: int):
    """Reactivate a soft-deleted work plan (Requerimiento 9, inverso)."""
    try:
        repository.restore_work_plan(plan_id)
        return {"status": "success", "plan_id": plan_id}
    except KeyError:
        raise HTTPException(status_code=404, detail="Work plan not found")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------------
# Project Endpoints (Req. 3: CRUD standalone + vinculación a grupos)
# -------------------------------------------------------------------

@router.get("/projects", response_model=PagedResponse[Project], tags=["Projects"])
async def list_projects_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    search: Optional[str] = None,
    status: Optional[str] = None,
):
    """List all projects with server-side pagination, search and status filter."""
    items, total = repository.list_projects(skip=skip, limit=limit, search=search, status=status)
    return PagedResponse[Project](items=items, total=total, skip=skip, limit=limit)

@router.post("/projects", response_model=Project, status_code=201, tags=["Projects"])
async def create_project_endpoint(project: Project):
    """Create a standalone project (write-through to SQL Server)."""
    try:
        return repository.create_project(project)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects/{project_id}", response_model=Project, tags=["Projects"])
async def get_project_endpoint(project_id: int):
    """Retrieve a project by id."""
    try:
        return repository.get_project(project_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Project not found")

@router.put("/projects/{project_id}", response_model=Project, tags=["Projects"])
async def update_project_endpoint(project_id: int, updates: Project):
    """Update a project (Requerimiento 11)."""
    try:
        return repository.update_project(project_id, updates)
    except KeyError:
        raise HTTPException(status_code=404, detail="Project not found")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/projects/{project_id}", tags=["Projects"])
async def delete_project_endpoint(project_id: int, soft: bool = Query(True, description="Si es True, realiza baja lógica status='inactive'")):
    """Deactivate or remove a project (Requerimiento 9)."""
    try:
        repository.delete_project(project_id, soft=soft)
        return {"status": "success", "project_id": project_id, "soft_delete": soft}
    except KeyError:
        raise HTTPException(status_code=404, detail="Project not found")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/projects/{project_id}/restore", tags=["Projects"])
async def restore_project_endpoint(project_id: int):
    """Reactivate a soft-deleted project (Requerimiento 9, inverso)."""
    try:
        repository.restore_project(project_id)
        return {"status": "success", "project_id": project_id}
    except KeyError:
        raise HTTPException(status_code=404, detail="Project not found")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------------
# Researcher Endpoints (CRUD & Cross-Queries)
# -------------------------------------------------------------------

@router.get("/researchers", response_model=PagedResponse[Researcher], tags=["Researchers"])
async def list_researchers_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=10000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    educational_level: Optional[str] = None,
    category: Optional[str] = None
):
    """Return researchers with server-side pagination, search, filtering and total count."""
    all_res = repository.list_researchers()
    if status and status != 'all':
        all_res = [r for r in all_res if r.status == status]
    if educational_level and educational_level != 'all':
        all_res = [r for r in all_res if r.highest_education_level == educational_level]
    if category and category != 'all':
        all_res = [r for r in all_res if r.classification_records == category]
    if search:
        s = search.lower()
        all_res = [r for r in all_res if s in r.first_names.lower() or s in r.last_names.lower() or s in r.external_code.lower()]
    total = len(all_res)
    return PagedResponse(items=all_res[skip : skip + limit], total=total, skip=skip, limit=limit)

@router.get("/researchers/{res_id}", response_model=Researcher, tags=["Researchers"])
async def get_researcher_endpoint(res_id: int):
    """Retrieve a single researcher by its identifier."""
    try:
        return repository.get_researcher(res_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Researcher not found")

@router.post("/researchers", response_model=Researcher, status_code=201, tags=["Researchers"])
async def create_researcher_endpoint(res: Researcher):
    """Create a new researcher with write-through to SQL Server."""
    clean_data = res.model_dump(exclude={"id"}, exclude_unset=True)
    new_res = repository.create_researcher(Researcher(**clean_data))
    return new_res

@router.put("/researchers/{res_id}", response_model=Researcher, tags=["Researchers"])
async def update_researcher_endpoint(res_id: int, updates: Researcher):
    """Update researcher fields with write-through to SQL Server (Requerimiento 11)."""
    try:
        return repository.update_researcher(res_id, updates)
    except KeyError:
        raise HTTPException(status_code=404, detail="Researcher not found")

@router.delete("/researchers/{res_id}", tags=["Researchers"])
async def delete_researcher_endpoint(res_id: int, soft: bool = Query(True, description="Si es True, realiza baja lógica status='inactive'")):
    """Deactivate or remove a researcher (Requerimiento 9)."""
    try:
        repository.delete_researcher(res_id, soft=soft)
        return {"status": "success", "researcher_id": res_id, "soft_delete": soft}
    except KeyError:
        raise HTTPException(status_code=404, detail="Researcher not found")

@router.post("/researchers/{res_id}/restore", tags=["Researchers"])
async def restore_researcher_endpoint(res_id: int):
    """Reactivate a soft-deleted researcher (Requerimiento 9, inverso)."""
    try:
        repository.restore_researcher(res_id)
        return {"status": "success", "researcher_id": res_id}
    except KeyError:
        raise HTTPException(status_code=404, detail="Researcher not found")

@router.get("/researchers/{res_id}/groups", response_model=List[Group], tags=["Researchers"])
async def list_researcher_groups(res_id: int):
    """Retrieve all groups where this researcher is a member."""
    gids = repository.groups_of_researcher(res_id)
    groups = []
    for gid in gids:
        try:
            groups.append(repository.get_group(gid))
        except KeyError:
            pass
    return groups

@router.get("/researchers/{res_id}/products", response_model=List[Product], tags=["Researchers"])
async def list_researcher_products(res_id: int):
    """Retrieve all products authored by this researcher."""
    pids = repository.products_of_researcher(res_id)
    products = []
    for pid in pids:
        try:
            products.append(repository.get_product(pid))
        except KeyError:
            pass
    return products

# -------------------------------------------------------------------
# Product Endpoints (CRUD, Ventana de Observación & Validación)
# -------------------------------------------------------------------

class ProductValidationRequest(BaseModel):
    validation_status: str  # 'valid', 'rejected', 'pending'
    quality_category_id: Optional[int] = None
    reason: Optional[str] = "Validación técnica manual"

@router.get("/products", response_model=PagedResponse[Product], tags=["Products"])
async def list_products_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    search: Optional[str] = None,
    validation_status: Optional[str] = None,
    status: Optional[str] = Query(None, description="Estado del registro (active/inactive), no confundir con validation_status"),
    family_id: Optional[int] = None,
    group_id: Optional[int] = None,
    start_year: Optional[int] = Query(None, description="Año inicial para Ventana de Observación (Requerimiento 10)"),
    end_year: Optional[int] = Query(None, description="Año final para Ventana de Observación (Requerimiento 10)"),
    window_years: Optional[int] = Query(None, description="Ventana de observación en años hacia atrás (ej. 2 o 5 años)")
):
    """
    List products with complete filtering, dynamic Observation Window (Requerimiento 10)
    and server-side pagination with total count.
    """
    import datetime
    cur_year = datetime.datetime.now().year
    effective_start = start_year
    effective_end = end_year

    if window_years is not None and window_years > 0:
        effective_start = cur_year - window_years
        effective_end = cur_year
    # Rango invertido: normalizar igual que el CLI (`products by-year`)
    if effective_start is not None and effective_end is not None and effective_start > effective_end:
        effective_start, effective_end = effective_end, effective_start

    items = repository.filter_products(
        start_year=effective_start,
        end_year=effective_end,
        family_id=family_id,
        validation_status=validation_status,
        status=status,
        group_id=group_id,
        search=search,
    )
    total = len(items)
    return PagedResponse(items=items[skip : skip + limit], total=total, skip=skip, limit=limit)

@router.get("/products/catalogs", tags=["Products"])
async def get_product_catalogs_endpoint():
    """Product catalogs (families, subtypes, quality categories) from SQL Server.
    Used by the UI to render searchable selectors instead of raw numeric ids."""
    return repository.get_product_catalogs()

@router.get("/products/{prod_id}", response_model=Product, tags=["Products"])
async def get_product_endpoint(prod_id: int):
    """Retrieve a single product by its identifier."""
    try:
        return repository.get_product(prod_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Product not found")

@router.post("/products", response_model=Product, status_code=201, tags=["Products"])
async def create_product_endpoint(prod: Product):
    """Create a new product with write-through to SQL Server."""
    clean_data = prod.model_dump(exclude={"id"}, exclude_unset=True)
    new_prod = repository.create_product(Product(**clean_data))
    return new_prod

@router.put("/products/{prod_id}", response_model=Product, tags=["Products"])
async def update_product_endpoint(prod_id: int, updates: Product):
    """Update product fields with write-through to SQL Server (Requerimiento 11)."""
    try:
        return repository.update_product(prod_id, updates)
    except KeyError:
        raise HTTPException(status_code=404, detail="Product not found")

@router.delete("/products/{prod_id}", tags=["Products"])
async def delete_product_endpoint(prod_id: int, soft: bool = Query(True, description="Si es True, realiza baja lógica status='inactive'")):
    """Deactivate or remove a product (Requerimiento 9)."""
    try:
        repository.delete_product(prod_id, soft=soft)
        return {"status": "success", "product_id": prod_id, "soft_delete": soft}
    except KeyError:
        raise HTTPException(status_code=404, detail="Product not found")

@router.post("/products/{prod_id}/restore", tags=["Products"])
async def restore_product_endpoint(prod_id: int):
    """Reactivate a soft-deleted product (Requerimiento 9, inverso)."""
    try:
        repository.restore_product(prod_id)
        return {"status": "success", "product_id": prod_id}
    except KeyError:
        raise HTTPException(status_code=404, detail="Product not found")

@router.patch("/products/{prod_id}/validation", response_model=Product, tags=["Products"])
async def validate_product_endpoint(prod_id: int, req: ProductValidationRequest):
    """
    Validate or reject a scientific product (Requerimiento 9).
    Updates product validation status, quality category, GroupProductLink proposal status, and resolves queue item.
    """
    try:
        return repository.set_product_validation(
            prod_id=prod_id,
            validation_status=req.validation_status,
            quality_category_id=req.quality_category_id,
            reason=req.reason or "Validación técnica manual"
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Product not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------------------------
# Product authorship (ProductAuthor)
# -------------------------------------------------------------------

class ProductAuthorRequest(BaseModel):
    researcher_id: Optional[int] = None
    author_order: int = 1
    external_author_name: str = ""
    external_author_identifier: str = ""

@router.get("/products/{prod_id}/authors", tags=["Products"])
async def get_product_authors_endpoint(prod_id: int):
    """List authors of a product (internal researchers and external authors)."""
    try:
        repository.get_product(prod_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Product not found")
    return repository.get_product_authors(prod_id)

@router.post("/products/{prod_id}/authors", status_code=201, tags=["Products"])
async def add_product_author_endpoint(prod_id: int, req: ProductAuthorRequest):
    """Link a researcher (or register an external author) as author of a product."""
    try:
        repository.get_product(prod_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Product not found")
    if req.researcher_id:
        try:
            repository.get_researcher(req.researcher_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Researcher not found")
    elif not req.external_author_name:
        raise HTTPException(status_code=400, detail="Debe indicar researcher_id o external_author_name")
    repository.add_product_author(
        product_id=prod_id,
        researcher_id=req.researcher_id or 0,
        author_order=req.author_order,
        external_author_name=req.external_author_name,
        external_author_identifier=req.external_author_identifier,
    )
    return {"status": "success", "product_id": prod_id}

@router.delete("/products/{prod_id}/authors", tags=["Products"])
async def remove_product_author_endpoint(
    prod_id: int,
    researcher_id: Optional[int] = Query(None),
    external_author_name: Optional[str] = Query(None),
):
    """Remove an author from a product (by researcher_id or external_author_name)."""
    if not researcher_id and not external_author_name:
        raise HTTPException(status_code=400, detail="Debe indicar researcher_id o external_author_name")
    try:
        repository.remove_product_author(prod_id, researcher_id or 0, external_author_name or "")
        return {"status": "success", "product_id": prod_id}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------------------------
# Scraping & Ingestion endpoints (Taller 2 - Requerimiento 7)
# -------------------------------------------------------------------

class EnrichRequest(BaseModel):
    only_missing: bool = True
    limit: int = 0  # 0 = sin límite

@router.post("/researchers/enrich/datos-abiertos", tags=["Ingestion"])
async def enrich_researchers_endpoint(req: EnrichRequest):
    """
    Enriquece investigadores desde el dataset oficial «Investigadores Reconocidos
    por convocatoria» (datos.gov.co / Socrata) usando su cod_rh — sin scraping.
    Rellena nivel de formación, nacionalidad, residencia y clasificación Minciencias.
    """
    from .. import datos_abiertos
    return datos_abiertos.enrich_all(only_missing=req.only_missing, limit=req.limit)

@router.post("/researchers/{res_id}/enrich/datos-abiertos", tags=["Ingestion"])
async def enrich_single_researcher_endpoint(res_id: int):
    """Enriquece un único investigador por su cod_rh contra datos abiertos."""
    from .. import datos_abiertos
    try:
        return datos_abiertos.enrich_researcher(res_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Researcher not found")

class CvlacImportRequest(BaseModel):
    text: str
    target_group_code: Optional[str] = "COL0011545"

class CvlacFetchRequest(BaseModel):
    cod_rh: str
    target_group_code: Optional[str] = None

@router.post("/researchers/import/cvlac/by-cod-rh", tags=["Ingestion"])
async def import_cvlac_by_cod_rh_endpoint(req: CvlacFetchRequest):
    """
    Descarga automáticamente el CvLAC público de un investigador por su cod_rh
    (Scienti/Minciencias), lo parsea y lo persiste con sus productos.
    Alternativa automatizada al pegado manual de texto.
    """
    from ..cvlac_scraper import CvParser, CvCommitService, fetch_cvlac_text
    conn_str = repository._active_connection_string or "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"
    try:
        text = fetch_cvlac_text(req.cod_rh)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    cv = CvParser.parse_text(text)
    # Reconciliación: usar el cod_rh como external_code para ACTUALIZAR al
    # investigador que GrupLAC ya creó, en lugar de duplicarlo.
    cv.external_code = "".join(c for c in req.cod_rh if c.isdigit()).zfill(10)
    if req.target_group_code:
        cv.target_group_code = req.target_group_code
    result = CvCommitService.commit_cvlac(cv, conn_str)
    result["ram_reloaded"] = _reload_ram_from_db(conn_str)
    return result

class GruplacImportRequest(BaseModel):
    url: Optional[str] = None
    group_code: Optional[str] = None  # "COL0016283" o nro crudo de GrupLAC
    enrich_cvlac: bool = False

@router.get("/groups/search/scienti", tags=["Ingestion"])
async def search_groups_endpoint(
    q: str = "",
    departamento: Optional[str] = None,
    institucion: Optional[str] = None,
    clasificacion: Optional[str] = None,
    limit: int = 50,
):
    """
    Busca grupos en el buscador oficial de Scienti (busquedaAvanzadaGrupos.do)
    por nombre, institución y departamento. Devuelve cada candidato con el nro
    REAL de GrupLAC y su URL lista para vista previa/importación.
    Scienti es la única fuente de verdad para identidad de grupos.
    """
    from ..scraper import buscar_grupos_scienti
    return buscar_grupos_scienti(
        nombre=q, institucion=institucion or "", departamento=departamento or "",
        clasificacion=clasificacion or "", limit=min(limit, 200),
    )

@router.post("/researchers/import/cvlac", tags=["Ingestion"])
async def import_cvlac_endpoint(req: CvlacImportRequest):
    """Import an individual researcher and their scientific products from CvLAC text."""
    from ..cvlac_scraper import CvParser, CvCommitService
    conn_str = repository._active_connection_string or "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"
    cv = CvParser.parse_text(req.text)
    # Si el usuario pegó el HTML crudo de la página, parse_text ya lo procesa con
    # el extractor DOM; si pegó texto plano, el ORCID no se puede recuperar (el
    # código solo vive en el href del ancla).
    if req.target_group_code:
        cv.target_group_code = req.target_group_code
    result = CvCommitService.commit_cvlac(cv, conn_str)
    result["ram_reloaded"] = _reload_ram_from_db(conn_str)
    return result

@router.post("/groups/import/gruplac/preview", tags=["Ingestion"])
async def preview_gruplac_endpoint(req: GruplacImportRequest):
    """
    Phase 1 of GrupLAC import: download and parse the public page, returning the
    extracted DTO for human review WITHOUT persisting anything (Revisión §16/§29).
    """
    from ..scraper import scrape_gruplac
    from ..datos_abiertos_grupos import resolver_url_gruplac_ex
    try:
        url, via = resolver_url_gruplac_ex(req.url, req.group_code)
        # La validación de código solo aplica al intento débil por dígitos:
        # el buscador oficial ya resolvió autoritativamente (los esquemas de
        # código de la página GrupLAC y de datos abiertos difieren).
        expected = (req.group_code or "") if via == "digitos" else ""
        return scrape_gruplac(url, preview=True, expected_group_code=expected)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/groups/import/gruplac", tags=["Ingestion"])
async def import_gruplac_endpoint(req: GruplacImportRequest):
    """
    Phase 2 of GrupLAC import (confirm): import a research group and its full
    catalog atomically from Minciencias GrupLAC URL after reviewing the preview.
    """
    from ..scraper import scrape_gruplac
    from ..datos_abiertos_grupos import resolver_url_gruplac_ex
    conn_str = repository._active_connection_string or "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"
    try:
        url, via = resolver_url_gruplac_ex(req.url, req.group_code)
        expected = (req.group_code or "") if via == "digitos" else ""
        result = scrape_gruplac(url, conn_str, enrich_cvlac=req.enrich_cvlac, expected_group_code=expected)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    result["ram_reloaded"] = _reload_ram_from_db(conn_str)
    return result
