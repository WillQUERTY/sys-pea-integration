#!/usr/bin/env python3
"""Genera la tabla del catálogo oficial 2024 para el núcleo C++.

Fuente única de verdad: `database/catalog_2024.json`, interpretado por el
MISMO código Python que usa el backend (`backend/app/evaluator/official_indicator.py`).
El ancla de cada subtipo (§3.6, Tabla 6) y la ventana (§2.2.5, Tabla 5) se
calculan aquí con la lógica del backend, de modo que la tabla C++ no puede
divergir del catálogo por una reimplementación de las reglas.

Salida: `core_cpp/include/services/catalog_2024_generated.h`

Uso:
    python -X utf8 scripts/gen_catalogo_cpp.py            # escribe el header
    python -X utf8 scripts/gen_catalogo_cpp.py --check    # solo verifica que esté al día
"""

from __future__ import annotations

import argparse
import pathlib
import sys

REPO_RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_RAIZ))

from backend.app.evaluator.official_indicator import (  # noqa: E402
    RUTA_CATALOGO_PREDETERMINADA,
    cargar_catalogo,
)

RUTA_SALIDA = REPO_RAIZ / "core_cpp" / "include" / "services" / "catalog_2024_generated.h"

CABECERA = """// core_cpp/include/services/catalog_2024_generated.h
// ARCHIVO GENERADO — no editar a mano.
// Fuente: database/catalog_2024.json (ver scripts/gen_catalogo_cpp.py).
// Regenerar:  python -X utf8 scripts/gen_catalogo_cpp.py
//
// Replica exactamente el catálogo que usa el backend Python
// (backend/app/evaluator/official_indicator.py): mismo ancla por subtipo
// (§3.6 / Tabla 6), mismo peso relativo (Anexo 1) y misma ventana de
// observación (§2.2.5 / Tabla 5).

#ifndef PEAI_SERVICES_CATALOG_2024_GENERATED_H
#define PEAI_SERVICES_CATALOG_2024_GENERATED_H

namespace peai::official {

struct CategoriaOficial {
    const char* code;          // código de categoría del catálogo 2024
    const char* familia;       // GNC / DTI / ASC / DPC / FRH
    const char* subtipo;       // código del subtipo (artículo, libro, ...)
    const char* clase;         // TOP / A / B / ASC / DPC / FRH-A / FRH-B
    double      peso_relativo; // Anexo 1
    double      ancla_subtipo; // Tabla 6 (< 0 = el subtipo no tiene ancla)
    int         ventana_subtipo; // Tabla 5 (años de observación)
};

"""


def _float(valor: float) -> str:
    """Formato de punto flotante estable para el header generado."""
    texto = repr(float(valor))
    return texto


def generar() -> str:
    catalogo = cargar_catalogo(RUTA_CATALOGO_PREDETERMINADA)
    lineas = []
    for code in sorted(catalogo):
        cat = catalogo[code]
        ancla = cat.ancla_subtipo if cat.ancla_subtipo is not None else -1.0
        lineas.append(
            '    {{"{code}", "{familia}", "{subtipo}", "{clase}", {peso}, {ancla}, {ventana}}},'.format(
                code=cat.code,
                familia=cat.familia,
                subtipo=cat.subtipo,
                clase=cat.clase,
                peso=_float(cat.peso_relativo),
                ancla=_float(ancla),
                ventana=cat.ventana_subtipo,
            )
        )

    cuerpo = (
        "static const CategoriaOficial CATALOGO_2024[] = {\n"
        + "\n".join(lineas)
        + "\n};\n"
        "\n"
        "static const int CATALOGO_2024_SIZE = "
        + str(len(lineas))
        + ";\n"
        "\n"
        "} // namespace peai::official\n"
        "\n"
        "#endif // PEAI_SERVICES_CATALOG_2024_GENERATED_H\n"
    )
    return CABECERA + cuerpo


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verifica sin escribir")
    args = parser.parse_args()

    contenido = generar()
    if args.check:
        if not RUTA_SALIDA.exists():
            print(f"FALTA: {RUTA_SALIDA} no existe")
            return 1
        actual = RUTA_SALIDA.read_text(encoding="utf-8")
        if actual != contenido:
            print("DESACTUALIZADO: el header C++ no coincide con catalog_2024.json")
            print("  regenera con: python -X utf8 scripts/gen_catalogo_cpp.py")
            return 1
        print("OK: el header C++ está al día con catalog_2024.json")
        return 0

    RUTA_SALIDA.write_text(contenido, encoding="utf-8")
    print(f"Escrito {RUTA_SALIDA} ({len(contenido.splitlines())} líneas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
