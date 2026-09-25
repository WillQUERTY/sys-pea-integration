"""
backend/tests/test_datos_abiertos_grupos.py
Pruebas del resolver de URL GrupLAC (datos_abiertos_grupos) y del buscador
oficial de Scienti (scraper.buscar_grupos_scienti). Todo mockeado: sin red.

Ejecutar desde la raíz del repo:
    backend/venv/Scripts/python.exe -m unittest discover -s backend/tests -v
"""

import unittest
from unittest.mock import patch, MagicMock

from backend.app.datos_abiertos_grupos import (
    gruplac_url_from_code,
    resolver_url_gruplac,
)

VIEWER = "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro="

# HTML mínimo con la estructura real de resultados del buscador Scienti
# (tabla#gruposAvanzada: fila con enlace nro=, código COL, CATEGORIA y CONVOCATORIA)
SEARCH_HTML = """
<html><body>
<table id="gruposAvanzada" class="tabla">
  <tr class="header"><td>Grupo</td><td>Código</td><td>Clasif.</td><td>Conv.</td></tr>
  <tr class="row1">
    <td align="left"><a href="visualizagr.jsp?nro=00000000002668" target="_blank">AITICE</a></td>
    <td>COL0043834</td>
    <td>2 de 2</td>
    <td>CATEGORIA B</td>
    <td>CONVOCATORIA 957 DE 2024</td>
  </tr>
  <tr class="row0">
    <td align="left"><a href="visualizagr.jsp?nro=00000000002668" target="_blank">AITICE</a></td>
    <td>COL0043834</td><td></td><td>CATEGORIA B</td><td>CONVOCATORIA 894 DE 2021</td>
  </tr>
  <tr class="row1">
    <td align="left"><a href="visualizagr.jsp?nro=00000000002093" target="_blank">GRUPO DE ÓPTICA</a></td>
    <td>COL0002093</td><td></td><td>CATEGORIA A1</td><td>CONVOCATORIA 957 DE 2024</td>
  </tr>
</table>
</body></html>
"""


class TestGruplacUrlFromCode(unittest.TestCase):
    def test_codigo_col(self):
        self.assertEqual(
            gruplac_url_from_code("COL0016283"),
            VIEWER + "00000000016283",
        )

    def test_nro_corto(self):
        self.assertEqual(gruplac_url_from_code("2093"), VIEWER + "00000000002093")


class TestResolverUrlGruplac(unittest.TestCase):
    def test_url_pasa_tal_cual(self):
        url = "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=123"
        self.assertEqual(resolver_url_gruplac(url=url), url)

    @patch("backend.app.scraper.buscar_nro_gruplac")
    def test_group_code_usa_buscador(self, mock_buscar):
        # El nro NO se deriva del código: AITICE es COL0043834 pero nro 2668
        mock_buscar.return_value = "00000000002668"
        self.assertEqual(
            resolver_url_gruplac(url=VIEWER + "0000000043834", group_code="COL0043834"),
            VIEWER + "00000000002668",
        )
        mock_buscar.assert_called_once()

    @patch("backend.app.scraper.buscar_nro_gruplac")
    def test_group_code_fallback_digitos(self, mock_buscar):
        # Si el buscador no resuelve, se cae al intento por dígitos
        mock_buscar.return_value = None
        self.assertEqual(
            resolver_url_gruplac(group_code="COL0016283"),
            VIEWER + "00000000016283",
        )

    @patch("backend.app.scraper.buscar_nro_gruplac")
    def test_nro_crudo_no_consulta_buscador(self, mock_buscar):
        self.assertEqual(resolver_url_gruplac(group_code="16283"), VIEWER + "00000000016283")
        mock_buscar.assert_not_called()

    def test_sin_parametros_falla(self):
        with self.assertRaises(ValueError):
            resolver_url_gruplac()
        with self.assertRaises(ValueError):
            resolver_url_gruplac(url="  ", group_code="")


