"""Tests de la ADAPTACIÓN INDIVIDUAL del modelo Minciencias 2024 (Fase 5).

POR QUÉ ES UNA ADAPTACIÓN Y NO UN INDICADOR OFICIAL
El archivo normativo (`docs/modelo-medicion-2024.md`, Anexo 1 M601PR04G01 v02)
define UN indicador de producción: el **Ind.Grupo** (§3.10). Los tres
indicadores informativos del capítulo III (§3.11 IT, §3.12 EPInv, §3.13 EProd)
también son de GRUPO, y la convocatoria de reconocimiento de investigadores no
trae ninguna fórmula de producción POR PERSONA.

Por eso este módulo NO se rotula "Minciencias 2024" a secas: es una
adaptación declarada del pipeline §2.2.9 → §3.10 aplicado a la unidad
"investigador", y estos tests fijan justamente eso:

1. el rótulo honesto viaja en el payload (nunca "oficial"),
2. las TRES adaptaciones y los supuestos están documentados,
3. el cálculo es EXACTAMENTE el del pipeline de grupo (mismo código, misma
   fórmula, mismos coeficientes): solo cambian la unidad, el período y el
   Cohe/Coop de la red,
4. la normalización §3.9 se hace contra la población de investigadores.
"""

import pytest

from backend.app import repository
from backend.app.config import settings
from backend.app.evaluator.official_indicator import COEFICIENTES, ProductoOficial
from backend.app.evaluator.official_population import (
    descripcion_producto,
    extraer_anio,
    familia_relacional,
)
from backend.app.evaluator.official_researcher import (
    ADAPTACIONES,
    BASE_NORMATIVA,
    MODELO_INDIVIDUAL,
    InvestigadorOficial,
    evaluar_poblacion_investigadores,
)
from backend.app.evaluator.official_researcher_population import (
    construir_poblacion_investigadores,
    evaluar_modelo_individual,
    productos_de_investigador,
)
from backend.app.main import _init_from_local_json

ANO_CIERRE = 2026


@pytest.fixture(scope="module", autouse=True)
def setup_data():
    _init_from_local_json(repository, settings)


@pytest.fixture(scope="module")
def pueblo_real():
    """La población real de investigadores (se calcula una sola vez)."""
    return construir_poblacion_investigadores(repository, ANO_CIERRE)


@pytest.fixture(scope="module")
def investigador_con_productos():
    """El investigador con más productos en la RAM (para las lecturas)."""
    candidatos = []
    for investigador in repository.list_researchers():
        pids = productos_de_investigador(repository, investigador.id)
        if pids:
            candidatos.append((len(pids), investigador.id))
    assert candidatos, "el repositorio real no tiene investigadores con productos"
    candidatos.sort(reverse=True)
    return candidatos[0][1]


# --- El rótulo honesto ----------------------------------------------------------


def test_el_modelo_no_se_rotula_como_oficial():
    assert "NO oficial" in MODELO_INDIVIDUAL
    assert "adaptación" in MODELO_INDIVIDUAL
    # La base normativa dice qué parte SÍ es del modelo 2024.
    assert "§2.2.9" in BASE_NORMATIVA and "§3.10" in BASE_NORMATIVA
    assert "no oficial" in BASE_NORMATIVA


def test_las_tres_adaptaciones_estan_declaradas():
    assert len(ADAPTACIONES) == 3
    texto = " ".join(ADAPTACIONES).lower()
    assert "unidad" in texto
    assert "período" in texto or "periodo" in texto
    assert "cohe" in texto and "coop" in texto


def test_el_payload_declara_el_rotulo_y_las_adaptaciones(investigador_con_productos):
    r = evaluar_modelo_individual(repository, investigador_con_productos, ano_cierre=ANO_CIERRE)

    assert r["modelo"] == MODELO_INDIVIDUAL
    assert r["base_normativa"] == BASE_NORMATIVA
    assert r["adaptaciones"] == ADAPTACIONES
    assert r["supuestos"]


# --- El cálculo es el mismo pipeline del grupo ---------------------------------


def test_el_individual_es_el_mismo_pipeline_del_grupo():
    """La adaptación entra al pipeline de grupo con su antigüedad en el lugar
    de la "edad del grupo": el número NO puede divergir del modelo."""
    from backend.app.evaluator.official_indicator import (
        GrupoOficial,
        evaluar_poblacion,
    )

    unidad = InvestigadorOficial(
        identificacion="Prueba (#1)",
        antiguedad_anos=4,
        productos=[
            ProductoOficial(
                identificacion="1",
                categoria="WP",
                motivo="documento de trabajo (working paper)",
                ano=ANO_CIERRE - 1,
                autores_del_grupo=3,
                grupos_relacionados=2,
            )
        ],
    )

    individual = evaluar_poblacion_investigadores([unidad], ANO_CIERRE)[0]
    como_grupo = evaluar_poblacion(
        [GrupoOficial("Prueba (#1)", 4, list(unidad.productos))], ANO_CIERRE
    )[0]

    assert individual["ind_investigador"] == pytest.approx(como_grupo["ind_grupo"], rel=1e-12)
    assert individual["indices"] == como_grupo["indices"]
    assert individual["terminos_ponderados"] == como_grupo["terminos_ponderados"]
    # Las claves se renombran, los valores no.
    assert "ind_grupo" not in individual
    assert "grupo" not in individual
    assert individual["antiguedad_anos"] == 4


