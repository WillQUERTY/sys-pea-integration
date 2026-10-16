import json
import re
from typing import Optional


def normalize_researcher_category(raw: Optional[str]) -> Optional[str]:
    """
    Normaliza la cadena de categoría de CvLAC / Minciencias.
    Elimina la coletilla de vigencia administrativa
    (ej. 'con vigencia hasta la publicación de los resultados de la siguiente convocatoria')
    y retorna la categoría canónica reconocida por Minciencias:
    - 'Investigador Emérito'
    - 'Investigador Senior (IS)'
    - 'Investigador Asociado (I)'
    - 'Investigador Junior (IJ)'
    Si el campo solo contiene texto de vigencia sin categoría activa,
    o está vacío / no reconocido, retorna None.
    """
    if not raw:
        return None
    text = str(raw).strip()
    if not text:
        return None

    # Manejo si viene como payload JSON de datos abiertos
    if text.startswith("{") and "clasificacion" in text:
        try:
            data = json.loads(text)
            return normalize_researcher_category(data.get("clasificacion"))
        except Exception:
            pass

    t_lower = text.lower()

    # 1. Investigador Emérito
    if "emerito" in t_lower or "emérito" in t_lower:
        return "Investigador Emérito"

    # 2. Investigador Senior
    if "senior" in t_lower or "(is)" in t_lower:
        return "Investigador Senior (IS)"

    # 3. Investigador Asociado
    if "asociado" in t_lower:
        return "Investigador Asociado (I)"
    if re.search(r"\b(i)\b", t_lower) and not re.search(r"\b(is|ij)\b", t_lower):
        return "Investigador Asociado (I)"

    # 4. Investigador Junior
    if "junior" in t_lower or "(ij)" in t_lower:
        return "Investigador Junior (IJ)"

    # 5. Si solo contiene frases de vigencia, convocatoria o resultados sin categoría activa
    if any(k in t_lower for k in ["vigencia", "publicacion", "publicación", "convocatoria", "resultado", "gencia"]):
        return None

    return text
