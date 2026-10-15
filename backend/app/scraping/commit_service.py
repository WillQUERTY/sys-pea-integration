import json
from typing import Any, Dict
import pyodbc

from .. import repository
from .constants import logger
from .dtos import ScrapedGroupData
from .normalizer import GruplacNormalizer


class GruplacCommitService:
    @classmethod
    def commit(cls, data: ScrapedGroupData, db_conn_str: str = "",
               source_type: str = "url", source_url: str = "",
               reload_ram: bool = True) -> Dict[str, Any]:
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
            # 1. Registrar ImportJob en estado 'processing' dentro de la transacción.
            effective_source_url = source_url or (
                data.products[0].source_url if data.products else "https://scienti.minciencias.gov.co/gruplac"
            )
            cur.execute("""
                INSERT INTO ImportJob (source_type, source_url, status, total_records, new_records, error_count, created_at)
                OUTPUT INSERTED.id
                VALUES (?, ?, 'processing', 0, 0, 0, GETDATE())
            """, source_type, effective_source_url)
            row = cur.fetchone()
            if row:
                job_id = row[0]

            # 2. Persistir / Actualizar ResearchGroup
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

            # 2.1 Resolver catálogos desde BD por CODIGO 2024
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

                resolved = subtype_lookup.get(p.subtype_code) if p.subtype_code else None
                if resolved:
                    fam_id, sub_id = resolved
                else:
                    fam_id, sub_id = None, None
                    unclassified_products += 1
                    if p.subtype_code:
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

                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM ValidationQueueItem WHERE product_id = ? AND status = 'pending')
                    BEGIN
                        INSERT INTO ValidationQueueItem (product_id, status, assigned_to, enqueued_at)
                        VALUES (?, 'pending', '', GETDATE());
                    END
                """, prod_id, prod_id)

                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM GroupProductLink WHERE group_id = ? AND product_id = ?)
                    BEGIN
                        INSERT INTO GroupProductLink (group_id, product_id, status, source, requested_at, validation_reason)
                        VALUES (?, ?, 'pending_validation', 'gruplac_public', GETDATE(), 'Importado automáticamente desde GrupLAC; pendiente de validación institucional UPC.');
                    END
                """, db_group_id, prod_id, db_group_id, prod_id)

                if job_id:
                    rec_action = p_action if sub_id else "unclassified_subtype"
                    cur.execute("""
                        INSERT INTO ImportRecord (job_id, entity_type, external_identifier, action_taken, source_data_summary, resolution_details, created_at)
                        VALUES (?, 'Product', ?, ?, ?, ?, GETDATE());
                    """, job_id, p.external_code, rec_action, p.title[:200], f"Tipologia: {p.subtype_code or 'sin clasificar'} (id={sub_id}) | Ano: {p.year} | DOI: {p.doi or 'N/A'}")

                for a_idx, author in enumerate(p.authors, start=1):
                    total_records += 1
                    a_key = GruplacNormalizer.normalized_name_key(author.display_name)

                    author_res_id = members_by_key.get(a_key)
                    if author_res_id:
                        cur.execute("""
                            IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND researcher_id = ?)
                            BEGIN
                                INSERT INTO ProductAuthor (product_id, researcher_id, author_order, match_status)
                                VALUES (?, ?, ?, 'exact');
                            END
                        """, prod_id, author_res_id, prod_id, author_res_id, a_idx)
                        member_authors_count += 1
                    else:
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

                conn.commit()

            if db_conn_str and reload_ram:
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
