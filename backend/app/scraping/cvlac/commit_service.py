import json
import logging
from typing import Any, Dict, Optional

import pyodbc

from ..normalizer import GruplacNormalizer
from .dtos import CvData
from .normalizer import normalize_researcher_category

logger = logging.getLogger("peai.cvlac")


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

            clean_cat = normalize_researcher_category(cv.category)

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
                 cv.external_code, first_names, last_names, cv.nationality, cv.orcid, cv.highest_education_level, cv.education_records, clean_cat,
                 first_names, last_names, cv.nationality, cv.orcid, cv.orcid, cv.highest_education_level, cv.education_records, clean_cat, cv.external_code)

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
