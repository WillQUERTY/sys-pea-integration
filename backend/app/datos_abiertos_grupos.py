"""
Búsqueda de grupos de investigación desde Datos Abiertos de Colombia (Socrata).

Fuente oficial: dataset «Grupos de Investigación Reconocidos» de Minciencias
(https://www.datos.gov.co/d/hrhc-c4wu). Permite al frontend ofrecer un buscador
de grupos (nombre, institución, departamento, clasificación) y obtener la URL
GrupLAC lista para vista previa/importación, en lugar de exigir pegar la URL.

Limitación: solo aparecen grupos RECONOCIDOS por convocatoria Minciencias;
los demás se importan con la URL manual.

No requiere scraping: es la API pública Socrata de datos.gov.co.
"""

import logging
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger("peai.datos_abiertos_grupos")

SOCRATA_GRUPOS = "https://www.datos.gov.co/resource/hrhc-c4wu.json"
REQUEST_TIMEOUT = 20

# El visor GrupLAC usa nro = dígitos del cod_grupo_gr ("COL0016283") con
# zfill(14). Es la operación inversa de la del parser (nro → COL{zfill(7)}).
GRUPLAC_VIEWER_BASE = "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro="


def _escape_soql(value: str) -> str:
    """Escapa comillas simples para interpolar seguro en un $where SoQL."""
    return (value or "").replace("'", "''")


def _digits(value: str) -> str:
    return "".join(c for c in (value or "") if c.isdigit())


def gruplac_url_from_code(cod_grupo_gr: str) -> str:
    """cod_grupo_gr ('COL0016283') o nro crudo → URL del visor GrupLAC."""
    digits = _digits(cod_grupo_gr)
    return f"{GRUPLAC_VIEWER_BASE}{digits.zfill(14)}"


def resolver_url_gruplac(url: Optional[str] = None, group_code: Optional[str] = None) -> str:
    """
    Devuelve la URL GrupLAC a partir de `url` (tal cual), `group_code`
    ('COL0016283') o nro crudo ('00000000016283').

    OJO: el nro de GrupLAC NO se deriva del cod_grupo_gr (p.ej. AITICE es
    COL0043834 pero su nro es 2668). Por eso, cuando llega un código COL, se
    consulta primero el buscador oficial de Scienti; solo si falla se usa el
    intento por dígitos (la validación posterior contra la página lo rechaza
    si no corresponde). ValueError si no se puede resolver.
    """
    url_resolved, via = resolver_url_gruplac_ex(url, group_code)
    return url_resolved


def resolver_url_gruplac_ex(url: Optional[str] = None, group_code: Optional[str] = None) -> "tuple[str, str]":
    """
    Igual que resolver_url_gruplac pero devuelve (url, via) donde via es
    'buscador' (resuelto por el buscador oficial: autoritativo), 'url' o
    'digitos' (intento débil: el caller debe validar contra la página).
    """
    digits = _digits(group_code or "")
    # Solo los códigos COL necesitan el buscador; un nro crudo se usa directo.
    if group_code and not group_code.strip().isdigit() and 0 < len(digits) <= 14:
        from .scraper import buscar_nro_gruplac  # diferido: scraper es pesado
        nro = buscar_nro_gruplac(codigo=group_code)
        if nro:
            return f"{GRUPLAC_VIEWER_BASE}{nro}", "buscador"
    if url and url.strip():
        return url.strip(), "url"
    if not digits or len(digits) > 14:
        raise ValueError(
            "Se requiere una URL GrupLAC, un código de grupo (ej. COL0016283) "
            "o un nro de GrupLAC."
        )
    return f"{GRUPLAC_VIEWER_BASE}{digits.zfill(14)}", "digitos"


def search_grupos(
    query: str = "",
    departamento: Optional[str] = None,
    institucion: Optional[str] = None,
    clasificacion: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """
    Busca grupos RECONOCIDOS en el dataset hrhc-c4wu por nombre y filtros
    opcionales. El dataset tiene una fila por grupo por convocatoria: se
    deduplica por cod_grupo_gr quedándose con la convocatoria más reciente.
    Devuelve [] si Socrata falla (el frontend muestra lista vacía).
    """
    where_parts = []
    if query and query.strip():
        q = _escape_soql(query.strip().upper())
        where_parts.append(f"upper(nme_grupo_gr) like '%{q}%'")
    if departamento and departamento.strip():
        where_parts.append(f"upper(nme_departamento_gr) like '%{_escape_soql(departamento.strip().upper())}%'")
    if institucion and institucion.strip():
        where_parts.append(f"upper(inst_aval) like '%{_escape_soql(institucion.strip().upper())}%'")
    if clasificacion and clasificacion.strip():
        where_parts.append(f"upper(nme_clasificacion_gr) like '%{_escape_soql(clasificacion.strip().upper())}%'")

    params = {
        "$select": (
            "cod_grupo_gr,nme_grupo_gr,inst_aval,nme_departamento_gr,"
            "nme_municipio_gr,nme_area_gr,nme_gran_area_gr,"
            "nme_clasificacion_gr,ano_convo"
        ),
        "$where": " AND ".join(where_parts) if where_parts else "1=1",
        "$order": "ano_convo DESC",
        "$limit": 2000,  # varias convocatorias por grupo; se deduplica local
    }
    try:
        resp = requests.get(SOCRATA_GRUPOS, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        rows = resp.json()
    except Exception as e:
        logger.warning(f"[DatosAbiertosGrupos] Error consultando Socrata: {e}")
        return []

    latest: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        code = row.get("cod_grupo_gr", "")
        if not code:
            continue
        prev = latest.get(code)
        # quedarnos con la convocatoria más reciente (años de 4 dígitos: max lexicográfico sirve)
        if not prev or (row.get("ano_convo") or "") > (prev.get("ano_convo") or ""):
            latest[code] = row

    results = []
    for code, record in latest.items():
        results.append({
            "cod_grupo": code,
            "nombre": record.get("nme_grupo_gr"),
            "institucion": record.get("inst_aval"),
            "departamento": record.get("nme_departamento_gr"),
            "municipio": record.get("nme_municipio_gr"),
            "area": record.get("nme_area_gr"),
            "gran_area": record.get("nme_gran_area_gr"),
            "clasificacion": record.get("nme_clasificacion_gr"),
            "ano_convo": record.get("ano_convo"),
            "gruplac_url": gruplac_url_from_code(code),
        })
    results.sort(key=lambda r: (r.get("nombre") or ""))
    return results[:limit]
