import logging
from ..client import GruplacHttpClient as SourceValidator

logger = logging.getLogger("peai.cvlac")

CVLAC_URL_TEMPLATE = (
    "https://scienti.minciencias.gov.co/cvlac/visualizador/generarCurriculoCv.do?cod_rh={cod_rh}"
)


def fetch_cvlac_text(cod_rh: str) -> str:
    """
    Descarga la página pública del CvLAC para un cod_rh y devuelve su contenido
    HTML completo para CvParser.parse. Reutiliza la validación de dominio
    del módulo scraper (solo hosts Minciencias permitidos).
    """
    import requests

    normalized = "".join(c for c in (cod_rh or "") if c.isdigit()).zfill(10)
    if len(normalized) != 10:
        raise ValueError(f"cod_rh inválido: '{cod_rh}'")

    url = CVLAC_URL_TEMPLATE.format(cod_rh=normalized)
    SourceValidator.validate_source_url(url)

    headers = {
        "User-Agent": "Khemia Academic Research Importer/1.0 (Universidad Popular del Cesar; contact: vicerrectoria.investigacion@unicesar.edu.co)"
    }
    logger.info(f"Descargando CvLAC desde: {url}")
    resp = requests.get(url, headers=headers, timeout=(10, 30))
    resp.raise_for_status()
    # Scienti no siempre declara charset; forzar detección (las páginas vienen en Latin-1)
    resp.encoding = resp.apparent_encoding or "latin-1"
    html_content = resp.text

    if "Nombre" not in html_content or len(html_content) < 200:
        raise ValueError(
            "La página CvLAC no devolvió una hoja de vida válida (posible bloqueo o cod_rh inexistente)."
        )
    return html_content
