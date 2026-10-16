# backend/app/evaluator/product_classifier.py
"""
Clasificador de tipologías de productos Minciencias 2024:
- Determinación de Familia (GNC, DTI, ASC, DPC, FRH)
- Ventanas temporales diferenciadas (10, 7 y 5 años)
- Niveles de calidad (TOP, Tipo A, Tipo B)
- Niveles de formación (FRH-A Doctoral, FRH-B Maestría/Pregrado)
- Análisis de coautoría interna para cohesión
"""

from typing import Any, Set, Tuple
import re
from .helpers import normalize_name

def determine_family(p: Any, desc_lower: str) -> str:
    """Mapea producto a su Familia canónica (GNC, DTI, ASC, DPC, FRH)."""
    fid = getattr(p, "family_id", 0) or 0
    if fid in (1, 6) or "publicado en revista" in desc_lower or "libro" in desc_lower or "capítulo" in desc_lower or "capitulo" in desc_lower:
        return "GNC"
    if fid in (2, 7) or "computacional" in desc_lower or "software" in desc_lower or "patente" in desc_lower or "prototipo" in desc_lower or "innovación" in desc_lower:
        return "DTI"
    if fid == 3 or "apropiación" in desc_lower or "social del conocimiento" in desc_lower:
        return "ASC"
    if fid in (4, 9) or "divulgación" in desc_lower or "congreso" in desc_lower or "web" in desc_lower or "informe técnico" in desc_lower:
        return "DPC"
    if fid in (5, 10) or "trabajo de grado" in desc_lower or "tesis" in desc_lower or "pregrado" in desc_lower or "maestría" in desc_lower or "maestria" in desc_lower:
        return "FRH"
    return "OTRA"

def get_applicable_window(desc_lower: str) -> int:
    """Determina la ventana temporal aplicable (10, 7 o 5 años) según la tipología oficial."""
    is_10yr = any(w in desc_lower for w in ["patente", "variedad vegetal", "raza animal", "investigación-creación", "creacion"])
    if is_10yr:
        return 10
    is_7yr = ("publicado en revista" in desc_lower or "libro resultado" in desc_lower) and not any(w in desc_lower for w in ["calidad d", "categoria d"])
    if is_7yr:
        return 7
    return 5

def classify_quality_and_formation(desc_lower: str, fam: str) -> Tuple[bool, bool, bool, bool, bool]:
    """
    Clasifica niveles de calidad Minciencias 2024 y formación de recurso humano.
    Retorna: (is_top, is_a, is_b, is_frh_a, is_frh_b).
    """
    is_top = (
        any(q in desc_lower for q in ["a1", "q1", "q2", "a2"]) or
        "patente de invención" in desc_lower or
        "libro resultado de investigación" in desc_lower
    )
    is_a = (
        any(q in desc_lower for q in ["calidad b", "categoria b", "calidad c", "categoria c", "q3", "q4"]) or
        "revista especializada" in desc_lower or
        "software" in desc_lower or
        "computacional" in desc_lower or
        "prototipo" in desc_lower or
        "innovación" in desc_lower or
        "diseño industrial" in desc_lower
    )
    is_b = not is_top and not is_a

    is_frh_a = False
    is_frh_b = False
    if fam == "FRH":
        if "tesis de doctorado" in desc_lower or "doctoral" in desc_lower:
            is_frh_a = True
        else:
            is_frh_b = True

    return is_top, is_a, is_b, is_frh_a, is_frh_b

def evaluate_coauthorship(desc: str, group_member_names: Set[str]) -> Tuple[int, bool]:
    """
    Evalúa la concurrencia de autores del grupo en un producto GNC/DTI.
    Retorna: (matched_in_group, is_coauthored).
    """
    matched_in_group = 0
    if "Autores:" in desc:
        author_part = desc.split("Autores:", 1)[1]
        tokens = [normalize_name(x) for x in re.split(r'[,;]', author_part) if len(x.strip()) > 3]
        matched_in_group = len(set(tokens).intersection(group_member_names))
    if matched_in_group == 0:
        matched_in_group = 1  # Por definición al menos 1 autor vinculó la obra al grupo
    return matched_in_group, (matched_in_group >= 2)
