from typing import List, Optional
from ..models import Product


def _product_year(p: Product) -> int:
    """Año efectivo del producto (Req. 10): `year` o los 4 primeros dígitos de `obtained_date`."""
    if p.year:
        return p.year
    try:
        return int(str(p.obtained_date or "")[:4])
    except ValueError:
        return 0


def filter_products(
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    family_id: Optional[int] = None,
    subtype_id: Optional[int] = None,
    validation_status: Optional[str] = None,
    status: Optional[str] = None,
    group_id: Optional[int] = None,
    search: Optional[str] = None,
    unclassified: Optional[bool] = None,
) -> List[Product]:
    """Filtra productos en RAM según los criterios dados. La paginación la aplica el endpoint."""
    from .. import repository
    products = repository.list_products()
    if group_id is not None:
        pids = set(repository.products_of_group(group_id))
        products = [p for p in products if p.id in pids]
    if start_year is not None:
        products = [p for p in products if _product_year(p) >= start_year]
    if end_year is not None:
        products = [p for p in products if _product_year(p) > 0 and _product_year(p) <= end_year]
    if family_id is not None:
        products = [p for p in products if p.family_id == family_id]
    if subtype_id is not None:
        products = [p for p in products if p.subtype_id == subtype_id]
    if unclassified:
        products = [p for p in products if not p.subtype_id]
    if validation_status is not None and validation_status != 'all':
        products = [p for p in products if p.validation_status == validation_status]
    if status is not None and status != 'all':
        products = [p for p in products if p.status == status]
    if search:
        s = search.lower()
        products = [p for p in products if (p.title and s in p.title.lower()) or (p.external_code and s in p.external_code.lower()) or (p.doi and s in p.doi.lower())]
    return products
