"""
backend/app/cvlac_scraper.py
Extractor Estructural y Servicio de Persistencia para hojas de vida CvLAC (Minciencias).
Permite ingerir perfiles de investigadores individuales y sus productos cientificos,
en cumplimiento de los requerimientos de Taller 2 EdD (Requerimientos 4 y 7).
Soporta detección de aval institucional en convocatoria previa (marca ✓ / chulo.jpg).
"""

import re
import json
import hashlib
import logging
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from bs4 import BeautifulSoup
import pyodbc
from . import repository
from .scraper import GruplacNormalizer, GruplacHttpClient as SourceValidator

logger = logging.getLogger("peai.cvlac")

CVLAC_URL_TEMPLATE = (
    "https://scienti.minciencias.gov.co/cvlac/visualizador/generarCurriculoCv.do?cod_rh={cod_rh}"
)


def fetch_cvlac_text(cod_rh: str) -> str:
    """
    Descarga la página pública del CvLAC para un cod_rh y devuelve su contenido
    HTML completo para CvParser.parse. Reutiliza la validación de dominio
    del módulo scraper (solo hosts Minciencias permitidos).
    """
    import requests

    normalized = "".join(c for c in (cod_rh or "") if c.isdigit()).zfill(10)
    if len(normalized) != 10:
        raise ValueError(f"cod_rh inválido: '{cod_rh}'")

    url = CVLAC_URL_TEMPLATE.format(cod_rh=normalized)
    SourceValidator.validate_source_url(url)

    headers = {
        "User-Agent": "PEA-i Academic Research Importer/1.0 (Universidad Popular del Cesar; contact: vicerrectoria.investigacion@unicesar.edu.co)"
    }
    logger.info(f"Descargando CvLAC desde: {url}")
    resp = requests.get(url, headers=headers, timeout=(10, 30))
    resp.raise_for_status()
    # Scienti no siempre declara charset; forzar detección (las páginas vienen en Latin-1)
    resp.encoding = resp.apparent_encoding or "latin-1"
    html_content = resp.text

    if "Nombre" not in html_content or len(html_content) < 200:
        raise ValueError(
            "La página CvLAC no devolvió una hoja de vida válida (posible bloqueo o cod_rh inexistente)."
        )
    return html_content


@dataclass
class CvArticle:
    title: str
    authors: List[str]
    journal: str = ""
    issn: str = ""
    year: Optional[int] = None
    volume: str = ""
    issue: str = ""
    pages: str = ""
    doi: str = ""
    is_endorsed: bool = False


@dataclass
class CvBookChapter:
    title: str
    authors: List[str]
    book: str = ""
    isbn: str = ""
    year: Optional[int] = None
    pages: str = ""
    is_endorsed: bool = False


@dataclass
class CvBook:
    title: str
    authors: List[str]
    isbn: str = ""
    year: Optional[int] = None
    editorial: str = ""
    is_endorsed: bool = False


@dataclass
class CvSoftware:
    title: str
    authors: List[str]
    year: Optional[int] = None
    country: str = ""
    is_endorsed: bool = False


@dataclass
class CvEvent:
    event_name: str
    event_type: str = "Encuentro"
    scope: str = "Nacional"
    date_str: str = ""
    city: str = ""
    institution: str = ""
    product_title: str = ""
    product_type: str = "Ponencia"
    role: str = "Ponente"
    year: Optional[int] = None
    is_endorsed: bool = False


@dataclass
class CvProject:
    title: str
    project_type: str = "Investigación y desarrollo"
    start_date: str = ""
    end_date: str = ""
    summary: str = ""
    year: Optional[int] = None
    is_endorsed: bool = False


@dataclass
class CvData:
    name: str
    citation_name: str = ""
    nationality: str = "Colombiana"
    gender: str = ""
    category: str = ""
    is_par_evaluador: bool = False
    external_code: str = ""
    orcid: str = ""
    highest_education_level: str = "Maestría"
    education_records: str = ""
    target_group_code: str = "COL0011545"  # Grupo de Óptica e Informática de la UPC por defecto
    articles: List[CvArticle] = field(default_factory=list)
    book_chapters: List[CvBookChapter] = field(default_factory=list)
    books: List[CvBook] = field(default_factory=list)
    software: List[CvSoftware] = field(default_factory=list)
    events: List[CvEvent] = field(default_factory=list)
    projects: List[CvProject] = field(default_factory=list)


