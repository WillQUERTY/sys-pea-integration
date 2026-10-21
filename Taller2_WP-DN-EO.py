# =============================================================================
# Taller2_WP-DN-EO.py — Respuestas a los ejercicios del Parcial 2 EdD
# Estructura de Datos — Grupo WP-DN-EO — Universidad Popular del Cesar
#
# Ejercicio 1: Indicador de produccion científica del GRUPO (I_Grupo)
# Ejercicio 2: Indicador de produccion científica del INVESTIGADOR (I_Investigador)
#
# Formula Minciencias 2024 (seccion 10.6):
#   I_Grupo ≡ 3,7·Nc.Top + 2,3·Nc.A + 0,4·Nc.B + 1,5·AP + 0,5·DPC
#             + 1,0·Fr.A + 0,2·Fr.B + 0,1·Cohe + 0,3·Coop
#
# Variables de entrada:
#   - productos : lista de productos del grupo o del investigador
#   - investigadores_id : ID del investigador (solo ejercicio 2)
#   - grupo_id : ID del grupo (solo ejercicio 1)
#   - año_actual : año para calcular antigüedad de productos
#
# Variables de salida:
#   - I_Grupo / I_Investigador : valor numérico del indicador
#   - Desglose por clase de producto (TOP, Tipo A, Tipo B, ASC, DPC, FRH-A, FRH-B)
#   - Índice de cohesión (IC) y cooperación (Coop)
# =============================================================================

from __future__ import annotations

from datetime import datetime
import re


# -----------------------------------------------------------------------------
# Estructuras de datos (diccionarios simplificados, equivalentes a las entidades
# del core C++ del proyecto)
# -----------------------------------------------------------------------------

Producto = dict  # claves: id, titulo, descripcion, family_id, quality_category_id,
                  # year, obtained_date, publication_date, status
Investigador = dict  # claves: id, first_names, last_names, external_code,
                      # highest_education_level
ProductoAutor = dict  # claves: productId, researcherId


# -----------------------------------------------------------------------------
# Funciones auxiliares
# -----------------------------------------------------------------------------

def extraer_ano(fecha: str | None, ano_defecto: int) -> int:
    """Extrae un año de 4 dígitos de una cadena de fecha."""
    if not fecha:
        return ano_defecto
    m = re.search(r"\b(19\d\d|20\d\d)\b", str(fecha))
    return int(m.group(0)) if m else ano_defecto


def ano_producto(p: Producto, ano_actual: int) -> int:
    if p.get("year"):
        return p["year"]
    a = extraer_ano(p.get("obtained_date"), ano_actual)
    if a == ano_actual:
        a = extraer_ano(p.get("publication_date"), ano_actual)
    return a


def ventana_aplicable(desc_lower: str) -> int:
    """Determina la ventana temporal (10, 7 u 5 años) según tipología oficial."""
    if any(w in desc_lower for w in [
        "patente", "variedad vegetal", "raza animal",
        "investigacion-creacion", "creacion",
    ]):
        return 10
    if (("publicado en revista" in desc_lower or "libro resultado" in desc_lower)
            and "calidad d" not in desc_lower and "categoria d" not in desc_lower):
        return 7
    return 5


def familia_producto(p: Producto, desc_lower: str) -> str:
    fid = p.get("family_id", 0) or 0
    if fid in (1, 6) or "publicado en revista" in desc_lower \
            or "libro" in desc_lower or "capitulo" in desc_lower:
        return "GNC"
    if fid in (2, 7) or "software" in desc_lower or "patente" in desc_lower \
            or "prototipo" in desc_lower or "innovacion" in desc_lower:
        return "DTI"
    if fid == 3 or "apropiacion" in desc_lower:
        return "ASC"
    if fid in (4, 9) or "divulgacion" in desc_lower or "congreso" in desc_lower:
        return "DPC"
    if fid in (5, 10) or "tesis" in desc_lower or "trabajo de grado" in desc_lower:
        return "FRH"
    return "OTRA"


def clasificar_calidad_formacion(desc_lower: str, fam: str):
    """Retorna (is_top, is_a, is_b, is_frh_a, is_frh_b)."""
    is_top = any(q in desc_lower for q in [
        "a1", "q1", "q2", "a2",
    ]) or "patente de invencion" in desc_lower \
        or "libro resultado de investigacion" in desc_lower

    is_a = any(q in desc_lower for q in [
        "calidad b", "categoria b", "calidad c", "categoria c",
        "q3", "q4",
    ]) or "revista especializada" in desc_lower \
        or "software" in desc_lower or "prototipo" in desc_lower \
        or "innovacion" in desc_lower

    is_b = not is_top and not is_a

    is_frh_a = is_frh_b = False
    if fam == "FRH":
        if "tesis de doctorado" in desc_lower or "doctoral" in desc_lower:
            is_frh_a = True
        else:
            is_frh_b = True

    return is_top, is_a, is_b, is_frh_a, is_frh_b


