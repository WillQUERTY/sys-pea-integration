# backend/app/minciencias_evaluator.py
# Motor de diagnóstico y semáforo de categorización de Grupos según Modelo Minciencias 2024.
# Referencia: Minciencias - Modelo de Medición 2024 (Convocatoria 957 / Anexo 1 - M601PR04G01 Versión 02).

from typing import Dict, Any, List, Optional, Set
from datetime import datetime
import unicodedata
import re

def _extract_year_from_date(date_str: Optional[str]) -> Optional[int]:
    """Extrae un año de 4 dígitos de un campo de fecha o texto."""
    if not date_str:
        return None
    match = re.search(r'\b(19\d\d|20\d\d)\b', str(date_str))
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None

def _clean_classification(classification: Optional[str]) -> str:
    """Normaliza la clasificación oficial del grupo."""
    if not classification:
        return "Sin clasificar"
    raw = classification.strip()
    if raw.startswith("A1"):
        return "A1"
    if raw.startswith("A"):
        return "A"
    if raw.startswith("B"):
        return "B"
    if raw.startswith("C"):
        return "C"
    if "Reconocido" in raw:
        return "Reconocido"
    return "Sin clasificar"

def _normalize_name(name: Optional[str]) -> str:
    """Normaliza cadenas de texto para cruces de coautoría y desambiguación."""
    if not name:
        return ""
    text = str(name).strip()
    # Eliminar acentos y diacríticos
    normalized = ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )
    # Limpieza de espacios redundantes y paso a mayúsculas
    return re.sub(r'\s+', ' ', normalized).upper().strip()

