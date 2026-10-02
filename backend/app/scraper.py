"""
backend/app/scraper.py
Extractor Estructural, Normalizador y Servicio de Persistencia Transaccional para GrupLAC (PEA-i).
Conforme a la especificacion en docs/PEA-i_Revision_Tecnica_Scraper_Gruplac.md.
"""

import os
import sys
import re
import json
import hashlib
import logging
import unicodedata
from datetime import datetime
from urllib.parse import urlparse
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

import requests
import pyodbc
from bs4 import BeautifulSoup

from . import repository
from .models import Group, Researcher, Product

# Configuración de Logging Estructurado
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("peai.scraper")

# Constantes de Negocio y Validación
MIN_YEAR = 1900
MAX_YEAR = datetime.now().year + 1
ALLOWED_HOSTS = {
    "scienti.minciencias.gov.co",
    "minciencias.gov.co",
    "www.minciencias.gov.co",
    "localhost",
    "127.0.0.1"
}


# =====================================================================
# 1. Modelos de Transferencia de Datos Intermedios (DTOs)
# =====================================================================

@dataclass
class ScrapedMember:
    display_name: str
    cod_rh: Optional[str] = None
    role: Optional[str] = "Investigador"
    hours: Optional[int] = None
    period_raw: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    is_leader_candidate: bool = False
    warnings: List[str] = field(default_factory=list)


@dataclass
class ScrapedAuthor:
    display_name: str
    cod_rh: Optional[str] = None
    matched_researcher_id: Optional[int] = None
    match_status: str = "unverified"  # exact, candidate, unverified


@dataclass
class ScrapedProduct:
    title: str
    raw_text: str
    section: str
    subtype_code: Optional[str]  # tipologia 2024 (ART/SF/...); None = sin clasificar (Revision §20)
    doi: Optional[str] = None
    issn: Optional[str] = None
    isbn: Optional[str] = None
    year: Optional[int] = None
    authors: List[ScrapedAuthor] = field(default_factory=list)
    source_url: str = ""
    external_code: str = ""
    warnings: List[str] = field(default_factory=list)
    is_endorsed: bool = False  # Marca chulo_0.jpg / chulo_1.jpg: avalado en convocatoria previa


@dataclass
class ScrapedProject:
    title: str
    summary: str = ""
    year: Optional[int] = None
    raw_text: str = ""


@dataclass
class ScrapedGroupData:
    group: Dict[str, Any]
    institutions: List[str] = field(default_factory=list)
    members: List[ScrapedMember] = field(default_factory=list)
    products: List[ScrapedProduct] = field(default_factory=list)
    projects: List[ScrapedProject] = field(default_factory=list)
    research_lines: List[str] = field(default_factory=list)
    work_plan_text: str = ""
    warnings: List[str] = field(default_factory=list)
    skipped_sections: List[str] = field(default_factory=list)  # headers sin mapeo 2024 -> ImportJob.details


# =====================================================================
# 2. Cliente HTTP Robusto
# =====================================================================

class GruplacHttpClient:
    @staticmethod
    def validate_source_url(url: str):
        parsed = urlparse(url)
        if parsed.hostname not in ALLOWED_HOSTS:
            raise ValueError(f"Dominio no permitido para importacion: '{parsed.hostname}'.")
        is_local = parsed.hostname in {"localhost", "127.0.0.1"}
        allow_insecure_local = os.environ.get("PEAI_ALLOW_INSECURE_LOCAL", "false").lower() == "true"
        if parsed.scheme != "https" and not (is_local and allow_insecure_local):
            raise ValueError("HTTPS es obligatorio. HTTP local requiere PEAI_ALLOW_INSECURE_LOCAL=true.")

    @classmethod
    def fetch(cls, url: str) -> str:
        cls.validate_source_url(url)
        headers = {
            "User-Agent": "PEA-i Academic Research Importer/1.0 (Universidad Popular del Cesar; contact: vicerrectoria.investigacion@unicesar.edu.co)"
        }
        logger.info(f"Descargando fuente GrupLAC desde: {url}")
        resp = requests.get(url, headers=headers, timeout=(10, 30))
        resp.raise_for_status()
        
        # Minciencias generalmente usa ISO-8859-1 en JSP
        resp.encoding = resp.apparent_encoding or resp.encoding or "ISO-8859-1"
        return resp.text


# =====================================================================
# 3. Normalizador de Tipos y Claves
# =====================================================================

class GruplacNormalizer:
    @staticmethod
    def normalize(text: Any) -> str:
        if not text:
            return ""
        # Keep accents for storage, just normalize spacing
        s = str(text).strip()
        s = re.sub(r'[\r\n\t\xa0]+', ' ', s)
        return " ".join(s.split())

    @classmethod
    def normalized_name_key(cls, value: str) -> str:
        if not value:
            return ""
        # For deduplication, we DO strip accents so NORENA matches NOREÑA
        nfkd = unicodedata.normalize("NFD", value)
        no_accents = "".join(c for c in nfkd if unicodedata.category(c) != "Mn")
        val = no_accents.encode("ascii", "ignore").decode("ascii").upper()
        val = re.sub(r"[^A-Z0-9 ]", " ", val)
        return " ".join(val.split())

    @classmethod
    def match_key(cls, text: Any) -> str:
        """
        Llave de comparación insensible a tildes/puntuación para reconocer
        encabezados y etiquetas de la página ("Datos básicos" == "datos basicos").
        El almacenamiento conserva tildes; esto solo se usa para hacer match.
        """
        return cls.normalized_name_key(str(text or "")).lower()

    @staticmethod
    def extract_year(text: str) -> Optional[int]:
        if not text:
            return None
        matches = re.findall(r"\b(18\d{2}|19\d{2}|20\d{2}|21\d{2})\b", text)
        for m in matches:
            y = int(m)
            if MIN_YEAR <= y <= MAX_YEAR:
                return y
        return None

    @staticmethod
    def normalize_doi(doi: Optional[str]) -> str:
        return repository.clean_doi(doi)

    @classmethod
    def product_external_code(cls, title: str, year: Optional[int], doi: str = "", authors: Optional[List[str]] = None) -> str:
        norm_doi = cls.normalize_doi(doi).lower()
        if norm_doi:
            canonical = f"DOI:{norm_doi}"
            digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:20]
            return f"PRD_DOI_{digest}"
        
        # Revisión dedupe: los autores NO entran al hash. La página GrupLAC lista
        # el mismo producto varias veces con extracción de autores distinta, lo que
        # generaba códigos distintos y ~11% de duplicados. Título+año es estable.
        # `authors` se mantiene en la firma por compatibilidad pero no afecta el código.
        # El título canónico usa normalized_name_key: sin tildes ni puntuación,
        # así "THERM-BREAST" y "THERM BREAST" producen el mismo código.
        canon_title = cls.normalized_name_key(title)
        canonical = f"{canon_title}|{year or ''}"
        digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:20]
        return f"PRD_{digest}"

    @classmethod
    def collaborator_external_code(cls, name: str) -> str:
        key = cls.normalized_name_key(name)
        digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]
        return f"EXT_{digest}"

    @classmethod
    def parse_membership_period(cls, value: str) -> Dict[str, Any]:
        norm = cls.normalize(value).strip()
        match = re.match(
            r"^(\d{4})(?:/(\d{1,2}))?\s*-\s*(Actual|\d{4}(?:/\d{1,2})?)$",
            norm,
            re.IGNORECASE
        )
        if not match:
            # Fallback simple
            parts = [p.strip() for p in norm.split("-") if p.strip()]
            end_raw = parts[1] if len(parts) > 1 else None
            is_curr = bool(end_raw and end_raw.lower() == "actual")
            return {
                "start_date": None,
                "end_date": None,
                "is_current": is_curr,
                "raw_value": norm,
                "valid": False
            }

        start_yr = match.group(1)
        start_mo = match.group(2)
        start_date = f"{start_yr}-{int(start_mo):02d}-01" if start_mo else f"{start_yr}-01-01"

        end_raw = match.group(3)
        if end_raw.lower() == "actual":
            end_date = None
            is_current = True
        else:
            p_end = end_raw.split("/")
            end_date = f"{p_end[0]}-{int(p_end[1]):02d}-01" if len(p_end) == 2 else f"{p_end[0]}-01-01"
            is_current = False

        return {
            "start_date": start_date,
            "end_date": end_date,
            "is_current": is_current,
            "raw_value": norm,
            "valid": True
        }


