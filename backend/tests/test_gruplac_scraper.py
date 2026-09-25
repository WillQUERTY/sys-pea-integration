"""
backend/tests/test_gruplac_scraper.py
Pruebas del scraper GrupLAC con fixtures HTML controlados (Revisión §27).

Ejecutar desde la raíz del repo:
    backend/venv/Scripts/python.exe -m unittest discover -s backend/tests -v

La prueba de idempotencia transaccional (TestIdempotencyDB) requiere SQL Server
local y se activa explícitamente con la variable de entorno PEAI_TEST_DB=1.
"""

import os
import unittest

from backend.app.scraper import (
    GruplacHtmlParser,
    GruplacNormalizer,
    GruplacCommitService,
)

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "gruplac_group_basic.html")
FIXTURE_URL = "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=9999990"
FIXTURE_GROUP_CODE = "COL9999990"


def load_fixture() -> str:
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return f.read()


class TestPeriodParsing(unittest.TestCase):
    """§27.2: normalización de periodos de vinculación (Revisión §12)."""

    def test_periodo_vigente_actual(self):
        r = GruplacNormalizer.parse_membership_period("2020/01 - Actual")
        self.assertTrue(r["valid"])
        self.assertEqual(r["start_date"], "2020-01-01")
        self.assertIsNone(r["end_date"], "'Actual' debe guardarse como end_date=None, nunca como texto")
        self.assertTrue(r["is_current"])

    def test_periodo_finalizado_con_mes(self):
        r = GruplacNormalizer.parse_membership_period("2018/03 - 2021/06")
        self.assertTrue(r["valid"])
        self.assertEqual(r["start_date"], "2018-03-01")
        self.assertEqual(r["end_date"], "2021-06-01")
        self.assertFalse(r["is_current"])

    def test_periodo_solo_anios(self):
        r = GruplacNormalizer.parse_membership_period("2015 - 2019")
        self.assertTrue(r["valid"])
        self.assertEqual(r["start_date"], "2015-01-01")
        self.assertEqual(r["end_date"], "2019-01-01")

    def test_periodo_invalido_no_explota(self):
        r = GruplacNormalizer.parse_membership_period("sin datos claros")
        self.assertFalse(r["valid"])
        self.assertIsNone(r["start_date"])
        self.assertEqual(r["raw_value"], "sin datos claros")


class TestExternalCodes(unittest.TestCase):
    """Revisión §19: códigos de producto estables, no basados en contador."""

    def test_doi_determina_codigo(self):
        c1 = GruplacNormalizer.product_external_code("Titulo A", 2026, "10.1007/s00339-026-09669-x")
        c2 = GruplacNormalizer.product_external_code("Titulo distinto", 2020, "https://doi.org/10.1007/s00339-026-09669-x")
        self.assertEqual(c1, c2, "El mismo DOI (aunque venga como URL) debe producir el mismo código")
        self.assertTrue(c1.startswith("PRD_DOI_"))

    def test_hash_estable_sin_doi(self):
        kwargs = dict(title="Optical sensor", year=2025, doi="", authors=["Maria Lopez Diaz"])
        c1 = GruplacNormalizer.product_external_code(**kwargs)
        c2 = GruplacNormalizer.product_external_code(**kwargs)
        self.assertEqual(c1, c2)
        self.assertTrue(c1.startswith("PRD_"))

    def test_codigo_no_depende_del_orden_de_autores(self):
        c1 = GruplacNormalizer.product_external_code("T", 2025, authors=["A Uno", "B Dos"])
        c2 = GruplacNormalizer.product_external_code("T", 2025, authors=["B Dos", "A Uno"])
        self.assertEqual(c1, c2)

    def test_codigo_no_depende_del_contenido_de_autores(self):
        """Dedupe: el mismo título+año con autores extraídos distinto da el mismo código."""
        c1 = GruplacNormalizer.product_external_code("THERM-BREAST", 2020, authors=["A Uno"])
        c2 = GruplacNormalizer.product_external_code("THERM-BREAST", 2020, authors=["A Uno", "B Dos"])
        self.assertEqual(c1, c2)
        c3 = GruplacNormalizer.product_external_code("THERM-BREAST", 2021, authors=["A Uno"])
        self.assertNotEqual(c1, c3, "Años distintos deben producir códigos distintos")

    def test_dedupe_products_fusiona_y_une_autores(self):
        from backend.app.scraper import ScrapedAuthor, ScrapedProduct
        code = GruplacNormalizer.product_external_code("Evento X", 2020)
        p1 = ScrapedProduct(
            title="Evento X", raw_text="corto", section="s", subtype_name="st",
            year=2020, authors=[ScrapedAuthor(display_name="A Uno")], external_code=code,
        )
        p2 = ScrapedProduct(
            title="Evento X", raw_text="texto mucho mas largo con detalle", section="s",
            subtype_name="st", year=2020, doi="10.1/xyz",
            authors=[ScrapedAuthor(display_name="A Uno"), ScrapedAuthor(display_name="B Dos")],
            external_code=code,
        )
        merged, merged_count = GruplacHtmlParser._dedupe_products([p1, p2])
        self.assertEqual(merged_count, 1)
        self.assertEqual(len(merged), 1)
        self.assertEqual([a.display_name for a in merged[0].authors], ["A Uno", "B Dos"])
        self.assertEqual(merged[0].doi, "10.1/xyz")
        self.assertEqual(merged[0].raw_text, "texto mucho mas largo con detalle")


