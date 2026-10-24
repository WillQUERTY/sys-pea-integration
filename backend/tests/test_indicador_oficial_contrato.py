"""Tests del CONTRATO ÚNICO de la lectura oficial `modelo_oficial_2024`.

Fase 3 (brecha B7) del plan `docs/plan-integracion-modelo-oficial.md`: la
forma del bloque oficial estaba escrita a mano tres veces (C++, Python,
TypeScript). Ahora hay UN contrato declarado
(`backend/app/evaluator/contrato_oficial.py::CONTRATO`) del que se derivan:

- el golden versionado (`backend/tests/fixtures/indicador_oficial_golden.json`),
- el tipo TypeScript `MincienciasOfficialModel2024`,
- el fixture tipado del panel del frontend.

Estos tests fijan que:

1. el golden reproduce exactamente el modelo oficial sobre el caso sintético,
2. el payload real cumple el contrato (claves y tipos),
3. los artefactos generados están al día (si alguien cambia la forma del
   payload sin regenerarlos, el test falla).
"""

import json

import pytest

from backend.app.evaluator.contrato_oficial import (
    ANO_CIERRE,
    CONTRATO,
    RUTA_FIXTURE_TS,
    RUTA_GOLDEN,
    RUTA_TS,
    calcular_esperados,
    cargar_golden,
    comparar_indicadores,
    contenido_fixture_ts,
    contrato_a_ts,
    validar_contra_contrato,
)

#: Claves raíz que la API entrega dentro de `modelo_oficial_2024`.
CLAVES_RAIZ = (
    "modelo",
    "anio_cierre",
    "grupo",
    "ind_grupo",
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
    "supuestos",
)


@pytest.fixture(scope="module")
def golden():
    return cargar_golden()


@pytest.fixture(scope="module")
def esperados():
    return calcular_esperados(ANO_CIERRE)


# --- El golden reproduce el modelo --------------------------------------------


def test_el_golden_declara_el_contrato_y_los_esperados(golden):
    assert golden["contrato"] == CONTRATO
    assert golden["ano_cierre"] == ANO_CIERRE
    assert golden["esperado"], "el golden no trae expectativas"


def test_el_golden_reproduce_el_modelo(esperados, golden):
    """Recalcular el caso sintético debe dar EXACTAMENTE el golden."""
    for gid, payload in esperados.items():
        esperado = golden["esperado"][gid]
        diferencias = comparar_indicadores(
            payload, esperado, etiqueta_a="calculado", etiqueta_b="golden"
        )
        assert not diferencias, f"grupo {gid}: {diferencias[:10]}"


def test_el_caso_sintetico_es_determinista(esperados):
    otra_vez = calcular_esperados(ANO_CIERRE)
    assert not comparar_indicadores(esperados, otra_vez)


# --- El payload cumple el contrato ---------------------------------------------


def test_el_payload_cumple_el_contrato(esperados):
    for gid, payload in esperados.items():
        errores = validar_contra_contrato(payload, CONTRATO)
        assert not errores, f"grupo {gid}: {errores}"


def test_el_contrato_declara_exactamente_las_claves_del_payload(esperados, golden):
    for gid, payload in golden["esperado"].items():
        assert set(payload) == set(CONTRATO), f"grupo {gid}: claves divergentes"
        assert set(payload) == set(CLAVES_RAIZ)


def test_el_contrato_detecta_una_clave_que_falta(esperados):
    """El validador no es un chequeo vazío: sabe decir qué falta."""
    payload = dict(esperados["10"])
    payload.pop("cohe")
    errores = validar_contra_contrato(payload, CONTRATO)
    assert any("cohe" in error for error in errores)


def test_el_contrato_detecta_un_tipo_equivocado(esperados):
    payload = dict(esperados["10"])
    payload["ind_grupo"] = "0,815"
    errores = validar_contra_contrato(payload, CONTRATO)
    assert any("ind_grupo" in error for error in errores)


# --- Los artefactos generados están al día ------------------------------------


def test_el_tipo_typescript_generado_esta_al_dia():
    assert RUTA_TS.exists(), "falta el tipo generado: ejecuta gen_contrato_oficial.py --regenerar"
    assert RUTA_TS.read_text(encoding="utf-8") == contrato_a_ts(CONTRATO)


def test_el_fixture_del_frontend_generado_esta_al_dia(esperados):
    assert RUTA_FIXTURE_TS.exists(), (
        "falta el fixture generado: ejecuta gen_contrato_oficial.py --regenerar"
    )
    assert RUTA_FIXTURE_TS.read_text(encoding="utf-8") == contenido_fixture_ts(esperados)


def test_el_golden_en_disco_es_el_que_se_usa(esperados):
    """El JSON versionado y el golden en memoria son el mismo documento."""
    en_disco = json.loads(RUTA_GOLDEN.read_text(encoding="utf-8"))
    assert en_disco["contrato"] == CONTRATO
    assert set(en_disco["esperado"]) == set(esperados)


# --- La lectura oficial cubre los casos del modelo ----------------------------


def test_el_golden_ejercita_las_cuatro_situaciones_del_modelo(esperados):
    """El caso sintético no es decorativo: cubre lo que el modelo debe resolver.

    - ventana que manda sobre la edad (grupo 10: edad 8 > ventana 5),
    - edad que manda sobre la ventana (grupo 20: edad 2 < ventana 5),
    - producto sin año verificable,
    - producto fuera de la ventana de observación,
    - exclusiones por categoría no verificable (con motivo explícito),
    - coautoría interna (Cohe) y cooperación con otro grupo (Coop).
    """
    aitice = esperados["10"]
    gisico = esperados["20"]

    assert aitice["grupo"]["edad_anos"] == 8
    assert gisico["grupo"]["edad_anos"] == 2
    # Grupo 10: la ventana del subtipo (5) manda sobre la edad (8).
    assert {s["periodo"] for s in aitice["subtipos"]} == {5}
    # Grupo 20: la edad (2) manda sobre la ventana (5).
    assert {s["periodo"] for s in gisico["subtipos"]} == {2}

    assert aitice["sin_ano"], "debe haber un producto sin año verificable"
    assert aitice["fuera_de_periodo"], "debe haber un producto fuera de la ventana"
    assert aitice["excluidos"], "debe haber exclusiones con motivo explícito"

    # Cohe: 4 autores del grupo sobre 2 productos relacionales → 1,0.
    assert aitice["cohe"] == {"suma_autores": 4, "productos": 2, "valor": 1.0}
    # Coop: 3 grupos relacionados sobre 2 productos → 0,5.
    assert aitice["coop"] == {"suma_grupos": 3, "productos": 2, "valor": 0.5}
    # El grupo joven no coescribe, pero coopera con el grupo grande.
    assert gisico["cohe"]["valor"] == 0.0
    assert gisico["coop"]["valor"] == 1.0


def test_el_ind_grupo_es_la_suma_de_los_9_terminos(esperados):
    """§3.10: Ind.Grupo = Σ (coeficiente × índice). El golden lo respalda."""
    from backend.app.evaluator.official_indicator import COEFICIENTES

    for gid, payload in esperados.items():
        suma = sum(payload["terminos_ponderados"].values())
        assert abs(suma - payload["ind_grupo"]) < 1e-9, f"grupo {gid}"
        for termino, coeficiente in COEFICIENTES.items():
            indice = payload["indices"][termino]
            esperado = coeficiente * indice
            assert abs(payload["terminos_ponderados"][termino] - esperado) < 1e-9
