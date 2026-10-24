"""
backend/tests/test_indicador_oficial_http.py
Contrato HTTP del bloque oficial `modelo_oficial_2024` (Fase 6).

El bloque oficial ya estaba atado al CONTRATO ÚNICO en la capa del EVALUADOR
(`test_indicador_oficial_contrato.py`) y en el CLI C++ (`pea_paridad_indicador
--golden`), pero la CAPA HTTP —la que consume el frontend— no tenía prueba
propia: un cambio en el router o en el repositorio podía mouldar el payload
sin que ninguna verificación se-enterara.

Este test carga el CASO SINTÉTICO del contrato en la RAM y pide el endpoint
real por HTTP, así que el golden queda validado en las tres capas de una vez:

    backend/evaluador  ==  HTTP (este test)  ==  CLI C++  ==  golden

Ejecutar desde la raíz del repo:
    python -X utf8 -m pytest backend/tests/test_indicador_oficial_http.py -v
"""

from __future__ import annotations

import datetime

import pytest
from fastapi.testclient import TestClient

from backend.app import repository
from backend.app.config import settings
from backend.app.evaluator.contrato_oficial import (
    CONTRATO,
    RUTA_CASO,
    cargar_golden,
    comparar_indicadores,
    validar_contra_contrato,
)
from backend.app.evaluator.official_population import evaluar_modelo_oficial

RUTA_DIAGNOSTICO = "/api/v1/groups/{group_id}/minciencias-diagnosis"


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


def _diagnostico(cliente: TestClient, group_id: int) -> dict:
    resp = cliente.get(RUTA_DIAGNOSTICO.format(group_id=group_id))
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_el_endpoint_responde_con_el_bloque_oficial(cliente_http):
    payload = _diagnostico(cliente_http, 10)

    assert payload["group_id"] == 10
    assert payload["group_name"]
    assert "modelo_oficial_2024" in payload
    assert payload["modelo_oficial_2024"]["grupo"]["id"] == 10


def test_el_payload_http_cumple_el_contrato_declarado(cliente_http):
    """La forma que sale por HTTP es la del CONTRATO (20 claves raíz)."""
    oficial = _diagnostico(cliente_http, 10)["modelo_oficial_2024"]

    errores = validar_contra_contrato(oficial, CONTRATO)
    assert errores == [], errores


def test_el_payload_http_no_altera_lo_calculado_por_el_evaluador(cliente_http):
    """El router es un passthrough: no puede mover ni un decimal."""
    oficial = _diagnostico(cliente_http, 10)["modelo_oficial_2024"]
    esperado = evaluar_modelo_oficial(repository, 10)

    diferencias = comparar_indicadores(oficial, esperado, 1e-9, "HTTP", "evaluador")
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

    for group_id in sorted(golden["esperado"]):
        oficial = _diagnostico(cliente_http, group_id)["modelo_oficial_2024"]
        diferencias = comparar_indicadores(
            oficial,
            golden["esperado"][str(group_id)],
            golden["tolerancia"],
            "HTTP",
            "golden",
        )
        assert diferencias == [], f"grupo {group_id}: {diferencias[:5]}"


def test_el_legacy_via_por_http_como_aproximacion_rotulada(cliente_http):
    """El legacy se expone como `i_grupo_legacy` y ya no como `i_grupo`."""
    payload = _diagnostico(cliente_http, 10)

    assert "i_grupo_legacy" in payload
    assert "i_grupo" not in payload
    # El semáforo (insumo del legacy) sigue intacto: la deprecación es del
    # NOMBRE y del rótulo, no un borrado que rompa la categorización.
    assert payload["max_qualified_tier"]
    assert payload["tiers"]
