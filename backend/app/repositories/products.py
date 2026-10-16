import json
import logging
from typing import List, Optional

import abpoxx_pybind

from ..models import Product
from .helpers import clean_doi, safe_get_str, sanitize_str
from .undo import undo_push
from . import context

logger = logging.getLogger("peai.repository.products")

def list_products() -> List[Product]:
    core_items = abpoxx_pybind.list_products()
    products_list = []
    for p in core_items:
        try:
            obt_date = safe_get_str(p, 'obtained_date')
            pub_date = safe_get_str(p, 'publication_date')
            y = p.year or (int(obt_date[:4]) if obt_date and obt_date[:4].isdigit() else (int(pub_date[:4]) if pub_date and pub_date[:4].isdigit() else 0))
            
            products_list.append(Product(
                id=p.id,
                external_code=safe_get_str(p, 'external_code'),
                title=safe_get_str(p, 'title'),
                description=safe_get_str(p, 'description'),
                family_id=p.family_id,
                subtype_id=p.subtype_id,
                quality_category_id=p.quality_category_id,
                obtained_date=obt_date,
                publication_date=pub_date,
                validation_status=safe_get_str(p, 'validation_status'),
                language=safe_get_str(p, 'language'),
                country=safe_get_str(p, 'country'),
                doi=safe_get_str(p, 'doi') or None,
                isbn=safe_get_str(p, 'isbn'),
                issn=safe_get_str(p, 'issn'),
                url=safe_get_str(p, 'url'),
                evidence=safe_get_str(p, 'evidence'),
                specialized_attributes=safe_get_str(p, 'specialized_attributes'),
                status=safe_get_str(p, 'status'),
                year=y
            ))
        except Exception as e:
            logger.error(f"Error parseando producto: {e}")
            continue
    return products_list

def get_product(prod_id: int) -> Product:
    p = abpoxx_pybind.get_product(prod_id)
    if p is None:
        raise KeyError(f"Product {prod_id} not found")
    obt_date = safe_get_str(p, 'obtained_date')
    pub_date = safe_get_str(p, 'publication_date')
    y = p.year or (int(obt_date[:4]) if obt_date and obt_date[:4].isdigit() else (int(pub_date[:4]) if pub_date and pub_date[:4].isdigit() else 0))

    return Product(
        id=p.id,
        external_code=safe_get_str(p, 'external_code'),
        title=safe_get_str(p, 'title'),
        description=safe_get_str(p, 'description'),
        family_id=p.family_id,
        subtype_id=p.subtype_id,
        quality_category_id=p.quality_category_id,
        obtained_date=obt_date,
        publication_date=pub_date,
        validation_status=safe_get_str(p, 'validation_status'),
        language=safe_get_str(p, 'language'),
        country=safe_get_str(p, 'country'),
        doi=safe_get_str(p, 'doi') or None,
        isbn=safe_get_str(p, 'isbn'),
        issn=safe_get_str(p, 'issn'),
        url=safe_get_str(p, 'url'),
        evidence=safe_get_str(p, 'evidence'),
        specialized_attributes=safe_get_str(p, 'specialized_attributes'),
        status=safe_get_str(p, 'status'),
        year=y
    )

def create_product(prod: Product, skip_undo: bool = False) -> Product:
    proto = abpoxx_pybind.Product()
    proto.external_code = sanitize_str(prod.external_code)
    proto.title = sanitize_str(prod.title)
    proto.description = sanitize_str(prod.description)
    proto.family_id = prod.family_id or 0
    proto.subtype_id = prod.subtype_id or 0
    proto.quality_category_id = prod.quality_category_id or 0
    proto.obtained_date = sanitize_str(prod.obtained_date)
    proto.publication_date = sanitize_str(prod.publication_date)
    proto.validation_status = sanitize_str(prod.validation_status or "pending")
    proto.language = sanitize_str(prod.language)
    proto.country = sanitize_str(prod.country)
    proto.doi = clean_doi(prod.doi)
    proto.isbn = sanitize_str(prod.isbn)
    proto.issn = sanitize_str(prod.issn)
    proto.url = sanitize_str(prod.url)
    proto.evidence = sanitize_str(prod.evidence)
    proto.specialized_attributes = sanitize_str(prod.specialized_attributes)
    proto.status = sanitize_str(prod.status or "active")
    proto.year = prod.year or (int(proto.obtained_date[:4]) if proto.obtained_date and proto.obtained_date[:4].isdigit() else (int(proto.publication_date[:4]) if proto.publication_date and proto.publication_date[:4].isdigit() else 0))
    
    created = abpoxx_pybind.create_product(proto)
    if context._active_connection_string:
        abpoxx_pybind.sync_product_to_db(context._active_connection_string, created.id)

    if not skip_undo:
        undo_push("CREATE", "Product", created.id)

    return get_product(created.id)

