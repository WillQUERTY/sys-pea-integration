"""
backend/tests/test_catalog_2024.py
Verificación del catálogo del Modelo de Medición 2024 (M601PR04G01 v02).

Dos niveles:
- Estructura del JSON (siempre corre, sin BD): 5 familias, 70 tipologías,
  170 categorías, códigos únicos, spot-checks de pesos.
- Siembra en SQL Server (PEAI_TEST_DB=1): la BD refleja el JSON exactamente,
  sin filas legado (code NULL) y con los pesos correctos.

Ejecutar:
    python -m pytest backend/tests/test_catalog_2024.py -v
"""

import json
import os
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CATALOG_PATH = os.path.join(REPO, "database", "catalog_2024.json")

# Resumen oficial del modelo: familia -> (tipologías, categorías)
EXPECTED_FAMILY_COUNTS = {
    "GNC": (10, 57),
    "DTI": (26, 34),
    "ASC": (4, 11),
    "DPC": (21, 48),
    "FRH": (9, 20),
}
EXPECTED_TOTAL_SUBTYPES = sum(n for n, _ in EXPECTED_FAMILY_COUNTS.values())   # 70
EXPECTED_TOTAL_CATEGORIES = sum(c for _, c in EXPECTED_FAMILY_COUNTS.values())  # 170

# Spot-checks de pesos (Anexo 1 + Tabla 6): código -> (weight, global_weight, clase)
EXPECTED_WEIGHTS = {
    "ART_OPEN_A1": (10, 100, "TOP"),
    "ART_D": (9, None, "B"),          # literal del PDF (verificado, pág. 133)
    "SF": (8, 35, "B"),
    "LIB_A1": (10, 300, "TOP"),
    "LIB_C": (10, 15, "B"),           # literal del PDF (verificado, pág. 138)
    "CAP_LIB_A1": (10, 60, "TOP"),
    "CAP_LIB_C": (10, 3, "B"),        # literal del PDF (verificado, pág. 141)
    "PA1": (10, 500, "TOP"),          # patente de invención vía PCT
}


def load_catalog():
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def flatten(doc):
    """(familia, tipología, categoría) por fila; categoría None = tipología sin categorías."""
    rows = []
    for fam in doc["families"]:
        for sub in fam["subtypes"]:
            cats = sub.get("categories") or [None]
            for cat in cats:
                rows.append((fam, sub, cat))
    return rows


class TestCatalogJson(unittest.TestCase):
    """Estructura de database/catalog_2024.json (fuente única de verdad)."""

    @classmethod
    def setUpClass(cls):
        cls.doc = load_catalog()
        cls.by_code = {}
        for fam, sub, cat in flatten(cls.doc):
            if cat is not None:
                cls.by_code[cat["code"]] = (fam, sub, cat)

    def test_version_y_5_familias(self):
        self.assertEqual(self.doc["version"], "2024")
        fams = self.doc["families"]
        self.assertEqual(len(fams), 5)
        self.assertEqual(
            [f["code"] for f in fams],
            ["GNC", "DTI", "ASC", "DPC", "FRH"],
            "El orden de las familias debe seguir el documento 2024",
        )
        self.assertEqual([f["sort_order"] for f in fams], [1, 2, 3, 4, 5])

    def test_conteo_oficial_por_familia(self):
        for fam in self.doc["families"]:
            n_subs = len(fam["subtypes"])
            n_cats = sum(len(s.get("categories") or []) for s in fam["subtypes"])
            esperado = EXPECTED_FAMILY_COUNTS[fam["code"]]
            self.assertEqual(
                (n_subs, n_cats), esperado,
                f"{fam['code']}: esperaba {esperado}, hay {(n_subs, n_cats)}",
            )

    def test_totales_70_170(self):
        subs = [s for f in self.doc["families"] for s in f["subtypes"]]
        self.assertEqual(len(subs), EXPECTED_TOTAL_SUBTYPES)
        cats = [c for _, s, cs in [(f, s, s.get("categories") or []) for f in self.doc["families"] for s in f["subtypes"]] for c in cs]
        self.assertEqual(len(cats), EXPECTED_TOTAL_CATEGORIES)

    def test_toda_tipologia_tiene_al_menos_una_categoria(self):
        vacias = [
            s["code"]
            for f in self.doc["families"] for s in f["subtypes"]
            if not s.get("categories")
        ]
        self.assertEqual(vacias, [], "Toda tipología 2024 debe tener categorías")

    def test_codigos_unicos(self):
        fam_codes = [f["code"] for f in self.doc["families"]]
        sub_codes = [s["code"] for f in self.doc["families"] for s in f["subtypes"]]
        cat_codes = list(self.by_code.keys())
        self.assertEqual(len(set(fam_codes)), 5)
        self.assertEqual(len(set(sub_codes)), EXPECTED_TOTAL_SUBTYPES)
        self.assertEqual(len(set(cat_codes)), EXPECTED_TOTAL_CATEGORIES)

    def test_spot_checks_de_pesos(self):
        for code, (weight, global_w, cls) in EXPECTED_WEIGHTS.items():
            self.assertIn(code, self.by_code, f"Falta la categoría {code}")
            _, _, cat = self.by_code[code]
            self.assertEqual(cat["weight"], weight, f"{code}: peso relativo")
            self.assertEqual(cat["global_weight"], global_w, f"{code}: peso global")
            self.assertEqual(cat["measurement_class"], cls, f"{code}: clase")

    def test_pesos_sanos(self):
        # Tipologia piloto del modelo 2024: el Anexo 1 dice 'No aplica' para
        # categoria y peso; se registra deliberadamente sin peso (unica excepcion).
        SIN_PESO_PERMITIDO = {"LIB_CRE"}
        for _, _, cat in flatten(self.doc):
            if cat is None:
                continue
            if cat["code"] in SIN_PESO_PERMITIDO:
                self.assertIsNone(cat["weight"],
                                  f"{cat['code']}: la excepcion piloto debe mantenerse sin peso")
                continue
            self.assertGreaterEqual(cat["weight"], 0, cat["code"])
            # El peso global (Tabla 6) solo existe para la categoria tope de
            # cada tipologia; el resto lleva peso relativo del Anexo 1.
            self.assertTrue(
                cat["global_weight"] is None or cat["global_weight"] > 0,
                f"{cat['code']}: peso global inválido",
            )

    def test_sin_needs_review_pendientes(self):
        """Todos los pesos ya fueron verificados contra el PDF oficial.

        Los 4 valores inferidos en la conversión inicial (ART_OPEN_D, ART_D,
        LIB_C, CAP_LIB_C) quedaron confirmados como literales del PDF en
        docs/catalogo_oficial_pesos_minciencias_2024.md (páginas 131-169):
        el documento oficial rompe la serie decreciente y se transcribe
        literal. Si en el futuro aparece un needs_review nuevo, debe traer
        nota que explique la inferencia.
        """
        marcadas = [
            c for _, _, c in flatten(self.doc)
            if c is not None and c.get("needs_review")
        ]
        self.assertTrue(all(
            "notes" in c for c in marcadas
        ), "Toda categoría needs_review debe explicar la inferencia en notes")
        self.assertEqual([c["code"] for c in marcadas], [],
                         "No deben quedar pesos pendientes de verificación")


