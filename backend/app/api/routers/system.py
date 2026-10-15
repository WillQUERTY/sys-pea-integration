import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ... import repository
from ...models import ValidationQueueItem, ValidationQueueResponse

router = APIRouter()

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

def _get_entity_label(entity_type: str, entity_id: int, prev_state: str) -> Optional[str]:
    # 1. Intentar extraer título o nombre desde el snapshot JSON
    if prev_state and prev_state.startswith("{"):
        try:
            data = json.loads(prev_state)
            if "title" in data and data["title"]:
                return data["title"]
            if "name" in data and data["name"]:
                return data["name"]
            if "first_names" in data:
                return f"{data.get('first_names', '')} {data.get('last_names', '')}".strip()
        except Exception:
            pass

    # 2. Vínculos e interconexiones multilista: gid:rid o gid:pid
    if ":" in prev_state:
        try:
            parts = prev_state.split("\x1F")[0].split(":")
            if len(parts) == 2:
                gid, target_id = int(parts[0]), int(parts[1])
                g = repository.get_group(gid)
                g_name = g.acronym or g.name if g else f"Grupo #{gid}"
                if entity_type == "GroupMembership":
                    r = repository.get_researcher(target_id)
                    r_name = f"{r.first_names} {r.last_names}".strip() if r else f"Investigador #{target_id}"
                    return f"{g_name} ↔ {r_name}"
                elif entity_type == "GroupProductLink":
                    p = repository.get_product(target_id)
                    p_name = p.title if p else f"Producto #{target_id}"
                    return f"{g_name} ↔ {p_name}"
                elif entity_type == "Project":
                    proj = repository.get_project(target_id)
                    proj_name = proj.title if proj else f"Proyecto #{target_id}"
                    return f"{g_name} ↔ {proj_name}"
        except Exception:
            pass

    # 3. Consultar entidad en memoria activa (ej. para CREATE)
    try:
        if entity_type == "Product":
            p = repository.get_product(entity_id)
            return p.title if p else None
        elif entity_type == "Group":
            g = repository.get_group(entity_id)
            return g.name if g else None
        elif entity_type == "Researcher":
            r = repository.get_researcher(entity_id)
            return f"{r.first_names} {r.last_names}".strip() if r else None
        elif entity_type == "Project":
            proj = repository.get_project(entity_id)
            return proj.title if proj else None
        elif entity_type == "WorkPlan":
            wp = repository.get_work_plan(entity_id)
            return wp.title if wp else None
    except Exception:
        pass

    return None


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
            "entity_name": _get_entity_label(op.entity_type, op.entity_id, op.previous_state),
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


@router.get("/system/validation-queue", response_model=ValidationQueueResponse, tags=["Validation Queue"])
async def list_validation_queue(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=10000),
    status: Optional[str] = None,
    search: Optional[str] = None,
):
    """List validation queue items with native pagination, search and product enrichment (FIFO order)."""
    raw_items = repository.vq_list()
    pending_count = repository.vq_pending_count()

    if status and status != "all":
        raw_items = [it for it in raw_items if (it.status or "pending") == status]

    if search:
        s = search.strip().lower()
        products_by_id = {p.id: p for p in repository.list_products() if p.id is not None}
        matched = []
        for it in raw_items:
            prod = products_by_id.get(it.product_id)
            title = (prod.title or "").lower() if prod else ""
            ext_code = (prod.external_code or "").lower() if prod else ""
            assigned = (it.assigned_to or "").lower()
            pid_str = str(it.product_id)
            if s in title or s in ext_code or s in assigned or s in pid_str:
                matched.append(it)
        raw_items = matched

    total = len(raw_items)
    page_items = raw_items[skip : skip + limit]

    enriched: List[ValidationQueueItem] = []
    for it in page_items:
        prod = None
        try:
            prod = repository.get_product(it.product_id)
        except KeyError:
            pass

        enriched.append(
            ValidationQueueItem(
                id=it.id,
                product_id=it.product_id,
                enqueued_at=it.enqueued_at,
                status=it.status,
                attempts=it.attempts,
                assigned_to=it.assigned_to,
                result=it.result,
                processed_at=it.processed_at,
                product_title=prod.title if prod else f"Producto #{it.product_id}",
                product_external_code=prod.external_code if prod else None,
                product=prod,
            )
        )

    return ValidationQueueResponse(
        items=enriched,
        total=total,
        skip=skip,
        limit=limit,
        pending_count=pending_count,
    )


@router.post("/system/validation-queue/enqueue", status_code=201, tags=["Validation Queue"])
async def enqueue_validation_item(req: EnqueueValidationRequest):
    """Enqueue a product into the FIFO validation queue."""
    repository.vq_enqueue(req.product_id, req.assigned_to or "")
    return {"status": "success", "product_id": req.product_id, "queue_size": repository.vq_size()}


@router.delete("/system/validation-queue/{item_id}", tags=["Validation Queue"])
async def cancel_validation_item(item_id: int):
    """Cancel a specific queue item without processing it (RAM + BD)."""
    try:
        product_id = repository.vq_remove_item(item_id)
        return {"status": "cancelled", "item_id": item_id, "product_id": product_id}
    except KeyError:
        raise HTTPException(status_code=404, detail="Queue item not found")
