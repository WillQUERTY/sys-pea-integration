import re
from typing import Any, Callable, Dict, List, Optional
import requests
from bs4 import BeautifulSoup

from .constants import GRUPLAC_SEARCH_URL, logger
from .normalizer import GruplacNormalizer


def _busqueda_gruplac_html(fields: Dict[str, str]) -> Optional[str]:
    """
    Ejecuta el formulario del buscador oficial de Scienti y devuelve el HTML
    de resultados. El buscador exige la sesión del GET inicial (cookies).
    """
    base_fields = {
        "codIdGrupo": "", "nmeGrupo": "", "nmeLider": "", "genLider": "",
        "areaConocimiento": "", "annoCreacion": "", "status": "",
        "nmeInstitucion": "", "ciuInst": "", "depInst": "",
        "progNacional": "", "progNacionalSec": "", "integrantes": "",
        "proyectos": "", "productos": "",
    }
    try:
        session = requests.Session()
        session.get(GRUPLAC_SEARCH_URL, params={"buscar": "sinBuscar"}, timeout=20)
        resp = session.post(GRUPLAC_SEARCH_URL, params={"buscar": "buscar"}, data={**base_fields, **fields}, timeout=30)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding or "latin1"
        return resp.text
    except Exception as e:
        logger.warning(f"[GrupLAC] Buscador Scienti falló ({fields}): {e}")
        return None


def buscar_nro_gruplac(
    nombre: str = "",
    codigo: str = "",
    search_fn: Optional[Callable[[Dict[str, str]], Optional[str]]] = None
) -> Optional[str]:
    """
    Resuelve el nro interno de GrupLAC de un grupo usando el buscador oficial
    de Scienti (busquedaAvanzadaGrupos.do).
    """
    fn = search_fn or _busqueda_gruplac_html
    digits = "".join(c for c in (codigo or "") if c.isdigit())
    attempts = []
    if codigo:
        attempts.append({"codIdGrupo": codigo})
        if digits and digits != codigo:
            attempts.append({"codIdGrupo": digits})
    if nombre:
        attempts.append({"nmeGrupo": nombre})
    for fields in attempts:
        html = fn(fields)
        if html:
            m = re.search(r"nro=(\d+)", html)
            if m:
                return m.group(1)
    return None


def buscar_grupos_scienti(
    nombre: str = "",
    institucion: str = "",
    departamento: str = "",
    clasificacion: str = "",
    limit: int = 50,
    search_fn: Optional[Callable[[Dict[str, str]], Optional[str]]] = None
) -> List[Dict[str, Any]]:
    """
    Busca grupos en el buscador oficial de Scienti por nombre, institución y
    departamento, y opcionalmente filtra por clasificación.
    """
    fn = search_fn or _busqueda_gruplac_html
    html = fn({
        "nmeGrupo": nombre or "",
        "nmeInstitucion": institucion or "",
        "depInst": departamento or "",
    })
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    results: List[Dict[str, Any]] = []
    seen = set()
    for row in soup.select("table#gruposAvanzada tr"):
        a = row.find("a", href=re.compile(r"visualizagr\.jsp\?nro="))
        if not a:
            continue
        m = re.search(r"nro=(\d+)", a["href"])
        if not m or m.group(1) in seen:
            continue
        nro = m.group(1)
        seen.add(nro)
        tds = [td.get_text(strip=True) for td in row.find_all("td")]
        cod = next((t for t in tds if re.fullmatch(r"COL\d+", t)), "")
        categoria = next((t for t in tds if "CATEGORIA" in t.upper()), "")
        convocatoria = next((t for t in tds if "CONVOCATORIA" in t.upper()), "")
        results.append({
            "cod_grupo": cod,
            "nombre": GruplacNormalizer.normalize(a.get_text(strip=True)),
            "nro": nro,
            "clasificacion": categoria.replace("CATEGORIA", "").replace("CATEGORÍA", "").strip(),
            "convocatoria": convocatoria,
            "institucion": institucion or None,
            "departamento": departamento or None,
            "gruplac_url": f"https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro={nro}",
        })
    if clasificacion:
        cf = clasificacion.strip().upper()
        results = [r for r in results if cf in (r["clasificacion"] or "").upper()]
    return results[:limit]
