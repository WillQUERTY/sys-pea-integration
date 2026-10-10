"""
backend/tests/test_import_files_api.py
Pruebas TestClient de los endpoints de importacion por archivo (T-12/T-13):
/groups/import/csv(/preview) y /groups/import/pdf(/preview). Commit, scrape,
buscador y load_from_db van parcheados: sin red y sin escrituras. La BD real
solo se toca al importar backend.app.main, la misma convencion de los demas
tests de endpoints del repo.

Ejecutar desde la raiz del repo:
    python -m pytest backend/tests/test_import_files_api.py -v
"""

import io
import pathlib
import unittest
from unittest.mock import patch

from backend.app import repository
from backend.app.datos_abiertos_grupos import GRUPLAC_VIEWER_BASE
from backend.app.import_csv import MAX_GROUPS_PER_IMPORT

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "grupos_datos_gov.csv"
CSV_NAME = "grupos_datos_gov.csv"
PDF_NAME = "grupo_prueba.pdf"
PDF_CODE = "COL0098765"


def _fixture_bytes() -> bytes:
    """El CSV de Socrata baja con BOM; el fixture en disco es UTF-8 limpio."""
    return b"\xef\xbb\xbf" + FIXTURE.read_bytes()


def _mini_csv(n_groups: int) -> bytes:
    lines = ["cod_grupo_gr,nme_grupo_gr,ano_convo"]
    lines += [f"COL{i:07d},GRUPO {i},2024" for i in range(1, n_groups + 1)]
    return ("\n".join(lines) + "\n").encode("utf-8")


