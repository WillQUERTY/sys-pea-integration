// ARCHIVO GENERADO — NO EDITAR A MANO.
// Fuente: backend/tests/fixtures/indicador_individual_golden.json (bloque `esperado`).
// Regenerar: python -X utf8 scripts/gen_contrato_individual.py --regenerar
// Verificar:  python -X utf8 scripts/gen_contrato_individual.py --check

import type { MincienciasIndividualAdaptation2024 } from '@/lib/api'

/** Lecturas de la adaptación individual del caso sintético, por id. */
export const MODELO_INDIVIDUAL_CASO: Record<string, MincienciasIndividualAdaptation2024> = {
  "101": {
    "modelo": "Minciencias 2024 — adaptación a nivel de investigador (NO oficial)",
    "base_normativa": "Modelo de medición 2024 §2.2.9 → §3.10, aplicado a la unidad 'investigador' (adaptación declarada, no oficial)",
    "anio_cierre": 2026,
    "investigador": {
      "id": 101,
      "identificacion": "Ana Perez (#101)",
      "antiguedad_anos": 8
    },
    "ind_investigador": 0.7385491756756803,
    "rango_teorico": 10.0,
    "posicion_poblacion": {
      "puesto": 2,
      "de": 3,
      "percentil": 66.7
    },
    "poblacion": [
      {
        "id": 103,
        "investigador": "Sara Diaz (#103)",
        "ind_investigador": 1.0666666666666667
      },
      {
        "id": 101,
        "investigador": "Ana Perez (#101)",
        "ind_investigador": 0.7385491756756803
      },
      {
        "id": 102,
        "investigador": "Luis Gomez (#102)",
        "ind_investigador": 0.5447772991157855
      }
    ],
    "indices": {
      "Nc.Top": 0.0,
      "Nc.A": 0.0,
      "Nc.B": 0.0,
      "AP": 0.0,
      "DPC": 0.8993205735735829,
      "Fr.A": 0.0,
      "Fr.B": 0.0,
      "Cohe": 0.888888888888889,
      "Coop": 0.6666666666666667
    },
    "terminos_ponderados": {
      "Nc.Top": 0.0,
      "Nc.A": 0.0,
      "Nc.B": 0.0,
      "AP": 0.0,
      "DPC": 0.44966028678679143,
      "Fr.A": 0.0,
      "Fr.B": 0.0,
      "Cohe": 0.0888888888888889,
      "Coop": 0.2
    },
    "ind_clase": {
      "TOP": 0.0,
      "A": 0.0,
      "B": 0.0,
      "ASC": 0.0,
      "DPC": 364.64311358790917,
      "FRH-A": 0.0,
      "FRH-B": 0.0
    },
    "maximos_poblacion": {
      "TOP": 0.0,
      "A": 0.0,
      "B": 0.0,
      "ASC": 0.0,
      "DPC": 405.4651081081644,
      "FRH-A": 0.0,
      "FRH-B": 182.45929864867398
    },
    "maximo_cohe_poblacion": 1.5,
    "maximo_coop_poblacion": 1.0,
    "subtipos": [
      {
        "codigo": "LIB_DIV",
        "clase": "DPC",
        "familia": "DPC",
        "n": 1,
        "periodo": 5,
        "lambda": 0.1823215567939546,
        "ancla_subtipo": 100.0,
        "peso_relativo": 10.0,
        "peso_global": 1000.0,
        "termino": 182.32155679395458
      },
      {
        "codigo": "WP",
        "clase": "DPC",
        "familia": "DPC",
        "n": 1,
        "periodo": 5,
        "lambda": 0.1823215567939546,
        "ancla_subtipo": 100.0,
        "peso_relativo": 10.0,
        "peso_global": 1000.0,
        "termino": 182.32155679395458
      }
    ],
    "cohe": {
      "suma_autores": 7,
      "productos": 3,
      "valor": 1.3333333333333335
    },
    "coop": {
      "suma_grupos": 5,
      "productos": 3,
      "valor": 0.6666666666666667
    },
    "excluidos": {
      "artículo sin calidad oficial A1–D (Publindex/Scimago no está en la fuente)": 3
    },
    "sin_ano": {},
    "fuera_de_periodo": {
      "WP": 1
    },
    "adaptaciones": [
      "Unidad de medición: la población es la de investigadores del repositorio (§3.9 se normaliza contra el máximo de esa población), no la de grupos.",
      "Período de observación (§2.2.9): en vez de la edad del grupo se usa la antigüedad del investigador (años desde su primera vinculación como integrante; si no hay dato, desde su primer producto). período = min(antigüedad, ventana del subtipo).",
      "Cohe/Coop (§2.2.10): Cohe cuenta los firmantes registrados de cada producto del investigador (incluido él mismo: 0 significa autoría sola) y Coop cuenta los grupos de la red del investigador (los grupos donde está vinculado y los grupos de sus coautores: 0 significa que no hay cooperación entre grupos)."
    ],
    "supuestos": [
      "Antigüedad del investigador: años desde su primera vinculación (fecha de inicio de la membresía); si no hay membresía con fecha, se aproxima al primer año plausible de producción registrada; si no hay ninguno, se cuenta 1 año.",
      "Categoría de calidad (§3.6): si el validador humano la asignó, esa categoría es la que entra al modelo; si no, el producto se clasifica con la inferencia conservadora del texto GrupLAC.",
      "Los artículos en 'revista especializada' SIN categoría validada quedan fuera de los indicadores de producción (su calidad A1–D depende de Publindex/Scimago, que la fuente no trae), pero §2.2.10 es relacional: sí cuentan para Cohe/Coop.",
      "Cohe y Coop solo cuentan firmantes registrados en el repositorio: los autores externos (sin investigador vinculado) no aportan coautores ni grupos.",
      "Normalización §3.9: contra la población de investigadores cargada en el repositorio; una convocatoria real mediría a todos los investigadores reconocidos del área."
    ]
  },
  "102": {
    "modelo": "Minciencias 2024 — adaptación a nivel de investigador (NO oficial)",
    "base_normativa": "Modelo de medición 2024 §2.2.9 → §3.10, aplicado a la unidad 'investigador' (adaptación declarada, no oficial)",
    "anio_cierre": 2026,
    "investigador": {
      "id": 102,
      "identificacion": "Luis Gomez (#102)",
      "antiguedad_anos": 7
    },
    "ind_investigador": 0.5447772991157855,
    "rango_teorico": 10.0,
    "posicion_poblacion": {
      "puesto": 3,
      "de": 3,
      "percentil": 33.3
    },
    "poblacion": [
      {
        "id": 103,
        "investigador": "Sara Diaz (#103)",
        "ind_investigador": 1.0666666666666667
      },
      {
        "id": 101,
        "investigador": "Ana Perez (#101)",
        "ind_investigador": 0.7385491756756803
      },
      {
        "id": 102,
        "investigador": "Luis Gomez (#102)",
        "ind_investigador": 0.5447772991157855
      }
    ],
    "indices": {
      "Nc.Top": 0.0,
      "Nc.A": 0.0,
      "Nc.B": 0.0,
      "AP": 0.0,
      "DPC": 0.44966028678679143,
      "Fr.A": 0.0,
      "Fr.B": 0.3497357786119489,
      "Cohe": 1.0,
      "Coop": 0.5
    },
    "terminos_ponderados": {
      "Nc.Top": 0.0,
      "Nc.A": 0.0,
      "Nc.B": 0.0,
      "AP": 0.0,
      "DPC": 0.22483014339339571,
      "Fr.A": 0.0,
      "Fr.B": 0.06994715572238978,
      "Cohe": 0.1,
      "Coop": 0.15
    },
    "ind_clase": {
      "TOP": 0.0,
      "A": 0.0,
      "B": 0.0,
      "ASC": 0.0,
      "DPC": 182.32155679395458,
      "FRH-A": 0.0,
      "FRH-B": 63.81254487788411
    },
    "maximos_poblacion": {
      "TOP": 0.0,
      "A": 0.0,
      "B": 0.0,
      "ASC": 0.0,
      "DPC": 405.4651081081644,
      "FRH-A": 0.0,
      "FRH-B": 182.45929864867398
    },
    "maximo_cohe_poblacion": 1.5,
    "maximo_coop_poblacion": 1.0,
    "subtipos": [
      {
        "codigo": "WP",
        "clase": "DPC",
        "familia": "DPC",
        "n": 1,
        "periodo": 5,
        "lambda": 0.1823215567939546,
        "ancla_subtipo": 100.0,
        "peso_relativo": 10.0,
        "peso_global": 1000.0,
        "termino": 182.32155679395458
      },
      {
        "codigo": "TM_B",
        "clase": "FRH-B",
        "familia": "FRH",
        "n": 1,
        "periodo": 5,
        "lambda": 0.1823215567939546,
        "ancla_subtipo": 70.0,
        "peso_relativo": 5.0,
        "peso_global": 350.0,
        "termino": 63.81254487788411
      }
    ],
    "cohe": {
      "suma_autores": 5,
      "productos": 2,
      "valor": 1.5
    },
    "coop": {
      "suma_grupos": 3,
      "productos": 2,
      "valor": 0.5
    },
    "excluidos": {
      "artículo sin calidad oficial A1–D (Publindex/Scimago no está en la fuente)": 2,
      "trabajo en evento (ponencia/congreso): no es tipo de producto en el modelo 2024": 1,
      "sin descripción (categoría no verificable)": 1
    },
    "sin_ano": {
      "WP": 1
    },
    "fuera_de_periodo": {},
    "adaptaciones": [
      "Unidad de medición: la población es la de investigadores del repositorio (§3.9 se normaliza contra el máximo de esa población), no la de grupos.",
      "Período de observación (§2.2.9): en vez de la edad del grupo se usa la antigüedad del investigador (años desde su primera vinculación como integrante; si no hay dato, desde su primer producto). período = min(antigüedad, ventana del subtipo).",
      "Cohe/Coop (§2.2.10): Cohe cuenta los firmantes registrados de cada producto del investigador (incluido él mismo: 0 significa autoría sola) y Coop cuenta los grupos de la red del investigador (los grupos donde está vinculado y los grupos de sus coautores: 0 significa que no hay cooperación entre grupos)."
    ],
    "supuestos": [
      "Antigüedad del investigador: años desde su primera vinculación (fecha de inicio de la membresía); si no hay membresía con fecha, se aproxima al primer año plausible de producción registrada; si no hay ninguno, se cuenta 1 año.",
      "Categoría de calidad (§3.6): si el validador humano la asignó, esa categoría es la que entra al modelo; si no, el producto se clasifica con la inferencia conservadora del texto GrupLAC.",
      "Los artículos en 'revista especializada' SIN categoría validada quedan fuera de los indicadores de producción (su calidad A1–D depende de Publindex/Scimago, que la fuente no trae), pero §2.2.10 es relacional: sí cuentan para Cohe/Coop.",
      "Cohe y Coop solo cuentan firmantes registrados en el repositorio: los autores externos (sin investigador vinculado) no aportan coautores ni grupos.",
      "Normalización §3.9: contra la población de investigadores cargada en el repositorio; una convocatoria real mediría a todos los investigadores reconocidos del área."
    ]
  },
  "103": {
    "modelo": "Minciencias 2024 — adaptación a nivel de investigador (NO oficial)",
    "base_normativa": "Modelo de medición 2024 §2.2.9 → §3.10, aplicado a la unidad 'investigador' (adaptación declarada, no oficial)",
    "anio_cierre": 2026,
    "investigador": {
      "id": 103,
      "identificacion": "Sara Diaz (#103)",
      "antiguedad_anos": 2
    },
    "ind_investigador": 1.0666666666666667,
    "rango_teorico": 10.0,
    "posicion_poblacion": {
      "puesto": 1,
      "de": 3,
      "percentil": 100.0
    },
    "poblacion": [
      {
        "id": 103,
        "investigador": "Sara Diaz (#103)",
        "ind_investigador": 1.0666666666666667
      },
      {
        "id": 101,
        "investigador": "Ana Perez (#101)",
        "ind_investigador": 0.7385491756756803
      },
      {
        "id": 102,
        "investigador": "Luis Gomez (#102)",
        "ind_investigador": 0.5447772991157855
      }
    ],
    "indices": {
      "Nc.Top": 0.0,
      "Nc.A": 0.0,
      "Nc.B": 0.0,
      "AP": 0.0,
      "DPC": 1.0,
      "Fr.A": 0.0,
      "Fr.B": 1.0,
      "Cohe": 0.6666666666666666,
      "Coop": 1.0
    },
    "terminos_ponderados": {
      "Nc.Top": 0.0,
      "Nc.A": 0.0,
      "Nc.B": 0.0,
      "AP": 0.0,
      "DPC": 0.5,
      "Fr.A": 0.0,
      "Fr.B": 0.2,
      "Cohe": 0.06666666666666667,
      "Coop": 0.3
    },
    "ind_clase": {
      "TOP": 0.0,
      "A": 0.0,
      "B": 0.0,
      "ASC": 0.0,
      "DPC": 405.4651081081644,
      "FRH-A": 0.0,
      "FRH-B": 182.45929864867398
    },
    "maximos_poblacion": {
      "TOP": 0.0,
      "A": 0.0,
      "B": 0.0,
      "ASC": 0.0,
      "DPC": 405.4651081081644,
      "FRH-A": 0.0,
      "FRH-B": 182.45929864867398
    },
    "maximo_cohe_poblacion": 1.5,
    "maximo_coop_poblacion": 1.0,
    "subtipos": [
      {
        "codigo": "WP",
        "clase": "DPC",
        "familia": "DPC",
        "n": 1,
        "periodo": 2,
        "lambda": 0.4054651081081644,
        "ancla_subtipo": 100.0,
        "peso_relativo": 10.0,
        "peso_global": 1000.0,
        "termino": 405.4651081081644
      },
      {
        "codigo": "TM_B",
        "clase": "FRH-B",
        "familia": "FRH",
        "n": 1,
        "periodo": 2,
        "lambda": 0.4054651081081644,
        "ancla_subtipo": 70.0,
        "peso_relativo": 5.0,
        "peso_global": 350.0,
        "termino": 141.91278783785754
      },
      {
        "codigo": "TP_B",
        "clase": "FRH-B",
        "familia": "FRH",
        "n": 1,
        "periodo": 2,
        "lambda": 0.4054651081081644,
        "ancla_subtipo": 20.0,
        "peso_relativo": 5.0,
        "peso_global": 100.0,
        "termino": 40.546510810816436
      }
    ],
    "cohe": {
      "suma_autores": 2,
      "productos": 1,
      "valor": 1.0
    },
    "coop": {
      "suma_grupos": 2,
      "productos": 1,
      "valor": 1.0
    },
    "excluidos": {
      "artículo sin calidad oficial A1–D (Publindex/Scimago no está en la fuente)": 2
    },
    "sin_ano": {},
    "fuera_de_periodo": {},
    "adaptaciones": [
      "Unidad de medición: la población es la de investigadores del repositorio (§3.9 se normaliza contra el máximo de esa población), no la de grupos.",
      "Período de observación (§2.2.9): en vez de la edad del grupo se usa la antigüedad del investigador (años desde su primera vinculación como integrante; si no hay dato, desde su primer producto). período = min(antigüedad, ventana del subtipo).",
      "Cohe/Coop (§2.2.10): Cohe cuenta los firmantes registrados de cada producto del investigador (incluido él mismo: 0 significa autoría sola) y Coop cuenta los grupos de la red del investigador (los grupos donde está vinculado y los grupos de sus coautores: 0 significa que no hay cooperación entre grupos)."
    ],
    "supuestos": [
      "Antigüedad del investigador: años desde su primera vinculación (fecha de inicio de la membresía); si no hay membresía con fecha, se aproxima al primer año plausible de producción registrada; si no hay ninguno, se cuenta 1 año.",
      "Categoría de calidad (§3.6): si el validador humano la asignó, esa categoría es la que entra al modelo; si no, el producto se clasifica con la inferencia conservadora del texto GrupLAC.",
      "Los artículos en 'revista especializada' SIN categoría validada quedan fuera de los indicadores de producción (su calidad A1–D depende de Publindex/Scimago, que la fuente no trae), pero §2.2.10 es relacional: sí cuentan para Cohe/Coop.",
      "Cohe y Coop solo cuentan firmantes registrados en el repositorio: los autores externos (sin investigador vinculado) no aportan coautores ni grupos.",
      "Normalización §3.9: contra la población de investigadores cargada en el repositorio; una convocatoria real mediría a todos los investigadores reconocidos del área."
    ]
  }
}