# =====================================================================
# 3.5. Mapeo de secciones GrupLAC -> tipologías del modelo 2024
# =====================================================================
# Constantes a nivel de módulo para que los tests (test_gruplac_scraper_2024)
# verifiquen el invariante SECTION_MAP ⊆ catalog_2024.json.
#
# None = sección reconocida SIN equivalente 2024: se importa con subtipo
# NULL (ImportRecord 'unclassified_subtype') para reclasificar manualmente.
# Las secciones que ni siquiera están listadas van a skipped_sections ->
# ImportJob.details. Los IDs se resuelven desde la BD en commit (Revisión
# §20: sin números mágicos). El orden importa: patrones específicos antes
# que los genéricos (p.ej. "otros articulos" antes que "articulos"; los
# "contenido *" antes que "generacion de contenido").
#
# match_key normaliza tildes/puntuación, pero NO el mojibake de doble
# encoding con el que Scienti sirve algunas páginas: "comités" llega como
# "comitas" una vez normalizado (verificado contra docs/AITICE-PAGE.html,
# preview Fase 6), y por eso existe el patrón "comitas" aparte de "comites".
SECTION_MAP = [
    # --- FRH: Formacion de recurso humano ---
    ("trabajos dirigidos", "TD"),    # refinado por fila (TD/TM/TP)
    ("tesis", "TD"),                 # refinado por fila (TD/TM/TP)
    ("asesorias al programa ondas", "APO"),
    # --- DPC: Divulgacion publica de la ciencia ---
    ("contenido virtual", "PCD"),    # 2024 unifica los formatos digitales
    ("audiovisual", "PCD"),
    ("recursos graficos", "PCD"),
    ("contenido de audio", "PCD"),
    ("contenido multimedia", "PCD"),
    ("contenido digital", "PCD"),    # "Producciones de contenido digital - Sonoro"
    ("contenido impreso", "PEE"),
    ("publicaciones editoriales no especializadas", "PEE"),  # nombre exacto del Anexo 1
    ("generacion de contenido", "GC"),     # DESPUES de los contenidos especificos
    ("libros de divulgacion", "LIB_DIV"),
    ("libros de formacion", "LIB_FOR"),
    ("manuales y guias", "MAN_GUI"),
    ("desarrollo web", "DW"),
    ("estrategias de comunicacion", "TRM"),
    ("produccion de estrategias", "TRM"),
    ("estrategias y contenidos", "TRM"),
    ("ediciones", "ERL"),
    ("informe final", "IFI"),
    ("informes de investigacion", "IFI"),
    ("informes tecnicos", "INF"),
    ("consultorias", "CON_CT"),     # 2024 las ubica en DPC
    ("secuencias geneticas", "NSG"),
    ("boletines", "BOL"),
    ("redes de conocimiento", "RC"),
    ("talleres de creacion", "TC"),          # DPC en 2024
    ("documentos de trabajo", "WP"),         # DPC en 2024
    ("eventos artisticos", "ECA"),           # DPC en 2024 (trabajo artistico)
    ("eventos", "EC"),
    # --- GNC: Generacion de nuevo conocimiento ---
    ("otros articulos", None),          # catch-all dudoso -> sin clasificar
    ("articulos", "ART"),
    ("notas cientificas", "N"),
    ("otros libros", None),             # catch-all dudoso
    ("libros publicados", "LIB"),
    ("capitulos", "CAP_LIB"),
    ("nuevas variedades", "VV"),
    ("nuevas razas", "NRA"),
    ("poblaciones mejoradas", "PMR"),
    ("patente", "PAT_INV"),             # refinado por fila (MOD_UTIL)
    ("obras o productos", "AAD"),       # arte ahora vive en GNC/DPC
    ("produccion en arte", "AAD"),
    # --- DTI: Desarrollo tecnologico e innovacion ---
    ("software", "SF"),
    ("prototipo", "PI"),
    ("planta piloto", "PP"),
    ("plantas piloto", "PP"),
    ("disenos industriales", "DI"),
    ("esquemas de trazados", "ECI"),
    ("productos nutraceuticos", "PN"),
    ("signos distintivos", "SD"),
    ("colecciones cientificas", "CC"),
    ("nuevos registros", "NRC"),
    ("secreto empresarial", "SE"),
    ("empresas de base tecnologica", "EBT"),
    ("empresas creativas", "ICC"),
    ("innovaciones en procesos", "IPP"),
    ("innovaciones generadas", "IG"),
    ("regulaciones y normas", "RNL"),
    ("protocolos de vigilancia epidemiologica", "PVE"),  # tipologia exacta del Anexo 1
    ("reglamentos tecnicos", "RNL"),   # los reglamentos amparan en RNL (2.2.2.3)
    ("guias de practica clinica", "RNPC"),
    ("proyectos de ley", "RNPL"),
    ("conceptos tecnicos", "CT"),
    # --- ASC: Apropiacion social del conocimiento ---
    ("centro de ciencia", "TCCG"),     # trabajo conjunto con centros de ciencia (2.2.3.3.1.4)
    # --- Secciones reconocidas SIN equivalente 2024 (importan NULL) ---
    ("demas trabajos", None),
    ("estrategias pedagogicas", None),        # sin equivalente como producto
    ("otra publicacion divulgativa", None),
    ("participacion ciudadana", None),        # no existe en Anexo 1 2024
    ("proceso de apropiacion social", None),  # ambigua: FIS/GPP/FCP/TCCG
    ("procesos de apropiacion social", None),
    ("cartas mapas o similares", None),
    ("traducciones", None),
    ("otros productos tecnologicos", None),
    ("curso de corta duracion", None),        # dictar cursos no es producto 2024
    ("curso de doctorado", None),
    ("curso de maestria", None),
    ("curso especializado de extension", None),
    ("otro programa academico", None),        # formacion del investigador
    ("programa academico", None),
    ("jurado", None),                         # actividad de evaluador
    ("comites", None),
    ("actividades como evaluador", None),     # actividad del evaluador, no producto 2024
    ("comitas", None),   # mojibake de 'comites' en el HTML de Scienti (doble encoding)
]

# Tablas estructurales de la página (no productos): datos básicos,
# instituciones, plan, líneas, integrantes y proyectos se procesan en los
# bloques 1-6/7; los banners de las grandes secciones de GrupLAC no traen
# filas de producto (verificado contra la página real de AITICE). Se
# excluyen del registro de secciones sin mapeo para no ensuciar el resumen
# del job.
STRUCTURAL_HEADERS = (
    "datos basicos",
    "instituciones",
    "plan estrat",
    "lineas de investigacion",
    "integrantes del grupo",
    "proyectos",
    "produccion bibliografica",
    "produccion tecnica y tecnologica",
    "produccion de formacion y extension",
    "apropiacion social y divulgacion publica de la ciencia",
    "actividades de formacion",
)


