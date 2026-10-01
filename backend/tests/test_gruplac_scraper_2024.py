"""
backend/tests/test_gruplac_scraper_2024.py
Pruebas del mapeo GrupLAC -> tipologías del Modelo de Medición 2024 (M601PR04G01 v02).

Cubre:
- Secciones sin mapeo 2024 -> skipped_sections (las estructurales NO se reportan).
- Refinamiento por fila: Trabajos dirigidos -> TD/TM/TP/None y
  patentes -> PAT_INV/MOD_UTIL.
- Secciones reconocidas SIN equivalente 2024 (p.ej. "Demás trabajos") ->
  producto importado con subtype_code None para reclasificar a mano.
- Contrato de la vista previa con el frontend: subtype_code + skipped_sections.
- Patrones añadidos desde la página real de AITICE (Fase 6): PVE, RNL
  (reglamentos), PEE, PCD sonoro, TCCG, banners estructurales y el
  mojibake "comitas" de Scienti.
- Invariante SECTION_MAP ⊆ catalog_2024.json.
- Commit contra SQL Server (PEAI_TEST_DB=1): tipología resuelta por código,
  quality_category_id NULL (la asigna el validador humano) y auditoría
  'unclassified_subtype' + ImportJob.details.
"""

import json
import os
import unittest

from backend.app.scraper import GruplacHtmlParser, GruplacCommitService, build_preview, SECTION_MAP

HERE = os.path.dirname(__file__)
FIXTURE_PATH = os.path.join(HERE, "fixtures", "gruplac_group_basic.html")
CATALOG_PATH = os.path.abspath(os.path.join(HERE, "..", "..", "database", "catalog_2024.json"))
URL_2024 = "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=9999924"
GROUP_CODE_2024 = "COL9999801"


def tabla_productos(encabezado, celdas):
    """Tabla de productos GrupLAC: fila 0 = encabezado de sección, fila 1 = rótulos de columnas."""
    filas_html = "".join(
        f"<tr><td>{i}</td><td>{celda}</td></tr>"
        for i, celda in enumerate(celdas, start=1)
    )
    return (
        f"<table><tr><td colspan='2'>{encabezado}</td></tr>"
        f"<tr><td>Nro</td><td>Descripción del producto</td></tr>"
        f"{filas_html}</table>"
    )


def pagina_minima(*tablas):
    """Página GrupLAC válida y mínima (encabezado de grupo + código) con tablas extra."""
    return (
        "<html><body>"
        "<span class='celdaEncabezado'>GRUPO DE PRUEBA MODELO 2024</span>"
        "<table><tr><td colspan='2'>Datos básicos</td></tr>"
        f"<tr><td>Código:</td><td>{GROUP_CODE_2024}</td></tr></table>"
        + "".join(tablas)
        + "</body></html>"
    )


class TestSeccionesSinMapeo(unittest.TestCase):
    """Una sección sin patrón 2024 se registra para el job; las estructurales no son ruido."""

    def test_seccion_desconocida_se_registra_y_no_produce_producto(self):
        html = pagina_minima(
            "<table><tr><td colspan='2'>Sección desconocida del futuro</td></tr></table>"
        )
        data = GruplacHtmlParser.parse(html, source_url=URL_2024)
        self.assertEqual(data.skipped_sections, ["seccion desconocida del futuro"])
        self.assertEqual(data.products, [])

    def test_secciones_estructurales_no_se_reportan(self):
        """datos básicos, instituciones, integrantes, proyectos: procesados aparte, no son productos omitidos."""
        with open(FIXTURE_PATH, encoding="utf-8") as f:
            data = GruplacHtmlParser.parse(f.read(), source_url=URL_2024)
        self.assertEqual(data.skipped_sections, [])


