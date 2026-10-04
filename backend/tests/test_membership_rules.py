import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app import repository
from backend.app.repository import abpoxx_pybind as pb

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_state():
    for g in pb.list_groups():
        pb.delete_group(g.id)
    for r in pb.list_researchers():
        pb.delete_researcher(r.id)
    pb.undo_clear()
    yield

def test_rv001_inverted_dates_rejected():
    grp = pb.Group()
    grp.name = "Grupo RV1"
    grp.external_code = "GRV1"
    g = pb.create_group(grp)

    res = pb.Researcher()
    res.first_names = "Carlos"
    res.last_names = "Gomez"
    res.external_code = "RG1"
    r = pb.create_researcher(res)

    # 1. Start date after end date directly in repository
    with pytest.raises(ValueError, match="RV-001"):
        repository.add_member_to_group(g.id, r.id, "Investigador", "2024-05", "2020-01")

    # 2. Inverted dates via API endpoint returns HTTP 400
    resp = client.post(
        f"/api/v1/groups/{g.id}/members/{r.id}",
        json={"role": "Investigador", "start_date": "2024-12-31", "end_date": "2021-01-01"}
    )
    assert resp.status_code == 400
    assert "RV-001" in resp.json()["detail"]

    # 3. Valid dates pass
    repository.add_member_to_group(g.id, r.id, "Investigador", "2020-01", "2022-12")
    det = repository.get_group_members_detailed(g.id)
    assert len(det) == 1

    # 4. Inverted dates in update_member
    with pytest.raises(ValueError, match="RV-001"):
        repository.update_member(g.id, r.id, "Director", "2025-01", "2023-01")

    # Inverted dates in update API endpoint returns HTTP 400
    resp_up = client.put(
        f"/api/v1/groups/{g.id}/members/{r.id}",
        json={"role": "Director", "start_date": "2025-01", "end_date": "2023-01"}
    )
    assert resp_up.status_code == 400
    assert "RV-001" in resp_up.json()["detail"]

def test_rv002_overlapping_and_reentry():
    grp = pb.Group()
    grp.name = "Grupo RV2"
    grp.external_code = "GRV2"
    g = pb.create_group(grp)

    res = pb.Researcher()
    res.first_names = "Maria"
    res.last_names = "Lopez"
    res.external_code = "RM1"
    r = pb.create_researcher(res)

    # 1. Add active member without end date (vigente)
    repository.add_member_to_group(g.id, r.id, "Investigador", "2021-01", "")
    det = repository.get_group_members_detailed(g.id)
    assert len(det) == 1
    assert det[0]["is_current"] is True

    # 2. Trying to add again while active fails (RV-002: vinculación vigente)
    with pytest.raises(ValueError, match="RV-002"):
        repository.add_member_to_group(g.id, r.id, "Investigador", "2023-01", "2024-01")

    # API returns HTTP 400
    resp = client.post(
        f"/api/v1/groups/{g.id}/members/{r.id}",
        json={"role": "Investigador", "start_date": "2023-01", "end_date": "2024-01"}
    )
    assert resp.status_code == 400
    assert "RV-002" in resp.json()["detail"]

    # 3. Close the membership period (past linkage: 2021-01 to 2022-12)
    repository.update_member(g.id, r.id, "Investigador", "2021-01", "2022-12")

    # 4. Overlapping period fails (e.g. 2022-06 to 2023-06 overlaps with 2021-01 to 2022-12)
    with pytest.raises(ValueError, match="RV-002"):
        repository.add_member_to_group(g.id, r.id, "Investigador", "2022-06", "2023-06")

    # 5. Non-overlapping re-entry succeeds (e.g. 2023-02 to 2025-12)
    repository.add_member_to_group(g.id, r.id, "Director", "2023-02", "2025-12")
    det = repository.get_group_members_detailed(g.id)
    assert len(det) == 1
    assert det[0]["role"] == "Director"
    assert det[0]["start_date"] == "2023-02"
    assert det[0]["end_date"] == "2025-12"
