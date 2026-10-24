#!/usr/bin/env python3
"""Verifica la PARIDAD del indicador oficial entre el CLI C++ y Python.

El CLI (`pea_cli indicator group <id> --data <repo.json> --json`) calcula el
modelo oficial Minciencias 2024 en C++; el backend lo calcula en Python
(`backend/app/evaluator/official_population.py::evaluar_modelo_oficial`).
Ambos deben dar EXACTAMENTE el mismo número: el CLI ya no difiere del API.

El script carga el MISMO archivo JSON en los dos lados (el `AdaptadorJson` de
`backend/app/evaluator/contrato_oficial.py` reproduce el mapeo del cargador
`core_cpp/src/persistence/json/json_loader.cpp`), así que cualquier diferencia
es algorítmica, no de datos.

Modo `--golden` (Fase 3): en vez de comparar los dos lados entre sí, compara el
CLI contra el CONTRATO ÚNICO versionado
(`backend/tests/fixtures/indicador_oficial_golden.json`), sobre el caso
sintético determinista. Así el C++ queda atado al mismo contrato que el
backend y el frontend, y no solo a la otra implementación.

Uso:
    python -X utf8 scripts/pea_paridad_indicador.py
    python -X utf8 scripts/pea_paridad_indicador.py --groups 10,35 --year 2026
    python -X utf8 scripts/pea_paridad_indicador.py --cli core_cpp/build2/Release/pea_cli.exe
    python -X utf8 scripts/pea_paridad_indicador.py --golden

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

from backend.app.evaluator.contrato_oficial import (  # noqa: E402
    AdaptadorJson,
    RUTA_CASO,
    RUTA_GOLDEN,
    cargar_golden,
    comparar_indicadores,
)
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


def ejecutar_cli(cli: pathlib.Path, datos: pathlib.Path, group_id: int, anio: int) -> dict:
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


def _reportar(etiqueta: str, group_id: int, diferencias: list) -> bool:
    """Imprime el resultado de una comparación. True si hay diferencias."""
    if diferencias:
        print(f"[FALLA] grupo {group_id} ({etiqueta}): {len(diferencias)} diferencias")
        for linea in diferencias[:40]:
            print(f"    - {linea}")
        if len(diferencias) > 40:
            print(f"    ... y {len(diferencias) - 40} más")
        return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="pea_data.json", help="repositorio JSON")
    parser.add_argument("--groups", default="10,35", help="ids de grupo a comparar")
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
        grupos = sorted(int(g) for g in golden["esperado"])
        adaptador = AdaptadorJson(datos)
        print(f"Contrato versionado: {RUTA_GOLDEN.relative_to(REPO_RAIZ)} (cierre {anio})")
        print(f"Caso sintético: {RUTA_CASO.relative_to(REPO_RAIZ)}\n")

        for group_id in grupos:
            esperado = golden["esperado"][str(group_id)]
            cpp = ejecutar_cli(cli, datos, group_id, anio)
            python = evaluar_modelo_oficial(adaptador, group_id, ano_cierre=anio)

            diferencias_cpp = comparar_indicadores(
                cpp, esperado, args.tolerance, etiqueta_a="C++", etiqueta_b="golden"
            )
            diferencias_python = comparar_indicadores(
                python, esperado, args.tolerance, etiqueta_a="Python", etiqueta_b="golden"
            )
            grupo_fallo = _reportar("C++ vs golden", group_id, diferencias_cpp)
            grupo_fallo |= _reportar("Python vs golden", group_id, diferencias_python)
            if grupo_fallo:
                fallo = True
            else:
                print(
                    f"[OK] grupo {group_id}: C++ = Python = golden "
                    f"(Ind.Grupo = {cpp['ind_grupo']!r}, "
                    f"puesto {cpp['posicion_poblacion']['puesto']}/{cpp['posicion_poblacion']['de']})"
                )

        if fallo:
            print("\nCONTRATO ROTO: el CLI C++ difiere del contrato versionado.")
            return 1
        print("\nCONTRATO CONFIRMADO: CLI C++ = backend Python = golden del contrato.")
        return 0

    # -- Modo clásico: el CLI contra el backend sobre un repositorio cualquiera.
    datos = REPO_RAIZ / args.data
    if not datos.exists():
        raise SystemExit(f"No existe el archivo de datos: {datos}")

    adaptador = AdaptadorJson(datos)
    grupos = [int(g) for g in args.groups.split(",") if g.strip()]

    for group_id in grupos:
        python = evaluar_modelo_oficial(adaptador, group_id, ano_cierre=args.year)
        cpp = ejecutar_cli(cli, datos, group_id, args.year)
        diferencias = comparar_indicadores(python, cpp, args.tolerance)
        if _reportar("Python vs C++", group_id, diferencias):
            fallo = True
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
