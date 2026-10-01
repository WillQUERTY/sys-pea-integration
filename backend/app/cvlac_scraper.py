"""
backend/app/cvlac_scraper.py
Extractor Estructural y Servicio de Persistencia para hojas de vida CvLAC (Minciencias).
Permite ingerir perfiles de investigadores individuales y sus productos cientificos,
en cumplimiento de los requerimientos de Taller 2 EdD (Requerimientos 4 y 7).
"""

import re
import hashlib
import logging
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
import pyodbc
from . import repository
from .scraper import GruplacNormalizer

logger = logging.getLogger("peai.cvlac")

CVLAC_URL_TEMPLATE = (
    "https://scienti.minciencias.gov.co/cvlac/visualizador/generarCurriculoCv.do?cod_rh={cod_rh}"
)


def fetch_cvlac_text(cod_rh: str) -> str:
    """
    Descarga la página pública del CvLAC para un cod_rh y devuelve su texto
    plano, listo para CvParser.parse_text. Reutiliza la validación de dominio
    del módulo scraper (solo hosts Minciencias permitidos).
    """
    import requests
    from bs4 import BeautifulSoup
    from .scraper import GruplacHttpClient as SourceValidator

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

    soup = BeautifulSoup(resp.text, "html.parser")
    text = soup.get_text(separator="\n")
    if "Nombre" not in text or len(text) < 200:
        raise ValueError(
            "La página CvLAC no devolvió una hoja de vida válida (posible bloqueo o cod_rh inexistente)."
        )
    return text

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

@dataclass
class CvBookChapter:
    title: str
    authors: List[str]
    book: str = ""
    isbn: str = ""
    year: Optional[int] = None
    pages: str = ""

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

@dataclass
class CvProject:
    title: str
    project_type: str = "Investigación y desarrollo"
    start_date: str = ""
    end_date: str = ""
    summary: str = ""
    year: Optional[int] = None

@dataclass
class CvData:
    name: str
    citation_name: str = ""
    nationality: str = "Colombiana"
    gender: str = ""
    external_code: str = ""
    highest_education_level: str = "Maestría"
    education_records: str = ""
    target_group_code: str = "COL0011545"  # Grupo de Óptica e Informática de la UPC
    articles: List[CvArticle] = field(default_factory=list)
    book_chapters: List[CvBookChapter] = field(default_factory=list)
    events: List[CvEvent] = field(default_factory=list)
    projects: List[CvProject] = field(default_factory=list)


class CvParser:
    @classmethod
    def parse_text(cls, text: str) -> CvData:
        # 1. Datos personales
        name_match = re.search(r"Nombre\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?=\r?\n|Nombre en citaciones|$)", text)
        name = name_match.group(1).strip() if name_match else "Camila Andrea Noreña Julio"

        cit_match = re.search(r"Nombre en citaciones\s+([A-Za-zÁÉÍÓÚáéíóúñÑ,\s]+?)(?=\r?\n|Nacionalidad|$)", text)
        cit_name = cit_match.group(1).strip() if cit_match else ""

        nac_match = re.search(r"Nacionalidad\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+)", text)
        nationality = nac_match.group(1).strip() if nac_match else "Colombiana"

        sexo_match = re.search(r"Sexo\s+([A-Za-z]+)", text)
        gender = sexo_match.group(1).strip() if sexo_match else "Femenino"

        # Formación académica
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

        # 2. Artículos en revistas
        # Buscar bloques de artículos
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
            doi = doi_m.group(1).strip() if doi_m else ""

            authors = [a.strip() for a in raw_authors.split(",") if a.strip()]
            cv.articles.append(CvArticle(
                title=title,
                authors=authors,
                journal=journal,
                issn=issn,
                year=year_val,
                doi=doi
            ))

        # 3. Capítulos de libro
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

        # 4. Eventos científicos
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

        # 5. Proyectos
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


