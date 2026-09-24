from pydantic import BaseModel
from typing import List, Optional

class Group(BaseModel):
    id: int
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
