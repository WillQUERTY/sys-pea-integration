#!/usr/bin/env python3
"""Reporta el indicador oficial de grupo Minciencias 2024 (§2.2.9 → §3.10)
para los grupos reales de pea_data.json, con el desglose completo de las
tres etapas: λ×PesoGlobal por clase (§3.8.1), Cohe/Coop (§2.2.10),
normalización contra la población (§3.9) y fórmula final (§3.10).

Uso (desde la raíz del repo):
    python -X utf8 scripts/pea_indicador_oficial.py [--cierre 2026] [--edad N]

La clasificación de cada producto la hace inferir_categoria() sobre la
descripción GrupLAC, con reglas conservadoras: lo que la fuente no evidencia
(qualidad Publindex, cuartil, categoría A de una dirección...) queda excluido
con motivo explícito en el histograma, no se inventa una categoría.
"""

import argparse
import json
import pathlib
import sys
from collections import defaultdict

REPO_RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_RAIZ))

from backend.app.evaluator.official_indicator import (  # noqa: E402
    CLASES,
    COEFICIENTES,
    TERMINO_POR_CLASE,
    GrupoOficial,
    ProductoOficial,
    cargar_catalogo,
    evaluar_poblacion,
    inferir_categoria,
)
from backend.app.evaluator.official_population import (  # noqa: E402
    edad_grupo,
    extraer_anio,
    familia_relacional,
    grupos_relacionados,
)


def _construir_grupos(datos, cierre, edad_manual):
    """Grupos Oficiales a partir de pea_data.json.

    Cohe/Coop (§2.2.10): por producto se cuentan los firmantes vinculados al
    grupo (researcherId > 0 con membresía en el JSON) y los grupos distintos
    donde están vinculados los coautores del producto (el propio incluido).

    Los helpers (año, edad, familia relacional, grupos relacionados) son los
    mismos que usa el adaptador de la API (`evaluator/official_population.py`):
    el reporte y el endpoint calculan exactamente lo mismo.
    """
    memberships = defaultdict(set)
    for m in datos.get("memberships", []):
        rid = m.get("researcherId") or 0
        if rid > 0:
            memberships[rid].add(m.get("groupId"))

    autores_por_producto = defaultdict(list)
    for a in datos.get("authors", []):
        rid = a.get("researcherId") or 0
        if rid > 0:
            autores_por_producto[a.get("productId")].append(rid)

    productos_por_id = {p["id"]: p for p in datos.get("products", [])}

    grupos = []
    for g in datos.get("groups", []):
        gid = g["id"]
        ids_producto = list(
            dict.fromkeys(
                enlace["productId"]
                for enlace in datos.get("groupProductLinks", [])
                if enlace.get("groupId") == gid
            )
        )
        lista = []
        for pid in ids_producto:
            producto = productos_por_id.get(pid)
            if producto is None:
                continue
            descripcion = producto.get("description") or ""
            categoria, motivo = inferir_categoria(descripcion)
            firmantes = autores_por_producto.get(pid, [])
            integrantes = [rid for rid in firmantes if gid in memberships.get(rid, ())]
            lista.append(
                ProductoOficial(
                    identificacion=str(pid),
                    categoria=categoria,
                    motivo=motivo,
                    ano=extraer_anio(producto),
                    autores_del_grupo=len(integrantes),
                    grupos_relacionados=grupos_relacionados(gid, firmantes, memberships),
                    familia_medicion=(
                        familia_relacional(producto, descripcion) if categoria is None else None
                    ),
                )
            )

        # GrupLAC no trae fecha de fundación del grupo: la edad se aproxima al
        # primer año de producción registrada (o --edad N para forzarla).
        anios = [p.ano for p in lista if p.ano]
        edad = edad_grupo(cierre, anios, edad_manual)
        grupos.append(GrupoOficial(f"{g['acronym'] or g['name']} (#{gid})", edad, lista))
    return grupos


