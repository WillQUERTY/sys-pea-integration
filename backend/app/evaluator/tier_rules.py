# backend/app/evaluator/tier_rules.py
"""
Definición de Tiers Minciencias 2024 y motor de auditoría de requisitos:
- Reconocido
- Categoría C
- Categoría B
- Categoría A
- Categoría A1
"""

from typing import Any, Dict, List, Tuple

TIER_ORDER = ["Reconocido", "C", "B", "A", "A1"]

def build_tiers_config(metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Construye la matriz de requisitos oficiales evaluados según las métricas del grupo."""
    years_active = metrics["years_active"]
    annual_target = min(years_active, 5)
    total_members = metrics["total_members"]
    projects_count = metrics["projects_count"]
    gnc_dti_in_window = metrics["gnc_dti_in_window"]
    asc_dpc_frh_in_window = metrics["asc_dpc_frh_in_window"]
    products_in_window = metrics["products_in_window"]
    
    top_count = metrics["top_count"]
    type_a_count = metrics["type_a_count"]
    asc_count = metrics["asc_count"]
    dpc_count = metrics["dpc_count"]
    frh_a_count = metrics["frh_a_count"]
    frh_b_count = metrics["frh_b_count"]
    dti_count = metrics["dti_count"]
    
    icoh = metrics["cohesion_index"]
    coauthored_products_count = metrics["coauthored_products_count"]
    cohesion_met = metrics["cohesion_met"]

    return [
        {
            "tier": "Reconocido",
            "title": "Grupo Reconocido Institucionalmente",
            "description": "Fase 1: Requisitos mínimos de existencia formal, integrantes, aval y producción anualizada.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Tiempo de existencia declarado en GrupLAC",
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
                    "id": "proyectos",
                    "label": "Proyectos de I+D",
                    "description": "Al menos un proyecto de investigación o innovación en ejecución",
                    "target": 1,
                    "current": projects_count,
                    "unit": "proyectos",
                    "met": projects_count >= 1,
                },
                {
                    "id": "produccion_gnc_dti",
                    "label": "Piso Anualizado GNC o DTI",
                    "description": "Mínimo 1 producto de conocimiento o innovación por año declarado",
                    "target": annual_target,
                    "current": gnc_dti_in_window,
                    "unit": "obras GNC/DTI",
                    "met": gnc_dti_in_window >= annual_target,
                },
                {
                    "id": "produccion_apropiacion",
                    "label": "Piso Anualizado ASC/DPC/FRH",
                    "description": "Mínimo 1 producto de apropiación, divulgación o formación por año",
                    "target": annual_target,
                    "current": asc_dpc_frh_in_window,
                    "unit": "obras ASC/DPC/FRH",
                    "met": asc_dpc_frh_in_window >= annual_target,
                },
            ],
        },
        {
            "tier": "C",
            "title": "Categoría C",
            "description": "Fase 2: Consolidación inicial, productos con visibilidad y presencia en formación/divulgación.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Tiempo de existencia oficial del grupo",
                    "target": 2,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 2,
                },
                {
                    "id": "calidad_top_a",
                    "label": "Calidad de Producción (TOP o Tipo A)",
                    "description": "Al menos 1 obra Tipo TOP o Tipo A en ventana",
                    "target": 1,
                    "current": top_count + type_a_count,
                    "unit": "obras TOP/A",
                    "met": (top_count + type_a_count) >= 1,
                },
                {
                    "id": "apropiacion_divulgacion",
                    "label": "Apropiación o Divulgación (ASC/DPC)",
                    "description": "Al menos 1 producto de Apropiación Social o Divulgación Pública en ventana",
                    "target": 1,
                    "current": asc_count + dpc_count,
                    "unit": "obras ASC/DPC",
                    "met": (asc_count + dpc_count) >= 1,
                },
                {
                    "id": "formacion_talento",
                    "label": "Formación de Talento Humano",
                    "description": "Al menos 1 producto FRH Tipo A o Tipo B en ventana",
                    "target": 1,
                    "current": frh_a_count + frh_b_count,
                    "unit": "obras FRH",
                    "met": (frh_a_count + frh_b_count) >= 1,
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción en Ventana Diferenciada",
                    "description": "Volumen de obras en ventana oficial",
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
            "description": "Fase 2: Madurez investigativa con coautoría interna demostrada y talento avanzado.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Trayectoria institucional obligatoria",
                    "target": 3,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 3,
                },
                {
                    "id": "cohesion",
                    "label": "Indicador de Cohesión (IC > 0)",
                    "description": "Colaboración obligatoria entre integrantes del colectivo en obras GNC/DTI",
                    "target": "> 0.0",
                    "current": f"{icoh:+.3f} ({coauthored_products_count} coautorías)",
                    "unit": "",
                    "met": cohesion_met,
                },
                {
                    "id": "calidad_top_a",
                    "label": "Calidad de Producción (TOP o Tipo A)",
                    "description": "Al menos 1 obra Tipo TOP o Tipo A en ventana",
                    "target": 1,
                    "current": top_count + type_a_count,
                    "unit": "obras TOP/A",
                    "met": (top_count + type_a_count) >= 1,
                },
                {
                    "id": "apropiacion_divulgacion",
                    "label": "Apropiación o Divulgación (ASC/DPC)",
                    "description": "Al menos 1 producto de Apropiación Social o Divulgación en ventana",
                    "target": 1,
                    "current": asc_count + dpc_count,
                    "unit": "obras ASC/DPC",
                    "met": (asc_count + dpc_count) >= 1,
                },
                {
                    "id": "formacion_talento",
                    "label": "Formación de Talento Humano",
                    "description": "Al menos 1 FRH Tipo A (Doctoral) ó al menos 2 FRH Tipo B (Maestría/Pregrado)",
                    "target": "1 Dr. ó 2 Ms./Pre.",
                    "current": f"{frh_a_count} Dr. / {frh_b_count} Ms./Pre.",
                    "unit": "",
                    "met": (frh_a_count >= 1) or (frh_b_count >= 2),
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción en Ventana",
                    "description": "Volumen acumulado en ventanas diferenciadas",
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
            "description": "Fase 2: Alto impacto, cohesión comprobada, desarrollo tecnológico y formación doctoral.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Consolidación temporal obligatoria",
                    "target": 5,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 5,
                },
                {
                    "id": "cohesion",
                    "label": "Indicador de Cohesión (IC > 0)",
                    "description": "Coautoría interna obligatoria en obras de conocimiento e innovación",
                    "target": "> 0.0",
                    "current": f"{icoh:+.3f} ({coauthored_products_count} coautorías)",
                    "unit": "",
                    "met": cohesion_met,
                },
                {
                    "id": "calidad_top_a",
                    "label": "Calidad y Desarrollo Tecnológico",
                    "description": "Al menos 2 obras Tipo TOP o Tipo A (incluyendo software, patentes o prototipos)",
                    "target": 2,
                    "current": top_count + type_a_count,
                    "unit": "obras TOP/A",
                    "met": (top_count + type_a_count) >= 2,
                },
                {
                    "id": "apropiacion_divulgacion",
                    "label": "Apropiación o Divulgación (ASC/DPC)",
                    "description": "Al menos 1 producto de Apropiación Social o Divulgación en ventana",
                    "target": 1,
                    "current": asc_count + dpc_count,
                    "unit": "obras ASC/DPC",
                    "met": (asc_count + dpc_count) >= 1,
                },
                {
                    "id": "formacion_doctoral",
                    "label": "Formación Doctoral (FRH Tipo A)",
                    "description": "Obligatorio en Universidades: al menos 1 Tesis Doctoral dirigida y aprobada",
                    "target": 1,
                    "current": frh_a_count,
                    "unit": "tesis doctorales",
                    "met": frh_a_count >= 1,
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción en Ventana",
                    "description": "Mínimo de obras en ventana diferenciada",
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
            "description": "Fase 2: Liderazgo científico de punta, productos TOP, transferencia tecnológica y cuerpo doctoral.",
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
                    "id": "cohesion",
                    "label": "Indicador de Cohesión (IC > 0)",
                    "description": "Cohesión interna sólida y continua",
                    "target": "> 0.0",
                    "current": f"{icoh:+.3f} ({coauthored_products_count} coautorías)",
                    "unit": "",
                    "met": cohesion_met,
                },
                {
                    "id": "calidad_top",
                    "label": "Producción Tipo TOP Obligatoria",
                    "description": "Al menos 2 productos Tipo TOP en ventana (Q1/A1, patentes concedidas, libros A1)",
                    "target": 2,
                    "current": top_count,
                    "unit": "obras TOP",
                    "met": top_count >= 2,
                },
                {
                    "id": "desarrollo_tecnologico",
                    "label": "Desarrollo Tecnológico (DTI)",
                    "description": "Transferencia tecnológica demostrable: software registrado o prototipos",
                    "target": 2,
                    "current": dti_count,
                    "unit": "obras DTI",
                    "met": dti_count >= 2,
                },
                {
                    "id": "apropiacion_divulgacion",
                    "label": "Apropiación o Divulgación (ASC/DPC)",
                    "description": "Al menos 1 producto de Apropiación Social o Divulgación en ventana",
                    "target": 1,
                    "current": asc_count + dpc_count,
                    "unit": "obras ASC/DPC",
                    "met": (asc_count + dpc_count) >= 1,
                },
                {
                    "id": "formacion_doctoral",
                    "label": "Formación Doctoral (FRH Tipo A)",
                    "description": "Tesis Doctoral dirigida y aprobada",
                    "target": 1,
                    "current": frh_a_count,
                    "unit": "tesis doctorales",
                    "met": frh_a_count >= 1,
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción de Excelencia en Ventana",
                    "description": "Mínimo de obras de alto impacto en ventana",
                    "target": 25,
                    "current": products_in_window,
                    "unit": "productos",
                    "met": products_in_window >= 25,
                },
            ],
        },
    ]

def audit_tiers(tiers_config: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], str, Any, float, List[str]]:
    """
    Audita los requisitos para cada nivel y determina el nivel máximo alcanzado y la brecha al siguiente.
    Retorna: (evaluated_tiers, max_qualified_tier, next_tier, next_tier_progress, next_tier_gap).
    """
    evaluated_tiers = []
    max_qualified_tier = "Sin clasificar"

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

    current_tier_idx = TIER_ORDER.index(max_qualified_tier) if max_qualified_tier in TIER_ORDER else -1
    next_tier = None
    next_tier_gap = []
    next_tier_progress = 100.0

    if current_tier_idx < len(TIER_ORDER) - 1:
        next_tier_config = evaluated_tiers[current_tier_idx + 1]
        next_tier = next_tier_config["tier"]
        next_tier_progress = next_tier_config["completion_percentage"]
        next_tier_gap = next_tier_config["missing_summary"]

    return evaluated_tiers, max_qualified_tier, next_tier, next_tier_progress, next_tier_gap
