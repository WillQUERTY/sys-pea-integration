"""
backend/tests/test_import_csv.py
Pruebas del importador CSV de grupos (T-12): parser del dataset oficial de
datos.gov.co (Socrata hrhc-c4wu) y loop de importacion con enriquecimiento
GrupLAC opcional. Todo mockeado: sin red, sin BD.

Ejecutar desde la raiz del repo:
    python -m pytest backend/tests/test_import_csv.py -v
"""

import os
import pathlib
import unittest
from unittest.mock import MagicMock, patch

from backend.app import scraper
from backend.app.datos_abiertos_grupos import GRUPLAC_VIEWER_BASE
from backend.app.import_csv import (
    MAX_GROUPS_PER_IMPORT,
    CsvImportError,
    import_csv_rows,
    parse_csv_grupos,
)

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "grupos_datos_gov.csv"

# Codigos presentes en el fixture (los 3 ultimos son sinteticos y unicos:
# no colisionan con los grupos reales de la BD local).
COD_AITICE = "COL0043834"
COD_SINTETICOS = ("COL0099001", "COL0099002", "COL0099003")


def _fixture_bytes(with_bom: bool = True) -> bytes:
    """El CSV de Socrata baja con BOM; el fixture en disco es UTF-8 limpio."""
    data = FIXTURE.read_bytes()
    return b"\xef\xbb\xbf" + data if with_bom else data


def _mini_csv(n_groups: int) -> bytes:
    """CSV minimo (solo columnas obligatorias) con n grupos distintos."""
    lines = ["cod_grupo_gr,nme_grupo_gr,ano_convo"]
    lines += [f"COL{i:07d},GRUPO SINÓNIMO {i},2024" for i in range(1, n_groups + 1)]
    return ("\n".join(lines) + "\n").encode("utf-8")


class TestCsvParser(unittest.TestCase):
    def test_fixture_parsea_dedupea_y_reporta_errores(self):
        result = parse_csv_grupos(_fixture_bytes())
        self.assertEqual(result.total_data_rows, 6)
        self.assertEqual(result.distinct_groups, 4)
        self.assertEqual(result.deduped_count, 1)  # AITICE 2021 sobrevivido por 2024
        self.assertEqual(len(result.row_errors), 1)
        self.assertEqual(result.row_errors[0]["line"], 6)  # fila sin prefijo COL
        self.assertIn("codigo de grupo invalido", result.row_errors[0]["error"])
        codes = {r["external_code"] for r in result.rows}
        self.assertEqual(codes, {COD_AITICE, *COD_SINTETICOS})

    def test_dedupe_conserva_convocatoria_mas_reciente(self):
        result = parse_csv_grupos(_fixture_bytes())
        aitice = next(r for r in result.rows if r["external_code"] == COD_AITICE)
        self.assertEqual(aitice["ano_convo"], 2024)
        # La convocatoria 2024 trae clasificacion A; la 2021 traia B.
        self.assertEqual(aitice["classification"], "A")
        self.assertEqual(aitice["declared_creation_date"], "1993-02")

    def test_dedupe_empate_queda_la_ultima_fila(self):
        csv_bytes = (
            "cod_grupo_gr,nme_grupo_gr,ano_convo\n"
            "COL0099999,NOMBRE VIEJO,2024\n"
            "COL0099999,NOMBRE NUEVO,2024\n"
        ).encode("utf-8")
        result = parse_csv_grupos(csv_bytes)
        self.assertEqual(result.distinct_groups, 1)
        self.assertEqual(result.rows[0]["name"], "NOMBRE NUEVO")

    def test_normalizacion_de_ubicacion_e_institucion(self):
        result = parse_csv_grupos(_fixture_bytes())
        biat = next(r for r in result.rows if r["external_code"] == "COL0099001")
        # Variantes "Bogota, D. C." vs "Bogota, D.C." sobreviven intactas.
        self.assertEqual(biat["city"], "Bogotá, D. C.")
        self.assertEqual(biat["department"], "Bogotá, D.C.")
        self.assertEqual(biat["institutions"], ["Universidad Nacional de Colombia"])
        self.assertEqual(biat["knowledge_area"], "Ciencias Naturales y Exactas")
        self.assertEqual(biat["declared_creation_date"], "2015-03")

    def test_no_registra_queda_vacio(self):
        result = parse_csv_grupos(_fixture_bytes())
        estudios = next(r for r in result.rows if r["external_code"] == "COL0099002")
        self.assertEqual(estudios["declared_creation_date"], "")
        self.assertEqual(estudios["classification"], "")

    def test_fecha_iso_socrata_con_milisegundos(self):
        result = parse_csv_grupos(_fixture_bytes())
        optica = next(r for r in result.rows if r["external_code"] == "COL0099003")
        self.assertEqual(optica["declared_creation_date"], "2010-07")
        self.assertEqual(optica["classification"], "C")

    def test_decode_latin1_de_respaldo(self):
        # Exportaciones con acentos destrozados siguen parseando.
        latin1_bytes = FIXTURE.read_bytes().decode("utf-8").encode("latin-1")
        result = parse_csv_grupos(latin1_bytes)
        self.assertEqual(result.distinct_groups, 4)

    def test_lleva_dto_scraped_para_el_commit(self):
        entry = parse_csv_grupos(_fixture_bytes()).rows[0]
        self.assertIsInstance(entry["scraped"], scraper.ScrapedGroupData)
        self.assertEqual(entry["scraped"].group["external_code"], entry["external_code"])
        self.assertEqual(entry["scraped"].institutions, entry["institutions"])
        self.assertEqual(entry["scraped"].members, [])

    def test_archivo_vacio(self):
        with self.assertRaises(CsvImportError):
            parse_csv_grupos(b"")
        with self.assertRaises(CsvImportError):
            parse_csv_grupos(b"   \n  \n")

    def test_faltan_columnas_obligatorias(self):
        with self.assertRaises(CsvImportError) as ctx:
            parse_csv_grupos(b"id_convocatoria,nme_grupo_gr\n1,GRUPO\n")
        self.assertIn("cod_grupo_gr", str(ctx.exception))

    def test_sin_filas_de_datos(self):
        with self.assertRaises(CsvImportError) as ctx:
            parse_csv_grupos(b"cod_grupo_gr,nme_grupo_gr\n")
        self.assertIn("filas", str(ctx.exception))

    def test_solo_filas_invalidas(self):
        csv_bytes = b"cod_grupo_gr,nme_grupo_gr\n1234567,SIN COL\n"
        with self.assertRaises(CsvImportError):
            parse_csv_grupos(csv_bytes)

    def test_tope_maximo_de_grupos(self):
        with self.assertRaises(CsvImportError) as ctx:
            parse_csv_grupos(_mini_csv(MAX_GROUPS_PER_IMPORT + 1))
        self.assertIn("Filtra la descarga", str(ctx.exception))
        # Exactamente en el tope pasa.
        self.assertEqual(parse_csv_grupos(_mini_csv(MAX_GROUPS_PER_IMPORT)).distinct_groups,
                         MAX_GROUPS_PER_IMPORT)


