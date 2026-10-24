"""
Indicador individual de producción — ADAPTACIÓN declarada del modelo Minciencias 2024.

POR QUÉ ES UNA ADAPTACIÓN Y NO UN INDICADOR OFICIAL
---------------------------------------------------
El archivo normativo `docs/modelo-medicion-2024.md` (Anexo 1 M601PR04G01 v02)
define UN indicador de producción: el **Ind.Grupo** (§3.10). Los tres
indicadores informativos del capítulo III también son de GRUPO: §3.11
trayectoria (IT), §3.12 permanencia de investigadores (EPInv, que es un
agregado de los integrantes del grupo) y §3.13 estabilidad de la producción
(EProd). La "Convocatoria nacional para el reconocimiento de investigadores"
del mismo documento no trae ninguna fórmula de producción POR PERSONA.

Por eso este módulo **no** se rotula "Minciencias 2024" a secas: es una
adaptación declarada del pipeline §2.2.9 → §3.10 a la unidad "investigador",
y en todas partes (API, UI, CLI, docs) se rotula como
"adaptación individual (NO oficial)".

QUÉ SE CONSERVA DEL MODELO (sin cambios)
----------------------------------------
  §2.2.9   λ_subtipo = ln(n_subtipo / período + 1)
  §3.6     PesoGlobal = ancla del subtipo (Tabla 6) × peso relativo (Anexo 1)
  §3.7     las seis clases de medición (TOP, A, B, ASC, DPC, FRH-A, FRH-B)
  §3.8.1   Ind_Clase = Σ λ_subtipo × PesoGlobal_subtipo
  §3.9     índice = valor / máximo en la POBLACIÓN (ahora de investigadores)
  §3.10    los nueve términos con sus coeficientes (3.7/2.3/0.4/1.5/0.5/1.0/
           0.2/0.1/0.3) y el rango teórico 10
  Clasificación conservadora (`inferir_categoria`): lo que la fuente no
  evidencia se EXCLUYE con motivo explícito, nunca con categoría inventada.

QUÉ SE ADAPTA (tres puntos, declarados en `ADAPTACIONES`)
---------------------------------------------------------
1. UNIDAD: la población es la de investigadores del repositorio, no la de
   grupos; la normalización §3.9 se hace contra el máximo de esa población.
2. PERÍODO (§2.2.9): el modelo acota la ventana con la EDAD DEL GRUPO. Para
   una persona se usa su ANTIGÜEDAD (años desde su primera vinculación);
   período = min(antigüedad, ventana del subtipo), igual que en el grupo.
3. COHE/COOP (§2.2.10): en el grupo cuentan los firmantes que son miembros
   del grupo y los grupos donde están los coautores. En la adaptación
   individual cuentan los firmantes registrados del producto (incluido el
   propio investigador) y los grupos de la red del investigador.

IMPLEMENTACIÓN
--------------
El módulo es puro (sin BD, pybind ni FastAPI) y REUSA el pipeline del grupo
(`official_indicator.recopilar_produccion` y `evaluar_poblacion`) sin
tocarlo: el investigador entra como unidad con su antigüedad en el lugar de
la "edad del grupo". Así el indicador individual no puede divergir del
modelo oficial en ninguna de sus partes: es el MISMO código.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .official_indicator import (
    CLASES,
    COEFICIENTES,
    GrupoOficial,
    ProductoOficial,
    cargar_catalogo,
    evaluar_poblacion,
)

#: Rótulo honesto del bloque: dice qué es (adaptación) y qué NO es (oficial).
MODELO_INDIVIDUAL = (
    "Minciencias 2024 — adaptación a nivel de investigador (NO oficial)"
)

#: Base normativa que sí se aplica (la parte del modelo que es oficial).
BASE_NORMATIVA = (
    "Modelo de medición 2024 §2.2.9 → §3.10, aplicado a la unidad "
    "'investigador' (adaptación declarada, no oficial)"
)

#: Las TRES adaptaciones, en texto auditable. Van en el payload.
ADAPTACIONES: List[str] = [
    "Unidad de medición: la población es la de investigadores del "
    "repositorio (§3.9 se normaliza contra el máximo de esa población), no "
    "la de grupos.",
    "Período de observación (§2.2.9): en vez de la edad del grupo se usa la "
    "antigüedad del investigador (años desde su primera vinculación como "
    "integrante; si no hay dato, desde su primer producto). "
    "período = min(antigüedad, ventana del subtipo).",
    "Cohe/Coop (§2.2.10): Cohe cuenta los firmantes registrados de cada "
    "producto del investigador (incluido él mismo: 0 significa autoría sola) "
    "y Coop cuenta los grupos de la red del investigador (los grupos donde "
    "está vinculado y los grupos de sus coautores: 0 significa que no hay "
    "cooperación entre grupos).",
]

#: Supuestos del lado del dato (lo que NO se inventa).
SUPUESTOS: List[str] = [
    "Antigüedad del investigador: años desde su primera vinculación "
    "(fecha de inicio de la membresía); si no hay membresía con fecha, se "
    "aproxima al primer año plausible de producción registrada; si no hay "
    "ninguno, se cuenta 1 año.",
    "Categoría de calidad (§3.6): si el validador humano la asignó, esa "
    "categoría es la que entra al modelo; si no, el producto se clasifica con "
    "la inferencia conservadora del texto GrupLAC.",
    "Los artículos en 'revista especializada' SIN categoría validada quedan "
    "fuera de los indicadores de producción (su calidad A1–D depende de "
    "Publindex/Scimago, que la fuente no trae), pero §2.2.10 es relacional: "
    "sí cuentan para Cohe/Coop.",
    "Cohe y Coop solo cuentan firmantes registrados en el repositorio: los "
    "autores externos (sin investigador vinculado) no aportan coautores ni "
    "grupos.",
    "Normalización §3.9: contra la población de investigadores cargada en el "
    "repositorio; una convocatoria real mediría a todos los investigadores "
    "reconocidos del área.",
]


@dataclass
class InvestigadorOficial:
    """Un investigador del área, con sus productos ya clasificados."""

    identificacion: str
    antiguedad_anos: int
    productos: List[ProductoOficial] = field(default_factory=list)
    #: Id del investigador en el repositorio (opcional: el modelo puro solo
    #: necesita la identificación y sus productos).
    id_investigador: Optional[int] = None


def _como_grupo(investigador: InvestigadorOficial) -> GrupoOficial:
    """El investigador entra al pipeline del grupo con su antigüedad como
    «edad» (es el mismo papel que cumplen `edad_grupo` en §2.2.9)."""
    return GrupoOficial(
        identificacion=investigador.identificacion,
        edad_grupo=investigador.antiguedad_anos,
        productos=investigador.productos,
    )


def _renombrar(resultado: Dict) -> Dict:
    """Traduce las claves del pipeline de grupo a las de la adaptación."""
    salida: Dict = {}
    for clave, valor in resultado.items():
        if clave == "grupo":
            salida["investigador"] = valor
        elif clave == "edad_grupo":
            salida["antiguedad_anos"] = valor
        elif clave == "ind_grupo":
            salida["ind_investigador"] = valor
        else:
            salida[clave] = valor
    return salida


def evaluar_poblacion_investigadores(
    investigadores: List[InvestigadorOficial],
    ano_cierre: int,
    catalogo: Optional[Dict] = None,
) -> List[Dict]:
    """Evalúa la población de investigadores:_indices §3.9, términos §3.10.

    Devuelve, por investigador, el mismo desglose que el modelo oficial
    entrega para un grupo (subtipos que aportan con su λ y su peso,
    Ind_Clase por clase, máximos de la población, Cohe/Coop y las exclusiones
    con su motivo), con las claves de la adaptación individual.
    """
    catalogo = catalogo if catalogo is not None else cargar_catalogo()
    unidades = [_como_grupo(i) for i in investigadores]
    base = evaluar_poblacion(unidades, ano_cierre, catalogo)
    return [_renombrar(resultado) for resultado in base]


__all__ = [
    "ADAPTACIONES",
    "BASE_NORMATIVA",
    "CLASES",
    "COEFICIENTES",
    "MODELO_INDIVIDUAL",
    "SUPUESTOS",
    "InvestigadorOficial",
    "evaluar_poblacion_investigadores",
]
