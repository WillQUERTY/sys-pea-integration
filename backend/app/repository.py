import sys
import os

# Ensure the native extension can be found
sys.path.append(os.path.dirname(__file__))
import abpoxx_pybind

from typing import List
from .models import Group, Researcher, Product

# Expose InitMode
InitMode = abpoxx_pybind.InitMode

_active_connection_string = ""

def initialize(mode: InitMode, source: str = "") -> bool:
    global _active_connection_string
    if mode == InitMode.Database:
        _active_connection_string = source
    return abpoxx_pybind.initialize(mode, source)

def list_groups() -> List[Group]:
    core_groups = abpoxx_pybind.list_groups()
    return [
        Group(
            id=g.id,
            external_code=g.external_code,
            name=g.name,
            acronym=g.acronym,
            description=g.description
        ) for g in core_groups
    ]

def get_group(group_id: int) -> Group:
    g = abpoxx_pybind.get_group(group_id)
    if g is None:
        raise KeyError(f"Group {group_id} not found")
    return Group(
        id=g.id,
        external_code=g.external_code,
        name=g.name,
        acronym=g.acronym,
        description=g.description
    )

def create_group(group: Group) -> Group:
    proto = abpoxx_pybind.Group()
    proto.external_code = group.external_code
    proto.name = group.name
    proto.acronym = group.acronym or ""
    proto.description = group.description or ""
    
    created = abpoxx_pybind.create_group(proto)
    if _active_connection_string:
        abpoxx_pybind.sync_group_to_db(_active_connection_string, created.id)

    return Group(
        id=created.id,
        external_code=created.external_code,
        name=created.name,
        acronym=created.acronym,
        description=created.description
    )

# -------------------------------------------------------------------
# Researcher CRUD
# -------------------------------------------------------------------

def list_researchers() -> List[Researcher]:
    core_items = abpoxx_pybind.list_researchers()
    return [
        Researcher(
            id=r.id,
            external_code=r.external_code,
            identification_type=r.identification_type,
            identification_number=r.identification_number,
            first_names=r.first_names,
            last_names=r.last_names,
            nationality=r.nationality,
            country_of_residence=r.country_of_residence,
            institutional_email=r.institutional_email,
            orcid=r.orcid,
            highest_education_level=r.highest_education_level,
            status=r.status
        ) for r in core_items
    ]

def get_researcher(res_id: int) -> Researcher:
    r = abpoxx_pybind.get_researcher(res_id)
    if r is None:
        raise KeyError(f"Researcher {res_id} not found")
    return Researcher(
        id=r.id,
        external_code=r.external_code,
        identification_type=r.identification_type,
        identification_number=r.identification_number,
        first_names=r.first_names,
        last_names=r.last_names,
        nationality=r.nationality,
        country_of_residence=r.country_of_residence,
        institutional_email=r.institutional_email,
        orcid=r.orcid,
        highest_education_level=r.highest_education_level,
        status=r.status
    )

def create_researcher(res: Researcher) -> Researcher:
    proto = abpoxx_pybind.Researcher()
    proto.external_code = res.external_code
    proto.identification_type = res.identification_type or ""
    proto.identification_number = res.identification_number or ""
    proto.first_names = res.first_names
    proto.last_names = res.last_names
    proto.nationality = res.nationality or ""
    proto.country_of_residence = res.country_of_residence or ""
    proto.institutional_email = res.institutional_email or ""
    proto.orcid = res.orcid or ""
    proto.highest_education_level = res.highest_education_level or ""
    proto.status = res.status or "active"
    
    created = abpoxx_pybind.create_researcher(proto)
    if _active_connection_string:
        abpoxx_pybind.sync_researcher_to_db(_active_connection_string, created.id)

    return get_researcher(created.id)

# -------------------------------------------------------------------
# Product CRUD
# -------------------------------------------------------------------

def list_products() -> List[Product]:
    core_items = abpoxx_pybind.list_products()
    return [
        Product(
            id=p.id,
            external_code=p.external_code,
            title=p.title,
            description=p.description,
            family_id=p.family_id,
            subtype_id=p.subtype_id,
            quality_category_id=p.quality_category_id,
            obtained_date=p.obtained_date,
            publication_date=p.publication_date,
            validation_status=p.validation_status,
            status=p.status
        ) for p in core_items
    ]

def get_product(prod_id: int) -> Product:
    p = abpoxx_pybind.get_product(prod_id)
    if p is None:
        raise KeyError(f"Product {prod_id} not found")
    return Product(
        id=p.id,
        external_code=p.external_code,
        title=p.title,
        description=p.description,
        family_id=p.family_id,
        subtype_id=p.subtype_id,
        quality_category_id=p.quality_category_id,
        obtained_date=p.obtained_date,
        publication_date=p.publication_date,
        validation_status=p.validation_status,
        status=p.status
    )

def create_product(prod: Product) -> Product:
    proto = abpoxx_pybind.Product()
    proto.external_code = prod.external_code
    proto.title = prod.title
    proto.description = prod.description or ""
    proto.family_id = prod.family_id or 0
    proto.subtype_id = prod.subtype_id or 0
    proto.quality_category_id = prod.quality_category_id or 0
    proto.obtained_date = prod.obtained_date or ""
    proto.publication_date = prod.publication_date or ""
    proto.validation_status = prod.validation_status or "pending"
    proto.status = prod.status or "active"
    
    created = abpoxx_pybind.create_product(proto)
    if _active_connection_string:
        abpoxx_pybind.sync_product_to_db(_active_connection_string, created.id)

    return get_product(created.id)

def save_to_db(connection_string: str) -> bool:
    return abpoxx_pybind.save_to_db(connection_string)

def load_from_db(connection_string: str) -> bool:
    return abpoxx_pybind.load_from_db(connection_string)

def load_from_file(path: str) -> bool:
    return abpoxx_pybind.load_from_file(path)

def export_to_file(path: str) -> bool:
    return abpoxx_pybind.export_to_file(path)

def print_summary():
    abpoxx_pybind.print_summary()
