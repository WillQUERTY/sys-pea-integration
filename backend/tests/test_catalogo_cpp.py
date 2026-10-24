"""La tabla del catálogo 2024 en C++ no puede divergir del catálogo de Python.

El núcleo C++ no tiene parser JSON, así que el catálogo (ancla §3.6 / Tabla 6,
peso relativo del Anexo 1 y ventana §2.2.5 / Tabla 5) se GENERA desde
`database/catalog_2024.json` con el MISMO código Python que usa el backend
(`scripts/gen_catalogo_cpp.py` → `core_cpp/include/services/catalog_2024_generated.h`).

Este test falla si alguien edita el catálogo JSON, cambia las reglas del
backend o modifica el header generado a mano: hay que regenerarlo.
"""

import pathlib
import subprocess
import sys

REPO_RAIZ = pathlib.Path(__file__).resolve().parents[2]
GENERADOR = REPO_RAIZ / "scripts" / "gen_catalogo_cpp.py"
HEADER = REPO_RAIZ / "core_cpp" / "include" / "services" / "catalog_2024_generated.h"


def test_header_generado_existe():
    assert HEADER.exists(), (
        "Falta el catálogo generado para C++. Genera con:\n"
        "    python -X utf8 scripts/gen_catalogo_cpp.py"
    )


def test_catalogo_cpp_no_esta_desactualizado():
    """`--check` regenera en memoria y compara: si difiere, el header está viejo."""
    proceso = subprocess.run(
        [sys.executable, "-X", "utf8", str(GENERADOR), "--check"],
        cwd=str(REPO_RAIZ),
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    salida = (proceso.stdout or "") + (proceso.stderr or "")
    assert proceso.returncode == 0, (
        "El catálogo C++ está DESACTUALIZADO respecto de database/catalog_2024.json.\n"
        f"{salida}\n"
        "Regenera con:\n"
        "    python -X utf8 scripts/gen_catalogo_cpp.py"
    )


def test_anclas_de_los_ejemplos_del_modelo():
    """§3.6: los tres ejemplos del documento oficial deben estar en la tabla."""
    texto = HEADER.read_text(encoding="utf-8")
    # ART_A2 = 100 x 5,5 = 550 ; CAP_LIB_B = 60 x 8 = 480 ; PA1 = 500 x 10 = 5000
    assert '{"ART_A2", "GNC", "ART", "TOP", 5.5, 100.0, 7}' in texto
    assert '{"CAP_LIB_B", "GNC", "CAP_LIB", "A", 8.0, 60.0, 5}' in texto
    assert '{"PA1", "GNC", "PAT_INV", "TOP", 10.0, 500.0, 10}' in texto
