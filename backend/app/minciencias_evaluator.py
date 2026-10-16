# backend/app/minciencias_evaluator.py
# Motor de diagnóstico y semáforo de categorización de Grupos según Modelo Minciencias 2024.
# Referencia: Minciencias - Modelo de Medición 2024 (Convocatoria 957 / Anexo 1 - M601PR04G01 Versión 02).
#
# Fachada y coordinador backward-compatible para el paquete modular backend.app.evaluator:
#   - helpers.py            : Normalización de nombres, fechas y clasificación
#   - product_classifier.py : Familias, ventanas temporales, niveles de calidad y coautoría
#   - metrics_collector.py  : Agregación de integrantes, formación, productos e IC
#   - tier_rules.py         : Matriz de requisitos de tiers (Reconocido, C, B, A, A1) y auditoría

from .evaluator import evaluate_group_minciencias
from .evaluator.helpers import (
    extract_year_from_date as _extract_year_from_date,
    clean_classification as _clean_classification,
    normalize_name as _normalize_name,
)

__all__ = [
    "evaluate_group_minciencias",
    "_extract_year_from_date",
    "_clean_classification",
    "_normalize_name",
]
