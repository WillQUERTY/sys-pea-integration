#!/usr/bin/env python3
# scripts/pea_indicador.py
"""
Programa standalone en Python para el Parcial 2 EdD.
Calcula el diagnóstico de producción científica:
  - Grupo: semáforo de categorización (referencia legacy, NO oficial).
    El indicador oficial 2024 es de grupo (§3.10) y se calcula aparte en
    `scripts/pea_indicador_oficial.py`.
  - Investigador: la ADAPTACIÓN INDIVIDUAL declarada del modelo 2024
    (NO oficial: el modelo 2024 no define producción por persona) más, como
    referencia, la aproximación legacy de conteos crudos.

Uso:
    python scripts/pea_indicador.py [--archivo pea_data.json] [--grupo ID] [--investigador ID]

Si no se pasa --archivo, ejecuta con estructura vacia (sin datos precargados).
Si no se pasa --grupo ni --investigador, imprime ambos indicadores para el primer grupo
y el primer investigador disponibles (si hay datos).
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

# Permitir ejecutar desde raiz del repo o desde scripts/
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

try:
    from backend.app.evaluator import (
        collect_group_metrics,
        collect_researcher_metrics,
        evaluate_group_minciencias,
        evaluate_researcher_minciencias,
    )
    from backend.app import repository
except Exception as exc:  # pragma: no cover - fallback cuando no se pueden importar modulos
    print(f"[Aviso] No se pudieron importar los modulos del backend: {exc}")
    print("      Ejecutando en modo estructura vacia (sin datos).")
    collect_group_metrics = None
    collect_researcher_metrics = None
    evaluate_group_minciencias = None
    evaluate_researcher_minciencias = None
    repository = None


def cargar_datos_json(archivo: Path | None) -> bool:
    """Carga pea_data.json en la memoria C++ si el repositorio lo soporta."""
    if archivo is None or not archivo.exists():
        return False
    if repository is None:
        return False
    try:
        if hasattr(repository, "load_from_file"):
            repository.load_from_file(str(archivo))
            return True
    except Exception:
        pass
    return False


def imprimir_indicador_grupo(grupo_id: int) -> None:
    if evaluate_group_minciencias is None:
        print("[Aviso] No disponible: modulos del evaluador no cargados.")
        return
    try:
        resultado = evaluate_group_minciencias(grupo_id, repository)
    except Exception as exc:
        print(f"[Error] No se pudo evaluar grupo {grupo_id}: {exc}")
        return

    print(f"\n=== Diagnostico de grupo (semáforo legacy, no oficial) — Grupo {grupo_id} ===")
    print(f"Nombre: {resultado.get('group_name', '')}")
    print(f"Clasificacion actual: {resultado.get('current_classification', '')}")
    print(f"Tier alcanzado: {resultado.get('max_qualified_tier', '')}")
    s = resultado.get("summary", {})
    print(f"  Años activos: {s.get('years_active', '-')}")
    print(f"  Integrantes: {s.get('total_members', '-')}")
    print(f"  Productos totales: {s.get('total_products', '-')}")
    print(f"  Productos en ventana: {s.get('products_in_window', '-')}")
    print(f"  TOP: {s.get('top_count', '-')} | Tipo A: {s.get('type_a_count', '-')} | Tipo B: {s.get('type_b_count', '-')}")
    print(f"  FRH-A: {s.get('frh_a_count', '-')} | FRH-B: {s.get('frh_b_count', '-')}")
    print(f"  Indice de cohesion: {s.get('cohesion_index', '-')}")
    print(f"  Cohesion cumplida: {s.get('cohesion_met', '-')}")


def imprimir_indicador_investigador(researcher_id: int) -> None:
    if evaluate_researcher_minciencias is None:
        print("[Aviso] No disponible: modulos del evaluador no cargados.")
        return
    try:
        resultado = evaluate_researcher_minciencias(researcher_id, repository)
    except Exception as exc:
        print(f"[Error] No se pudo evaluar investigador {researcher_id}: {exc}")
        return

    print(f"\n=== Produccion individual — Investigador {researcher_id} ===")
    print(f"Nombre: {resultado.get('researcher_name', '')}")
    print(f"Codigo externo: {resultado.get('external_code', '')}")
    print(f"Nivel formacion: {resultado.get('highest_education_level', '')}")
    s = resultado.get("summary", {})
    print(f"  Productos totales: {s.get('total_products', '-')}")
    print(f"  Productos en ventana: {s.get('products_in_window', '-')}")
    print(f"  TOP: {s.get('top_count', '-')} | Tipo A: {s.get('type_a_count', '-')} | Tipo B: {s.get('type_b_count', '-')}")
    print(f"  ASC: {s.get('asc_count', '-')} | DPC: {s.get('dpc_count', '-')}")
    print(f"  FRH-A: {s.get('frh_a_count', '-')} | FRH-B: {s.get('frh_b_count', '-')}")
    print(f"  Productos coautorizados: {s.get('coauthored_products_count', '-')}")

    # Adaptación individual declarada del modelo 2024 (con la escala del
    # modelo): llega como clave aditiva del endpoint /investigator/indicator.
    try:
        from backend.app.evaluator.official_researcher_population import evaluar_modelo_individual

        adaptacion = evaluar_modelo_individual(repository, researcher_id)
        print(f"  Adaptación individual 2024 (NO oficial) = {adaptacion['ind_investigador']}")
        posicion = adaptacion["posicion_poblacion"]
        print(
            f"    Puesto {posicion['puesto']} de {posicion['de']} "
            f"(percentil {posicion['percentil']}%) — antigüedad "
            f"{adaptacion['investigador']['antiguedad_anos']} años"
        )
    except Exception as exc:
        print(f"  [Aviso] No se pudo calcular la adaptación individual 2024: {exc}")


def listar_primeros() -> tuple[int | None, int | None]:
    """Retorna (primer_grupo_id, primer_investigador_id) si hay datos."""
    gid = rid = None
    if repository is not None:
        try:
            grupos = repository.list_groups()
            if grupos:
                gid = grupos[0].id
        except Exception:
            pass
        try:
            investigadores = repository.list_researchers()
            if investigadores:
                rid = investigadores[0].id
        except Exception:
            pass
    return gid, rid


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Calcula I_Grupo e I_Investigador (Minciencias 2024) — Parcial 2 EdD"
    )
    parser.add_argument("--archivo", type=Path, default=None,
                        help="Ruta a pea_data.json (opcional; si se omite, se ejecuta sin datos)")
    parser.add_argument("--grupo", type=int, default=None,
                        help="ID del grupo para calcular I_Grupo")
    parser.add_argument("--investigador", type=int, default=None,
                        help="ID del investigador para calcular I_Investigador")
    args = parser.parse_args()

    archivo = args.archivo
    if archivo is None:
        candidato = REPO_ROOT / "pea_data.json"
        if candidato.exists():
            archivo = candidato

    if archivo is not None:
        print(f"Cargando datos desde: {archivo}")
        cargar_datos_json(archivo)
    else:
        print("Modo estructura vacia (sin archivo de datos).")

    gid, rid = listar_primeros()

    grupo_id = args.grupo if args.grupo is not None else gid
    researcher_id = args.investigador if args.investigador is not None else rid

    if grupo_id is not None:
        imprimir_indicador_grupo(grupo_id)
    else:
        print("\n[Aviso] No hay grupos disponibles para calcular I_Grupo.")

    if researcher_id is not None:
        imprimir_indicador_investigador(researcher_id)
    else:
        print("\n[Aviso] No hay investigadores disponibles para calcular I_Investigador.")

    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
