import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ... import repository
from ...models import Product, PagedResponse

router = APIRouter()


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
    subtype_id: Optional[int] = None,
    group_id: Optional[int] = None,
    start_year: Optional[int] = Query(None, description="Año inicial para Ventana de Observación (Requerimiento 10)"),
    end_year: Optional[int] = Query(None, description="Año final para Ventana de Observación (Requerimiento 10)"),
    window_years: Optional[int] = Query(None, description="Ventana de observación en años hacia atrás (ej. 2 o 5 años)"),
    unclassified: Optional[bool] = Query(None, description="Solo productos sin tipología 2024 (para reclasificar)")
):
    """
    List products with complete filtering, dynamic Observation Window (Requerimiento 10)
    and server-side pagination with total count.
    """
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
        subtype_id=subtype_id,
        validation_status=validation_status,
        status=status,
        group_id=group_id,
        search=search,
        unclassified=unclassified,
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
