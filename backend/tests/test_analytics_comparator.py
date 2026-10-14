import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app import repository, analytics_comparator
from backend.app.repository import abpoxx_pybind as pb

client = TestClient(app)

def test_compare_groups_analytics_direct():
    # 1. Crear dos grupos en RAM
    g1 = pb.Group()
    g1.name = "Grupo Alfa -ALFA-"
    g1.external_code = "GRP_ALFA"
    g1.classification = "A1"
    grp1 = pb.create_group(g1)

    g2 = pb.Group()
    g2.name = "Grupo Beta -BETA-"
    g2.external_code = "GRP_BETA"
    g2.classification = "B"
    grp2 = pb.create_group(g2)

    # 2. Ejecutar benchmarking
    res = analytics_comparator.compare_groups_analytics([grp1.id, grp2.id])
    assert len(res["groups"]) == 2
    assert res["groups"][0]["acronym"] == "ALFA"
    assert res["groups"][1]["acronym"] == "BETA"

    # Verificar 6 dimensiones
    assert len(res["radar_chart_data"]) == 6
    keys = [row["key"] for row in res["radar_chart_data"]]
    assert "gnc" in keys
    assert "dti" in keys
    assert "asc" in keys
    assert "frh" in keys
    assert "cohesion" in keys
    assert "productivity" in keys

    # Verificar matriz de comparación y líderes
    assert len(res["comparison_matrix"]) >= 10
    assert len(res["dimension_leaders"]) == 6

def test_compare_groups_api_endpoints():
    # Test GET
    response = client.get("/api/v1/analytics/compare-groups")
    assert response.status_code == 200
    data = response.json()
    assert "groups" in data
    assert "radar_chart_data" in data
    assert "comparison_matrix" in data

    # Test POST
    post_resp = client.post("/api/v1/analytics/compare-groups", json={"group_ids": []})
    assert post_resp.status_code == 200
    pdata = post_resp.json()
    assert "groups" in pdata
    assert "radar_chart_data" in pdata