# =====================================================================
# 4. Parser Estructural Basado en DOM y Líneas Aisladas
# =====================================================================

class GruplacHtmlParser:
    @staticmethod
    def extract_labeled_value(lines: List[str], label: str) -> str:
        norm_label = GruplacNormalizer.normalize(label).lower().strip(" :")
        stop_labels = (
            "autores:", "tutor(es):", "tutor:", "doi:", "issn:", "isbn:",
            "vol:", "fasc:", "pags:", "paginas:", "palabras:", "ano:", "año:",
            "mes:", "en:", "titulo:", "sitio web:", "disponibilidad:"
        )
        for idx, line in enumerate(lines):
            clean = line.strip()
            norm_l = GruplacNormalizer.normalize(clean).lower().strip(" :")
            if norm_l == norm_label or clean.lower().startswith(norm_label + ":"):
                if ":" in clean:
                    val = clean.split(":", 1)[1].strip()
                    if val:
                        return val
                if idx + 1 < len(lines):
                    next_l = lines[idx + 1].strip()
                    next_norm = GruplacNormalizer.normalize(next_l).lower()
                    if not next_norm.startswith(stop_labels) and not next_l.endswith(":") and len(next_l) < 200:
                        return next_l
        return ""

    @staticmethod
    def extract_authors(lines: List[str]) -> List[ScrapedAuthor]:
        """Extract only the author/tutor field from one product block.

        GrupLAC articles use comma-separated full names. If a future section uses
        a different representation, the raw field is kept as one author candidate
        rather than guessing an identity.
        """
        labels = ("autores:", "tutor(es):", "tutor:")
        stop_labels = ("doi:", "issn:", "isbn:", "vol:", "fasc:", "pags:", "paginas:")
        for idx, line in enumerate(lines):
            normalized = GruplacNormalizer.normalize(line).lower().strip()
            if not normalized.startswith(labels):
                continue
            value = line.split(":", 1)[1].strip() if ":" in line else ""
            if not value and idx + 1 < len(lines):
                candidate = lines[idx + 1].strip()
                candidate_norm = GruplacNormalizer.normalize(candidate).lower()
                if not candidate_norm.startswith(stop_labels):
                    value = candidate
            if not value:
                return []
            # This delimiter is verified for public GrupLAC article rows. Keep
            # section-specific tests to detect if Minciencias changes the format.
            names = [name.strip() for name in value.split(",") if name.strip()]
            return [ScrapedAuthor(display_name=name) for name in names]
        return []

    @classmethod
    def _dedupe_products(cls, products: List[ScrapedProduct]) -> tuple:
        """
        Fusiona productos repetidos dentro de la misma página GrupLAC.
        La llave es título canónico + año (independiente del DOI): la página lista
        el mismo artículo a veces con DOI y a veces sin él (o con DOI distinto por
        error tipográfico), lo que generaba códigos externos diferentes y filas
        duplicadas. Al fusionar se prefiere el registro CON DOI y, en empate, el de
        texto crudo más largo; los autores se unen. Devuelve (lista, n_fusionados).
        """
        merged: Dict[str, ScrapedProduct] = {}
        order: List[str] = []
        merged_count = 0
        for p in products:
            key = f"{GruplacNormalizer.normalized_name_key(p.title)}|{p.year or ''}"
            existing = merged.get(key)
            if existing is None:
                merged[key] = p
                order.append(key)
                continue
            merged_count += 1
            # Preferir el registro con DOI; en empate, el de texto crudo más largo
            if (p.doi and not existing.doi) or (bool(p.doi) == bool(existing.doi) and len(p.raw_text) > len(existing.raw_text)):
                base, existing = p, existing
                merged[key] = base
            else:
                base = existing
            # Unión de autores por nombre normalizado, preservando orden de llegada
            seen = {GruplacNormalizer.normalized_name_key(a.display_name) for a in base.authors}
            for a in existing.authors:
                k = GruplacNormalizer.normalized_name_key(a.display_name)
                if k and k not in seen:
                    base.authors.append(a)
                    seen.add(k)
            # Rellenar identificadores faltantes con los del duplicado
            base.doi = GruplacNormalizer.normalize_doi(base.doi or existing.doi) or None
            base.issn = base.issn or existing.issn
            base.isbn = base.isbn or existing.isbn
            base.year = base.year or existing.year
            base.is_endorsed = base.is_endorsed or existing.is_endorsed
            # Recalcular el código canónico: si la fusión aportó un DOI, el código
            # pasa a ser PRD_DOI_* y así reconcilia con la fuente CvLAC.
            base.external_code = GruplacNormalizer.product_external_code(base.title, base.year, base.doi or "")
        return [merged[k] for k in order], merged_count

    @classmethod
    def parse(cls, html: str, source_url: str = "") -> ScrapedGroupData:
        soup = BeautifulSoup(html, "lxml")
        tables = soup.find_all("table")
        warnings: List[str] = []

        # -------------------------------------------------------------
        # 1. Datos básicos del grupo
        # -------------------------------------------------------------
        basic_data: Dict[str, str] = {}
        for table in tables:
            rows = table.find_all("tr")
            if not rows: continue
            header = GruplacNormalizer.match_key(rows[0].get_text(strip=True))
            if "datos basicos" in header:
                for row in rows[1:]:
                    cols = row.find_all("td")
                    if len(cols) == 2:
                        k = GruplacNormalizer.match_key(cols[0].get_text(strip=True))
                        v = GruplacNormalizer.normalize(cols[1].get_text(strip=True))
                        basic_data[k] = v
                break

        group_header = soup.find("span", class_="celdaEncabezado")

        group_code = "COL0000000"
        for k, v in basic_data.items():
            if "codigo" in k:
                group_code = v.strip()
                break

        # Página sin encabezado de grupo ni código en datos básicos = el nro no
        # corresponde a un grupo público (Scienti devuelve una plantilla vacía).
        # Rechazar en lugar de crear un "Grupo Sin Nombre" fantasma.
        if group_header is None and group_code == "COL0000000":
            raise ValueError(
                "La página no corresponde a un grupo GrupLAC válido (sin nombre ni código). "
                "Verifica que el nro de la URL sea el correcto en el buscador de Scienti."
            )

        group_name = (
            GruplacNormalizer.normalize(group_header.get_text(strip=True))
            if group_header else basic_data.get("nombre del grupo", "Grupo Sin Nombre")
        )

        if group_code == "COL0000000" and source_url:
            m_nro = re.search(r"nro=([0-9]+)", source_url)
            if m_nro:
                nro_clean = m_nro.group(1).lstrip("0")
                group_code = f"COL{nro_clean.zfill(7)}"

        leader_name = basic_data.get("lider", basic_data.get("lider del grupo", ""))

        # -------------------------------------------------------------
        # 2. Instituciones que avalan
        # -------------------------------------------------------------
        institutions: List[str] = []
        for table in tables:
            rows = table.find_all("tr")
            if not rows: continue
            header = GruplacNormalizer.match_key(rows[0].get_text(strip=True))
            if "instituciones" in header:
                for row in rows[1:]:
                    txt = GruplacNormalizer.normalize(row.get_text(strip=True))
                    if txt:
                        clean_inst = txt.split(".-")[-1].split(" - ")[0].strip()
                        if clean_inst:
                            institutions.append(clean_inst)
                break

        # -------------------------------------------------------------
        # 3. Plan estratégico
        # -------------------------------------------------------------
        plan_text = ""
        for table in tables:
            rows = table.find_all("tr")
            if not rows: continue
            header = GruplacNormalizer.match_key(rows[0].get_text(strip=True))
            if "plan estrat" in header:
                for row in rows[1:]:
                    plan_text += " " + GruplacNormalizer.normalize(row.get_text(strip=True))
                break
        plan_text = plan_text.strip()

        # -------------------------------------------------------------
        # 4. Líneas de investigación
        # -------------------------------------------------------------
        research_lines: List[str] = []
        for table in tables:
            rows = table.find_all("tr")
            if not rows: continue
            header = GruplacNormalizer.match_key(rows[0].get_text(strip=True))
            if "lineas de investigacion" in header:
                for row in rows[1:]:
                    txt = GruplacNormalizer.normalize(row.get_text(strip=True))
                    if txt:
                        clean_line = txt.split(".-")[-1].strip()
                        if clean_line:
                            research_lines.append(clean_line)
                break

        # -------------------------------------------------------------
        # 5. Integrantes del grupo y detección de líder
        # -------------------------------------------------------------
        members: List[ScrapedMember] = []
        leader_key = GruplacNormalizer.normalized_name_key(leader_name)

        for table in tables:
            rows = table.find_all("tr")
            if not rows: continue
            header = GruplacNormalizer.match_key(rows[0].get_text(strip=True))
            if "integrantes del grupo" in header:
                for row in rows[2:]:
                    cols = row.find_all("td")
                    if len(cols) >= 3:
                        raw_name = GruplacNormalizer.normalize(cols[0].get_text(strip=True))
                        clean_name = re.sub(r"^\d+\.-\s*", "", raw_name).strip()
                        vinculacion = GruplacNormalizer.normalize(cols[1].get_text(strip=True))
                        
                        raw_hours = cols[2].get_text(strip=True) if len(cols) >= 4 else ""
                        m_h = re.search(r"\b(\d+)\b", raw_hours)
                        hours = int(m_h.group(1)) if m_h else None

                        period_raw = cols[3].get_text(strip=True) if len(cols) >= 4 else cols[2].get_text(strip=True)
                        parsed_period = GruplacNormalizer.parse_membership_period(period_raw)

                        # Extraer cod_rh real de CvLAC
                        cod_rh = None
                        a_tag = row.find("a", href=True)
                        if a_tag and "cod_rh=" in a_tag["href"]:
                            m_rh = re.search(r"cod_rh=([^&]+)", a_tag["href"])
                            if m_rh:
                                cod_rh = m_rh.group(1).strip()

                        if not cod_rh:
                            name_hash = hashlib.sha256(clean_name.encode("utf-8")).hexdigest()[:12]
                            cod_rh = f"RH_{group_code}_{name_hash}"

                        # Matching de líder exacto sin falsos positivos de subcadena
                        member_key = GruplacNormalizer.normalized_name_key(clean_name)
                        is_leader = (leader_key and leader_key == member_key)

                        members.append(ScrapedMember(
                            display_name=clean_name,
                            cod_rh=cod_rh,
                            role=vinculacion or "Investigador",
                            hours=hours,
                            period_raw=period_raw,
                            start_date=parsed_period["start_date"],
                            end_date=parsed_period["end_date"],
                            is_current=parsed_period["is_current"],
                            is_leader_candidate=is_leader
                        ))
                break

        # -------------------------------------------------------------
        # 6. Extracción Estructural de Productos
        # -------------------------------------------------------------
        products: List[ScrapedProduct] = []
        skipped_sections: List[str] = []
        # Mapeo de secciones y exclusiones estructurales: ver SECTION_MAP /
        # STRUCTURAL_HEADERS a nivel de módulo (sección 3.5), definidos ahí
        # para que los tests validen el invariante SECTION_MAP ⊆ catálogo.

        for table in tables:
            rows = table.find_all("tr")
            if not rows: continue
            header = GruplacNormalizer.match_key(rows[0].get_text(strip=True))

            subtype_code: Optional[str] = None
            section_label = ""
            section_matched = False
            for pattern, code in SECTION_MAP:
                if pattern in header:
                    subtype_code = code
                    section_label = pattern
                    section_matched = True
                    break

            if not section_matched:
                # Seccion sin ningun patron conocido: registrarla para el
                # resumen del job (ImportJob.details) en vez de omitirla muda.
                if not any(s in header for s in STRUCTURAL_HEADERS) \
                        and header not in skipped_sections:
                    skipped_sections.append(header)
                continue

            for row in rows[2:]:
                cols = row.find_all("td")
                if len(cols) < 2:
                    continue

                # Preservar estructura de líneas explícitas sin aplanar espacios
                lines = [
                    line.strip() for line in cols[1].get_text(separator="\n", strip=True).splitlines()
                    if line.strip()
                ]
                if not lines:
                    continue

                full_text = " ".join(lines)

                # Extracción estructurada de Título
                title = ""
                idx = 0
                if idx < len(lines) and re.match(r"^\d+\.-\s*$", lines[idx]):
                    idx += 1
                
                META_PREFIXES = (
                    "autor", "tutor", "director", "codirector", "fecha",
                    "lugar", "institucion", "tipo de orientacion",
                    "programa academico", "editorial", "revista",
                    "volumen", "paginas", "doi", "issn", "isbn",
                )
                CONNECTORS = (
                    "de", "del", "la", "el", "los", "las", "en", "y", "a",
                    "para", "con", "un", "una", "por", "su", "al", "e", "o",
                )

                def _is_meta(line: str) -> bool:
                    return GruplacNormalizer.match_key(line).startswith(META_PREFIXES)

                def _next_title_line(i: int) -> tuple:
                    # Devuelve (titulo, nuevo_idx) saltando lineas vacias o de
                    # solo puntuacion (el ":" suele quedar solo en su linea).
                    while i < len(lines):
                        cand = lines[i].lstrip(": ").strip()
                        i += 1
                        if cand and not re.fullmatch(r"[:\-.\s]*", cand):
                            return cand, i
                    return "", i

                if idx < len(lines):
                    first_line = lines[idx]
                    if ":" in first_line:
                        frag = first_line.split(":", 1)[1].strip()
                        idx += 1
                        if len(frag) <= 3:
                            frag, idx = _next_title_line(idx)
                        title = frag
                    else:
                        idx += 1
                        title, idx = _next_title_line(idx)

                # El titulo puede partirse en varias lineas (GrupLAC lo corta
                # con <br>): concatenar mientras termine en conector y la
                # siguiente linea no sea metadato.
                while idx < len(lines) and title and title.split()[-1].lower().strip(":,.") in CONNECTORS:
                    if _is_meta(lines[idx]):
                        break
                    nxt, idx = _next_title_line(idx)
                    if not nxt:
                        break
                    title = f"{title} {nxt}".strip()

                title = re.sub(r"^\d+\.-\s*", "", title).strip()
                if not title:
                    title = re.sub(r"^\d+\.-\s*", "", lines[0])[:200]
                title = title.lstrip(": ").strip() or title

                # Refinamiento por fila: la seccion "Trabajos dirigidos/tutorias"
                # mezcla doctorado, maestria, pregrado, monografias y "otro tipo";
                # el tipo real viene en la primera linea de contenido de la fila.
                if section_label in ("trabajos dirigidos", "tesis"):
                    tipo_idx = 1 if re.match(r"^\d+\.-\s*$", lines[0]) and len(lines) > 1 else 0
                    t = GruplacNormalizer.match_key(lines[tipo_idx])
                    if "doctorado" in t:
                        subtype_code = "TD"
                    elif "maestr" in t:
                        subtype_code = "TM"
                    elif "pregrado" in t:
                        subtype_code = "TP"
                    else:
                        # Monografias y "otro tipo" no son tipologia 2024.
                        subtype_code = None

                # Refinamiento por fila: las patentes de modelo de utilidad son
                # tipologia propia en 2024 (MOD_UTIL); el resto de la seccion
                # es PAT_INV. La asignacion es exhaustiva: sin el 'else' la
                # fila heredaba el codigo de la fila anterior (una seccion con
                # un modelo de utilidad al inicio marcaba TODAS como MOD_UTIL).
                if section_label == "patente":
                    subtype_code = "MOD_UTIL" \
                        if "modelo de utilidad" in GruplacNormalizer.match_key(full_text) \
                        else "PAT_INV"

                # Extracción estructurada de DOI, ISSN, ISBN
                raw_doi = cls.extract_labeled_value(lines, "DOI")
                if not raw_doi:
                    m_doi = re.search(r"DOI:\s*([^\s,]+)", full_text, re.IGNORECASE)
                    if m_doi: raw_doi = m_doi.group(1).strip()
                doi = GruplacNormalizer.normalize_doi(raw_doi) or None

                issn = cls.extract_labeled_value(lines, "ISSN")
                if not issn:
                    m_issn = re.search(r"ISSN:\s*([^\s,]+)", full_text, re.IGNORECASE)
                    if m_issn: issn = m_issn.group(1).strip()

                isbn = cls.extract_labeled_value(lines, "ISBN")
                if not isbn:
                    m_isbn = re.search(r"ISBN:\s*([^\s,]+)", full_text, re.IGNORECASE)
                    if m_isbn: isbn = m_isbn.group(1).strip()

                year = GruplacNormalizer.extract_year(full_text)

                # Extracción estructurada de Autores / Tutores
                scraped_authors = cls.extract_authors(lines)
                author_names = [a.display_name for a in scraped_authors]

                p_ext_code = GruplacNormalizer.product_external_code(title, year, doi, authors=author_names)
                is_endorsed = bool(row.find("img", src=lambda s: s and "chulo" in s.lower()))

                products.append(ScrapedProduct(
                    title=title,
                    raw_text=full_text,
                    section=section_label,
                    subtype_code=subtype_code,
                    doi=doi or None,
                    issn=issn or None,
                    isbn=isbn or None,
                    year=year,
                    authors=scraped_authors,
                    source_url=source_url,
                    external_code=p_ext_code,
                    is_endorsed=is_endorsed
                ))

        # -------------------------------------------------------------
        # 7. Extracción de Proyectos
        # -------------------------------------------------------------
        projects: List[ScrapedProject] = []
        for table in tables:
            rows = table.find_all("tr")
            if not rows: continue
            header = GruplacNormalizer.match_key(rows[0].get_text(strip=True))
            if header == "proyectos":
                for row in rows[1:]:
                    txt = GruplacNormalizer.normalize(row.get_text(strip=True))
                    if txt:
                        clean_proj = txt.split(".-")[-1].strip()
                        proj_year = GruplacNormalizer.extract_year(clean_proj)
                        projects.append(ScrapedProject(
                            title=clean_proj[:500],
                            summary=clean_proj,
                            year=proj_year,
                            raw_text=txt
                        ))
                break

        # -------------------------------------------------------------
        # 6b. Dedupe intra-página: la página GrupLAC lista el mismo
        # producto varias veces (distinto bloque/sección). Como el código
        # canónico es título+año, aquí fusionamos las apariciones:
        # unión de autores y conservación del registro más completo.
        # -------------------------------------------------------------
        products, merged_count = cls._dedupe_products(products)
        if merged_count:
            warnings.append(f"{merged_count} productos repetidos en la página fueron fusionados por título+año")

        return ScrapedGroupData(
            group={
                "external_code": group_code,
                "name": group_name,
                "leader_name": leader_name,
                "classification": basic_data.get("clasificacion", basic_data.get("estado", "")),
                "email": basic_data.get("e mail", ""),
                "website": basic_data.get("pagina web", ""),
                "city": basic_data.get("ciudad", basic_data.get("departamento ciudad", "")),
                "department": basic_data.get("departamento", ""),
                "declared_creation_date": basic_data.get("ano y mes de formacion", ""),
                "knowledge_area": basic_data.get("area de conocimiento", ""),
            },
            institutions=institutions,
            members=members,
            products=products,
            projects=projects,
            research_lines=research_lines,
            work_plan_text=plan_text,
            warnings=warnings,
            skipped_sections=skipped_sections
        )


