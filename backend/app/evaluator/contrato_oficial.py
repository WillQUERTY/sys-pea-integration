"""CONTRATO ÚNICO del bloque `modelo_oficial_2024` (Fase 3, brecha B7).

Hasta ahora el contrato de la lectura oficial del modelo de medición
Minciencias 2024 estaba triplicado a mano:

- `core_cpp/src/services/official_indicator.cpp::resultado_a_json` (C++),
- `backend/app/evaluator/official_population.py::evaluar_modelo_oficial` (Python),
- el tipo `MincienciasOfficialModel2024` de `frontend/web-react/src/lib/api/
  analytics.ts` (TypeScript).

Un campo nuevo añadido en un lado rompía el otro en silencio. Este módulo
-centraliza el contrato en UN archivo versionado
(`backend/tests/fixtures/indicador_oficial_golden.json`) y da las herramientas
para que las tres implementaciones se validen contra él:

- `AdaptadorJson`: lee el caso sintético como si fuera el repositorio en RAM,
- `comparar_indicadores`: comparación con tolerancia (C++ ↔ Python ↔ golden),
- `validar_contra_contrato`: valida claves y tipos de un payload contra el
  contrato declarado,
- `contrato_a_ts`: genera el tipo TypeScript a partir del contrato.

El caso sintético (`backend/tests/fixtures/indicador_oficial_caso.json`) es
determinista y NO depende de `pea_data.json` ni de la base de datos: es la
misma entrada para el backend, para el CLI C++ (`--data`) y para el fixture
del frontend.
"""

from __future__ import annotations

import io
import json
import pathlib
from typing import Any, Dict, Iterable, List, Optional, Tuple

RAIZ_REPO = pathlib.Path(__file__).resolve().parents[3]

RUTA_CASO = RAIZ_REPO / "backend" / "tests" / "fixtures" / "indicador_oficial_caso.json"
RUTA_GOLDEN = RAIZ_REPO / "backend" / "tests" / "fixtures" / "indicador_oficial_golden.json"
RUTA_TS = (
    RAIZ_REPO
    / "frontend"
    / "web-react"
    / "src"
    / "lib"
    / "api"
    / "contrato-oficial-2024.generated.ts"
)
RUTA_FIXTURE_TS = (
    RAIZ_REPO
    / "frontend"
    / "web-react"
    / "src"
    / "components"
    / "charts"
    / "__fixtures__"
    / "modelo-oficial-2024.generated.ts"
)

#: Tolerancia por defecto al comparar flotantes entre implementaciones.
TOLERANCIA = 1e-9

#: Año de cierre del caso sintético: fija la edad de los grupos (§2.2.9) y por
#: tanto la ventana de observación, así que el golden es reproducible.
ANO_CIERRE = 2026

#: CONTRATO del bloque `modelo_oficial_2024`: la forma exacta de la lectura
#: oficial que entrega C++, Python y la API. Es la ÚNICA declaración del
#: contrato; de aquí se genera el tipo de TypeScript y contra él se valida
#: el payload real.
#:
#: Notación: "string" | "number" | "number|null" | "Record<string, number>"
#: para escalares y mapas; {"clave": <tipo>} para objetos con claves fijas;
#: [<tipo>] para arreglos (el elemento es la plantilla del contenido).
CONTRATO: Dict[str, Any] = {
    "modelo": "string",
    "anio_cierre": "number",
    "grupo": {"id": "number", "identificacion": "string", "edad_anos": "number"},
    "ind_grupo": "number",
    "rango_teorico": "number",
    "posicion_poblacion": {"puesto": "number", "de": "number", "percentil": "number"},
    "poblacion": [{"grupo": "string", "ind_grupo": "number"}],
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
    "supuestos": ["string"],
}


# --- Adaptador del repositorio sobre el JSON ----------------------------------


class _Grupo:
    """Grupo mínimo con los atributos que lee el evaluador oficial."""

    __slots__ = ("id", "name", "acronym", "declared_creation_date")

    def __init__(self, datos: Dict[str, Any]):
        self.id = int(datos.get("id") or 0)
        self.name = datos.get("name") or ""
        self.acronym = datos.get("acronym") or ""
        self.declared_creation_date = datos.get("declared_creation_date")


class _Autor:
    __slots__ = ("researcher_id",)

    def __init__(self, researcher_id: Any):
        self.researcher_id = int(researcher_id or 0)


