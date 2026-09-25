from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from .. import repository
from ..models import Group, Researcher, Product

router = APIRouter()

# -------------------------------------------------------------------
# System Initialization and Export
# -------------------------------------------------------------------

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

@router.post("/system/validation-queue/process-next", tags=["Validation Queue"])
async def process_next_validation_item():
    """Process and dequeue the next pending product in the FIFO queue."""
    processed = repository.vq_process_next()
    if not processed:
        raise HTTPException(status_code=400, detail="La cola de validación está vacía o no hay ítems pendientes.")
    return {"status": "success", "remaining_pending": repository.vq_pending_count()}

# -------------------------------------------------------------------
# Group Endpoints (CRUD & Multilistas)
# -------------------------------------------------------------------

class AddMemberRequest(BaseModel):
    role: Optional[str] = "Investigador"
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""

@router.get("/groups", response_model=List[Group], tags=["Groups"])
async def list_groups_endpoint(skip: int = 0, limit: int = 100, search: Optional[str] = None):
    """Return all groups stored in the RAM repository with pagination and search."""
    all_groups = repository.list_groups()
    if search:
        s = search.lower()
        all_groups = [g for g in all_groups if (s in g.name.lower()) or (g.acronym and s in g.acronym.lower()) or (s in g.external_code.lower())]
    return all_groups[skip : skip + limit]

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

# -------------------------------------------------------------------
# Researcher Endpoints (CRUD & Cross-Queries)
# -------------------------------------------------------------------

@router.get("/researchers", response_model=List[Researcher], tags=["Researchers"])
async def list_researchers_endpoint(skip: int = 0, limit: int = 100, search: Optional[str] = None, status: Optional[str] = None):
    """Return researchers with pagination, search and filtering."""
    all_res = repository.list_researchers()
    if status:
        all_res = [r for r in all_res if r.status == status]
    if search:
        s = search.lower()
        all_res = [r for r in all_res if s in r.first_names.lower() or s in r.last_names.lower() or s in r.external_code.lower()]
    return all_res[skip : skip + limit]

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

@router.get("/products", response_model=List[Product], tags=["Products"])
async def list_products_endpoint(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    validation_status: Optional[str] = None,
    family_id: Optional[int] = None,
    group_id: Optional[int] = None,
    start_year: Optional[int] = Query(None, description="Año inicial para Ventana de Observación (Requerimiento 10)"),
    end_year: Optional[int] = Query(None, description="Año final para Ventana de Observación (Requerimiento 10)"),
    window_years: Optional[int] = Query(None, description="Ventana de observación en años hacia atrás (ej. 2 o 5 años)")
):
    """
    List products with complete filtering and dynamic Observation Window (Requerimiento 10).
    """
    import datetime
    cur_year = datetime.datetime.now().year
    effective_start = start_year
    effective_end = end_year

    if window_years is not None and window_years > 0:
        effective_start = cur_year - window_years
        effective_end = cur_year

    return repository.filter_products(
        start_year=effective_start,
        end_year=effective_end,
        family_id=family_id,
        validation_status=validation_status,
        group_id=group_id,
        search=search,
        skip=skip,
        limit=limit
    )

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
# Scraping & Ingestion endpoints (Taller 2 - Requerimiento 7)
# -------------------------------------------------------------------

class CvlacImportRequest(BaseModel):
    text: str
    target_group_code: Optional[str] = "COL0011545"

class GruplacImportRequest(BaseModel):
    url: str

@router.post("/researchers/import/cvlac", tags=["Ingestion"])
async def import_cvlac_endpoint(req: CvlacImportRequest):
    """Import an individual researcher and their scientific products from CvLAC text."""
    from ..cvlac_scraper import CvParser, CvCommitService
    conn_str = repository._active_connection_string or "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"
    cv = CvParser.parse_text(req.text)
    if req.target_group_code:
        cv.target_group_code = req.target_group_code
    result = CvCommitService.commit_cvlac(cv, conn_str)
    return result

@router.post("/groups/import/gruplac/preview", tags=["Ingestion"])
async def preview_gruplac_endpoint(req: GruplacImportRequest):
    """
    Phase 1 of GrupLAC import: download and parse the public page, returning the
    extracted DTO for human review WITHOUT persisting anything (Revisión §16/§29).
    """
    from ..scraper import scrape_gruplac
    try:
        return scrape_gruplac(req.url, preview=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/groups/import/gruplac", tags=["Ingestion"])
async def import_gruplac_endpoint(req: GruplacImportRequest):
    """
    Phase 2 of GrupLAC import (confirm): import a research group and its full
    catalog atomically from Minciencias GrupLAC URL after reviewing the preview.
    """
    from ..scraper import scrape_gruplac
    conn_str = repository._active_connection_string or "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"
    try:
        result = scrape_gruplac(req.url, conn_str)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result
