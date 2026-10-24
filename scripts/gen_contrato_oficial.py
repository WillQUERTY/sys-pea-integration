#!/usr/bin/env python3
"""Genera (o verifica) el CONTRATO ÚNICO del bloque `modelo_oficial_2024`.

El bloque oficial que entrega la API —y que consumen el CLI C++, el backend
Python y el frontend React— tenía su forma declarada TRES veces a mano (C++,
Python, TypeScript). Este script deja la forma en UN solo lugar
(`backend/app/evaluator/contrato_oficial.py::CONTRATO`) y produce tres
artefactos derivados:

1. `backend/tests/fixtures/indicador_oficial_golden.json`
   → el contrato + el resultado esperado del caso sintético.
2. `frontend/web-react/src/lib/api/contrato-oficial-2024.generated.ts`
   → el tipo TypeScript `MincienciasOfficialModel2024`.
3. `frontend/web-react/src/components/charts/__fixtures__/modelo-oficial-2024.generated.ts`
   → el fixture del panel, TIPADO contra ese tipo.

Uso:
    python -X utf8 scripts/gen_contrato_oficial.py --regenerar
    python -X utf8 scripts/gen_contrato_oficial.py --check

`--check` sale con código 1 si algún artefacto está viejo (drift).
"""

from __future__ import annotations

import argparse
import pathlib
import sys
import time

REPO_RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_RAIZ))

from backend.app.evaluator.contrato_oficial import (  # noqa: E402
    ANO_CIERRE,
    RUTA_FIXTURE_TS,
    RUTA_GOLDEN,
    RUTA_TS,
    calcular_esperados,
    contenido_fixture_ts,
    contenido_golden,
    contrato_a_ts,
)

#: Additional files produced by the generator (path -> content function).
ARTEFACTOS = (
    ("golden", RUTA_GOLDEN),
    ("tipo TS", RUTA_TS),
    ("fixture TS", RUTA_FIXTURE_TS),
)


def contenidos(ano_cierre: int):
    """Devuelve `{artefacto: contenido}` con lo que debe estar en disco."""
    from backend.app.evaluator.contrato_oficial import CONTRATO

    esperados = calcular_esperados(ano_cierre)
    return {
        "golden": contenido_golden(ano_cierre),
        "tipo TS": contrato_a_ts(CONTRATO),
        "fixture TS": contenido_fixture_ts(esperados),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    grupo = parser.add_mutually_exclusive_group(required=True)
    grupo.add_argument("--regenerar", action="store_true", help="reescribe los artefactos")
    grupo.add_argument("--check", action="store_true", help="verifica que no haya drift")
    parser.add_argument("--year", type=int, default=ANO_CIERRE, help="año de cierre del caso")
    args = parser.parse_args()

    objetivo = contenidos(args.year)

    if args.regenerar:
        for nombre, ruta in ARTEFACTOS:
            ruta.parent.mkdir(parents=True, exist_ok=True)
            with open(ruta, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(objetivo[nombre])
            print(f"[OK] {nombre}: {ruta.relative_to(REPO_RAIZ)}")
        print("\nCONTRATO REGENERADO.")
        return 0

    # --check
    fallos = []
    for nombre, ruta in ARTEFACTOS:
        if not ruta.exists():
            fallos.append(f"{nombre}: falta {ruta.relative_to(REPO_RAIZ)}")
            continue
        actual = ruta.read_text(encoding="utf-8")
        if actual != objetivo[nombre]:
            fallos.append(f"{nombre}: {ruta.relative_to(REPO_RAIZ)} está desactualizado")
            print(f"--- drift en {nombre} ({ruta.relative_to(REPO_RAIZ)}) ---")
            print("  esperado (primeras líneas):")
            for linea in objetivo[nombre].splitlines()[:12]:
                print(f"    + {linea}")
            print("  en disco (primeras líneas):")
            for linea in actual.splitlines()[:12]:
                print(f"    - {linea}")

    if fallos:
        print("\nCONTRATO DESACTUALIZADO:")
        for linea in fallos:
            print(f"  - {linea}")
        print("\nRegenera con: python -X utf8 scripts/gen_contrato_oficial.py --regenerar")
        return 1

    print("CONTRATO AL DIA: golden, tipo TS y fixture TS coinciden con CONTRATO.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
