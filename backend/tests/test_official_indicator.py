"""Golden test del indicador oficial Minciencias 2024 (backend/app/evaluator/official_indicator.py).

Población sintética de 3 grupos (misma área OCDE), todos con edad 11 al
cierre de la ventana 2026. TODOS los valores esperados se derivaron A MANO
de docs/modelo-medicion-2024.md y de database/catalog_2024.json — son
constantes literales en este archivo, no expresiones que repliquen el
código bajo prueba. Si un assert falla, re-derivar a mano antes de tocar
la implementación.

Grupo A (máximo poblacional en 5 de las 7 clases):
  7 x ART_A1 @2020  período=min(11,7)=7  λ=ln(7/7+1)=ln(2)          peso=100*9.5=950    TOP  += 658.48982153194804
  4 x ART_B  @2023  período=min(11,7)=7  λ=ln(4/7+1)=ln(11/7)       peso=100*3=300      A    += 135.59553712291724
  5 x N_C    @2024  período=min(11,5)=5  λ=ln(5/5+1)=ln(2)          peso=4*5.5=22       B    += 15.249237972318797
  2 x FIS    @2023  período=min(11,5)=5  λ=ln(2/5+1)=ln(1.4)        peso=200*10=2000   AP   += 672.9444732424258
  3 x TD_A   @2024  período=min(11,5)=5  λ=ln(3/5+1)=ln(1.6)        peso=160*10=1600   Fr.A += 752.005806793177
  2 x BOL    @2025  período=min(11,5)=5  λ=ln(1.4)                  peso=100*3=300     DPC  += 100.94167098636387
  1 x TM_A   @2023  período=min(11,5)=5  λ=ln(1/5+1)=ln(1.2)        peso=70*10=700     Fr.B += 127.62508975576836
  Cohe (§2.2.10.1, dominio GNC+DTI en período = 7 ART_A1 + 4 ART_B + 5 N_C = 16):
      Σ autores del grupo = 7*3 + (1+1+2+2) + 5*1 = 32      Cohe = 32/16 − 1 = 1.0
      Σ grupos relacionados = 7*1 + (1+1+2+2) + 5*1 = 18     Coop = 18/16 − 1 = 0.125

Grupo B (retiene los máximos de DPC y Fr.B):
  2 x ART_A1 @2025  λ=ln(9/7)   peso 950   TOP = 238.74870686686162
  3 x ART_B  @2025  λ=ln(10/7)  peso 300   A   = 107.00248318161974
  1 x N_C    @2024  λ=ln(1.2)   peso 22    B   = 4.011074249467005
  1 x FIS    @2024  λ=ln(1.2)   peso 2000  AP  = 364.6431135879096
  4 x BOL    @2026  λ=ln(1.8)   peso 300   DPC = 176.33599947063579
  1 x TD_A   @2022  λ=ln(1.2)   peso 1600  Fr.A= 291.71449087032766
  2 x TM_A   @2025  λ=ln(1.4)   peso 700   Fr.B= 235.53056563484903
  Cohe/Coop: 6 productos GNC firmados solo por B (1 autor, 1 grupo) → 6/6 − 1 = 0.

Grupo C (mínimo):
  1 x ART_B  @2026  λ=ln(1/7+1)=ln(8/7)  peso 300  A = 40.05941778735679  (úNICO término ≠ 0)

Máximos poblacionales (§3.9): TOP/A/B/AP/Fr.A en A; DPC y Fr.B en B; Cohe 1.0 y Coop 0.125 en A.

§3.10 (cada término es el índice §3.9, no el conteo):
  A: Nc.Top=Nc.A=Nc.B=AP=Fr.A=Cohe=Coop=1; DPC=ln(1.4)/ln(1.8)≈0.5724394; Fr.B=ln(1.2)/ln(1.4)≈0.5418621
     Ind.Grupo(A) = 3.7+2.3+0.4+1.5+1.0+0.1+0.3 + 0.5*0.5724393844 + 0.2*0.5418621169
                  ≈ 9.6945921156
  B: Ind.Grupo(B) ≈ 5.1624300   C: Ind.Grupo(C) = 2.3 * (40.05941778735679/135.59553712291724) ≈ 0.6794963
"""

import math

import pytest

from backend.app.evaluator.official_indicator import (
    GrupoOficial,
    ProductoOficial,
    cargar_catalogo,
    evaluar_poblacion,
    inferir_categoria,
    lambda_subtipo,
    recopilar_produccion,
)

