from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List
from .. import repository
from ..models import Group

router = APIRouter()

class InitDatabaseRequest(BaseModel):
    connection_string: str
    replace_existing: bool = False

class InitFileRequest(BaseModel):
    path: str
    replace_existing: bool = False

class InitEmptyRequest(BaseModel):
    confirm: bool = True

@router.post("/system/initialize/database")
async def initialize_database(req: InitDatabaseRequest):
    # Placeholder implementation – in real code would connect to SQL Server and run migrations.
    if not req.connection_string:
        raise HTTPException(status_code=400, detail="Connection string required")
    return {"status": "success", "method": "database", "connection": req.connection_string}

@router.post("/system/initialize/file")
async def initialize_file(req: InitFileRequest):
    # Placeholder – would load JSON persistence file.
    return {"status": "success", "method": "file", "path": req.path}

@router.post("/system/initialize/empty")
async def initialize_empty(_: InitEmptyRequest):
    # Placeholder – would create empty in‑memory structures.
    return {"status": "success", "method": "empty"}

@router.get("/system/export")
async def export_data():
    # Placeholder – would serialize current state to JSON.
    return {"status": "success", "export": "pea_data.json"}

# -------------------------------------------------------------------
# Group CRUD endpoints (example flow)
# -------------------------------------------------------------------

@router.get("/groups", response_model=List[Group])
async def list_groups_endpoint():
    """Return all groups stored in the JSON repository."""
    return repository.list_groups()

@router.get("/groups/{group_id}", response_model=Group)
async def get_group_endpoint(group_id: int):
    """Retrieve a single group by its identifier."""
    try:
        return repository.get_group(group_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")

@router.post("/groups", response_model=Group, status_code=201)
async def create_group_endpoint(group: Group):
    """Create a new group. The `id` is assigned automatically."""
    # The incoming payload may include an id; we ignore it to enforce auto‑increment.
    clean_data = group.dict(exclude={"id"}, exclude_unset=True)
    new_group = repository.create_group(Group(**clean_data))
    return new_group
