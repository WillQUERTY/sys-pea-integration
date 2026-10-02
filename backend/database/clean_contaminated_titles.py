"""
backend/database/clean_contaminated_titles.py
Script de saneamiento y deduplicación de productos con títulos contaminados.
Ejecuta de manera transaccional:
1. Resuelve productos contaminados (metadatos de CvLAC filtrados en el título).
2. Resuelve softwares cuyo título fue guardado como el nombre de un coautor.
3. Elimina registros con títulos vacíos.
4. Reconstruye el caché RAM del repositorio.
"""

import sys
import os
import re
import pyodbc

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.cvlac_scraper import CvParser
from app.scraper import GruplacNormalizer
import app.repository as repository

CONN_STR = os.getenv(
    "PEAI_DB_CONN",
    "DRIVER={ODBC Driver 18 for SQL Server};SERVER=localhost;DATABASE=peai;Trusted_Connection=yes;TrustServerCertificate=yes;"
)

def run_migration():
    print(f"[MIGRATION] Conectando a SQL Server: {CONN_STR}")
    conn = pyodbc.connect(CONN_STR, autocommit=False)
    cur = conn.cursor()

    try:
        # -------------------------------------------------------------
        # 1. Obtener productos contaminados
        # -------------------------------------------------------------
        cur.execute("""
            SELECT id, title, subtype_id, family_id, external_code, year 
            FROM Product 
            WHERE title LIKE '%Nombre comercial:%' 
               OR title LIKE '%. En:%' 
               OR title LIKE '%contrato/registro:%'
        """)
        dirty_products = cur.fetchall()
        print(f"[STEP 1] Encontrados {len(dirty_products)} productos contaminados.")

        # Obtener todos los softwares limpios existentes
        cur.execute("""
            SELECT id, title, year, external_code, subtype_id
            FROM Product 
            WHERE subtype_id = 69
        """)
        all_sw = cur.fetchall()

        # Cache de nombres de investigadores
        cur.execute("SELECT id, first_names, last_names FROM Researcher")
        researchers = {r[0]: f"{r[1]} {r[2]}".strip() for r in cur.fetchall()}
        res_names_lower = {name.lower(): rid for rid, name in researchers.items()}

        def clean_extracted_title(raw_extracted: str) -> str:
            t = raw_extracted.strip().rstrip(",.")
            if ". en:" in t.lower():
                t = re.split(r'(?i)\.\s*en:', t)[0].strip().rstrip(",.")
            if "finalidad:" in t.lower():
                t = re.split(r'(?i)finalidad:', t)[0].strip().rstrip(",.")
            return t

        def transfer_authors_and_links(source_id: int, target_id: int):
            # Verify target exists
            cur.execute("SELECT id FROM Product WHERE id = ?", target_id)
            if not cur.fetchone():
                print(f"[WARN] Target product {target_id} does not exist in Product table! Skipping transfer from {source_id}.")
                return
            # Transfer ProductAuthor
            cur.execute("SELECT researcher_id, external_author_name, author_order, match_status FROM ProductAuthor WHERE product_id = ?", source_id)
            for r_id, ext_name, a_order, m_status in cur.fetchall():
                if r_id:
                    cur.execute("""
                        IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND researcher_id = ?)
                        BEGIN
                            INSERT INTO ProductAuthor (product_id, researcher_id, author_order, match_status)
                            VALUES (?, ?, ?, ?);
                        END
                    """, target_id, r_id, target_id, r_id, a_order, m_status)
                elif ext_name:
                    cur.execute("""
                        IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND external_author_name = ?)
                        BEGIN
                            INSERT INTO ProductAuthor (product_id, external_author_name, author_order, match_status)
                            VALUES (?, ?, ?, ?);
                        END
                    """, target_id, ext_name, target_id, ext_name, a_order, m_status)

            # Transfer GroupProductLink
            cur.execute("SELECT group_id, status, source, validation_reason, authorized_at FROM GroupProductLink WHERE product_id = ?", source_id)
            for g_id, g_status, g_source, g_reason, g_auth_at in cur.fetchall():
                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM GroupProductLink WHERE group_id = ? AND product_id = ?)
                    BEGIN
                        INSERT INTO GroupProductLink (group_id, product_id, status, source, validation_reason, authorized_at, requested_at)
                        VALUES (?, ?, ?, ?, ?, ?, GETDATE());
                    END
                """, g_id, target_id, g_id, target_id, g_status, g_source, g_reason, g_auth_at)

        def delete_product_cascade(prod_id: int):
            cur.execute("DELETE FROM ValidationQueueItem WHERE product_id = ?", prod_id)
            cur.execute("DELETE FROM GroupProductLink WHERE product_id = ?", prod_id)
            cur.execute("DELETE FROM ProductAuthor WHERE product_id = ?", prod_id)
            cur.execute("DELETE FROM Product WHERE id = ?", prod_id)

        merged_dirty = 0
        converted_dirty = 0

        for d in dirty_products:
            d_id, d_title, d_sub, d_fam, d_code, d_year = d
            c_title, authors = CvParser.parse_software_item(d_title)
            c_title = clean_extracted_title(c_title)

            if c_title.isdigit() and len(c_title) == 4 and authors:
                c_title = clean_extracted_title(authors[-1])
                authors = authors[:-1]

            new_code = GruplacNormalizer.product_external_code(c_title, d_year)

            # Buscar coincidencia exacta, de código o canónica en Product
            cur.execute("""
                SELECT id, title, year, subtype_id FROM Product
                WHERE id <> ? AND (
                    external_code = ?
                    OR title = ? 
                    OR (subtype_id = 69 AND LOWER(title) = LOWER(?))
                    OR (subtype_id IN (57, 60, 69) AND ? LIKE '%' + title + '%' AND LEN(title) > 8)
                )
            """, d_id, new_code, c_title, c_title, c_title)
            matches = cur.fetchall()

            if matches:
                # Merge into best match
                target_id = matches[0][0]
                transfer_authors_and_links(d_id, target_id)
                delete_product_cascade(d_id)
                merged_dirty += 1
            else:
                # Standalone: saneamos este producto
                new_sub = 69 if "software" in c_title.lower() or "sistema" in c_title.lower() or "app" in c_title.lower() or "pagina web" in c_title.lower() else (d_sub or 69)
                new_fam = 7 if new_sub == 69 else d_fam
                cur.execute("""
                    UPDATE Product 
                    SET title = ?, subtype_id = ?, family_id = ?, external_code = ?
                    WHERE id = ?
                """, c_title[:500], new_sub, new_fam, new_code, d_id)
                converted_dirty += 1

        print(f"[STEP 1 DONE] {merged_dirty} fusionados y eliminados, {converted_dirty} saneados.")

        # -------------------------------------------------------------
        # 2. Corregir productos de Software cuyo título es nombre de autor
        # -------------------------------------------------------------
        cur.execute("""
            SELECT p.id, p.title, p.year, p.external_code
            FROM Product p
            WHERE p.subtype_id = 69
        """)
        all_sw_remaining = cur.fetchall()

        fixed_sw_titles = 0
        merged_sw_duplicates = 0

        # Mapeo manual verificado de softwares donde se guardó el nombre del coautor
        person_sw_known_map = {
            "RONALD ALEXANDER VACCA ASCANIO": ("TU RUTA", 1245),
            "TONNY ENRIQUE JIMENEZ MARQUEZ": ("TU RUTA", 1244),
            "WILMAN JOSE VEGA CASTILLA": ("SIIBUPC", None),
            "CARLOS MARIO PALACIO PEREZ": ("TMEXPRESS", 1270),
            "REYNALDO SAID VEGA ZULETA": ("SISTEMA DE GESTION PUBLICA - SGP", None),
            "AMILKAR SIERRA ROMANO": ("FACTURACION Y CARTERA", None),
            "CESAR ORLANDO TORRES MORENO": ("II encuentro Regional de Ciencias Fisicas", None),
            "KARINA PAOLA MEZA RESTREPO": ("APLICACION MOVIL PARA EL CONTROL DE LUCES EN EL HOGAR", None),
            "CESAR AUGUSTO CORONEL SEGRERA": ("APLICACION MOVIL V-NOEMA", None),
            "OSCAR SANDY NEIRA LOPEZ": ("Diseño de Circuitos para Bombeo de Agua", 1291),
            "JANER ONASIS CAMPO": ("Simulador de Pasterizador de placas", 1286),
            "RICARDO DURAN BARON": ("Simulador de Pasterización", 1289),
        }

        for p_id, title, yr, code in all_sw_remaining:
            t_upper = title.strip().upper()
            if t_upper in person_sw_known_map:
                real_name, canonical_id = person_sw_known_map[t_upper]
                if canonical_id:
                    transfer_authors_and_links(p_id, canonical_id)
                    delete_product_cascade(p_id)
                    merged_sw_duplicates += 1
                else:
                    new_code = GruplacNormalizer.product_external_code(real_name, yr)
                    cur.execute("SELECT id FROM Product WHERE (external_code = ? OR title = ?) AND id <> ?", new_code, real_name, p_id)
                    existing = cur.fetchone()
                    if existing:
                        transfer_authors_and_links(p_id, existing[0])
                        delete_product_cascade(p_id)
                        merged_sw_duplicates += 1
                    else:
                        cur.execute("""
                            UPDATE Product 
                            SET title = ?, external_code = ?
                            WHERE id = ?
                        """, real_name, new_code, p_id)
                        fixed_sw_titles += 1
            elif t_upper.lower() in res_names_lower or (title.strip().isupper() and 2 <= len(title.strip().split()) <= 4 and not any(w in t_upper for w in [":", "SOFTWARE", "SISTEMA", "APP", "WEB", "SIMULADOR", "RED", "CONTROL", "PLATAFORMA", "MODULO", "HERRAMIENTA", "ALGORITMO", "MODELO", "UPC", "PRO"])):
                cur.execute("SELECT researcher_id FROM ProductAuthor WHERE product_id = ?", p_id)
                res_row = cur.fetchone()
                if res_row and res_row[0]:
                    r_id = res_row[0]
                    cur.execute("""
                        SELECT p.id, p.title FROM Product p
                        JOIN ProductAuthor pa ON pa.product_id = p.id
                        WHERE pa.researcher_id = ? AND p.subtype_id = 69 AND p.id <> ? AND (p.year = ? OR abs(p.year - ?) <= 1)
                          AND NOT (p.title LIKE ? OR LEN(p.title) <= 2)
                    """, r_id, p_id, yr or 0, yr or 0, title)
                    peer = cur.fetchone()
                    if peer:
                        transfer_authors_and_links(p_id, peer[0])
                        delete_product_cascade(p_id)
                        merged_sw_duplicates += 1

        print(f"[STEP 2 DONE] {fixed_sw_titles} softwares renombrados a su título real, {merged_sw_duplicates} duplicados fusionados.")

        # -------------------------------------------------------------
        # 3. Eliminar productos con títulos vacíos (longitud <= 2)
        # -------------------------------------------------------------
        cur.execute("SELECT id FROM Product WHERE LEN(LTRIM(RTRIM(title))) <= 2")
        empty_ids = [r[0] for r in cur.fetchall()]
        for e_id in empty_ids:
            delete_product_cascade(e_id)
        print(f"[STEP 3 DONE] {len(empty_ids)} productos con título vacío eliminados.")

        # Commit final de base de datos
        conn.commit()
        print("[MIGRATION SUCCESS] Cambios confirmados exitosamente en SQL Server.")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migración abortada: {e}")
        raise e
    finally:
        conn.close()

    # -------------------------------------------------------------
    # 4. Recargar el repositorio RAM
    # -------------------------------------------------------------
    print("[STEP 4] Reconstruyendo la memoria RAM del repositorio desde SQL Server...")
    repository.initialize(repository.InitMode.Database, CONN_STR)
    print(f"[RAM RECONSTRUCTED] Productos en RAM: {len(repository.list_products())}")

if __name__ == "__main__":
    run_migration()
