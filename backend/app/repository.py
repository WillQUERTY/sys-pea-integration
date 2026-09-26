import sys
import os
import json
import logging
import unicodedata
# NOTA ARQUITECTONICA: este modulo NO usa pyodbc. Toda la persistencia SQL
# vive en el nucleo C++ (abpoxx_pybind, db_persistence.cpp). La unica
# excepcion documentada es la ingesta masiva del scraper.

# Ensure the native extension can be found
sys.path.append(os.path.dirname(__file__))
import abpoxx_pybind

from typing import List, Optional, Dict, Any
from .models import Group, Researcher, Product, Project

logger = logging.getLogger("peai.repository")

def sanitize_str(text: Any) -> str:
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    # The C++ core now safely handles UTF-8 natively via CP1252 transcoding.
    # Return the clean text while preserving all international characters (ñ, á, etc)
    return text.strip()


# Expose InitMode
InitMode = abpoxx_pybind.InitMode

_active_connection_string = ""

def initialize(mode: InitMode, source: str = "") -> bool:
    global _active_connection_string
    if mode == InitMode.Database:
        _active_connection_string = source
        # Reset RAM antes de recargar: load_from_db inserta sin limpiar y
        # duplicaria las estructuras si ya habia datos en memoria.
        abpoxx_pybind.initialize(InitMode.Empty, "")
    return abpoxx_pybind.initialize(mode, source)

def safe_get_str(obj, attr_name: str) -> Optional[str]:
    try:
        val = getattr(obj, attr_name)
        return val
    except UnicodeDecodeError:
        return "[Error de Codificación]"

def list_groups() -> List[Group]:
    core_groups = abpoxx_pybind.list_groups()
    groups_list = []
    for g in core_groups:
        try:
            groups_list.append(Group(
                id=g.id,
                external_code=safe_get_str(g, 'external_code'),
                name=safe_get_str(g, 'name'),
                acronym=safe_get_str(g, 'acronym'),
                institution=safe_get_str(g, 'institution'),
                classification=safe_get_str(g, 'classification'),
                description=safe_get_str(g, 'description'),
                mission=safe_get_str(g, 'mission'),
                vision=safe_get_str(g, 'vision'),
                declared_creation_date=safe_get_str(g, 'declared_creation_date'),
                knowledge_area=safe_get_str(g, 'knowledge_area'),
                knowledge_subarea=safe_get_str(g, 'knowledge_subarea'),
                city=safe_get_str(g, 'city'),
                department=safe_get_str(g, 'department'),
                website=safe_get_str(g, 'website'),
                email=safe_get_str(g, 'email'),
                leader_id=g.leader_id,
                status=safe_get_str(g, 'status')
            ))
        except Exception as e:
            logger.error(f"Error parseando grupo: {e}")
            continue
    return groups_list

def get_group(group_id: int) -> Group:
    g = abpoxx_pybind.get_group(group_id)
    if g is None:
        raise KeyError(f"Group {group_id} not found")
    return Group(
        id=g.id,
        external_code=safe_get_str(g, 'external_code'),
        name=safe_get_str(g, 'name'),
        acronym=safe_get_str(g, 'acronym'),
        institution=safe_get_str(g, 'institution'),
        classification=safe_get_str(g, 'classification'),
        description=safe_get_str(g, 'description'),
        mission=safe_get_str(g, 'mission'),
        vision=safe_get_str(g, 'vision'),
        declared_creation_date=safe_get_str(g, 'declared_creation_date'),
        knowledge_area=safe_get_str(g, 'knowledge_area'),
        knowledge_subarea=safe_get_str(g, 'knowledge_subarea'),
        city=safe_get_str(g, 'city'),
        department=safe_get_str(g, 'department'),
        website=safe_get_str(g, 'website'),
        email=safe_get_str(g, 'email'),
        leader_id=g.leader_id,
        status=safe_get_str(g, 'status')
    )

