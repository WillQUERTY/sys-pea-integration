"""CONTRATO ÚNICO de la ADAPTACIÓN INDIVIDUAL del modelo 2024 (Fase 5, B3/D5).

El modelo de medición Minciencias 2024 (`docs/modelo-medicion-2024.md`) define
un ÚNICO indicador de producción: el **Ind.Grupo** (§3.10). No existe un
indicador de producción por persona. Por eso el bloque individual NO se rotula
"oficial": es una **adaptación declarada** del mismo pipeline (§2.2.9 → §3.10)
aplicado a la unidad "investigador", y su rótulo travels en cada payload
(`modelo`, `base_normativa`, `adaptaciones`).

Este módulo replica la arquitectura del contrato del grupo
(`contrato_oficial.py`), pero con su propia forma de payload:

- `CONTRATO_INDIVIDUAL`: la forma declarada (22 claves raíz) del bloque
  `adaptacion_individual_2024`,
- `AdaptadorIndividual`: el mismo caso sintético, leído como si fuera el
  repositorio en RAM (para que Python evalúe SIN pybind y sin BD),
- `evaluar_caso_individual` / `calcular_esperados_individual`: los payloads
  esperados del caso,
- `contenido_golden_individual` / `contenido_fixture_ts_individual`: los
  artefactos versionados (golden JSON, tipo TS y fixture del frontend).

El CASO es el mismo del grupo (`indicador_oficial_caso.json`): una sola
fuente de datos sintéticos para las dos lecturas, con los mismos grupos,
productos, membresías (con fecha de inicio) y autores.

El comparador (`comparar_indicadores`) y el validador
(`validar_contra_contrato`) se reusan del contrato del grupo; lo único que
cambia es la raíz del mensaje de error.
"""

from __future__ import annotations

import io
import json
import pathlib
from typing import Any, Dict, List, Optional

from .contrato_oficial import (
    ANO_CIERRE,
    RUTA_CASO,
    TOLERANCIA,
    AdaptadorJson,
    comparar_indicadores,
    contrato_a_ts,
    validar_contra_contrato,
)

RAIZ_REPO = pathlib.Path(__file__).resolve().parents[3]

#: Golden del bloque individual.
RUTA_GOLDEN = RAIZ_REPO / "backend" / "tests" / "fixtures" / "indicador_individual_golden.json"

#: Tipo TypeScript generado desde `CONTRATO_INDIVIDUAL`.
RUTA_TS = (
    RAIZ_REPO
    / "frontend"
    / "web-react"
    / "src"
    / "lib"
    / "api"
    / "contrato-individual-2024.generated.ts"
)

#: Fixture TypeScript del frontend.
RUTA_FIXTURE_TS = (
    RAIZ_REPO
    / "frontend"
    / "web-react"
    / "src"
    / "components"
    / "charts"
    / "__fixtures__"
    / "modelo-individual-2024.generated.ts"
)

#: Interfaz TypeScript del bloque individual.
INTERFAZ_TS = "MincienciasIndividualAdaptation2024"

#: Etiqueta de la raíz del bloque en los mensajes de validación.
RAIZ_BLOQUE = "adaptacion_individual_2024"

#: Rótulo honesto del bloque (idéntico al que emite el evaluador).
MODELO_INDIVIDUAL = "Minciencias 2024 — adaptación a nivel de investigador (NO oficial)"

#: CONTRATO del bloque `adaptacion_individual_2024`: la forma exacta de la
#: lectura individual que entregan C++, Python y la API. Es la ÚNICA
#: declaración del contrato; de aquí salen el golden, el tipo TS y el
#: fixture del frontend.
CONTRATO_INDIVIDUAL: Dict[str, Any] = {
    "modelo": "string",
    "base_normativa": "string",
    "anio_cierre": "number",
    "investigador": {"id": "number", "identificacion": "string", "antiguedad_anos": "number"},
    "ind_investigador": "number",
    "rango_teorico": "number",
    "posicion_poblacion": {"puesto": "number", "de": "number", "percentil": "number"},
    "poblacion": [{"id": "number", "investigador": "string", "ind_investigador": "number"}],
    "indices": "Record<string, number>",
    "terminos_ponderados": "Record<string, number>",
    "ind_clase": "Record<string, number>",
    "maximos_poblacion": "Record<string, number>",
    "maximo_cohe_poblacion": "number",
    "maximo_coop_poblacion": "number",
    "subtipos": [
        {
            "codigo": "string",
            "clase": "string",
            "familia": "string",
            "n": "number",
            "periodo": "number",
            "lambda": "number",
            "ancla_subtipo": "number|null",
            "peso_relativo": "number",
            "peso_global": "number",
            "termino": "number",
        }
    ],
    "cohe": {"suma_autores": "number", "productos": "number", "valor": "number"},
    "coop": {"suma_grupos": "number", "productos": "number", "valor": "number"},
    "excluidos": "Record<string, number>",
    "sin_ano": "Record<string, number>",
    "fuera_de_periodo": "Record<string, number>",
    "adaptaciones": ["string"],
    "supuestos": ["string"],
}


