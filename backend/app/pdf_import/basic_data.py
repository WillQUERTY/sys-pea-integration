# backend/app/pdf_import/basic_data.py
"""
Parseo de la sección 'Datos básicos' del grupo a partir de líneas del PDF.
Mapeo de etiquetas a claves normalizadas del DTO de Grupo y validación de código COL.
"""

from typing import Any, Dict, List, Optional, Tuple
import re

from ..scraper import GruplacNormalizer
from .extractor import PdfImportError, norm

# Frontera entre la columna de etiquetas (5cm) y la de valores del informe:
# las palabras a la derecha pertenecen al valor.
KV_X_SPLIT = 195.0

COL_CODE_RE = re.compile(r"^COL\d{4,}$")

# Etiqueta (normalizada) -> clave del dict group. "" = reconocida pero no se
# importa (Sigla/Subarea/Estado viven en columnas propias del sistema).
LABEL_ALIASES: Dict[str, str] = {}
for _alias, _key in [
    ("nombre del grupo", "name"),
    ("sigla", ""),
    ("codigo gruplac", "external_code"),
    ("institucion aval", "institution"),
    ("clasificacion minciencias", "classification"),
    ("fecha de creacion declarada", "declared_creation_date"),
    ("area de conocimiento", "knowledge_area"),
    ("subarea", ""),
    ("departamento / ciudad", "location"),
    ("departamento - ciudad", "location"),             # visor Scienti
    ("correo electronico", "email"),
    ("e mail", "email"),
    ("sitio web", "website"),
    ("estado", ""),
    ("lider del grupo", "leader_name"),
    ("lider", "leader_name"),                          # visor Scienti
]:
    LABEL_ALIASES[norm(_alias)] = _key


def match_label(candidate: str) -> Optional[str]:
    """Clave del group dict para una etiqueta conocida (o None si no es)."""
    return LABEL_ALIASES.get(norm(candidate))


def parse_kv_lines(lines: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Tabla 2-columnas del informe (etiqueta | valor) a dict. Tolera etiquetas
    y valores envueltos en varias líneas con un buffer rodante: cada fila
    empieza cuando el texto izquierdo acumulado matchea una etiqueta conocida.
    """
    rows: Dict[str, str] = {}
    pending = ""        # texto de etiqueta acumulándose (posible envoltura)
    pending_value = ""  # valores vistos mientras la etiqueta estaba incompleta
    cur_key: Optional[str] = None
    cur_value = ""

    for line in lines:
        left = " ".join(w[1] for w in line["words"] if w[0] < KV_X_SPLIT)
        right = " ".join(w[1] for w in line["words"] if w[0] >= KV_X_SPLIT)
        if left:
            cand = (pending + " " + left).strip()
            key = match_label(cand)
            if key is not None:
                if cur_key is not None:
                    rows[cur_key] = cur_value
                cur_key = key
                cur_value = (pending_value + " " + right).strip()
                pending, pending_value = "", ""
            else:
                pending = cand
                pending_value = (pending_value + " " + right).strip()
        else:
            # Sin texto izquierdo: continuación envuelta del valor actual.
            if cur_key is not None:
                cur_value = (cur_value + " " + right).strip()
            elif pending:
                pending_value = (pending_value + " " + right).strip()
    if cur_key is not None:
        rows[cur_key] = cur_value
    # Etiquetas reconocidas pero sin valor importable no producen fila.
    return {k: v for k, v in rows.items() if k}


def split_location(value: str) -> Tuple[str, str]:
    """"Departamento / Ciudad" del informe viene pegado con espacio
    ('Cesar Valledupar'); se separa con el criterio del scraper si trae
    guion y, si no, departamento = todo menos la última palabra."""
    city, dept = GruplacNormalizer.split_city_department(value)
    if city and not dept:
        parts = city.split()
        if len(parts) >= 2:
            return parts[-1], " ".join(parts[:-1])
    return city, dept


def parse_creation_date(value: str) -> str:
    """El informe muestra 'YYYY-MM' (input type=month); tolera ISO completo y
    el 'YYYY - M' del visor Scienti."""
    s = GruplacNormalizer.normalize(value)
    if not s:
        return ""
    m = re.match(r"^(\d{4})-(\d{1,2})", s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}"
    return GruplacNormalizer.normalize_year_month(s)


def parse_basicos(lines: List[Dict[str, Any]]) -> Tuple[Dict[str, str], List[str]]:
    """Sección 'Datos básicos' -> dict group del DTO e instituciones asociadas."""
    kv = parse_kv_lines(lines)

    code = GruplacNormalizer.normalize(kv.get("external_code", "")).upper()
    if not COL_CODE_RE.match(code):
        raise PdfImportError(
            f"El PDF no trae un codigo GrupLAC valido (se espera 'COL...'): "
            f"'{code or '(ausente)'}'. El nro interno de Scienti no sirve como "
            "identidad (trampa de identidad COL vs nro)."
        )
    name = GruplacNormalizer.normalize(kv.get("name", ""))
    if not name:
        raise PdfImportError("El PDF no trae el nombre del grupo.")

    city, dept = split_location(kv.get("location", ""))
    inst_raw = kv.get("institution", "")
    institutions = [p.strip() for p in re.split(r"\s*\|\s*", inst_raw) if p.strip()]

    return {
        "external_code": code,
        "name": name,
        "leader_name": GruplacNormalizer.normalize(kv.get("leader_name", "")),
        "classification": GruplacNormalizer.normalize_classification(kv.get("classification", "")),
        "email": GruplacNormalizer.normalize(kv.get("email", "")),
        "website": GruplacNormalizer.normalize(kv.get("website", "")),
        "city": city,
        "department": dept,
        "declared_creation_date": parse_creation_date(kv.get("declared_creation_date", "")),
        "knowledge_area": GruplacNormalizer.normalize(kv.get("knowledge_area", "")),
    }, institutions
