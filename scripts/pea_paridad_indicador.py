#!/usr/bin/env python3
"""Verifica la PARIDAD del indicador oficial entre el CLI C++ y Python.

El CLI (`pea_cli indicator group <id> --data <repo.json> --json`) calcula el
modelo oficial Minciencias 2024 en C++; el backend lo calcula en Python
(`backend/app/evaluator/official_population.py::evaluar_modelo_oficial`).
Ambos deben dar EXACTAMENTE el mismo número: el CLI ya no difiere del API.

El script carga el MISMO archivo JSON en los dos lados (el AdaptadorJson de
este archivo reproduce el mapeo del cargador `core_cpp/src/persistence/json/
json_loader.cpp`), así que cualquier diferencia es algorítmica, no de datos.

Uso:
    python -X utf8 scripts/pea_paridad_indicador.py
    python -X utf8 scripts/pea_paridad_indicador.py --groups 10,35 --year 2026
    python -X utf8 scripts/pea_paridad_indicador.py --cli core_cpp/build2/Release/pea_cli.exe

Sale con código 0 si hay paridad y 1 si hay diferencias.
"""

from __future__ import annotations

import argparse
import datetime
import io
import json
import pathlib
import subprocess
import sys
from typing import Any, Dict, Iterable, List

REPO_RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_RAIZ))

from backend.app.evaluator.official_population import (  # noqa: E402
    evaluar_modelo_oficial,
)

# Candidatos habituales del ejecutable (Windows / Linux).
CANDIDATOS_CLI = (
    "core_cpp/build2/Release/pea_cli.exe",
    "core_cpp/build/Release/pea_cli.exe",
    "core_cpp/build/pea_cli",
    "core_cpp/build2/pea_cli",
)


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


# --- Comparación ---------------------------------------------------------------


def _normalizar(valor: Any) -> Any:
    """Compara flotantes con tolerancia y listas sin importar el orden."""
    if isinstance(valor, dict):
        return {k: _normalizar(v) for k, v in valor.items()}
    if isinstance(valor, list):
        return [_normalizar(v) for v in valor]
    return valor


def comparar_indicadores(
    python: Dict[str, Any],
    cpp: Dict[str, Any],
    tolerancia: float = 1e-9,
) -> List[str]:
    """Devuelve la lista de diferencias entre el resultado Python y el C++."""
    diferencias: List[str] = []

    def recorrer(ruta: str, a: Any, b: Any) -> None:
        if isinstance(a, dict) and isinstance(b, dict):
            for clave in sorted(set(a) | set(b)):
                if clave not in a:
                    diferencias.append(f"{ruta}.{clave}: falta en Python")
                elif clave not in b:
                    diferencias.append(f"{ruta}.{clave}: falta en C++")
                else:
                    recorrer(f"{ruta}.{clave}", a[clave], b[clave])
            return
        if isinstance(a, list) and isinstance(b, list):
            if len(a) != len(b):
                diferencias.append(f"{ruta}: longitudes {len(a)} (Python) vs {len(b)} (C++)")
                return
            for i, (x, y) in enumerate(zip(a, b)):
                recorrer(f"{ruta}[{i}]", x, y)
            return
        if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
            if abs(float(a) - float(b)) > tolerancia:
                diferencias.append(f"{ruta}: {a!r} (Python) vs {b!r} (C++)")
            return
        if a != b:
            diferencias.append(f"{ruta}: {a!r} (Python) vs {b!r} (C++)")

    recorrer("", python, cpp)
    return diferencias


# --- CLI -----------------------------------------------------------------------


def buscar_cli(ruta: str | None) -> pathlib.Path:
    if ruta:
        return pathlib.Path(ruta)
    for candidato in CANDIDATOS_CLI:
        p = REPO_RAIZ / candidato
        if p.exists():
            return p
    raise SystemExit(
        "No se encontró pea_cli. Compílalo (core_cpp) o indícalo con --cli."
    )


def ejecutar_cli(cli: pathlib.Path, datos: pathlib.Path, group_id: int, anio: int) -> Dict[str, Any]:
    comando = [
        str(cli),
        "indicator",
        "group",
        str(group_id),
        "--data",
        str(datos),
        "--year",
        str(anio),
        "--json",
    ]
    proceso = subprocess.run(
        comando,
        cwd=str(REPO_RAIZ),
        capture_output=True,
    )
    salida = proceso.stdout.decode("utf-8", errors="replace")
    if proceso.returncode != 0:
        raise SystemExit(
            f"pea_cli salió con código {proceso.returncode}:\n"
            f"{proceso.stderr.decode('utf-8', errors='replace')}"
        )
    try:
        return json.loads(salida)
    except json.JSONDecodeError as exc:  # pragma: no cover - diagnóstico
        raise SystemExit(f"La salida de pea_cli no es JSON válido: {exc}\n{salida[:400]}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="pea_data.json", help="repositorio JSON")
    parser.add_argument("--groups", default="10,35", help="ids de grupo a comparar")
    parser.add_argument("--year", type=int, default=datetime.datetime.now().year)
    parser.add_argument("--cli", default=None, help="ruta de pea_cli")
    parser.add_argument("--tolerance", type=float, default=1e-9)
    args = parser.parse_args()

    datos = REPO_RAIZ / args.data
    if not datos.exists():
        raise SystemExit(f"No existe el archivo de datos: {datos}")
    cli = buscar_cli(args.cli)

    adaptador = AdaptadorJson(datos)
    grupos = [int(g) for g in args.groups.split(",") if g.strip()]

    fallo = False
    for group_id in grupos:
        python = evaluar_modelo_oficial(adaptador, group_id, ano_cierre=args.year)
        cpp = ejecutar_cli(cli, datos, group_id, args.year)
        diferencias = comparar_indicadores(python, cpp, args.tolerance)
        if diferencias:
            fallo = True
            print(f"[FALLA] grupo {group_id}: {len(diferencias)} diferencias")
            for linea in diferencias[:40]:
                print(f"    - {linea}")
            if len(diferencias) > 40:
                print(f"    ... y {len(diferencias) - 40} más")
        else:
            print(
                f"[OK] grupo {group_id}: paridad exacta "
                f"(Ind.Grupo = {cpp['ind_grupo']!r}, "
                f"puesto {cpp['posicion_poblacion']['puesto']}/{cpp['posicion_poblacion']['de']})"
            )

    if fallo:
        print("\nPARIDAD ROTA: el CLI C++ difiere del evaluador Python.")
        return 1
    print("\nPARIDAD CONFIRMADA: CLI C++ = backend Python (mismo Ind.Grupo).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
