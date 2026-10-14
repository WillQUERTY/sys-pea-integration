# backend/app/minciencias_evaluator.py
# Motor de diagnóstico y semáforo de categorización de Grupos según Modelo Minciencias 2024.

from typing import Dict, Any, List, Optional
from datetime import datetime
import re

def _extract_year_from_date(date_str: Optional[str]) -> Optional[int]:
    if not date_str:
        return None
    match = re.search(r'\b(19\d\d|20\d\d)\b', str(date_str))
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None

def _clean_classification(classification: Optional[str]) -> str:
    if not classification:
        return "Sin clasificar"
    raw = classification.strip()
    if raw.startswith("A1"):
        return "A1"
    if raw.startswith("A"):
        return "A"
    if raw.startswith("B"):
        return "B"
    if raw.startswith("C"):
        return "C"
    if "Reconocido" in raw:
        return "Reconocido"
    return "Sin clasificar"

def evaluate_group_minciencias(group_id: int, repository_module: Any) -> Dict[str, Any]:
    group = repository_module.get_group(group_id)
    stats = repository_module.get_group_stats(group_id)
    projects = repository_module.get_group_projects(group_id)

    # 1. Antigüedad del grupo
    creation_year = _extract_year_from_date(group.declared_creation_date)
    current_year = datetime.now().year
    years_active = (current_year - creation_year) if creation_year else 5

    # 2. Métricas de integrantes y posgrados
    edu_dist = {item["level"]: item["count"] for item in stats.get("researchers_education", [])}
    phd_count = sum(cnt for lvl, cnt in edu_dist.items() if lvl.lower().startswith("doc"))
    masters_count = sum(cnt for lvl, cnt in edu_dist.items() if lvl.lower().startswith("maest"))
    total_members = stats.get("total_members", 0)

    # 3. Métricas de producción por familias
    families_map = {item["code"]: item["count"] for item in stats.get("families_distribution", [])}
    gnc_count = families_map.get("GNC", 0)
    dti_count = families_map.get("DTI", 0)
    frh_count = families_map.get("FRH", 0)
    asc_count = families_map.get("ASC", 0)
    dpc_count = families_map.get("DPC", 0)
    
    distinct_families = sum(1 for code in ["GNC", "DTI", "FRH", "ASC", "DPC"] if families_map.get(code, 0) > 0)

    # 4. Ventana de observación (últimos 5 años)
    window_years = {str(current_year - i) for i in range(5)}
    products_in_window = sum(
        item["count"] for item in stats.get("by_year", []) if item["year"] in window_years
    )
    # Si las obras tienen fechas históricas mayores o sin fecha, aseguramos un conteo razonable
    if products_in_window == 0 and stats.get("total_products", 0) > 0:
        products_in_window = stats.get("total_products", 0)

    projects_count = len(projects)
    total_products = stats.get("total_products", 0)

    # Definición de niveles Minciencias
    tiers_config = [
        {
            "tier": "Reconocido",
            "title": "Grupo Reconocido Institucionalmente",
            "description": "Requisitos basales de existencia, integrantes activos y producción en ventana.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Tiempo de existencia declarado del grupo",
                    "target": 1,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 1,
                },
                {
                    "id": "integrantes",
                    "label": "Integrantes vinculados",
                    "description": "Mínimo de investigadores activos en el colectivo",
                    "target": 2,
                    "current": total_members,
                    "unit": "investigadores",
                    "met": total_members >= 2,
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción en ventana",
                    "description": "Obras científicas registradas en los últimos 5 años",
                    "target": 1,
                    "current": products_in_window,
                    "unit": "productos",
                    "met": products_in_window >= 1,
                },
                {
                    "id": "proyectos",
                    "label": "Proyectos de I+D",
                    "description": "Proyectos de investigación vinculados al grupo",
                    "target": 1,
                    "current": projects_count,
                    "unit": "proyectos",
                    "met": projects_count >= 1,
                },
            ],
        },
        {
            "tier": "C",
            "title": "Categoría C",
            "description": "Consolidación inicial, posgrados y diversificación de familias de conocimiento.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Tiempo de existencia declarado",
                    "target": 2,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 2,
                },
                {
                    "id": "posgrado",
                    "label": "Integrantes con Posgrado",
                    "description": "Al menos un integrante con Maestría o Doctorado",
                    "target": 1,
                    "current": phd_count + masters_count,
                    "unit": "posgraduados",
                    "met": (phd_count + masters_count) >= 1,
                },
                {
                    "id": "diversidad_familias",
                    "label": "Diversidad de Familias",
                    "description": "Presencia de productos en familias distintas (GNC, DTI, FRH, etc.)",
                    "target": 2,
                    "current": distinct_families,
                    "unit": "familias",
                    "met": distinct_families >= 2,
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción en ventana",
                    "description": "Volumen de productos en los últimos 5 años",
                    "target": 4,
                    "current": products_in_window,
                    "unit": "productos",
                    "met": products_in_window >= 4,
                },
            ],
        },
        {
            "tier": "B",
            "title": "Categoría B",
            "description": "Madurez investigativa con aporte en formación y generación de nuevo conocimiento.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Trayectoria del colectivo",
                    "target": 3,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 3,
                },
                {
                    "id": "formacion_avanzada",
                    "label": "Investigadores Doctor/Magíster",
                    "description": "Al menos 1 Doctor o al menos 2 Magísteres",
                    "target": "1 Dr. ó 2 Ms.",
                    "current": f"{phd_count} Dr. / {masters_count} Ms.",
                    "unit": "",
                    "met": phd_count >= 1 or masters_count >= 2,
                },
                {
                    "id": "frh_productos",
                    "label": "Formación de Talento (FRH)",
                    "description": "Tesis o trabajos de grado dirigidos finalizados",
                    "target": 1,
                    "current": frh_count,
                    "unit": "obras FRH",
                    "met": frh_count >= 1,
                },
                {
                    "id": "gnc_productos",
                    "label": "Nuevo Conocimiento (GNC)",
                    "description": "Artículos científicos o libros resultado de investigación",
                    "target": 2,
                    "current": gnc_count,
                    "unit": "obras GNC",
                    "met": gnc_count >= 2,
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción en ventana",
                    "description": "Volumen quinquenal acumulado",
                    "target": 8,
                    "current": products_in_window,
                    "unit": "productos",
                    "met": products_in_window >= 8,
                },
            ],
        },
        {
            "tier": "A",
            "title": "Categoría A",
            "description": "Alto impacto con desarrollo tecnológico, formación avanzada y fuerte producción científica.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Consolidación temporal",
                    "target": 5,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 5,
                },
                {
                    "id": "doctores_magisteres",
                    "label": "Núcleo de Doctores y Magísteres",
                    "description": "Al menos 1 Doctor Y al menos 2 Magísteres",
                    "target": "1 Dr. y 2 Ms.",
                    "current": f"{phd_count} Dr. / {masters_count} Ms.",
                    "unit": "",
                    "met": phd_count >= 1 and masters_count >= 2,
                },
                {
                    "id": "dti_productos",
                    "label": "Desarrollo Tecnológico (DTI)",
                    "description": "Software registrado, patentes, prototipos o diseños",
                    "target": 1,
                    "current": dti_count,
                    "unit": "obras DTI",
                    "met": dti_count >= 1,
                },
                {
                    "id": "frh_productos",
                    "label": "Formación de Talento (FRH)",
                    "description": "Dirección de trabajos de grado o semilleros",
                    "target": 2,
                    "current": frh_count,
                    "unit": "obras FRH",
                    "met": frh_count >= 2,
                },
                {
                    "id": "gnc_productos",
                    "label": "Nuevo Conocimiento (GNC)",
                    "description": "Artículos en revistas indexadas o libros",
                    "target": 4,
                    "current": gnc_count,
                    "unit": "obras GNC",
                    "met": gnc_count >= 4,
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción en ventana",
                    "description": "Mínimo de obras en últimos 5 años",
                    "target": 15,
                    "current": products_in_window,
                    "unit": "productos",
                    "met": products_in_window >= 15,
                },
            ],
        },
        {
            "tier": "A1",
            "title": "Categoría A1 (Máxima Distinción)",
            "description": "Liderazgo científico internacional, núcleo doctoral consolidado y transferencia tecnológica.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Trayectoria institucional de excelencia",
                    "target": 5,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 5,
                },
                {
                    "id": "doctores",
                    "label": "Cuerpo Doctoral",
                    "description": "Al menos 2 integrantes con título de Doctorado",
                    "target": 2,
                    "current": phd_count,
                    "unit": "doctores",
                    "met": phd_count >= 2,
                },
                {
                    "id": "dti_productos",
                    "label": "Desarrollo Tecnológico (DTI)",
                    "description": "Transferencia tecnológica y software con registro",
                    "target": 2,
                    "current": dti_count,
                    "unit": "obras DTI",
                    "met": dti_count >= 2,
                },
                {
                    "id": "frh_productos",
                    "label": "Formación de Talento (FRH)",
                    "description": "Tesis de posgrado o pregrado dirigidas",
                    "target": 4,
                    "current": frh_count,
                    "unit": "obras FRH",
                    "met": frh_count >= 4,
                },
                {
                    "id": "gnc_productos",
                    "label": "Nuevo Conocimiento (GNC)",
                    "description": "Artículos de alto impacto y producción de punta",
                    "target": 8,
                    "current": gnc_count,
                    "unit": "obras GNC",
                    "met": gnc_count >= 8,
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción en ventana",
                    "description": "Mínimo de obras en ventana",
                    "target": 25,
                    "current": products_in_window,
                    "unit": "productos",
                    "met": products_in_window >= 25,
                },
            ],
        },
    ]

    evaluated_tiers = []
    max_qualified_tier = "Sin clasificar"
    tier_order = ["Reconocido", "C", "B", "A", "A1"]

    for config in tiers_config:
        reqs = config["reqs"]
        met_count = sum(1 for r in reqs if r["met"])
        total_reqs = len(reqs)
        pct = round((met_count / total_reqs) * 100, 1)
        qualifies = (met_count == total_reqs)

        missing_summary = []
        for r in reqs:
            if not r["met"]:
                missing_summary.append(f"{r['label']} (Requerido: {r['target']} {r['unit']}, Actual: {r['current']})")

        evaluated_tiers.append({
            "tier": config["tier"],
            "title": config["title"],
            "description": config["description"],
            "qualifies": qualifies,
            "completion_percentage": pct,
            "requirements": reqs,
            "missing_summary": missing_summary,
        })

        if qualifies:
            max_qualified_tier = config["tier"]

    # Calcular siguiente nivel a alcanzar y brecha específica
    current_tier_idx = tier_order.index(max_qualified_tier) if max_qualified_tier in tier_order else -1
    next_tier = None
    next_tier_gap = []
    next_tier_progress = 100.0

    if current_tier_idx < len(tier_order) - 1:
        next_tier_config = evaluated_tiers[current_tier_idx + 1]
        next_tier = next_tier_config["tier"]
        next_tier_progress = next_tier_config["completion_percentage"]
        next_tier_gap = next_tier_config["missing_summary"]

    return {
        "group_id": group_id,
        "group_name": group.name,
        "current_classification": _clean_classification(group.classification),
        "raw_classification": group.classification or "",
        "max_qualified_tier": max_qualified_tier,
        "next_tier": next_tier,
        "next_tier_progress": next_tier_progress,
        "next_tier_gap": next_tier_gap,
        "summary": {
            "years_active": years_active,
            "creation_year": creation_year,
            "total_members": total_members,
            "phd_count": phd_count,
            "masters_count": masters_count,
            "total_products": total_products,
            "products_in_window": products_in_window,
            "gnc_count": gnc_count,
            "dti_count": dti_count,
            "frh_count": frh_count,
            "asc_count": asc_count,
            "dpc_count": dpc_count,
            "projects_count": projects_count,
        },
        "tiers": evaluated_tiers,
    }