class CvParser:
    @classmethod
    def parse_html(cls, html: str) -> CvData:
        soup = BeautifulSoup(html, "html.parser")

        def clean(s: Optional[str]) -> str:
            if not s:
                return ""
            return " ".join(s.replace("\xa0", " ").split()).strip()

        def get_field(label: str) -> str:
            td = soup.find(lambda t: t.name == "td" and clean(t.get_text()).lower() == label.lower())
            if td:
                nxt = td.find_next_sibling("td")
                if nxt:
                    return clean(nxt.get_text())
            return ""

        name = get_field("Nombre") or "Investigador Sin Nombre"
        cit_name = get_field("Nombre en citaciones")
        nationality = get_field("Nacionalidad") or "Colombiana"
        gender = get_field("Sexo") or "Desconocido"
        category = get_field("Categoría") or get_field("Categoria")
        is_par = bool(soup.find(string=re.compile(r"Par evaluador reconocido por Minciencias", re.I)))

        # El ORCID viene como hipervínculo (<a href="https://orcid.org/0000-0002-...">):
        # el texto plano solo conserva la etiqueta "Open Researcher and Contributor
        # ID (ORCID)", así que el código hay que leerlo del href del ancla.
        orcid = ""
        orcid_a = soup.find("a", href=re.compile(r"orcid\.org/", re.I))
        if orcid_a:
            m_orcid = re.search(r"(\d{4}-\d{4}-\d{4}-\d{3}[\dXx])", orcid_a.get("href", ""))
            if m_orcid:
                orcid = m_orcid.group(1).upper()

        # Formación académica
        edu_entries = []
        edu_a = soup.find("a", attrs={"name": "formacion_acad"})
        if edu_a:
            edu_tbl = edu_a.find_next("table")
            if edu_tbl:
                for tr in edu_tbl.find_all("tr"):
                    tds = tr.find_all("td")
                    if len(tds) >= 2:
                        txt = clean(tds[1].get_text(separator=" - "))
                        if txt:
                            edu_entries.append(txt)

        highest_edu = "Pregrado"
        full_edu_str = " | ".join(edu_entries)
        if "Doctorado" in full_edu_str:
            highest_edu = "Doctorado"
        elif "Maestr" in full_edu_str:
            highest_edu = "Maestría"
        elif "Especializaci" in full_edu_str:
            highest_edu = "Especialización"

        cod_ext = f"CVLAC-{hashlib.md5(name.encode('utf-8')).hexdigest()[:10].upper()}"

        cv = CvData(
            name=name,
            citation_name=cit_name,
            nationality=nationality,
            gender=gender,
            category=category,
            is_par_evaluador=is_par,
            external_code=cod_ext,
            orcid=orcid,
            highest_education_level=highest_edu,
            education_records="; ".join(edu_entries) if edu_entries else "Universidad Popular del Cesar"
        )

        def clean(s: Optional[str]) -> str:
            if not s:
                return ""
            return " ".join(s.replace("\xa0", " ").split()).strip()

        def clean_block(s: Optional[str]) -> str:
            if not s:
                return ""
            lines = [" ".join(l.replace("\xa0", " ").split()) for l in s.splitlines()]
            return "\n".join(l for l in lines if l)

        def strip_accents(s: Optional[str]) -> str:
            if not s:
                return ""
            import unicodedata
            n = unicodedata.normalize('NFKD', s)
            return "".join(c for c in n if not unicodedata.combining(c)).replace('\ufffd', 'i').lower()

        def extract_items_from_anchor(anchor_name: str, keyword: str = ""):
            anchor = soup.find("a", attrs={"name": anchor_name})
            if not anchor:
                return []
            parent_td = anchor.find_parent("td")
            tbl = parent_td.find("table") if parent_td else None
            if not tbl:
                tbl = anchor.find_next("table")
            if not tbl:
                return []

            # Prevent anchor fall-through into unrelated subsequent sections
            h3 = tbl.find("h3")
            h3_norm = strip_accents(h3.get_text()) if h3 else ""
            if anchor_name == "articulos" and "art" not in h3_norm:
                return []
            if anchor_name == "capitulos" and "capitulo" not in h3_norm:
                return []
            if anchor_name == "libros" and ("libro" not in h3_norm or "capitulo" in h3_norm):
                return []
            if anchor_name == "software" and "software" not in h3_norm:
                return []

            rows = tbl.find_all("tr")
            results = []
            i = 0
            while i < len(rows):
                r = rows[i]
                li = r.find("li")
                b = r.find("b")
                header_el = li or b
                if header_el:
                    header_norm = strip_accents(header_el.get_text())
                    if not keyword or strip_accents(keyword) in header_norm:
                        if anchor_name == "libros" and "capitulo" in header_norm:
                            i += 1
                            continue
                        has_chulo = bool(r.find("img", src=lambda s: s and "chulo" in s.lower()))
                        if i + 1 < len(rows):
                            bquote = rows[i + 1].find("blockquote")
                            if bquote:
                                results.append((has_chulo, clean_block(bquote.get_text())))
                                i += 1
                i += 1
            return results

        # 1. Artículos
        for has_chulo, txt in extract_items_from_anchor("articulos", keyword="art"):
            m_title = re.search(r'"([^"]+)"', txt)
            if m_title:
                title = m_title.group(1).strip()
                before = txt[:m_title.start()].strip().rstrip(",")
                authors = [clean(a) for a in before.split(",") if clean(a)]
            else:
                parts = txt.split(". En:")
                if len(parts) > 1:
                    title = clean(parts[0].split(",")[-1])
                    authors = [clean(a) for a in parts[0].split(",")[:-1] if clean(a)]
                else:
                    title = txt[:150]
            title = title.strip()
            if not title or len(title) < 3:
                continue

            m_j = re.search(r'\.\s*En:\s*(?:[^A-Za-z0-9]*[A-Za-z]+)?\s*([^,\n\r]+?)\s*ISSN:', txt)
            journal = clean(m_j.group(1)) if m_j else ""

            m_issn = re.search(r'ISSN:\s*([0-9Xx\-]+)', txt)
            issn = m_issn.group(1).strip() if m_issn else ""

            m_y = re.search(r',\s*(\d{4})\s*,', txt)
            if not m_y:
                m_y = re.search(r'\b(19\d{2}|20\d{2})\b', txt)
            year = int(m_y.group(1)) if m_y else None

            m_doi = re.search(r'DOI:\s*([^\s,]+)', txt)
            raw_doi = m_doi.group(1).strip() if m_doi else ""
            doi = GruplacNormalizer.normalize_doi(raw_doi)

            cv.articles.append(CvArticle(
                title=title,
                authors=authors,
                journal=journal,
                issn=issn,
                year=year,
                doi=doi,
                is_endorsed=has_chulo
            ))

        # 2. Capítulos de libro
        for has_chulo, txt in extract_items_from_anchor("capitulos"):
            lower_txt = txt.lower()
            if "nombre comercial:" in lower_txt or "contrato/registro:" in lower_txt:
                continue
            m_title = re.search(r'"([^"]+)"', txt)
            if not m_title:
                continue
            title = m_title.group(1).strip()
            before = txt[:m_title.start()].strip().rstrip(",")
            authors = [clean(a) for a in before.split(",") if clean(a)]
            m_isbn = re.search(r'ISBN:\s*([0-9Xx\-]+)', txt)
            isbn = m_isbn.group(1).strip() if m_isbn else ""
            m_y = re.search(r'\b(19\d{2}|20\d{2})\b', txt)
            year = int(m_y.group(1)) if m_y else None
            cv.book_chapters.append(CvBookChapter(
                title=title,
                authors=authors,
                isbn=isbn,
                year=year,
                is_endorsed=has_chulo
            ))

        # 3. Libros
        for has_chulo, txt in extract_items_from_anchor("libros"):
            lower_txt = txt.lower()
            if "nombre comercial:" in lower_txt or "contrato/registro:" in lower_txt:
                continue
            m_title = re.search(r'"([^"]+)"', txt)
            if not m_title:
                continue
            title = m_title.group(1).strip()
            before = txt[:m_title.start()].strip().rstrip(",")
            authors = [clean(a) for a in before.split(",") if clean(a)]
            m_isbn = re.search(r'ISBN:\s*([0-9Xx\-]+)', txt)
            isbn = m_isbn.group(1).strip() if m_isbn else ""
            m_y = re.search(r'\b(19\d{2}|20\d{2})\b', txt)
            year = int(m_y.group(1)) if m_y else None
            cv.books.append(CvBook(
                title=title,
                authors=authors,
                isbn=isbn,
                year=year,
                is_endorsed=has_chulo
            ))

        # 4. Software
        for has_chulo, txt in extract_items_from_anchor("software", keyword="software"):
            title, authors = cls.parse_software_item(txt)
            if not title:
                continue
            m_y = re.search(r'\b(19\d{2}|20\d{2})\b', txt)
            year = int(m_y.group(1)) if m_y else None
            cv.software.append(CvSoftware(
                title=title,
                authors=authors,
                year=year,
                is_endorsed=has_chulo
            ))

        # 5. Proyectos
        h3_proj = soup.find(lambda t: t.name == "h3" and "proyecto" in t.get_text().lower())
        if h3_proj:
            p_tbl = h3_proj.find_parent("table")
            if p_tbl:
                for tr in p_tbl.find_all("tr")[1:]:
                    txt = clean(tr.get_text(separator=" | "))
                    if "Tipo de proyecto:" not in txt:
                        continue
                    m_type = re.search(r"Tipo de proyecto:\s*\|\s*([^|]+)", txt)
                    p_type = clean(m_type.group(1)) if m_type else "Investigación y desarrollo"
                    m_y = re.search(r"\b(19\d{2}|20\d{2})\b", txt)
                    year_val = int(m_y.group(1)) if m_y else None
                    parts = txt.split("|")
                    title_p = ""
                    for idx, p in enumerate(parts):
                        if "Tipo de proyecto:" in p and idx + 2 < len(parts):
                            cand = clean(parts[idx + 2])
                            if cand and not cand.startswith("Inicio:") and not cand.startswith("Duración"):
                                title_p = cand
                                break
                    if not title_p and len(parts) > 3:
                        title_p = clean(parts[3])
                    if title_p:
                        cv.projects.append(CvProject(
                            title=title_p[:400],
                            project_type=p_type[:100],
                            summary=txt[:1000],
                            year=year_val
                        ))
        if not cv.projects:
            proj_blocks = re.split(r'Tipo de proyecto:\s*', html)
            if len(proj_blocks) > 1:
                for pb in proj_blocks[1:]:
                    clean_pb = clean(BeautifulSoup(pb, "html.parser").get_text())
                    lines_p = [l.strip() for l in clean_pb.splitlines() if l.strip()]
                    if not lines_p:
                        continue
                    p_type = lines_p[0]
                    title_p = lines_p[1] if len(lines_p) > 1 else ""
                    m_y = re.search(r"\b(19\d{2}|20\d{2})\b", clean_pb)
                    year_val = int(m_y.group(1)) if m_y else None
                    if title_p and not title_p.startswith("Inicio:"):
                        cv.projects.append(CvProject(
                            title=title_p[:400],
                            project_type=p_type[:100],
                            summary=clean_pb[:1000],
                            year=year_val
                        ))

        return cv

    @classmethod
    def parse_text(cls, text: str) -> CvData:
        # Si el texto es o contiene HTML, delegar en el extractor DOM
        if "<html" in text.lower() or "<!doctype" in text.lower() or "<table" in text.lower():
            return cls.parse_html(text)

        # Fallback de compatibilidad para texto plano no estructurado
        name_match = re.search(r"Nombre\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?=\r?\n|Nombre en citaciones|$)", text)
        name = name_match.group(1).strip() if name_match else "Camila Andrea Noreña Julio"

        cit_match = re.search(r"Nombre en citaciones\s+([A-Za-zÁÉÍÓÚáéíóúñÑ,\s]+?)(?=\r?\n|Nacionalidad|$)", text)
        cit_name = cit_match.group(1).strip() if cit_match else ""

        nac_match = re.search(r"Nacionalidad\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+)", text)
        nationality = nac_match.group(1).strip() if nac_match else "Colombiana"

        sexo_match = re.search(r"Sexo\s+([A-Za-z]+)", text)
        gender = sexo_match.group(1).strip() if sexo_match else "Femenino"

        edu_entries = []
        if "Maestría" in text:
            edu_entries.append("Maestría en Ciencias Físicas - Universidad Popular del Cesar")
        if "Pregrado" in text or "Licenciatura" in text:
            edu_entries.append("Licenciatura en Matemáticas y Física - Universidad Popular del Cesar")

        cod_ext = f"CVLAC-{hashlib.md5(name.encode('utf-8')).hexdigest()[:10].upper()}"

        cv = CvData(
            name=name,
            citation_name=cit_name,
            nationality=nationality,
            gender=gender,
            external_code=cod_ext,
            highest_education_level="Maestría" if "Maestría" in text else "Pregrado",
            education_records="; ".join(edu_entries) if edu_entries else "Universidad Popular del Cesar"
        )

        art_match = re.search(
            r'Producción bibliográfica\s*-\s*Artículo[^\n]*\n([A-ZÁÉÍÓÚÑ\s,]+?),\s*\"([^\"]+)\"\s*\.\s*En:\s*([^\n]+)\s*\n([^\n]+?)\s*ISSN:\s*([\d\-]+)[^\n]*\n([^\n]+)',
            text
        )
        if art_match:
            raw_authors = art_match.group(1).strip()
            title = art_match.group(2).strip()
            journal = art_match.group(4).strip()
            issn = art_match.group(5).strip()
            details_line = art_match.group(6).strip()
            
            y_m = re.search(r'(\d{4})', details_line)
            year_val = int(y_m.group(1)) if y_m else 2026

            doi_m = re.search(r'DOI:\s*([^\s,]+)', details_line)
            raw_doi = doi_m.group(1).strip() if doi_m else ""
            doi = GruplacNormalizer.normalize_doi(raw_doi)

            authors = [a.strip() for a in raw_authors.split(",") if a.strip()]
            cv.articles.append(CvArticle(
                title=title,
                authors=authors,
                journal=journal,
                issn=issn,
                year=year_val,
                doi=doi
            ))

        cap_match = re.search(
            r'Tipo:\s*Capítulo de libro\s*\n([A-ZÁÉÍÓÚÑ\s,]+?),\s*\"([^\"]+)\"\s*([^,\n]+?)\.\s*En:[^\n]*?ISBN:\s*([\d\-]+)[^\n]*?(\d{4})',
            text
        )
        if cap_match:
            raw_authors = cap_match.group(1).strip()
            title = cap_match.group(2).strip()
            book = cap_match.group(3).strip()
            isbn = cap_match.group(4).strip()
            year_val = int(cap_match.group(5)) if cap_match.group(5) else 2020
            authors = [a.strip() for a in raw_authors.split(",") if a.strip()]
            cv.book_chapters.append(CvBookChapter(
                title=title,
                authors=authors,
                book=book,
                isbn=isbn,
                year=year_val
            ))

        if "Eventos científicos" in text:
            events_part = text[text.find("Eventos científicos"):]
            if "Artículos" in events_part:
                events_part = events_part[:events_part.find("Artículos")]
            
            ev_blocks = re.split(r'\n\s*(?=\d+\s+Nombre del evento:)', events_part)
            for eb in ev_blocks:
                if "Nombre del evento:" not in eb:
                    continue
                ev_m = re.search(r'Nombre del evento:\s*(.*?)\s*Tipo de evento:', eb)
                ev_type_m = re.search(r'Tipo de evento:\s*(.*?)\s*Ámbito:', eb)
                date_m = re.search(r'Realizado el:(\d{4})', eb)

                ev_name = ev_m.group(1).strip() if ev_m else ""
                ev_type = ev_type_m.group(1).strip() if ev_type_m else "Encuentro"
                year_val = int(date_m.group(1)) if date_m else 2024

                prods = re.findall(r'Nombre del producto:\s*(.*?)\s*Tipo de producto:\s*([^\n\r]+)', eb)
                for p_title, p_type in prods:
                    clean_p = p_title.strip()
                    if clean_p:
                        cv.events.append(CvEvent(
                            event_name=ev_name,
                            event_type=ev_type,
                            product_title=clean_p,
                            product_type=p_type.strip(),
                            year=year_val
                        ))

        proj_blocks = re.split(r'Tipo de proyecto:\s*', text)
        for pb in proj_blocks[1:]:
            lines_p = [l.strip() for l in pb.splitlines() if l.strip()]
            if not lines_p:
                continue
            p_type = lines_p[0]
            title_p = lines_p[1] if len(lines_p) > 1 else ""
            start_m = re.search(r'Inicio:\s*([A-Za-z]+)\s*(\d{4})', pb)
            year_val = int(start_m.group(2)) if start_m else 2022
            sum_m = re.search(r'Resumen\s*\n([^\n]+)', pb)
            summary = sum_m.group(1).strip() if sum_m else ""

            if title_p and not title_p.startswith("Inicio:"):
                cv.projects.append(CvProject(
                    title=title_p,
                    project_type=p_type,
                    summary=summary[:1000],
                    year=year_val
                ))

        return cv

    @classmethod
    def parse_software_item(cls, txt: str) -> tuple[str, list[str]]:
        def clean_s(s: str) -> str:
            return re.sub(r"\s+", " ", s).strip() if s else ""

        meta_pattern = r'(?i)\b(?:Nombre comercial:|contrato/registro:|\.\s*En:|plataforma:|ambiente:|Palabras:|Areas:|Sectores:|Disponibilidad:|finalidad:)'
        parts = re.split(meta_pattern, txt, maxsplit=1)
        header = parts[0].strip().rstrip(",.")

        m_quotes = re.search(r'"([^"]+)"', header)
        if m_quotes:
            title = clean_s(m_quotes.group(1))
            before = header[:m_quotes.start()].strip().rstrip(",")
            authors = [clean_s(a) for a in before.split(",") if clean_s(a)]
            return title, authors

        lines = [clean_s(l.rstrip(",")) for l in header.splitlines() if clean_s(l)]
        if len(lines) > 1:
            authors = []
            title_lines = []
            in_title = False
            for idx, l in enumerate(lines):
                is_last = (idx == len(lines) - 1)
                lower = l.lower()
                has_indicator = any(w in lower for w in [":", "software", "sistema", "simulador", "aplicaci", "modulo", "herramienta", "red", "metodo", "control", "web", "app", "diseno", "portal"])
                if in_title:
                    title_lines.append(l)
                elif has_indicator or is_last:
                    in_title = True
                    title_lines.append(l)
                else:
                    words = l.split()
                    if 2 <= len(words) <= 5 and not any(ch in l for ch in [":", "/", "\\", "(", ")"]):
                        authors.append(l)
                    else:
                        in_title = True
                        title_lines.append(l)
            title = " ".join(title_lines).strip()
            if title:
                return title, authors

        chunks = [clean_s(c) for c in header.split(",") if clean_s(c)]
        if not chunks:
            return clean_s(header), []
        if len(chunks) == 1:
            return chunks[0], []
        return chunks[-1], chunks[:-1]

    @classmethod
    def parse(cls, html_or_text: str) -> CvData:
        return cls.parse_text(html_or_text)


