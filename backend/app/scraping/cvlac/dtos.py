from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class CvArticle:
    title: str
    authors: List[str]
    journal: str = ""
    issn: str = ""
    year: Optional[int] = None
    volume: str = ""
    issue: str = ""
    pages: str = ""
    doi: str = ""
    is_endorsed: bool = False


@dataclass
class CvBookChapter:
    title: str
    authors: List[str]
    book: str = ""
    isbn: str = ""
    year: Optional[int] = None
    pages: str = ""
    is_endorsed: bool = False


@dataclass
class CvBook:
    title: str
    authors: List[str]
    isbn: str = ""
    year: Optional[int] = None
    editorial: str = ""
    is_endorsed: bool = False


@dataclass
class CvSoftware:
    title: str
    authors: List[str]
    year: Optional[int] = None
    country: str = ""
    is_endorsed: bool = False


@dataclass
class CvEvent:
    event_name: str
    event_type: str = "Encuentro"
    scope: str = "Nacional"
    date_str: str = ""
    city: str = ""
    institution: str = ""
    product_title: str = ""
    product_type: str = "Ponencia"
    role: str = "Ponente"
    year: Optional[int] = None
    is_endorsed: bool = False


@dataclass
class CvProject:
    title: str
    project_type: str = "Investigación y desarrollo"
    start_date: str = ""
    end_date: str = ""
    summary: str = ""
    year: Optional[int] = None
    is_endorsed: bool = False


@dataclass
class CvData:
    name: str
    citation_name: str = ""
    nationality: str = "Colombiana"
    gender: str = ""
    category: str = ""
    is_par_evaluador: bool = False
    external_code: str = ""
    orcid: str = ""
    highest_education_level: str = "Maestría"
    education_records: str = ""
    target_group_code: str = "COL0011545"  # Grupo de Óptica e Informática de la UPC por defecto
    articles: List[CvArticle] = field(default_factory=list)
    book_chapters: List[CvBookChapter] = field(default_factory=list)
    books: List[CvBook] = field(default_factory=list)
    software: List[CvSoftware] = field(default_factory=list)
    events: List[CvEvent] = field(default_factory=list)
    projects: List[CvProject] = field(default_factory=list)
