from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel

from ... import repository, reports
from ...models import Group, Researcher, Product, Project, WorkPlan, PagedResponse
from ...scraper import GruplacNormalizer

router = APIRouter()


# -------------------------------------------------------------------
# Group Endpoints (CRUD & Multilistas)
# -------------------------------------------------------------------

class AddMemberRequest(BaseModel):
    role: Optional[str] = "Investigador"
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""


@router.get("/groups", response_model=PagedResponse[Group], tags=["Groups"])
async def list_groups_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    classification: Optional[str] = None,
):
    """Return groups stored in the RAM repository with server-side pagination, search and filters."""
    all_groups = repository.list_groups()
    if search:
        s = search.lower()
        all_groups = [g for g in all_groups if (s in g.name.lower()) or (g.acronym and s in g.acronym.lower()) or (s in g.external_code.lower())]
    if status and status != 'all':
        all_groups = [g for g in all_groups if g.status == status]
    if classification and classification != 'all':
        c_norm = classification.strip().lower()
        if c_norm in ('none', 'unclassified', 'sin clasificar', 'sin clasificacion'):
            all_groups = [g for g in all_groups if not GruplacNormalizer.normalize_classification(g.classification or "")]
        else:
            all_groups = [g for g in all_groups if GruplacNormalizer.normalize_classification(g.classification or "").upper() == classification.strip().upper()]
    total = len(all_groups)
    return PagedResponse(items=all_groups[skip : skip + limit], total=total, skip=skip, limit=limit)


