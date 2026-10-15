from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any


@dataclass
class ScrapedMember:
    display_name: str
    cod_rh: Optional[str] = None
    role: Optional[str] = "Investigador"
    hours: Optional[int] = None
    period_raw: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    is_leader_candidate: bool = False
    warnings: List[str] = field(default_factory=list)


@dataclass
class ScrapedAuthor:
    display_name: str
    cod_rh: Optional[str] = None
    matched_researcher_id: Optional[int] = None
    match_status: str = "unverified"  # exact, candidate, unverified


@dataclass
class ScrapedProduct:
    title: str
    raw_text: str
    section: str
    subtype_code: Optional[str]  # tipologia 2024 (ART/SF/...); None = sin clasificar (Revision §20)
    doi: Optional[str] = None
    issn: Optional[str] = None
    isbn: Optional[str] = None
    year: Optional[int] = None
    authors: List[ScrapedAuthor] = field(default_factory=list)
    source_url: str = ""
    external_code: str = ""
    warnings: List[str] = field(default_factory=list)
    is_endorsed: bool = False  # Marca chulo_0.jpg / chulo_1.jpg: avalado en convocatoria previa


@dataclass
class ScrapedProject:
    title: str
    summary: str = ""
    year: Optional[int] = None
    raw_text: str = ""


@dataclass
class ScrapedGroupData:
    group: Dict[str, Any]
    institutions: List[str] = field(default_factory=list)
    members: List[ScrapedMember] = field(default_factory=list)
    products: List[ScrapedProduct] = field(default_factory=list)
    projects: List[ScrapedProject] = field(default_factory=list)
    research_lines: List[str] = field(default_factory=list)
    work_plan_text: str = ""
    warnings: List[str] = field(default_factory=list)
    skipped_sections: List[str] = field(default_factory=list)  # headers sin mapeo 2024 -> ImportJob.details