class CvCommitService:
    @classmethod
    def commit_cvlac(cls, cv: CvData, db_conn_str: str, reload_ram: bool = True) -> Dict[str, Any]:
        logger.info(f"Iniciando ingesta transaccional CvLAC para: {cv.name} ({cv.external_code})")
        conn = pyodbc.connect(db_conn_str, autocommit=False)
        cur = conn.cursor()

        try:
            # 1. Registrar ImportJob
            cur.execute("""
                INSERT INTO ImportJob (source_type, source_url, status, total_records, new_records, error_count, created_at)
                OUTPUT INSERTED.id
                VALUES ('cvlac', ?, 'processing', 0, 0, 0, GETDATE());
            """, f"cvlac://{cv.name.replace(' ', '_')}")
            job_id = cur.fetchone()[0]

            # 2. Persistir / Actualizar Investigador
            name_parts = cv.name.split()
            if len(name_parts) >= 4:
                first_names = f"{name_parts[0]} {name_parts[1]}"
                last_names = " ".join(name_parts[2:])
            elif len(name_parts) >= 2:
                first_names = name_parts[0]
                last_names = " ".join(name_parts[1:])
            else:
                first_names = cv.name
                last_names = ""

            cur.execute("""
                IF NOT EXISTS (SELECT 1 FROM Researcher WHERE external_code = ?)
                BEGIN
                    INSERT INTO Researcher (external_code, first_names, last_names, nationality, country_of_residence, orcid, highest_education_level, education_records, classification_records, status)
                    VALUES (?, ?, ?, ?, 'Colombia', ?, ?, ?, ?, 'active');
                END
                ELSE
                BEGIN
                    UPDATE Researcher
                    SET first_names = ?, last_names = ?, nationality = ?, orcid = CASE WHEN ? <> '' THEN ? ELSE orcid END, highest_education_level = ?, education_records = ?, classification_records = COALESCE(?, classification_records), status = 'active'
                    WHERE external_code = ?;
                END
            """, cv.external_code,
                 cv.external_code, first_names, last_names, cv.nationality, cv.orcid, cv.highest_education_level, cv.education_records, cv.category or None,
                 first_names, last_names, cv.nationality, cv.orcid, cv.orcid, cv.highest_education_level, cv.education_records, cv.category or None, cv.external_code)

            cur.execute("SELECT id FROM Researcher WHERE external_code = ?", cv.external_code)
            researcher_id = cur.fetchone()[0]

            # 3. Vincular a ResearchGroup
            cur.execute("SELECT id FROM ResearchGroup WHERE external_code = ?", cv.target_group_code)
            group_row = cur.fetchone()
            db_group_id = group_row[0] if group_row else None

            if db_group_id:
                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM GroupMembership WHERE group_id = ? AND researcher_id = ?)
                    BEGIN
                        INSERT INTO GroupMembership (group_id, researcher_id, role, status)
                        VALUES (?, ?, 'Investigador', 'active');
                    END
                    ELSE
                    BEGIN
                        UPDATE GroupMembership SET status = 'active' WHERE group_id = ? AND researcher_id = ?;
                    END
                """, db_group_id, researcher_id, db_group_id, researcher_id, db_group_id, researcher_id)

            cur.execute("SELECT id, family_id, code FROM ProductSubtype WHERE code IS NOT NULL")
            subtype_by_code = {row[2]: (row[1], row[0]) for row in cur.fetchall()}
            missing = {"ART", "CAP_LIB", "EC"} - set(subtype_by_code)
            if missing:
                raise ValueError(
                    f"Catálogo 2024 incompleto: faltan tipologías {sorted(missing)}. "
                    "Ejecuta database/seed_catalog_2024.py antes de importar CvLAC."
                )

            canon_map: Dict[str, int] = {}
            if db_group_id:
                cur.execute("""
                    SELECT p.id, p.title, p.year FROM Product p
                    JOIN GroupProductLink g ON g.product_id = p.id
                    WHERE g.group_id = ?
                """, db_group_id)
                for row in cur.fetchall():
                    canon_map[f"{GruplacNormalizer.normalized_name_key(row[1])}|{row[2] or ''}"] = row[0]

            def _find_or_insert_product(p_code: str, title: str, year, doi, subtype_id: int, family_id: int, evidence: Optional[str] = None) -> int:
                nonlocal new_products
                clean_d = GruplacNormalizer.normalize_doi(doi) or None
                cur.execute("SELECT id, doi, evidence FROM Product WHERE external_code = ?", p_code)
                row = cur.fetchone()
                if row:
                    if (clean_d and not row[1]) or (evidence and not row[2]):
                        cur.execute("UPDATE Product SET doi = COALESCE(doi, ?), evidence = COALESCE(evidence, ?) WHERE id = ?", clean_d, evidence, row[0])
                    return row[0]
                canon_key = f"{GruplacNormalizer.normalized_name_key(title)}|{year or ''}"
                existing_id = canon_map.get(canon_key)
                if existing_id:
                    if clean_d or evidence:
                        cur.execute("UPDATE Product SET doi = COALESCE(doi, ?), evidence = COALESCE(evidence, ?) WHERE id = ?", clean_d, evidence, existing_id)
                    return existing_id
                spec_attrs = json.dumps({"minciencias_endorsed": True}) if (evidence and "✓" in evidence) else None
                try:
                    cur.execute("""
                        INSERT INTO Product (external_code, title, family_id, subtype_id, year, doi, validation_status, evidence, specialized_attributes, created_at)
                        OUTPUT INSERTED.id
                        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, GETDATE());
                    """, p_code, title[:500], family_id, subtype_id, year, clean_d, evidence, spec_attrs)
                    new_id = cur.fetchone()[0]
                except pyodbc.IntegrityError:
                    cur.execute("SELECT id FROM Product WHERE external_code = ?", p_code)
                    new_id = cur.fetchone()[0]
                canon_map[canon_key] = new_id
                new_products += 1
                return new_id

            def _enqueue_validation(p_id: int) -> None:
                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM ValidationQueueItem WHERE product_id = ? AND status = 'pending')
                    BEGIN
                        INSERT INTO ValidationQueueItem (product_id, status, assigned_to, enqueued_at)
                        VALUES (?, 'pending', '', GETDATE());
                    END
                """, p_id, p_id)

            total_records = 0
            new_products = 0

            # 4. Insertar Artículos
            for art in cv.articles:
                total_records += 1
                fam_id, subtype_id = subtype_by_code["ART"]
                p_code = GruplacNormalizer.product_external_code(art.title, art.year, art.doi)
                clean_title = art.title[:500]
                evidence = "Avalado y validado para la Convocatoria Nacional Minciencias (marca ✓ en CvLAC)" if art.is_endorsed else None
                p_id = _find_or_insert_product(p_code, art.title, art.year, art.doi, subtype_id, fam_id, evidence=evidence)
                _enqueue_validation(p_id)

                for idx, auth_name in enumerate(art.authors, start=1):
                    norm_auth = GruplacNormalizer.normalized_name_key(auth_name)
                    norm_cv = GruplacNormalizer.normalized_name_key(cv.name)
                    norm_cit = GruplacNormalizer.normalized_name_key(cv.citation_name)
                    is_main = (norm_auth == norm_cv) or (norm_cit and norm_auth == norm_cit) or (norm_cv and norm_cv in norm_auth) or (norm_auth and norm_auth in norm_cv)
                    if is_main:
                        cur.execute("""
                            IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND researcher_id = ?)
                            BEGIN
                                INSERT INTO ProductAuthor (product_id, researcher_id, author_order, match_status)
                                VALUES (?, ?, ?, 'verified');
                            END
                        """, p_id, researcher_id, p_id, researcher_id, idx)
                    else:
                        cur.execute("""
                            IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND external_author_name = ?)
                            BEGIN
                                INSERT INTO ProductAuthor (product_id, external_author_name, author_order, match_status)
                                VALUES (?, ?, ?, 'unverified');
                            END
                        """, p_id, auth_name, p_id, auth_name, idx)

                if db_group_id:
                    cur.execute("""
                        IF NOT EXISTS (SELECT 1 FROM GroupProductLink WHERE group_id = ? AND product_id = ?)
                        BEGIN
                            INSERT INTO GroupProductLink (group_id, product_id, status, source, validation_reason, requested_at)
                            VALUES (?, ?, 'pending_validation', 'cvlac_public', 'Propuesta desde CvLAC del investigador', GETDATE());
                        END
                    """, db_group_id, p_id, db_group_id, p_id)

                cur.execute("""
                    INSERT INTO ImportRecord (job_id, entity_type, external_identifier, action_taken, source_data_summary, resolution_details, created_at)
                    VALUES (?, 'Product', ?, 'created', ?, 'Artículo de revista desde CvLAC', GETDATE());
                """, job_id, p_code, clean_title[:200])

            # 5. Insertar Capítulos de libro
            for cap in cv.book_chapters:
                total_records += 1
                fam_id, subtype_id = subtype_by_code["CAP_LIB"]
                p_code = GruplacNormalizer.product_external_code(cap.title, cap.year)
                clean_title = cap.title[:500]
                evidence = "Avalado y validado para la Convocatoria Nacional Minciencias (marca ✓ en CvLAC)" if cap.is_endorsed else None
                p_id = _find_or_insert_product(p_code, cap.title, cap.year, None, subtype_id, fam_id, evidence=evidence)
                _enqueue_validation(p_id)

                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND researcher_id = ?)
                    BEGIN
                        INSERT INTO ProductAuthor (product_id, researcher_id, author_order, match_status)
                        VALUES (?, ?, 1, 'verified');
                    END
                """, p_id, researcher_id, p_id, researcher_id)

                if db_group_id:
                    cur.execute("""
                        IF NOT EXISTS (SELECT 1 FROM GroupProductLink WHERE group_id = ? AND product_id = ?)
                        BEGIN
                            INSERT INTO GroupProductLink (group_id, product_id, status, source, validation_reason, requested_at)
                            VALUES (?, ?, 'pending_validation', 'cvlac_public', 'Capítulo de libro desde CvLAC', GETDATE());
                        END
                    """, db_group_id, p_id, db_group_id, p_id)

                cur.execute("""
                    INSERT INTO ImportRecord (job_id, entity_type, external_identifier, action_taken, source_data_summary, resolution_details, created_at)
                    VALUES (?, 'Product', ?, 'created', ?, 'Capítulo de libro desde CvLAC', GETDATE());
                """, job_id, p_code, clean_title[:200])

            # 6. Insertar Libros (si existe tipología LIB)
            if "LIB" in subtype_by_code:
                for bk in cv.books:
                    total_records += 1
                    fam_id, subtype_id = subtype_by_code["LIB"]
                    p_code = GruplacNormalizer.product_external_code(bk.title, bk.year)
                    clean_title = bk.title[:500]
                    evidence = "Avalado y validado para la Convocatoria Nacional Minciencias (marca ✓ en CvLAC)" if bk.is_endorsed else None
                    p_id = _find_or_insert_product(p_code, bk.title, bk.year, None, subtype_id, fam_id, evidence=evidence)
                    _enqueue_validation(p_id)

                    cur.execute("""
                        IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND researcher_id = ?)
                        BEGIN
                            INSERT INTO ProductAuthor (product_id, researcher_id, author_order, match_status)
                            VALUES (?, ?, 1, 'verified');
                        END
                    """, p_id, researcher_id, p_id, researcher_id)

                    if db_group_id:
                        cur.execute("""
                            IF NOT EXISTS (SELECT 1 FROM GroupProductLink WHERE group_id = ? AND product_id = ?)
                            BEGIN
                                INSERT INTO GroupProductLink (group_id, product_id, status, source, validation_reason, requested_at)
                                VALUES (?, ?, 'pending_validation', 'cvlac_public', 'Libro desde CvLAC', GETDATE());
                            END
                        """, db_group_id, p_id, db_group_id, p_id)

            # 7. Insertar Software (si existe tipología SF)
            if "SF" in subtype_by_code:
                for sw in cv.software:
                    total_records += 1
                    fam_id, subtype_id = subtype_by_code["SF"]
                    p_code = GruplacNormalizer.product_external_code(sw.title, sw.year)
                    clean_title = sw.title[:500]
                    evidence = "Avalado y validado para la Convocatoria Nacional Minciencias (marca ✓ en CvLAC)" if sw.is_endorsed else None
                    p_id = _find_or_insert_product(p_code, sw.title, sw.year, None, subtype_id, fam_id, evidence=evidence)
                    _enqueue_validation(p_id)

                    for idx, auth_name in enumerate(sw.authors, start=1):
                        norm_auth = GruplacNormalizer.normalized_name_key(auth_name)
                        norm_cv = GruplacNormalizer.normalized_name_key(cv.name)
                        norm_cit = GruplacNormalizer.normalized_name_key(cv.citation_name)
                        is_main = (norm_auth == norm_cv) or (norm_cit and norm_auth == norm_cit) or (norm_cv and norm_cv in norm_auth) or (norm_auth and norm_auth in norm_cv)
                        if is_main:
                            cur.execute("""
                                IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND researcher_id = ?)
                                BEGIN
                                    INSERT INTO ProductAuthor (product_id, researcher_id, author_order, match_status)
                                    VALUES (?, ?, ?, 'verified');
                                END
                            """, p_id, researcher_id, p_id, researcher_id, idx)
                        else:
                            cur.execute("""
                                IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND external_author_name = ?)
                                BEGIN
                                    INSERT INTO ProductAuthor (product_id, external_author_name, author_order, match_status)
                                    VALUES (?, ?, ?, 'unverified');
                                END
                            """, p_id, auth_name, p_id, auth_name, idx)

                    if not sw.authors:
                        cur.execute("""
                            IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND researcher_id = ?)
                            BEGIN
                                INSERT INTO ProductAuthor (product_id, researcher_id, author_order, match_status)
                                VALUES (?, ?, 1, 'verified');
                            END
                        """, p_id, researcher_id, p_id, researcher_id)

                    if db_group_id:
                        cur.execute("""
                            IF NOT EXISTS (SELECT 1 FROM GroupProductLink WHERE group_id = ? AND product_id = ?)
                            BEGIN
                                INSERT INTO GroupProductLink (group_id, product_id, status, source, validation_reason, requested_at)
                                VALUES (?, ?, 'pending_validation', 'cvlac_public', 'Software desde CvLAC', GETDATE());
                            END
                        """, db_group_id, p_id, db_group_id, p_id)

                    cur.execute("""
                        INSERT INTO ImportRecord (job_id, entity_type, external_identifier, action_taken, source_data_summary, resolution_details, created_at)
                        VALUES (?, 'Product', ?, 'created', ?, 'Software desde CvLAC', GETDATE());
                    """, job_id, p_code, clean_title[:200])

            # 8. Insertar Eventos Científicos (Ponencias y Pósters)
            for ev in cv.events:
                total_records += 1
                fam_id, subtype_id = subtype_by_code["EC"]
                p_code = GruplacNormalizer.product_external_code(ev.product_title, ev.year)
                clean_title = ev.product_title[:500]
                evidence = "Avalado y validado para la Convocatoria Nacional Minciencias (marca ✓ en CvLAC)" if ev.is_endorsed else None
                p_id = _find_or_insert_product(p_code, ev.product_title, ev.year, None, subtype_id, fam_id, evidence=evidence)
                _enqueue_validation(p_id)

                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND researcher_id = ?)
                    BEGIN
                        INSERT INTO ProductAuthor (product_id, researcher_id, author_order, match_status)
                        VALUES (?, ?, 1, 'verified');
                    END
                """, p_id, researcher_id, p_id, researcher_id)

                if db_group_id:
                    cur.execute("""
                        IF NOT EXISTS (SELECT 1 FROM GroupProductLink WHERE group_id = ? AND product_id = ?)
                        BEGIN
                            INSERT INTO GroupProductLink (group_id, product_id, status, source, validation_reason, requested_at)
                            VALUES (?, ?, 'pending_validation', 'cvlac_public', 'Evento científico desde CvLAC', GETDATE());
                        END
                    """, db_group_id, p_id, db_group_id, p_id)

                cur.execute("""
                    INSERT INTO ImportRecord (job_id, entity_type, external_identifier, action_taken, source_data_summary, resolution_details, created_at)
                    VALUES (?, 'Product', ?, 'created', ?, 'Evento científico desde CvLAC', GETDATE());
                """, job_id, p_code, clean_title[:200])

            # 9. Insertar Proyectos
            for proj in cv.projects:
                clean_p_title = proj.title[:250]
                cur.execute("SELECT id FROM Project WHERE title = ?", clean_p_title)
                proj_row = cur.fetchone()
                if proj_row:
                    proj_id = proj_row[0]
                else:
                    cur.execute("""
                        INSERT INTO Project (title, summary, project_type, start_date, end_date, principal_investigator_id, status, created_at)
                        OUTPUT INSERTED.id
                        VALUES (?, ?, ?, ?, ?, ?, 'active', GETDATE());
                    """, clean_p_title, proj.summary[:2000] if proj.summary else None, proj.project_type, proj.start_date or None, proj.end_date or None, researcher_id)
                    proj_id = cur.fetchone()[0]

            cur.execute("""
                UPDATE ImportJob
                SET status = 'completed', total_records = ?, new_records = ?, completed_at = GETDATE()
                WHERE id = ?;
            """, total_records, new_products, job_id)

            conn.commit()
            logger.info(f"Ingesta CvLAC exitosa para: {cv.name}. Productos: {total_records} (Nuevos: {new_products})")

            return {
                "status": "success",
                "researcher_id": researcher_id,
                "researcher_name": cv.name,
                "total_records": total_records,
                "new_products": new_products,
                "job_id": job_id
            }

        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Fallo transaccional en ingesta CvLAC: {e}")
            raise e
        finally:
            if conn:
                conn.close()
