import pytest
from backend.app import repository
from backend.app.repository import abpoxx_pybind as pb

def test_ram_group_collaboration_network(monkeypatch):
    # Setup isolated group and researchers in RAM
    grp = pb.Group()
    grp.name = "Grupo Red Colaboracion Test"
    grp.external_code = "GRC_TEST"
    g = pb.create_group(grp)
    gid = g.id

    r1 = pb.Researcher()
    r1.first_names = "Carlos"
    r1.last_names = "Mendoza"
    r1.highest_education_level = "Doctorado"
    res1 = pb.create_researcher(r1)

    r2 = pb.Researcher()
    r2.first_names = "Laura"
    r2.last_names = "Gomez"
    r2.highest_education_level = "Maestría"
    res2 = pb.create_researcher(r2)

    r3 = pb.Researcher()
    r3.first_names = "David"
    r3.last_names = "Castro"
    r3.highest_education_level = "Pregrado"
    res3 = pb.create_researcher(r3)

    # Link members to group
    repository.add_member_to_group(gid, res1.id, "Líder")
    repository.add_member_to_group(gid, res2.id, "Investigador")
    repository.add_member_to_group(gid, res3.id, "Estudiante")

    # Product 1 co-authored by Carlos and Laura
    p1 = pb.Product()
    p1.title = "Articulo Conjunto 1"
    p1.validation_status = "valid"
    prod1 = pb.create_product(p1)
    repository.link_product_to_group(gid, prod1.id)

    # Product 2 co-authored by Carlos and Laura
    p2 = pb.Product()
    p2.title = "Articulo Conjunto 2"
    p2.validation_status = "valid"
    prod2 = pb.create_product(p2)
    repository.link_product_to_group(gid, prod2.id)

    # Mock products_of_researcher in RAM mode
    def mock_prods(res_id: int):
        if res_id in (res1.id, res2.id):
            return [prod1.id, prod2.id]
        return []

    monkeypatch.setattr(repository, "products_of_researcher", mock_prods)

    # Calculate RAM network
    net = repository._ram_group_collaboration_network(gid)
    assert "nodes" in net
    assert "edges" in net
    assert "metrics" in net

    assert net["metrics"]["total_nodes"] == 3
    assert net["metrics"]["total_edges"] == 1
    assert net["metrics"]["max_weight"] == 2
    assert net["metrics"]["isolated_nodes"] == 1  # David has no coauthorship

    # Verify edge between Carlos and Laura
    edge = net["edges"][0]
    assert edge["weight"] == 2
    assert set([edge["source"], edge["target"]]) == set([res1.id, res2.id])