# =====================================================================
# 5. Servicio de Persistencia Transaccional e Idempotente
# =====================================================================

class GruplacCommitService:
    @classmethod
    def commit(cls, data: ScrapedGroupData, db_conn_str: str = "") -> Dict[str, Any]:
        logger.info(f"Iniciando compromiso transaccional atómico para el grupo: {data.group['name']} ({data.group['external_code']})")
        
        job_id = None
        conn = None
        
        # Contadores de conciliación contable por registro
        extracted_products = len(data.products)
        matched_products = 0
        created_products = 0
        unclassified_products = 0
        total_records = 0
        new_records = 0
        member_authors_count = 0
        external_authors_count = 0

        try:
            if not db_conn_str:
                return {
                    "status": "dry_run",
                    "group": data.group["name"],
                    "products_count": extracted_products,
                    "members_count": len(data.members)
                }

            conn = pyodbc.connect(db_conn_str, autocommit=False)
            cur = conn.cursor()
            # 1. Registrar ImportJob en estado 'processing' dentro de la transacción
            cur.execute("""
                INSERT INTO ImportJob (source_type, source_url, status, total_records, new_records, error_count, created_at)
                OUTPUT INSERTED.id
                VALUES ('url', ?, 'processing', 0, 0, 0, GETDATE())
            """, data.products[0].source_url if data.products else "https://scienti.minciencias.gov.co/gruplac")
            row = cur.fetchone()
            if row:
                job_id = row[0]
            # 2. Persistir / Actualizar ResearchGroup
            #    Conciliación: primero por external_code; si no existe, por nombre
            #    normalizado (el cod_grupo_gr de datos abiertos y el código de la
            #    página GrupLAC difieren para el mismo grupo, p.ej. BIAT:
            #    COL0034862 vs COL0001727).
            cur.execute("SELECT id FROM ResearchGroup WHERE external_code = ?", data.group["external_code"])
            row = cur.fetchone()
            if row is None:
                wanted = GruplacNormalizer.normalized_name_key(data.group["name"])
                cur.execute("SELECT id, external_code, name FROM ResearchGroup WHERE status <> 'deleted'")
                for g_row in cur.fetchall():
                    if GruplacNormalizer.normalized_name_key(g_row[2]) == wanted:
                        row = (g_row[0],)
                        logger.info(
                            f"Conciliación de grupo por nombre: '{data.group['name']}' "
                            f"({data.group['external_code']}) → existente {g_row[1]} (id={g_row[0]})"
                        )
                        break
            if row is None:
                cur.execute("""
                    INSERT INTO ResearchGroup (external_code, name, institution, classification, email, website, city, department, declared_creation_date, knowledge_area, status)
                    OUTPUT INSERTED.id
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active');
                """, data.group["external_code"], data.group["name"], " | ".join(data.institutions), data.group.get("classification", ""), data.group.get("email", ""), data.group.get("website", ""), data.group.get("city", ""), data.group.get("department", ""), data.group.get("declared_creation_date", ""), data.group.get("knowledge_area", ""))
                db_group_id = cur.fetchone()[0]
            else:
                db_group_id = row[0]
                cur.execute("""
                    UPDATE ResearchGroup
                    SET name = ?, institution = ?, classification = ?, email = ?, website = ?, city = ?, department = ?, declared_creation_date = ?, knowledge_area = ?, status = 'active'
                    WHERE id = ?;
                """, data.group["name"], " | ".join(data.institutions), data.group.get("classification", ""), data.group.get("email", ""), data.group.get("website", ""), data.group.get("city", ""), data.group.get("department", ""), data.group.get("declared_creation_date", ""), data.group.get("knowledge_area", ""), db_group_id)

            # 2.1 Resolver catalogos desde BD por CODIGO 2024 (Revision §20:
            # sin IDs magicos). El codigo es la clave del modelo 2024; los
            # rows con code NULL son legado y no deben matchear jamas.
            cur.execute("SELECT id, family_id, code FROM ProductSubtype WHERE code IS NOT NULL")
            subtype_lookup: Dict[str, Any] = {}
            for s_row in cur.fetchall():
                subtype_lookup[s_row[2]] = (s_row[1], s_row[0])  # (family_id, subtype_id)

            # 3. Persistir Miembros y GroupMembership de forma idempotente
            members_by_key: Dict[str, int] = {}
            leader_found_cod_rh = None

            for m in data.members:
                total_records += 1
                norm_key = GruplacNormalizer.normalized_name_key(m.display_name)
                
                # Comprobar si el investigador ya existe por external_code
                cur.execute("SELECT id FROM Researcher WHERE external_code = ?", m.cod_rh)
                r_row = cur.fetchone()
                if r_row:
                    existing_res_id = r_row[0]
                    cur.execute("UPDATE Researcher SET status = 'active' WHERE id = ?", existing_res_id)
                    action = "matched"
                else:
                    cur.execute("""
                        INSERT INTO Researcher (external_code, first_names, last_names, highest_education_level, status)
                        OUTPUT INSERTED.id
                        VALUES (?, ?, '', '', 'active');
                    """, m.cod_rh or f"RH_{norm_key[:20]}", m.display_name[:150])
                    existing_res_id = cur.fetchone()[0]
                    new_records += 1
                    action = "created"

                members_by_key[norm_key] = existing_res_id

                # Vincular a GroupMembership con periodo normalizado
                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM GroupMembership WHERE group_id = ? AND researcher_id = ?)
                    BEGIN
                        INSERT INTO GroupMembership (group_id, researcher_id, role, start_date, end_date, status)
                        VALUES (?, ?, ?, ?, ?, 'active');
                    END
                    ELSE
                    BEGIN
                        UPDATE GroupMembership SET role = ?, start_date = ?, end_date = ?, status = 'active'
                        WHERE group_id = ? AND researcher_id = ?;
                    END
                """, db_group_id, existing_res_id, db_group_id, existing_res_id, m.role or "Investigador", m.start_date or "", m.end_date or "", m.role or "Investigador", m.start_date or "", m.end_date or "", db_group_id, existing_res_id)

                if job_id:
                    cur.execute("""
                        INSERT INTO ImportRecord (job_id, entity_type, external_identifier, action_taken, source_data_summary, resolution_details, created_at)
                        VALUES (?, 'Member', ?, ?, ?, ?, GETDATE());
                    """, job_id, m.cod_rh or "", action, m.display_name[:200], f"Rol: {m.role} | Periodo: {m.start_date} a {m.end_date or 'Actual'}")

                if m.is_leader_candidate:
                    leader_found_cod_rh = m.cod_rh

            # 4. Asignar líder al grupo si fue identificado
            if leader_found_cod_rh and conn:
                cur.execute("""
                    UPDATE ResearchGroup
                    SET leader_id = (SELECT TOP 1 id FROM Researcher WHERE external_code = ?)
                    WHERE id = ?
                """, leader_found_cod_rh, db_group_id)
                logger.info(f"Lider asignado al grupo con cod_rh: {leader_found_cod_rh}")

            # 5. Persistir Productos con validation_status='pending' e Idempotencia
            for p in data.products:
                total_records += 1
                prod_id = None
                p_action = "matched"

                # Resolver tipologia 2024 por codigo contra catalogo BD.
                # p.subtype_code None = seccion reconocida sin equivalente 2024
                # (o fila de refinamiento sin tipo): se importa sin clasificar
                # para reclasificar manualmente en la cola.
                resolved = subtype_lookup.get(p.subtype_code) if p.subtype_code else None
                if resolved:
                    fam_id, sub_id = resolved
                else:
                    fam_id, sub_id = None, None
                    unclassified_products += 1
                    if p.subtype_code:
                        # Codigo conocido que no existe en BD: problema de catalogo.
                        warn_msg = f"SUBTYPE_CODE_NOT_FOUND: '{p.subtype_code}' no existe en ProductSubtype; producto '{p.title[:80]}' queda sin clasificar."
                        logger.warning(warn_msg)
                        p.warnings.append(warn_msg)

                evidence = "Avalado y validado para la Convocatoria Nacional Minciencias (marca ✓ en GrupLAC)" if p.is_endorsed else None
                spec_attrs = json.dumps({"minciencias_endorsed": True}) if p.is_endorsed else None

                cur.execute("SELECT id, evidence FROM Product WHERE external_code = ?", p.external_code)
                p_row = cur.fetchone()
                if p_row:
                    prod_id = p_row[0]
                    matched_products += 1
                    if p.is_endorsed and not p_row[1]:
                        cur.execute("UPDATE Product SET evidence = ?, specialized_attributes = COALESCE(specialized_attributes, ?) WHERE id = ?", evidence, spec_attrs, prod_id)
                else:
                    cur.execute("""
                        INSERT INTO Product (external_code, title, description, family_id, subtype_id, obtained_date, publication_date, validation_status, doi, issn, isbn, year, evidence, specialized_attributes, status)
                        OUTPUT INSERTED.id
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 'active');
                    """, p.external_code, GruplacNormalizer.normalize(p.title)[:490], GruplacNormalizer.normalize(p.raw_text)[:2000], fam_id, sub_id, str(p.year) if p.year else "", str(p.year) if p.year else "", p.doi, p.issn, p.isbn, p.year, evidence, spec_attrs)
                    prod_id = cur.fetchone()[0]
                    new_records += 1
                    created_products += 1
                    p_action = "created"

                # Encolar en la cola de validación institucional (idempotente en SQL Server)
                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM ValidationQueueItem WHERE product_id = ? AND status = 'pending')
                    BEGIN
                        INSERT INTO ValidationQueueItem (product_id, status, assigned_to, enqueued_at)
                        VALUES (?, 'pending', '', GETDATE());
                    END
                """, prod_id, prod_id)

                # Proponer enlace producto-grupo (status='pending_validation')
                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM GroupProductLink WHERE group_id = ? AND product_id = ?)
                    BEGIN
                        INSERT INTO GroupProductLink (group_id, product_id, status, source, requested_at, validation_reason)
                        VALUES (?, ?, 'pending_validation', 'gruplac_public', GETDATE(), 'Importado automáticamente desde GrupLAC; pendiente de validación institucional UPC.');
                    END
                """, db_group_id, prod_id, db_group_id, prod_id)

                if job_id:
                    # 'unclassified_subtype' marca los productos que quedaron
                    # sin tipologia 2024 y deben reclasificarse a mano.
                    rec_action = p_action if sub_id else "unclassified_subtype"
                    cur.execute("""
                        INSERT INTO ImportRecord (job_id, entity_type, external_identifier, action_taken, source_data_summary, resolution_details, created_at)
                        VALUES (?, 'Product', ?, ?, ?, ?, GETDATE());
                    """, job_id, p.external_code, rec_action, p.title[:200], f"Tipologia: {p.subtype_code or 'sin clasificar'} (id={sub_id}) | Ano: {p.year} | DOI: {p.doi or 'N/A'}")

                # 5.1 Persistir Autores (ProductAuthor) sin crear Researchers fantasma
                for a_idx, author in enumerate(p.authors, start=1):
                    total_records += 1
                    a_key = GruplacNormalizer.normalized_name_key(author.display_name)
                    
                    # Verificar si el autor es integrante institucional del grupo
                    author_res_id = members_by_key.get(a_key)
                    if author_res_id:
                        # Autor institucional registrado
                        cur.execute("""
                            IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND researcher_id = ?)
                            BEGIN
                                INSERT INTO ProductAuthor (product_id, researcher_id, author_order, match_status)
                                VALUES (?, ?, ?, 'exact');
                            END
                        """, prod_id, author_res_id, prod_id, author_res_id, a_idx)
                        member_authors_count += 1
                    else:
                        # Autor colaborador externo: NO se crea Researcher artificial
                        ext_code = GruplacNormalizer.collaborator_external_code(author.display_name)
                        cur.execute("""
                            IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND external_author_name = ?)
                            BEGIN
                                INSERT INTO ProductAuthor (product_id, researcher_id, author_order, external_author_name, external_author_identifier, match_status)
                                VALUES (?, NULL, ?, ?, ?, 'unverified');
                            END
                        """, prod_id, author.display_name[:250], prod_id, a_idx, author.display_name[:250], ext_code)
                        external_authors_count += 1

            # 6. Persistir Proyectos
            if conn and data.projects:
                for proj in data.projects:
                    total_records += 1
                    clean_proj_title = proj.title[:490]
                    # Verificar existencia de proyecto
                    cur.execute("SELECT id FROM Project WHERE title = ?", clean_proj_title)
                    pr_row = cur.fetchone()
                    if pr_row:
                        proj_id = pr_row[0]
                        proj_action = "matched"
                    else:
                        cur.execute("""
                            INSERT INTO Project (title, summary, start_date, status)
                            OUTPUT INSERTED.id
                            VALUES (?, ?, ?, 'active');
                        """, clean_proj_title, proj.summary[:2000], str(proj.year) if proj.year else None)
                        proj_id = cur.fetchone()[0]
                        new_records += 1
                        proj_action = "created"

                    cur.execute("""
                        IF NOT EXISTS (SELECT 1 FROM GroupProject WHERE group_id = ? AND project_id = ?)
                        BEGIN
                            INSERT INTO GroupProject (group_id, project_id) VALUES (?, ?);
                        END
                    """, db_group_id, proj_id, db_group_id, proj_id)

                    if job_id:
                        cur.execute("""
                            INSERT INTO ImportRecord (job_id, entity_type, external_identifier, action_taken, source_data_summary, resolution_details, created_at)
                            VALUES (?, 'Project', ?, ?, ?, ?, GETDATE());
                        """, job_id, str(proj.year or ""), proj_action, clean_proj_title[:200], f"Año: {proj.year}")

            # 7. Persistir Plan Estratégico y Líneas de Investigación
            if conn:
                cur = conn.cursor()
                if data.work_plan_text:
                    cur.execute("""
                        IF NOT EXISTS (SELECT 1 FROM WorkPlan WHERE group_id = ?)
                        BEGIN
                            INSERT INTO WorkPlan (group_id, title, description, status)
                            VALUES (?, 'Plan Estratégico Gruplac', ?, 'active');
                        END
                    """, db_group_id, db_group_id, data.work_plan_text[:2000])

                for linea in data.research_lines:
                    cur.execute("""
                        IF NOT EXISTS (SELECT 1 FROM ResearchLine WHERE name = ?)
                        BEGIN
                            INSERT INTO ResearchLine (name) VALUES (?);
                        END
                        INSERT INTO GroupResearchLine (group_id, line_id)
                        SELECT ?, id FROM ResearchLine WHERE name = ?
                          AND NOT EXISTS (SELECT 1 FROM GroupResearchLine WHERE group_id = ? AND line_id = ResearchLine.id);
                    """, linea, linea, db_group_id, linea, db_group_id)

            # 8. Conciliación final y Auditoría
            reconciliation_summary = (
                f"Conciliación: {extracted_products} productos extraídos "
                f"({matched_products} encontrados en BD, {created_products} nuevos en pending, "
                f"{unclassified_products} sin tipología 2024 para reclasificar). "
                f"{len(data.members)} miembros. {len(data.projects)} proyectos. "
                f"{member_authors_count} autorías institucionales, {external_authors_count} coautores externos (sin investigadores ficticios)."
            )
            if data.skipped_sections:
                reconciliation_summary += (
                    f" Secciones sin mapeo 2024: {', '.join(data.skipped_sections)}."
                )

            if conn and job_id:
                cur = conn.cursor()
                cur.execute("""
                    UPDATE ImportJob
                    SET status = 'completed',
                        total_records = ?,
                        new_records = ?,
                        error_count = 0,
                        details = ?,
                        completed_at = GETDATE()
                    WHERE id = ?
                """, total_records, new_records, reconciliation_summary, job_id)

                cur.execute("""
                    INSERT INTO AuditLog (entity_type, entity_id, action, changed_by, change_details)
                    VALUES ('ResearchGroup', ?, 'IMPORT_GRUPLAC_TRANSACTIONAL', 'system_scraper', ?)
                """, db_group_id, reconciliation_summary)
                
                # Confirmar la transacción atómica
                conn.commit()

            # SQL Server remains the source of truth. Reload the native core to
            # prevent RAM/SQL identifier divergence after idempotent upserts.
            if db_conn_str:
                repository.load_from_db(db_conn_str)

            logger.info(f"Compromiso transaccional finalizado exitosamente. {reconciliation_summary}")
            return {
                "status": "success",
                "job_id": job_id,
                "group_id": db_group_id,
                "group_name": data.group["name"],
                "total_records": total_records,
                "new_records": new_records,
                "extracted_products": extracted_products,
                "matched_products": matched_products,
                "created_products": created_products,
                "members_count": len(data.members),
                "projects_count": len(data.projects),
                "reconciliation_summary": reconciliation_summary
            }

        except Exception as e:
            logger.error(f"Error critico en commit transaccional: {e}", exc_info=True)
            if conn and job_id:
                try:
                    conn.rollback()
                    conn.cursor().execute("""
                        UPDATE ImportJob
                        SET status = 'failed',
                            error_count = 1,
                            details = ?,
                            completed_at = GETDATE()
                        WHERE id = ?
                    """, str(e)[:2000], job_id)
                    conn.commit()
                except Exception as ex_inner:
                    logger.error(f"No fue posible actualizar ImportJob fallido: {ex_inner}")
            raise
        finally:
            if conn:
                conn.close()


# =====================================================================
# 6. Punto de Entrada Principal (Pipeline Completo)
# =====================================================================

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
    productos. Los errores individuales se reportan como warnings sin abortar la
    importación del grupo (el commit principal ya se completó).

    Corre en paralelo con `max_workers` hilos (cada commit abre su propia conexión
    pyodbc, así que es seguro). `delay_seconds` es una cortesía por hilo con
    Scienti (no es un límite documentado): si una petición falla se aplica backoff
    adaptativo x4 en ese hilo.
    """
    import time
    from concurrent.futures import ThreadPoolExecutor
    from .cvlac_scraper import CvParser, CvCommitService, fetch_cvlac_text

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

    # Recarga única de la RAM nativa al final (los commits individuales la omiten
    # con reload_ram=False: recargar el núcleo C++ compartido desde varios hilos
    # bloqueaba la corrida).
    try:
        repository.load_from_db(db_conn_str)
    except Exception as e:
        logger.warning(f"[CvLAC] No se pudo recargar la RAM nativa tras la cascada: {e}")

    return report


