# backend/app/pdf_import/members_projects.py
"""
Parseo de tablas de integrantes, proyectos y líneas de investigación del PDF.
Manejo de columnas fijas con celdas envueltas y periodos de vinculación.
"""

from typing import Any, Dict, List, Optional, Tuple
import re

from .. import scraper
from ..scraper import GruplacNormalizer, ScrapedMember, ScrapedProject
from .extractor import norm

# Columnas de la tabla de integrantes (informe): Codigo | Nombre | Rol |
# Vinculacion (2.6 / 9.4 / 2.5 / 2.5 cm desde el margen izquierdo de 2cm).
MEMBERS_X = (130.0, 397.0, 468.0)

# Columnas de la tabla de proyectos: Titulo | Tipo | Estado | Inicio-Fin
# (9 / 3 / 2 / 3 cm).
PROJECTS_X = (312.0, 397.0, 454.0)


def parse_period(value: str) -> Tuple[Optional[str], Optional[str]]:
    """'2020-01-01 - 2023-06-30' (el informe usa guion largo –) o una sola
    fecha = vinculacion vigente. Delega los formatos no ISO al scraper."""
    s = GruplacNormalizer.normalize(value)
    if not s:
        return None, None
    iso = re.match(r"^(\d{4}-\d{2}-\d{2})\s*[–-]+\s*(\d{4}-\d{2}-\d{2})$", s)
    if iso:
        return iso.group(1), iso.group(2)
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s, None
    # El visor GrupLAC usa formatos tipo 'julio/2019 - Actual' o '2019 -':
    parsed = scraper.GruplacNormalizer.parse_membership_period(s)
    return parsed.get("start_date"), parsed.get("end_date")


def member_from_row(row: Dict[str, str]) -> ScrapedMember:
    name = GruplacNormalizer.normalize(row["name"])
    start, end = parse_period(row["dates"])
    return ScrapedMember(
        display_name=name,
        cod_rh=GruplacNormalizer.normalize(row["code"]) or None,
        role=GruplacNormalizer.normalize(row["role"]) or "Investigador",
        period_raw=GruplacNormalizer.normalize(row["dates"]),
        start_date=start,
        end_date=end,
        is_current=not end,
        is_leader_candidate=False,
        warnings=[] if name else ["integrante sin nombre"],
    )


def parse_members(lines: List[Dict[str, Any]]) -> List[ScrapedMember]:
    """Tabla 'Integrantes del grupo': Codigo | Nombre | Rol | Vinculacion.
    Fila nueva = columna Codigo con texto (la identidad del integrante); el
    resto de líneas son celdas envueltas de la fila en curso — la vinculacion
    '2021-06-01 – 2023-06-30' no cabe en 2.5cm y salta de línea. Encabezado
    repetido se omite."""
    members: List[ScrapedMember] = []
    cur: Optional[Dict[str, str]] = None
    for line in lines:
        col_code = " ".join(w[1] for w in line["words"] if w[0] < MEMBERS_X[0])
        col_name = " ".join(w[1] for w in line["words"] if MEMBERS_X[0] <= w[0] < MEMBERS_X[1])
        col_role = " ".join(w[1] for w in line["words"] if MEMBERS_X[1] <= w[0] < MEMBERS_X[2])
        col_dates = " ".join(w[1] for w in line["words"] if w[0] >= MEMBERS_X[2])
        # Encabezado (o su repetición por salto de página): ignorar.
        if norm(f"{col_code} {col_name} {col_role} {col_dates}".strip()) in {
            norm("codigo nombre rol vinculacion"),
        }:
            continue
        if col_code:
            if cur:
                members.append(member_from_row(cur))
            cur = {"code": col_code, "name": col_name, "role": col_role, "dates": col_dates}
        elif cur:
            if col_name:
                cur["name"] = (cur["name"] + " " + col_name).strip()
            if col_role:
                cur["role"] = (cur["role"] + " " + col_role).strip()
            if col_dates:
                cur["dates"] = (cur["dates"] + " " + col_dates).strip()
    if cur:
        members.append(member_from_row(cur))
    return members


def project_from_row(row: Dict[str, str]) -> ScrapedProject:
    title = GruplacNormalizer.normalize(row["title"])
    start_m = re.match(r"^(\d{4})", row["dates"] or "")
    return ScrapedProject(
        title=title,
        year=int(start_m.group(1)) if start_m else None,
        raw_text=" | ".join(filter(None, [title, row["type"], row["status"], row["dates"]])),
    )


def parse_projects(lines: List[Dict[str, Any]]) -> List[ScrapedProject]:
    """Tabla 'Proyectos': Titulo | Tipo | Estado | Inicio-Fin. Fila nueva =
    título con algo en las columnas de la derecha (la primera línea de una
    fila siempre trae tipo/estado/fechas, posiblemente truncadas); líneas sin
    título son celdas envueltas de la fila en curso ('Investigación aplicada'
    y '2022-01-01 – 2024-12-31' no caben en 3cm)."""
    projects: List[ScrapedProject] = []
    cur: Optional[Dict[str, str]] = None
    for line in lines:
        col_title = " ".join(w[1] for w in line["words"] if w[0] < PROJECTS_X[0])
        col_type = " ".join(w[1] for w in line["words"] if PROJECTS_X[0] <= w[0] < PROJECTS_X[1])
        col_status = " ".join(w[1] for w in line["words"] if PROJECTS_X[1] <= w[0] < PROJECTS_X[2])
        col_dates = " ".join(w[1] for w in line["words"] if w[0] >= PROJECTS_X[2])
        if norm(f"{col_title} {col_type} {col_status} {col_dates}".strip()) == \
                norm("titulo tipo estado inicio - fin"):
            continue
        if col_title and (col_type or col_status or col_dates):
            if cur:
                projects.append(project_from_row(cur))
            cur = {"title": col_title, "type": col_type, "status": col_status, "dates": col_dates}
        elif cur:
            if col_title:
                cur["title"] = (cur["title"] + " " + col_title).strip()
            if col_type:
                cur["type"] = (cur["type"] + " " + col_type).strip()
            if col_status:
                cur["status"] = (cur["status"] + " " + col_status).strip()
            if col_dates:
                cur["dates"] = (cur["dates"] + " " + col_dates).strip()
    if cur:
        projects.append(project_from_row(cur))
    return projects


def parse_research_lines(lines: List[Dict[str, Any]]) -> List[str]:
    """Bullets '• <línea>' (informe) o líneas planas (visor Scienti)."""
    out: List[str] = []
    for line in lines:
        text = " ".join(w[1] for w in line["words"]).lstrip("•·- ").strip()
        if text:
            out.append(GruplacNormalizer.normalize(text))
    return out