# -----------------------------------------------------------------------------
# EJERCICIO 1: I_Grupo — Indicador de produccion científica del grupo
# -----------------------------------------------------------------------------

def calcular_i_grupo(
    productos: list[Producto],
    autores_productos: list[ProductoAutor],
    ano_actual: int,
) -> dict:
    """Calcula I_Grupo y devuelve un diccionario con todas las variables de
    entrada y salida identificadas."""
    resultado = {
        # Variables de entrada
        "productos_totales": len(productos),
        "ano_actual": ano_actual,
        # Variables de salida
        "productos_en_ventana": 0,
        "gnc_count": 0, "dti_count": 0, "asc_count": 0, "dpc_count": 0, "frh_count": 0,
        "top_count": 0, "type_a_count": 0, "type_b_count": 0,
        "frh_a_count": 0, "frh_b_count": 0,
        "coauthored_products_count": 0,
        "cohesion_index": 0.0,
        "i_grupo": 0.0,
    }

    for p in productos:
        if p.get("status") != "active":
            continue

        desc = f"{p.get('descripcion', '')} {p.get('titulo', '')}"
        desc_l = desc.lower()

        py = ano_producto(p, ano_actual)
        edad = ano_actual - py
        if edad < 0:
            edad = 0

        fam = familia_producto(p, desc_l)
        ventana = ventana_aplicable(desc_l)
        if edad > ventana:
            continue

        resultado["productos_en_ventana"] += 1

        if fam == "GNC":
            resultado["gnc_count"] += 1
        elif fam == "DTI":
            resultado["dti_count"] += 1
        elif fam == "ASC":
            resultado["asc_count"] += 1
        elif fam == "DPC":
            resultado["dpc_count"] += 1
        elif fam == "FRH":
            resultado["frh_count"] += 1

        is_top, is_a, is_b, is_frh_a, is_frh_b = clasificar_calidad_formacion(desc_l, fam)
        if is_top:
            resultado["top_count"] += 1
        elif is_a:
            resultado["type_a_count"] += 1
        elif is_b:
            resultado["type_b_count"] += 1

        if is_frh_a:
            resultado["frh_a_count"] += 1
        elif is_frh_b:
            resultado["frh_b_count"] += 1

        # Cooperación: el producto tiene al menos otro autor
        for pa in autores_productos:
            if pa["productId"] == p["id"]:
                resultado["coauthored_products_count"] += 1
                break

    # Fórmula I_Grupo (Minciencias 2024, sección 10.6)
    ap = resultado["asc_count"] + resultado["dpc_count"]
    resultado["i_grupo"] = round(
        3.7 * resultado["top_count"]
        + 2.3 * resultado["type_a_count"]
        + 0.4 * resultado["type_b_count"]
        + 1.5 * ap
        + 0.5 * resultado["dpc_count"]
        + 1.0 * resultado["frh_a_count"]
        + 0.2 * resultado["frh_b_count"]
        + 0.1 * resultado["cohesion_index"]
        + 0.3 * resultado["coauthored_products_count"],
        3,
    )
    return resultado


# -----------------------------------------------------------------------------
# EJERCICIO 2: I_Investigador — Indicador de produccion científica del investigador
# -----------------------------------------------------------------------------

