#!/usr/bin/env python3
"""Verifica la PARIDAD de la ADAPTACIÓN INDIVIDUAL entre el CLI C++ y Python.

El CLI (`pea_cli indicator researcher <id> --data <repo.json> --json`) calcula
la lectura individual en C++; el backend la calcula en Python
(`backend/app/evaluator/official_researcher_population.py::evaluar_modelo_individual`).
Ambos deben dar EXACTAMENTE el mismo número.

OJO CON EL RÓTULO: el modelo de medición Minciencias 2024 define UN solo
indicador de producción y es DE GRUPO (§3.10): no existe un indicador oficial
por persona. Lo que se compara aquí es una ADAPTACIÓN DECLARADA del mismo
pipeline a la unidad "investigador" (ver `docs/indicador-oficial-2024.md`).
El script no valida un indicador oficial: valida que las TRES implementaciones
(C++, Python y el contrato versionado) den la misma lectura de la adaptación.

El script carga el MISMO archivo JSON en los dos lados (el `AdaptadorIndividual`
de `backend/app/evaluator/contrato_individual.py` reproduce el mapeo del
cargador `core_cpp/src/persistence/json/json_loader.cpp`), así que cualquier
diferencia es algorítmica, no de datos.

Modo `--golden` (Fase 5): compara el CLI contra el CONTRATO ÚNICO versionado
(`backend/tests/fixtures/indicador_individual_golden.json`), sobre el caso
sintético determinista. Así el C++ queda atado al mismo contrato que el
backend y el frontend, y no solo a la otra implementación.

Uso:
    python -X utf8 scripts/pea_paridad_individual.py
    python -X utf8 scripts/pea_paridad_individual.py --researchers 101,102,103 --year 2026
    python -X utf8 scripts/pea_paridad_individual.py --cli core_cpp/build2/Release/pea_cli.exe
    python -X utf8 scripts/pea_paridad_individual.py --golden

Sale con código 0 si hay paridad y 1 si hay diferencias.
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import subprocess
import sys

REPO_RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_RAIZ))

from backend.app.evaluator.contrato_individual import (  # noqa: E402
    AdaptadorIndividual,
    RUTA_CASO,
    RUTA_GOLDEN,
    cargar_golden,
    comparar_indicadores,
)
from backend.app.evaluator.official_researcher_population import (  # noqa: E402
    evaluar_modelo_individual,
)

# Candidatos habituales del ejecutable (Windows / Linux).
CANDIDATOS_CLI = (
    "core_cpp/build2/Release/pea_cli.exe",
    "core_cpp/build/Release/pea_cli.exe",
    "core_cpp/build/pea_cli",
    "core_cpp/build2/pea_cli",
)


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


def ejecutar_cli(
    cli: pathlib.Path, datos: pathlib.Path, researcher_id: int, anio: int
) -> dict:
    comando = [
        str(cli),
        "indicator",
        "researcher",
        str(researcher_id),
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


def _reportar(etiqueta: str, researcher_id: int, diferencias: list) -> bool:
    """Imprime el resultado de una comparación. True si hay diferencias."""
    if diferencias:
        print(
            f"[FALLA] investigador {researcher_id} ({etiqueta}): "
            f"{len(diferencias)} diferencias"
        )
        for linea in diferencias[:40]:
            print(f"    - {linea}")
        if len(diferencias) > 40:
            print(f"    ... y {len(diferencias) - 40} más")
        return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="pea_data.json", help="repositorio JSON")
    parser.add_argument(
        "--researchers",
        default="101,102,103",
        help="ids de investigador a comparar",
    )
    parser.add_argument("--year", type=int, default=datetime.datetime.now().year)
    parser.add_argument("--cli", default=None, help="ruta de pea_cli")
    parser.add_argument("--tolerance", type=float, default=1e-9)
    parser.add_argument(
        "--golden",
        action="store_true",
        help="compara el CLI contra el contrato versionado (golden) sobre el caso sintético",
    )
    args = parser.parse_args()

    cli = buscar_cli(args.cli)
    fallo = False

    if args.golden:
        golden = cargar_golden()
        datos = RUTA_CASO
        anio = int(golden["ano_cierre"])
        investigadores = sorted(int(r) for r in golden["esperado"])
        adaptador = AdaptadorIndividual(datos)
        print(f"Contrato versionado: {RUTA_GOLDEN.relative_to(REPO_RAIZ)} (cierre {anio})")
        print(f"Caso sintético: {RUTA_CASO.relative_to(REPO_RAIZ)}\n")

        for researcher_id in investigadores:
            esperado = golden["esperado"][str(researcher_id)]
            cpp = ejecutar_cli(cli, datos, researcher_id, anio)
            python = evaluar_modelo_individual(adaptador, researcher_id, ano_cierre=anio)

            diferencias_cpp = comparar_indicadores(
                cpp, esperado, args.tolerance, etiqueta_a="C++", etiqueta_b="golden"
            )
            diferencias_python = comparar_indicadores(
                python, esperado, args.tolerance, etiqueta_a="Python", etiqueta_b="golden"
            )
            fallo_investigador = _reportar("C++ vs golden", researcher_id, diferencias_cpp)
            fallo_investigador |= _reportar(
                "Python vs golden", researcher_id, diferencias_python
            )
            if fallo_investigador:
                fallo = True
            else:
                print(
                    f"[OK] investigador {researcher_id}: C++ = Python = golden "
                    f"(Ind.Investigador = {cpp['ind_investigador']!r}, "
                    f"puesto {cpp['posicion_poblacion']['puesto']}/"
                    f"{cpp['posicion_poblacion']['de']}, "
                    f"antigüedad {cpp['investigador']['antiguedad_anos']})"
                )

        if fallo:
            print("\nCONTRATO ROTO: la adaptación individual difiere del contrato versionado.")
            return 1
        print(
            "\nCONTRATO CONFIRMADO: CLI C++ = backend Python = golden "
            "de la adaptación individual (NO oficial)."
        )
        return 0

    # -- Modo clásico: el CLI contra el backend sobre un repositorio cualquiera.
    datos = REPO_RAIZ / args.data
    if not datos.exists():
        raise SystemExit(f"No existe el archivo de datos: {datos}")

    adaptador = AdaptadorIndividual(datos)
    investigadores = [int(r) for r in args.researchers.split(",") if r.strip()]

    for researcher_id in investigadores:
        python = evaluar_modelo_individual(adaptador, researcher_id, ano_cierre=args.year)
        cpp = ejecutar_cli(cli, datos, researcher_id, args.year)
        diferencias = comparar_indicadores(python, cpp, args.tolerance)
        if _reportar("Python vs C++", researcher_id, diferencias):
            fallo = True
        else:
            print(
                f"[OK] investigador {researcher_id}: paridad exacta "
                f"(Ind.Investigador = {cpp['ind_investigador']!r}, "
                f"puesto {cpp['posicion_poblacion']['puesto']}/"
                f"{cpp['posicion_poblacion']['de']})"
            )

    if fallo:
        print("\nPARIDAD ROTA: el CLI C++ difiere del evaluador Python.")
        return 1
    print(
        "\nPARIDAD CONFIRMADA: CLI C++ = backend Python "
        "(misma adaptación individual; NO es un indicador oficial)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
