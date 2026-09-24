from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from .. import repository
from ..models import Group, Researcher, Product

router = APIRouter()

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
# Group CRUD endpoints (example flow)
# -------------------------------------------------------------------

@router.get("/groups", response_model=List[Group], tags=["Groups"])
async def list_groups_endpoint(skip: int = 0, limit: int = 100, search: Optional[str] = None):
    """Return all groups stored in the RAM repository with basic pagination."""
    all_groups = repository.list_groups()
    if search:
        s = search.lower()
        all_groups = [g for g in all_groups if (s in g.name.lower()) or (g.acronym and s in g.acronym.lower())]
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
    """Create a new group. The `id` is assigned automatically."""
    # The incoming payload may include an id; we ignore it to enforce auto‑increment.
    clean_data = group.model_dump(exclude={"id"}, exclude_unset=True)
    new_group = repository.create_group(Group(**clean_data))
    return new_group

# -------------------------------------------------------------------
# Researcher CRUD endpoints
# -------------------------------------------------------------------

@router.get("/researchers", response_model=List[Researcher], tags=["Researchers"])
async def list_researchers_endpoint(skip: int = 0, limit: int = 100, search: Optional[str] = None, status: Optional[str] = None):
    """Return researchers with pagination and filtering."""
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
    """Create a new researcher. The `id` is assigned automatically."""
    clean_data = res.model_dump(exclude={"id"}, exclude_unset=True)
    new_res = repository.create_researcher(Researcher(**clean_data))
    return new_res

# -------------------------------------------------------------------
# Product CRUD endpoints
# -------------------------------------------------------------------

@router.get("/products", response_model=List[Product], tags=["Products"])
async def list_products_endpoint(skip: int = 0, limit: int = 100, search: Optional[str] = None, validation_status: Optional[str] = None):
    """Return products with pagination and filtering."""
    all_prod = repository.list_products()
    if validation_status:
        all_prod = [p for p in all_prod if p.validation_status == validation_status]
    if search:
        s = search.lower()
        all_prod = [p for p in all_prod if s in p.title.lower() or s in p.external_code.lower()]
    return all_prod[skip : skip + limit]

@router.get("/products/{prod_id}", response_model=Product, tags=["Products"])
async def get_product_endpoint(prod_id: int):
    """Retrieve a single product by its identifier."""
    try:
        return repository.get_product(prod_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Product not found")

@router.post("/products", response_model=Product, status_code=201, tags=["Products"])
async def create_product_endpoint(prod: Product):
    """Create a new product. The `id` is assigned automatically."""
    clean_data = prod.model_dump(exclude={"id"}, exclude_unset=True)
    new_prod = repository.create_product(Product(**clean_data))
    return new_prod