CATALOGO = cargar_catalogo()
ANO_CIERRE = 2026
EDAD = 11


def _p(categoria, ano, autores=0, grupos=0, identificacion=None):
    return ProductoOficial(
        identificacion=identificacion or f"{categoria}@{ano}#{autores}#{grupos}",
        categoria=categoria,
        motivo="categoría del catálogo oficial 2024" if categoria else "",
        ano=ano,
        autores_del_grupo=autores,
        grupos_relacionados=grupos,
    )


def _poblacion_golden():
    grupo_a = GrupoOficial(
        "G-A",
        EDAD,
        [
            *[_p("ART_A1", 2020, autores=3, grupos=1) for _ in range(7)],
            _p("ART_B", 2023, autores=1, grupos=1),
            _p("ART_B", 2023, autores=1, grupos=1),
            _p("ART_B", 2023, autores=2, grupos=2),  # coautor también en G-B
            _p("ART_B", 2023, autores=2, grupos=2),  # coautor también en G-C
            *[_p("N_C", 2024, autores=1, grupos=1) for _ in range(5)],
            *[_p("FIS", 2023, autores=3) for _ in range(2)],
            *[_p("TD_A", 2024) for _ in range(3)],
            *[_p("BOL", 2025) for _ in range(2)],
            _p("TM_A", 2023),
        ],
    )
    grupo_b = GrupoOficial(
        "G-B",
        EDAD,
        [
            *[_p("ART_A1", 2025, autores=1, grupos=1) for _ in range(2)],
            *[_p("ART_B", 2025, autores=1, grupos=1) for _ in range(3)],
            _p("N_C", 2024, autores=1, grupos=1),
            _p("FIS", 2024, autores=1, grupos=1),
            *[_p("BOL", 2026, autores=1, grupos=1) for _ in range(4)],
            _p("TD_A", 2022, autores=1, grupos=1),
            *[_p("TM_A", 2025, autores=1, grupos=1) for _ in range(2)],
        ],
    )
    grupo_c = GrupoOficial("G-C", EDAD, [_p("ART_B", 2026, autores=1, grupos=1)])
    return [grupo_a, grupo_b, grupo_c]


def _evaluar_golden():
    return {r["grupo"]: r for r in evaluar_poblacion(_poblacion_golden(), ANO_CIERRE, CATALOGO)}


# --- §3.6 / Tabla 6: pesos globales -------------------------------------------


def test_peso_global_ejemplos_literales_del_modelo():
    # Los tres ejemplos trabajados de §3.6 en docs/modelo-medicion-2024.md:
    assert CATALOGO["ART_A2"].peso_global == pytest.approx(550.0)      # 100 x 5.5
    assert CATALOGO["CAP_LIB_B"].peso_global == pytest.approx(480.0)   # 60 x 8
    # El caso decisivo: la propia fila publicada de Tabla 6 es un ancla y
    # TAMBIÉN se multiplica por su peso relativo (500 x 10 = 5000).
    assert CATALOGO["PA1"].peso_global == pytest.approx(5000.0)


def test_ancla_del_subtipo_prefiere_la_mas_alta_calidad():
    # ART tiene dos filas en Tabla 6 (OPEN_A1=100, OPEN_D=5): el ancla es 100.
    assert CATALOGO["ART_A1"].ancla_subtipo == pytest.approx(100.0)
    assert CATALOGO["ART_D"].ancla_subtipo == pytest.approx(100.0)
    assert CATALOGO["N_C"].ancla_subtipo == pytest.approx(4.0)
    assert CATALOGO["CAP_LIB_B"].ancla_subtipo == pytest.approx(60.0)
    # Tabla 5: artículos A1–C → 7 años; D → 5 años.
    assert CATALOGO["ART_A1"].ventana_subtipo == 7
    assert CATALOGO["ART_D"].ventana_subtipo == 5


def test_subtipos_sin_ancla_en_tabla_6_no_tienen_peso():
    # RNR no aparece en Tabla 6 → el peso global no es calculable y el
    # producto debe excluirse con motivo explícito, no pesar 0.
    assert "RNR" in CATALOGO
    assert CATALOGO["RNR"].ancla_subtipo is None
    assert CATALOGO["RNR"].peso_global is None


# --- §2.2.9: λ -----------------------------------------------------------------