class TestBuscarGruposScienti(unittest.TestCase):
    @patch("backend.app.scraper._busqueda_gruplac_html")
    def test_parsea_resultados(self, mock_html):
        from backend.app.scraper import buscar_grupos_scienti
        mock_html.return_value = SEARCH_HTML
        results = buscar_grupos_scienti(nombre="AITICE")
        self.assertEqual(len(results), 2, "el nro repetido (varias convocatorias) se deduplica")
        aitice = next(r for r in results if r["nro"] == "00000000002668")
        self.assertEqual(aitice["cod_grupo"], "COL0043834")
        self.assertEqual(aitice["nombre"], "AITICE")
        self.assertEqual(aitice["clasificacion"], "B")
        self.assertEqual(aitice["gruplac_url"], VIEWER + "00000000002668")

    @patch("backend.app.scraper._busqueda_gruplac_html")
    def test_filtro_clasificacion(self, mock_html):
        from backend.app.scraper import buscar_grupos_scienti
        mock_html.return_value = SEARCH_HTML
        results = buscar_grupos_scienti(nombre="", clasificacion="A1")
        self.assertEqual([r["cod_grupo"] for r in results], ["COL0002093"])

    @patch("backend.app.scraper._busqueda_gruplac_html")
    def test_error_devuelve_vacio(self, mock_html):
        from backend.app.scraper import buscar_grupos_scienti
        mock_html.return_value = None
        self.assertEqual(buscar_grupos_scienti(nombre="x"), [])

    @patch("backend.app.scraper._busqueda_gruplac_html")
    def test_buscar_nro_por_codigo(self, mock_html):
        from backend.app.scraper import buscar_nro_gruplac
        mock_html.return_value = SEARCH_HTML
        self.assertEqual(buscar_nro_gruplac(codigo="COL0043834"), "00000000002668")


class TestEndpointResolver(unittest.TestCase):
    """El endpoint de preview resuelve group_code → URL antes de scrapear."""

    @patch("backend.app.scraper.buscar_nro_gruplac")
    @patch("backend.app.scraper.scrape_gruplac")
    def test_preview_con_group_code(self, mock_scrape, mock_buscar):
        from fastapi.testclient import TestClient
        from backend.app.main import app

        mock_buscar.return_value = "00000000002093"
        mock_scrape.return_value = {"group": {}, "counts": {}, "warnings": []}
        client = TestClient(app)
        resp = client.post(
            "/api/v1/groups/import/gruplac/preview",
            json={"group_code": "COL0002093"},
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        used_url = mock_scrape.call_args.args[0]
        self.assertEqual(used_url, VIEWER + "00000000002093")

    @patch("backend.app.scraper.buscar_nro_gruplac")
    @patch("backend.app.scraper.scrape_gruplac")
    def test_preview_sin_url_ni_codigo_es_400(self, mock_scrape, mock_buscar):
        from fastapi.testclient import TestClient
        from backend.app.main import app

        mock_buscar.return_value = None
        client = TestClient(app)
        resp = client.post("/api/v1/groups/import/gruplac/preview", json={})
        self.assertEqual(resp.status_code, 400)
        mock_scrape.assert_not_called()


class TestPaginaInvalida(unittest.TestCase):
    """Un nro inexistente devuelve una plantilla vacía: debe fallar, no crear
    un 'Grupo Sin Nombre' fantasma."""

    EMPTY_PAGE = "<html><body><table><tr><td>GrupLAC</td></tr></table></body></html>"

    def test_parse_sin_datos_falla(self):
        from backend.app.scraper import GruplacHtmlParser
        with self.assertRaises(ValueError):
            GruplacHtmlParser.parse(
                self.EMPTY_PAGE,
                source_url="https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000043834",
            )

    @patch("backend.app.scraper.GruplacHttpClient.fetch")
    def test_codigo_esperado_no_coincide_falla(self, mock_fetch):
        from backend.app.scraper import scrape_gruplac
        mock_fetch.return_value = (
            "<html><body><span class='celdaEncabezado'>OTRO GRUPO</span>"
            "<table><tr><td>Código</td><td>COL0002093</td></tr></table></body></html>"
        )
        with self.assertRaises(ValueError):
            scrape_gruplac(
                "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000002093",
                preview=True,
                expected_group_code="COL0043834",
            )


if __name__ == "__main__":
    unittest.main()
