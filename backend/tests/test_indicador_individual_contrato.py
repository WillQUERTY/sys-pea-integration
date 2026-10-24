"""Tests del CONTRATO ÚNICO de la ADAPTACIÓN INDIVIDUAL (`adaptacion_individual_2024`).

Fase 5 (brecha B3 / decisión D5) del plan `docs/plan-integracion-modelo-oficial.md`.
La forma del bloque individual se declara UNA sola vez
(`backend/app/evaluator/contrato_individual.py::CONTRATO_INDIVIDUAL`) y de ahí
se derivan:

- el golden versionado (`backend/tests/fixtures/indicador_individual_golden.json`),
- el tipo TypeScript `MincienciasIndividualAdaptation2024`,
- el fixture tipado del frontend.

Estos tests fijan que:

1. el golden reproduce exactamente la adaptación sobre el caso sintético,
2. el payload real cumple el contrato (claves y tipos),
3. los artefactos generados están al día,
4. el rótulo NO OFICIAL y las TRES adaptaciones viajan en el payload (esto es
   lo que impide que la adaptación se presente como indicador oficial).
"""

import json

import pytest

from backend.app.evaluator.contrato_individual import (
    ANO_CIERRE,
    CONTRATO_INDIVIDUAL,
    RUTA_FIXTURE_TS,
    RUTA_GOLDEN,
    RUTA_TS,
    calcular_esperados_individual,
    cargar_golden,
    comparar_indicadores,
    contenido_fixture_ts_individual,
    contenido_tipo_ts_individual,
    validar_individual,
)
from backend.app.evaluator.official_indicator import COEFICIENTES

#: Claves raíz que la API entrega dentro de `adaptacion_individual_2024`.
CLAVES_RAIZ = (
    "modelo",
    "base_normativa",
    "anio_cierre",
    "investigador",
    "ind_investigador",
    "rango_teorico",
    "posicion_poblacion",
    "poblacion",
    "indices",
    "terminos_ponderados",
    "ind_clase",
    "maximos_poblacion",
    "maximo_cohe_poblacion",
    "maximo_coop_poblacion",
    "subtipos",
    "cohe",
    "coop",
    "excluidos",
    "sin_ano",
    "fuera_de_periodo",
    "adaptaciones",
    "supuestos",
)


@pytest.fixture(scope="module")
def golden():
    return cargar_golden()


@pytest.fixture(scope="module")
def esperados():
    return calcular_esperados_individual(ANO_CIERRE)


# --- El golden reproduce la adaptación -----------------------------------------


def test_el_golden_declara_el_contrato_y_los_esperados(golden):
    assert golden["contrato"] == CONTRATO_INDIVIDUAL
    assert golden["ano_cierre"] == ANO_CIERRE
    assert golden["esperado"], "el golden no trae expectativas"


def test_el_golden_reproduce_la_adaptacion(esperados, golden):
    """Recalcular el caso sintético debe dar EXACTAMENTE el golden."""
    for rid, payload in esperados.items():
        esperado = golden["esperado"][rid]
        diferencias = comparar_indicadores(
            payload, esperado, etiqueta_a="calculado", etiqueta_b="golden"
        )
        assert not diferencias, f"investigador {rid}: {diferencias[:10]}"


def test_el_caso_sintetico_es_determinista(esperados):
    otra_vez = calcular_esperados_individual(ANO_CIERRE)
    assert not comparar_indicadores(esperados, otra_vez)


# --- El payload cumple el contrato ----------------------------------------------


def test_el_payload_cumple_el_contrato(esperados):
    for rid, payload in esperados.items():
        errores = validar_individual(payload)
        assert not errores, f"investigador {rid}: {errores}"


def test_el_contrato_declara_exactamente_las_claves_del_payload(esperados, golden):
    for rid, payload in golden["esperado"].items():
        assert set(payload) == set(CONTRATO_INDIVIDUAL), f"investigador {rid}"
        assert set(payload) == set(CLAVES_RAIZ)


def test_el_contrato_detecta_una_clave_que_falta(esperados):
    payload = dict(esperados["101"])
    payload.pop("adaptaciones")
    errores = validar_individual(payload)
    assert any("adaptaciones" in error for error in errores)


def test_el_contrato_detecta_un_tipo_equivocado(esperados):
    payload = dict(esperados["101"])
    payload["ind_investigador"] = "0,738"
    errores = validar_individual(payload)
    assert any("ind_investigador" in error for error in errores)


