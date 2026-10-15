from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from ... import repository
from ...models import Group, Project, PagedResponse

router = APIRouter()


@router.get("/projects", response_model=PagedResponse[Project], tags=["Projects"])
async def list_projects_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    search: Optional[str] = None,
    status: Optional[str] = None,
    project_type: Optional[str] = None,
):
    """List all projects with server-side pagination, search, status and project_type filter."""
    items, total = repository.list_projects(
        skip=skip, limit=limit, search=search, status=status, project_type=project_type
    )
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


@router.get("/projects/{project_id}/groups", response_model=List[Group], tags=["Projects"])
async def list_project_groups_endpoint(project_id: int):
    """Grupos de investigación vinculados a un proyecto."""
    try:
        return repository.get_project_groups(project_id)
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