class TestImportCsvRows(unittest.TestCase):
    def setUp(self):
        self.entries = parse_csv_grupos(_fixture_bytes()).rows
        self.aitice = next(r for r in self.entries if r["external_code"] == COD_AITICE)

    def _commit_patch(self):
        return patch.object(scraper.GruplacCommitService, "commit")

    def test_sin_enrich_commit_de_datos_del_archivo_por_fila(self):
        with self._commit_patch() as commit:
            out = import_csv_rows(self.entries, db_conn_str="", enrich_gruplac=False)
        self.assertEqual(out["summary"], {"total": 4, "enriched": 0, "file_data": 4, "failed": 0})
        self.assertEqual(commit.call_count, 4)
        first = commit.call_args_list[0]
        self.assertEqual(first.args[0].group["external_code"], COD_AITICE)
        self.assertEqual(first.kwargs["source_type"], "csv")
        self.assertEqual(first.kwargs["db_conn_str"], "")
        self.assertFalse(first.kwargs["reload_ram"])
        self.assertTrue(all(c.kwargs["source_url"].startswith("csv:") for c in commit.call_args_list))

    def test_source_name_queda_en_source_url(self):
        with self._commit_patch() as commit:
            import_csv_rows(self.entries, source_name="grupos_cesar.csv")
        self.assertEqual(commit.call_args_list[0].kwargs["source_url"],
                         f"csv:grupos_cesar.csv:{COD_AITICE}")

    def test_enrich_buscador_resuelve_scrapea_gruplac(self):
        with patch.object(scraper, "buscar_nro_gruplac", return_value="2668") as buscar, \
             patch.object(scraper, "scrape_gruplac") as scrape, \
             self._commit_patch() as commit:
            out = import_csv_rows([self.aitice], enrich_gruplac=True, delay_seconds=0)
        buscar.assert_called_once_with(codigo=COD_AITICE)
        scrape.assert_called_once_with(
            GRUPLAC_VIEWER_BASE + "2668",
            db_conn_str="",
            expected_group_code="",
            source_type="csv",
            source_url=f"csv:{COD_AITICE}",
            reload_ram=False,
        )
        commit.assert_not_called()  # el scrape ya persistio todo
        self.assertEqual(out["summary"], {"total": 1, "enriched": 1, "file_data": 0, "failed": 0})
        self.assertEqual(out["results"][0]["status"], "enriched")

    def test_enrich_buscador_sin_resultado_cae_a_datos_del_archivo(self):
        with patch.object(scraper, "buscar_nro_gruplac", return_value=None), \
             patch.object(scraper, "scrape_gruplac") as scrape, \
             self._commit_patch() as commit:
            out = import_csv_rows([self.aitice], enrich_gruplac=True, delay_seconds=0)
        scrape.assert_not_called()
        commit.assert_called_once()
        self.assertEqual(out["results"][0]["status"], "file_data")

    def test_enrich_buscador_explota_cae_a_datos_del_archivo(self):
        with patch.object(scraper, "buscar_nro_gruplac", side_effect=RuntimeError("timeout")), \
             patch.object(scraper, "scrape_gruplac") as scrape, \
             self._commit_patch() as commit:
            out = import_csv_rows([self.aitice], enrich_gruplac=True, delay_seconds=0)
        scrape.assert_not_called()
        commit.assert_called_once()
        self.assertEqual(out["results"][0]["status"], "file_data")
        self.assertIn("buscador fallo", out["results"][0]["detail"])

    def test_enrich_scrape_falla_cae_a_datos_del_archivo(self):
        with patch.object(scraper, "buscar_nro_gruplac", return_value="2668"), \
             patch.object(scraper, "scrape_gruplac", side_effect=ValueError("pagina de otro grupo")), \
             self._commit_patch() as commit:
            out = import_csv_rows([self.aitice], enrich_gruplac=True, delay_seconds=0)
        commit.assert_called_once()
        self.assertEqual(out["results"][0]["status"], "file_data")
        self.assertIn("scrape GrupLAC fallo", out["results"][0]["detail"])

    def test_fila_fallida_no_aborta_el_lote(self):
        with self._commit_patch() as commit:
            commit.side_effect = [Exception("boom"), None, None, None]
            out = import_csv_rows(self.entries, enrich_gruplac=False)
        self.assertEqual(out["summary"]["failed"], 1)
        self.assertEqual(out["summary"]["file_data"], 3)
        self.assertEqual(commit.call_count, 4)

    def test_delay_solo_aplica_con_enrich(self):
        with patch("backend.app.import_csv.time") as time_mock, \
             self._commit_patch():
            import_csv_rows(self.entries, enrich_gruplac=False, delay_seconds=5)
        time_mock.sleep.assert_not_called()

        with patch("backend.app.import_csv.time") as time_mock, \
             patch.object(scraper, "buscar_nro_gruplac", return_value=None), \
             self._commit_patch():
            import_csv_rows(self.entries[:2], enrich_gruplac=True, delay_seconds=1)
        # Entre filas, nunca despues de la ultima.
        time_mock.sleep.assert_called_once_with(1)