# --- Adaptador del caso sintético (individual) ---------------------------------


class _Investigador:
    """Investigador mínimo con los atributos que lee el evaluador individual."""

    __slots__ = ("id", "external_code", "first_names", "last_names", "status")

    def __init__(self, datos: Dict[str, Any]):
        self.id = int(datos.get("id") or 0)
        self.external_code = datos.get("external_code") or ""
        self.first_names = datos.get("first_names") or ""
        self.last_names = datos.get("last_names") or ""
        self.status = datos.get("status") or "active"


class _Membresia:
    """Detalle de una membresía (mismo papel que el `Membership` del núcleo)."""

    __slots__ = ("researcher_id", "role", "start_date", "end_date", "status")

    def __init__(self, datos: Dict[str, Any]):
        self.researcher_id = int(datos.get("researcherId") or 0)
        self.role = datos.get("role") or ""
        self.start_date = datos.get("start_date") or ""
        self.end_date = datos.get("end_date") or ""
        self.status = datos.get("status") or "active"


class AdaptadorIndividual(AdaptadorJson):
    """El caso sintético leído como si fuera el repositorio en RAM.

    Extiende `AdaptadorJson` (que ya trae grupos, productos, membresías y
    autores) con lo que la lectura individual necesita: el padrón de
    investigadores, los productos de cada uno y el detalle de su membresía
    (fecha de inicio → antigüedad).
    """

    # -- investigadores
    def list_researchers(self) -> List[_Investigador]:
        return [_Investigador(r) for r in self.datos.get("researchers", [])]

    def get_researcher(self, researcher_id: int) -> _Investigador:
        for investigador in self.datos.get("researchers", []):
            if int(investigador.get("id") or 0) == researcher_id:
                return _Investigador(investigador)
        raise KeyError(f"Researcher {researcher_id} not found")

    def products_of_researcher(self, researcher_id: int) -> List[int]:
        """Productos firms por el investigador (el mismo vínculo que usa el
        núcleo: el investigador aparece como autor del producto)."""
        return [
            int(a.get("productId") or 0)
            for a in self.datos.get("authors", [])
            if int(a.get("researcherId") or 0) == researcher_id
            and int(a.get("productId") or 0) > 0
        ]

    # -- membresías
    def membership_details(self, group_id: int, researcher_id: int) -> Optional[_Membresia]:
        for m in self.datos.get("memberships", []):
            if (
                int(m.get("groupId") or 0) == group_id
                and int(m.get("researcherId") or 0) == researcher_id
            ):
                return _Membresia(m)
        return None

    def get_group_members_detailed(self, group_id: int) -> List[Dict[str, Any]]:
        filas = []
        for m in self.datos.get("memberships", []):
            if int(m.get("groupId") or 0) != group_id:
                continue
            rid = int(m.get("researcherId") or 0)
            investigador = self.get_researcher(rid) if rid else None
            filas.append(
                {
                    "group_id": group_id,
                    "researcher_id": rid,
                    "researcher_external_code": getattr(investigador, "external_code", ""),
                    "researcher_name": (
                        f"{investigador.first_names} {investigador.last_names}".strip()
                        if investigador
                        else ""
                    ),
                    "role": m.get("role") or "",
                    "start_date": m.get("start_date") or "",
                    "end_date": m.get("end_date") or "",
                    "is_current": not (m.get("end_date") or ""),
                    "status": m.get("status") or "active",
                }
            )
        return filas


# --- Carga de artefactos --------------------------------------------------------


def cargar_caso(ruta: Optional[pathlib.Path] = None) -> AdaptadorIndividual:
    """Carga el caso sintético (el mismo del grupo) como repositorio en RAM."""
    return AdaptadorIndividual(pathlib.Path(ruta) if ruta else RUTA_CASO)


def cargar_golden(ruta: Optional[pathlib.Path] = None) -> Dict[str, Any]:
    """Carga el golden versionado del bloque individual."""
    ruta = pathlib.Path(ruta) if ruta else RUTA_GOLDEN
    with io.open(ruta, encoding="utf-8") as fh:
        return json.load(fh)


# --- Evaluación del caso --------------------------------------------------------


def evaluar_caso_individual(
    ano_cierre: Optional[int] = None,
    ruta_caso: Optional[pathlib.Path] = None,
) -> Dict[int, Dict[str, Any]]:
    """Evalúa la adaptación individual sobre el caso sintético.

    Devuelve `{researcher_id: payload}` con el MISMO contrato que entrega la
    API (`adaptacion_individual_2024`)."""
    from .official_researcher_population import evaluar_modelo_individual

    adaptador = cargar_caso(ruta_caso)
    ano = ano_cierre or ANO_CIERRE
    resultados: Dict[int, Dict[str, Any]] = {}
    for investigador in adaptador.list_researchers():
        resultados[investigador.id] = evaluar_modelo_individual(
            adaptador, investigador.id, ano_cierre=ano
        )
    return resultados


