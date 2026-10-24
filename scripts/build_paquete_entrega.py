#!/usr/bin/env python3
"""Arma el paquete de entrega del Parcial 2 (5 adjuntos + ZIP) y lo verifica.

El paquete lo envía el equipo por correo, así que el riesgo real es twofold:
enviar un ZIP desactualizado (construido antes de llenar los datos de los
integrantes) o enviar un adjunto que no coincide con la fuente del repo.
Este script cierra ambos: arma el paquete desde el árbol de trabajo, verifica
byte a byte contra cada fuente y avisa si `INTEGRANTES.txt` todavía tiene
campos sin llenar.

Uso:
    python -X utf8 scripts/build_paquete_entrega.py
    python -X utf8 scripts/build_paquete_entrega.py --refrescar-copias
    python -X utf8 scripts/build_paquete_entrega.py --permitir-placeholders

Salidas:
    dist/entrega_parcial2/   -> los 5 adjuntos, listos para adjuntar
    Parcial2_WP-DN-EO.zip    -> el mismo contenido en un solo archivo (raíz)

Códigos de salida:
    0  paquete armado y verificado (con o sin placeholders, si se pasan las flags)
    1  quedan campos de identificación sin llenar
    2  falta un archivo fuente del paquete
"""

from __future__ import annotations

import argparse
import hashlib
import pathlib
import re
import shutil
import sys
import zipfile

REPO_RAIZ = pathlib.Path(__file__).resolve().parents[1]
DIST_DIR = REPO_RAIZ / "dist" / "entrega_parcial2"
ZIP_PATH = REPO_RAIZ / "Parcial2_WP-DN-EO.zip"

#: Los 5 adjuntos del correo: nombre en el paquete -> fuente en el repo.
#: Los dos fuentes llevan las iniciales del grupo (NOTA 8 del enunciado).
ADJUNTOS: tuple[tuple[str, pathlib.Path], ...] = (
    ("Taller2_WP-DN-EO.py", REPO_RAIZ / "Taller2_WP-DN-EO.py"),
    ("Taller2_WP-DN-EO.cpp", REPO_RAIZ / "Taller2_WP-DN-EO.cpp"),
    ("Parcial2_WP-DN-EO.docx", REPO_RAIZ / "docs" / "word" / "Parcial2_WP-DN-EO.docx"),
    ("INTEGRANTES.txt", REPO_RAIZ / "INTEGRANTES.txt"),
    ("pea_data.json", REPO_RAIZ / "pea_data.json"),
)

#: Copias de trabajo en la raíz (NO versionadas). Se regeneran desde la
#: fuente con iniciales; nunca se editan a mano.
COPIAS_TRABAJO: tuple[tuple[pathlib.Path, pathlib.Path], ...] = (
    (REPO_RAIZ / "Taller2.py", REPO_RAIZ / "Taller2_WP-DN-EO.py"),
    (REPO_RAIZ / "Taller2.cpp", REPO_RAIZ / "Taller2_WP-DN-EO.cpp"),
)

#: Campos de identificación que el equipo debe completar (NOTA 4).
RE_CAMPO_VACIO = re.compile(r"^\s*-\s*(c[oó]digo estudiantil|correo institucional)\s*:\s*(.*)$", re.IGNORECASE)
RE_MARCADOR = re.compile(r"[_]{3,}|\[.*?\]")


def sha256(datos: bytes) -> str:
    return hashlib.sha256(datos).hexdigest()


def campos_sin_llenar(texto: str) -> list[str]:
    """Devuelve los campos de identificación que siguen vacíos o marcados."""
    pendientes: list[str] = []
    for linea in texto.splitlines():
        m = RE_CAMPO_VACIO.match(linea)
        if not m:
            continue
        campo, valor = m.group(1), m.group(2).strip()
        if not valor or RE_MARCADOR.search(valor):
            pendientes.append(campo)
    return pendientes


def verificar_fuentes() -> list[str]:
    """Valida que las fuentes existan y no estén vacías."""
    problemas: list[str] = []
    for nombre, ruta in ADJUNTOS:
        if not ruta.exists():
            problemas.append(f"falta la fuente: {ruta.relative_to(REPO_RAIZ)}")
        elif ruta.stat().st_size == 0:
            problemas.append(f"fuente vacía: {ruta.relative_to(REPO_RAIZ)}")
    return problemas