GRUPLAC_SEARCH_URL = "https://scienti.minciencias.gov.co/ciencia-war/busquedaAvanzadaGrupos.do"


def _busqueda_gruplac_html(fields: Dict[str, str]) -> Optional[str]:
    """
    Ejecuta el formulario del buscador oficial de Scienti y devuelve el HTML
    de resultados. El buscador exige la sesión del GET inicial (cookies).
    """
    base_fields = {
        "codIdGrupo": "", "nmeGrupo": "", "nmeLider": "", "genLider": "",
        "areaConocimiento": "", "annoCreacion": "", "status": "",
        "nmeInstitucion": "", "ciuInst": "", "depInst": "",
        "progNacional": "", "progNacionalSec": "", "integrantes": "",
        "proyectos": "", "productos": "",
    }
    try:
        session = requests.Session()
        session.get(GRUPLAC_SEARCH_URL, params={"buscar": "sinBuscar"}, timeout=20)
        resp = session.post(GRUPLAC_SEARCH_URL, params={"buscar": "buscar"}, data={**base_fields, **fields}, timeout=30)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding or "latin1"
        return resp.text
    except Exception as e:
        logger.warning(f"[GrupLAC] Buscador Scienti falló ({fields}): {e}")
        return None


def buscar_nro_gruplac(nombre: str = "", codigo: str = "") -> Optional[str]:
    """
    Resuelve el nro interno de GrupLAC de un grupo usando el buscador oficial
    de Scienti (busquedaAvanzadaGrupos.do). El nro NO se deriva del cod_grupo_gr
    (p.ej. AITICE es COL0043834 pero su nro es 2668), así que hay que buscarlo.
    Devuelve los dígitos del nro o None si el buscador no arroja resultados.
    """
    digits = "".join(c for c in (codigo or "") if c.isdigit())
    attempts = []
    if codigo:
        attempts.append({"codIdGrupo": codigo})
        if digits and digits != codigo:
            attempts.append({"codIdGrupo": digits})
    if nombre:
        attempts.append({"nmeGrupo": nombre})
    for fields in attempts:
        html = _busqueda_gruplac_html(fields)
        if html:
            m = re.search(r"nro=(\d+)", html)
            if m:
                return m.group(1)
    return None