def test_lambda_subtipo():
    assert lambda_subtipo(0, 5) == 0.0
    assert lambda_subtipo(7, 0) == 0.0
    assert lambda_subtipo(7, 7) == pytest.approx(0.6931471805599453, rel=1e-12)   # ln(2)
    assert lambda_subtipo(4, 7) == pytest.approx(0.4519851237430575, rel=1e-12)   # ln(11/7), a mano
    assert lambda_subtipo(5, 2) == pytest.approx(math.log(5 / 2 + 1), rel=1e-12)


# --- Golden: desglose por subtipo e Ind_Clase (§3.8.1) --------------------------


def test_golden_grupo_a_desglose_por_subtipo():
    a = _evaluar_golden()["G-A"]

    d = a["subtipos"]["ART_A1"]
    assert d["n"] == 7
    assert d["periodo"] == 7  # min(edad 11, ventana 7)
    assert d["lambda"] == pytest.approx(0.6931471805599453, rel=1e-12)
    assert d["peso_global"] == pytest.approx(950.0)
    assert d["termino"] == pytest.approx(658.48982153194804, rel=1e-12)

    d = a["subtipos"]["ART_B"]
    assert d["n"] == 4
    assert d["periodo"] == 7
    assert d["lambda"] == pytest.approx(0.4519851237430575, rel=1e-12)
    assert d["peso_global"] == pytest.approx(300.0)
    assert d["termino"] == pytest.approx(135.59553712291724, rel=1e-12)

    d = a["subtipos"]["N_C"]
    assert d["n"] == 5
    assert d["periodo"] == 5  # min(edad 11, ventana 5)
    assert d["lambda"] == pytest.approx(0.6931471805599453, rel=1e-12)
    assert d["peso_global"] == pytest.approx(22.0)
    assert d["termino"] == pytest.approx(15.249237972318797, rel=1e-12)

    d = a["subtipos"]["FIS"]
    assert d["n"] == 2
    assert d["lambda"] == pytest.approx(0.3364722366212129, rel=1e-12)  # ln(1.4)
    assert d["peso_global"] == pytest.approx(2000.0)
    assert d["termino"] == pytest.approx(672.9444732424258, rel=1e-12)

    d = a["subtipos"]["TD_A"]
    assert d["n"] == 3
    assert d["lambda"] == pytest.approx(0.4700036292457356, rel=1e-12)  # ln(1.6)
    assert d["termino"] == pytest.approx(752.005806793177, rel=1e-12)

    d = a["subtipos"]["BOL"]
    assert d["n"] == 2
    assert d["lambda"] == pytest.approx(0.3364722366212129, rel=1e-12)
    assert d["peso_global"] == pytest.approx(300.0)
    assert d["termino"] == pytest.approx(100.94167098636387, rel=1e-12)

    d = a["subtipos"]["TM_A"]
    assert d["n"] == 1
    assert d["lambda"] == pytest.approx(0.18232155679395479, rel=1e-12)  # ln(1.2)
    assert d["termino"] == pytest.approx(127.62508975576836, rel=1e-12)

    # §3.8.1: Ind_Clase = Σ λ x PesoGlobal de los subtipos de la clase
    assert a["ind_clase"]["TOP"] == pytest.approx(658.48982153194804, rel=1e-12)
    assert a["ind_clase"]["A"] == pytest.approx(135.59553712291724, rel=1e-12)
    assert a["ind_clase"]["B"] == pytest.approx(15.249237972318797, rel=1e-12)
    assert a["ind_clase"]["ASC"] == pytest.approx(672.9444732424258, rel=1e-12)
    assert a["ind_clase"]["DPC"] == pytest.approx(100.94167098636387, rel=1e-12)
    assert a["ind_clase"]["FRH-A"] == pytest.approx(752.005806793177, rel=1e-12)
    assert a["ind_clase"]["FRH-B"] == pytest.approx(127.62508975576836, rel=1e-12)


def test_golden_grupos_b_y_c_desglose():
    r = _evaluar_golden()
    b = r["G-B"]
    assert b["ind_clase"]["TOP"] == pytest.approx(238.74870686686162, rel=1e-12)
    assert b["ind_clase"]["A"] == pytest.approx(107.00248318161974, rel=1e-12)
    assert b["ind_clase"]["B"] == pytest.approx(4.011074249467005, rel=1e-12)
    assert b["ind_clase"]["ASC"] == pytest.approx(364.6431135879096, rel=1e-12)
    assert b["ind_clase"]["DPC"] == pytest.approx(176.33599947063579, rel=1e-12)  # máximo poblacional
    assert b["ind_clase"]["FRH-A"] == pytest.approx(291.71449087032766, rel=1e-12)
    assert b["ind_clase"]["FRH-B"] == pytest.approx(235.53056563484903, rel=1e-12)  # máximo poblacional

    c = r["G-C"]
    assert c["ind_clase"]["A"] == pytest.approx(40.05941778735679, rel=1e-12)
    assert c["ind_clase"]["TOP"] == 0.0
    assert c["ind_clase"]["FRH-A"] == 0.0


