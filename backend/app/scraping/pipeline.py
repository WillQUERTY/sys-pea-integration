import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict

from .. import repository
from .client import GruplacHttpClient
from .commit_service import GruplacCommitService
from .constants import logger
from .dtos import ScrapedGroupData
from .parser import GruplacHtmlParser


def build_preview(scraped_data: ScrapedGroupData) -> Dict[str, Any]:
    """Vista previa de la extracción SIN persistir nada (Revisión §16/§29: preview antes de confirmar)."""
    return {
        "status": "preview",
        "group": scraped_data.group,
        "institutions": scraped_data.institutions,
        "research_lines": scraped_data.research_lines,
        "work_plan_text": scraped_data.work_plan_text[:500],
        "members": [
            {
                "display_name": m.display_name,
                "cod_rh": m.cod_rh,
                "role": m.role,
                "period_raw": m.period_raw,
                "start_date": m.start_date,
                "end_date": m.end_date,
                "is_current": m.is_current,
                "is_leader_candidate": m.is_leader_candidate,
            } for m in scraped_data.members
        ],
        "products": [
            {
                "title": p.title,
                "section": p.section,
                "subtype_code": p.subtype_code,
                "year": p.year,
                "doi": p.doi,
                "external_code": p.external_code,
                "authors": [a.display_name for a in p.authors],
                "is_endorsed": p.is_endorsed,
            } for p in scraped_data.products
        ],
        "projects": [
            {"title": pr.title, "year": pr.year} for pr in scraped_data.projects
        ],
        "skipped_sections": scraped_data.skipped_sections,
        "warnings": scraped_data.warnings,
        "counts": {
            "members": len(scraped_data.members),
            "products": len(scraped_data.products),
            "endorsed_products": sum(1 for p in scraped_data.products if p.is_endorsed),
            "projects": len(scraped_data.projects),
            "research_lines": len(scraped_data.research_lines),
        }
    }


def enrich_members_with_cvlac(scraped_data: ScrapedGroupData, db_conn_str: str, group_code: str, delay_seconds: float = 0.0, max_workers: int = 1) -> Dict[str, Any]:
    """
    Enriquecimiento CvLAC en cascada (opcional): tras importar el grupo, descarga
    automáticamente el CvLAC de cada integrante con cod_rh y lo persiste con sus
    productos.
    """
    # Import diferido para evitar ciclos entre cvlac_scraper y scraping
    from ..cvlac_scraper import CvCommitService, CvParser, fetch_cvlac_text

    report: Dict[str, Any] = {"attempted": 0, "enriched": 0, "failed": 0, "details": []}
    members_with_rh = [m for m in scraped_data.members if m.cod_rh]

    def _enrich_one(member) -> Dict[str, Any]:
        current_delay = delay_seconds
        last_error = None
        for attempt in range(2):
            if current_delay > 0:
                time.sleep(current_delay)
            try:
                text = fetch_cvlac_text(member.cod_rh)
                cv = CvParser.parse_text(text)
                cv.external_code = "".join(c for c in member.cod_rh if c.isdigit()).zfill(10)
                cv.target_group_code = group_code
                res = CvCommitService.commit_cvlac(cv, db_conn_str, reload_ram=False)
                return {
                    "cod_rh": member.cod_rh,
                    "name": res.get("researcher_name", member.display_name),
                    "status": "enriched",
                    "articles": res.get("articles", 0),
                    "events": res.get("events", 0),
                    "projects": res.get("projects", 0),
                }
            except Exception as e:
                last_error = e
                logger.warning(f"[CvLAC] Intento {attempt + 1} falló para {member.cod_rh}: {e}")
                current_delay = max(current_delay * 4.0, 1.0)

        return {
            "cod_rh": member.cod_rh,
            "name": member.display_name,
            "status": "failed",
            "error": str(last_error),
        }

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        for detail in pool.map(_enrich_one, members_with_rh):
            report["attempted"] += 1
            report["details"].append(detail)
            report["enriched" if detail["status"] == "enriched" else "failed"] += 1

    try:
        repository.load_from_db(db_conn_str)
    except Exception as e:
        logger.warning(f"[CvLAC] No se pudo recargar la RAM nativa tras la cascada: {e}")

    return report


def scrape_gruplac(url: str, db_conn_str: str = "", preview: bool = False, enrich_cvlac: bool = False, cvlac_workers: int = 8, expected_group_code: str = "", cvlac_delay: float = 0.5, source_type: str = "url", source_url: str = "", reload_ram: bool = True) -> Dict[str, Any]:
    print("=" * 65)
    print(f"Khemia Importador GrupLAC (Estructural e Idempotente en SQL)")
    print(f"URL: {url}")
    print("=" * 65)

    # 1. Descarga con validación de host y codificación
    html_content = GruplacHttpClient.fetch(url)

    # 2. Parseo estructural en DTO
    scraped_data = GruplacHtmlParser.parse(html_content, source_url=url)

    # 2.2 Validación de grupo esperado
    if expected_group_code:
        expected = "".join(c for c in expected_group_code if c.isdigit()).lstrip("0")
        found = "".join(c for c in scraped_data.group.get("external_code", "") if c.isdigit()).lstrip("0")
        if expected and found and expected != found:
            raise ValueError(
                f"La URL no corresponde al grupo {expected_group_code}: la página muestra "
                f"'{scraped_data.group.get('name')}' ({scraped_data.group.get('external_code')}). "
                "Pega la URL exacta desde el buscador de Scienti/GrupLAC."
            )
    print(f"[OK] Extraccion estructural finalizada:")
    print(f"     - Grupo: {scraped_data.group['name']} ({scraped_data.group['external_code']})")
    print(f"     - Miembros detectados: {len(scraped_data.members)}")
    print(f"     - Productos cientificos: {len(scraped_data.products)}")
    print(f"     - Proyectos: {len(scraped_data.projects)}")
    print(f"     - Lineas de investigacion: {len(scraped_data.research_lines)}")

    # 2.5 Modo vista previa
    if preview:
        print("[PREVIEW] Modo vista previa: no se escribio nada en la base de datos.")
        return build_preview(scraped_data)

    # 3. Compromiso transaccional idempotente
    result = GruplacCommitService.commit(scraped_data, db_conn_str=db_conn_str, source_type=source_type, source_url=source_url, reload_ram=reload_ram)

    # 3.5 Enriquecimiento CvLAC en cascada (opcional, post-commit)
    if enrich_cvlac:
        group_code = scraped_data.group.get("external_code", "")
        print(f"[CvLAC] Enriqueciendo {len([m for m in scraped_data.members if m.cod_rh])} integrantes con cod_rh...")
        result["cvlac_enrichment"] = enrich_members_with_cvlac(scraped_data, db_conn_str, group_code, delay_seconds=cvlac_delay, max_workers=cvlac_workers)
        print(f"[CvLAC] Enriquecidos: {result['cvlac_enrichment']['enriched']} | Fallidos: {result['cvlac_enrichment']['failed']}")

    print("=" * 65)
    print(f"[SUCCESS] Importacion completada. Job ID: {result.get('job_id')}")
    print(f"          Total procesados: {result.get('total_records')} | Nuevos: {result.get('new_records')}")
    print("=" * 65)
    return result