def buscar_grupos_scienti(nombre: str = "", institucion: str = "", departamento: str = "", clasificacion: str = "", limit: int = 50) -> List[Dict[str, Any]]:
    """
    Busca grupos en el buscador oficial de Scienti por nombre, institución y
    departamento (filtros del formulario público), y opcionalmente filtra por
    clasificación (CATEGORIA A/A1/B/C...) sobre los resultados.
    Cada resultado trae el nro REAL de GrupLAC, su código COL y su URL lista
    para vista previa/importación.
    """
    html = _busqueda_gruplac_html({
        "nmeGrupo": nombre or "",
        "nmeInstitucion": institucion or "",
        "depInst": departamento or "",
    })
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    results: List[Dict[str, Any]] = []
    seen = set()
    for row in soup.select("table#gruposAvanzada tr"):
        a = row.find("a", href=re.compile(r"visualizagr\.jsp\?nro="))
        if not a:
            continue
        m = re.search(r"nro=(\d+)", a["href"])
        if not m or m.group(1) in seen:
            continue
        nro = m.group(1)
        seen.add(nro)
        tds = [td.get_text(strip=True) for td in row.find_all("td")]
        cod = next((t for t in tds if re.fullmatch(r"COL\d+", t)), "")
        categoria = next((t for t in tds if "CATEGORIA" in t.upper()), "")
        convocatoria = next((t for t in tds if "CONVOCATORIA" in t.upper()), "")
        results.append({
            "cod_grupo": cod,
            "nombre": GruplacNormalizer.normalize(a.get_text(strip=True)),
            "nro": nro,
            "clasificacion": categoria.replace("CATEGORIA", "").replace("CATEGORÍA", "").strip(),
            "convocatoria": convocatoria,
            "institucion": institucion or None,
            "departamento": departamento or None,
            "gruplac_url": f"https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro={nro}",
        })
    if clasificacion:
        cf = clasificacion.strip().upper()
        results = [r for r in results if cf in (r["clasificacion"] or "").upper()]
    return results[:limit]


