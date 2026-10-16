from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from ... import repository
from ...models import WorkPlan

router = APIRouter()


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