def _imprimir_grupo(resultado, posicion, total):
    nombre = resultado["grupo"]
    print()
    print("=" * 78)
    print(f"GRUPO {posicion} de {total}: {nombre}")
    print("=" * 78)
    print(
        f"edad del grupo: {resultado['edad_grupo']} años al cierre {resultado['ano_cierre']}"
        f"  |  productos enlazados: "
        f"{sum(d['n'] for d in resultado['subtipos'].values()) + sum(resultado['excluidos'].values()) + sum(resultado['sin_ano'].values()) + sum(resultado['fuera_de_periodo'].values())}"
    )

    print()
    print("ETAPA 1 — λ (§2.2.9) × PesoGlobal (§3.6) por subtipo en período:")
    print(f"{'subtipo':<12} {'clase':<6} {'n':>4} {'período':>8} {'λ':>9} {'peso':>8} {'λ×peso':>12}")
    for code, d in resultado["subtipos"].items():
        print(
            f"{code:<12} {d['clase']:<6} {d['n']:>4} {d['periodo']:>8} "
            f"{d['lambda']:>9.4f} {d['peso_global']:>8.1f} {d['termino']:>12.4f}"
        )

    print()
    print("ETAPA 2 — Ind_Clase (§3.8.1) e índices normalizados (§3.9):")
    print(f"{'clase':<6} {'término §3.10':<10} {'Ind_Clase':>12} {'máx. población':>15} {'índice':>9}")
    for clase in CLASES:
        termino = TERMINO_POR_CLASE[clase]
        ind = resultado["ind_clase"][clase]
        maximo = resultado["maximos_poblacion"][clase]
        indice = resultado["indices"][termino]
        marca = " ← máximo poblacional" if abs(ind - maximo) < 1e-12 and maximo > 0 else ""
        print(f"{clase:<6} {termino:<10} {ind:>12.4f} {maximo:>15.4f} {indice:>9.6f}{marca}")

    cohe, coop = resultado["cohe"], resultado["coop"]
    print()
    print("Cohe (§2.2.10.1): Σ autores del grupo por producto GNC+DTI / productos − 1")
    print(
        f"  {cohe['suma_autores']} autores / {cohe['productos']} productos − 1 = {cohe['valor']:.6f}"
        f"  → índice {resultado['indices']['Cohe']:.6f}"
        f" (máx. población {resultado['maximo_cohe_poblacion']:.6f})"
    )
    print("Coop (§2.2.10.2): Σ grupos relacionados por producto GNC+DTI / productos − 1")
    print(
        f"  {coop['suma_grupos']} grupos / {coop['productos']} productos − 1 = {coop['valor']:.6f}"
        f"  → índice {resultado['indices']['Coop']:.6f}"
        f" (máx. población {resultado['maximo_coop_poblacion']:.6f})"
    )

    print()
    print("ETAPA 3 — fórmula final (§3.10): Σ coeficiente × índice")
    for termino, valor in resultado["terminos_ponderados"].items():
        coef = COEFICIENTES[termino]
        indice = resultado["indices"][termino]
        print(f"  {termino:<8} = {coef:>4} × {indice:.6f} = {valor:8.4f}")
    print("-" * 78)
    print(f"  Ind.Grupo ({nombre}) = {resultado['ind_grupo']:.6f}")

    print()
    print("Productos excluidos y por qué (no se inventan categorías):")
    if resultado["excluidos"]:
        for motivo, n in sorted(resultado["excluidos"].items(), key=lambda x: -x[1]):
            print(f"  {n:>5} × {motivo}")
    else:
        print("  (ninguno)")
    extra = []
    if resultado["sin_ano"]:
        n = sum(resultado["sin_ano"].values())
        extra.append(f"{n} sin año identificable ({resultado['sin_ano']})")
    if resultado["fuera_de_periodo"]:
        n = sum(resultado["fuera_de_periodo"].values())
        extra.append(f"{n} fuera del período de observación ({resultado['fuera_de_periodo']})")
    for texto in extra:
        print(f"  {texto}")


def _imprimir_resumen(resultados):
    print()
    print("=" * 78)
    print("RESUMEN — Ind.Grupo de la población (mayor = mejor, rango teórico 0–10")
    print("(suma de coeficientes si todos los índices fueran 1.0)")
    print("=" * 78)
    for r in sorted(resultados, key=lambda x: -x["ind_grupo"]):
        print(f"  {r['ind_grupo']:>9.6f}  {r['grupo']}")


def _imprimir_supuestos(cierre, edad_manual):
    print()
    print("=" * 78)
    print("SUPUESTOS DOCUMENTADOS (los que NO se inventan del lado del cálculo):")
    print("=" * 78)
    print(
        "  1. Edad del grupo: GrupLAC no publica fecha de fundación en el dataset;"
        " se aproxima al primer año plausible de producción registrada"
        + (" (forzada con --edad)." if edad_manual else ".")
    )
    print("  2. Calidad de las direcciones de trabajo (TP/TM): se asume B — GrupLAC")
    print("     no evidencia la 'categoría A' de la dirección.")
    print("  3. Artículos en 'revista especializada' QUEDAN EXCLUIDOS de los indicadores")
    print("     de producción: la calidad A1–D depende de Publindex/Scimago, que la")
    print("     fuente no trae. Pero como §2.2.10 es RELACIONAL (autores/grupos), sí")
    print("     cuentan para Cohe/Coop: ventana GNC 7 / DTI 5 al desconocer categoría.")
    print(f"  4. Normalización §3.9: contra la población cargada ({cierre}); el modelo")
    print("     oficial exigiría TODOS los grupos del área OCDE.")
    print("  5. Coop solo cuenta firmantes con researcherId>0 y membresía en el JSON;")
    print("     autores externos sin vinculación no aportan grupos relacionados.")
    print("  6. Ventana de notas científicas: el OCR de la Tabla 5 no la preserva (5).")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cierre", type=int, default=2026, help="año de cierre de la ventana")
    parser.add_argument("--edad", type=int, default=None, help="edad del grupo en años (ambos grupos)")
    parser.add_argument("--json", type=pathlib.Path, default=REPO_RAIZ / "pea_data.json")
    args = parser.parse_args()

    # La consola de Windows queda en cp1252: forzar UTF-8 para no romper acentos.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

    with open(args.json, encoding="utf-8") as f:
        datos = json.load(f)
    catalogo = cargar_catalogo()
    grupos = _construir_grupos(datos, args.cierre, args.edad)
    resultados = evaluar_poblacion(grupos, args.cierre, catalogo)

    print("INDICADOR OFICIAL DE GRUPO MINCIENCIAS 2024 — modelo de medición §2.2.9→§3.10")
    print(f"población: {len(grupos)} grupos | cierre de ventana: {args.cierre}")
    for posicion, resultado in enumerate(resultados, 1):
        _imprimir_grupo(resultado, posicion, len(resultados))
    _imprimir_resumen(resultados)
    _imprimir_supuestos(args.cierre, args.edad)


if __name__ == "__main__":
    main()