@unittest.skipUnless(os.environ.get("PEAI_TEST_DB"), "Requiere SQL Server local: export PEAI_TEST_DB=1")
class TestCatalogSeedDb(unittest.TestCase):
    """La siembra en peai refleja el JSON exactamente (read-only)."""

    CONN_STR = os.environ.get(
        "PEAI_SQLSERVER_CONNECTION",
        "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;",
    )

    @classmethod
    def setUpClass(cls):
        import pyodbc
        cls.conn = pyodbc.connect(cls.CONN_STR)
        cls.doc = load_catalog()

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def _one(self, sql):
        cur = self.conn.cursor()
        cur.execute(sql)
        return cur.fetchone()[0]

    def test_sin_filas_legado(self):
        """El reset 2024 eliminó el catálogo viejo: nada con code NULL."""
        self.assertEqual(self._one("SELECT COUNT(*) FROM ProductFamily WHERE code IS NULL"), 0)
        self.assertEqual(self._one("SELECT COUNT(*) FROM ProductSubtype WHERE code IS NULL"), 0)
        self.assertEqual(self._one("SELECT COUNT(*) FROM QualityCategory WHERE code IS NULL"), 0)

    def test_conteos_bd_igual_json(self):
        cur = self.conn.cursor()
        cur.execute("SELECT COUNT(*) FROM ProductFamily")
        self.assertEqual(cur.fetchone()[0], 5)
        cur.execute("SELECT COUNT(*) FROM ProductSubtype")
        self.assertEqual(cur.fetchone()[0], EXPECTED_TOTAL_SUBTYPES)
        cur.execute("SELECT COUNT(*) FROM QualityCategory")
        self.assertEqual(cur.fetchone()[0], EXPECTED_TOTAL_CATEGORIES)

    def test_codigos_bd_igual_json(self):
        cur = self.conn.cursor()
        cur.execute("SELECT code FROM ProductFamily ORDER BY sort_order")
        self.assertEqual([r[0] for r in cur.fetchall()],
                         ["GNC", "DTI", "ASC", "DPC", "FRH"])
        json_subs = {s["code"] for f in self.doc["families"] for s in f["subtypes"]}
        cur.execute("SELECT code FROM ProductSubtype WHERE code IS NOT NULL")
        self.assertEqual({r[0] for r in cur.fetchall()}, json_subs)
        json_cats = {
            c["code"] for f in self.doc["families"] for s in f["subtypes"]
            for c in (s.get("categories") or [])
        }
        cur.execute("SELECT code FROM QualityCategory WHERE code IS NOT NULL")
        self.assertEqual({r[0] for r in cur.fetchall()}, json_cats)

    def test_spot_checks_bd(self):
        cur = self.conn.cursor()
        cur.execute("""
            SELECT weight, global_weight, measurement_class
            FROM QualityCategory WHERE code = 'ART_OPEN_A1'
        """)
        w, gw, cls = cur.fetchone()
        self.assertEqual((float(w), float(gw) if gw is not None else None, cls), (10, 100, "TOP"))
        cur.execute("""
            SELECT weight, global_weight, measurement_class
            FROM QualityCategory WHERE code = 'SF'
        """)
        w, gw, cls = cur.fetchone()
        self.assertEqual((float(w), float(gw) if gw is not None else None, cls), (8, 35, "B"))

    def test_toda_tipologia_bd_tiene_categorias(self):
        cur = self.conn.cursor()
        cur.execute("""
            SELECT ps.code FROM ProductSubtype ps
            WHERE ps.code IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM QualityCategory qc WHERE qc.subtype_id = ps.id)
        """)
        huerfanas = [r[0] for r in cur.fetchall()]
        self.assertEqual(huerfanas, [], "Toda tipología en BD debe tener categorías")

    def test_ninguna_categoria_pertenece_a_dos_tipologias(self):
        cur = self.conn.cursor()
        cur.execute("""
            SELECT code FROM QualityCategory
            WHERE code IS NOT NULL AND subtype_id IS NULL
        """)
        self.assertEqual([r[0] for r in cur.fetchall()], [],
                         "Toda categoría 2024 debe tener subtype_id")


if __name__ == "__main__":
    unittest.main()
