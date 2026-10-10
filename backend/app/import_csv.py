"""
T-12: Importacion de grupos desde CSV (Taller 2, req. 7).

Fuente: dataset oficial de MinCiencias en datos.gov.co (Socrata hrhc-c4wu
"Grupos de Investigacion Reconocidos", 21 columnas). El CSV trae solo datos
basicos del grupo: cada fila produce un grupo minimo sin integrantes ni
productos.

Enriquecimiento opcional (enrich_gruplac): cada fila resuelve el nro interno
de GrupLAC SOLO via el buscador oficial de Scienti (el nro NO se deriva de
digitos del codigo COL; ver datos_abiertos_grupos) y scrapea la pagina
completa. Si la resolucion o el scrapeo fallan, la fila cae a los datos del
archivo. Cada fila es una transaccion independiente: un fallo no aborta el
lote.
"""

import csv
import io
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from . import scraper
from .datos_abiertos_grupos import GRUPLAC_VIEWER_BASE

# Tope de grupos distintos por importacion: cada fila enriquecida son 2+
# descargas a Scienti y el scraper de URL es la via natural para lotes
# grandes. El usuario filtra la descarga en datos.gov.co antes de subir.
MAX_GROUPS_PER_IMPORT = 200

REQUIRED_COLUMNS = ("cod_grupo_gr", "nme_grupo_gr")

# Marcadores de vacio que usa el dataset ("No registra") y lecturas pandas
# de ejemplo flotando en la web ("nan", "null").
EMPTY_VALUES = {"", "no registra", "nan", "null", "none"}

COL_CODE_RE = re.compile(r"^COL\d{5,14}$")


class CsvImportError(ValueError):
    """Errores fatales de parseo/validacion del CSV (el endpoint los mapea a HTTP 400)."""


@dataclass
class CsvParseResult:
    rows: List[Dict[str, Any]] = field(default_factory=list)      # entradas validas, dedupeadas
    row_errors: List[Dict[str, Any]] = field(default_factory=list)  # [{"line": N, "error": "..."}]
    total_data_rows: int = 0
    deduped_count: int = 0

    @property
    def distinct_groups(self) -> int:
        return len(self.rows)


def _decode(file_bytes: bytes) -> str:
    """utf-8(-sig) primero (los CSV de Socrata bajan con BOM); latin-1 de
    respaldo para exportaciones con acentos destrozados."""
    try:
        return file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1", errors="replace")


def _clean(value: Any) -> str:
    """Normaliza un valor crudo y trata los marcadores de vacio como ''."""
    s = scraper.GruplacNormalizer.normalize(value)
    return "" if s.lower() in EMPTY_VALUES else s


def _to_int(value: Any) -> Optional[int]:
    """Convierte numericos Socrata inconsistentes ('16.0' vs '16') a int."""
    s = _clean(value)
    if not s:
        return None
    m = re.search(r"-?\d+", s)
    return int(m.group(0)) if m else None


def _parse_fcreacion(value: Any) -> str:
    """'1993-02-01T00:00:00.000' (ISO Socrata) -> 'YYYY-MM' (input type=month
    de la UI). Otros formatos caen al normalizador de 'Ano y mes'."""
    s = _clean(value)
    if not s:
        return ""
    m = re.match(r"^(\d{4})-(\d{1,2})", s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}"
    return scraper.GruplacNormalizer.normalize_year_month(s)


def _row_to_scraped(row: Dict[str, str]) -> scraper.ScrapedGroupData:
    """Una fila del CSV -> DTO que consume GruplacCommitService. ValueError si
    la fila no trae identidad utilizable."""
    code = _clean(row.get("cod_grupo_gr"))
    if not COL_CODE_RE.match(code):
        raise ValueError(
            f"codigo de grupo invalido: '{code}'. Se espera el cod_grupo_gr del "
            "dataset oficial (formato COL...)."
        )
    name = _clean(row.get("nme_grupo_gr"))
    if not name:
        raise ValueError("la fila no trae nombre de grupo (nme_grupo_gr).")

    gran_area = (
        _clean(row.get("nme_gran_area_gr"))
        or _clean(row.get("nme_area_gr"))
        or _clean(row.get("nme_area_esp_gr"))
    )
    inst = _clean(row.get("inst_aval"))
    # El dataset trae municipio/departamento con case inconsistente
    # ("Bogota, D. C." vs "Bogota, D.C."); title() los alinea con la UI.
    city = _clean(row.get("nme_municipio_gr")).title()
    department = _clean(row.get("nme_departamento_gr")).title()

    return scraper.ScrapedGroupData(
        group={
            "external_code": code,
            "name": name,
            "leader_name": "",
            "classification": scraper.GruplacNormalizer.normalize_classification(
                _clean(row.get("nme_clasificacion_gr"))
            ),
            "email": "",
            "website": "",
            "city": city,
            "department": department,
            "declared_creation_date": _parse_fcreacion(row.get("fcreacion_gr")),
            "knowledge_area": gran_area,
        },
        institutions=[inst] if inst else [],
    )


