"""
backend/tests/test_import_pdf.py
Pruebas del importador PDF de grupos (T-13). La via principal es el round-trip
determinista: sembrar un grupo en RAM -> generar el informe estilo GrupLAC
(reports.build_group_report_pdf) -> re-parsearlo -> DryRun commit. Los casos
que el informe sin BD no cubre (autores, lineas) se parchean sobre el mismo
reporte. Sin red; la BD real solo en la clase gated.

Ejecutar desde la raiz del repo:
    python -m pytest backend/tests/test_import_pdf.py -v
"""

import io
import os
import unittest
from unittest.mock import patch

from backend.app import reports, repository
from backend.app.import_pdf import PdfImportError, parse_pdf_gruplac
from backend.app.models import Group, Product, Project, Researcher
from backend.app.scraper import GruplacCommitService

# Codigos sinteticos y unicos: no colisionan con los grupos reales ni con los
# del fixture CSV (COL009900x).
GRP_CODE = "COL0098765"
RES_LIDER = "00009876501"
RES_INV = "00009876502"
PRD_CODE = "PRD_RT_1"
PROJ_TITLE = "Proyecto de prueba round trip"


def _seed_round_trip_group():
    """Siembra en RAM el grupo de prueba y devuelve (grupo, ids)."""
    lider = repository.create_researcher(
        Researcher(external_code=RES_LIDER, first_names="María", last_names="Pérez Torres"),
        skip_undo=True,
    )
    repository.create_researcher(
        Researcher(external_code=RES_INV, first_names="Carlos", last_names="Gómez Ruiz"),
        skip_undo=True,
    )
    grp = repository.create_group(
        Group(
            external_code=GRP_CODE,
            name="GRUPO ROUND TRIP PDF",
            acronym="GRTP",
            institution="Universidad Popular del Cesar",
            classification="A",
            declared_creation_date="2015-03",
            knowledge_area="Ingeniería y Tecnología",
            city="Valledupar",
            department="Cesar",
            email="grtp@unicesar.edu.co",
            website="https://grtp.unicesar.edu.co",
            leader_id=lider.id,
        ),
        skip_undo=True,
    )
    repository.add_member_to_group(grp.id, lider.id, role="Líder",
                                   start_date="2020-01-01", skip_undo=True)
    inv = next(r for r in repository.list_researchers() if r.external_code == RES_INV)
    repository.add_member_to_group(grp.id, inv.id, role="Investigador",
                                   start_date="2021-06-01", end_date="2023-06-30",
                                   skip_undo=True)

    art = next(s for s in repository.get_product_catalogs()["subtypes"] if s["code"] == "ART")
    prod = repository.create_product(
        Product(
            external_code=PRD_CODE,
            title="Machine learning aplicado a suelos del Caribe",
            subtype_id=art["id"],
            family_id=art["family_id"],
            doi="10.1000/rt1",
            year=2023,
        ),
        skip_undo=True,
    )
    repository.link_product_to_group(grp.id, prod.id, skip_undo=True)
    repository.link_project_to_group(grp.id, Project(
        title=PROJ_TITLE,
        project_type="Investigación aplicada",
        status="ejecución",
        start_date="2022-01-01",
        end_date="2024-12-31",
    ))
    return grp, prod


def _cleanup_round_trip_group(grp, prod):
    for pid in list(repository.get_group_projects(grp.id)):
        repository.delete_project(pid.id, soft=False, skip_undo=True)
    repository.delete_product(prod.id, soft=False, skip_undo=True)
    repository.delete_group(grp.id, soft=False, skip_undo=True)
    for r in list(repository.list_researchers()):
        if r.external_code in (RES_LIDER, RES_INV):
            repository.delete_researcher(r.id, soft=False, skip_undo=True)


