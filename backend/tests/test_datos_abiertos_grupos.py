"""
backend/tests/test_datos_abiertos_grupos.py
Pruebas del buscador de grupos sobre datos abiertos (Socrata hrhc-c4wu) y del
resolver de URL GrupLAC. Se mockea requests.get: no requieren red.

Ejecutar desde la raíz del repo:
    backend/venv/Scripts/python.exe -m unittest discover -s backend/tests -v
"""

import unittest
from unittest.mock import patch, MagicMock

import requests

from backend.app.datos_abiertos_grupos import (
    gruplac_url_from_code,
    resolver_url_gruplac,
    search_grupos,
)

VIEWER = "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro="


class TestGruplacUrlFromCode(unittest.TestCase):
    def test_codigo_col(self):
        self.assertEqual(
            gruplac_url_from_code("COL0016283"),
            VIEWER + "00000000016283",
        )

    def test_nro_corto(self):
        self.assertEqual(gruplac_url_from_code("2093"), VIEWER + "00000000002093")

    def test_nro_largo_intacto(self):
        self.assertEqual(
            gruplac_url_from_code("00000000002093"), VIEWER + "00000000002093"
        )


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


def _socrata_response(rows):
    resp = MagicMock()
    resp.json.return_value = rows
    resp.raise_for_status.return_value = None
    return resp


def _row(cod, nombre, ano, inst="UPC", depto="CESAR", clasif="A"):
    return {
        "cod_grupo_gr": cod,
        "nme_grupo_gr": nombre,
        "inst_aval": inst,
        "nme_departamento_gr": depto,
        "nme_municipio_gr": "VALLEDUPAR",
        "nme_area_gr": "CIENCIAS NATURALES",
        "nme_gran_area_gr": "CIENCIAS NATURALES",
        "nme_clasificacion_gr": clasif,
        "ano_convo": ano,
    }


class TestSearchGrupos(unittest.TestCase):
    @patch("backend.app.datos_abiertos_grupos.requests.get")
    def test_dedupes_convocatorias(self, mock_get):
        mock_get.return_value = _socrata_response([
            _row("COL0016283", "GIIS", "2017"),
            _row("COL0016283", "GIIS", "2021"),
            _row("COL0002093", "GICOM", "2019"),
        ])
        results = search_grupos("G")
        self.assertEqual(len(results), 2)
        giis = next(r for r in results if r["cod_grupo"] == "COL0016283")
        self.assertEqual(giis["ano_convo"], "2021", "debe quedarse con la convocatoria más reciente")
        self.assertEqual(giis["gruplac_url"], VIEWER + "00000000016283")

    @patch("backend.app.datos_abiertos_grupos.requests.get")
    def test_escapa_comillas(self, mock_get):
        mock_get.return_value = _socrata_response([])
        search_grupos("O'Brien")
        params = mock_get.call_args.kwargs["params"]
        self.assertIn("O''BRIEN", params["$where"])  # comillas duplicadas (query va en mayúsculas)

    @patch("backend.app.datos_abiertos_grupos.requests.get")
    def test_filtros_opcionales_en_where(self, mock_get):
        mock_get.return_value = _socrata_response([])
        search_grupos("", departamento="cesar", clasificacion="a1")
        where = mock_get.call_args.kwargs["params"]["$where"]
        self.assertIn("upper(nme_departamento_gr) like '%CESAR%'", where)
        self.assertIn("upper(nme_clasificacion_gr) like '%A1%'", where)
        self.assertNotIn("nme_grupo_gr", where, "sin query no debe filtrar por nombre")

    @patch("backend.app.datos_abiertos_grupos.requests.get")
    def test_error_http_devuelve_vacio(self, mock_get):
        mock_get.side_effect = requests.RequestException("timeout")
        self.assertEqual(search_grupos("cesar"), [])


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

    @patch("backend.app.scraper.scrape_gruplac")
    def test_preview_sin_url_ni_codigo_es_400(self, mock_scrape):
        from fastapi.testclient import TestClient
        from backend.app.main import app

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