def scrape_gruplac(url: str, db_conn_str: str = "", preview: bool = False, enrich_cvlac: bool = False, cvlac_workers: int = 8, expected_group_code: str = "", cvlac_delay: float = 0.5) -> Dict[str, Any]:
    print("=" * 65)
    print(f"PEA-i Importador GrupLAC (Estructural e Idempotente en SQL)")
    print(f"URL: {url}")
    print("=" * 65)

    # 1. Descarga con validación de host y codificación
    html_content = GruplacHttpClient.fetch(url)

    # 2. Parseo estructural en DTO
    scraped_data = GruplacHtmlParser.parse(html_content, source_url=url)

    # 2.2 Si el caller pidió un grupo específico (código COL o nro), validar que
    # la página corresponda: el nro de GrupLAC NO se deriva del cod_grupo_gr, y una
    # URL equivocada puede abrir la página de OTRO grupo.
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

    # 2.5 Modo vista previa: NO persiste nada, solo retorna el DTO para revision humana
    if preview:
        print("[PREVIEW] Modo vista previa: no se escribio nada en la base de datos.")
        return build_preview(scraped_data)

    # 3. Compromiso transaccional idempotente
    result = GruplacCommitService.commit(scraped_data, db_conn_str=db_conn_str)

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


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    preview_mode = "--preview" in sys.argv

    if not args:
        print("Uso: python -m backend.app.scraper <URL_GRUPLAC> [--preview] [--enrich-cvlac] [--cvlac-workers N]")
        print("     --preview      : solo extrae y muestra la vista previa, sin escribir en BD.")
        print("     --enrich-cvlac : tras importar, descarga el CvLAC de cada integrante con cod_rh.")
        print("     --cvlac-workers N : hilos paralelos para la cascada CvLAC (default 8, optimo medido).")
        sys.exit(1)

    url_arg = args[0]
    enrich_mode = "--enrich-cvlac" in sys.argv
    workers = 8
    for a in sys.argv:
        if a.startswith("--cvlac-workers="):
            workers = max(1, int(a.split("=", 1)[1]))
    conn_str = os.environ.get(
        "PEAI_SQLSERVER_CONNECTION",
        "Driver={ODBC Driver 18 for SQL Server};Server=127.0.0.1;Database=peai;UID=sa;PWD=***REMOVED***;TrustServerCertificate=yes;"
    )

    if preview_mode:
        scrape_gruplac(url_arg, preview=True)
    else:
        repository.initialize(repository.InitMode.Database, conn_str)
        repository._active_connection_string = conn_str
        scrape_gruplac(url_arg, conn_str, enrich_cvlac=enrich_mode, cvlac_workers=workers)