# --- §2.2.10: Cohe y Coop --------------------------------------------------------


def test_golden_cohe_y_coop():
    r = _evaluar_golden()
    # A: 16 productos GNC+DTI en período; Σ autores 32, Σ grupos 18.
    a = r["G-A"]
    assert a["cohe"]["productos"] == 16
    assert a["cohe"]["suma_autores"] == 32
    assert a["cohe"]["valor"] == pytest.approx(1.0, rel=1e-12)
    assert a["coop"]["suma_grupos"] == 18
    assert a["coop"]["valor"] == pytest.approx(0.125, rel=1e-12)

    # B: 6 productos firmados solo por B → 6/6 − 1 = 0 en ambos.
    b = r["G-B"]
    assert b["cohe"]["productos"] == 6
    assert b["cohe"]["valor"] == 0.0
    assert b["coop"]["valor"] == 0.0

    c = r["G-C"]
    assert c["cohe"]["productos"] == 1
    assert c["cohe"]["valor"] == 0.0
    assert c["coop"]["valor"] == 0.0

    # Máximos poblacionales (§3.9): A retiene ambos.
    assert r["G-A"]["maximo_cohe_poblacion"] == pytest.approx(1.0, rel=1e-12)
    assert r["G-A"]["maximo_coop_poblacion"] == pytest.approx(0.125, rel=1e-12)


# --- §3.9: índices y máximos ------------------------------------------------------


def test_golden_indices():
    r = _evaluar_golden()
    a, b, c = r["G-A"], r["G-B"], r["G-C"]

    # Máximos poblacionales por clase.
    assert a["maximos_poblacion"]["TOP"] == pytest.approx(658.48982153194804, rel=1e-12)
    assert a["maximos_poblacion"]["A"] == pytest.approx(135.59553712291724, rel=1e-12)
    assert a["maximos_poblacion"]["B"] == pytest.approx(15.249237972318797, rel=1e-12)
    assert a["maximos_poblacion"]["ASC"] == pytest.approx(672.9444732424258, rel=1e-12)
    assert a["maximos_poblacion"]["DPC"] == pytest.approx(176.33599947063579, rel=1e-12)  # en B
    assert a["maximos_poblacion"]["FRH-A"] == pytest.approx(752.005806793177, rel=1e-12)
    assert a["maximos_poblacion"]["FRH-B"] == pytest.approx(235.53056563484903, rel=1e-12)  # en B

    # Índices de A: 1.0 donde es máximo; división de literales donde no lo es.
    assert a["indices"]["Nc.Top"] == pytest.approx(1.0, rel=1e-12)
    assert a["indices"]["Nc.A"] == pytest.approx(1.0, rel=1e-12)
    assert a["indices"]["Nc.B"] == pytest.approx(1.0, rel=1e-12)
    assert a["indices"]["AP"] == pytest.approx(1.0, rel=1e-12)
    assert a["indices"]["Fr.A"] == pytest.approx(1.0, rel=1e-12)
    assert a["indices"]["DPC"] == pytest.approx(100.94167098636387 / 176.33599947063579, rel=1e-9)
    assert a["indices"]["Fr.B"] == pytest.approx(127.62508975576836 / 235.53056563484903, rel=1e-9)
    assert a["indices"]["Cohe"] == pytest.approx(1.0, rel=1e-12)
    assert a["indices"]["Coop"] == pytest.approx(1.0, rel=1e-12)

    # Índices de B (división de los literales derivados a mano).
    assert b["indices"]["Nc.Top"] == pytest.approx(238.74870686686162 / 658.48982153194804, rel=1e-9)
    assert b["indices"]["Nc.A"] == pytest.approx(107.00248318161974 / 135.59553712291724, rel=1e-9)
    assert b["indices"]["Nc.B"] == pytest.approx(4.011074249467005 / 15.249237972318797, rel=1e-9)
    assert b["indices"]["AP"] == pytest.approx(364.6431135879096 / 672.9444732424258, rel=1e-9)
    assert b["indices"]["DPC"] == pytest.approx(1.0, rel=1e-12)
    assert b["indices"]["Fr.A"] == pytest.approx(291.71449087032766 / 752.005806793177, rel=1e-9)
    assert b["indices"]["Fr.B"] == pytest.approx(1.0, rel=1e-12)
    assert b["indices"]["Cohe"] == 0.0
    assert b["indices"]["Coop"] == 0.0

    # C solo aporta en Nc.A.
    assert c["indices"]["Nc.A"] == pytest.approx(40.05941778735679 / 135.59553712291724, rel=1e-9)
    assert c["indices"]["Nc.Top"] == 0.0
    assert c["indices"]["Coop"] == 0.0