def create_group(group: Group) -> Group:
    proto = abpoxx_pybind.Group()
    proto.external_code = sanitize_str(group.external_code)
    proto.name = sanitize_str(group.name)
    proto.acronym = sanitize_str(group.acronym)
    proto.institution = sanitize_str(group.institution)
    proto.classification = sanitize_str(group.classification)
    proto.description = sanitize_str(group.description)
    proto.mission = sanitize_str(group.mission)
    proto.vision = sanitize_str(group.vision)
    proto.declared_creation_date = sanitize_str(group.declared_creation_date)
    proto.knowledge_area = sanitize_str(group.knowledge_area)
    proto.knowledge_subarea = sanitize_str(group.knowledge_subarea)
    proto.city = sanitize_str(group.city)
    proto.department = sanitize_str(group.department)
    proto.website = sanitize_str(group.website)
    proto.email = sanitize_str(group.email)
    proto.leader_id = group.leader_id or 0
    proto.status = sanitize_str(group.status or "active")
    
    created = abpoxx_pybind.create_group(proto)
    if _active_connection_string:
        abpoxx_pybind.sync_group_to_db(_active_connection_string, created.id)

    return get_group(created.id)

def update_group(group_id: int, updates: Group, skip_undo: bool = False) -> Group:
    prev = get_group(group_id)
    if not skip_undo:
        undo_push("UPDATE", "Group", group_id, prev.model_dump_json())

    proto = abpoxx_pybind.Group()
    proto.external_code = sanitize_str(updates.external_code or prev.external_code)
    proto.name = sanitize_str(updates.name or prev.name)
    proto.acronym = sanitize_str(updates.acronym if updates.acronym is not None else prev.acronym)
    proto.description = sanitize_str(updates.description if updates.description is not None else prev.description)
    proto.institution = sanitize_str(updates.institution if updates.institution is not None else prev.institution)
    proto.classification = sanitize_str(updates.classification if updates.classification is not None else prev.classification)
    proto.mission = sanitize_str(updates.mission if updates.mission is not None else prev.mission)
    proto.vision = sanitize_str(updates.vision if updates.vision is not None else prev.vision)
    proto.declared_creation_date = sanitize_str(updates.declared_creation_date if updates.declared_creation_date is not None else prev.declared_creation_date)
    proto.knowledge_area = sanitize_str(updates.knowledge_area if updates.knowledge_area is not None else prev.knowledge_area)
    proto.knowledge_subarea = sanitize_str(updates.knowledge_subarea if updates.knowledge_subarea is not None else prev.knowledge_subarea)
    proto.city = sanitize_str(updates.city if updates.city is not None else prev.city)
    proto.department = sanitize_str(updates.department if updates.department is not None else prev.department)
    proto.website = sanitize_str(updates.website if updates.website is not None else prev.website)
    proto.email = sanitize_str(updates.email if updates.email is not None else prev.email)
    proto.leader_id = updates.leader_id if updates.leader_id is not None else prev.leader_id
    proto.status = sanitize_str(updates.status or prev.status)

    abpoxx_pybind.update_group(group_id, proto)

    if _active_connection_string:
        # El nucleo hace MERGE por external_code (upsert completo del objeto en RAM)
        if not abpoxx_pybind.sync_group_to_db(_active_connection_string, group_id):
            raise RuntimeError(f"Error sincronizando grupo {group_id} a BD")

    return get_group(group_id)

def delete_group(group_id: int, soft: bool = True, skip_undo: bool = False) -> bool:
    prev = get_group(group_id)
    if not skip_undo:
        undo_push("DELETE", "Group", group_id, prev.model_dump_json())

    if soft:
        # update_group del nucleo ahora aplica TODOS los campos: construir el
        # proto completo desde el estado previo y solo cambiar status.
        proto = abpoxx_pybind.Group()
        proto.external_code = sanitize_str(prev.external_code)
        proto.name = sanitize_str(prev.name)
        proto.acronym = sanitize_str(prev.acronym)
        proto.institution = sanitize_str(prev.institution)
        proto.classification = sanitize_str(prev.classification)
        proto.description = sanitize_str(prev.description)
        proto.mission = sanitize_str(prev.mission)
        proto.vision = sanitize_str(prev.vision)
        proto.declared_creation_date = sanitize_str(prev.declared_creation_date)
        proto.knowledge_area = sanitize_str(prev.knowledge_area)
        proto.knowledge_subarea = sanitize_str(prev.knowledge_subarea)
        proto.city = sanitize_str(prev.city)
        proto.department = sanitize_str(prev.department)
        proto.website = sanitize_str(prev.website)
        proto.email = sanitize_str(prev.email)
        proto.leader_id = prev.leader_id or 0
        proto.status = "inactive"
        abpoxx_pybind.update_group(group_id, proto)
        if _active_connection_string:
            if not abpoxx_pybind.delete_group_from_db(_active_connection_string, group_id, False):
                raise RuntimeError(f"Error en soft-delete del grupo {group_id}")
    else:
        abpoxx_pybind.delete_group(group_id)
        if _active_connection_string:
            if not abpoxx_pybind.delete_group_from_db(_active_connection_string, group_id, True):
                raise RuntimeError(f"Error en hard-delete del grupo {group_id}")
    return True