def copiar_al_dist() -> list[tuple[str, pathlib.Path]]:
    """Copia los adjuntos a `dist/entrega_parcial2/`."""
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(parents=True)
    origenes: list[tuple[str, pathlib.Path]] = []
    for nombre, ruta in ADJUNTOS:
        destino = DIST_DIR / nombre
        shutil.copy2(ruta, destino)
        origenes.append((nombre, destino))
    return origenes


def armar_zip(origenes: list[tuple[str, pathlib.Path]]) -> list[str]:
    """Genera el ZIP en la raíz con los mismos 5 archivos. Devuelve errores."""
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for nombre, ruta in origenes:
            zf.write(ruta, arcname=nombre)
    with zipfile.ZipFile(ZIP_PATH) as zf:
        corruptos = zf.testzip()
        if corruptos:
            return [f"entrada corrupta en el ZIP: {corruptos}"]
        nombres = sorted(zf.namelist())
    esperadas = sorted(nombre for nombre, _ in ADJUNTOS)
    if nombres != esperadas:
        return [f"el ZIP no tiene las entradas esperadas: {nombres} != {esperadas}"]
    return []


def verificar_zip(origenes: list[tuple[str, pathlib.Path]]) -> list[str]:
    """Compara byte a byte cada entrada del ZIP contra su copia en dist/."""
    problemas: list[str] = []
    with zipfile.ZipFile(ZIP_PATH) as zf:
        for nombre, ruta in origenes:
            if sha256(zf.read(nombre)) != sha256(ruta.read_bytes()):
                problemas.append(f"el ZIP no coincide con la fuente: {nombre}")
    return problemas


def refrescar_copias() -> list[str]:
    """Regenera las copias de trabajo de la raíz desde las fuentes."""
    notas: list[str] = []
    for destino, fuente in COPIAS_TRABAJO:
        if not fuente.exists():
            continue
        if destino.exists() and destino.read_bytes() == fuente.read_bytes():
            continue
        shutil.copy2(fuente, destino)
        notas.append(f"copia regenerada: {destino.relative_to(REPO_RAIZ)}")
    return notas


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--permitir-placeholders",
        action="store_true",
        help="no falla si INTEGRANTES.txt conserva campos sin llenar",
    )
    parser.add_argument(
        "--refrescar-copias",
        action="store_true",
        help="regenera Taller2.py / Taller2.cpp desde las fuentes con iniciales",
    )
    args = parser.parse_args()

    problemas = verificar_fuentes()
    if problemas:
        print("PAQUETE INCOMPLETO:")
        for p in problemas:
            print(f"  - {p}")
        return 2

    origenes = copiar_al_dist()
    errores = armar_zip(origenes)
    errores += verificar_zip(origenes)

    print(f"Adjuntos listos en {DIST_DIR.relative_to(REPO_RAIZ)}/{len(origenes)}:")
    for nombre, ruta in origenes:
        print(f"  - {nombre:26s} {ruta.stat().st_size:>9,d} B")
    print(f"ZIP: {ZIP_PATH.relative_to(REPO_RAIZ)} ({ZIP_PATH.stat().st_size:,d} B)")

    if args.refrescar_copias:
        for nota in refrescar_copias():
            print(nota)

    if errores:
        print("VERIFICACION FALLIDA:")
        for e in errores:
            print(f"  - {e}")
        return 2

    pendientes = campos_sin_llenar((DIST_DIR / "INTEGRANTES.txt").read_text(encoding="utf-8"))
    if pendientes:
        print()
        print("CAMPOS SIN LLENAR en INTEGRANTES.txt (no son datos del repositorio):")
        for campo in pendientes:
            print(f"  - {campo}")
        print("  Completarlos y volver a correr este script antes de enviar el correo.")
        if args.permitir_placeholders:
            print("  (continuacion permitida por --permitir-placeholders)")
        else:
            return 1

    print()
    print("PAQUETE VERIFICADO: los 5 adjuntos coinciden byte a byte con sus fuentes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