# --- §3.10: Ind.Grupo -------------------------------------------------------------


def test_golden_ind_grupo():
    r = _evaluar_golden()
    a, b, c = r["G-A"], r["G-B"], r["G-C"]

    # Valores finales derivados a mano (suma de coeficiente x índice):
    #   A = 3.7+2.3+0.4+1.5+1.0+0.1+0.3 + 0.5*0.5724393844 + 0.2*0.5418621169
    #     ≈ 9.6945921156
    assert a["ind_grupo"] == pytest.approx(9.6945921156, rel=1e-6)
    #   B ≈ 5.1624300   (DPC y Fr.B en 1.0; Cohe y Coop en 0)
    assert b["ind_grupo"] == pytest.approx(5.1624300, rel=1e-6)
    #   C = 2.3 * 0.29543316 ≈ 0.6794963
    assert c["ind_grupo"] == pytest.approx(0.6794963, rel=1e-6)

    # Descomposición exacta: Ind.Grupo(A) es la suma de los 9 términos
    # ponderados con los coeficientes oficiales de §3.10.
    assert a["terminos_ponderados"]["Nc.Top"] == pytest.approx(3.7, rel=1e-12)
    assert a["terminos_ponderados"]["DPC"] == pytest.approx(0.5 * (100.94167098636387 / 176.33599947063579), rel=1e-9)
    assert a["ind_grupo"] == pytest.approx(sum(a["terminos_ponderados"].values()), rel=1e-12)


# --- Ventana / excluded paths ------------------------------------------------------


def test_periodo_recortado_por_edad_del_grupo():
    # Grupo de 2 años con 3 artículos: período = min(2, 7) = 2 → uno queda fuera.
    g = GrupoOficial("joven", 2, [_p("ART_A1", 2025), _p("ART_A1", 2024), _p("ART_A1", 2018)])
    r = recopilar_produccion(g, ANO_CIERRE, CATALOGO)
    d = r["subtipos"]["ART_A1"]
    assert d["n"] == 2
    assert d["periodo"] == 2
    assert d["lambda"] == pytest.approx(math.log(2 / 2 + 1), rel=1e-12)  # ln(2)
    assert r["fuera_de_periodo"]["ART_A1"] == 1


def test_exclusiones_por_categoria_faltante_o_sin_ancla():
    g = GrupoOficial(
        "x",
        EDAD,
        [
            ProductoOficial("e1", None, "artículo sin calidad oficial A1–D (Publindex/Scimago no está en la fuente)", 2024),
            _p("RNR", 2024),   # subtipo DTI sin fila en Tabla 6 → peso no calculable
        ],
    )
    r = recopilar_produccion(g, ANO_CIERRE, CATALOGO)
    assert r["subtipos"] == {}
    assert all(v == 0.0 for v in r["ind_clase"].values())
    motivos = " | ".join(r["excluidos"])
    assert "artículo sin calidad" in motivos
    assert "sin ancla" in motivos
    assert sum(r["excluidos"].values()) == 2


def test_producto_sin_ano_se_cuenta_como_sin_ano():
    g = GrupoOficial("x", EDAD, [_p("ART_A1", None)])
    r = recopilar_produccion(g, ANO_CIERRE, CATALOGO)
    assert r["subtipos"] == {}
    assert r["sin_ano"]["ART_A1"] == 1