@router.get("/groups/{group_id}", response_model=Group, tags=["Groups"])
async def get_group_endpoint(group_id: int):
    """Retrieve a single group by its identifier."""
    try:
        return repository.get_group(group_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")


@router.post("/groups", response_model=Group, status_code=201, tags=["Groups"])
async def create_group_endpoint(group: Group):
    """Create a new research group with write-through to SQL Server."""
    clean_data = group.model_dump(exclude={"id"}, exclude_unset=True)
    new_group = repository.create_group(Group(**clean_data))
    return new_group


@router.put("/groups/{group_id}", response_model=Group, tags=["Groups"])
async def update_group_endpoint(group_id: int, updates: Group):
    """Update group metadata in RAM and write-through to SQL Server (Requerimiento 11)."""
    try:
        return repository.update_group(group_id, updates)
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")


@router.delete("/groups/{group_id}", tags=["Groups"])
async def delete_group_endpoint(group_id: int, soft: bool = Query(True, description="Si es True, realiza baja lógica status='inactive'")):
    """Deactivate or remove a group (Requerimiento 9)."""
    try:
        success = repository.delete_group(group_id, soft=soft)
        return {"status": "success", "group_id": group_id, "soft_delete": soft}
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")


@router.post("/groups/{group_id}/restore", tags=["Groups"])
async def restore_group_endpoint(group_id: int):
    """Reactivate a soft-deleted group (Requerimiento 9, inverso)."""
    try:
        repository.restore_group(group_id)
        return {"status": "success", "group_id": group_id}
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")


@router.get("/groups/{group_id}/members", response_model=List[Researcher], tags=["Groups"])
async def list_group_members(group_id: int):
    """Retrieve all researcher members belonging to this group (Multilista)."""
    try:
        rids = repository.members_of_group(group_id)
        members = []
        for rid in rids:
            try:
                members.append(repository.get_researcher(rid))
            except KeyError:
                pass
        return members
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/groups/{group_id}/members/{researcher_id}", tags=["Groups"])
async def add_member_endpoint(group_id: int, researcher_id: int, req: AddMemberRequest = AddMemberRequest()):
    """Link a researcher to a research group (Multilista write-through)."""
    try:
        repository.add_member_to_group(group_id, researcher_id, req.role or "Investigador", req.start_date or "", req.end_date or "")
        return {"status": "success", "group_id": group_id, "researcher_id": researcher_id, "role": req.role}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/groups/{group_id}/memberships", tags=["Groups"])
async def list_group_memberships(group_id: int):
    """Memberships of a group with role and dates (read from RAM C++ multilist)."""
    try:
        repository.get_group(group_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")
    return repository.get_group_members_detailed(group_id)


@router.put("/groups/{group_id}/members/{researcher_id}", tags=["Groups"])
async def update_member_endpoint(group_id: int, researcher_id: int, req: AddMemberRequest):
    """Update role and dates of an existing membership (keeps history, no unlink)."""
    try:
        repository.update_member(group_id, researcher_id, req.role or "Investigador", req.start_date or "", req.end_date or "")
        return {"status": "success", "group_id": group_id, "researcher_id": researcher_id}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/groups/{group_id}/members/{researcher_id}", tags=["Groups"])
async def remove_member_endpoint(group_id: int, researcher_id: int):
    """Unlink a researcher from a group (Multilista write-through)."""
    try:
        repository.remove_member_from_group(group_id, researcher_id)
        return {"status": "success", "group_id": group_id, "researcher_id": researcher_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/groups/{group_id}/products", response_model=List[Product], tags=["Groups"])
async def list_group_products(group_id: int):
    """Retrieve all products linked to this research group (Multilista)."""
    try:
        pids = repository.products_of_group(group_id)
        products = []
        for pid in pids:
            try:
                products.append(repository.get_product(pid))
            except KeyError:
                pass
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/groups/{group_id}/stats", tags=["Groups"])
async def get_group_stats_endpoint(group_id: int):
    """Retrieve statistical indicators, production dynamics, and author ranking for a research group."""
    try:
        return repository.get_group_stats(group_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/groups/{group_id}/minciencias-diagnosis", tags=["Groups"])
async def get_group_minciencias_diagnosis_endpoint(group_id: int):
    """Diagnóstico de categorización y semáforo de cumplimiento Minciencias 2024 para un grupo de investigación."""
    try:
        return repository.get_group_minciencias_diagnosis(group_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/groups/{group_id}/network", tags=["Groups"])
async def get_group_collaboration_network_endpoint(group_id: int):
    """Grafo de colaboración y red de coautorías internas entre investigadores del grupo."""
    try:
        return repository.get_group_collaboration_network(group_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/groups/{group_id}/projects", response_model=List[Project], tags=["Groups"])
async def list_group_projects(group_id: int):
    """Retrieve all projects linked to this research group."""
    try:
        return repository.get_group_projects(group_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/groups/{group_id}/research-lines", response_model=List[str], tags=["Groups"])
async def list_group_research_lines(group_id: int):
    """Retrieve all research lines linked to this research group."""
    try:
        return repository.get_group_research_lines(group_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/groups/{group_id}/report/pdf", tags=["Groups"])
async def get_group_report_pdf(
    group_id: int,
    start_year: Optional[int] = Query(None, description="Año inicial para Ventana de Observación (Requerimiento 10)"),
    end_year: Optional[int] = Query(None, description="Año final para Ventana de Observación (Requerimiento 10)"),
    window_years: Optional[int] = Query(None, description="Ventana de observación en años hacia atrás (ej. 2 o 5 años)"),
    unclassified: Optional[bool] = Query(None, description="Solo productos sin tipología 2024 (para reclasificar)"),
):
    """Informe PDF del grupo (estilo GrupLAC): datos basicos, integrantes,
    produccion agrupada por familia/subtipo Minciencias y proyectos.
    La produccion puede restringirse a una ventana de observación (Req. 10)."""
    try:
        pdf = reports.build_group_report_pdf(
            group_id, start_year=start_year, end_year=end_year, window_years=window_years
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando el informe: {e}")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="informe_grupo_{group_id}.pdf"'},
    )


@router.get("/groups/{group_id}/dossier/pdf", tags=["Groups"])
async def get_group_dossier_pdf(
    group_id: int,
    start_year: Optional[int] = Query(None, description="Año inicial para Ventana de Observación"),
    end_year: Optional[int] = Query(None, description="Año final para Ventana de Observación"),
    window_years: Optional[int] = Query(None, description="Ventana de observación en años hacia atrás"),
):
    """Dossier Ejecutivo de Gestión Científica Oficial UPC (Fase 4):
    Diseñado para Decanatura y Vicerrectoría con portada institucional, KPIs ejecutivos,
    diagnóstico Minciencias 2024, familias, dinámica quinquenal, ranking de investigadores,
    métricas de red y bloque de formalización de firmas."""
    try:
        pdf = reports.build_group_executive_dossier_pdf(
            group_id, start_year=start_year, end_year=end_year, window_years=window_years
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando el dossier ejecutivo: {e}")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="dossier_ejecutivo_grupo_{group_id}.pdf"'},
    )


@router.get("/groups/{group_id}/export/ranking.csv", tags=["Groups"])
async def get_group_ranking_csv(group_id: int):
    """Exporta el ranking de investigadores del colectivo en formato CSV delimitado por
    punto y coma (;) con codificación UTF-8 BOM para apertura directa en Microsoft Excel."""
    try:
        csv_content = reports.export_group_ranking_csv(group_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exportando el ranking: {e}")
    return Response(
        content=csv_content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="ranking_investigadores_grupo_{group_id}.csv"'},
    )


@router.get("/groups/{group_id}/export/products.csv", tags=["Groups"])
async def get_group_products_csv(
    group_id: int,
    start_year: Optional[int] = Query(None, description="Año inicial para Ventana de Observación"),
    end_year: Optional[int] = Query(None, description="Año final para Ventana de Observación"),
    window_years: Optional[int] = Query(None, description="Ventana de observación en años hacia atrás"),
):
    """Exporta el catálogo de productos científicos del grupo en formato CSV delimitado por
    punto y coma (;) con codificación UTF-8 BOM, admitiendo filtros temporales."""
    try:
        csv_content = reports.export_group_products_csv(
            group_id, start_year=start_year, end_year=end_year, window_years=window_years
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exportando catálogo de productos: {e}")
    return Response(
        content=csv_content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="productos_grupo_{group_id}.csv"'},
    )


@router.post("/groups/{group_id}/products/{product_id}", tags=["Groups"])
async def link_product_endpoint(group_id: int, product_id: int):
    """Link a scientific product to a research group."""
    try:
        repository.link_product_to_group(group_id, product_id)
        return {"status": "success", "group_id": group_id, "product_id": product_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/groups/{group_id}/products/{product_id}", tags=["Groups"])
async def unlink_product_endpoint(group_id: int, product_id: int):
    """Unlink a product from a research group."""
    try:
        repository.unlink_product_from_group(group_id, product_id)
        return {"status": "success", "group_id": group_id, "product_id": product_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/groups/{group_id}/projects", tags=["Groups"])
async def link_project_endpoint(group_id: int, project: Project):
    """Link (and create if not exists) a project to a research group."""
    try:
        pid = repository.link_project_to_group(group_id, project)
        return {"status": "success", "group_id": group_id, "project_id": pid}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/groups/{group_id}/projects/{project_id}", tags=["Groups"])
async def unlink_project_endpoint(group_id: int, project_id: int):
    """Unlink a project from a research group."""
    try:
        repository.unlink_project_from_group(group_id, project_id)
        return {"status": "success", "group_id": group_id, "project_id": project_id}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ResearchLineRequest(BaseModel):
    name: str


@router.post("/groups/{group_id}/research-lines", tags=["Groups"])
async def link_research_line_endpoint(group_id: int, req: ResearchLineRequest):
    """Link a research line to a group."""
    try:
        line_id = repository.link_research_line_to_group(group_id, req.name)
        return {"status": "success", "group_id": group_id, "line_id": line_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/groups/{group_id}/research-lines/{line_name}", tags=["Groups"])
async def unlink_research_line_endpoint(group_id: int, line_name: str):
    """Unlink a research line from a group."""
    try:
        repository.unlink_research_line_from_group(group_id, line_name)
        return {"status": "success", "group_id": group_id, "line_name": line_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------------------
# WorkPlan Endpoints (T-08: planes de trabajo por grupo)
# -------------------------------------------------------------------

@router.get("/groups/{group_id}/plans", response_model=List[WorkPlan], tags=["Groups"])
async def list_group_plans(group_id: int):
    """Retrieve the work plans of a research group (Multilista Grupo → planes)."""
    try:
        return repository.list_work_plans_of_group(group_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")


@router.post("/groups/{group_id}/plans", response_model=WorkPlan, status_code=201, tags=["Groups"])
async def create_plan_endpoint(group_id: int, plan: WorkPlan):
    """Create a work plan for a group (write-through to SQL Server)."""
    try:
        plan.group_id = group_id
        return repository.create_work_plan(plan)
    except KeyError:
        raise HTTPException(status_code=404, detail="Group not found")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