class AdaptadorJson:
    """Reproduce la lectura que hace el cargador JSON del núcleo C++.

    Se usa para que Python evalúe SOBRE LOS MISMOS DATOS que carga el CLI,
    sin depender del módulo compilado (pybind) ni de la base de datos.
    """

    def __init__(self, ruta: pathlib.Path):
        with io.open(ruta, encoding="utf-8") as fh:
            self.datos = json.load(fh)

    # -- grupos
    def list_groups(self) -> List[_Grupo]:
        return [_Grupo(g) for g in self.datos.get("groups", [])]

    def get_group(self, group_id: int) -> _Grupo:
        for grupo in self.datos.get("groups", []):
            if int(grupo.get("id") or 0) == group_id:
                return _Grupo(grupo)
        raise KeyError(f"Group {group_id} not found")

    # -- productos
    def products_of_group(self, group_id: int) -> List[int]:
        return [
            int(link.get("productId") or 0)
            for link in self.datos.get("groupProductLinks", [])
            if int(link.get("groupId") or 0) == group_id
        ]

    def get_product(self, product_id: int) -> Dict[str, Any]:
        for producto in self.datos.get("products", []):
            if int(producto.get("id") or 0) == product_id:
                return producto
        raise KeyError(f"Product {product_id} not found")

    # -- relaciones
    def members_of_group(self, group_id: int) -> List[int]:
        return [
            int(m.get("researcherId") or 0)
            for m in self.datos.get("memberships", [])
            if int(m.get("groupId") or 0) == group_id
        ]

    def authors_of_product_ram(self, product_id: int) -> List[_Autor]:
        return [
            _Autor(a.get("researcherId"))
            for a in self.datos.get("authors", [])
            if int(a.get("productId") or 0) == product_id
        ]


# --- Carga de los artefactos versionados --------------------------------------


def cargar_caso(ruta: Optional[pathlib.Path] = None) -> AdaptadorJson:
    """Carga el caso sintético (o el repositorio indicado)."""
    return AdaptadorJson(pathlib.Path(ruta) if ruta else RUTA_CASO)


def cargar_golden(ruta: Optional[pathlib.Path] = None) -> Dict[str, Any]:
    """Carga el contrato versionado (contrato + expectativas)."""
    ruta = pathlib.Path(ruta) if ruta else RUTA_GOLDEN
    with io.open(ruta, encoding="utf-8") as fh:
        return json.load(fh)


# --- Evaluación del caso -------------------------------------------------------


def evaluar_caso(
    ano_cierre: Optional[int] = None,
    ruta_caso: Optional[pathlib.Path] = None,
) -> Dict[int, Dict[str, Any]]:
    """Evalúa el modelo oficial sobre el caso sintético.

    Devuelve `{group_id: payload}` con el MISMO contrato que entrega la API
    (`modelo_oficial_2024`).
    """
    from .official_population import evaluar_modelo_oficial

    adaptador = cargar_caso(ruta_caso)
    ano = ano_cierre or ANO_CIERRE
    resultados: Dict[int, Dict[str, Any]] = {}
    for grupo in adaptador.list_groups():
        resultados[grupo.id] = evaluar_modelo_oficial(adaptador, grupo.id, ano_cierre=ano)
    return resultados


def calcular_esperados(
    ano_cierre: Optional[int] = None,
    ruta_caso: Optional[pathlib.Path] = None,
) -> Dict[str, Dict[str, Any]]:
    """Payloads oficiales del caso sintético, indexados por id de grupo."""
    return {
        str(gid): payload
        for gid, payload in sorted(evaluar_caso(ano_cierre, ruta_caso).items())
    }


# --- Comparación ---------------------------------------------------------------


def comparar_indicadores(
    python: Dict[str, Any],
    cpp: Dict[str, Any],
    tolerancia: float = TOLERANCIA,
    etiqueta_a: str = "Python",
    etiqueta_b: str = "C++",
) -> List[str]:
    """Devuelve la lista de diferencias entre el resultado Python y el C++."""
    diferencias: List[str] = []

    def recorrer(ruta: str, a: Any, b: Any) -> None:
        if isinstance(a, dict) and isinstance(b, dict):
            for clave in sorted(set(a) | set(b)):
                if clave not in a:
                    diferencias.append(f"{ruta}.{clave}: falta en {etiqueta_a}")
                elif clave not in b:
                    diferencias.append(f"{ruta}.{clave}: falta en {etiqueta_b}")
                else:
                    recorrer(f"{ruta}.{clave}", a[clave], b[clave])
            return
        if isinstance(a, list) and isinstance(b, list):
            if len(a) != len(b):
                diferencias.append(
                    f"{ruta}: longitudes {len(a)} ({etiqueta_a}) vs {len(b)} ({etiqueta_b})"
                )
                return
            for i, (x, y) in enumerate(zip(a, b)):
                recorrer(f"{ruta}[{i}]", x, y)
            return
        if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
            if abs(float(a) - float(b)) > tolerancia:
                diferencias.append(f"{ruta}: {a!r} ({etiqueta_a}) vs {b!r} ({etiqueta_b})")
            return
        if a != b:
            diferencias.append(f"{ruta}: {a!r} ({etiqueta_a}) vs {b!r} ({etiqueta_b})")

    recorrer("", python, cpp)
    return diferencias