class TestRefinamientoPorFila(unittest.TestCase):
    """El tipo real viene en la primera línea de contenido de la fila, no en el encabezado."""

    @classmethod
    def setUpClass(cls):
        filas = [
            ("Trabajo de grado - Doctorado", "Tutor(es): Juan Perez Garcia,", 2023),
            ("Trabajo de grado - Maestría", "Tutor(es): Maria Lopez Diaz,", 2022),
            ("Trabajo de grado - Pregrado", "Tutor(es): Pedro Perez Sanchez,", 2021),
            ("Trabajo de grado - Monografía", "Tutor(es): Ana Gomez Ruiz,", 2020),
        ]
        celdas = [
            f"{i}.-<br>{tipo}<br>{tutor}<br>{anho}"
            for i, (tipo, tutor, anho) in enumerate(filas, start=1)
        ]
        html = pagina_minima(tabla_productos("Trabajos dirigidos/Turorías", celdas))
        cls.data = GruplacHtmlParser.parse(html, source_url=URL_2024)

    def test_trabajos_dirigidos_refinan_a_td_tm_tp_none(self):
        self.assertEqual(
            [p.subtype_code for p in self.data.products],
            ["TD", "TM", "TP", None],
            "Doctorado->TD, Maestría->TM, Pregrado->TP; monografías no son tipología 2024",
        )

    def test_patente_modelo_de_utilidad_es_tipologia_propia(self):
        celdas = [
            "1.-<br>Nombre del producto: Dispositivo ergonomico de sujecion<br>Tipo: Modelo de utilidad<br>2022",
            "2.-<br>Nombre del producto: Sensor optico portable<br>Tipo: Patente de invencion<br>2021",
        ]
        html = pagina_minima(tabla_productos("Patentes", celdas))
        data = GruplacHtmlParser.parse(html, source_url=URL_2024)
        self.assertEqual(
            [p.subtype_code for p in data.products],
            ["MOD_UTIL", "PAT_INV"],
            "El 'modelo de utilidad' tiene código propio en 2024; el resto de patentes es PAT_INV",
        )


class TestSeccionesSinEquivalente(unittest.TestCase):
    """Reconocidas por el parser pero sin tipología 2024: importan con subtype_code NULL."""

    def test_demas_trabajos_importa_sin_tipologia(self):
        html = pagina_minima(tabla_productos(
            "Demás trabajos",
            ["1.-<br>Titulo: Trabajo diverso sin equivalente en catalogo<br>2022"],
        ))
        data = GruplacHtmlParser.parse(html, source_url=URL_2024)
        self.assertEqual(len(data.products), 1)
        self.assertIsNone(data.products[0].subtype_code)
        self.assertEqual(data.skipped_sections, [],
                         "Sección reconocida sin equivalente: se importa, no se omite")

    def test_otros_articulos_gana_sobre_articulos(self):
        """Orden del SECTION_MAP: el catch-all 'otros articulos' (None) debe evaluarse antes que 'articulos'."""
        html = pagina_minima(tabla_productos(
            "Otros artículos publicados",
            ["1.-<br>Titulo: Nota breve sin revision formal<br>2020"],
        ))
        data = GruplacHtmlParser.parse(html, source_url=URL_2024)
        self.assertEqual(len(data.products), 1)
        self.assertIsNone(data.products[0].subtype_code)


class TestPreviewContrato2024(unittest.TestCase):
    """La vista previa (gruplac-preview-card) recibe subtype_code y skipped_sections."""

    def test_preview_lleva_codigo_y_secciones_omitidas(self):
        html = pagina_minima(
            tabla_productos("Demás trabajos", ["1.-<br>Titulo: Trabajo diverso uno<br>2022"]),
            "<table><tr><td colspan='2'>Sección desconocida del futuro</td></tr></table>",
        )
        data = GruplacHtmlParser.parse(html, source_url=URL_2024)
        preview = build_preview(data)
        self.assertEqual(len(preview["products"]), 1)
        self.assertIsNone(preview["products"][0]["subtype_code"])
        self.assertEqual(preview["skipped_sections"], ["seccion desconocida del futuro"])