# -------------------------------------------------------------------
# Researcher CRUD
# -------------------------------------------------------------------

def list_researchers() -> List[Researcher]:
    core_items = abpoxx_pybind.list_researchers()
    res_list = []
    for r in core_items:
        try:
            res_list.append(Researcher(
                id=r.id,
                external_code=safe_get_str(r, 'external_code'),
                identification_type=safe_get_str(r, 'identification_type'),
                identification_number=safe_get_str(r, 'identification_number'),
                first_names=safe_get_str(r, 'first_names'),
                last_names=safe_get_str(r, 'last_names'),
                nationality=safe_get_str(r, 'nationality'),
                country_of_residence=safe_get_str(r, 'country_of_residence'),
                institutional_email=safe_get_str(r, 'institutional_email'),
                orcid=safe_get_str(r, 'orcid'),
                highest_education_level=safe_get_str(r, 'highest_education_level'),
                education_records=safe_get_str(r, 'education_records'),
                classification_records=safe_get_str(r, 'classification_records'),
                status=safe_get_str(r, 'status')
            ))
        except Exception as e:
            logger.error(f"Error parseando investigador: {e}")
            continue
    return res_list

def get_researcher(res_id: int) -> Researcher:
    r = abpoxx_pybind.get_researcher(res_id)
    if r is None:
        raise KeyError(f"Researcher {res_id} not found")
    return Researcher(
        id=r.id,
        external_code=safe_get_str(r, 'external_code'),
        identification_type=safe_get_str(r, 'identification_type'),
        identification_number=safe_get_str(r, 'identification_number'),
        first_names=safe_get_str(r, 'first_names'),
        last_names=safe_get_str(r, 'last_names'),
        nationality=safe_get_str(r, 'nationality'),
        country_of_residence=safe_get_str(r, 'country_of_residence'),
        institutional_email=safe_get_str(r, 'institutional_email'),
        orcid=safe_get_str(r, 'orcid'),
        highest_education_level=safe_get_str(r, 'highest_education_level'),
        education_records=safe_get_str(r, 'education_records'),
        classification_records=safe_get_str(r, 'classification_records'),
        status=safe_get_str(r, 'status')
    )

def create_researcher(res: Researcher) -> Researcher:
    proto = abpoxx_pybind.Researcher()
    proto.external_code = sanitize_str(res.external_code)
    proto.identification_type = sanitize_str(res.identification_type)
    proto.identification_number = sanitize_str(res.identification_number)
    proto.first_names = sanitize_str(res.first_names)
    proto.last_names = sanitize_str(res.last_names)
    proto.nationality = sanitize_str(res.nationality)
    proto.country_of_residence = sanitize_str(res.country_of_residence)
    proto.institutional_email = sanitize_str(res.institutional_email)
    proto.orcid = sanitize_str(res.orcid)
    proto.highest_education_level = sanitize_str(res.highest_education_level)
    proto.education_records = sanitize_str(res.education_records)
    proto.classification_records = sanitize_str(res.classification_records)
    proto.status = sanitize_str(res.status or "active")
    
    created = abpoxx_pybind.create_researcher(proto)
    if _active_connection_string:
        abpoxx_pybind.sync_researcher_to_db(_active_connection_string, created.id)

    return get_researcher(created.id)

