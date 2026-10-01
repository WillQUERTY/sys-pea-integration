"""
backend/tests/test_products_catalogs_api.py
Contrato HTTP del catálogo 2024: GET /api/v1/products/catalogs debe exponer
5 familias / 70 tipologías / 170 categorías en el orden del modelo, con los
campos que consume el frontend (code, model_ref, subtype_id, pesos).

Versión permanente del smoke de la Fase 1 (smoke_catalogs_2024.py).
Requiere SQL Server local con el catálogo sembrado (database/seed_catalog_2024.py):
    PEAI_TEST_DB=1 python -m pytest backend/tests/test_products_catalogs_api.py -v
"""

import os
import unittest

FAMILY_ORDER_2024 = ["GNC", "DTI", "ASC", "DPC", "FRH"]
TOTAL_SUBTYPES_2024 = 70
TOTAL_CATEGORIES_2024 = 170


@unittest.skipUnless(os.environ.get("PEAI_TEST_DB"), "Requiere SQL Server local: export PEAI_TEST_DB=1")
class TestCatalogsEndpoint(unittest.TestCase):
    """GET /api/v1/products/catalogs contra la app real (TestClient + lifespan)."""

    @classmethod
    def setUpClass(cls):
        from fastapi.testclient import TestClient
        from backend.app.main import app

        # El lifespan de main.py inicializa el repositorio contra localhost/peai
        # (no-fatal si falla). Con SQL Server arriba el endpoint queda servido
        # por el mismo camino que usa el frontend en producción.
        cls._client = TestClient(app)
        cls.client = cls._client.__enter__()
        cls.resp = cls.client.get("/api/v1/products/catalogs")
        try:
            cls.catalogs = cls.resp.json()
        except Exception:
            cls.catalogs = {}

    @classmethod
    def tearDownClass(cls):
        cls._client.__exit__(None, None, None)

    @property
    def families(self):
        return self.catalogs.get("families", [])

    @property
    def subtypes(self):
        return self.catalogs.get("subtypes", [])

    @property
    def categories(self):
        return self.catalogs.get("quality_categories", [])

    def _by_code(self, code):
        return next((s for s in self.subtypes if s.get("code") == code), None)

    def test_estado_y_conteos_del_modelo(self):
        self.assertEqual(self.resp.status_code, 200,
                         f"Respuesta inesperada: {self.resp.status_code} {self.resp.text[:200]}")
        self.assertEqual(len(self.families), 5)
        self.assertEqual(len(self.subtypes), TOTAL_SUBTYPES_2024)
        self.assertEqual(len(self.categories), TOTAL_CATEGORIES_2024)

    def test_familias_en_orden_del_modelo(self):
        self.assertEqual(
            [f.get("code") for f in self.families],
            FAMILY_ORDER_2024,
            "El orden debe seguir el documento 2024 (sort_order), no el alfabeto",
        )

    def test_campos_2024_expuestos(self):
        """Los selectores del frontend se construyen con code/model_ref/pesos."""
        sf = self._by_code("SF")
        self.assertIsNotNone(sf, "Falta la tipología SF (software formalizado)")
        self.assertEqual(sf.get("model_ref"), "2.2.2.1.3")

        art_a1 = next(
            (c for c in self.categories if c.get("code") == "ART_OPEN_A1"), None
        )
        self.assertIsNotNone(art_a1, "Falta la categoría ART_OPEN_A1")
        self.assertEqual(art_a1.get("weight"), 10)
        self.assertEqual(art_a1.get("global_weight"), 100)
        self.assertEqual(art_a1.get("measurement_class"), "TOP")

    def test_categorias_agrupadas_por_tipologia(self):
        """Par. 3.6: cada categoría pertenece a una tipología; ninguna queda huérfana."""
        family_ids = {f["id"] for f in self.families}
        subtype_ids = {s["id"] for s in self.subtypes}

        self.assertTrue(all(s.get("family_id") in family_ids for s in self.subtypes),
                        "Toda tipología debe referenciar una familia existente")
        self.assertTrue(all(c.get("subtype_id") in subtype_ids for c in self.categories),
                        "Toda categoría debe referenciar su tipología (sin filas legado)")

        cubiertas = {c["subtype_id"] for c in self.categories}
        self.assertEqual(cubiertas, subtype_ids,
                         "Toda tipología del catálogo debe tener al menos una categoría")

        art = self._by_code("ART")
        gnc = next((f for f in self.families if f.get("code") == "GNC"), None)
        self.assertEqual(art.get("family_id"), gnc["id"],
                         "Los artículos pertenecen a GNC en el modelo 2024")


if __name__ == "__main__":
    unittest.main()