@unittest.skipUnless(os.environ.get("PEAI_TEST_DB"), "Requiere SQL Server local: export PEAI_TEST_DB=1")
class TestCsvCommitDB(unittest.TestCase):
    """Commit real: ImportJob.source_type='csv' y doble import idempotente."""

    CONN_STR = os.environ.get(
        "PEAI_SQLSERVER_CONNECTION",
        "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;",
    )

    @classmethod
    def setUpClass(cls):
        cls._cleanup()
        entries = parse_csv_grupos(_fixture_bytes()).rows
        # Solo los sinteticos: AITICE (COL0043834) es un grupo REAL de la BD.
        cls.rows = [r for r in entries if r["external_code"] in COD_SINTETICOS]
        assert len(cls.rows) == len(COD_SINTETICOS)

    @classmethod
    def tearDownClass(cls):
        cls._cleanup()

    @classmethod
    def _cleanup(cls):
        """ImportRecord/validaciones caen en cascada del esquema al borrar padres."""
        import pyodbc
        conn = pyodbc.connect(cls.CONN_STR, autocommit=True)
        cur = conn.cursor()
        cur.execute("DELETE FROM ImportJob WHERE source_url LIKE ?", "csv:dbtest:%")
        cur.execute("DELETE FROM ResearchGroup WHERE external_code IN (?, ?, ?)",
                    *COD_SINTETICOS)
        conn.close()

    def _group_count(self):
        import pyodbc
        conn = pyodbc.connect(self.CONN_STR, autocommit=True)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM ResearchGroup WHERE external_code IN (?, ?, ?)",
                    *COD_SINTETICOS)
        n = cur.fetchone()[0]
        conn.close()
        return n

    def test_import_doble_es_idempotente_y_registra_source_csv(self):
        r1 = import_csv_rows(self.rows, db_conn_str=self.CONN_STR,
                             enrich_gruplac=False, source_name="dbtest")
        self.assertEqual(r1["summary"]["failed"], 0)
        n1 = self._group_count()
        self.assertEqual(n1, len(COD_SINTETICOS))

        r2 = import_csv_rows(self.rows, db_conn_str=self.CONN_STR,
                             enrich_gruplac=False, source_name="dbtest")
        self.assertEqual(r2["summary"]["failed"], 0)
        self.assertEqual(self._group_count(), n1, "Doble import CSV duplico grupos")

        import pyodbc
        conn = pyodbc.connect(self.CONN_STR, autocommit=True)
        cur = conn.cursor()
        cur.execute("SELECT source_type, COUNT(*) FROM ImportJob "
                    "WHERE source_url LIKE ? GROUP BY source_type", "csv:dbtest:%")
        por_tipo = dict(cur.fetchall())
        conn.close()
        self.assertEqual(por_tipo, {"csv": 2 * len(COD_SINTETICOS)})


if __name__ == "__main__":
    unittest.main()