def update_researcher(res_id: int, updates: Researcher, skip_undo: bool = False) -> Researcher:
    prev = get_researcher(res_id)
    if not skip_undo:
        undo_push("UPDATE", "Researcher", res_id, prev.model_dump_json())

    proto = abpoxx_pybind.Researcher()
    proto.external_code = sanitize_str(updates.external_code or prev.external_code)
    proto.identification_type = sanitize_str(updates.identification_type if updates.identification_type is not None else prev.identification_type)
    proto.identification_number = sanitize_str(updates.identification_number if updates.identification_number is not None else prev.identification_number)
    proto.first_names = sanitize_str(updates.first_names or prev.first_names)
    proto.last_names = sanitize_str(updates.last_names or prev.last_names)
    proto.nationality = sanitize_str(updates.nationality if updates.nationality is not None else prev.nationality)
    proto.country_of_residence = sanitize_str(updates.country_of_residence if updates.country_of_residence is not None else prev.country_of_residence)
    proto.institutional_email = sanitize_str(updates.institutional_email if updates.institutional_email is not None else prev.institutional_email)
    proto.orcid = sanitize_str(updates.orcid if updates.orcid is not None else prev.orcid)
    proto.highest_education_level = sanitize_str(updates.highest_education_level if updates.highest_education_level is not None else prev.highest_education_level)
    proto.education_records = sanitize_str(updates.education_records if updates.education_records is not None else prev.education_records)
    proto.classification_records = sanitize_str(updates.classification_records if updates.classification_records is not None else prev.classification_records)
    proto.status = sanitize_str(updates.status or prev.status)

    abpoxx_pybind.update_researcher(res_id, proto)

    if _active_connection_string:
        if not abpoxx_pybind.sync_researcher_to_db(_active_connection_string, res_id):
            raise RuntimeError(f"Error sincronizando investigador {res_id} a BD")

    return get_researcher(res_id)

def delete_researcher(res_id: int, soft: bool = True, skip_undo: bool = False) -> bool:
    prev = get_researcher(res_id)
    if not skip_undo:
        undo_push("DELETE", "Researcher", res_id, prev.model_dump_json())

    if soft:
        # Proto completo desde el estado previo (update_researcher del nucleo
        # aplica todos los campos); solo cambia status.
        proto = abpoxx_pybind.Researcher()
        proto.external_code = sanitize_str(prev.external_code)
        proto.identification_type = sanitize_str(prev.identification_type)
        proto.identification_number = sanitize_str(prev.identification_number)
        proto.first_names = sanitize_str(prev.first_names)
        proto.last_names = sanitize_str(prev.last_names)
        proto.nationality = sanitize_str(prev.nationality)
        proto.country_of_residence = sanitize_str(prev.country_of_residence)
        proto.institutional_email = sanitize_str(prev.institutional_email)
        proto.orcid = sanitize_str(prev.orcid)
        proto.highest_education_level = sanitize_str(prev.highest_education_level)
        proto.education_records = sanitize_str(prev.education_records)
        proto.classification_records = sanitize_str(prev.classification_records)
        proto.status = "inactive"
        abpoxx_pybind.update_researcher(res_id, proto)
        if _active_connection_string:
            if not abpoxx_pybind.delete_researcher_from_db(_active_connection_string, res_id, False):
                raise RuntimeError(f"Error en soft-delete del investigador {res_id}")
    else:
        abpoxx_pybind.delete_researcher(res_id)
        if _active_connection_string:
            if not abpoxx_pybind.delete_researcher_from_db(_active_connection_string, res_id, True):
                raise RuntimeError(f"Error en hard-delete del investigador {res_id}")
    return True

# -------------------------------------------------------------------
# Product CRUD
# -------------------------------------------------------------------

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
                doi=safe_get_str(p, 'doi'),
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
        doi=safe_get_str(p, 'doi'),
        isbn=safe_get_str(p, 'isbn'),
        issn=safe_get_str(p, 'issn'),
        url=safe_get_str(p, 'url'),
        evidence=safe_get_str(p, 'evidence'),
        specialized_attributes=safe_get_str(p, 'specialized_attributes'),
        status=safe_get_str(p, 'status'),
        year=y
    )

