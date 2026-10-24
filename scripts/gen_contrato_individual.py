#!/usr/bin/env python3
"""Genera (o verifica) el CONTRATO ÚNICO de la ADAPTACIÓN INDIVIDUAL 2024.

Es el gemelo de `scripts/gen_contrato_oficial.py` para el bloque
`adaptacion_individual_2024` (Fase 5, brecha B3 / decisión D5).

El modelo de medición Minciencias 2024 define un ÚNICO indicador de
producción y es **de grupo** (§3.10): no existe un indicador oficial por
persona. El bloque individual es una **adaptación declarada** del mismo
pipeline, y su forma se declara en UN solo lugar
(`backend/app/evaluator/contrato_individual.py::CONTRATO_INDIVIDUAL`). De
ahí salen tres artefactos derivados:

1. `backend/tests/fixtures/indicador_individual_golden.json`
   → el contrato + el resultado esperado del caso sintético.
2. `frontend/web-react/src/lib/api/contrato-individual-2024.generated.ts`
   → el tipo TypeScript `MincienciasIndividualAdaptation2024`.
3. `frontend/web-react/src/components/charts/__fixtures__/modelo-individual-2024.generated.ts`
   → el fixture del frontend, TIPADO contra ese tipo.

Uso:
    python -X utf8 scripts/gen_contrato_individual.py --regenerar
    python -X utf8 scripts/gen_contrato_individual.py --check

`--check` sale con código 1 si algún artefacto está viejo (drift).
"""

from __future__ import annotations

import argparse
import pathlib
import sys

REPO_RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_RAIZ))

from backend.app.evaluator.contrato_individual import (  # noqa: E402
    ANO_CIERRE,
    CONTRATO_INDIVIDUAL,
    RUTA_FIXTURE_TS,
    RUTA_GOLDEN,
    RUTA_TS,
    calcular_esperados_individual,
    contenido_fixture_ts_individual,
    contenido_golden_individual,
    contenido_tipo_ts_individual,
)

#: Artefactos produced por el generador (nombre -> ruta).
ARTEFACTOS = (
    ("golden", RUTA_GOLDEN),
    ("tipo TS", RUTA_TS),
    ("fixture TS", RUTA_FIXTURE_TS),
)


def contenidos(ano_cierre: int):
    """Devuelve `{artefacto: contenido}` con lo que debe estar en disco."""
    esperados = calcular_esperados_individual(ano_cierre)
    return {
        "golden": contenido_golden_individual(ano_cierre),
        "tipo TS": contenido_tipo_ts_individual(),
        "fixture TS": contenido_fixture_ts_individual(esperados),
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
        print(f"\nCONTRATO INDIVIDUAL REGENERADO ({len(CONTRATO_INDIVIDUAL)} claves raíz).")
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
        print("\nCONTRATO INDIVIDUAL DESACTUALIZADO:")
        for linea in fallos:
            print(f"  - {linea}")
        print(
            "\nRegenera con: "
            "python -X utf8 scripts/gen_contrato_individual.py --regenerar"
        )
        return 1

    print(
        "CONTRATO INDIVIDUAL AL DIA: golden, tipo TS y fixture TS coinciden "
        "con CONTRATO_INDIVIDUAL."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
