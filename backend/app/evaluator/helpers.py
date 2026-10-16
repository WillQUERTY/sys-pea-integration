# backend/app/evaluator/helpers.py
"""
Funciones auxiliares para extracción de fechas y normalización de textos
utilizadas en la evaluación de grupos según el Modelo Minciencias.
"""

from typing import Optional
import re
import unicodedata

def extract_year_from_date(date_str: Optional[str]) -> Optional[int]:
    """Extrae un año de 4 dígitos de un campo de fecha o texto."""
    if not date_str:
        return None
    match = re.search(r'\b(19\d\d|20\d\d)\b', str(date_str))
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None

def clean_classification(classification: Optional[str]) -> str:
    """Normaliza la clasificación oficial del grupo."""
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

def normalize_name(name: Optional[str]) -> str:
    """Normaliza cadenas de texto para cruces de coautoría y desambiguación."""
    if not name:
        return ""
    text = str(name).strip()
    # Eliminar acentos y diacríticos
    normalized = ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )
    # Limpieza de espacios redundantes y paso a mayúsculas
    return re.sub(r'\s+', ' ', normalized).upper().strip()
