from pydantic import BaseModel
from typing import Generic, List, Optional, TypeVar

T = TypeVar("T")

class PagedResponse(BaseModel, Generic[T]):
    """Envelope paginado estándar para los endpoints de listado."""
    items: List[T]
    total: int
    skip: int
    limit: int

class ProductFamily(BaseModel):
    id: Optional[int] = None
    name: str

class ProductSubtype(BaseModel):
    id: Optional[int] = None
    family_id: int
    name: str

class QualityCategory(BaseModel):
    id: Optional[int] = None
    name: str

class Group(BaseModel):
    id: Optional[int] = None
    external_code: str
    name: str
    acronym: Optional[str] = None
    institution: Optional[str] = None
    classification: Optional[str] = None
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
    status: Optional[str] = "active"

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
    education_records: Optional[str] = None
    classification_records: Optional[str] = None
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
    language: Optional[str] = None
    country: Optional[str] = None
    doi: Optional[str] = None
    isbn: Optional[str] = None
    issn: Optional[str] = None
    url: Optional[str] = None
    evidence: Optional[str] = None
    specialized_attributes: Optional[str] = None
    status: Optional[str] = "active"
    year: Optional[int] = None

class GroupMembership(BaseModel):
    id: Optional[int] = None
    group_id: int
    researcher_id: int
    role: Optional[str] = "Investigador"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = "active"

class ProductAuthor(BaseModel):
    id: Optional[int] = None
    product_id: int
    researcher_id: Optional[int] = None
    author_order: Optional[int] = 1
    external_author_name: Optional[str] = None
    external_author_identifier: Optional[str] = None
    match_status: Optional[str] = "unverified"

class GroupProductLink(BaseModel):
    id: Optional[int] = None
    group_id: int
    product_id: int
    status: Optional[str] = "approved"
    source: Optional[str] = "system"
    requested_at: Optional[str] = None
    authorized_at: Optional[str] = None
    validation_reason: Optional[str] = None

class ImportRecord(BaseModel):
    id: Optional[int] = None
    job_id: int
    entity_type: str
    external_identifier: Optional[str] = None
    action_taken: str
    source_data_summary: Optional[str] = None
    resolution_details: Optional[str] = None
    created_at: Optional[str] = None

class Project(BaseModel):
    id: Optional[int] = None
    title: str
    summary: Optional[str] = None
    project_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = "active"
    funding_type: Optional[str] = None
    budget: Optional[float] = 0.0
    principal_investigator_id: Optional[int] = None

class WorkPlan(BaseModel):
    id: Optional[int] = None
    group_id: int
    title: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = "active"

class UndoOperation(BaseModel):
    id: Optional[int] = None
    operation_type: str
    entity_type: str
    entity_id: int
    previous_state: Optional[str] = None
    performed_at: Optional[str] = None
    undone_at: Optional[str] = None

class ValidationQueueItem(BaseModel):
    id: Optional[int] = None
    product_id: int
    enqueued_at: Optional[str] = None
    status: Optional[str] = "pending"
    attempts: Optional[int] = 0
    assigned_to: Optional[str] = None
    result: Optional[str] = None
    processed_at: Optional[str] = None

class ResearchLine(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None

class GroupResearchLine(BaseModel):
    id: Optional[int] = None
    group_id: int
    line_id: int

class ObservationWindow(BaseModel):
    id: Optional[int] = None
    name: str
    start_year: int
    end_year: int
    description: Optional[str] = None
    is_active: Optional[bool] = True

class ImportJob(BaseModel):
    id: Optional[int] = None
    source_type: str # 'url', 'csv', 'pdf'
    source_url: Optional[str] = None
    file_path: Optional[str] = None
    status: Optional[str] = "pending"
    total_records: Optional[int] = 0
    new_records: Optional[int] = 0
    duplicate_records: Optional[int] = 0
    error_count: Optional[int] = 0
    details: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

class AuditLog(BaseModel):
    id: Optional[int] = None
    entity_type: str
    entity_id: int
    action: str # 'CREATE', 'UPDATE', 'DELETE', 'DEACTIVATE'
    changed_by: Optional[str] = "system"
    change_details: Optional[str] = None
    created_at: Optional[str] = None

