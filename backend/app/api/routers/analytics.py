from typing import List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter()


class CompareGroupsRequest(BaseModel):
    group_ids: Optional[List[int]] = None


@router.get("/analytics/compare-groups", tags=["Analytics"])
async def compare_groups_get_endpoint(
    group_ids: Optional[str] = Query(None, description="IDs de grupos separados por comas, ej. 10,35")
):
    """Diagnóstico y benchmarking comparativo inter-grupal multidimensional (Fase 5)."""
    parsed_ids: Optional[List[int]] = None
    if group_ids:
        try:
            parsed_ids = [int(x.strip()) for x in group_ids.split(",") if x.strip().lstrip("-").isdigit()]
        except Exception:
            parsed_ids = None
    from ... import analytics_comparator
    return analytics_comparator.compare_groups_analytics(parsed_ids)


@router.post("/analytics/compare-groups", tags=["Analytics"])
async def compare_groups_post_endpoint(req: CompareGroupsRequest = CompareGroupsRequest()):
    """Diagnóstico y benchmarking comparativo inter-grupal multidimensional con cuerpo JSON (Fase 5)."""
    from ... import analytics_comparator
    return analytics_comparator.compare_groups_analytics(req.group_ids)
