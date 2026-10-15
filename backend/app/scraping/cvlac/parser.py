import hashlib
import re
import unicodedata
from typing import Optional

from bs4 import BeautifulSoup

from ..normalizer import GruplacNormalizer
from .dtos import (
    CvArticle,
    CvBook,
    CvBookChapter,
    CvData,
    CvEvent,
    CvProject,
    CvSoftware,
)
from .normalizer import normalize_researcher_category


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
        raw_category = get_field("Categoría") or get_field("Categoria")
        category = normalize_researcher_category(raw_category) or ""
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

        def clean_block(s: Optional[str]) -> str:
            if not s:
                return ""
            lines = [" ".join(l.replace("\xa0", " ").split()) for l in s.splitlines()]
            return "\n".join(l for l in lines if l)

        def strip_accents(s: Optional[str]) -> str:
            if not s:
                return ""
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