def update_product(prod_id: int, updates: Product, skip_undo: bool = False) -> Product:
    prev = get_product(prod_id)
    if not skip_undo:
        undo_push("UPDATE", "Product", prod_id, prev.model_dump_json())

    proto = abpoxx_pybind.Product()
    proto.external_code = sanitize_str(updates.external_code or prev.external_code)
    proto.title = sanitize_str(updates.title or prev.title)
    proto.description = sanitize_str(updates.description if updates.description is not None else prev.description)
    proto.family_id = updates.family_id if updates.family_id is not None else prev.family_id
    proto.subtype_id = updates.subtype_id if updates.subtype_id is not None else prev.subtype_id
    proto.quality_category_id = updates.quality_category_id if updates.quality_category_id is not None else prev.quality_category_id
    proto.obtained_date = sanitize_str(updates.obtained_date if updates.obtained_date is not None else prev.obtained_date)
    proto.publication_date = sanitize_str(updates.publication_date if updates.publication_date is not None else prev.publication_date)
    proto.validation_status = sanitize_str(updates.validation_status or prev.validation_status)
    proto.language = sanitize_str(updates.language if updates.language is not None else prev.language)
    proto.country = sanitize_str(updates.country if updates.country is not None else prev.country)
    proto.doi = clean_doi(updates.doi if updates.doi is not None else prev.doi)
    proto.isbn = sanitize_str(updates.isbn if updates.isbn is not None else prev.isbn)
    proto.issn = sanitize_str(updates.issn if updates.issn is not None else prev.issn)
    proto.url = sanitize_str(updates.url if updates.url is not None else prev.url)
    proto.evidence = sanitize_str(updates.evidence if updates.evidence is not None else prev.evidence)
    proto.specialized_attributes = sanitize_str(updates.specialized_attributes if updates.specialized_attributes is not None else prev.specialized_attributes)
    proto.status = sanitize_str(updates.status or prev.status)
    proto.year = updates.year if updates.year is not None else (prev.year or (int(proto.obtained_date[:4]) if proto.obtained_date and proto.obtained_date[:4].isdigit() else 0))

    abpoxx_pybind.update_product(prod_id, proto)

    if context._active_connection_string:
        if not abpoxx_pybind.sync_product_to_db(context._active_connection_string, prod_id):
            raise RuntimeError(f"Error sincronizando producto {prod_id} a BD")

    return get_product(prod_id)

def delete_product(prod_id: int, soft: bool = True, skip_undo: bool = False) -> bool:
    prev = get_product(prod_id)
    if not skip_undo:
        undo_push("DELETE", "Product", prod_id, prev.model_dump_json())

    if soft:
        proto = abpoxx_pybind.Product()
        proto.external_code = sanitize_str(prev.external_code)
        proto.title = sanitize_str(prev.title)
        proto.description = sanitize_str(prev.description)
        proto.family_id = prev.family_id or 0
        proto.subtype_id = prev.subtype_id or 0
        proto.quality_category_id = prev.quality_category_id or 0
        proto.obtained_date = sanitize_str(prev.obtained_date)
        proto.publication_date = sanitize_str(prev.publication_date)
        proto.validation_status = sanitize_str(prev.validation_status)
        proto.language = sanitize_str(prev.language)
        proto.country = sanitize_str(prev.country)
        proto.doi = clean_doi(prev.doi)
        proto.isbn = sanitize_str(prev.isbn)
        proto.issn = sanitize_str(prev.issn)
        proto.url = sanitize_str(prev.url)
        proto.evidence = sanitize_str(prev.evidence)
        proto.specialized_attributes = sanitize_str(prev.specialized_attributes)
        proto.year = prev.year or 0
        proto.status = "inactive"
        abpoxx_pybind.update_product(prod_id, proto)
        if context._active_connection_string:
            if not abpoxx_pybind.delete_product_from_db(context._active_connection_string, prod_id, False):
                raise RuntimeError(f"Error en soft-delete del producto {prod_id}")
    else:
        abpoxx_pybind.delete_product(prod_id)
        if context._active_connection_string:
            if not abpoxx_pybind.delete_product_from_db(context._active_connection_string, prod_id, True):
                raise RuntimeError(f"Error en hard-delete del producto {prod_id}")
    return True

