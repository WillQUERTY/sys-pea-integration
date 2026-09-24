from pydantic import BaseModel
from typing import List, Optional

class Group(BaseModel):
    id: Optional[int] = None
    external_code: str
    name: str
    acronym: Optional[str] = None
    description: Optional[str] = None
    mission: Optional[str] = None
    vision: Optional[str] = None
    declared_creation_date: Optional[str] = None
    knowledge_area: Optional[str] = None
    knowledge_subarea: Optional[str] = None
    city: Optional[str] = None
    department: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    leader_id: Optional[int] = None
    institution_aval_ids: Optional[List[int]] = None
    research_line_ids: Optional[List[int]] = None
    work_plan: Optional[str] = None
    status: Optional[str] = None

class Researcher(BaseModel):
    id: Optional[int] = None
    external_code: str
    identification_type: Optional[str] = None
    identification_number: Optional[str] = None
    first_names: str
    last_names: str
    nationality: Optional[str] = None
    country_of_residence: Optional[str] = None
    institutional_email: Optional[str] = None
    orcid: Optional[str] = None
    highest_education_level: Optional[str] = None
    status: Optional[str] = "active"

class Product(BaseModel):
    id: Optional[int] = None
    external_code: str
    title: str
    description: Optional[str] = None
    family_id: Optional[int] = 0
    subtype_id: Optional[int] = 0
    quality_category_id: Optional[int] = 0
    obtained_date: Optional[str] = None
    publication_date: Optional[str] = None
    validation_status: Optional[str] = "pending"
    status: Optional[str] = "active"
