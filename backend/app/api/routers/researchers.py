from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from ... import repository
from ...models import Group, Researcher, Product, PagedResponse
from ..common import _normalize_text

router = APIRouter()


@router.get("/researchers", response_model=PagedResponse[Researcher], tags=["Researchers"])
async def list_researchers_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=10000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    educational_level: Optional[str] = None,
    category: Optional[str] = None,
    group_id: Optional[int] = None,
):
    """Return researchers with server-side pagination, search, filtering and total count."""
    all_res = repository.list_researchers()
    if group_id is not None:
        try:
            m_ids = set(repository.members_of_group(group_id))
            all_res = [r for r in all_res if r.id in m_ids]
        except Exception:
            pass
    if status and status != 'all':
        all_res = [r for r in all_res if r.status == status]
    if educational_level and educational_level != 'all':
        lvl_norm = _normalize_text(educational_level)
        all_res = [r for r in all_res if _normalize_text(r.highest_education_level or '') == lvl_norm]
    if category and category != 'all':
        c_norm = _normalize_text(category)
        if c_norm in ('none', 'unclassified', 'sin categoria', 'sin categorizar', 'sin clasificar'):
            all_res = [r for r in all_res if not (r.classification_records or '').strip()]
        elif 'junior' in c_norm:
            all_res = [r for r in all_res if 'junior' in (r.classification_records or '').lower()]
        elif 'asociado' in c_norm:
            all_res = [r for r in all_res if 'asociado' in (r.classification_records or '').lower()]
        elif 'senior' in c_norm:
            all_res = [r for r in all_res if 'senior' in (r.classification_records or '').lower()]
        elif 'emerito' in c_norm:
            all_res = [r for r in all_res if 'emerito' in _normalize_text(r.classification_records or '')]
        else:
            all_res = [r for r in all_res if c_norm in _normalize_text(r.classification_records or '')]
    if search:
        s = search.lower()
        all_res = [r for r in all_res if s in r.first_names.lower() or s in r.last_names.lower() or s in r.external_code.lower() or s in (r.orcid or "").lower()]
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


@router.get("/researchers/{res_id}/stats", tags=["Researchers"])
async def get_researcher_stats_endpoint(res_id: int):
    """Retrieve statistical indicators, production dynamics, and group contributions for a researcher."""
    try:
        return repository.get_researcher_stats(res_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Investigador no encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
