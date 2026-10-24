"""
backend/tests/test_indicador_individual_http.py
Contrato HTTP de la ADAPTACIÓN INDIVIDUAL (`adaptacion_individual_2024`, Fase 5).

El bloque individual ya estaba atado al CONTRATO ÚNICO en la capa del
EVALUADOR (`test_indicador_individual_contrato.py`), pero la CAPA HTTP —la que
consume el frontend— podía moldar el payload sin que ninguna verificación se
enterara (el mismo hueco que cerró `test_indicador_oficial_http.py` en la Fase 6).

Este test carga el CASO SINTÉTICO del contrato en la RAM y pide el endpoint
real por HTTP, así que el golden queda validado en las tres capas de una vez:

    backend/evaluador  ==  HTTP (este test)  ==  CLI C++  ==  golden

Ejecutar desde la raíz del repo:
    python -X utf8 -m pytest backend/tests/test_indicador_individual_http.py -v
"""

from __future__ import annotations

import datetime

import pytest
from fastapi.testclient import TestClient

from backend.app import repository
from backend.app.config import settings
from backend.app.evaluator.contrato_individual import (
    RUTA_CASO,
    cargar_golden,
    comparar_indicadores,
    validar_individual,
)
from backend.app.evaluator.official_researcher_population import evaluar_modelo_individual

RUTA_INDICADOR = "/api/v1/researchers/{researcher_id}/indicator"


@pytest.fixture(scope="module")
def cliente_http():
    """TestClient con la RAM cargada con el caso sintético del contrato.

    NO se entra al lifespan de la app a propósito: `main._init_from_local_json`
    pisaría la RAM con `pea_data.json` (que no es el caso del golden). El
    `load_from_file` del núcleo C++ reconstruye la RAM desde cero, así que el
    caso sintético queda como única población.
    """
    from backend.app.main import app

    assert repository.initialize(repository.InitMode.File, str(RUTA_CASO)), (
        f"no se pudo cargar el caso sintético en la RAM: {RUTA_CASO}"
    )
    cliente = TestClient(app)
    try:
        yield cliente
    finally:
        # Restaurar la RAM del repositorio local para no contaminar otros tests.
        if settings.DATA_JSON_PATH.exists():
            repository.initialize(repository.InitMode.File, str(settings.DATA_JSON_PATH))
        else:
            repository.initialize(repository.InitMode.Empty, "")


def _indicador(cliente: TestClient, researcher_id: int) -> dict:
    resp = cliente.get(RUTA_INDICADOR.format(researcher_id=researcher_id))
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_el_endpoint_responde_con_la_adaptacion_individual(cliente_http):
    payload = _indicador(cliente_http, 101)

    assert payload["researcher_id"] == 101
    assert payload["researcher_name"] == "Ana Perez"
    assert "adaptacion_individual_2024" in payload
    assert payload["adaptacion_individual_2024"]["investigador"]["id"] == 101


def test_el_legacy_via_por_http_como_aproximacion_rotulada(cliente_http):
    """El legacy se expone como `i_investigador_legacy` y ya no como
    `i_investigador`: ese nombre queda para la adaptación declarada."""
    payload = _indicador(cliente_http, 101)

    assert "i_investigador_legacy" in payload
    assert "i_investigador" not in payload
    # El desglose descriptivo del legacy sigue intacto.
    assert payload["summary"]["total_products"] >= 0


def test_el_payload_http_cumple_el_contrato_declarado(cliente_http):
    """La forma que sale por HTTP es la del CONTRATO INDIVIDUAL."""
    adaptacion = _indicador(cliente_http, 101)["adaptacion_individual_2024"]

    errores = validar_individual(adaptacion)
    assert errores == [], errores


def test_el_payload_http_no_altera_lo_calculado_por_el_evaluador(cliente_http):
    """El router es un passthrough: no puede mover ni un decimal."""
    adaptacion = _indicador(cliente_http, 101)["adaptacion_individual_2024"]
    esperado = evaluar_modelo_individual(repository, 101)

    diferencias = comparar_indicadores(adaptacion, esperado, 1e-9, "HTTP", "evaluador")
    assert diferencias == [], diferencias


def test_el_payload_http_iguala_al_golden_del_contrato(cliente_http):
    """El golden versionado se cumple en la capa HTTP, no solo en el evaluador."""
    golden = cargar_golden()
    anio_actual = datetime.datetime.now().year
    if anio_actual != golden["ano_cierre"]:
        pytest.skip(
            f"el golden está fijado al cierre {golden['ano_cierre']} y el endpoint "
            f"usa el año en curso ({anio_actual}): la comparación numérica no aplica"
        )

    for researcher_id in sorted(golden["esperado"]):
        adaptacion = _indicador(cliente_http, int(researcher_id))["adaptacion_individual_2024"]
        diferencias = comparar_indicadores(
            adaptacion,
            golden["esperado"][str(researcher_id)],
            golden["tolerancia"],
            "HTTP",
            "golden",
        )
        assert diferencias == [], f"investigador {researcher_id}: {diferencias[:5]}"


def test_el_rotulo_no_oficial_llega_por_http(cliente_http):
    """Lo que el frontend muestra depende de esto: el bloque debe llegar
    rotulado como adaptación, nunca como indicador oficial del modelo."""
    adaptacion = _indicador(cliente_http, 101)["adaptacion_individual_2024"]

    assert "NO oficial" in adaptacion["modelo"]
    assert len(adaptacion["adaptaciones"]) == 3
    assert adaptacion["supuestos"]