class TestParseFixture(unittest.TestCase):
    """§27.2/§27.3: extracción estructural sobre fixture HTML controlado."""

    @classmethod
    def setUpClass(cls):
        cls.data = GruplacHtmlParser.parse(load_fixture(), source_url=FIXTURE_URL)

    def test_datos_basicos_grupo(self):
        g = self.data.group
        self.assertEqual(g["external_code"], FIXTURE_GROUP_CODE)
        # El almacenamiento conserva tildes; comparamos sin ellas
        self.assertIn("OPTICA", GruplacNormalizer.normalized_name_key(g["name"]))
        self.assertEqual(g["leader_name"], "Juan Perez Garcia")
        self.assertEqual(g["department"], "Cesar")

    def test_instituciones_y_lineas(self):
        self.assertIn("UNIVERSIDAD POPULAR DEL CESAR", self.data.institutions)
        self.assertEqual(len(self.data.research_lines), 2)
        line_keys = [GruplacNormalizer.normalized_name_key(l) for l in self.data.research_lines]
        self.assertIn("OPTICA E INFORMATICA", line_keys)

    def test_miembros_cod_rh_y_lider(self):
        self.assertEqual(len(self.data.members), 2)

        lider = self.data.members[0]
        self.assertEqual(lider.display_name, "Juan Perez Garcia")
        self.assertEqual(lider.cod_rh, "0001234567", "El cod_rh debe extraerse del enlace CvLAC")
        self.assertTrue(lider.is_leader_candidate, "Líder detectado solo por coincidencia exacta normalizada")
        self.assertTrue(lider.is_current)
        self.assertIsNone(lider.end_date)
        self.assertEqual(lider.hours, 10)

        estudiante = self.data.members[1]
        self.assertEqual(estudiante.display_name, "Maria Lopez Diaz")
        self.assertTrue(estudiante.cod_rh.startswith(f"RH_{FIXTURE_GROUP_CODE}_"), "Sin enlace CvLAC: cod_rh fallback determinista")
        self.assertFalse(estudiante.is_leader_candidate)
        self.assertFalse(estudiante.is_current)
        self.assertEqual(estudiante.end_date, "2021-06-01")

    def test_no_falso_lider_por_subcadena(self):
        """Revisión §11: 'Juan Perez' parcial NO debe marcarse como líder."""
        self.assertFalse(
            GruplacNormalizer.normalized_name_key("Juan Perez") ==
            GruplacNormalizer.normalized_name_key("Juan Perez Garcia")
        )

    def test_productos_extraidos_con_subtipo_nombre(self):
        self.assertEqual(len(self.data.products), 2)
        for p in self.data.products:
            # Revisión §20: el DTO lleva el NOMBRE del subtipo, no un ID mágico
            self.assertEqual(p.subtype_name, "Articulos de investigacion")
            self.assertFalse(hasattr(p, "family_id"), "El DTO no debe llevar IDs mágicos de catálogo")

    def test_producto_con_doi(self):
        p = self.data.products[0]
        self.assertEqual(p.title, "Green stem-extract synthesis of gold nanoparticles for pyridoxine SERS")
        self.assertEqual(p.doi, "10.1007/s00339-026-09669-x")
        self.assertEqual(p.issn, "1432-0630")
        self.assertEqual(p.year, 2026)
        self.assertTrue(p.external_code.startswith("PRD_DOI_"))
        self.assertEqual([a.display_name for a in p.authors],
                         ["Juan Perez Garcia", "Claudia Villarruel Molina"])

    def test_sin_contaminacion_entre_productos(self):
        """Revisión §3/§27.3: los autores del producto 1 NO deben aparecer en el producto 2."""
        p1, p2 = self.data.products
        authors_p2 = [a.display_name for a in p2.authors]
        self.assertEqual(authors_p2, ["Maria Lopez Diaz"])
        for a in p1.authors:
            self.assertNotIn(a.display_name, authors_p2)

    def test_producto_sin_doi_codigo_estable(self):
        p = self.data.products[1]
        self.assertTrue(p.external_code.startswith("PRD_"))
        self.assertNotIn("9999990", p.external_code, "El código no debe depender del grupo ni de un contador")

    def test_proyectos_conservan_raw(self):
        self.assertEqual(len(self.data.projects), 1)
        proj = self.data.projects[0]
        self.assertEqual(proj.year, 2022)
        self.assertIn("SENSORES OPTICOS", GruplacNormalizer.normalized_name_key(proj.title))
        self.assertTrue(proj.raw_text, "Debe conservarse el texto original sin estructurar (§22)")


