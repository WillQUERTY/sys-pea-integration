# backend/app/evaluator/metrics_collector.py
"""
Recolección y agregación de métricas institucionales de Grupo e Investigador:
- Antigüedad e integrantes (grupo)
- Nivel de formación (PhD, Maestría)
- Agregación de obras en ventana y por familias
- Cálculo del Indicador de Cohesión (IC)
- Cálculo del Indicador de Producción Científica por Investigador (I_Investigador)
"""

from typing import Any, Dict, Set
from datetime import datetime
from .helpers import extract_year_from_date, normalize_name
from .product_classifier import (
    determine_family,
    get_applicable_window,
    classify_quality_and_formation,
    evaluate_coauthorship,
)

def collect_group_metrics(group_id: int, repository_module: Any) -> Dict[str, Any]:
    """Obtiene y calcula todas las métricas del colectivo necesarias para Minciencias 2024."""
    group = repository_module.get_group(group_id)
    projects = repository_module.get_group_projects(group_id)
    stats = repository_module.get_group_stats(group_id)
    
    # 1. Obtención de productos del colectivo
    try:
        prods = repository_module.filter_products(group_id=group_id)
    except Exception:
        prods = []
    
    total_products = len(prods) if prods else stats.get("total_products", 0)

    # 2. Obtención de integrantes y construcción del universo de nombres
    members_detailed = []
    try:
        members_detailed = repository_module.get_group_members_detailed(group_id)
    except Exception:
        pass
    
    total_members = len(members_detailed) if members_detailed else stats.get("total_members", 0)
    
    group_member_names: Set[str] = set()
    phd_count = 0
    masters_count = 0
    leader_found = False
    leader_education = "No identificado"
    
    for m in members_detailed:
        m_name = normalize_name(m.get("researcher_name"))
        if m_name:
            group_member_names.add(m_name)
        
        role = str(m.get("role", "")).lower()
        if "lider" in role or "líder" in role or "director" in role:
            leader_found = True
        
        rid = m.get("researcher_id")
        if rid:
            try:
                r = repository_module.get_researcher(rid)
                full_r_name = normalize_name(f"{r.first_names} {r.last_names}")
                if full_r_name:
                    group_member_names.add(full_r_name)
                
                edu = (r.highest_education_level or "").lower()
                records = (r.education_records or "").lower()
                if "doc" in edu or "phd" in edu or "doctor" in records:
                    phd_count += 1
                elif "maest" in edu or "mag" in edu or "master" in records or "maestr" in records:
                    masters_count += 1
                    
                if leader_found and leader_education == "No identificado":
                    leader_education = r.highest_education_level or "Pregrado"
            except Exception:
                pass

    if phd_count == 0 and masters_count == 0:
        edu_dist = {item["level"]: item["count"] for item in stats.get("researchers_education", [])}
        phd_count = sum(cnt for lvl, cnt in edu_dist.items() if lvl.lower().startswith("doc"))
        masters_count = sum(cnt for lvl, cnt in edu_dist.items() if lvl.lower().startswith("maest"))

    # 3. Antigüedad oficial del colectivo
    creation_year = extract_year_from_date(group.declared_creation_date)
    current_year = datetime.now().year
    years_active = (current_year - creation_year) if creation_year else 5
    if years_active < 1:
        years_active = 1

    # 4. Procesamiento de productos en ventanas diferenciadas
    gnc_count = 0
    dti_count = 0
    asc_count = 0
    dpc_count = 0
    frh_count = 0
    
    top_count = 0
    type_a_count = 0
    type_b_count = 0
    
    frh_a_count = 0
    frh_b_count = 0
    
    products_in_window = 0
    gnc_dti_in_window = 0
    asc_dpc_frh_in_window = 0
    
    coauthor_group_authors_sum = 0
    coauthor_evaluated_prods = 0
    coauthored_products_count = 0
    
    for p in prods:
        desc = f"{p.description or ''} {p.title or ''}"
        desc_l = desc.lower()
        
        p_year = p.year or extract_year_from_date(p.obtained_date) or extract_year_from_date(p.publication_date) or current_year
        age = current_year - p_year
        if age < 0:
            age = 0
            
        fam = determine_family(p, desc_l)
        max_window = get_applicable_window(desc_l)
            
        in_window = (age <= max_window)
        if in_window:
            products_in_window += 1
            if fam == "GNC":
                gnc_count += 1
                gnc_dti_in_window += 1
            elif fam == "DTI":
                dti_count += 1
                gnc_dti_in_window += 1
            elif fam == "ASC":
                asc_count += 1
                asc_dpc_frh_in_window += 1
            elif fam == "DPC":
                dpc_count += 1
                asc_dpc_frh_in_window += 1
            elif fam == "FRH":
                frh_count += 1
                asc_dpc_frh_in_window += 1
                
            is_top, is_a, is_b, is_frh_a, is_frh_b = classify_quality_and_formation(desc_l, fam)
            if is_top:
                top_count += 1
            elif is_a:
                type_a_count += 1
            else:
                type_b_count += 1
                
            if is_frh_a:
                frh_a_count += 1
            elif is_frh_b:
                frh_b_count += 1
                    
            if fam in ("GNC", "DTI"):
                coauthor_evaluated_prods += 1
                matched, is_coauth = evaluate_coauthorship(desc, group_member_names)
                coauthor_group_authors_sum += matched
                if is_coauth:
                    coauthored_products_count += 1

    if products_in_window == 0 and total_products > 0:
        products_in_window = total_products
        gnc_dti_in_window = max(1, total_products // 2)
        asc_dpc_frh_in_window = max(1, total_products // 3)

    if coauthor_evaluated_prods > 0:
        icoh = round((coauthor_group_authors_sum / coauthor_evaluated_prods) - 1.0, 3)
    else:
        icoh = 0.0
    cohesion_met = (icoh > 0.0) or (coauthored_products_count > 0)

    projects_count = len(projects)

    # --- Formula ponderada legacy (APROXIMACION, no es el indicador oficial) ---
    # AP (apropiacion social) y DPC (divulgacion publica) son terminos separados.
    # Este valor NO es el Ind.Grupo oficial (§3.10): no aplica λ (§2.2.9), ni los
    # pesos por clase (§3.6), ni la normalizacion contra la poblacion (§3.9).
    # Vive solo como insumo del semaforo de categorizacion, por eso se expone
    # como `i_grupo_legacy` (Fase 6, brecha B5).
    cohe = icoh  # cohesion interna aplica al colectivo
    coop = coauthored_products_count  # coautoria con otros investigadores del grupo

    i_grupo_legacy = round(
        3.7 * top_count
        + 2.3 * type_a_count
        + 0.4 * type_b_count
        + 1.5 * asc_count
        + 0.5 * dpc_count
        + 1.0 * frh_a_count
        + 0.2 * frh_b_count
        + 0.1 * cohe
        + 0.3 * coop,
        3,
    )

    return {
        "group": group,
        "years_active": years_active,
        "creation_year": creation_year,
        "total_members": total_members,
        "phd_count": phd_count,
        "masters_count": masters_count,
        "total_products": total_products,
        "products_in_window": products_in_window,
        "gnc_count": gnc_count,
        "dti_count": dti_count,
        "frh_count": frh_count,
        "asc_count": asc_count,
        "dpc_count": dpc_count,
        "projects_count": projects_count,
        "cohesion_index": icoh,
        "cohesion_met": cohesion_met,
        "top_count": top_count,
        "type_a_count": type_a_count,
        "type_b_count": type_b_count,
        "frh_a_count": frh_a_count,
        "frh_b_count": frh_b_count,
        "asc_dpc_count": asc_count + dpc_count,
        "coauthored_products_count": coauthored_products_count,
        "gnc_dti_in_window": gnc_dti_in_window,
        "asc_dpc_frh_in_window": asc_dpc_frh_in_window,
        "i_grupo_legacy": i_grupo_legacy,
    }


def collect_researcher_metrics(researcher_id: int, repository_module: Any) -> Dict[str, Any]:
    """Obtiene y calcula todas las métricas individuales necesarias para el indicador
    de producción científica de un investigador (I_Investigador) según Minciencias 2024.

    Reutiliza las funciones de clasificacion de product_classifier.py para determinar
    familia, ventana, calidad y formacion de cada producto vinculado al investigador.
    Aplica la formula ponderada de docs/modelo-medicion-2024.md Seccion 10.6 adaptada
    a nivel individual:

        I_Investigador ≡ 3,7·Nc.Top + 2,3·Nc.A + 0,4·Nc.B + 1,5·AP + 0,5·DPC
                         + 1,0·Fr.A + 0,2·Fr.B + 0,1·Cohe + 0,3·Coop

    Donde Cohe (cohesion) es 0 para un investigador individual y Coop (coautoría)
    cuenta los productos con al menos otro autor vinculado.
    """
    researcher = repository_module.get_researcher(researcher_id)

    # --- Obtencion de productos del investigador (RAM o BD) ---
    pids: list[int] = []
    try:
        pids = list(repository_module.products_of_researcher(researcher_id))
    except Exception:
        pids = []

    # Fallback a enlace RAM directo del core C++ cuando no hay conexion BD activa
    if not pids and getattr(repository_module, "_active_connection_string", None) is None:
        try:
            import abpoxx_pybind  # type: ignore
            pids = list(abpoxx_pybind.products_of_researcher_ram(researcher_id))
        except Exception:
            pids = []

    prods = []
    for pid in pids:
        try:
            p = repository_module.get_product(pid)
            if p is not None:
                prods.append(p)
        except Exception:
            pass

    total_products = len(prods)
    current_year = datetime.now().year

    # --- Contadores por familia, calidad, formacion y ventana ---
    gnc_count = 0
    dti_count = 0
    asc_count = 0
    dpc_count = 0
    frh_count = 0

    top_count = 0
    type_a_count = 0
    type_b_count = 0

    frh_a_count = 0
    frh_b_count = 0

    products_in_window = 0
    gnc_dti_in_window = 0
    asc_dpc_frh_in_window = 0

    coauthor_evaluated_prods = 0
    coauthored_products_count = 0

    for p in prods:
        desc = f"{p.description or ''} {p.title or ''}"
        desc_l = desc.lower()

        p_year = (
            p.year
            or extract_year_from_date(p.obtained_date)
            or extract_year_from_date(p.publication_date)
            or current_year
        )
        age = current_year - p_year
        if age < 0:
            age = 0

        fam = determine_family(p, desc_l)
        max_window = get_applicable_window(desc_l)

        in_window = age <= max_window
        if in_window:
            products_in_window += 1
            if fam == "GNC":
                gnc_count += 1
                gnc_dti_in_window += 1
            elif fam == "DTI":
                dti_count += 1
                gnc_dti_in_window += 1
            elif fam == "ASC":
                asc_count += 1
                asc_dpc_frh_in_window += 1
            elif fam == "DPC":
                dpc_count += 1
                asc_dpc_frh_in_window += 1
            elif fam == "FRH":
                frh_count += 1
                asc_dpc_frh_in_window += 1

            is_top, is_a, is_b, is_frh_a, is_frh_b = classify_quality_and_formation(desc_l, fam)
            if is_top:
                top_count += 1
            elif is_a:
                type_a_count += 1
            else:
                type_b_count += 1

            if is_frh_a:
                frh_a_count += 1
            elif is_frh_b:
                frh_b_count += 1

            if fam in ("GNC", "DTI"):
                coauthor_evaluated_prods += 1
                try:
                    authors = repository_module.authors_of_product_ram(p.id)
                    other_authors = [a for a in authors if a != researcher_id]
                    if other_authors:
                        coauthored_products_count += 1
                except Exception:
                    # Si no hay autores de producto disponibles, se asume unica autoría
                    pass

    # Fallback cuando no hay productos en ventana pero sí productos totales
    if products_in_window == 0 and total_products > 0:
        products_in_window = total_products
        gnc_dti_in_window = max(1, total_products // 2)
        asc_dpc_frh_in_window = max(1, total_products // 3)

    # --- Formula ponderada I_Investigador (Minciencias 2024, seccion 10.6) ---
    cohe = 0.0  # Cohesion interna no aplica a investigador individual
    coop = coauthored_products_count  # Coautoría con otros investigadores

    i_investigador = round(
        3.7 * top_count
        + 2.3 * type_a_count
        + 0.4 * type_b_count
        + 1.5 * asc_count     # AP = apropiacion social (termino separado de DPC)
        + 0.5 * dpc_count     # DPC = divulgacion publica (termino separado de AP)
        + 1.0 * frh_a_count
        + 0.2 * frh_b_count
        + 0.1 * cohe
        + 0.3 * coop,
        3,
    )

    return {
        "researcher": researcher,
        "researcher_id": researcher_id,
        "total_products": total_products,
        "products_in_window": products_in_window,
        "gnc_count": gnc_count,
        "dti_count": dti_count,
        "frh_count": frh_count,
        "asc_count": asc_count,
        "dpc_count": dpc_count,
        "top_count": top_count,
        "type_a_count": type_a_count,
        "type_b_count": type_b_count,
        "frh_a_count": frh_a_count,
        "frh_b_count": frh_b_count,
        "asc_dpc_count": asc_count + dpc_count,
        "coauthored_products_count": coauthored_products_count,
        "gnc_dti_in_window": gnc_dti_in_window,
        "asc_dpc_frh_in_window": asc_dpc_frh_in_window,
        "i_investigador": i_investigador,
    }
