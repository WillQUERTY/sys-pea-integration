from typing import Any, Dict, List, Optional
from . import repository


DIMENSION_METADATA = {
    "gnc": {
        "label": "Nuevo Conocimiento (GNC)",
        "short_label": "GNC",
        "unit": "obras",
        "description": "Artículos, libros de investigación, patentes y variedades científicas",
    },
    "dti": {
        "label": "Desarrollo Tecnológico (DTI)",
        "short_label": "DTI",
        "unit": "obras",
        "description": "Software, plantas piloto, prototipos y diseños industriales",
    },
    "asc": {
        "label": "Apropiación Social (ASC)",
        "short_label": "ASC",
        "unit": "obras",
        "description": "Divulgación pública, eventos, redes y estrategias de comunicación",
    },
    "frh": {
        "label": "Formación de Talento (FRH)",
        "short_label": "FRH",
        "unit": "obras",
        "description": "Dirección de tesis doctorales, maestrías y semilleros de investigación",
    },
    "cohesion": {
        "label": "Cohesión de Red",
        "short_label": "Cohesión",
        "unit": "%",
        "description": "Densidad e interconexión interna de coautorías entre investigadores",
    },
    "productivity": {
        "label": "Productividad Media",
        "short_label": "Prod. Media",
        "unit": "obras/inv",
        "description": "Promedio de obras científicas producidas por cada integrante del colectivo",
    },
}

DIMENSION_KEYS = ["gnc", "dti", "asc", "frh", "cohesion", "productivity"]


