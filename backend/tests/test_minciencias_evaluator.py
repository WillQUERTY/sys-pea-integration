import pytest
from backend.app.minciencias_evaluator import evaluate_group_minciencias
from backend.app import repository
from backend.app.config import settings
from backend.app.main import _init_from_local_json

@pytest.fixture(scope="module", autouse=True)
def setup_data():
    _init_from_local_json(repository, settings)

def test_evaluate_group_minciencias_aitice():
    # Evaluate group 10 (AITICE) with real dataset
    diag = evaluate_group_minciencias(10, repository)
    assert diag is not None
    assert diag["group_id"] == 10
    assert diag["group_name"] == "AITICE"
    
    summary = diag["summary"]
    assert summary["products_in_window"] > 0
    assert summary["cohesion_index"] > 0
    assert summary["cohesion_met"] is True
    assert summary["top_count"] >= 1
    assert summary["frh_a_count"] >= 1
    assert diag["max_qualified_tier"] == "A1"

def test_evaluate_group_minciencias_gisico():
    # Evaluate group 35 (GISICO)
    diag = evaluate_group_minciencias(35, repository)
    assert diag is not None
    assert diag["group_id"] == 35
    assert "GISICO" in diag["group_name"]
    
    summary = diag["summary"]
    assert summary["products_in_window"] > 0
    assert summary["cohesion_index"] > 0
    assert summary["cohesion_met"] is True
    # GISICO does not have doctoral thesis directed
    assert summary["frh_a_count"] == 0
    # Therefore it qualifies for B, and is blocked for A
    assert diag["max_qualified_tier"] == "B"
    assert diag["next_tier"] == "A"
    assert any("Doctoral" in gap for gap in diag["next_tier_gap"])