def evaluate_group_minciencias(group_id: int, repository_module: Any) -> Dict[str, Any]:
    """
    Evalúa el estado de un Grupo de Investigación según el Modelo Minciencias 2024.
    Aplica ventanas diferenciadas de 10, 7 y 5 años, discriminación de tipologías TOP, Tipo A,
    Tipo B, Formación de Recurso Humano Tipo A (Doctoral), y el cálculo formal del Indicador
    de Cohesión (IC).
    """
    group = repository_module.get_group(group_id)
    projects = repository_module.get_group_projects(group_id)
    stats = repository_module.get_group_stats(group_id)
    
    # 1. Obtención de productos del colectivo
    try:
        prods = repository_module.filter_products(group_id=group_id)
    except Exception:
        prods = []
    
    # Si no hay productos por filtro de grupo, intentamos recuperar del stats
    total_products = len(prods) if prods else stats.get("total_products", 0)

    # 2. Obtención de integrantes y construcción del universo de nombres
    members_detailed = []
    try:
        members_detailed = repository_module.get_group_members_detailed(group_id)
    except Exception:
        pass
    
    total_members = len(members_detailed) if members_detailed else stats.get("total_members", 0)
    
    # Conjunto normalizado de integrantes para validación de coautorías internas
    group_member_names: Set[str] = set()
    phd_count = 0
    masters_count = 0
    leader_found = False
    leader_education = "No identificado"
    
    for m in members_detailed:
        m_name = _normalize_name(m.get("researcher_name"))
        if m_name:
            group_member_names.add(m_name)
        
        # Verificar rol de líder
        role = str(m.get("role", "")).lower()
        if "lider" in role or "líder" in role or "director" in role:
            leader_found = True
        
        rid = m.get("researcher_id")
        if rid:
            try:
                r = repository_module.get_researcher(rid)
                full_r_name = _normalize_name(f"{r.first_names} {r.last_names}")
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

    # Si por falta de CvLAC detallado no se contaron títulos, consultar stats
    if phd_count == 0 and masters_count == 0:
        edu_dist = {item["level"]: item["count"] for item in stats.get("researchers_education", [])}
        phd_count = sum(cnt for lvl, cnt in edu_dist.items() if lvl.lower().startswith("doc"))
        masters_count = sum(cnt for lvl, cnt in edu_dist.items() if lvl.lower().startswith("maest"))

    # 3. Antigüedad oficial del colectivo
    creation_year = _extract_year_from_date(group.declared_creation_date)
    current_year = datetime.now().year
    years_active = (current_year - creation_year) if creation_year else 5
    if years_active < 1:
        years_active = 1

    # 4. Procesamiento de productos: Ventanas Diferenciadas (Tabla 5) y Tipologías (Sección 3.7)
    # Ventanas oficiales:
    # - 10 años: Patentes (PA/MA), Variedades (VV), Razas (VA), Investigación-Creación (AAD)
    # - 7 años: Artículos de investigación (A1, A2, B, C), Libros de investigación (LIB)
    # - 5 años: Artículos D, Notas, Capítulos, Software (SF), Prototipos (PI), Plantas (PP), FRH, ASC, DPC
    
    gnc_count = 0
    dti_count = 0
    asc_count = 0
    dpc_count = 0
    frh_count = 0
    
    top_count = 0
    type_a_count = 0
    type_b_count = 0
    
    frh_a_count = 0  # Doctorado dirigido
    frh_b_count = 0  # Maestría y Pregrado dirigido
    
    products_in_window = 0
    gnc_dti_in_window = 0
    asc_dpc_frh_in_window = 0
    
    coauthor_group_authors_sum = 0
    coauthor_evaluated_prods = 0
    coauthored_products_count = 0
    
    for p in prods:
        desc = f"{p.description or ''} {p.title or ''}"
        desc_l = desc.lower()
        
        # Determinar año de la obra
        p_year = p.year or _extract_year_from_date(p.obtained_date) or _extract_year_from_date(p.publication_date) or current_year
        age = current_year - p_year
        if age < 0:
            age = 0
            
        # Mapeo unificado de familias (soporta IDs canónicos 1-5 y legacy/scraped 6-10)
        fid = p.family_id or 0
        fam = "OTRA"
        if fid in (1, 6) or "publicado en revista" in desc_l or "libro" in desc_l or "capítulo" in desc_l or "capitulo" in desc_l:
            fam = "GNC"
        elif fid in (2, 7) or "computacional" in desc_l or "software" in desc_l or "patente" in desc_l or "prototipo" in desc_l or "innovación" in desc_l:
            fam = "DTI"
        elif fid == 3 or "apropiación" in desc_l or "social del conocimiento" in desc_l:
            fam = "ASC"
        elif fid in (4, 9) or "divulgación" in desc_l or "congreso" in desc_l or "web" in desc_l or "informe técnico" in desc_l:
            fam = "DPC"
        elif fid in (5, 10) or "trabajo de grado" in desc_l or "tesis" in desc_l or "pregrado" in desc_l or "maestría" in desc_l or "maestria" in desc_l:
            fam = "FRH"
            
        # Ventana aplicable según la tipología oficial
        is_10yr = any(w in desc_l for w in ["patente", "variedad vegetal", "raza animal", "investigación-creación", "creacion"])
        is_7yr = ("publicado en revista" in desc_l or "libro resultado" in desc_l) and not any(w in desc_l for w in ["calidad d", "categoria d"])
        
        max_window = 5
        if is_10yr:
            max_window = 10
        elif is_7yr:
            max_window = 7
            
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
                
            # Clasificación de Calidad: TOP, Tipo A, Tipo B
            is_top = (
                any(q in desc_l for q in ["a1", "q1", "q2", "a2"]) or
                "patente de invención" in desc_l or
                "libro resultado de investigación" in desc_l
            )
            is_a = (
                any(q in desc_l for q in ["calidad b", "categoria b", "calidad c", "categoria c", "q3", "q4"]) or
                "revista especializada" in desc_l or
                "software" in desc_l or
                "computacional" in desc_l or
                "prototipo" in desc_l or
                "innovación" in desc_l or
                "diseño industrial" in desc_l
            )
            
            if is_top:
                top_count += 1
            elif is_a:
                type_a_count += 1
            else:
                type_b_count += 1
                
            # Clasificación de Formación: Doctorado (FRH-A) vs Maestría/Pregrado (FRH-B)
            if fam == "FRH":
                if "tesis de doctorado" in desc_l or "doctoral" in desc_l:
                    frh_a_count += 1
                else:
                    frh_b_count += 1
                    
            # Cálculo del Indicador de Cohesión en GNC + DTI
            if fam in ("GNC", "DTI"):
                coauthor_evaluated_prods += 1
                matched_in_group = 0
                if "Autores:" in desc:
                    author_part = desc.split("Autores:", 1)[1]
                    tokens = [_normalize_name(x) for x in re.split(r'[,;]', author_part) if len(x.strip()) > 3]
                    matched_in_group = len(set(tokens).intersection(group_member_names))
                if matched_in_group == 0:
                    matched_in_group = 1  # Por definición al menos 1 autor vinculó la obra al grupo
                coauthor_group_authors_sum += matched_in_group
                if matched_in_group >= 2:
                    coauthored_products_count += 1

    # Respaldo si no se encontraron productos en memoria o hubo error de extracción
    if products_in_window == 0 and total_products > 0:
        products_in_window = total_products
        gnc_dti_in_window = max(1, total_products // 2)
        asc_dpc_frh_in_window = max(1, total_products // 3)

    # 5. Cálculo formal del Indicador de Cohesión (IC = Autores/Productos - 1)
    if coauthor_evaluated_prods > 0:
        icoh = round((coauthor_group_authors_sum / coauthor_evaluated_prods) - 1.0, 3)
    else:
        icoh = 0.0
    cohesion_met = (icoh > 0.0) or (coauthored_products_count > 0)

    # Pisos anualizados para Reconocimiento Basal (Fase 1)
    annual_target = min(years_active, 5)
    projects_count = len(projects)

    # 6. Definición y Auditoría de Tiers Minciencias 2024
    tiers_config = [
        {
            "tier": "Reconocido",
            "title": "Grupo Reconocido Institucionalmente",
            "description": "Fase 1: Requisitos mínimos de existencia formal, integrantes, aval y producción anualizada.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Tiempo de existencia declarado en GrupLAC",
                    "target": 1,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 1,
                },
                {
                    "id": "integrantes",
                    "label": "Integrantes vinculados",
                    "description": "Mínimo de investigadores activos en el colectivo",
                    "target": 2,
                    "current": total_members,
                    "unit": "investigadores",
                    "met": total_members >= 2,
                },
                {
                    "id": "proyectos",
                    "label": "Proyectos de I+D",
                    "description": "Al menos un proyecto de investigación o innovación en ejecución",
                    "target": 1,
                    "current": projects_count,
                    "unit": "proyectos",
                    "met": projects_count >= 1,
                },
                {
                    "id": "produccion_gnc_dti",
                    "label": "Piso Anualizado GNC o DTI",
                    "description": "Mínimo 1 producto de conocimiento o innovación por año declarado",
                    "target": annual_target,
                    "current": gnc_dti_in_window,
                    "unit": "obras GNC/DTI",
                    "met": gnc_dti_in_window >= annual_target,
                },
                {
                    "id": "produccion_apropiacion",
                    "label": "Piso Anualizado ASC/DPC/FRH",
                    "description": "Mínimo 1 producto de apropiación, divulgación o formación por año",
                    "target": annual_target,
                    "current": asc_dpc_frh_in_window,
                    "unit": "obras ASC/DPC/FRH",
                    "met": asc_dpc_frh_in_window >= annual_target,
                },
            ],
        },
        {
            "tier": "C",
            "title": "Categoría C",
            "description": "Fase 2: Consolidación inicial, productos con visibilidad y presencia en formación/divulgación.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Tiempo de existencia oficial del grupo",
                    "target": 2,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 2,
                },
                {
                    "id": "calidad_top_a",
                    "label": "Calidad de Producción (TOP o Tipo A)",
                    "description": "Al menos 1 obra Tipo TOP o Tipo A en ventana",
                    "target": 1,
                    "current": top_count + type_a_count,
                    "unit": "obras TOP/A",
                    "met": (top_count + type_a_count) >= 1,
                },
                {
                    "id": "apropiacion_divulgacion",
                    "label": "Apropiación o Divulgación (ASC/DPC)",
                    "description": "Al menos 1 producto de Apropiación Social o Divulgación Pública en ventana",
                    "target": 1,
                    "current": asc_count + dpc_count,
                    "unit": "obras ASC/DPC",
                    "met": (asc_count + dpc_count) >= 1,
                },
                {
                    "id": "formacion_talento",
                    "label": "Formación de Talento Humano",
                    "description": "Al menos 1 producto FRH Tipo A o Tipo B en ventana",
                    "target": 1,
                    "current": frh_a_count + frh_b_count,
                    "unit": "obras FRH",
                    "met": (frh_a_count + frh_b_count) >= 1,
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción en Ventana Diferenciada",
                    "description": "Volumen de obras en ventana oficial",
                    "target": 4,
                    "current": products_in_window,
                    "unit": "productos",
                    "met": products_in_window >= 4,
                },
            ],
        },
        {
            "tier": "B",
            "title": "Categoría B",
            "description": "Fase 2: Madurez investigativa con coautoría interna demostrada y talento avanzado.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Trayectoria institucional obligatoria",
                    "target": 3,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 3,
                },
                {
                    "id": "cohesion",
                    "label": "Indicador de Cohesión (IC > 0)",
                    "description": "Colaboración obligatoria entre integrantes del colectivo en obras GNC/DTI",
                    "target": "> 0.0",
                    "current": f"{icoh:+.3f} ({coauthored_products_count} coautorías)",
                    "unit": "",
                    "met": cohesion_met,
                },
                {
                    "id": "calidad_top_a",
                    "label": "Calidad de Producción (TOP o Tipo A)",
                    "description": "Al menos 1 obra Tipo TOP o Tipo A en ventana",
                    "target": 1,
                    "current": top_count + type_a_count,
                    "unit": "obras TOP/A",
                    "met": (top_count + type_a_count) >= 1,
                },
                {
                    "id": "apropiacion_divulgacion",
                    "label": "Apropiación o Divulgación (ASC/DPC)",
                    "description": "Al menos 1 producto de Apropiación Social o Divulgación en ventana",
                    "target": 1,
                    "current": asc_count + dpc_count,
                    "unit": "obras ASC/DPC",
                    "met": (asc_count + dpc_count) >= 1,
                },
                {
                    "id": "formacion_talento",
                    "label": "Formación de Talento Humano",
                    "description": "Al menos 1 FRH Tipo A (Doctoral) ó al menos 2 FRH Tipo B (Maestría/Pregrado)",
                    "target": "1 Dr. ó 2 Ms./Pre.",
                    "current": f"{frh_a_count} Dr. / {frh_b_count} Ms./Pre.",
                    "unit": "",
                    "met": (frh_a_count >= 1) or (frh_b_count >= 2),
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción en Ventana",
                    "description": "Volumen acumulado en ventanas diferenciadas",
                    "target": 8,
                    "current": products_in_window,
                    "unit": "productos",
                    "met": products_in_window >= 8,
                },
            ],
        },
        {
            "tier": "A",
            "title": "Categoría A",
            "description": "Fase 2: Alto impacto, cohesión comprobada, desarrollo tecnológico y formación doctoral.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Consolidación temporal obligatoria",
                    "target": 5,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 5,
                },
                {
                    "id": "cohesion",
                    "label": "Indicador de Cohesión (IC > 0)",
                    "description": "Coautoría interna obligatoria en obras de conocimiento e innovación",
                    "target": "> 0.0",
                    "current": f"{icoh:+.3f} ({coauthored_products_count} coautorías)",
                    "unit": "",
                    "met": cohesion_met,
                },
                {
                    "id": "calidad_top_a",
                    "label": "Calidad y Desarrollo Tecnológico",
                    "description": "Al menos 2 obras Tipo TOP o Tipo A (incluyendo software, patentes o prototipos)",
                    "target": 2,
                    "current": top_count + type_a_count,
                    "unit": "obras TOP/A",
                    "met": (top_count + type_a_count) >= 2,
                },
                {
                    "id": "apropiacion_divulgacion",
                    "label": "Apropiación o Divulgación (ASC/DPC)",
                    "description": "Al menos 1 producto de Apropiación Social o Divulgación en ventana",
                    "target": 1,
                    "current": asc_count + dpc_count,
                    "unit": "obras ASC/DPC",
                    "met": (asc_count + dpc_count) >= 1,
                },
                {
                    "id": "formacion_doctoral",
                    "label": "Formación Doctoral (FRH Tipo A)",
                    "description": "Obligatorio en Universidades: al menos 1 Tesis Doctoral dirigida y aprobada",
                    "target": 1,
                    "current": frh_a_count,
                    "unit": "tesis doctorales",
                    "met": frh_a_count >= 1,
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción en Ventana",
                    "description": "Mínimo de obras en ventana diferenciada",
                    "target": 15,
                    "current": products_in_window,
                    "unit": "productos",
                    "met": products_in_window >= 15,
                },
            ],
        },
        {
            "tier": "A1",
            "title": "Categoría A1 (Máxima Distinción)",
            "description": "Fase 2: Liderazgo científico de punta, productos TOP, transferencia tecnológica y cuerpo doctoral.",
            "reqs": [
                {
                    "id": "antiguedad",
                    "label": "Antigüedad mínima",
                    "description": "Trayectoria institucional de excelencia",
                    "target": 5,
                    "current": years_active,
                    "unit": "años",
                    "met": years_active >= 5,
                },
                {
                    "id": "cohesion",
                    "label": "Indicador de Cohesión (IC > 0)",
                    "description": "Cohesión interna sólida y continua",
                    "target": "> 0.0",
                    "current": f"{icoh:+.3f} ({coauthored_products_count} coautorías)",
                    "unit": "",
                    "met": cohesion_met,
                },
                {
                    "id": "calidad_top",
                    "label": "Producción Tipo TOP Obligatoria",
                    "description": "Al menos 2 productos Tipo TOP en ventana (Q1/A1, patentes concedidas, libros A1)",
                    "target": 2,
                    "current": top_count,
                    "unit": "obras TOP",
                    "met": top_count >= 2,
                },
                {
                    "id": "desarrollo_tecnologico",
                    "label": "Desarrollo Tecnológico (DTI)",
                    "description": "Transferencia tecnológica demostrable: software registrado o prototipos",
                    "target": 2,
                    "current": dti_count,
                    "unit": "obras DTI",
                    "met": dti_count >= 2,
                },
                {
                    "id": "apropiacion_divulgacion",
                    "label": "Apropiación o Divulgación (ASC/DPC)",
                    "description": "Al menos 1 producto de Apropiación Social o Divulgación en ventana",
                    "target": 1,
                    "current": asc_count + dpc_count,
                    "unit": "obras ASC/DPC",
                    "met": (asc_count + dpc_count) >= 1,
                },
                {
                    "id": "formacion_doctoral",
                    "label": "Formación Doctoral (FRH Tipo A)",
                    "description": "Tesis Doctoral dirigida y aprobada",
                    "target": 1,
                    "current": frh_a_count,
                    "unit": "tesis doctorales",
                    "met": frh_a_count >= 1,
                },
                {
                    "id": "produccion_ventana",
                    "label": "Producción de Excelencia en Ventana",
                    "description": "Mínimo de obras de alto impacto en ventana",
                    "target": 25,
                    "current": products_in_window,
                    "unit": "productos",
                    "met": products_in_window >= 25,
                },
            ],
        },
    ]

    evaluated_tiers = []
    max_qualified_tier = "Sin clasificar"
    tier_order = ["Reconocido", "C", "B", "A", "A1"]

    for config in tiers_config:
        reqs = config["reqs"]
        met_count = sum(1 for r in reqs if r["met"])
        total_reqs = len(reqs)
        pct = round((met_count / total_reqs) * 100, 1)
        qualifies = (met_count == total_reqs)

        missing_summary = []
        for r in reqs:
            if not r["met"]:
                missing_summary.append(f"{r['label']} (Requerido: {r['target']} {r['unit']}, Actual: {r['current']})")

        evaluated_tiers.append({
            "tier": config["tier"],
            "title": config["title"],
            "description": config["description"],
            "qualifies": qualifies,
            "completion_percentage": pct,
            "requirements": reqs,
            "missing_summary": missing_summary,
        })

        if qualifies:
            max_qualified_tier = config["tier"]

    # Calcular siguiente nivel a alcanzar y brecha específica
    current_tier_idx = tier_order.index(max_qualified_tier) if max_qualified_tier in tier_order else -1
    next_tier = None
    next_tier_gap = []
    next_tier_progress = 100.0

    if current_tier_idx < len(tier_order) - 1:
        next_tier_config = evaluated_tiers[current_tier_idx + 1]
        next_tier = next_tier_config["tier"]
        next_tier_progress = next_tier_config["completion_percentage"]
        next_tier_gap = next_tier_config["missing_summary"]

    return {
        "group_id": group_id,
        "group_name": group.name,
        "current_classification": _clean_classification(group.classification),
        "raw_classification": group.classification or "",
        "max_qualified_tier": max_qualified_tier,
        "next_tier": next_tier,
        "next_tier_progress": next_tier_progress,
        "next_tier_gap": next_tier_gap,
        "summary": {
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
            # Métricas oficiales Minciencias 2024 añadidas:
            "cohesion_index": icoh,
            "cohesion_met": cohesion_met,
            "top_count": top_count,
            "type_a_count": type_a_count,
            "type_b_count": type_b_count,
            "frh_a_count": frh_a_count,
            "frh_b_count": frh_b_count,
            "asc_dpc_count": asc_count + dpc_count,
            "coauthored_products_count": coauthored_products_count,
        },
        "tiers": evaluated_tiers,
    }
