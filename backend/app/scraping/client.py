import os
from urllib.parse import urlparse
import requests

from .constants import ALLOWED_HOSTS, logger


class GruplacHttpClient:
    @staticmethod
    def validate_source_url(url: str):
        parsed = urlparse(url)
        if parsed.hostname not in ALLOWED_HOSTS:
            raise ValueError(f"Dominio no permitido para importacion: '{parsed.hostname}'.")
        is_local = parsed.hostname in {"localhost", "127.0.0.1"}
        allow_insecure_local = os.environ.get("PEAI_ALLOW_INSECURE_LOCAL", "false").lower() == "true"
        if parsed.scheme != "https" and not (is_local and allow_insecure_local):
            raise ValueError("HTTPS es obligatorio. HTTP local requiere PEAI_ALLOW_INSECURE_LOCAL=true.")

    @classmethod
    def fetch(cls, url: str) -> str:
        cls.validate_source_url(url)
        headers = {
            "User-Agent": "Khemia Academic Research Importer/1.0 (Universidad Popular del Cesar; contact: vicerrectoria.investigacion@unicesar.edu.co)"
        }
        logger.info(f"Descargando fuente GrupLAC desde: {url}")
        resp = requests.get(url, headers=headers, timeout=(10, 30))
        resp.raise_for_status()

        # Minciencias generalmente usa ISO-8859-1 en JSP
        resp.encoding = resp.apparent_encoding or resp.encoding or "ISO-8859-1"
        return resp.text