class TestDryRunPreview(unittest.TestCase):
    """Revisión §16: el commit sin conexión actúa como dry-run y no toca la BD."""

    def test_commit_sin_conexion_es_dry_run(self):
        data = GruplacHtmlParser.parse(load_fixture(), source_url=FIXTURE_URL)
        result = GruplacCommitService.commit(data, db_conn_str="")
        self.assertEqual(result["status"], "dry_run")
        self.assertEqual(result["products_count"], 2)
        self.assertEqual(result["members_count"], 2)
        self.assertNotIn("job_id", result, "Un dry-run no debe crear ImportJob")


@unittest.skipUnless(os.environ.get("PEAI_TEST_DB"), "Requiere SQL Server local: export PEAI_TEST_DB=1")
class TestIdempotencyDB(unittest.TestCase):
    """§27.4: importar la misma página dos veces no duplica nada (transaccional real)."""

    CONN_STR = os.environ.get(
        "PEAI_SQLSERVER_CONNECTION",
        "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"
    )

    @classmethod
    def setUpClass(cls):
        import pyodbc
        cls.data = GruplacHtmlParser.parse(load_fixture(), source_url=FIXTURE_URL)
        cls.conn = pyodbc.connect(cls.CONN_STR, autocommit=True)
        cls._cleanup()

    @classmethod
    def tearDownClass(cls):
        cls._cleanup()
        cls.conn.close()

    @classmethod
    def _cleanup(cls):
        """Elimina todo rastro del fixture (cascadas + borrado explícito)."""
        cur = cls.conn.cursor()
        cur.execute("DELETE FROM ImportJob WHERE source_url = ?", FIXTURE_URL)
        cur.execute("DELETE FROM ResearchGroup WHERE external_code = ?", FIXTURE_GROUP_CODE)
        for p in cls.data.products:
            cur.execute("DELETE FROM Product WHERE external_code = ?", p.external_code)
        cur.execute("DELETE FROM Researcher WHERE external_code = ?", "0001234567")
        cur.execute("DELETE FROM Researcher WHERE external_code LIKE ?", f"RH_{FIXTURE_GROUP_CODE}_%")
        cur.execute("DELETE FROM Project WHERE title LIKE N'SENSORES OPTICOS BASADOS EN FIBRAS OPTICAS%'")
        cur.execute("DELETE FROM ResearchLine WHERE name IN (N'Optica e informatica', N'Sensores fotonicos')")

    def _counts(self):
        cur = self.conn.cursor()
        cur.execute("SELECT COUNT(*) FROM ResearchGroup WHERE external_code = ?", FIXTURE_GROUP_CODE)
        groups = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM Researcher WHERE external_code = ? OR external_code LIKE ?",
                    "0001234567", f"RH_{FIXTURE_GROUP_CODE}_%")
        researchers = cur.fetchone()[0]
        codes = [p.external_code for p in self.data.products]
        placeholders = ",".join("?" * len(codes))
        cur.execute(f"SELECT COUNT(*) FROM Product WHERE external_code IN ({placeholders})", *codes)
        products = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(*) FROM ProductAuthor pa
            JOIN Product p ON p.id = pa.product_id
            WHERE p.external_code IN ({})
        """.format(placeholders), *codes)
        authors = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(*) FROM GroupProductLink gpl
            JOIN Product p ON p.id = gpl.product_id
            WHERE p.external_code IN ({})
        """.format(placeholders), *codes)
        links = cur.fetchone()[0]
        return groups, researchers, products, authors, links

    def test_doble_importacion_no_duplica(self):
        r1 = GruplacCommitService.commit(self.data, self.CONN_STR)
        self.assertEqual(r1["status"], "success")
        counts_1 = self._counts()

        r2 = GruplacCommitService.commit(self.data, self.CONN_STR)
        self.assertEqual(r2["status"], "success")
        counts_2 = self._counts()

        self.assertEqual(counts_1, counts_2, f"Segunda importación duplicó registros: {counts_1} -> {counts_2}")
        self.assertEqual(counts_1[0], 1, "Un solo grupo")
        self.assertEqual(counts_1[1], 2, "Dos investigadores, sin duplicar por cod_rh")
        self.assertEqual(counts_1[2], 2, "Dos productos, sin duplicar por código estable")
        self.assertEqual(counts_1[4], 2, "Dos enlaces producto-grupo, sin duplicar")

        self.assertGreater(r1["new_records"], 0, "Primera pasada debe crear registros")
        self.assertEqual(r2["new_records"], 0, "Segunda pasada no debe crear nada nuevo")

    def test_productos_entran_pendientes_de_validacion(self):
        """Revisión §5/§29: lo importado nunca nace 'validated'."""
        GruplacCommitService.commit(self.data, self.CONN_STR)
        cur = self.conn.cursor()
        codes = [p.external_code for p in self.data.products]
        placeholders = ",".join("?" * len(codes))
        cur.execute(f"SELECT DISTINCT validation_status FROM Product WHERE external_code IN ({placeholders})", *codes)
        statuses = {row[0] for row in cur.fetchall()}
        self.assertEqual(statuses, {"pending"})

        cur.execute(f"""
            SELECT DISTINCT gpl.status FROM GroupProductLink gpl
            JOIN Product p ON p.id = gpl.product_id
            WHERE p.external_code IN ({placeholders})
        """, *codes)
        link_statuses = {row[0] for row in cur.fetchall()}
        self.assertEqual(link_statuses, {"pending_validation"}, "Los enlaces se proponen, no se aprueban (§6)")


if __name__ == "__main__":
    unittest.main()