def compare_groups_analytics(group_ids: Optional[List[int]] = None) -> Dict[str, Any]:
    """
    Genera el diagnóstico y benchmarking multidimensional comparativo entre
    2 o más grupos de investigación de la institución (Fase 5).
    
    Retorna métricas crudas, puntuaciones normalizadas (0-100) para Recharts RadarChart,
    matriz comparativa lado a lado y hallazgos clave de liderazgo.
    """
    # 1. Resolver los IDs de grupos a comparar
    target_ids: List[int] = []
    if group_ids:
        # Mantener orden y eliminar duplicados
        seen = set()
        for gid in group_ids:
            if gid not in seen and gid > 0:
                seen.add(gid)
                target_ids.append(gid)
                
    if not target_ids:
        # Si no se suministraron IDs, seleccionar los grupos más representativos
        all_groups = repository.list_groups()
        # Ordenar por cantidad estimada de productos o id
        sorted_groups = sorted(
            all_groups,
            key=lambda g: (
                1 if g.classification in ("A1", "A") else 0,
                g.id or 0
            ),
            reverse=True
        )
        target_ids = [g.id for g in sorted_groups[:3] if g.id is not None]
        if not target_ids and all_groups:
            target_ids = [all_groups[0].id] if all_groups[0].id else []

    # 2. Recolectar datos por cada grupo
    groups_data = []
    for gid in target_ids:
        try:
            grp = repository.get_group(gid)
        except KeyError:
            continue

        try:
            stats = repository.get_group_stats(gid)
        except Exception:
            stats = {}

        try:
            net = repository.get_group_collaboration_network(gid)
        except Exception:
            net = {}

        # Mapeo de distribución por familias Minciencias (GNC / FAM_6, DTI / FAM_7, ASC / DPC / FAM_9, FRH / FAM_10)
        fam_dist = stats.get("families_distribution", [])
        fam_map = {item.get("code"): item.get("count", 0) for item in fam_dist}
        gnc_val = fam_map.get("GNC", fam_map.get("FAM_6", 0))
        dti_val = fam_map.get("DTI", fam_map.get("FAM_7", 0))
        asc_val = fam_map.get("ASC", fam_map.get("DPC", fam_map.get("FAM_9", 0)))
        frh_val = fam_map.get("FRH", fam_map.get("FAM_10", 0))

        # Métricas de red
        net_metrics = net.get("metrics", {})
        cohesion_val = float(net_metrics.get("cohesion_index", 0.0))
        density_val = float(net_metrics.get("density", 0.0))
        total_edges = int(net_metrics.get("total_edges", 0))

        # Ratios estratégicos
        ratios = stats.get("strategic_ratios", {})
        prod_per_member = float(ratios.get("avg_products_per_member", 0.0))
        postgraduate_rate = float(ratios.get("postgraduate_rate", 0.0))
        postgraduate_count = int(ratios.get("postgraduate_count", 0))
        endorsement_rate = float(ratios.get("endorsement_rate", 0.0))
        validation_rate = float(ratios.get("validation_rate", 0.0))

        # Top 3 investigadores
        top_res = stats.get("top_researchers", [])[:3]

        # Resolución estética de sigla / acrónimo
        acronym = (grp.acronym or "").strip()
        if not acronym and grp.name:
            import re
            m = re.search(r"[-–—\(]\s*([A-Za-z0-9_]{2,15})\s*[-–—\)]", grp.name)
            if m:
                acronym = m.group(1).strip()
            else:
                acronym = grp.name[:24].strip()
        if not acronym:
            acronym = f"Grupo #{grp.id}"

        groups_data.append({
            "id": grp.id,
            "name": grp.name,
            "acronym": acronym,
            "classification": grp.classification or "Sin clasificar",
            "institution": grp.institution or "Universidad Popular del Cesar",
            "external_code": grp.external_code or "",
            "status": grp.status or "active",
            "total_products": stats.get("total_products", 0),
            "total_members": stats.get("total_members", 0),
            "top_researchers": top_res,
            "strategic_ratios": {
                "avg_products_per_member": prod_per_member,
                "postgraduate_rate": postgraduate_rate,
                "postgraduate_count": postgraduate_count,
                "endorsement_rate": endorsement_rate,
                "validation_rate": validation_rate,
            },
            "network_summary": {
                "cohesion_index": cohesion_val,
                "density": density_val,
                "total_edges": total_edges,
            },
            "raw_dimensions": {
                "gnc": gnc_val,
                "dti": dti_val,
                "asc": asc_val,
                "frh": frh_val,
                "cohesion": cohesion_val,
                "productivity": prod_per_member,
            }
        })

    if not groups_data:
        return {
            "groups": [],
            "radar_chart_data": [],
            "dimension_leaders": [],
            "insights": [],
            "comparison_matrix": [],
        }

    # 3. Normalización 0-100 relativa al máximo alcanzado en el grupo de comparación
    max_values: Dict[str, float] = {}
    for d in DIMENSION_KEYS:
        vals = [g["raw_dimensions"][d] for g in groups_data]
        max_v = max(vals) if vals else 0.0
        # Si el máximo es 0, dejamos 1.0 como divisor para evitar división por cero
        max_values[d] = max_v if max_v > 0 else 1.0

    for g in groups_data:
        g["radar_scores"] = {}
        for d in DIMENSION_KEYS:
            raw = g["raw_dimensions"][d]
            max_v = max_values[d]
            if max_v > 0 and raw > 0:
                score = round((raw / max_v) * 100.0, 1)
            else:
                score = 0.0
            g["radar_scores"][d] = score

    # 4. Formatear datos para Recharts RadarChart
    radar_chart_data = []
    dimension_leaders = []
    insights = []

    for d in DIMENSION_KEYS:
        meta = DIMENSION_METADATA[d]
        row: Dict[str, Any] = {
            "dimension": meta["label"],
            "short_label": meta["short_label"],
            "key": d,
            "unit": meta["unit"],
            "description": meta["description"],
        }
        
        # Encontrar líder en la dimensión
        best_g = max(groups_data, key=lambda g: g["raw_dimensions"][d])
        best_raw = best_g["raw_dimensions"][d]

        for g in groups_data:
            gid = g["id"]
            row[f"group_{gid}"] = g["radar_scores"][d]
            row[f"group_{gid}_raw"] = g["raw_dimensions"][d]

        radar_chart_data.append(row)

        dimension_leaders.append({
            "dimension_key": d,
            "dimension_label": meta["label"],
            "leader_group_id": best_g["id"],
            "leader_group_name": best_g["name"],
            "leader_acronym": best_g["acronym"],
            "value": best_raw,
            "unit": meta["unit"],
        })

        if best_raw > 0:
            insights.append(
                f"«{best_g['acronym']}» lidera en {meta['label']} con {best_raw} {meta['unit']}."
            )

    # 5. Matriz de Indicadores Clave Lado a Lado
    comparison_matrix = [
        {
            "indicator": "Clasificación Minciencias",
            "category": "Institucional",
            "values": {g["id"]: g["classification"] for g in groups_data},
            "unit": "",
        },
        {
            "indicator": "Total Obras Científicas",
            "category": "Producción",
            "values": {g["id"]: g["total_products"] for g in groups_data},
            "unit": "obras",
            "leader_id": max(groups_data, key=lambda g: g["total_products"])["id"] if groups_data else None,
        },
        {
            "indicator": "Total Integrantes Activos",
            "category": "Equipo",
            "values": {g["id"]: g["total_members"] for g in groups_data},
            "unit": "investigadores",
            "leader_id": max(groups_data, key=lambda g: g["total_members"])["id"] if groups_data else None,
        },
        {
            "indicator": "Productividad Media",
            "category": "Eficiencia",
            "values": {g["id"]: g["raw_dimensions"]["productivity"] for g in groups_data},
            "unit": "obras/inv",
            "leader_id": max(groups_data, key=lambda g: g["raw_dimensions"]["productivity"])["id"] if groups_data else None,
        },
        {
            "indicator": "Nuevo Conocimiento (GNC)",
            "category": "Tipología Minciencias",
            "values": {g["id"]: g["raw_dimensions"]["gnc"] for g in groups_data},
            "unit": "obras",
            "leader_id": max(groups_data, key=lambda g: g["raw_dimensions"]["gnc"])["id"] if groups_data else None,
        },
        {
            "indicator": "Desarrollo Tecnológico (DTI)",
            "category": "Tipología Minciencias",
            "values": {g["id"]: g["raw_dimensions"]["dti"] for g in groups_data},
            "unit": "obras",
            "leader_id": max(groups_data, key=lambda g: g["raw_dimensions"]["dti"])["id"] if groups_data else None,
        },
        {
            "indicator": "Apropiación Social (ASC)",
            "category": "Tipología Minciencias",
            "values": {g["id"]: g["raw_dimensions"]["asc"] for g in groups_data},
            "unit": "obras",
            "leader_id": max(groups_data, key=lambda g: g["raw_dimensions"]["asc"])["id"] if groups_data else None,
        },
        {
            "indicator": "Formación de Talento (FRH)",
            "category": "Tipología Minciencias",
            "values": {g["id"]: g["raw_dimensions"]["frh"] for g in groups_data},
            "unit": "obras",
            "leader_id": max(groups_data, key=lambda g: g["raw_dimensions"]["frh"])["id"] if groups_data else None,
        },
        {
            "indicator": "Cohesión Red de Coautoría",
            "category": "Colaboración",
            "values": {g["id"]: g["raw_dimensions"]["cohesion"] for g in groups_data},
            "unit": "%",
            "leader_id": max(groups_data, key=lambda g: g["raw_dimensions"]["cohesion"])["id"] if groups_data else None,
        },
        {
            "indicator": "Masa Crítica de Posgrado (Dr/Mg)",
            "category": "Equipo",
            "values": {g["id"]: g["strategic_ratios"]["postgraduate_rate"] for g in groups_data},
            "unit": "%",
            "leader_id": max(groups_data, key=lambda g: g["strategic_ratios"]["postgraduate_rate"])["id"] if groups_data else None,
        },
        {
            "indicator": "Tasa de Endoso Institucional",
            "category": "Gobernanza",
            "values": {g["id"]: g["strategic_ratios"]["endorsement_rate"] for g in groups_data},
            "unit": "%",
            "leader_id": max(groups_data, key=lambda g: g["strategic_ratios"]["endorsement_rate"])["id"] if groups_data else None,
        },
        {
            "indicator": "Tasa de Validación Técnica",
            "category": "Calidad",
            "values": {g["id"]: g["strategic_ratios"]["validation_rate"] for g in groups_data},
            "unit": "%",
            "leader_id": max(groups_data, key=lambda g: g["strategic_ratios"]["validation_rate"])["id"] if groups_data else None,
        },
    ]

    return {
        "groups": groups_data,
        "radar_chart_data": radar_chart_data,
        "dimension_leaders": dimension_leaders,
        "insights": insights,
        "comparison_matrix": comparison_matrix,
    }