def restore_product(prod_id: int) -> bool:
    """Reactiva un producto inactivo (inverso del soft-delete)."""
    prev = get_product(prod_id)
    undo_push("RESTORE", "Product", prod_id, prev.model_dump_json())
    proto = abpoxx_pybind.Product()
    proto.external_code = sanitize_str(prev.external_code)
    proto.title = sanitize_str(prev.title)
    proto.description = sanitize_str(prev.description)
    proto.family_id = prev.family_id or 0
    proto.subtype_id = prev.subtype_id or 0
    proto.quality_category_id = prev.quality_category_id or 0
    proto.obtained_date = sanitize_str(prev.obtained_date)
    proto.publication_date = sanitize_str(prev.publication_date)
    proto.validation_status = sanitize_str(prev.validation_status)
    proto.language = sanitize_str(prev.language)
    proto.country = sanitize_str(prev.country)
    proto.doi = clean_doi(prev.doi)
    proto.isbn = sanitize_str(prev.isbn)
    proto.issn = sanitize_str(prev.issn)
    proto.url = sanitize_str(prev.url)
    proto.evidence = sanitize_str(prev.evidence)
    proto.specialized_attributes = sanitize_str(prev.specialized_attributes)
    proto.year = prev.year or 0
    proto.status = "active"
    abpoxx_pybind.update_product(prod_id, proto)
    if context._active_connection_string:
        abpoxx_pybind.sync_product_to_db(context._active_connection_string, prod_id)
    return True

def set_product_validation(
    prod_id: int,
    validation_status: str,
    quality_category_id: Optional[int] = None,
    reason: str = "Validacion tecnica manual",
    skip_undo: bool = False
) -> Product:
    reason = sanitize_str(reason)
    if validation_status not in ("valid", "rejected", "pending"):
        raise ValueError(f"Estado de validacion invalido: {validation_status}")

    prev = get_product(prod_id)
    if not skip_undo:
        undo_push("VALIDATE", "Product", prod_id, prev.model_dump_json())

    proto = abpoxx_pybind.Product()
    proto.external_code = sanitize_str(prev.external_code)
    proto.title = sanitize_str(prev.title)
    proto.description = sanitize_str(prev.description)
    proto.family_id = prev.family_id or 0
    proto.subtype_id = prev.subtype_id or 0
    proto.quality_category_id = quality_category_id if quality_category_id is not None else (prev.quality_category_id or 0)
    proto.obtained_date = sanitize_str(prev.obtained_date)
    proto.publication_date = sanitize_str(prev.publication_date)
    proto.validation_status = validation_status
    proto.language = sanitize_str(prev.language)
    proto.country = sanitize_str(prev.country)
    proto.doi = clean_doi(prev.doi)
    proto.isbn = sanitize_str(prev.isbn)
    proto.issn = sanitize_str(prev.issn)
    proto.url = sanitize_str(prev.url)
    proto.evidence = sanitize_str(prev.evidence)
    proto.specialized_attributes = sanitize_str(prev.specialized_attributes)
    proto.year = prev.year or 0
    proto.status = sanitize_str(prev.status)
    abpoxx_pybind.update_product(prod_id, proto)

    abpoxx_pybind.vq_resolve_for_product(prod_id, validation_status)

    if context._active_connection_string:
        if not abpoxx_pybind.set_product_validation_db(
            context._active_connection_string, prod_id, validation_status,
            quality_category_id or 0, reason
        ):
            raise RuntimeError(f"Error aplicando validacion del producto {prod_id} en BD")

    return get_product(prod_id)

def add_product_author(
    product_id: int,
    researcher_id: int = 0,
    author_order: int = 1,
    external_author_name: str = "",
    external_author_identifier: str = "",
    match_status: str = "unverified"
):
    if researcher_id and researcher_id > 0:
        if context._active_connection_string:
            abpoxx_pybind.sync_product_author_to_db(context._active_connection_string, product_id, researcher_id, author_order)
    elif external_author_name and context._active_connection_string:
        if not abpoxx_pybind.insert_external_product_author_db(
            context._active_connection_string, product_id, author_order,
            external_author_name, external_author_identifier, match_status
        ):
            logger.warning("Error registrando autor externo en BD")

def get_product_authors(product_id: int) -> list:
    """Autores de un producto (internos + externos), leidos de SQL Server."""
    if not context._active_connection_string:
        return []
    rows = json.loads(abpoxx_pybind.authors_of_product_json(context._active_connection_string, product_id))
    by_code = {r.external_code: r.id for r in abpoxx_pybind.list_researchers()}
    for row in rows:
        code = row.get("researcher_external_code") or ""
        row["researcher_id"] = by_code.get(code)
    return rows

def remove_product_author(product_id: int, researcher_id: int = 0, external_author_name: str = ""):
    if not context._active_connection_string:
        raise RuntimeError("No hay conexion activa a la base de datos")
    ok = abpoxx_pybind.remove_product_author_db(
        context._active_connection_string, product_id, researcher_id, external_author_name
    )
    if not ok:
        raise RuntimeError("No se pudo eliminar el autor en la base de datos")
