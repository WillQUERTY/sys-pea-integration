"""
backend/tests/test_cvlac_scraper.py
Pruebas unitarias para el extractor de CvLAC y detección de la marca de aval institucional
en convocatoria previa (marca ✓ / chulo.jpg).
"""

import os
import unittest
try:
    from backend.app.scraper import GruplacNormalizer
    from backend.app.cvlac_scraper import CvParser
except ImportError:
    from app.scraper import GruplacNormalizer
    from app.cvlac_scraper import CvParser

ADITH_HTML_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "docs", "ADITH-CVLACPAGE.HTML")
)


class TestCvlacParser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not os.path.exists(ADITH_HTML_PATH):
            raise unittest.SkipTest(f"Fixture no encontrado: {ADITH_HTML_PATH}")
        with open(ADITH_HTML_PATH, "r", encoding="utf-8", errors="ignore") as f:
            cls.html = f.read()
        cls.cv = CvParser.parse_html(cls.html)

    def test_datos_basicos_investigador(self):
        self.assertIn("Adith Bismarck", self.cv.name)
        norm_name = GruplacNormalizer.match_key(self.cv.name)
        self.assertIn("perez orozco", norm_name)
        self.assertEqual(self.cv.nationality, "Colombiana")
        self.assertEqual(self.cv.gender, "Masculino")
        self.assertIn("Investigador Asociado", self.cv.category)
        self.assertTrue(self.cv.is_par_evaluador)
        self.assertEqual(self.cv.highest_education_level, "Doctorado")

    def test_articulos_extraidos_y_avalados(self):
        self.assertEqual(len(self.cv.articles), 26)
        endorsed = [a for a in self.cv.articles if a.is_endorsed]
        self.assertEqual(len(endorsed), 26, "Todos los artículos en este CvLAC cuentan con marca de aval ✓")
        first = self.cv.articles[0]
        self.assertTrue(len(first.title) > 10)
        self.assertTrue(first.is_endorsed)
        self.assertIn("0798-1015", first.issn)
        self.assertEqual(first.year, 2016)

    def test_capitulos_extraidos_con_chulo_mixto(self):
        self.assertEqual(len(self.cv.book_chapters), 6)
        endorsed = [c for c in self.cv.book_chapters if c.is_endorsed]
        unendorsed = [c for c in self.cv.book_chapters if not c.is_endorsed]
        self.assertEqual(len(endorsed), 3, "3 capítulos recientes tienen aval")
        self.assertEqual(len(unendorsed), 3, "3 capítulos antiguos no tienen aval")

    def test_libros_y_software(self):
        # Adith no tiene libros registrados (solo capítulos de libro); la sección libros
        # no debe absorber la tabla de capítulos
        self.assertEqual(len(self.cv.books), 0)
        self.assertEqual(len(self.cv.software), 9)
        self.assertTrue(all(s.is_endorsed for s in self.cv.software))
        # Validar que los títulos de software sean reales y no nombres de coautores ni metadatos
        titles_norm = [s.title.lower() for s in self.cv.software]
        self.assertTrue(any("sisobeem" in t for t in titles_norm))
        self.assertTrue(any("ag-casu" in t for t in titles_norm))
        self.assertTrue(any("smartlight" in t for t in titles_norm))
        # Validar que los coautores se hayan extraído a s.authors
        smartlight = next(s for s in self.cv.software if "smartlight" in s.title.lower())
        self.assertTrue(any("medina" in a.lower() for a in smartlight.authors))
        self.assertTrue(any("duran" in a.lower() for a in smartlight.authors))

    def test_proyectos(self):
        self.assertGreaterEqual(len(self.cv.projects), 10)
        titles = [p.title.lower() for p in self.cv.projects]
        self.assertTrue(any("aplicaciones" in t or "sms" in t for t in titles))

    def test_orcid_extraido_del_hipervinculo(self):
        # El CvLAC solo expone el ORCID como ancla a orcid.org; el código vive
        # en el href, no en el texto visible ("Open Researcher and Contributor ID").
        self.assertEqual(self.cv.orcid, "0000-0002-2149-1625")

    def test_orcid_vacio_sin_ancla(self):
        html = ("<html><body><table><tr><td>Nombre</td>"
                "<td>Investigador Sin Orcid</td></tr></table></body></html>")
        cv = CvParser.parse_html(html)
        self.assertEqual(cv.orcid, "")

    def test_fallback_texto_plano(self):
        plain_text = (
            "Nombre Camila Andrea Noreña Julio\n"
            "Nacionalidad Colombiana\n"
            "Maestría en Ciencias Físicas\n"
            "Producción bibliográfica - Artículo - Publicado en revista especializada\n"
            "NOREÑA CAMILA, \"Sistema de Prueba\". En: Colombia\n"
            "Revista Sistemas ISSN: 1234-5678\n"
            "2023 vol: 1 fasc: 1 págs: 1 - 10 DOI: 10.1234/test\n"
        )
        data = CvParser.parse_text(plain_text)
        self.assertIn("Camila Andrea", data.name)
        self.assertEqual(data.highest_education_level, "Maestría")
        self.assertEqual(len(data.articles), 1)
        self.assertEqual(data.articles[0].title, "Sistema de Prueba")
        self.assertEqual(data.orcid, "", "El texto plano no trae el href del ORCID")
