from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from ... import repository
from ...config import settings
from ..common import _reload_ram_from_db

router = APIRouter()

# -------------------------------------------------------------------
# Scraping & Ingestion endpoints (Taller 2 - Requerimiento 7)
# -------------------------------------------------------------------

class EnrichRequest(BaseModel):
    only_missing: bool = True
    limit: int = 0  # 0 = sin límite


@router.post("/researchers/enrich/datos-abiertos", tags=["Ingestion"])
async def enrich_researchers_endpoint(req: EnrichRequest):
    """
    Enriquece investigadores desde el dataset oficial «Investigadores Reconocidos
    por convocatoria» (datos.gov.co / Socrata) usando su cod_rh — sin scraping.
    Rellena nivel de formación, nacionalidad, residencia y clasificación Minciencias.
    """
    from ... import datos_abiertos
    return datos_abiertos.enrich_all(only_missing=req.only_missing, limit=req.limit)


@router.post("/researchers/{res_id}/enrich/datos-abiertos", tags=["Ingestion"])
async def enrich_single_researcher_endpoint(res_id: int):
    """Enriquece un único investigador por su cod_rh contra datos abiertos."""
    from ... import datos_abiertos
    try:
        return datos_abiertos.enrich_researcher(res_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Researcher not found")


class CvlacImportRequest(BaseModel):
    text: str
    target_group_code: Optional[str] = "COL0011545"


class CvlacFetchRequest(BaseModel):
    cod_rh: str
    target_group_code: Optional[str] = None


@router.post("/researchers/import/cvlac/by-cod-rh", tags=["Ingestion"])
async def import_cvlac_by_cod_rh_endpoint(req: CvlacFetchRequest):
    """
    Descarga automáticamente el CvLAC público de un investigador por su cod_rh
    (Scienti/Minciencias), lo parsea y lo persiste con sus productos.
    Alternativa automatizada al pegado manual de texto.
    """
    from ...cvlac_scraper import CvParser, CvCommitService, fetch_cvlac_text
    conn_str = repository._active_connection_string or settings.connection_string
    try:
        text = fetch_cvlac_text(req.cod_rh)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    cv = CvParser.parse_text(text)
    # Reconciliación: usar el cod_rh como external_code para ACTUALIZAR al
    # investigador que GrupLAC ya creó, en lugar de duplicarlo.
    cv.external_code = "".join(c for c in req.cod_rh if c.isdigit()).zfill(10)
    if req.target_group_code:
        cv.target_group_code = req.target_group_code
    result = CvCommitService.commit_cvlac(cv, conn_str)
    result["ram_reloaded"] = _reload_ram_from_db(conn_str)
    return result


class GruplacImportRequest(BaseModel):
    url: Optional[str] = None
    group_code: Optional[str] = None  # "COL0016283" o nro crudo de GrupLAC
    enrich_cvlac: bool = False


@router.get("/groups/search/scienti", tags=["Ingestion"])
async def search_groups_endpoint(
    q: str = "",
    departamento: Optional[str] = None,
    institucion: Optional[str] = None,
    clasificacion: Optional[str] = None,
    limit: int = 50,
):
    """
    Busca grupos en el buscador oficial de Scienti (busquedaAvanzadaGrupos.do)
    por nombre, institución y departamento. Devuelve cada candidato con el nro
    REAL de GrupLAC y su URL lista para vista previa/importación.
    Scienti es la única fuente de verdad para identidad de grupos.
    """
    from ...scraper import buscar_grupos_scienti
    return buscar_grupos_scienti(
        nombre=q, institucion=institucion or "", departamento=departamento or "",
        clasificacion=clasificacion or "", limit=min(limit, 200),
    )


@router.post("/researchers/import/cvlac", tags=["Ingestion"])
async def import_cvlac_endpoint(req: CvlacImportRequest):
    """Import an individual researcher and their scientific products from CvLAC text."""
    from ...cvlac_scraper import CvParser, CvCommitService
    conn_str = repository._active_connection_string or settings.connection_string
    cv = CvParser.parse_text(req.text)
    # Si el usuario pegó el HTML crudo de la página, parse_text ya lo procesa con
    # el extractor DOM; si pegó texto plano, el ORCID no se puede recuperar (el
    # código solo vive en el href del ancla).
    if req.target_group_code:
        cv.target_group_code = req.target_group_code
    result = CvCommitService.commit_cvlac(cv, conn_str)
    result["ram_reloaded"] = _reload_ram_from_db(conn_str)
    return result


@router.post("/groups/import/gruplac/preview", tags=["Ingestion"])
async def preview_gruplac_endpoint(req: GruplacImportRequest):
    """
    Phase 1 of GrupLAC import: download and parse the public page, returning the
    extracted DTO for human review WITHOUT persisting anything (Revisión §16/§29).
    """
    from ...scraper import scrape_gruplac
    from ...datos_abiertos_grupos import resolver_url_gruplac_ex
    try:
        url, via = resolver_url_gruplac_ex(req.url, req.group_code)
        # La validación de código solo aplica al intento débil por dígitos:
        # el buscador oficial ya resolvió autoritativamente (los esquemas de
        # código de la página GrupLAC y de datos abiertos difieren).
        expected = (req.group_code or "") if via == "digitos" else ""
        return scrape_gruplac(url, preview=True, expected_group_code=expected)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/groups/import/gruplac", tags=["Ingestion"])
async def import_gruplac_endpoint(req: GruplacImportRequest):
    """
    Phase 2 of GrupLAC import (confirm): import a research group and its full
    catalog atomically from Minciencias GrupLAC URL after reviewing the preview.
    """
    from ...scraper import scrape_gruplac
    from ...datos_abiertos_grupos import resolver_url_gruplac_ex
    conn_str = repository._active_connection_string or settings.connection_string
    try:
        url, via = resolver_url_gruplac_ex(req.url, req.group_code)
        expected = (req.group_code or "") if via == "digitos" else ""
        result = scrape_gruplac(url, conn_str, enrich_cvlac=req.enrich_cvlac, expected_group_code=expected)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    result["ram_reloaded"] = _reload_ram_from_db(conn_str)
    return result


@router.post("/groups/import/csv/preview", tags=["Ingestion"])
async def preview_csv_import_endpoint(file: UploadFile = File(...)):
    """
    T-12 phase 1: parse the official datos.gov.co groups CSV (dataset
    hrhc-c4wu) and return what would be imported WITHOUT persisting anything
    (Revisión §16/§29: preview antes de confirmar). HTTP 400 if the file is
    not the expected dataset or exceeds MAX_GROUPS_PER_IMPORT groups.
    """
    from ...import_csv import CsvImportError, parse_csv_grupos
    try:
        parsed = parse_csv_grupos(await file.read())
    except CsvImportError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {
        "status": "preview",
        "total_data_rows": parsed.total_data_rows,
        "distinct_groups": parsed.distinct_groups,
        "deduped_count": parsed.deduped_count,
        "rows": [{k: v for k, v in row.items() if k != "scraped"} for row in parsed.rows],
        "row_errors": parsed.row_errors,
    }


@router.post("/groups/import/csv", tags=["Ingestion"])
async def import_csv_endpoint(file: UploadFile = File(...), enrich_gruplac: bool = Form(False)):
    """
    T-12 phase 2 (confirm): import the CSV row by row; each row is an
    independent transaction so one failure never aborts the batch. Without
    enrich_gruplac each row writes just its file data; with it, each row
    resolves its GrupLAC page through the official search endpoint and
    scrapes the full group, falling back to file data on failure. The C++
    RAM is reloaded ONCE at the end, never per row.
    """
    from ...import_csv import CsvImportError, import_csv_rows, parse_csv_grupos
    conn_str = repository._active_connection_string or settings.connection_string
    try:
        parsed = parse_csv_grupos(await file.read())
    except CsvImportError as e:
        raise HTTPException(status_code=400, detail=str(e))
    result = import_csv_rows(
        parsed.rows,
        db_conn_str=conn_str,
        enrich_gruplac=enrich_gruplac,
        source_name=file.filename or "",
    )
    result["row_errors"] = parsed.row_errors
    result["ram_reloaded"] = _reload_ram_from_db(conn_str)
    return result


@router.post("/groups/import/pdf/preview", tags=["Ingestion"])
async def preview_pdf_import_endpoint(file: UploadFile = File(...)):
    """
    T-13 phase 1: parse a GrupLAC-style group PDF (the system's own report or
    a print-to-PDF of the Scienti viewer) and return the SAME preview shape
    as the URL import so the frontend reuses its review card. Nothing
    persists. HTTP 400 on PDFs without a usable COL identity.
    """
    from ...import_pdf import PdfImportError, parse_pdf_gruplac
    from ...scraper import build_preview
    try:
        data = parse_pdf_gruplac(await file.read())
    except PdfImportError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return build_preview(data)


@router.post("/groups/import/pdf", tags=["Ingestion"])
async def import_pdf_endpoint(file: UploadFile = File(...)):
    """
    T-13 phase 2 (confirm): import the PDF group through the same atomic
    transactional commit as the URL import (ImportJob.source_type='pdf' for
    traceability). reload_ram=False because this endpoint reloads the C++ RAM
    once itself instead of paying commit's internal reload too.
    """
    from ...import_pdf import PdfImportError, parse_pdf_gruplac
    from ...scraper import GruplacCommitService
    conn_str = repository._active_connection_string or settings.connection_string
    try:
        data = parse_pdf_gruplac(await file.read())
    except PdfImportError as e:
        raise HTTPException(status_code=400, detail=str(e))
    result = GruplacCommitService.commit(
        data,
        db_conn_str=conn_str,
        source_type="pdf",
        source_url=f"pdf:{file.filename or data.group['external_code']}",
        reload_ram=False,
    )
    result["ram_reloaded"] = _reload_ram_from_db(conn_str)
    return result


@router.post("/groups/import/pdf-scienti/preview", tags=["Ingestion"])
async def preview_pdf_scienti_import_endpoint(file: UploadFile = File(...)):
    """
    Vista previa para PDFs generados al imprimir la página web oficial de Scienti GrupLAC.
    """
    from ...import_pdf_scienti import PdfScientiImportError, parse_pdf_scienti
    from ...scraper import build_preview
    try:
        data = parse_pdf_scienti(await file.read())
    except (PdfScientiImportError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    return build_preview(data)


@router.post("/groups/import/pdf-scienti", tags=["Ingestion"])
async def import_pdf_scienti_endpoint(file: UploadFile = File(...)):
    """
    Confirmación e importación atómica para PDFs de Scienti Web.
    """
    from ...import_pdf_scienti import PdfScientiImportError, parse_pdf_scienti
    from ...scraper import GruplacCommitService
    conn_str = repository._active_connection_string or settings.connection_string
    try:
        data = parse_pdf_scienti(await file.read())
    except (PdfScientiImportError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    result = GruplacCommitService.commit(
        data,
        db_conn_str=conn_str,
        source_type="pdf_scienti",
        source_url=f"pdf_scienti:{file.filename or data.group['external_code']}",
        reload_ram=False,
    )
    result["ram_reloaded"] = _reload_ram_from_db(conn_str)
    return result