def calcular_i_investigador(
    investigador: Investigador,
    productos_del_investigador: list[Producto],
    todos_los_autores: list[ProductoAutor],
    ano_actual: int,
) -> dict:
    """Calcula I_Investigador y devuelve un diccionario con todas las variables
    de entrada y salida identificadas."""
    resultado = {
        # Variables de entrada
        "investigador_id": investigador["id"],
        "investigador_nombre": f"{investigador.get('first_names', '')} "
                               f"{investigador.get('last_names', '')}".strip(),
        "ano_actual": ano_actual,
        # Variables de salida
        "total_products": len(productos_del_investigador),
        "productos_en_ventana": 0,
        "gnc_count": 0, "dti_count": 0, "asc_count": 0, "dpc_count": 0, "frh_count": 0,
        "top_count": 0, "type_a_count": 0, "type_b_count": 0,
        "frh_a_count": 0, "frh_b_count": 0,
        "coauthored_products_count": 0,
        "i_investigador": 0.0,
    }

    for p in productos_del_investigador:
        if p.get("status") != "active":
            continue

        desc = f"{p.get('descripcion', '')} {p.get('titulo', '')}"
        desc_l = desc.lower()

        py = ano_producto(p, ano_actual)
        edad = ano_actual - py
        if edad < 0:
            edad = 0

        fam = familia_producto(p, desc_l)
        ventana = ventana_aplicable(desc_l)
        if edad > ventana:
            continue

        resultado["productos_en_ventana"] += 1

        if fam == "ASC":
            resultado["asc_count"] += 1
        elif fam == "DPC":
            resultado["dpc_count"] += 1
        elif fam == "FRH":
            resultado["frh_count"] += 1

        is_top, is_a, is_b, is_frh_a, is_frh_b = clasificar_calidad_formacion(desc_l, fam)
        if is_top:
            resultado["top_count"] += 1
        elif is_a:
            resultado["type_a_count"] += 1
        elif is_b:
            resultado["type_b_count"] += 1

        if is_frh_a:
            resultado["frh_a_count"] += 1
        elif is_frh_b:
            resultado["frh_b_count"] += 1

        # Cooperación: el producto tiene al menos otro autor distinto
        for pa in todos_los_autores:
            if pa["productId"] == p["id"] and pa["researcherId"] != investigador["id"]:
                resultado["coauthored_products_count"] += 1
                break

    # Fórmula I_Investigador (misma que I_Grupo, nivel individual)
    ap = resultado["asc_count"] + resultado["dpc_count"]
    cohe = 0.0  # Cohesión interna no aplica a investigador individual
    resultado["i_investigador"] = round(
        3.7 * resultado["top_count"]
        + 2.3 * resultado["type_a_count"]
        + 0.4 * resultado["type_b_count"]
        + 1.5 * ap
        + 0.5 * resultado["dpc_count"]
        + 1.0 * resultado["frh_a_count"]
        + 0.2 * resultado["frh_b_count"]
        + 0.1 * cohe
        + 0.3 * resultado["coauthored_products_count"],
        3,
    )
    return resultado


