"""
Resolución de URLs GrupLAC a partir de códigos de grupo.

Scienti es la única fuente de verdad para la identidad de grupos: el nro
interno de GrupLAC NO se deriva del cod_grupo_gr de datos abiertos
(p.ej. AITICE es COL0043834 en Socrata pero su página es nro=2668), así que
los códigos COL se resuelven consultando el buscador oficial de Scienti.

La búsqueda de grupos vive en scraper.buscar_grupos_scienti; el dataset
Socrata hrhc-c4wu ya no se usa para esto (generaba identidad duplicada).
"""

import logging
from typing import Optional

logger = logging.getLogger("peai.datos_abiertos_grupos")

GRUPLAC_VIEWER_BASE = "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro="


def _digits(value: str) -> str:
    return "".join(c for c in (value or "") if c.isdigit())


def gruplac_url_from_code(cod_grupo_gr: str) -> str:
    """cod_grupo_gr ('COL0016283') o nro crudo → URL del visor GrupLAC
    (intento por dígitos; preferir resolver_url_gruplac con buscador)."""
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
    url_resolved, _via = resolver_url_gruplac_ex(url, group_code)
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