def create_product(prod: Product) -> Product:
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
    proto.doi = sanitize_str(prod.doi)
    proto.isbn = sanitize_str(prod.isbn)
    proto.issn = sanitize_str(prod.issn)
    proto.url = sanitize_str(prod.url)
    proto.evidence = sanitize_str(prod.evidence)
    proto.specialized_attributes = sanitize_str(prod.specialized_attributes)
    proto.status = sanitize_str(prod.status or "active")
    proto.year = prod.year or (int(proto.obtained_date[:4]) if proto.obtained_date and proto.obtained_date[:4].isdigit() else (int(proto.publication_date[:4]) if proto.publication_date and proto.publication_date[:4].isdigit() else 0))
    
    created = abpoxx_pybind.create_product(proto)
    if _active_connection_string:
        abpoxx_pybind.sync_product_to_db(_active_connection_string, created.id)

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
    proto.doi = sanitize_str(updates.doi if updates.doi is not None else prev.doi)
    proto.isbn = sanitize_str(updates.isbn if updates.isbn is not None else prev.isbn)
    proto.issn = sanitize_str(updates.issn if updates.issn is not None else prev.issn)
    proto.url = sanitize_str(updates.url if updates.url is not None else prev.url)
    proto.evidence = sanitize_str(updates.evidence if updates.evidence is not None else prev.evidence)
    proto.specialized_attributes = sanitize_str(updates.specialized_attributes if updates.specialized_attributes is not None else prev.specialized_attributes)
    proto.status = sanitize_str(updates.status or prev.status)
    proto.year = updates.year if updates.year is not None else (prev.year or (int(proto.obtained_date[:4]) if proto.obtained_date and proto.obtained_date[:4].isdigit() else 0))

    abpoxx_pybind.update_product(prod_id, proto)

    if _active_connection_string:
        if not abpoxx_pybind.sync_product_to_db(_active_connection_string, prod_id):
            raise RuntimeError(f"Error sincronizando producto {prod_id} a BD")

    return get_product(prod_id)

def delete_product(prod_id: int, soft: bool = True, skip_undo: bool = False) -> bool:
    prev = get_product(prod_id)
    if not skip_undo:
        undo_push("DELETE", "Product", prod_id, prev.model_dump_json())

    if soft:
        # Proto completo desde el estado previo (update_product del nucleo
        # aplica todos los campos); solo cambia status.
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
        proto.doi = sanitize_str(prev.doi)
        proto.isbn = sanitize_str(prev.isbn)
        proto.issn = sanitize_str(prev.issn)
        proto.url = sanitize_str(prev.url)
        proto.evidence = sanitize_str(prev.evidence)
        proto.specialized_attributes = sanitize_str(prev.specialized_attributes)
        proto.year = prev.year or 0
        proto.status = "inactive"
        abpoxx_pybind.update_product(prod_id, proto)
        if _active_connection_string:
            if not abpoxx_pybind.delete_product_from_db(_active_connection_string, prod_id, False):
                raise RuntimeError(f"Error en soft-delete del producto {prod_id}")
    else:
        abpoxx_pybind.delete_product(prod_id)
        if _active_connection_string:
            if not abpoxx_pybind.delete_product_from_db(_active_connection_string, prod_id, True):
                raise RuntimeError(f"Error en hard-delete del producto {prod_id}")
    return True

def set_product_validation(
    prod_id: int,
    validation_status: str,
    quality_category_id: Optional[int] = None,
    reason: str = "Validacion tecnica manual"
) -> Product:
    reason = sanitize_str(reason)
    if validation_status not in ("valid", "rejected", "pending"):
        raise ValueError(f"Estado de validacion invalido: {validation_status}")

    prev = get_product(prod_id)
    undo_push("VALIDATE", "Product", prod_id, prev.model_dump_json())

    # Proto completo desde el estado previo (update_product del nucleo aplica
    # todos los campos); solo cambian validation_status y quality_category_id.
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
    proto.doi = sanitize_str(prev.doi)
    proto.isbn = sanitize_str(prev.isbn)
    proto.issn = sanitize_str(prev.issn)
    proto.url = sanitize_str(prev.url)
    proto.evidence = sanitize_str(prev.evidence)
    proto.specialized_attributes = sanitize_str(prev.specialized_attributes)
    proto.year = prev.year or 0
    proto.status = sanitize_str(prev.status)
    abpoxx_pybind.update_product(prod_id, proto)

    # Resolver los items pendientes de la cola RAM para este producto:
    # al validar directamente, el producto debe salir de la cola (Req. 9/13).
    abpoxx_pybind.vq_resolve_for_product(prod_id, validation_status)

    if _active_connection_string:
        # Operacion compuesta y atomica en el nucleo: Product +
        # GroupProductLink + ValidationQueueItem + AuditLog en una transaccion.
        if not abpoxx_pybind.set_product_validation_db(
            _active_connection_string, prod_id, validation_status,
            quality_category_id or 0, reason
        ):
            raise RuntimeError(f"Error aplicando validacion del producto {prod_id} en BD")

    return get_product(prod_id)

