"""Tests del adaptador del modelo oficial 2024 sobre la población real.

El dataset real (`pea_data.json`) tiene 2 grupos (AITICE #10 y GISICO #35).
Estos tests verifican tres cosas:

1. Los helpers puros (año, edad, familia relacional, grupos relacionados) se
   comportan como dicta el modelo — con datos de ejemplo, no con el dataset.
2. La evaluación sobre los grupos reales produce un desglose completo del
   modelo oficial (§2.2.9 → §3.10) y normaliza contra TODA la población (§3.9).
3. El endpoint de diagnóstico mantiene su contrato: las claves legacy siguen
   intactas y el modelo oficial llega como clave ADITIVA `modelo_oficial_2024`.
"""

import pytest

from backend.app import repository
from backend.app.config import settings
from backend.app.evaluator.official_indicator import COEFICIENTES
from backend.app.evaluator.official_population import (
    edad_grupo,
    evaluar_modelo_oficial,
    extraer_anio,
    familia_relacional,
    grupos_relacionados,
)
from backend.app.main import _init_from_local_json

ANO_CIERRE = 2026


@pytest.fixture(scope="module", autouse=True)
def setup_data():
    _init_from_local_json(repository, settings)


# --- Helpers puros ------------------------------------------------------------


def test_extraer_anio_acepta_dict_y_modelo():
    assert extraer_anio({"year": 2024, "description": "x"}) == 2024
    assert extraer_anio({"obtained_date": "2019-05-01"}) == 2019
    assert extraer_anio({"publication_date": "2018"}) == 2018
    # Sin campos: se busca el primer año plausible de la descripción GrupLAC.
    assert extraer_anio({"description": "Desde 9 2025 hasta Abril 2026"}) == 2025
    # Años espurios (fuera de 1950–2050) no cuentan.
    assert extraer_anio({"year": 1909}) is None
    assert extraer_anio({}) is None


def test_grupos_relacionados_cuenta_el_propio_y_los_de_los_coautores():
    membresias = {10: {10}, 200: {10, 35}}
    # Solo el propio grupo: 1 grupo relacionado → cero cooperación.
    assert grupos_relacionados(10, [10], membresias) == 1
    # Un coautor vinculado a otro grupo: 2 grupos relacionados.
    assert grupos_relacionados(10, [10, 200], membresias) == 2
    # Autor externo (sin investigador vinculado) no aporta grupos.
    assert grupos_relacionados(10, [0], membresias) == 1


def test_edad_grupo_usa_el_primer_anio_de_produccion():
    assert edad_grupo(2026, [2019, 2024]) == 7
    assert edad_grupo(2026, []) == 1
    assert edad_grupo(2026, [2019, 2024], edad_manual=3) == 3


def test_familia_relacional_solo_propaga_gnc_y_dti():
    assert familia_relacional({"family_id": 6}, "12.- Publicado en revista especializada") == "GNC"
    assert familia_relacional({"family_id": 7}, "20.- Computacional : SISTEMA") == "DTI"
    # DPC y FRH no son dominio de Cohe/Coop (§2.2.10).
    assert familia_relacional({"family_id": 9}, "3.- Documento de trabajo (Working Paper)") is None
    assert familia_relacional({"family_id": 10}, "Trabajo de grado de pregrado") is None


# --- Población real ----------------------------------------------------------


def test_evaluar_modelo_oficial_aitice():
    r = evaluar_modelo_oficial(repository, 10, ano_cierre=ANO_CIERRE)

    assert r["grupo"]["id"] == 10
    assert "AITICE" in r["grupo"]["identificacion"]
    assert r["grupo"]["edad_anos"] > 0
    assert 0.0 < r["ind_grupo"] <= sum(COEFICIENTES.values())

    # Los nueve términos de §3.10, con su índice normalizado y su ponderación.
    assert set(r["indices"]) == set(COEFICIENTES)
    assert set(r["terminos_ponderados"]) == set(COEFICIENTES)
    for termino, coef in COEFICIENTES.items():
        assert r["terminos_ponderados"][termino] == pytest.approx(
            coef * r["indices"][termino], rel=1e-9
        )
    assert r["ind_grupo"] == pytest.approx(sum(r["terminos_ponderados"].values()), rel=1e-9)

    # Cohe/Coop con su desglose §2.2.10.
    assert r["cohe"]["productos"] > 0
    assert r["cohe"]["valor"] == pytest.approx(
        r["cohe"]["suma_autores"] / r["cohe"]["productos"] - 1, rel=1e-9
    )
    assert r["coop"]["valor"] == pytest.approx(
        r["coop"]["suma_grupos"] / r["coop"]["productos"] - 1, rel=1e-9
    )


def test_evaluar_modelo_oficial_gisico():
    r = evaluar_modelo_oficial(repository, 35, ano_cierre=ANO_CIERRE)
    assert r["grupo"]["id"] == 35
    assert "GISICO" in r["grupo"]["identificacion"]
    assert 0.0 < r["ind_grupo"] <= sum(COEFICIENTES.values())
    # GISICO no dirige tesis de doctorado → sin Fr.A.
    assert r["ind_clase"]["FRH-A"] == 0.0
    assert r["indices"]["Fr.A"] == 0.0


def test_normalizacion_contra_toda_la_poblacion():
    """§3.9: el índice es el valor sobre el máximo de la población, no sobre
    el propio grupo. La población medida son los 2 grupos del repositorio."""
    a = evaluar_modelo_oficial(repository, 10, ano_cierre=ANO_CIERRE)
    b = evaluar_modelo_oficial(repository, 35, ano_cierre=ANO_CIERRE)

    assert len(a["poblacion"]) == 2
    assert len(b["poblacion"]) == 2
    # El primero de la población es el de mayor Ind.Grupo y su Ind.Clase máximo
    # vale exactamente 1.0 (es el máximo de la población).
    primero = a["poblacion"][0]
    segundo = a["poblacion"][1]
    assert primero["ind_grupo"] >= segundo["ind_grupo"]

    maximos = max(a["maximos_poblacion"].values())
    assert maximos > 0
    assert a["maximos_poblacion"] == b["maximos_poblacion"]

    # Cada índice está en [0, 1] porque el denominador es un máximo.
    for resultado in (a, b):
        for nombre, valor in resultado["indices"].items():
            assert 0.0 <= valor <= 1.0, nombre


def test_exclusiones_quedan_documentadas():
    r = evaluar_modelo_oficial(repository, 10, ano_cierre=ANO_CIERRE)
    # Los productos que la fuente no permite clasificar se excluyen CON motivo.
    assert sum(r["excluidos"].values()) > 0
    assert any("Publindex" in motivo for motivo in r["excluidos"])
    assert r["supuestos"]


# --- Contrato del endpoint -----------------------------------------------------


def test_endpoint_agrega_el_modelo_oficial_sin_romper_el_contrato():
    diagnostico = repository.get_group_minciencias_diagnosis(10)

    # Claves legacy intactas (las usa el frontend).
    assert diagnostico["group_id"] == 10
    assert "i_grupo" in diagnostico
    assert "max_qualified_tier" in diagnostico
    assert "summary" in diagnostico

    # Clave aditiva del modelo oficial.
    oficial = diagnostico["modelo_oficial_2024"]
    assert oficial["grupo"]["id"] == 10
    assert oficial["anio_cierre"] >= 2024
    assert "ind_grupo" in oficial