def _pdf_pairs(pairs) -> bytes:
    """PDF de una pagina: banner 'Datos basicos' + pares label(x=60)/valor(x=210)."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas as rl_canvas

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    y = A4[1] - 100
    c.drawString(60, y, "Datos básicos")
    y -= 20
    for label, value in pairs:
        c.drawString(60, y, label)
        if value is not None:
            c.drawString(210, y, value)
        y -= 20
    c.save()
    return buf.getvalue()


def _valid_pdf() -> bytes:
    return _pdf_pairs([
        ("Nombre del grupo", "GRUPO EN PDF"),
        ("Código GrupLAC", PDF_CODE),
    ])


def _conn_str() -> str:
    """La misma expresion que usan los endpoints de import."""
    from backend.app.config import settings
    return repository._active_connection_string or settings.connection_string


class TestCsvImportEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from fastapi.testclient import TestClient
        from backend.app.main import app
        cls.client = TestClient(app)

    def _post_csv(self, path, content, filename=CSV_NAME, data=None):
        return self.client.post(
            path, files={"file": (filename, content, "text/csv")}, data=data or {}
        )

    def test_preview_del_fixture(self):
        resp = self._post_csv("/api/v1/groups/import/csv/preview", _fixture_bytes())
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertEqual(body["status"], "preview")
        self.assertEqual(body["total_data_rows"], 6)
        self.assertEqual(body["distinct_groups"], 4)
        self.assertEqual(body["deduped_count"], 1)
        self.assertEqual(len(body["row_errors"]), 1)
        self.assertEqual(body["row_errors"][0]["line"], 6)
        aitice = body["rows"][0]
        self.assertNotIn("scraped", aitice)  # el DTO interno no se filtra al frontend
        self.assertEqual(aitice["external_code"], "COL0043834")
        self.assertEqual(aitice["ano_convo"], 2024)
        self.assertEqual(aitice["classification"], "A")

    def test_preview_archivo_vacio_es_400(self):
        resp = self._post_csv("/api/v1/groups/import/csv/preview", b"")
        self.assertEqual(resp.status_code, 400, resp.text)
        self.assertIn("vacio", resp.json()["detail"].lower())

    def test_preview_columnas_faltantes_es_400(self):
        resp = self._post_csv("/api/v1/groups/import/csv/preview",
                              b"id_convocatoria,nme_grupo_gr\n1,GRUPO\n")
        self.assertEqual(resp.status_code, 400, resp.text)
        self.assertIn("cod_grupo_gr", resp.json()["detail"])

    def test_preview_sobre_el_tope_es_400(self):
        resp = self._post_csv("/api/v1/groups/import/csv/preview",
                              _mini_csv(MAX_GROUPS_PER_IMPORT + 1))
        self.assertEqual(resp.status_code, 400, resp.text)
        self.assertIn("Filtra la descarga", resp.json()["detail"])

    def test_import_sin_enrich_comete_por_fila_y_recarga_una_vez(self):
        with patch("backend.app.scraper.GruplacCommitService.commit") as commit, \
             patch("backend.app.repository.load_from_db") as reload:
            resp = self._post_csv("/api/v1/groups/import/csv", _fixture_bytes(),
                                  data={"enrich_gruplac": "false"})
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertEqual(body["status"], "completed")
        self.assertEqual(body["summary"],
                         {"total": 4, "enriched": 0, "file_data": 4, "failed": 0})
        self.assertEqual(len(body["row_errors"]), 1)  # la fila invalida del fixture
        self.assertTrue(body["ram_reloaded"])
        self.assertEqual(commit.call_count, 4)
        reload.assert_called_once_with(_conn_str())  # UNA recarga, no una por fila
        first = commit.call_args_list[0]
        self.assertEqual(first.args[0].group["external_code"], "COL0043834")
        self.assertEqual(first.kwargs["db_conn_str"], _conn_str())
        self.assertEqual(first.kwargs["source_type"], "csv")
        self.assertEqual(first.kwargs["source_url"], f"csv:{CSV_NAME}:COL0043834")
        self.assertFalse(first.kwargs["reload_ram"])

    def test_import_con_enrich_resuelve_por_buscador(self):
        one_row = b"cod_grupo_gr,nme_grupo_gr,ano_convo\nCOL0099999,UNICO,2024\n"
        with patch("backend.app.scraper.buscar_nro_gruplac", return_value="2668") as buscar, \
             patch("backend.app.scraper.scrape_gruplac") as scrape, \
             patch("backend.app.scraper.GruplacCommitService.commit") as commit, \
             patch("backend.app.repository.load_from_db"):
            resp = self._post_csv("/api/v1/groups/import/csv", one_row,
                                  filename="un_grupo.csv",
                                  data={"enrich_gruplac": "true"})
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertEqual(body["summary"],
                         {"total": 1, "enriched": 1, "file_data": 0, "failed": 0})
        self.assertEqual(body["results"][0]["status"], "enriched")
        buscar.assert_called_once_with(codigo="COL0099999")
        scrape.assert_called_once_with(
            GRUPLAC_VIEWER_BASE + "2668",
            db_conn_str=_conn_str(),
            expected_group_code="",
            source_type="csv",
            source_url="csv:un_grupo.csv:COL0099999",
            reload_ram=False,
        )
        commit.assert_not_called()  # el scrape ya persistio todo

    def test_import_archivo_invalido_es_400(self):
        resp = self._post_csv("/api/v1/groups/import/csv", b"id,nme\n1,x\n")
        self.assertEqual(resp.status_code, 400, resp.text)


class TestPdfImportEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from fastapi.testclient import TestClient
        from backend.app.main import app
        cls.client = TestClient(app)

    def _post_pdf(self, path, content, filename=PDF_NAME):
        return self.client.post(
            path, files={"file": (filename, content, "application/pdf")}
        )

    def test_preview_mismo_shape_que_gruplac(self):
        resp = self._post_pdf("/api/v1/groups/import/pdf/preview", _valid_pdf())
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertEqual(body["status"], "preview")
        self.assertEqual(body["group"]["external_code"], PDF_CODE)
        self.assertEqual(body["group"]["name"], "GRUPO EN PDF")
        self.assertEqual(body["members"], [])
        self.assertEqual(body["products"], [])
        self.assertEqual(body["counts"]["members"], 0)
        self.assertTrue(any("integrantes" in w for w in body["warnings"]))

    def test_import_comete_con_source_pdf(self):
        with patch("backend.app.scraper.GruplacCommitService.commit",
                   return_value={"status": "success", "group_id": 1}) as commit, \
             patch("backend.app.repository.load_from_db") as reload:
            resp = self._post_pdf("/api/v1/groups/import/pdf", _valid_pdf())
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertEqual(body["status"], "success")
        self.assertTrue(body["ram_reloaded"])
        reload.assert_called_once_with(_conn_str())
        self.assertEqual(commit.call_count, 1)
        data = commit.call_args.args[0]
        self.assertEqual(data.group["external_code"], PDF_CODE)
        self.assertEqual(commit.call_args.kwargs["db_conn_str"], _conn_str())
        self.assertEqual(commit.call_args.kwargs["source_type"], "pdf")
        self.assertEqual(commit.call_args.kwargs["source_url"], f"pdf:{PDF_NAME}")
        self.assertFalse(commit.call_args.kwargs["reload_ram"])

    def test_preview_no_es_pdf_es_400(self):
        resp = self._post_pdf("/api/v1/groups/import/pdf/preview", b"esto no es un pdf")
        self.assertEqual(resp.status_code, 400, resp.text)

    def test_nro_pelado_se_rechaza(self):
        # Trampa de identidad: 2668 es el nro de Scienti, NO un codigo COL.
        pdf = _pdf_pairs([("Nombre del grupo", "AITICE"),
                          ("Código GrupLAC", "2668")])
        resp = self._post_pdf("/api/v1/groups/import/pdf", pdf)
        self.assertEqual(resp.status_code, 400, resp.text)
        self.assertIn("codigo GrupLAC", resp.json()["detail"])


if __name__ == "__main__":
    unittest.main()