def get_product_catalogs() -> dict:
    """Catalogs (families/subtypes/quality categories) read from SQL Server."""
    if not _active_connection_string:
        return {"families": [], "subtypes": [], "quality_categories": []}
    return json.loads(abpoxx_pybind.get_product_catalogs_json(_active_connection_string))

# -------------------------------------------------------------------
# Multilista Link Operations (Write-Through)
# -------------------------------------------------------------------

def add_member_to_group(group_id: int, researcher_id: int, role: str = "Investigador", start_date: str = "", end_date: str = ""):
    abpoxx_pybind.add_member_to_group(group_id, researcher_id)
    if _active_connection_string:
        abpoxx_pybind.sync_membership_details_to_db(_active_connection_string, group_id, researcher_id, role, start_date, end_date)

def add_product_author(
    product_id: int,
    researcher_id: int = 0,
    author_order: int = 1,
    external_author_name: str = "",
    external_author_identifier: str = "",
    match_status: str = "unverified"
):
    if researcher_id and researcher_id > 0:
        if _active_connection_string:
            abpoxx_pybind.sync_product_author_to_db(_active_connection_string, product_id, researcher_id, author_order)
    elif external_author_name and _active_connection_string:
        if not abpoxx_pybind.insert_external_product_author_db(
            _active_connection_string, product_id, author_order,
            external_author_name, external_author_identifier, match_status
        ):
            logger.warning("Error registrando autor externo en BD")

def link_product_to_group(group_id: int, product_id: int):
    abpoxx_pybind.link_product_to_group(group_id, product_id)
    if _active_connection_string:
        abpoxx_pybind.sync_product_link_to_db(_active_connection_string, group_id, product_id)

def propose_product_group_link(
    group_id: int,
    product_id: int,
    status: str = "pending_validation",
    source: str = "gruplac_public",
    reason: str = "Propuesta automatica importada desde GrupLAC"
):
    if _active_connection_string:
        if not abpoxx_pybind.upsert_product_group_link_db(
            _active_connection_string, group_id, product_id, status, source, reason
        ):
            logger.warning("Error proponiendo enlace producto-grupo en BD")

def record_import_item(
    job_id: int,
    entity_type: str,
    external_identifier: str,
    action_taken: str,
    summary: str = "",
    details: str = ""
):
    if _active_connection_string and job_id:
        if not abpoxx_pybind.insert_import_record_db(
            _active_connection_string, job_id, entity_type,
            external_identifier, action_taken, summary[:500], details
        ):
            logger.warning("Error registrando item de conciliacion en BD")


def members_of_group(group_id: int) -> List[int]:
    return abpoxx_pybind.members_of_group(group_id)

def products_of_group(group_id: int) -> List[int]:
    return abpoxx_pybind.products_of_group(group_id)

def groups_of_researcher(researcher_id: int) -> List[int]:
    return abpoxx_pybind.groups_of_researcher(researcher_id)

def save_to_db(connection_string: str) -> bool:
    return abpoxx_pybind.save_to_db(connection_string)

def load_from_db(connection_string: str) -> bool:
    # Reset RAM antes de recargar: el core C++ inserta sin limpiar y una
    # recarga posterior a un commit duplicaria grupos/investigadores/productos.
    abpoxx_pybind.initialize(InitMode.Empty, "")
    return abpoxx_pybind.load_from_db(connection_string)

def load_from_file(path: str) -> bool:
    return abpoxx_pybind.load_from_file(path)

def export_to_file(path: str) -> bool:
    return abpoxx_pybind.export_to_file(path)

def print_summary():
    abpoxx_pybind.print_summary()

# -------------------------------------------------------------------
# Operation Stack (LIFO Undo)
# -------------------------------------------------------------------

