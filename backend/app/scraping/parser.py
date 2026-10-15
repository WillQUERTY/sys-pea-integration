import re
import hashlib
from typing import Dict, List, Optional, Tuple
from bs4 import BeautifulSoup

from .constants import SECTION_MAP, STRUCTURAL_HEADERS
from .dtos import (
    ScrapedAuthor,
    ScrapedGroupData,
    ScrapedMember,
    ScrapedProduct,
    ScrapedProject,
)
from .normalizer import GruplacNormalizer


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
        """Extract only the author/tutor field from one product block."""
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
            names = [name.strip() for name in value.split(",") if name.strip()]
            return [ScrapedAuthor(display_name=name) for name in names]
        return []

    @classmethod
    def _dedupe_products(cls, products: List[ScrapedProduct]) -> Tuple[List[ScrapedProduct], int]:
        """
        Fusiona productos repetidos dentro de la misma página GrupLAC.
        La llave es título canónico + año (independiente del DOI).
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
                if nro_clean == "2668":
                    group_code = "COL0043834"
                else:
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

                        cod_rh = None
                        a_tag = row.find("a", href=True)
                        if a_tag and "cod_rh=" in a_tag["href"]:
                            m_rh = re.search(r"cod_rh=([^&]+)", a_tag["href"])
                            if m_rh:
                                cod_rh = m_rh.group(1).strip()

                        if not cod_rh:
                            name_hash = hashlib.sha256(clean_name.encode("utf-8")).hexdigest()[:12]
                            cod_rh = f"RH_{group_code}_{name_hash}"

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
                if not any(s in header for s in STRUCTURAL_HEADERS) and header not in skipped_sections:
                    skipped_sections.append(header)
                continue

            for row in rows[2:]:
                cols = row.find_all("td")
                if len(cols) < 2:
                    continue

                lines = [
                    line.strip() for line in cols[1].get_text(separator="\n", strip=True).splitlines()
                    if line.strip()
                ]
                if not lines:
                    continue

                full_text = " ".join(lines)

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
                        subtype_code = None

                if section_label == "patente":
                    subtype_code = "MOD_UTIL" \
                        if "modelo de utilidad" in GruplacNormalizer.match_key(full_text) \
                        else "PAT_INV"

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

        products, merged_count = cls._dedupe_products(products)
        if merged_count:
            warnings.append(f"{merged_count} productos repetidos en la página fueron fusionados por título+año")

        loc_city, loc_dept = GruplacNormalizer.split_city_department(
            basic_data.get("departamento ciudad", basic_data.get("ciudad", ""))
        )
        if not loc_dept and basic_data.get("departamento"):
            loc_dept = GruplacNormalizer.normalize(basic_data.get("departamento")).title()

        return ScrapedGroupData(
            group={
                "external_code": group_code,
                "name": group_name,
                "leader_name": leader_name,
                "classification": GruplacNormalizer.normalize_classification(
                    basic_data.get("clasificacion", basic_data.get("estado", ""))
                ),
                "email": basic_data.get("e mail", ""),
                "website": basic_data.get("pagina web", ""),
                "city": loc_city,
                "department": loc_dept,
                "declared_creation_date": GruplacNormalizer.normalize_year_month(
                    basic_data.get("ano y mes de formacion", "")
                ),
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
