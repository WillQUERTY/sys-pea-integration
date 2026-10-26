import json
import pathlib
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ... import repository
from ...config import settings, ROOT_DIR, BACKEND_DIR
from ...models import ValidationQueueItem, ValidationQueueResponse

router = APIRouter()

# -------------------------------------------------------------------
# System Initialization and Export
# -------------------------------------------------------------------

def _resolve_data_path(path_str: Optional[str]) -> str:
    """
    Resuelve la ruta del archivo JSON a una ruta absoluta existente o por defecto.
    Soporta rutas relativas desde ROOT_DIR o BACKEND_DIR.
    """
    if not path_str or not path_str.strip():
        return str(settings.DATA_JSON_PATH)
    p = pathlib.Path(path_str.strip())
    if p.is_absolute() and p.exists():
        return str(p)
    # 1. Probar relativa a la raíz del repositorio
    if (ROOT_DIR / p).exists():
        return str(ROOT_DIR / p)
    # 2. Probar relativa al directorio backend
    if (BACKEND_DIR / p).exists():
        return str(BACKEND_DIR / p)
    # 3. Si coincide con el nombre del JSON configurado y este existe
    if p.name == settings.DATA_JSON_PATH.name and settings.DATA_JSON_PATH.exists():
        return str(settings.DATA_JSON_PATH)
    # 4. Fallback: ruta absoluta anclada a ROOT_DIR
    return str(ROOT_DIR / p)


@router.get("/dashboard/stats", tags=["System"])
async def get_dashboard_stats():
    """Retrieve aggregated dashboard stats using SQL directly."""
    return repository.get_dashboard_stats()


class InitDatabaseRequest(BaseModel):
    connection_string: Optional[str] = None
    replace_existing: bool = False


class InitFileRequest(BaseModel):
    path: Optional[str] = "pea_data.json"
    replace_existing: bool = False


class InitEmptyRequest(BaseModel):
    confirm: bool = True


@router.post("/system/initialize/database", tags=["System"])
async def initialize_database(req: InitDatabaseRequest):
    # Usar cadena provista o fallback a la configuración activa del servidor
    conn_str = req.connection_string.strip() if (req.connection_string and req.connection_string.strip()) else settings.connection_string
    success = False
    try:
        success = repository.initialize(repository.InitMode.Database, conn_str)
    except Exception as e:
        print(f"[System Router] Error en initialize database: {e}")

    # Fallback automático: si la cadena del cliente falló y es distinta a settings, reintentar con la del servidor
    if not success and conn_str != settings.connection_string:
        print("[System Router] Cadena del cliente falló; reintentando con settings.connection_string del servidor...")
        try:
            success = repository.initialize(repository.InitMode.Database, settings.connection_string)
            if success:
                conn_str = settings.connection_string
        except Exception as e:
            print(f"[System Router] Fallback de settings.connection_string también falló: {e}")

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to initialize from database (verifique la conectividad con SQL Server)"
        )
    return {"status": "success", "method": "database", "connection": conn_str}


class SaveDatabaseRequest(BaseModel):
    connection_string: Optional[str] = None


@router.post("/system/save/database", tags=["System"])
async def save_database(req: SaveDatabaseRequest):
    conn_str = req.connection_string.strip() if (req.connection_string and req.connection_string.strip()) else settings.connection_string
    success = False
    try:
        success = repository.save_to_db(conn_str)
    except Exception as e:
        print(f"[System Router] Error en save database: {e}")

    if not success and conn_str != settings.connection_string:
        print("[System Router] Cadena del cliente falló al guardar; reintentando con settings.connection_string...")
        try:
            success = repository.save_to_db(settings.connection_string)
            if success:
                conn_str = settings.connection_string
        except Exception as e:
            print(f"[System Router] Fallback de guardado también falló: {e}")

    if not success:
        raise HTTPException(status_code=500, detail="Failed to save to database")
    return {"status": "success", "method": "database", "connection": conn_str}


@router.post("/system/initialize/file", tags=["System"])
async def initialize_file(req: InitFileRequest):
    target_path = _resolve_data_path(req.path)
    success = repository.initialize(repository.InitMode.File, target_path)
    if not success:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize from file: {target_path} (archivo no encontrado o no legible por el núcleo C++)"
        )
    return {"status": "success", "method": "file", "path": target_path}


@router.post("/system/initialize/empty", tags=["System"])
async def initialize_empty(_: InitEmptyRequest):
    success = repository.initialize(repository.InitMode.Empty)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to initialize empty state")
    return {"status": "success", "method": "empty"}


@router.get("/system/export", tags=["System"])
async def export_data(path: str = "pea_data.json"):
    p = pathlib.Path(path.strip()) if path else pathlib.Path("pea_data.json")
    target_path = str(p if p.is_absolute() else (ROOT_DIR / p))
    success = repository.export_to_file(target_path)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to export data to {target_path}")
    return {"status": "success", "export": target_path}



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