def calcular_esperados_individual(
    ano_cierre: Optional[int] = None,
    ruta_caso: Optional[pathlib.Path] = None,
) -> Dict[str, Dict[str, Any]]:
    """Payloads individuales del caso sintético, indexados por id."""
    return {
        str(rid): payload
        for rid, payload in sorted(evaluar_caso_individual(ano_cierre, ruta_caso).items())
    }


# --- Validación -----------------------------------------------------------------


def validar_individual(payload: Dict[str, Any]) -> List[str]:
    """Valida un payload individual contra `CONTRATO_INDIVIDUAL`."""
    return validar_contra_contrato(payload, CONTRATO_INDIVIDUAL, RAIZ_BLOQUE)


# --- Artefactos generados --------------------------------------------------------

#: Versión del contrato individual: se sube cuando cambia la FORMA del payload.
VERSION_CONTRATO_INDIVIDUAL = 1


def contenido_golden_individual(
    ano_cierre: Optional[int] = None,
    ruta_caso: Optional[pathlib.Path] = None,
) -> str:
    """Contenido del golden versionado del bloque individual."""
    ano = ano_cierre or ANO_CIERRE
    doc = {
        "_descripcion": (
            "CONTRATO ÚNICO de la ADAPTACIÓN INDIVIDUAL `adaptacion_individual_2024` "
            "(Fase 5). El modelo de medición Minciencias 2024 define un único "
            "indicador de producción y es DE GRUPO (§3.10): no existe un indicador "
            "oficial por persona. Este bloque es una adaptación declarada del mismo "
            "pipeline (§2.2.9 → §3.10) aplicado a la unidad 'investigador', y por eso "
            "se rotula 'adaptación (NO oficial)' en todas partes. Contiene la forma "
            "declarada del payload (`contrato`) y el resultado esperado del caso "
            "sintético `indicador_oficial_caso.json` (`esperado`). Lo consumen el "
            "backend (pytest), el CLI C++ (pea_paridad_individual --golden) y el "
            "frontend (tipo + fixture generados)."
        ),
        "version": VERSION_CONTRATO_INDIVIDUAL,
        "modelo": MODELO_INDIVIDUAL,
        "ano_cierre": ano,
        "caso": "backend/tests/fixtures/indicador_oficial_caso.json",
        "tolerancia": TOLERANCIA,
        "contrato": CONTRATO_INDIVIDUAL,
        "esperado": calcular_esperados_individual(ano, ruta_caso),
    }
    return json.dumps(doc, ensure_ascii=False, indent=2) + "\n"


def contenido_tipo_ts_individual() -> str:
    """Contenido del tipo TypeScript generado desde `CONTRATO_INDIVIDUAL`."""
    return contrato_a_ts(
        CONTRATO_INDIVIDUAL,
        INTERFAZ_TS,
        fuente="backend/app/evaluator/contrato_individual.py (CONTRATO_INDIVIDUAL)",
        comando="scripts/gen_contrato_individual.py",
    )


def contenido_fixture_ts_individual(esperados: Dict[str, Dict[str, Any]]) -> str:
    """Contenido del fixture TypeScript del frontend (tipado contra el contrato)."""
    cuerpo = json.dumps(esperados, ensure_ascii=False, indent=2)
    return (
        "// ARCHIVO GENERADO — NO EDITAR A MANO.\n"
        "// Fuente: backend/tests/fixtures/indicador_individual_golden.json (bloque `esperado`).\n"
        "// Regenerar: python -X utf8 scripts/gen_contrato_individual.py --regenerar\n"
        "// Verificar:  python -X utf8 scripts/gen_contrato_individual.py --check\n"
        "\n"
        f"import type {{ {INTERFAZ_TS} }} from '@/lib/api'\n"
        "\n"
        "/** Lecturas de la adaptación individual del caso sintético, por id. */\n"
        f"export const MODELO_INDIVIDUAL_CASO: Record<string, {INTERFAZ_TS}> = "
        + cuerpo
        + "\n"
    )


__all__ = [
    "ANO_CIERRE",
    "CONTRATO_INDIVIDUAL",
    "INTERFAZ_TS",
    "MODELO_INDIVIDUAL",
    "RAIZ_BLOQUE",
    "RUTA_CASO",
    "RUTA_FIXTURE_TS",
    "RUTA_GOLDEN",
    "RUTA_TS",
    "TOLERANCIA",
    "VERSION_CONTRATO_INDIVIDUAL",
    "AdaptadorIndividual",
    "calcular_esperados_individual",
    "cargar_caso",
    "cargar_golden",
    "comparar_indicadores",
    "contenido_fixture_ts_individual",
    "contenido_golden_individual",
    "contenido_tipo_ts_individual",
    "evaluar_caso_individual",
    "validar_individual",
]