# --- Los artefactos generados están al día -------------------------------------


def test_el_tipo_typescript_generado_esta_al_dia():
    assert RUTA_TS.exists(), (
        "falta el tipo generado: ejecuta gen_contrato_individual.py --regenerar"
    )
    assert RUTA_TS.read_text(encoding="utf-8") == contenido_tipo_ts_individual()


def test_el_fixture_del_frontend_generado_esta_al_dia(esperados):
    assert RUTA_FIXTURE_TS.exists(), (
        "falta el fixture generado: ejecuta gen_contrato_individual.py --regenerar"
    )
    assert (
        RUTA_FIXTURE_TS.read_text(encoding="utf-8")
        == contenido_fixture_ts_individual(esperados)
    )


def test_el_golden_en_disco_es_el_que_se_usa(esperados):
    en_disco = json.loads(RUTA_GOLDEN.read_text(encoding="utf-8"))
    assert en_disco["contrato"] == CONTRATO_INDIVIDUAL
    assert set(en_disco["esperado"]) == set(esperados)


# --- El rótulo honesto viaja en el golden --------------------------------------


def test_el_golden_no_se_presenta_como_indicador_oficial(esperados):
    """El bloque individual NO puede rotularse como el indicador del modelo:
    el modelo 2024 no define producción por persona."""
    for rid, payload in esperados.items():
        assert "NO oficial" in payload["modelo"], rid
        assert payload["adaptaciones"], rid
        assert len(payload["adaptaciones"]) == 3, rid
        assert payload["supuestos"], rid


def test_el_ind_investigador_es_la_suma_de_los_nueve_terminos(esperados):
    for rid, payload in esperados.items():
        suma = sum(payload["terminos_ponderados"].values())
        assert abs(suma - payload["ind_investigador"]) < 1e-9, rid
        for termino, coeficiente in COEFICIENTES.items():
            indice = payload["indices"][termino]
            assert abs(payload["terminos_ponderados"][termino] - coeficiente * indice) < 1e-9


# --- El caso sintético ejercita lo que la adaptación debe resolver --------------


def test_el_golden_ejercita_las_situaciones_de_la_adaptacion(esperados):
    """El caso no es decorativo: cubre lo que la adaptación individual debe
    resolver frente al caso de grupo.

    - antigüedad que acota la ventana (Sara: 2 años) y ventana que acota la
      antigüedad (Ana: 8 años → período 5),
    - producto sin año verificable,
    - producto fuera de la ventana de observación,
    - exclusiones por categoría no verificable (con motivo explícito),
    - Cohe (coautores registrados) y Coop (grupos de la red).
    """
    ana = esperados["101"]
    luis = esperados["102"]
    sara = esperados["103"]

    assert ana["investigador"]["antiguedad_anos"] == 8
    assert luis["investigador"]["antiguedad_anos"] == 7
    assert sara["investigador"]["antiguedad_anos"] == 2

    # Sara: la antigüedad (2) manda sobre la ventana (5).
    assert {s["periodo"] for s in sara["subtipos"]} == {2}
    # Ana: la ventana (5) manda sobre la antigüedad (8).
    assert {s["periodo"] for s in ana["subtipos"]} == {5}

    assert luis["sin_ano"], "debe haber un producto sin año verificable"
    assert ana["fuera_de_periodo"], "debe haber un producto fuera de la ventana"
    assert ana["excluidos"], "debe haber exclusiones con motivo explícito"

    # Cohe: firmantes registrados por producto − 1 (autoría sola = 0).
    assert ana["cohe"]["valor"] == pytest.approx(7 / 3 - 1, rel=1e-9)
    # Coop: grupos de la red del investigador por producto − 1.
    assert ana["coop"]["valor"] == pytest.approx(5 / 3 - 1, rel=1e-9)
    # La red de Ana llega al grupo 20 (coautoría con el grupo joven).
    assert sara["coop"]["valor"] == pytest.approx(1.0, rel=1e-9)


def test_la_poblacion_del_golden_es_la_de_investigadores(esperados):
    """§3.9: la normalización es contra la población de INVESTIGADORES."""
    ana = esperados["101"]
    assert len(ana["poblacion"]) == 3
    assert {p["id"] for p in ana["poblacion"]} == {101, 102, 103}
    valores = [p["ind_investigador"] for p in ana["poblacion"]]
    assert valores == sorted(valores, reverse=True)