# -----------------------------------------------------------------------------
# main — Demostración con datos de ejemplo
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    ANO_ACTUAL = 2026

    # ----- Datos de ejemplo — Ejercicio 1: Grupo -----
    productos_grupo = [
        {"id": 1, "titulo": "Artículo Q1 en revista indexada",
         "descripcion": "Artículo publicado en revista A1",
         "family_id": 1, "quality_category_id": 1,
         "year": 2024, "obtained_date": "2024-03-15", "publication_date": "",
         "status": "active"},
        {"id": 2, "titulo": "Software de análisis de datos",
         "descripcion": "Software computacional para análisis",
         "family_id": 2, "quality_category_id": 2,
         "year": 2023, "obtained_date": "", "publication_date": "2023-11-10",
         "status": "active"},
        {"id": 3, "titulo": "Tesis de doctorado en educación",
         "descripcion": "Tesis doctoral dirigida",
         "family_id": 5, "quality_category_id": 1,
         "year": 2025, "obtained_date": "", "publication_date": "2025-06-20",
         "status": "active"},
        {"id": 4, "titulo": "Artículo de divulgación",
         "descripcion": "Artículo de divulgación pública de la ciencia",
         "family_id": 4, "quality_category_id": 3,
         "year": 2022, "obtained_date": "", "publication_date": "2022-09-01",
         "status": "active"},
        {"id": 5, "titulo": "Libro de texto",
         "descripcion": "Libro resultado de investigación",
         "family_id": 1, "quality_category_id": 2,
         "year": 2021, "obtained_date": "", "publication_date": "2021-01-10",
         "status": "active"},
    ]

    autores_grupo = [
        {"productId": 1, "researcherId": 101},
        {"productId": 1, "researcherId": 102},  # coautorizado
        {"productId": 2, "researcherId": 101},
        {"productId": 3, "researcherId": 101},
        {"productId": 4, "researcherId": 103},
        {"productId": 5, "researcherId": 101},
        {"productId": 5, "researcherId": 102},  # coautorizado
    ]

    # ----- Datos de ejemplo — Ejercicio 2: Investigador -----
    inv_ejemplo = {
        "id": 101,
        "first_names": "Juan",
        "last_names": "Pérez",
        "external_code": "EXT-101",
        "highest_education_level": "Doctorado",
    }

    productos_inv_101 = [
        productos_grupo[0],  # artículo Q1
        productos_grupo[1],  # software
        productos_grupo[2],  # tesis doctorado
        productos_grupo[4],  # libro
    ]

    # =========================================================================
    # EJERCICIO 1: Calcular I_Grupo
    # =========================================================================
    print("=" * 42)
    print("  EJERCICIO 1 — I_Grupo (Grupo)")
    print("=" * 42)

    rg = calcular_i_grupo(productos_grupo, autores_grupo, ANO_ACTUAL)

    print(f"{'Variable de entrada: productos del grupo':<40} = {rg['productos_totales']} productos totales")
    print(f"{'Variable de entrada: año actual':<40} = {rg['ano_actual']}")
    print(f"{'Variable de salida: productos en ventana':<40} = {rg['productos_en_ventana']}")
    print(f"{'Variable de salida: Nc.Top':<40} = {rg['top_count']}")
    print(f"{'Variable de salida: Nc.A':<40} = {rg['type_a_count']}")
    print(f"{'Variable de salida: Nc.B':<40} = {rg['type_b_count']}")
    print(f"{'Variable de salida: AP (ASC+DPC)':<40} = {rg['asc_count'] + rg['dpc_count']}")
    print(f"{'Variable de salida: DPC':<40} = {rg['dpc_count']}")
    print(f"{'Variable de salida: Fr.A':<40} = {rg['frh_a_count']}")
    print(f"{'Variable de salida: Fr.B':<40} = {rg['frh_b_count']}")
    print(f"{'Variable de salida: Cohe (cohesión)':<40} = {rg['cohesion_index']}")
    print(f"{'Variable de salida: Coop (coautorías)':<40} = {rg['coauthored_products_count']}")
    print(f"{'VARIABLE DE SALIDA: I_Grupo':<40} = {rg['i_grupo']:.3f}")
    print()
    print("Fórmula aplicada:")
    print("  I_Grupo = 3.7*TOP + 2.3*A + 0.4*B + 1.5*AP + 0.5*DPC")
    print("          + 1.0*Fr.A + 0.2*Fr.B + 0.1*Cohe + 0.3*Coop")
    print(f"  I_Grupo = 3.7*{rg['top_count']} + 2.3*{rg['type_a_count']}"
          f" + 0.4*{rg['type_b_count']} + 1.5*{rg['asc_count'] + rg['dpc_count']}"
          f" + 0.5*{rg['dpc_count']} + 1.0*{rg['frh_a_count']}"
          f" + 0.2*{rg['frh_b_count']} + 0.1*{rg['cohesion_index']}"
          f" + 0.3*{rg['coauthored_products_count']}"
          f" = {rg['i_grupo']:.3f}")
    print()

    # =========================================================================
    # EJERCICIO 2: Calcular I_Investigador
    # =========================================================================
    print("=" * 42)
    print("  EJERCICIO 2 — I_Investigador")
    print("=" * 42)

    ri = calcular_i_investigador(inv_ejemplo, productos_inv_101, autores_grupo, ANO_ACTUAL)

    print(f"{'Variable de entrada: investigador_id':<40} = {ri['investigador_id']}")
    print(f"{'Variable de entrada: investigador':<40} = {ri['investigador_nombre']}")
    print(f"{'Variable de entrada: año actual':<40} = {ri['ano_actual']}")
    print(f"{'Variable de salida: productos totales del investigador':<40} = {ri['total_products']}")
    print(f"{'Variable de salida: productos en ventana':<40} = {ri['productos_en_ventana']}")
    print(f"{'Variable de salida: Nc.Top':<40} = {ri['top_count']}")
    print(f"{'Variable de salida: Nc.A':<40} = {ri['type_a_count']}")
    print(f"{'Variable de salida: Nc.B':<40} = {ri['type_b_count']}")
    print(f"{'Variable de salida: AP (ASC+DPC)':<40} = {ri['asc_count'] + ri['dpc_count']}")
    print(f"{'Variable de salida: DPC':<40} = {ri['dpc_count']}")
    print(f"{'Variable de salida: Fr.A':<40} = {ri['frh_a_count']}")
    print(f"{'Variable de salida: Fr.B':<40} = {ri['frh_b_count']}")
    print(f"{'Variable de salida: Cohe (cohesión, individual=0)':<40} = 0.0")
    print(f"{'Variable de salida: Coop (coautorías)':<40} = {ri['coauthored_products_count']}")
    print(f"{'VARIABLE DE SALIDA: I_Investigador':<40} = {ri['i_investigador']:.3f}")
    print()
    print("Fórmula aplicada (misma que I_Grupo, nivel individual):")
    print("  I_Investigador = 3.7*TOP + 2.3*A + 0.4*B + 1.5*AP + 0.5*DPC")
    print("                 + 1.0*Fr.A + 0.2*Fr.B + 0.1*Cohe + 0.3*Coop")
    print(f"  I_Investigador = 3.7*{ri['top_count']} + 2.3*{ri['type_a_count']}"
          f" + 0.4*{ri['type_b_count']} + 1.5*{ri['asc_count'] + ri['dpc_count']}"
          f" + 0.5*{ri['dpc_count']} + 1.0*{ri['frh_a_count']}"
          f" + 0.2*{ri['frh_b_count']} + 0.1*0.0 + 0.3*{ri['coauthored_products_count']}"
          f" = {ri['i_investigador']:.3f}")