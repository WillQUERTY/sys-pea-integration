"""
Test suite for Validation Queue native pagination, product enrichment,
and GET /api/v1/products parameter handling (including unclassified filter).
"""

import unittest
from fastapi.testclient import TestClient
from backend.app.main import app


class TestValidationQueueAndProducts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._client = TestClient(app)
        cls.client = cls._client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls._client.__exit__(None, None, None)

    def test_products_endpoint_does_not_throw_500(self):
        """GET /api/v1/products with limit=5000 and unclassified flag should return 200."""
        resp = self.client.get("/api/v1/products?limit=5000")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("items", data)
        self.assertIn("total", data)
        self.assertIn("skip", data)
        self.assertIn("limit", data)

        # Also test with unclassified filter parameter
        resp_unclass = self.client.get("/api/v1/products?unclassified=true&limit=10")
        self.assertEqual(resp_unclass.status_code, 200)

    def test_validation_queue_pagination_and_enrichment(self):
        """GET /api/v1/system/validation-queue should return paged and product-enriched items."""
        resp = self.client.get("/api/v1/system/validation-queue?skip=0&limit=5")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("items", data)
        self.assertIn("total", data)
        self.assertIn("skip", data)
        self.assertIn("limit", data)
        self.assertIn("pending_count", data)

        self.assertEqual(data["skip"], 0)
        self.assertEqual(data["limit"], 5)
        self.assertLessEqual(len(data["items"]), 5)

        if data["items"]:
            first_item = data["items"][0]
            self.assertIn("id", first_item)
            self.assertIn("product_id", first_item)
            self.assertIn("status", first_item)
            # Enriched fields:
            self.assertIn("product_title", first_item)
            self.assertIn("product_external_code", first_item)
            self.assertIn("product", first_item)

            if first_item.get("product"):
                self.assertEqual(first_item["product"]["id"], first_item["product_id"])
                self.assertEqual(first_item["product_title"], first_item["product"]["title"])

    def test_validation_queue_status_filter(self):
        """GET /api/v1/system/validation-queue with status filter should filter correctly."""
        resp = self.client.get("/api/v1/system/validation-queue?status=pending&limit=10")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        for item in data.get("items", []):
            self.assertEqual(item.get("status"), "pending")

    def test_validation_queue_search_filter(self):
        """GET /api/v1/system/validation-queue with search parameter should search product title/code."""
        resp = self.client.get("/api/v1/system/validation-queue?limit=1")
        self.assertEqual(resp.status_code, 200)
        items = resp.json().get("items", [])
        if not items:
            self.skipTest("Validation queue is empty")

        sample_title = items[0].get("product_title") or ""
        if len(sample_title) >= 4:
            search_term = sample_title[:4]
            search_resp = self.client.get(f"/api/v1/system/validation-queue?search={search_term}")
            self.assertEqual(search_resp.status_code, 200)
            search_data = search_resp.json()
            self.assertGreaterEqual(search_data["total"], 1)


if __name__ == "__main__":
    unittest.main()