class TestSeccionesAdicionales2024(unittest.TestCase):
    """Patrones añadidos tras el preview de la página real de AITICE (Fase 6)."""

    def _subtypes(self, encabezado, celdas):
        html = pagina_minima(tabla_productos(encabezado, celdas))
        data = GruplacHtmlParser.parse(html, source_url=URL_2024)
        return [p.subtype_code for p in data.products]

    def test_publicaciones_editoriales_no_especializadas_es_pee(self):
        self.assertEqual(
            self._subtypes("Publicaciones editoriales no especializadas",
                           ["1.-<br>Titulo: Cartilla institucional<br>2021"]),
            ["PEE"],
        )

    def test_contenido_digital_sonoro_es_pcd(self):
        self.assertEqual(
            self._subtypes("Producciones de contenido digital - Sonoro",
                           ["1.-<br>Titulo: Podcast de divulgacion cientifica<br>2023"]),
            ["PCD"],
        )

    def test_protocolos_de_vigilancia_es_pve(self):
        self.assertEqual(
            self._subtypes("Protocolos de vigilancia epidemiológica",
                           ["1.-<br>Titulo: Protocolo de vigilancia del dengue<br>2020"]),
            ["PVE"],
        )

    def test_reglamentos_tecnicos_es_rnl(self):
        self.assertEqual(
            self._subtypes("Reglamentos técnicos",
                           ["1.-<br>Titulo: Reglamento tecnico de bebidas<br>2019"]),
            ["RNL"],
        )

    def test_apropiacion_con_centro_de_ciencia_es_tccg(self):
        encabezado = ("Productos de apropiación social del conocimiento resultado del "
                      "trabajo conjunto entre un centro de ciencia y un grupo de investigación")
        self.assertEqual(
            self._subtypes(encabezado, ["1.-<br>Titulo: Museo itinerante con Maloka<br>2022"]),
            ["TCCG"],
        )

    def test_evaluador_no_es_producto_2024(self):
        self.assertEqual(
            self._subtypes("Actividades como evaluador",
                           ["1.-<br>Titulo: Par evaluador de convocatoria<br>2021"]),
            [None],
        )

    def test_participacion_en_comites_ambas_codificaciones(self):
        """Scienti sirve 'comités' a veces con doble encoding: normalizado queda
        como "comitas" y match_key no lo repara; ambos patrones deben importar NULL."""
        self.assertEqual(
            self._subtypes("Participación en comités de evaluación",
                           ["1.-<br>Titulo: Miembro del comite de calidad<br>2021"]),
            [None],
        )
        mojibake = "ParticipaciÃ³n en comitÃ©s de evaluaciÃ³n"
        self.assertEqual(
            self._subtypes(mojibake, ["1.-<br>Titulo: Par academico de acreditacion<br>2020"]),
            [None],
        )

    def test_banners_de_seccion_no_se_reportan_como_omitidos(self):
        """Los banners de las grandes secciones GrupLAC no traen filas de producto."""
        banners = "".join(
            f"<table><tr><td colspan='2'>{b}</td></tr></table>"
            for b in (
                "PRODUCCIÓN BIBLIOGRÁFICA",
                "PRODUCCIÓN TÉCNICA Y TECNOLÓGICA",
                "PRODUCCIÓN DE FORMACIÓN Y EXTENSIÓN",
                "APROPIACIÓN SOCIAL Y DIVULGACIÓN PÚBLICA DE LA CIENCIA",
                "ACTIVIDADES DE FORMACIÓN",
            )
        )
        data = GruplacHtmlParser.parse(pagina_minima(banners), source_url=URL_2024)
        self.assertEqual(data.skipped_sections, [],
                         "Los banners estructurales no son secciones omitidas")
        self.assertEqual(data.products, [])


class TestSeccionMapContraCatalogo(unittest.TestCase):
    """Invariante: todo código del SECTION_MAP existe en catalog_2024.json.

    Evita que un patrón apunte a una tipología que no está sembrada en la BD
    (el commit la resolvería a None en silencio y la sección se perdería).
    """

    def test_codigos_del_mapa_existen_en_el_catalogo(self):
        with open(CATALOG_PATH, encoding="utf-8") as f:
            doc = json.load(f)
        del_catalogo = {s["code"] for fam in doc["families"] for s in fam["subtypes"]}
        mapeados = {c for _, c in SECTION_MAP if c is not None}
        self.assertEqual(
            mapeados - del_catalogo, set(),
            "El SECTION_MAP referencia tipologías fuera del catálogo 2024",
        )