def _pdf_from_plain_lines(text_lines):
    """PDF sintetico de una pagina con lineas de texto en la banda util."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas as rl_canvas

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    y = A4[1] - 100  # ~100pt top-down: dentro de la banda cuerpo
    for text in text_lines:
        c.drawString(60, y, text)
        y -= 20
    c.save()
    return buf.getvalue()


class TestPdfRoundTrip(unittest.TestCase):
    """Seed en RAM -> informe -> parseo -> asserts (sin BD, sin red)."""

    @classmethod
    def setUpClass(cls):
        cls.grp, cls.prod = _seed_round_trip_group()
        cls.pdf_bytes = reports.build_group_report_pdf(cls.grp.id)
        cls.data = parse_pdf_gruplac(cls.pdf_bytes)

    @classmethod
    def tearDownClass(cls):
        _cleanup_round_trip_group(cls.grp, cls.prod)

    def test_identidad_y_datos_basicos(self):
        g = self.data.group
        self.assertEqual(g["external_code"], GRP_CODE)
        self.assertEqual(g["name"], "GRUPO ROUND TRIP PDF")
        self.assertEqual(g["classification"], "A")
        self.assertEqual(g["declared_creation_date"], "2015-03")
        self.assertEqual(g["knowledge_area"], "Ingeniería y Tecnología")
        self.assertEqual(g["leader_name"], "María Pérez Torres")
        self.assertEqual(self.data.institutions, ["Universidad Popular del Cesar"])
        self.assertEqual(g["email"], "grtp@unicesar.edu.co")

    def test_ubicacion_se_reparte(self):
        # El informe pega 'Departamento Ciudad' en una sola celda.
        self.assertEqual(self.data.group["city"], "Valledupar")
        self.assertEqual(self.data.group["department"], "Cesar")

    def test_integrantes_con_cod_rh_y_periodos(self):
        self.assertEqual(len(self.data.members), 2)
        lider = next(m for m in self.data.members if m.display_name.startswith("María"))
        self.assertEqual(lider.cod_rh, RES_LIDER)
        self.assertEqual(lider.role, "Líder")
        self.assertEqual(lider.start_date, "2020-01-01")
        self.assertTrue(lider.is_current)  # sin fecha de fin
        inv = next(m for m in self.data.members if m.display_name.startswith("Carlos"))
        self.assertEqual(inv.start_date, "2021-06-01")
        self.assertEqual(inv.end_date, "2023-06-30")
        self.assertFalse(inv.is_current)

    def test_producto_resuelve_subtipo_por_nombre(self):
        self.assertEqual(len(self.data.products), 1)
        p = self.data.products[0]
        self.assertEqual(p.subtype_code, "ART")  # por nombre, sin BD
        self.assertEqual(p.doi, "10.1000/rt1")
        self.assertEqual(p.year, 2023)
        self.assertIn("Machine learning", p.title)

    def test_proyecto(self):
        self.assertEqual(len(self.data.projects), 1)
        pr = self.data.projects[0]
        self.assertEqual(pr.title, "Proyecto de prueba round trip")
        self.assertEqual(pr.year, 2022)

    def test_commit_dry_run(self):
        result = GruplacCommitService.commit(self.data, db_conn_str="")
        self.assertEqual(result["status"], "dry_run")


class TestPdfReportExtras(unittest.TestCase):
    """Autores (con truncado '…') y lineas de investigacion: el informe sin
    BD no las trae, se parchean sobre el reporte real."""

    @classmethod
    def setUpClass(cls):
        cls.grp, cls.prod = _seed_round_trip_group()
        autores = [{"researcher_name": f"Investigador {i}", "external_author_name": ""}
                   for i in range(1, 10)]  # 9: el informe trunca a 8 con '…'
        lineas = ["Línea uno de investigación", "Línea dos de investigación"]
        with patch("backend.app.repository.get_product_authors", return_value=autores), \
             patch("backend.app.repository.get_group_research_lines", return_value=lineas):
            cls.pdf_bytes = reports.build_group_report_pdf(cls.grp.id)
        cls.data = parse_pdf_gruplac(cls.pdf_bytes)

    @classmethod
    def tearDownClass(cls):
        _cleanup_round_trip_group(cls.grp, cls.prod)

    def test_lineas_de_investigacion(self):
        self.assertEqual(
            self.data.research_lines,
            ["Línea uno de investigación", "Línea dos de investigación"],
        )

    def test_autores_se_recuperan_y_el_truncado_avisa(self):
        p = self.data.products[0]
        self.assertEqual(len(p.authors), 8)  # el informe corto en 8
        self.assertTrue(all(a.display_name.startswith("Investigador") for a in p.authors))
        self.assertTrue(any("autores truncados" in w for w in self.data.warnings))


class TestPdfErrors(unittest.TestCase):
    def test_no_es_pdf(self):
        with self.assertRaises(PdfImportError):
            parse_pdf_gruplac(b"esto no es un pdf")

    def test_pdf_sin_seccion_datos_basicos(self):
        pdf = _pdf_from_plain_lines(["Solo un titulo suelto", "y algo de texto"])
        with self.assertRaises(PdfImportError) as ctx:
            parse_pdf_gruplac(pdf)
        self.assertIn("Datos basicos", str(ctx.exception))

    def test_nro_pelado_se_rechaza(self):
        # Trampa de identidad: 2668 es el nro de Scienti de AITICE, NO un
        # codigo COL. El PDF debe traer 'Código GrupLAC: COL...' o nada.
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas as rl_canvas

        buf = io.BytesIO()
        c = rl_canvas.Canvas(buf, pagesize=A4)
        c.drawString(60, A4[1] - 100, "Datos básicos")
        c.drawString(60, A4[1] - 120, "Nombre del grupo")
        c.drawString(210, A4[1] - 120, "AITICE")
        c.drawString(60, A4[1] - 140, "Código GrupLAC")
        c.drawString(210, A4[1] - 140, "2668")
        c.save()
        with self.assertRaises(PdfImportError) as ctx:
            parse_pdf_gruplac(buf.getvalue())
        self.assertIn("codigo GrupLAC", str(ctx.exception))

    def test_pdf_sin_nombre(self):
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas as rl_canvas

        buf = io.BytesIO()
        c = rl_canvas.Canvas(buf, pagesize=A4)
        c.drawString(60, A4[1] - 100, "Datos básicos")
        c.drawString(60, A4[1] - 120, "Código GrupLAC")
        c.drawString(210, A4[1] - 120, GRP_CODE)
        c.save()
        with self.assertRaises(PdfImportError) as ctx:
            parse_pdf_gruplac(buf.getvalue())
        self.assertIn("nombre", str(ctx.exception))


@unittest.skipUnless(os.environ.get("PEAI_TEST_DB"), "Requiere SQL Server local: export PEAI_TEST_DB=1")
class TestPdfCommitDB(unittest.TestCase):
    """Commit real: ImportJob.source_type='pdf' y doble import idempotente."""

    CONN_STR = os.environ.get(
        "PEAI_SQLSERVER_CONNECTION",
        "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;",
    )

    @classmethod
    def setUpClass(cls):
        cls.grp, cls.prod = _seed_round_trip_group()
        cls.pdf_bytes = reports.build_group_report_pdf(cls.grp.id)
        cls.data = parse_pdf_gruplac(cls.pdf_bytes)
        cls._cleanup()

    @classmethod
    def tearDownClass(cls):
        # El commit real recarga la RAM desde SQL (reload_ram por defecto), asi
        # que los handles sembrados (grp.id/prod.id) ya no son validos aqui: la
        # limpieza RAM por id NO aplica (y seria peligrosa: un id reciclado
        # podria apuntar a un grupo real). El borrado SQL va por codigo/titulo
        # y la recarga final deja la RAM espejo del SQL limpio.
        cls._cleanup()
        repository.load_from_db(cls.CONN_STR)

    @classmethod
    def _cleanup(cls):
        """Espejo de TestIdempotencyDB._cleanup: cascadas del esquema + borrado explicito."""
        import pyodbc
        conn = pyodbc.connect(cls.CONN_STR, autocommit=True)
        cur = conn.cursor()
        cur.execute("DELETE FROM ImportJob WHERE source_url LIKE ?", f"pdf:%{GRP_CODE}%")
        cur.execute("DELETE FROM ResearchGroup WHERE external_code = ?", GRP_CODE)
        # El commit persiste el producto con el external_code que GENERA el
        # parser (normalizado de titulo/ano/doi), no el PRD_RT_1 de la semilla
        # RAM: el DOI sintetico es la clave estable para eliminarlo.
        cur.execute("DELETE FROM Product WHERE doi = ?", "10.1000/rt1")
        cur.execute("DELETE FROM Researcher WHERE external_code IN (?, ?)", RES_LIDER, RES_INV)
        cur.execute("DELETE FROM Project WHERE title = ?", PROJ_TITLE)
        conn.close()

    def _group_count(self):
        import pyodbc
        conn = pyodbc.connect(self.CONN_STR, autocommit=True)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM ResearchGroup WHERE external_code = ?", GRP_CODE)
        n = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM Product WHERE external_code = ?", PRD_CODE)
        p = cur.fetchone()[0]
        conn.close()
        return n, p

    def test_commit_doble_es_idempotente_y_registra_source_pdf(self):
        r1 = GruplacCommitService.commit(self.data, self.CONN_STR,
                                         source_type="pdf", source_url=f"pdf:test:{GRP_CODE}")
        self.assertEqual(r1["status"], "success")
        n1 = self._group_count()

        r2 = GruplacCommitService.commit(self.data, self.CONN_STR,
                                         source_type="pdf", source_url=f"pdf:test:{GRP_CODE}")
        self.assertEqual(r2["status"], "success")
        n2 = self._group_count()
        self.assertEqual(n1, n2, f"Doble import PDF duplico registros: {n1} -> {n2}")

        import pyodbc
        conn = pyodbc.connect(self.CONN_STR, autocommit=True)
        cur = conn.cursor()
        cur.execute("SELECT source_type FROM ImportJob WHERE source_url = ?", f"pdf:test:{GRP_CODE}")
        rows = cur.fetchall()
        conn.close()
        self.assertTrue(rows)
        self.assertTrue(all(r[0] == "pdf" for r in rows), f"ImportJob con source_type != pdf: {rows}")


if __name__ == "__main__":
    unittest.main()
