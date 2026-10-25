import json
import logging
from typing import List
import abpoxx_pybind

from ..models import Product, Researcher

logger = logging.getLogger("peai.repository")


def _is_endorsed(p: Product) -> bool:
    """Aval ✓ GrupLAC/CvLAC: llega como evidencia de texto o como atributo especializado JSON."""
    evidence = p.evidence or ""
    return (
        "avalado" in evidence.lower()
        or "✓" in evidence
        or '"minciencias_endorsed": true' in (p.specialized_attributes or "")
    )


def _ram_dashboard_stats(products: List[Product], researchers: List[Researcher]) -> dict:
    """Agregados base calculados sobre la RAM del core (modo archivo/vacío)."""
    from .. import repository

    validation: dict = {}
    by_year: dict = {}
    for p in products:
        status = p.validation_status or "pending"
        validation[status] = validation.get(status, 0) + 1
        if p.year:
            by_year[str(p.year)] = by_year.get(str(p.year), 0) + 1
    classifications: dict = {}
    for g in repository.list_groups():
        key = g.classification or "Sin clasificar"
        classifications[key] = classifications.get(key, 0) + 1

    _, total_projects = repository.list_projects()
    endorsed_count = sum(1 for p in products if _is_endorsed(p))
    orcid_count = sum(1 for r in researchers if r.orcid)
    without_subtype = sum(1 for p in products if not p.subtype_id)

    catalogs = repository.get_product_catalogs()
    families_map = {f["id"]: f for f in catalogs.get("families", [])}
    subtypes_map = {s["id"]: s for s in catalogs.get("subtypes", [])}

    fam_counts: dict = {}
    for p in products:
        if p.family_id:
            fam_counts[p.family_id] = fam_counts.get(p.family_id, 0) + 1
    total_classified_fam = sum(fam_counts.get(f_id, 0) for f_id in families_map)

    families_distribution = [
        {
            "family_id": f_id,
            "code": f_data.get("code") or "",
            "name": f_data.get("name") or "",
            "count": fam_counts.get(f_id, 0),
            "percentage": round((fam_counts.get(f_id, 0) / max(total_classified_fam, 1)) * 100, 1),
        }
        for f_id, f_data in sorted(families_map.items(), key=lambda x: x[1].get("sort_order", 99))
    ]

    edu_counts: dict = {}
    for r in researchers:
        lvl = (r.highest_education_level or "").strip()
        if lvl:
            edu_counts[lvl] = edu_counts.get(lvl, 0) + 1
    total_edu = sum(edu_counts.values())
    canonical_levels = ["Doctorado", "Maestría", "Especialización", "Pregrado"]
    edu_dist = []
    for lvl in canonical_levels:
        if lvl in edu_counts:
            cnt = edu_counts[lvl]
            edu_dist.append({"level": lvl, "count": cnt, "percentage": round((cnt / max(total_edu, 1)) * 100, 1)})
    for lvl, cnt in edu_counts.items():
        if lvl not in canonical_levels:
            edu_dist.append({"level": lvl, "count": cnt, "percentage": round((cnt / max(total_edu, 1)) * 100, 1)})

    sub_counts: dict = {}
    for p in products:
        if p.subtype_id:
            sub_counts[p.subtype_id] = sub_counts.get(p.subtype_id, 0) + 1
    sorted_subtypes = sorted(sub_counts.items(), key=lambda x: x[1], reverse=True)[:8]
    top_subtypes = [
        {
            "subtype_id": s_id,
            "name": subtypes_map.get(s_id, {}).get("name") or f"Tipología {s_id}",
            "code": subtypes_map.get(s_id, {}).get("code") or "",
            "count": cnt,
        }
        for s_id, cnt in sorted_subtypes
    ]

    postgraduate_count = sum(
        1 for r in researchers if (r.highest_education_level or "").strip() in ["Doctorado", "Maestría", "Especialización"]
    )
    total_prods = len(products)
    total_res = len(researchers)

    return {
        "total_groups": len(repository.list_groups()),
        "total_researchers": total_res,
        "total_products": total_prods,
        "validation": validation,
        "by_year": [{"year": y, "count": c} for y, c in sorted(by_year.items())],
        "groups_by_classification": classifications,
        "modelo_2024": {
            "products_without_subtype": without_subtype,
            "products_with_quality": sum(1 for p in products if p.quality_category_id),
            "endorsed_products": endorsed_count,
            "researchers_with_orcid": orcid_count,
            "total_projects": total_projects,
        },
        "families_distribution": families_distribution,
        "researchers_education": edu_dist,
        "top_subtypes": top_subtypes,
        "strategic_ratios": {
            "endorsement_rate": round((endorsed_count / max(total_prods, 1)) * 100, 1),
            "postgraduate_rate": round((postgraduate_count / max(total_res, 1)) * 100, 1),
            "avg_products_per_researcher": round(total_prods / max(total_res, 1), 1),
            "orcid_coverage_rate": round((orcid_count / max(total_res, 1)) * 100, 1),
        },
    }