# --- Validación de un payload contra el contrato ------------------------------
#
# Notación del contrato (JSON):
#   "string" | "number" | "boolean" | "number|null"   → escalar
#   "Record<string, number>"                          → mapa
#   {"id": "number"}                                  → objeto con claves fijas
#   ["string"]                                       → arreglo de escalares
#   [{"grupo": "string"}]                             → arreglo de objetos
# En los arreglos, el primer elemento es la PLANTILLA del tipo de cada item.


def _tipo_es_valido(valor: Any, tipo: str) -> bool:
    if tipo == "string":
        return isinstance(valor, str)
    if tipo == "number":
        return isinstance(valor, (int, float)) and not isinstance(valor, bool)
    if tipo == "boolean":
        return isinstance(valor, bool)
    if "|" in tipo:
        return any(_tipo_es_valido(valor, parte.strip()) for parte in tipo.split("|"))
    if tipo.startswith("Record<") and tipo.endswith(">"):
        interior = tipo[len("Record<") : -1]
        clave, _, valor_tipo = interior.partition(",")
        if not isinstance(valor, dict):
            return False
        return all(
            _tipo_es_valido(v, valor_tipo.strip()) for v in valor.values()
        ) and all(isinstance(k, str) for k in valor.keys())
    return False


def _validar_valor(valor: Any, tipo: Any, ruta: str, errores: List[str]) -> None:
    if isinstance(tipo, str):
        if not _tipo_es_valido(valor, tipo):
            errores.append(f"{ruta}: se esperaba {tipo} y llegó {type(valor).__name__}")
        return
    if isinstance(tipo, dict):
        if not isinstance(valor, dict):
            errores.append(f"{ruta}: se esperaba un objeto y llegó {type(valor).__name__}")
            return
        for clave in tipo:
            if clave not in valor:
                errores.append(f"{ruta}.{clave}: falta la clave")
                continue
            _validar_valor(valor[clave], tipo[clave], f"{ruta}.{clave}", errores)
        for clave in valor:
            if clave not in tipo:
                errores.append(f"{ruta}.{clave}: clave no declarada en el contrato")
        return
    if isinstance(tipo, list):
        if not isinstance(valor, list):
            errores.append(f"{ruta}: se esperaba un arreglo y llegó {type(valor).__name__}")
            return
        if not tipo:
            return
        plantilla = tipo[0]
        for i, item in enumerate(valor):
            _validar_valor(item, plantilla, f"{ruta}[{i}]", errores)
        return
    errores.append(f"{ruta}: tipo de contrato desconocido {tipo!r}")


def validar_contra_contrato(
    payload: Dict[str, Any],
    contrato: Dict[str, Any],
    raiz: str = "modelo_oficial_2024",
) -> List[str]:
    """Valida que el payload respete el contrato (claves y tipos).

    `raiz` es solo la etiqueta del camino en los mensajes de error (el bloque
    de grupo es `modelo_oficial_2024`; el de la adaptación individual es
    `adaptacion_individual_2024`)."""
    errores: List[str] = []
    _validar_valor(payload, contrato, raiz, errores)
    return errores


# --- Generación del tipo TypeScript -------------------------------------------


def _ts_tipo(tipo: Any, sangria: str = "  ") -> str:
    """Traduce la notación del contrato a un tipo TypeScript."""
    if isinstance(tipo, str):
        if tipo.startswith("Record<") and tipo.endswith(">"):
            interior = tipo[len("Record<") : -1]
            _, _, valor_tipo = interior.partition(",")
            return f"Record<string, {valor_tipo.strip()}>"
        if tipo == "number|null":
            return "number | null"
        return tipo
    if isinstance(tipo, dict):
        partes = [
            f"{sangria}  {clave}: {_ts_tipo(sub, sangria + '  ')}"
            for clave, sub in tipo.items()
        ]
        return "{\n" + "\n".join(partes) + f"\n{sangria}}}"
    if isinstance(tipo, list):
        if not tipo:
            return "unknown[]"
        return f"{_ts_tipo(tipo[0], sangria)}[]"
    return "unknown"