def parse_csv_grupos(file_bytes: bytes) -> CsvParseResult:
    """
    Parsea el CSV oficial de grupos (datos.gov.co hrhc-c4wu).

    - Encabezados case/espacio insensibles (se normalizan a minusculas).
    - Filas invalidas se reportan en row_errors sin abortar el resto.
    - Dedupe por codigo COL conservando la convocatoria (ano_convo) mas
      reciente; empate -> ultima fila (deduped_count cuenta las descartadas).
    - Mas de MAX_GROUPS_PER_IMPORT grupos distintos o cero filas validas ->
      CsvImportError.
    """
    if not file_bytes or not file_bytes.strip():
        raise CsvImportError("El archivo esta vacio.")

    reader = csv.reader(io.StringIO(_decode(file_bytes)))
    raw_headers = next(reader, None)
    if not raw_headers or not [h for h in raw_headers if h.strip()]:
        raise CsvImportError(
            "El CSV no trae encabezados. Descarga el dataset oficial desde "
            "datos.gov.co ('Grupos de Investigacion Reconocidos' > Exportar > CSV)."
        )
    headers = [scraper.GruplacNormalizer.normalize(h).lower() for h in raw_headers]
    missing = [c for c in REQUIRED_COLUMNS if c not in headers]
    if missing:
        raise CsvImportError(
            f"Al CSV le faltan columnas obligatorias: {', '.join(missing)}. "
            "Se espera el dataset oficial de grupos (datos.gov.co, hrhc-c4wu) "
            "con sus 21 columnas."
        )

    parsed: Dict[str, Dict[str, Any]] = {}  # external_code -> entrada vigente
    row_errors: List[Dict[str, Any]] = []
    total_data_rows = 0

    for lineno, values in enumerate(reader, start=2):
        if not any(v.strip() for v in values):
            continue  # filas totalmente vacias (trailing newlines)
        total_data_rows += 1
        row = {h: (values[i] if i < len(values) else "") for i, h in enumerate(headers)}
        try:
            scraped = _row_to_scraped(row)
        except ValueError as exc:
            row_errors.append({"line": lineno, "error": str(exc)})
            continue
        ano_convo = _to_int(row.get("ano_convo"))
        code = scraped.group["external_code"]
        prev = parsed.get(code)
        if prev is None:
            parsed[code] = {"scraped": scraped, "ano_convo": ano_convo}
        elif ano_convo is not None and (prev["ano_convo"] is None or ano_convo >= prev["ano_convo"]):
            parsed[code] = {"scraped": scraped, "ano_convo": ano_convo}

    if not total_data_rows:
        raise CsvImportError("El CSV no trae filas de datos.")
    if not parsed:
        raise CsvImportError(
            "Ninguna fila del CSV es importable. " + " ".join(e["error"] for e in row_errors[:3])
        )
    if len(parsed) > MAX_GROUPS_PER_IMPORT:
        raise CsvImportError(
            f"El CSV trae {len(parsed)} grupos distintos; el maximo por "
            f"importacion es {MAX_GROUPS_PER_IMPORT}. Filtra la descarga en "
            "datos.gov.co (p. ej. por departamento o convocatoria) antes de subirla."
        )

    rows = []
    for entry in parsed.values():
        g = entry["scraped"].group
        rows.append({
            "external_code": g["external_code"],
            "name": g["name"],
            "classification": g["classification"],
            "city": g["city"],
            "department": g["department"],
            "declared_creation_date": g["declared_creation_date"],
            "knowledge_area": g["knowledge_area"],
            "institutions": list(entry["scraped"].institutions),
            "ano_convo": entry["ano_convo"],
            "scraped": entry["scraped"],
        })

    return CsvParseResult(
        rows=rows,
        row_errors=row_errors,
        total_data_rows=total_data_rows,
        deduped_count=total_data_rows - len(row_errors) - len(rows),
    )


def import_csv_rows(
    rows: List[Dict[str, Any]],
    db_conn_str: str = "",
    enrich_gruplac: bool = False,
    source_name: str = "",
    delay_seconds: float = 1.0,
) -> Dict[str, Any]:
    """
    Importa las entradas validas (parse_csv_grupos().rows) fila por fila.

    Estados por fila:
      - 'enriched': scrapeo GrupLAC completo OK (solo con enrich_gruplac).
      - 'file_data': commit de los datos del archivo (fallback o modo normal).
      - 'failed': ni enriquecimiento ni datos del archivo se pudieron escribir.

    reload_ram=False en cada commit: el caller (endpoint) recarga la RAM del
    nucleo UNA vez al terminar el lote (mismo patron que enrich_members_with_cvlac).
    """
    results: List[Dict[str, Any]] = []
    summary = {"total": len(rows), "enriched": 0, "file_data": 0, "failed": 0}

    for idx, entry in enumerate(rows):
        scraped: scraper.ScrapedGroupData = entry["scraped"]
        code = scraped.group["external_code"]
        source_url = f"csv:{source_name}:{code}" if source_name else f"csv:{code}"
        status, detail = "file_data", ""

        if enrich_gruplac:
            status = ""
            try:
                nro = scraper.buscar_nro_gruplac(codigo=code)
            except Exception as exc:  # buscador caido no aborta la fila
                nro, detail = None, f"buscador fallo: {exc}"
            if nro:
                try:
                    scraper.scrape_gruplac(
                        GRUPLAC_VIEWER_BASE + nro,
                        db_conn_str=db_conn_str,
                        expected_group_code="",
                        source_type="csv",
                        source_url=source_url,
                        reload_ram=False,
                    )
                    status = "enriched"
                except Exception as exc:  # scrapeo fallo: cae a datos del archivo
                    status, detail = "", f"scrape GrupLAC fallo: {exc}"

        if status != "enriched":
            try:
                scraper.GruplacCommitService.commit(
                    scraped,
                    db_conn_str=db_conn_str,
                    source_type="csv",
                    source_url=source_url,
                    reload_ram=False,
                )
                status = status or "file_data"
            except Exception as exc:
                status, detail = "failed", str(exc)

        summary[status] += 1
        results.append({
            "external_code": code,
            "name": scraped.group["name"],
            "status": status,
            "detail": detail,
        })

        if enrich_gruplac and delay_seconds > 0 and idx < len(rows) - 1:
            time.sleep(delay_seconds)  # cortesia hacia Scienti: 1 fila = 2+ descargas

    return {"status": "completed", "summary": summary, "results": results}