def undo_push(op_type: str, entity_type: str, entity_id: int, prev_state: str = ""):
    op = abpoxx_pybind.UndoOperation()
    op.operation_type = op_type
    op.entity_type = entity_type
    op.entity_id = entity_id
    op.previous_state = prev_state
    abpoxx_pybind.undo_push(op)

def undo_top():
    return abpoxx_pybind.undo_top()

def undo_pop():
    return abpoxx_pybind.undo_pop()

def remove_member_from_group(group_id: int, researcher_id: int):
    undo_push("UNLINK_MEMBER", "GroupMembership", group_id, f"{group_id}:{researcher_id}")
    abpoxx_pybind.remove_member_from_group(group_id, researcher_id)
    if _active_connection_string:
        if not abpoxx_pybind.delete_membership_from_db(_active_connection_string, group_id, researcher_id):
            raise RuntimeError(f"Error eliminando membresia {group_id}:{researcher_id} en BD")

def unlink_product_from_group(group_id: int, product_id: int):
    undo_push("UNLINK_PRODUCT", "GroupProductLink", group_id, f"{group_id}:{product_id}")
    abpoxx_pybind.unlink_product_from_group(group_id, product_id)
    if _active_connection_string:
        if not abpoxx_pybind.delete_product_link_from_db(_active_connection_string, group_id, product_id):
            raise RuntimeError(f"Error eliminando enlace producto-grupo {group_id}:{product_id} en BD")

def products_of_researcher(researcher_id: int) -> List[int]:
    if _active_connection_string:
        return list(abpoxx_pybind.products_of_researcher_db(_active_connection_string, researcher_id))
    return []

def filter_products(
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    family_id: Optional[int] = None,
    validation_status: Optional[str] = None,
    group_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Product]:
    products = list_products()
    if group_id is not None:
        pids = set(products_of_group(group_id))
        products = [p for p in products if p.id in pids]
    if start_year is not None:
        products = [p for p in products if p.year and p.year >= start_year]
    if end_year is not None:
        products = [p for p in products if p.year and p.year <= end_year]
    if family_id is not None:
        products = [p for p in products if p.family_id == family_id]
    if validation_status is not None:
        products = [p for p in products if p.validation_status == validation_status]
    if search:
        s = search.lower()
        products = [p for p in products if (p.title and s in p.title.lower()) or (p.external_code and s in p.external_code.lower())]
    return products[skip : skip + limit]

def undo_perform() -> Dict[str, Any]:
    op = abpoxx_pybind.undo_pop()
    if not op:
        return {"status": "empty", "message": "Pila Undo vacía, nada que revertir."}

    op_type = op.operation_type
    e_type = op.entity_type
    e_id = op.entity_id
    prev_state = op.previous_state

    try:
        if op_type == "UPDATE":
            data = json.loads(prev_state)
            if e_type == "Product":
                update_product(e_id, Product(**data), skip_undo=True)
            elif e_type == "Researcher":
                update_researcher(e_id, Researcher(**data), skip_undo=True)
            elif e_type == "Group":
                update_group(e_id, Group(**data), skip_undo=True)

        elif op_type == "DELETE":
            data = json.loads(prev_state)
            if e_type == "Product":
                update_product(e_id, Product(**data), skip_undo=True)
            elif e_type == "Researcher":
                update_researcher(e_id, Researcher(**data), skip_undo=True)
            elif e_type == "Group":
                update_group(e_id, Group(**data), skip_undo=True)

        elif op_type == "VALIDATE":
            data = json.loads(prev_state)
            set_product_validation(e_id, data.get("validation_status", "pending"), data.get("quality_category_id"))

        elif op_type == "UNLINK_PRODUCT":
            gid, pid = map(int, prev_state.split(":"))
            link_product_to_group(gid, pid)

        elif op_type == "UNLINK_MEMBER":
            gid, rid = map(int, prev_state.split(":"))
            add_member_to_group(gid, rid)

        if _active_connection_string:
            abpoxx_pybind.insert_audit_log_db(
                _active_connection_string, e_type, e_id,
                'UNDO_PERFORMED', 'system', f"Revertida operación {op_type}"
            )

        return {
            "status": "success",
            "operation_type": op_type,
            "entity_type": e_type,
            "entity_id": e_id,
            "message": f"Operación {op_type} sobre {e_type} #{e_id} revertida exitosamente."
        }
    except Exception as e:
        logger.error(f"Error revirtiendo operación undo: {e}")
        return {"status": "error", "error": str(e)}