def contrato_a_ts(
    contrato: Dict[str, Any],
    interfaz: str = "MincienciasOfficialModel2024",
    fuente: str = "backend/app/evaluator/contrato_oficial.py (CONTRATO)",
    comando: str = "scripts/gen_contrato_oficial.py",
) -> str:
    """Genera el archivo TypeScript con el tipo del contrato.

    El archivo generado es la ÚNICA declaración del tipo: si el contrato
    cambia, `scripts/gen_contrato_oficial.py --check` falla.

    `fuente` y `comando` solo cambian el encabezado del archivo generado
    (el contrato individual usa su propio módulo y su propio generador)."""
    lineas = [
        "// ARCHIVO GENERADO — NO EDITAR A MANO.",
        f"// Fuente: {fuente}.",
        f"// Regenerar: python -X utf8 {comando} --regenerar",
        f"// Verificar:  python -X utf8 {comando} --check",
        "",
        f"export interface {interfaz} {{",
    ]
    for clave, tipo in contrato.items():
        lineas.append(f"  {clave}: {_ts_tipo(tipo, '  ')}")
    lineas.append("}")
    lineas.append("")
    return "\n".join(lineas)


# --- Artefactos generados ------------------------------------------------------

#: Versión del contrato: se sube cuando cambia la FORMA del payload.
VERSION_CONTRATO = 1


def contenido_golden(
    ano_cierre: Optional[int] = None,
    ruta_caso: Optional[pathlib.Path] = None,
) -> str:
    """Contenido del golden versionado: contrato + expectativas del caso."""
    ano = ano_cierre or ANO_CIERRE
    doc = {
        "_descripcion": (
            "CONTRATO ÚNICO de la lectura oficial `modelo_oficial_2024` (Fase 3). "
            "Contiene la forma declarada del payload (`contrato`) y el resultado "
            "esperado del caso sintético `indicador_oficial_caso.json` (`esperado`). "
            "Lo consumen el backend (pytest), el CLI C++ (pea_paridad_indicador "
            "--golden) y el frontend (tipo + fixture generados)."
        ),
        "version": VERSION_CONTRATO,
        "modelo": "Minciencias 2024 — modelo de medición (§2.2.9 → §3.10)",
        "ano_cierre": ano,
        "caso": "backend/tests/fixtures/indicador_oficial_caso.json",
        "tolerancia": TOLERANCIA,
        "contrato": CONTRATO,
        "esperado": calcular_esperados(ano, ruta_caso),
    }
    return json.dumps(doc, ensure_ascii=False, indent=2) + "\n"


def contenido_fixture_ts(esperados: Dict[str, Dict[str, Any]]) -> str:
    """Contenido del fixture TypeScript del frontend.

    Va TIPADO contra el contrato generado: si el payload deja de cumplir el
    contrato, el build del frontend falla (no hace falta leer el JSON).
    """
    cuerpo = json.dumps(esperados, ensure_ascii=False, indent=2)
    return (
        "// ARCHIVO GENERADO — NO EDITAR A MANO.\n"
        "// Fuente: backend/tests/fixtures/indicador_oficial_golden.json (bloque `esperado`).\n"
        "// Regenerar: python -X utf8 scripts/gen_contrato_oficial.py --regenerar\n"
        "// Verificar:  python -X utf8 scripts/gen_contrato_oficial.py --check\n"
        "\n"
        "import type { MincienciasOfficialModel2024 } from '@/lib/api'\n"
        "\n"
        "/** Lecturas oficiales del caso sintético, indexadas por id de grupo. */\n"
        "export const MODELO_OFICIAL_CASO: Record<string, MincienciasOfficialModel2024> = "
        + cuerpo
        + "\n"
    )


__all__ = [
    "ANO_CIERRE",
    "AdaptadorJson",
    "CONTRATO",
    "RUTA_CASO",
    "RUTA_FIXTURE_TS",
    "RUTA_GOLDEN",
    "RUTA_TS",
    "TOLERANCIA",
    "VERSION_CONTRATO",
    "calcular_esperados",
    "cargar_caso",
    "cargar_golden",
    "comparar_indicadores",
    "contenido_fixture_ts",
    "contenido_golden",
    "contrato_a_ts",
    "evaluar_caso",
    "validar_contra_contrato",
]
