import io
import csv
import pytest
from backend.app import repository, reports
from backend.app.repository import abpoxx_pybind as pb

def test_dossier_pdf_generation_ram(monkeypatch):
    # Setup isolated group and researchers in RAM
    grp = pb.Group()
    grp.name = "Grupo Dossier Test"
    grp.external_code = "COL_DOSSIER"
    grp.classification = "A"
    g = pb.create_group(grp)
    gid = g.id

    r1 = pb.Researcher()
    r1.first_names = "Eydy"
    r1.last_names = "Suarez"
    r1.highest_education_level = "Doctorado"
    res1 = pb.create_researcher(r1)

    r2 = pb.Researcher()
    r2.first_names = "Holmes"
    r2.last_names = "Pinto"
    r2.highest_education_level = "Maestría"
    res2 = pb.create_researcher(r2)

    repository.add_member_to_group(gid, res1.id, "Líder")
    repository.add_member_to_group(gid, res2.id, "Investigador")

    p1 = pb.Product()
    p1.title = "Articulo de Alto Impacto"
    p1.family_id = 6
    p1.year = 2023
    p1.validation_status = "valid"
    prod1 = pb.create_product(p1)
    repository.link_product_to_group(gid, prod1.id)

    def mock_prods(res_id: int):
        if res_id in (res1.id, res2.id):
            return [prod1.id]
        return []

    monkeypatch.setattr(repository, "products_of_researcher", mock_prods)

    # 1. Test Dossier PDF generation
    pdf_bytes = reports.build_group_executive_dossier_pdf(gid)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")

    # 2. Test Ranking CSV export
    ranking_csv = reports.export_group_ranking_csv(gid)
    assert ranking_csv.startswith("\ufeff")  # UTF-8 BOM
    lines = [line.strip() for line in ranking_csv.strip().splitlines() if line.strip()]
    assert len(lines) >= 2
    assert "Posición" in lines[0]
    assert "Investigador" in lines[0]
    assert "Eydy Suarez" in ranking_csv or "Holmes Pinto" in ranking_csv

    # 3. Test Products CSV export
    products_csv = reports.export_group_products_csv(gid)
    assert products_csv.startswith("\ufeff")
    p_lines = [line.strip() for line in products_csv.strip().splitlines() if line.strip()]
    assert len(p_lines) >= 2
    assert "Articulo de Alto Impacto" in products_csv