def get_dashboard_stats() -> dict:
    from .. import repository
    if repository._active_connection_string:
        return json.loads(abpoxx_pybind.get_dashboard_stats_json(repository._active_connection_string))

    products = repository.list_products()
    researchers = repository.list_researchers()
    return _ram_dashboard_stats(products, researchers)


def _ram_group_stats(group_id: int) -> dict:
    from .. import repository
    pids = abpoxx_pybind.products_of_group(group_id)
    prods = [repository.get_product(pid) for pid in pids if abpoxx_pybind.get_product(pid) is not None]
    mids = abpoxx_pybind.members_of_group(group_id)
    members = [repository.get_researcher(mid) for mid in mids if abpoxx_pybind.get_researcher(mid) is not None]

    total_products = len(prods)
    total_members = len(members)

    by_year: dict = {}
    for p in prods:
        y = (p.obtained_date or p.publication_date or "")[:4]
        if y and y.isdigit():
            by_year[y] = by_year.get(y, 0) + 1

    families_map = {1: {"code": "GNC", "name": "Generación de Nuevo Conocimiento"},
                    2: {"code": "DTI", "name": "Desarrollo Tecnológico e Innovación"},
                    3: {"code": "ASC", "name": "Apropiación Social del Conocimiento"},
                    4: {"code": "DPC", "name": "Divulgación Pública de la Ciencia"},
                    5: {"code": "FRH", "name": "Formación de Recurso Humano"}}
    fam_counts: dict = {}
    for p in prods:
        if p.family_id:
            fam_counts[p.family_id] = fam_counts.get(p.family_id, 0) + 1
    families_distribution = [
        {
            "code": families_map.get(f_id, {}).get("code", f"FAM_{f_id}"),
            "name": families_map.get(f_id, {}).get("name", f"Familia {f_id}"),
            "count": cnt,
            "percentage": round((cnt / max(total_products, 1)) * 100, 1),
        }
        for f_id, cnt in sorted(fam_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    edu_counts: dict = {}
    for r in members:
        lvl = (r.highest_education_level or "").strip()
        if lvl:
            edu_counts[lvl] = edu_counts.get(lvl, 0) + 1
    edu_dist = [
        {"level": lvl, "count": cnt, "percentage": round((cnt / max(total_members, 1)) * 100, 1)}
        for lvl, cnt in sorted(edu_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    prod_set = set(pids)
    res_ranking = []
    for r in members:
        if r.id is None: continue
        r_pids = set(repository.products_of_researcher(r.id)).intersection(prod_set)
        cnt = len(r_pids)
        res_ranking.append({
            "id": r.id,
            "name": f"{r.first_names} {r.last_names}".strip(),
            "highest_education": r.highest_education_level or "Pregrado",
            "orcid": r.orcid or "",
            "role": "Integrante",
            "products_count": cnt,
            "total_authored_count": len(repository.products_of_researcher(r.id)),
            "percentage_of_group": round((cnt / max(total_products, 1)) * 100, 1),
        })
    res_ranking.sort(key=lambda x: x["products_count"], reverse=True)

    endorsed_count = sum(1 for p in prods if getattr(p, "is_endorsed", False))
    valid_count = sum(1 for p in prods if p.validation_status == "valid")
    postgrad_count = sum(1 for r in members if (r.highest_education_level or "").startswith(("Doc", "Maest", "Esp")))
    orcid_count = sum(1 for r in members if r.orcid)

    return {
        "total_products": total_products,
        "total_members": total_members,
        "by_year": [{"year": y, "count": c} for y, c in sorted(by_year.items())],
        "families_distribution": families_distribution,
        "researchers_education": edu_dist,
        "top_researchers": res_ranking[:12],
        "top_subtypes": [],
        "strategic_ratios": {
            "endorsed_count": endorsed_count,
            "endorsement_rate": round((endorsed_count / max(total_products, 1)) * 100, 1),
            "valid_count": valid_count,
            "validation_rate": round((valid_count / max(total_products, 1)) * 100, 1),
            "postgraduate_count": postgrad_count,
            "postgraduate_rate": round((postgrad_count / max(total_members, 1)) * 100, 1),
            "avg_products_per_member": round(total_products / max(total_members, 1), 1),
            "orcid_count": orcid_count,
            "orcid_coverage_rate": round((orcid_count / max(total_members, 1)) * 100, 1),
        },
    }


def get_group_stats(group_id: int) -> dict:
    from .. import repository
    repository.get_group(group_id)
    if repository._active_connection_string:
        return json.loads(abpoxx_pybind.get_group_stats_json(repository._active_connection_string, group_id))
    return _ram_group_stats(group_id)


def _ram_group_collaboration_network(group_id: int) -> dict:
    from .. import repository
    mids = abpoxx_pybind.members_of_group(group_id)
    members = [repository.get_researcher(mid) for mid in mids if abpoxx_pybind.get_researcher(mid) is not None]
    pids = set(abpoxx_pybind.products_of_group(group_id))

    nodes = []
    node_id_set = set()
    res_products = {}
    for r in members:
        if r.id is None: continue
        node_id_set.add(r.id)
        author_prods = set(repository.products_of_researcher(r.id))
        res_products[r.id] = author_prods
        in_group_cnt = len(author_prods.intersection(pids))
        nodes.append({
            "id": r.id,
            "name": f"{r.first_names} {r.last_names}".strip(),
            "education": r.highest_education_level or "Pregrado",
            "role": "Integrante",
            "products_count": in_group_cnt,
            "degree": 0,
        })

    nodes.sort(key=lambda x: x["products_count"], reverse=True)
    node_idx = {n["id"]: idx for idx, n in enumerate(nodes)}

    edges = []
    max_weight = 0
    member_ids = list(node_id_set)
    for i in range(len(member_ids)):
        r1 = member_ids[i]
        prods1 = res_products.get(r1, set())
        for j in range(i + 1, len(member_ids)):
            r2 = member_ids[j]
            prods2 = res_products.get(r2, set())
            shared = prods1.intersection(prods2)
            if shared:
                w = len(shared)
                src = min(r1, r2)
                tgt = max(r1, r2)
                edges.append({"source": src, "target": tgt, "weight": w})
                if w > max_weight:
                    max_weight = w
                if src in node_idx:
                    nodes[node_idx[src]]["degree"] += 1
                if tgt in node_idx:
                    nodes[node_idx[tgt]]["degree"] += 1

    edges.sort(key=lambda x: x["weight"], reverse=True)
    total_nodes = len(nodes)
    total_edges = len(edges)
    isolated_nodes = sum(1 for n in nodes if n["degree"] == 0)
    max_possible = (total_nodes * (total_nodes - 1)) / 2.0 if total_nodes > 1 else 0.0
    density = (total_edges / max_possible) if max_possible > 0 else 0.0

    return {
        "nodes": nodes,
        "edges": edges,
        "metrics": {
            "total_nodes": total_nodes,
            "total_edges": total_edges,
            "isolated_nodes": isolated_nodes,
            "max_weight": max_weight,
            "density": round(density, 4),
            "cohesion_index": round(density * 100, 1),
        }
    }


def get_group_collaboration_network(group_id: int) -> dict:
    from .. import repository
    repository.get_group(group_id)
    if repository._active_connection_string:
        try:
            raw = abpoxx_pybind.get_group_collaboration_network_json(repository._active_connection_string, group_id)
            if raw and raw != "{}":
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"Error calling native get_group_collaboration_network_json for group {group_id}: {e}")
    return _ram_group_collaboration_network(group_id)


def get_group_minciencias_diagnosis(group_id: int) -> dict:
    from .. import repository
    from ..minciencias_evaluator import evaluate_group_minciencias
    repository.get_group(group_id)
    diagnostico = evaluate_group_minciencias(group_id, repository)
    # Lectura ADITIVA del modelo oficial 2024 (§2.2.9 → §3.10): no cambia
    # ninguna clave que consume el frontend (tiers, semáforo).
    try:
        from ..evaluator.official_population import evaluar_modelo_oficial
        diagnostico["modelo_oficial_2024"] = evaluar_modelo_oficial(repository, group_id)
    except Exception as e:
        logger.warning(f"No se pudo evaluar el modelo oficial 2024 para el grupo {group_id}: {e}")
    return diagnostico


def get_researcher_minciencias_indicator(researcher_id: int) -> dict:
    """Indicador individual: ADAPTACIÓN DECLARADA del modelo 2024.

    El modelo de medición Minciencias 2024 no define un indicador de
    producción por persona (su único indicador, §3.10, es de grupo). Por eso
    la lectura con la escala del modelo se entrega como una **adaptación
    declarada** en la clave aditiva `adaptacion_individual_2024`. No hay
    indicador legacy: solo los conteos crudos por clase y la adaptación.

    Es el gemelo de `get_group_minciencias_diagnosis` para el investigador:
    ninguna clave existente cambia de nombre y, si la adaptación falla, el
    endpoint sigue respondiendo.
    """
    from .. import repository
    from ..evaluator import evaluate_researcher_minciencias

    indicador = evaluate_researcher_minciencias(researcher_id, repository)
    try:
        from ..evaluator.official_researcher_population import evaluar_modelo_individual
        indicador["adaptacion_individual_2024"] = evaluar_modelo_individual(
            repository, researcher_id
        )
    except Exception as e:
        logger.warning(
            f"No se pudo evaluar la adaptación individual 2024 para el investigador "
            f"{researcher_id}: {e}"
        )
    return indicador


def _ram_researcher_stats(researcher_id: int) -> dict:
    from .. import repository
    res = repository.get_researcher(researcher_id)
    pids = repository.products_of_researcher(researcher_id)
    prods = [repository.get_product(pid) for pid in pids if abpoxx_pybind.get_product(pid) is not None]
    total_products = len(prods)

    by_year: dict = {}
    for p in prods:
        d = p.obtained_date or p.publication_date or "Sin fecha"
        yr = d[:4] if len(d) >= 4 and d[:4].isdigit() else "Sin fecha"
        by_year[yr] = by_year.get(yr, 0) + 1

    families_map = {1: {"code": "GNC", "name": "Generación de Nuevo Conocimiento"},
                    2: {"code": "DTI", "name": "Desarrollo Tecnológico e Innovación"},
                    3: {"code": "ASC", "name": "Apropiación Social del Conocimiento"},
                    4: {"code": "DPC", "name": "Divulgación Pública de la Ciencia"},
                    5: {"code": "FRH", "name": "Formación de Recurso Humano"}}
    fam_counts: dict = {}
    for p in prods:
        if p.family_id:
            fam_counts[p.family_id] = fam_counts.get(p.family_id, 0) + 1
    families_distribution = [
        {
            "code": families_map.get(f_id, {}).get("code", f"FAM_{f_id}"),
            "name": families_map.get(f_id, {}).get("name", f"Familia {f_id}"),
            "count": cnt,
            "percentage": round((cnt / max(total_products, 1)) * 100, 1),
        }
        for f_id, cnt in sorted(fam_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    st_counts: dict = {}
    for p in prods:
        if p.subtype_id:
            st_counts[p.subtype_id] = st_counts.get(p.subtype_id, 0) + 1
    top_subtypes = [
        {"subtype_id": sid, "code": "", "name": f"Subtipo {sid}", "count": cnt}
        for sid, cnt in sorted(st_counts.items(), key=lambda x: x[1], reverse=True)[:6]
    ]

    gids = repository.groups_of_researcher(researcher_id)
    prod_set = set(pids)
    groups_contrib = []
    for gid in gids:
        try:
            g = repository.get_group(gid)
            g_pids = set(repository.products_of_group(gid)).intersection(prod_set)
            cnt = len(g_pids)
            groups_contrib.append({
                "id": gid,
                "name": g.name,
                "acronym": g.acronym or "",
                "role": "Integrante",
                "products_count": cnt,
                "percentage": round((cnt / max(total_products, 1)) * 100, 1),
            })
        except KeyError:
            pass
    groups_contrib.sort(key=lambda x: x["products_count"], reverse=True)

    coauthor_counts: dict = {}
    for pid in pids:
        try:
            aids = abpoxx_pybind.authors_of_product_ram(pid)
            for aid in aids:
                if aid != researcher_id:
                    coauthor_counts[aid] = coauthor_counts.get(aid, 0) + 1
        except Exception:
            pass

    top_coauthors = []
    for aid, cnt in sorted(coauthor_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
        try:
            cres = repository.get_researcher(aid)
            top_coauthors.append({
                "id": aid,
                "name": f"{cres.first_names} {cres.last_names}".strip(),
                "highest_education": cres.highest_education_level or "Pregrado",
                "shared_products": cnt,
            })
        except KeyError:
            pass

    endorsed_count = sum(1 for p in prods if getattr(p, "is_endorsed", False))
    valid_count = sum(1 for p in prods if p.validation_status == "valid")

    return {
        "total_products": total_products,
        "by_year": [{"year": y, "count": c} for y, c in sorted(by_year.items())],
        "families_distribution": families_distribution,
        "top_subtypes": top_subtypes,
        "groups_contribution": groups_contrib,
        "top_coauthors": top_coauthors,
        "strategic_ratios": {
            "endorsed_count": endorsed_count,
            "endorsement_rate": round((endorsed_count / max(total_products, 1)) * 100, 1),
            "valid_count": valid_count,
            "validation_rate": round((valid_count / max(total_products, 1)) * 100, 1),
            "total_coauthors": len(coauthor_counts),
        },
    }


def get_researcher_stats(researcher_id: int) -> dict:
    from .. import repository
    repository.get_researcher(researcher_id)
    if repository._active_connection_string:
        return json.loads(abpoxx_pybind.get_researcher_stats_json(repository._active_connection_string, researcher_id))
    return _ram_researcher_stats(researcher_id)
