"""
backend/tests/test_import_pdf_scienti.py
Pruebas del nuevo importador especializado en PDFs generados desde el visor web de Scienti GrupLAC.
"""

import unittest
import fitz

from backend.app.import_pdf_scienti import (
    PdfScientiImportError,
    parse_pdf_scienti,
)
from backend.app.scraper import build_preview


def _build_synthetic_scienti_pdf() -> bytes:
    """Genera un PDF sintético en memoria con la estructura web de Scienti GrupLAC."""
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)

    # Cabecera de navegador y nombre del grupo
    page.insert_text((32, 20), "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000009999", fontsize=8)
    page.insert_text((32, 40), "GRUPO PRUEBA SCIENTI WEB", fontsize=14)

    # Datos básicos
    page.insert_text((35, 60), "Datos básicos", fontsize=11)
    page.insert_text((35, 75), "Año y mes de formación\n2016 - 3", fontsize=9)
    page.insert_text((35, 95), "Departamento - Ciudad\nCESAR - VALLEDUPAR", fontsize=9)
    page.insert_text((35, 115), "Líder\nDiana Marcela Gómez", fontsize=9)
    page.insert_text((35, 135), "¿La información de este grupo se ha certificado?\nSi el día 2020-01-15", fontsize=9)
    page.insert_text((35, 155), "E-mail\ngrupo.test@unicesar.edu.co", fontsize=9)
    page.insert_text((35, 175), "Clasificación\nA1 con vigencia hasta 2026", fontsize=9)
    page.insert_text((35, 195), "Área de conocimiento\nIngeniería y Tecnología", fontsize=9)

    # Instituciones
    page.insert_text((35, 220), "Instituciones", fontsize=11)
    page.insert_text((35, 235), "1.- Universidad Popular del Cesar - (Avalado)", fontsize=9)

    # Líneas
    page.insert_text((35, 260), "Líneas de investigación declaradas por el grupo", fontsize=11)
    page.insert_text((35, 275), "1.- Inteligencia Artificial Aplicada", fontsize=9)
    page.insert_text((35, 290), "2.- Ingeniería de Software", fontsize=9)

    # Integrantes
    page.insert_text((35, 320), "Integrantes del grupo", fontsize=11)
    page.insert_text((35, 340), "1.- Diana Marcela Gómez\nIntegrante\n10\n2016/3 - Actual", fontsize=9)
    page.insert_text((35, 375), "2.- Juan Camilo Pérez\nIntegrante\n4\n2018/1 - 2022/12", fontsize=9)

    # Producción
    page.insert_text((35, 420), "PRODUCCIÓN BIBLIOGRÁFICA", fontsize=12)
    page.insert_text((35, 440), "Artículos publicados", fontsize=11)
    page.insert_text(
        (35, 460),
        "1.- Publicado en revista especializada: Deep Learning in Healthcare\n"
        "Colombia, Revista Colombiana de Computación ISSN: 0120-1234, 2023 vol:24 fasc: 1 págs: 10 - 25, DOI:10.1234/test.doi.2023\n"
        "Autores: Diana Marcela Gómez, Juan Camilo Pérez",
        fontsize=9,
    )

    # Proyectos
    page.insert_text((35, 530), "Proyectos", fontsize=11)
    page.insert_text(
        (35, 550),
        "1.- Tipo de proyecto: Investigación y desarrollo\n"
        "Título: Plataforma de Analítica Educativa\n"
        "Inicio: 2021 Fin: 2023",
        fontsize=9,
    )

    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes


class TestImportPdfScienti(unittest.TestCase):
    def test_invalid_pdf_raises_error(self):
        with self.assertRaises(PdfScientiImportError):
            parse_pdf_scienti(b"not a valid pdf content")

    def test_empty_page_pdf_raises_error(self):
        doc = fitz.open()
        doc.new_page(width=612, height=792)  # Página en blanco sin texto
        empty_bytes = doc.write()
        doc.close()
        with self.assertRaises(PdfScientiImportError):
            parse_pdf_scienti(empty_bytes)

    def test_parse_synthetic_scienti_pdf(self):
        pdf_bytes = _build_synthetic_scienti_pdf()
        data = parse_pdf_scienti(pdf_bytes)

        # Datos básicos
        self.assertEqual(data.group["name"], "GRUPO PRUEBA SCIENTI WEB")
        self.assertEqual(data.group["external_code"], "COL0009999")
        self.assertEqual(data.group["leader_name"], "Diana Marcela Gómez")
        self.assertEqual(data.group["classification"], "A1")
        self.assertEqual(data.group["city"], "Valledupar")
        self.assertEqual(data.group["department"], "Cesar")
        self.assertEqual(data.group["declared_creation_date"], "2016-03")

        # Instituciones y líneas
        self.assertEqual(len(data.institutions), 1)
        self.assertIn("Universidad Popular del Cesar", data.institutions[0])
        self.assertEqual(len(data.research_lines), 2)
        self.assertEqual(data.research_lines[0], "Inteligencia Artificial Aplicada")

        # Integrantes
        self.assertEqual(len(data.members), 2)
        m1 = data.members[0]
        self.assertEqual(m1.display_name, "Diana Marcela Gómez")
        self.assertTrue(m1.is_leader_candidate)
        self.assertEqual(m1.hours, 10)
        self.assertTrue(m1.is_current)

        m2 = data.members[1]
        self.assertEqual(m2.display_name, "Juan Camilo Pérez")
        self.assertFalse(m2.is_leader_candidate)
        self.assertEqual(m2.hours, 4)
        self.assertFalse(m2.is_current)

        # Productos
        self.assertEqual(len(data.products), 1)
        p = data.products[0]
        self.assertEqual(p.title, "Deep Learning in Healthcare")
        self.assertEqual(p.subtype_code, "ART")
        self.assertEqual(p.year, 2023)
        self.assertEqual(p.doi, "10.1234/test.doi.2023")
        self.assertEqual(len(p.authors), 2)

        # Proyectos
        self.assertEqual(len(data.projects), 1)
        self.assertEqual(data.projects[0].title, "Plataforma de Analítica Educativa")

        # build_preview contract
        preview = build_preview(data)
        self.assertEqual(preview["counts"]["members"], 2)
        self.assertEqual(preview["counts"]["products"], 1)
        self.assertEqual(preview["counts"]["projects"], 1)


if __name__ == "__main__":
    unittest.main()