def test_familia_evidenciada_sin_categoria_cuenta_para_cohe_coop():
    # §2.2.10 es RELACIONAL, no de calidad: un artículo que no puede entrar a
    # los indicadores de producción (sin Publindex) sigue siendo producto GNC
    # para Cohe/Coop si la fuente evidencia su familia amplia.
    g = GrupoOficial(
        "x",
        EDAD,
        [
            ProductoOficial(
                "art-2024",
                categoria=None,
                motivo="artículo sin calidad oficial A1–D (Publindex/Scimago no está en la fuente)",
                ano=2024,
                autores_del_grupo=2,
                grupos_relacionados=3,
                familia_medicion="GNC",
            ),
            ProductoOficial(  # fuera de la ventana GNC (7): no participa
                "art-2015",
                categoria=None,
                motivo="artículo sin calidad oficial A1–D (Publindex/Scimago no está en la fuente)",
                ano=2015,
                autores_del_grupo=5,
                grupos_relacionados=4,
                familia_medicion="GNC",
            ),
            ProductoOficial(  # DPC: fuera del dominio §2.2.10 aunque sea reciente
                "cartilla",
                categoria=None,
                motivo="cartilla/periódico: tipo sin categoría oficial verificable 2024",
                ano=2024,
                autores_del_grupo=9,
                grupos_relacionados=9,
                familia_medicion="DPC",
            ),
        ],
    )
    r = recopilar_produccion(g, ANO_CIERRE, CATALOGO)
    assert r["subtipos"] == {}  # nada aporta a los indicadores de producción
    assert r["cohe"]["productos"] == 1  # solo el artículo de 2024
    assert r["cohe"]["suma_autores"] == 2
    assert r["cohe"]["valor"] == pytest.approx(1.0, rel=1e-12)  # 2/1 − 1
    assert r["coop"]["suma_grupos"] == 3
    assert r["coop"]["valor"] == pytest.approx(2.0, rel=1e-12)  # 3/1 − 1
    assert sum(r["excluidos"].values()) == 3


# --- Inference conservadora por descripción GrupLAC --------------------------------


@pytest.mark.parametrize(
    "descripcion,esperada",
    [
        # Tipos verificables en la fuente → categoría oficial (calidad B asumida
        # en FRH porque GrupLAC no evidencia la categoría A de la dirección).
        ("3.- Trabajos de grado de pregrado : DESARROLLO DE UN APLICATIVO WEB, DESDE 9 2025 HASTA ABRIL 2026", "TP_B"),
        # Mojibake UTF-8→cp1252 del dataset real ("maestrÃ­a", "clÃ­nica"):
        ("48.- Trabajo de grado de maestrÃ­a o especialidad clÃ­nica : LIBRO MULTIMEDIAL", "TM_B"),
        ("7.- Documento de trabajo (Working Paper) : DOCUMENTO MAESTRO DE INVESTIGACIÓN", "WP"),
        ("2.- Libros de divulgación y/o Compilación de Divulgación : PENSAMIENTO Y TERRITORIO", "LIB_DIV"),
        ("6.- Informes de investigación : Informe final proyecto de investigación DETERMINACIONES", "IFI"),
        # El título NO debe contaminar la clasificación: contiene "maestría" y
        # "cursos de perfeccionamiento", pero el TIPO es trabajo de pregrado.
        ("3.- Trabajos de grado de pregrado : Sistema de tutorías para maestría y cursos de perfeccionamiento", "TP_B"),
    ],
)
def test_inferencia_categorias_verificables(descripcion, esperada):
    categoria, _ = inferir_categoria(descripcion)
    assert categoria == esperada


@pytest.mark.parametrize(
    "descripcion,fragmento_motivo",
    [
        ("", "sin descripción"),
        ("12.- Publicado en revista especializada: UN MODELO DE ADOPTACIÓN TECNOLÓGICA EN ORGANIZACIONES", "artículo sin calidad"),
        ("31.- Corto (Resumen): DISEÑO DE UN PROTOTIPO DE SOFTWARE LIBRE", "artículo corto"),
        ("2.- Capítulo de libro : ALTERNATIVAS PARA ABORDAR EL PENSAMIENTO COMPUTACIONAL", "capítulo de libro"),
        ("4.- Trabajos dirigidos/Tutorías de otro tipo : Asesoría de tesis de doctorado", "sin subtipo oficial"),
        ("20.- Computacional : SISTEMA DE GESTIÓN DE PONENCIAS, Sitio web", "sin categoría oficial verificable"),
        ("9.- Trabajos en eventos : Congreso Internacional de Ingeniería", "no es tipo de producto"),
        ("5.- Curso de perfeccionamiento : Diplomado en docencia universitaria", "no es tipo de producto"),
    ],
)
def test_inferencia_excluye_con_motivo_explicito(descripcion, fragmento_motivo):
    categoria, motivo = inferir_categoria(descripcion)
    assert categoria is None
    assert fragmento_motivo in motivo