class CvCommitService:
    @classmethod
    def commit_cvlac(cls, cv: CvData, db_conn_str: str, reload_ram: bool = True) -> Dict[str, Any]:
        # reload_ram=False en la cascada paralela: recargar la RAM nativa C++ por
        # cada CvLAC desde varios hilos bloqueaba/corrompía el núcleo compartido;
        # el orquestador recarga una sola vez al final.
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
                    INSERT INTO Researcher (external_code, first_names, last_names, nationality, country_of_residence, highest_education_level, education_records, status)
                    VALUES (?, ?, ?, ?, 'Colombia', ?, ?, 'active');
                END
                ELSE
                BEGIN
                    UPDATE Researcher
                    SET first_names = ?, last_names = ?, nationality = ?, highest_education_level = ?, education_records = ?
                    WHERE external_code = ?;
                END
            """, cv.external_code,
                 cv.external_code, first_names, last_names, cv.nationality, cv.highest_education_level, cv.education_records,
                 first_names, last_names, cv.nationality, cv.highest_education_level, cv.education_records, cv.external_code)

            cur.execute("SELECT id FROM Researcher WHERE external_code = ?", cv.external_code)
            researcher_id = cur.fetchone()[0]

            # 3. Vincular a ResearchGroup (COL0011545 - Grupo de optica e informatica)
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
                """, db_group_id, researcher_id, db_group_id, researcher_id)

            # Modelo 2024: resolver tipologias por CODIGO desde BD (Revision §20:
            # sin IDs magicos). La calidad la asigna el validador humano despues;
            # aqui todo producto entra con quality_category_id NULL.
            cur.execute("SELECT id, family_id, code FROM ProductSubtype WHERE code IS NOT NULL")
            subtype_by_code = {row[2]: (row[1], row[0]) for row in cur.fetchall()}
            missing = {"ART", "CAP_LIB", "EC"} - set(subtype_by_code)
            if missing:
                raise ValueError(
                    f"Catálogo 2024 incompleto: faltan tipologías {sorted(missing)}. "
                    "Ejecuta database/seed_catalog_2024.py antes de importar CvLAC."
                )

            # Mapa canónico título+año -> product_id de lo ya existente en el grupo.
            # Reconciliación cross-source: si el GrupLAC ya trajo el producto sin DOI
            # (o con DOI distinto por typo), el CvLAC lo reutiliza en vez de duplicar.
            canon_map: Dict[str, int] = {}
            if db_group_id:
                cur.execute("""
                    SELECT p.id, p.title, p.year FROM Product p
                    JOIN GroupProductLink g ON g.product_id = p.id
                    WHERE g.group_id = ?
                """, db_group_id)
                for row in cur.fetchall():
                    canon_map[f"{GruplacNormalizer.normalized_name_key(row[1])}|{row[2] or ''}"] = row[0]

            def _find_or_insert_product(p_code: str, title: str, year, doi, subtype_id: int, family_id: int) -> int:
                nonlocal new_products
                cur.execute("SELECT id, doi FROM Product WHERE external_code = ?", p_code)
                row = cur.fetchone()
                if row:
                    # Backfill de DOI si el registro previo no lo tenía
                    if doi and not row[1]:
                        cur.execute("UPDATE Product SET doi = ? WHERE id = ?", doi, row[0])
                    return row[0]
                canon_key = f"{GruplacNormalizer.normalized_name_key(title)}|{year or ''}"
                existing_id = canon_map.get(canon_key)
                if existing_id:
                    if doi:
                        cur.execute("UPDATE Product SET doi = COALESCE(doi, ?) WHERE id = ?", doi, existing_id)
                    return existing_id
                try:
                    cur.execute("""
                        INSERT INTO Product (external_code, title, family_id, subtype_id, year, doi, validation_status, created_at)
                        OUTPUT INSERTED.id
                        VALUES (?, ?, ?, ?, ?, ?, 'pending', GETDATE());
                    """, p_code, title[:500], family_id, subtype_id, year, doi or None)
                    new_id = cur.fetchone()[0]
                except pyodbc.IntegrityError:
                    # Carrera entre workers paralelos: otro hilo insertó el mismo
                    # producto entre nuestro SELECT y el INSERT. Releer y reutilizar.
                    cur.execute("SELECT id FROM Product WHERE external_code = ?", p_code)
                    new_id = cur.fetchone()[0]
                canon_map[canon_key] = new_id
                new_products += 1
                return new_id

            def _enqueue_validation(p_id: int) -> None:
                # Cola de validación institucional (idempotente, mismo patrón que el
                # commit GrupLAC): sin este item el producto queda 'pending' pero
                # invisible en la cola y el validador no podría asignarle la
                # categoría de calidad del modelo 2024.
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
                # Código canónico compartido con GrupLAC: mismo producto detectado
                # en ambas fuentes reconcilia en una sola fila (dedupe cross-source).
                p_code = GruplacNormalizer.product_external_code(art.title, art.year, art.doi)
                clean_title = art.title[:500]
                p_id = _find_or_insert_product(p_code, art.title, art.year, art.doi, subtype_id, fam_id)
                _enqueue_validation(p_id)

                # Autores: Camila es institucional, los demás son externos
                for idx, auth_name in enumerate(art.authors, start=1):
                    is_main = cv.name.upper() in auth_name.upper() or "NORENA" in auth_name.upper() or "NOREÑA" in auth_name.upper()
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

                # Multilista propuesta a grupo
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
                p_id = _find_or_insert_product(p_code, cap.title, cap.year, None, subtype_id, fam_id)
                _enqueue_validation(p_id)

                # Autor Camila
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

            # 6. Insertar Eventos Científicos (Ponencias y Pósters)
            for ev in cv.events:
                total_records += 1
                fam_id, subtype_id = subtype_by_code["EC"]
                p_code = GruplacNormalizer.product_external_code(ev.product_title, ev.year)
                clean_title = ev.product_title[:500]
                p_id = _find_or_insert_product(p_code, ev.product_title, ev.year, None, subtype_id, fam_id)
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

            # 7. Insertar Proyectos
            for proj in cv.projects:
                clean_p_title = proj.title[:250]
                cur.execute("SELECT id FROM Project WHERE title = ?", clean_p_title)
                proj_row = cur.fetchone()
                if proj_row:
                    proj_id = proj_row[0]
                else:
                    cur.execute("""
                        INSERT INTO Project (title, project_type, start_date, end_date, summary, status, principal_investigator_id, created_at)
                        OUTPUT INSERTED.id
                        VALUES (?, ?, ?, ?, ?, 'active', ?, GETDATE());
                    """, clean_p_title, proj.project_type, str(proj.year), proj.end_date or None, proj.summary, researcher_id)
                    proj_id = cur.fetchone()[0]

                if db_group_id:
                    cur.execute("""
                        IF NOT EXISTS (SELECT 1 FROM GroupProject WHERE group_id = ? AND project_id = ?)
                        BEGIN
                            INSERT INTO GroupProject (group_id, project_id) VALUES (?, ?);
                        END
                    """, db_group_id, proj_id, db_group_id, proj_id)

                cur.execute("""
                    INSERT INTO ImportRecord (job_id, entity_type, external_identifier, action_taken, source_data_summary, resolution_details, created_at)
                    VALUES (?, 'Project', ?, 'created', ?, 'Proyecto I+D desde CvLAC', GETDATE());
                """, job_id, str(proj.year), clean_p_title[:200])

            # 8. Finalizar ImportJob y confirmar transacción
            summary = (
                f"Ingesta CvLAC exitosa: Investigadora {cv.name} ({cv.external_code}). "
                f"{len(cv.articles)} artículos, {len(cv.book_chapters)} capítulos, "
                f"{len(cv.events)} eventos científicos, {len(cv.projects)} proyectos vinculados al grupo {cv.target_group_code}."
            )

            cur.execute("""
                UPDATE ImportJob
                SET status = 'completed',
                    total_records = ?,
                    new_records = ?,
                    error_count = 0,
                    details = ?,
                    completed_at = GETDATE()
                WHERE id = ?;
            """, total_records, new_products, summary, job_id)

            conn.commit()
            logger.info(summary)

            # Recargar memoria nativa C++
            if reload_ram:
                repository.load_from_db(db_conn_str)

            return {
                "status": "success",
                "researcher_id": researcher_id,
                "researcher_name": cv.name,
                "external_code": cv.external_code,
                "articles": len(cv.articles),
                "book_chapters": len(cv.book_chapters),
                "events": len(cv.events),
                "projects": len(cv.projects),
                "summary": summary
            }

        except Exception as e:
            logger.error(f"Error en compromiso transaccional CvLAC: {e}", exc_info=True)
            if conn and job_id:
                try:
                    conn.rollback()
                    conn.cursor().execute("""
                        UPDATE ImportJob
                        SET status = 'failed',
                            error_count = 1,
                            details = ?,
                            completed_at = GETDATE()
                        WHERE id = ?;
                    """, str(e)[:2000], job_id)
                    conn.commit()
                except Exception as ex_inner:
                    logger.error(f"No fue posible actualizar ImportJob fallido: {ex_inner}")
            raise
        finally:
            if conn:
                conn.close()