@unittest.skipUnless(os.environ.get("PEAI_TEST_DB"), "Requiere SQL Server local: export PEAI_TEST_DB=1")
class TestCommit2024DB(unittest.TestCase):
    """Commit 2024: tipología resuelta por código, calidad NULL y auditoría de reclasificación."""

    CONN_STR = os.environ.get(
        "PEAI_SQLSERVER_CONNECTION",
        "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"
    )

    @classmethod
    def setUpClass(cls):
        import pyodbc
        html = pagina_minima(
            tabla_productos("Artículos publicados", [
                "1.-<br>Titulo: Articulo de prueba del modelo 2024<br>DOI: 10.9999/prd-test-2024<br>2024<br>Autores: Juan Perez Garcia",
            ]),
            tabla_productos("Demás trabajos", [
                "1.-<br>Titulo: Trabajo diverso sin equivalente en catalogo<br>2022<br>Autores: Maria Lopez Diaz",
            ]),
            "<table><tr><td colspan='2'>Sección desconocida del futuro</td></tr></table>",
        )
        cls.data = GruplacHtmlParser.parse(html, source_url=URL_2024)
        cls.articulo = next(p for p in cls.data.products if p.subtype_code == "ART")
        cls.sin_tipologia = next(p for p in cls.data.products if p.subtype_code is None)
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
        cur.execute("DELETE FROM ImportJob WHERE source_url = ?", URL_2024)
        cur.execute("DELETE FROM ResearchGroup WHERE external_code = ?", GROUP_CODE_2024)
        for p in cls.data.products:
            cur.execute("DELETE FROM Product WHERE external_code = ?", p.external_code)

    def _commit(self):
        """Cada prueba arranca desde BD limpia para poder afirmar 'created' con determinismo."""
        self._cleanup()
        return GruplacCommitService.commit(self.data, self.CONN_STR)

    def test_articulo_resuelto_y_calidad_null(self):
        result = self._commit()
        self.assertEqual(result["status"], "success")

        cur = self.conn.cursor()
        cur.execute("SELECT id, family_id FROM ProductSubtype WHERE code = 'ART'")
        row = cur.fetchone()
        self.assertIsNotNone(row, "Catálogo 2024 no sembrado: corre database/seed_catalog_2024.py")
        art_id, art_fam = row[0], row[1]

        cur.execute(
            "SELECT family_id, subtype_id, quality_category_id FROM Product WHERE external_code = ?",
            self.articulo.external_code,
        )
        prod_row = cur.fetchone()
        self.assertIsNotNone(prod_row, "El commit debe crear el producto")
        self.assertEqual(tuple(prod_row), (art_fam, art_id, None),
                         "El artículo entra con su tipología 2024 resuelta por código y SIN "
                         "categoría de calidad: la asigna el validador humano (par. 3.6)")

    def test_sin_tipologia_queda_null_y_auditable(self):
        result = self._commit()
        job_id = result["job_id"]
        cur = self.conn.cursor()

        cur.execute(
            "SELECT family_id, subtype_id, quality_category_id FROM Product WHERE external_code = ?",
            self.sin_tipologia.external_code,
        )
        prod_row = cur.fetchone()
        self.assertIsNotNone(prod_row, "Sin tipología también se importa (para reclasificar)")
        self.assertEqual(tuple(prod_row), (None, None, None),
                         "Sin tipología 2024 se importa sin familia ni subtipo")

        cur.execute("""
            SELECT action_taken FROM ImportRecord
            WHERE job_id = ? AND entity_type = 'Product' AND external_identifier = ?
        """, job_id, self.articulo.external_code)
        self.assertEqual(cur.fetchone()[0], "created")

        cur.execute("""
            SELECT action_taken FROM ImportRecord
            WHERE job_id = ? AND entity_type = 'Product' AND external_identifier = ?
        """, job_id, self.sin_tipologia.external_code)
        self.assertEqual(cur.fetchone()[0], "unclassified_subtype",
                         "El ImportRecord marca lo que hay que reclasificar a mano")

        cur.execute("SELECT details FROM ImportJob WHERE id = ?", job_id)
        details = cur.fetchone()[0] or ""
        self.assertIn("sin tipología 2024 para reclasificar", details)
        self.assertIn("seccion desconocida del futuro", details,
                      "Las secciones sin mapeo quedan documentadas en el job")


if __name__ == "__main__":
    unittest.main()