def undo_list():
    return abpoxx_pybind.undo_list()

def undo_size() -> int:
    return abpoxx_pybind.undo_size()

def undo_clear():
    abpoxx_pybind.undo_clear()

# -------------------------------------------------------------------
# Validation Queue (FIFO)
# -------------------------------------------------------------------

def vq_enqueue(product_id: int, assigned_to: str = ""):
    item = abpoxx_pybind.ValidationQueueItem()
    item.product_id = product_id
    item.assigned_to = assigned_to
    abpoxx_pybind.vq_enqueue(item)
    if _active_connection_string:
        if not abpoxx_pybind.vq_enqueue_db(_active_connection_string, product_id, assigned_to):
            logger.error("Error sincronizando ValidationQueueItem a BD")
            raise RuntimeError("Error sincronizando ValidationQueueItem a BD")

def vq_front():
    return abpoxx_pybind.vq_front()

def vq_dequeue():
    return abpoxx_pybind.vq_dequeue()

def vq_process_next() -> bool:
    return abpoxx_pybind.vq_process_next()

def vq_list():
    return abpoxx_pybind.vq_list()

def vq_size() -> int:
    return abpoxx_pybind.vq_size()

def vq_pending_count() -> int:
    return abpoxx_pybind.vq_pending_count()

def vq_clear():
    abpoxx_pybind.vq_clear()

def get_dashboard_stats() -> dict:
    if not _active_connection_string:
        return {}
    # El nucleo C++ ejecuta las 6 agregaciones y devuelve el JSON ya
    # estructurado con las mismas claves que consumia la API.
    return json.loads(abpoxx_pybind.get_dashboard_stats_json(_active_connection_string))

def get_group_projects(group_id: int) -> List[Project]:
    if not _active_connection_string: return []
    return [
        Project(
            id=p.id,
            title=safe_get_str(p, 'title'),
            summary=safe_get_str(p, 'summary'),
            start_date=safe_get_str(p, 'start_date'),
            end_date=safe_get_str(p, 'end_date'),
            status=safe_get_str(p, 'status'),
            project_type=safe_get_str(p, 'project_type'),
            funding_type=safe_get_str(p, 'funding_type'),
            budget=p.budget or 0.0,
            principal_investigator_id=p.principal_investigator_id
        )
        for p in abpoxx_pybind.get_group_projects_db(_active_connection_string, group_id)
    ]

def get_group_research_lines(group_id: int) -> List[str]:
    if not _active_connection_string: return []
    return abpoxx_pybind.get_group_research_lines_db(_active_connection_string, group_id)

def link_project_to_group(group_id: int, project: Project) -> int:
    if not _active_connection_string: raise Exception("No DB connection")
    proto = abpoxx_pybind.Project()
    proto.title = sanitize_str(project.title)
    proto.summary = sanitize_str(project.summary)
    proto.start_date = sanitize_str(project.start_date)
    proto.end_date = sanitize_str(project.end_date)
    proto.status = sanitize_str(project.status)
    proto.project_type = sanitize_str(project.project_type)
    proto.funding_type = sanitize_str(project.funding_type)
    proto.budget = project.budget or 0.0
    proto.principal_investigator_id = project.principal_investigator_id or 0
    return abpoxx_pybind.link_project_to_group_db(_active_connection_string, group_id, proto)

def unlink_project_from_group(group_id: int, project_id: int):
    if not _active_connection_string: raise Exception("No DB connection")
    abpoxx_pybind.unlink_project_from_group_db(_active_connection_string, group_id, project_id)

def link_research_line_to_group(group_id: int, line_name: str) -> int:
    if not _active_connection_string: raise Exception("No DB connection")
    return abpoxx_pybind.link_research_line_to_group_db(_active_connection_string, group_id, line_name.strip())

def unlink_research_line_from_group(group_id: int, line_name: str):
    if not _active_connection_string: raise Exception("No DB connection")
    abpoxx_pybind.unlink_research_line_from_group_db(_active_connection_string, group_id, line_name.strip())
