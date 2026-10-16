# backend/app/evaluator/__init__.py
"""
Motor de diagnóstico y semáforo de categorización de Grupos según Modelo Minciencias 2024.
Referencia: Minciencias - Modelo de Medición 2024 (Convocatoria 957 / Anexo 1 - M601PR04G01 Versión 02).
"""

from typing import Any, Dict
from .helpers import clean_classification
from .metrics_collector import collect_group_metrics
from .tier_rules import build_tiers_config, audit_tiers

def evaluate_group_minciencias(group_id: int, repository_module: Any) -> Dict[str, Any]:
    """
    Evalúa el estado de un Grupo de Investigación según el Modelo Minciencias 2024.
    Aplica ventanas diferenciadas de 10, 7 y 5 años, discriminación de tipologías TOP, Tipo A,
    Tipo B, Formación de Recurso Humano Tipo A (Doctoral), y el cálculo formal del Indicador
    de Cohesión (IC).
    """
    metrics = collect_group_metrics(group_id, repository_module)
    group = metrics["group"]
    
    tiers_config = build_tiers_config(metrics)
    evaluated_tiers, max_qualified_tier, next_tier, next_tier_progress, next_tier_gap = audit_tiers(tiers_config)

    return {
        "group_id": group_id,
        "group_name": group.name,
        "current_classification": clean_classification(group.classification),
        "raw_classification": group.classification or "",
        "max_qualified_tier": max_qualified_tier,
        "next_tier": next_tier,
        "next_tier_progress": next_tier_progress,
        "next_tier_gap": next_tier_gap,
        "summary": {
            "years_active": metrics["years_active"],
            "creation_year": metrics["creation_year"],
            "total_members": metrics["total_members"],
            "phd_count": metrics["phd_count"],
            "masters_count": metrics["masters_count"],
            "total_products": metrics["total_products"],
            "products_in_window": metrics["products_in_window"],
            "gnc_count": metrics["gnc_count"],
            "dti_count": metrics["dti_count"],
            "frh_count": metrics["frh_count"],
            "asc_count": metrics["asc_count"],
            "dpc_count": metrics["dpc_count"],
            "projects_count": metrics["projects_count"],
            "cohesion_index": metrics["cohesion_index"],
            "cohesion_met": metrics["cohesion_met"],
            "top_count": metrics["top_count"],
            "type_a_count": metrics["type_a_count"],
            "type_b_count": metrics["type_b_count"],
            "frh_a_count": metrics["frh_a_count"],
            "frh_b_count": metrics["frh_b_count"],
            "asc_dpc_count": metrics["asc_dpc_count"],
            "coauthored_products_count": metrics["coauthored_products_count"],
        },
        "tiers": evaluated_tiers,
    }

__all__ = ["evaluate_group_minciencias"]