def test_la_antiguedad_acota_el_periodo_de_observacion():
    """§2.2.9 adaptado: período = min(antigüedad, ventana del subtipo)."""
    # Antigüedad 2 → el período de un WP (ventana 5) queda en 2.
    joven = InvestigadorOficial(
        identificacion="Joven (#2)",
        antiguedad_anos=2,
        productos=[
            ProductoOficial(
                identificacion="1", categoria="WP", motivo="working paper", ano=ANO_CIERRE - 1
            )
        ],
    )
    # Antigüedad 9 → manda la ventana (5).
    veterano = InvestigadorOficial(
        identificacion="Veterano (#3)",
        antiguedad_anos=9,
        productos=[
            ProductoOficial(
                identificacion="1", categoria="WP", motivo="working paper", ano=ANO_CIERRE - 1
            )
        ],
    )

    per_joven = evaluar_poblacion_investigadores([joven], ANO_CIERRE)[0]["subtipos"]["WP"]
    per_veterano = evaluar_poblacion_investigadores([veterano], ANO_CIERRE)[0]["subtipos"]["WP"]

    assert per_joven["periodo"] == 2
    assert per_veterano["periodo"] == 5
    # λ = ln(n / período + 1) (§2.2.9): con más ventana, λ es menor.
    assert per_joven["lambda"] > per_veterano["lambda"]


def test_el_ind_es_la_suma_de_los_nueve_terminos(pueblo_real):
    resultados = evaluar_poblacion_investigadores(pueblo_real, ANO_CIERRE)
    for resultado in resultados:
        assert set(resultado["indices"]) == set(COEFICIENTES)
        assert set(resultado["terminos_ponderados"]) == set(COEFICIENTES)
        suma = sum(resultado["terminos_ponderados"].values())
        assert resultado["ind_investigador"] == pytest.approx(suma, rel=1e-9)
        for termino, coeficiente in COEFICIENTES.items():
            assert resultado["terminos_ponderados"][termino] == pytest.approx(
                coeficiente * resultado["indices"][termino], rel=1e-9
            )
        assert 0.0 <= resultado["ind_investigador"] <= sum(COEFICIENTES.values())


# --- La población real ----------------------------------------------------------


def test_la_poblacion_real_cubre_a_los_investigadores_del_repositorio(pueblo_real):
    esperados = {
        r.id for r in repository.list_researchers() if r.id > 0
    }
    assert {inv.id_investigador for inv in pueblo_real} == esperados


def test_la_lectura_real_trae_el_desglose_completo(investigador_con_productos):
    r = evaluar_modelo_individual(repository, investigador_con_productos, ano_cierre=ANO_CIERRE)

    assert r["investigador"]["id"] == investigador_con_productos
    assert r["investigador"]["antiguedad_anos"] >= 1
    assert 0.0 < r["ind_investigador"] <= sum(COEFICIENTES.values())
    assert r["rango_teorico"] == pytest.approx(sum(COEFICIENTES.values()))

    # §3.9: normalizado contra TODA la población de investigadores.
    assert r["posicion_poblacion"]["de"] == len(r["poblacion"])
    assert r["posicion_poblacion"]["puesto"] >= 1
    for valor in r["indices"].values():
        assert 0.0 <= valor <= 1.0

    # El máximo de la población se alcanza en alguna parte (§3.9).
    assert max(r["maximos_poblacion"].values()) > 0

    # Cohe/Coop de la RED del investigador.
    assert r["cohe"]["productos"] >= 0
    assert r["coop"]["productos"] >= 0
    if r["cohe"]["productos"]:
        assert r["cohe"]["valor"] == pytest.approx(
            r["cohe"]["suma_autores"] / r["cohe"]["productos"] - 1, rel=1e-9
        )
    if r["coop"]["productos"]:
        assert r["coop"]["valor"] == pytest.approx(
            r["coop"]["suma_grupos"] / r["coop"]["productos"] - 1, rel=1e-9
        )

    # Lo que no se puede verificar queda FUERA, con su motivo.
    assert isinstance(r["excluidos"], dict)
    assert r["supuestos"]


def test_los_primeros_del_ranking_ordenan_por_el_indicador(investigador_con_productos):
    r = evaluar_modelo_individual(repository, investigador_con_productos, ano_cierre=ANO_CIERRE)
    valores = [p["ind_investigador"] for p in r["poblacion"]]
    assert valores == sorted(valores, reverse=True)
    objetivo = next(
        p for p in r["poblacion"] if p["id"] == investigador_con_productos
    )
    assert r["posicion_poblacion"]["puesto"] == r["poblacion"].index(objetivo) + 1


def test_un_investigador_inexistente_no_se_puede_evaluar():
    with pytest.raises(KeyError):
        evaluar_modelo_individual(repository, 999999999, ano_cierre=ANO_CIERRE)


# --- Helpers reusados (nada de doble implementación) ---------------------------


def test_la_descripcion_se_lee_tanto_de_dict_como_de_modelo():
    assert descripcion_producto({"description": "  hola  "}) == "hola"
    assert descripcion_producto({}) == ""

    class _Producto:
        description = "  mundo  "

    assert descripcion_producto(_Producto()) == "mundo"


def test_el_anio_y_la_familia_son_los_mismos_del_grupo():
    producto = {"description": "12.- Publicado en revista especializada : Paper, 2023"}
    assert extraer_anio(producto) == 2023
    assert familia_relacional(producto) == "GNC"
