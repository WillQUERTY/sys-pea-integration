import sys
import os
import json
import pyodbc

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app.repository as repository
from app.scraper import GruplacNormalizer

CONN_STR = os.getenv(
    "PEAI_DB_CONN",
    "DRIVER={ODBC Driver 18 for SQL Server};SERVER=localhost;DATABASE=peai;Trusted_Connection=yes;TrustServerCertificate=yes;"
)

def run():
    conn = pyodbc.connect(CONN_STR, autocommit=False)
    cur = conn.cursor()

    try:
        title = "APLICACION MOVIL TU RUTA"
        year = 2024
        code = GruplacNormalizer.product_external_code(title, year)
        subtype_id = 69 # Software
        family_id = 7   # DTI
        evidence = "Avalado y validado para la Convocatoria Nacional Minciencias (marca ✓ en CvLAC)"
        spec_attrs = json.dumps({"minciencias_endorsed": True})

        cur.execute("SELECT id FROM Product WHERE external_code = ? OR title = ?", code, title)
        row = cur.fetchone()
        if row:
            p_id = row[0]
            print(f"Product already exists with ID: {p_id}")
        else:
            cur.execute("""
                INSERT INTO Product (external_code, title, family_id, subtype_id, year, validation_status, evidence, specialized_attributes, created_at)
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, GETDATE());
            """, code, title, family_id, subtype_id, year, evidence, spec_attrs)
            p_id = cur.fetchone()[0]
            print(f"Inserted clean Product 'APLICACION MOVIL TU RUTA' with ID: {p_id}")

        # Enqueue in ValidationQueueItem
        cur.execute("""
            IF NOT EXISTS (SELECT 1 FROM ValidationQueueItem WHERE product_id = ? AND status = 'pending')
            BEGIN
                INSERT INTO ValidationQueueItem (product_id, status, assigned_to, enqueued_at)
                VALUES (?, 'pending', '', GETDATE());
            END
        """, p_id, p_id)

        # Link to Group 35 (COL0011545)
        cur.execute("""
            IF NOT EXISTS (SELECT 1 FROM GroupProductLink WHERE group_id = 35 AND product_id = ?)
            BEGIN
                INSERT INTO GroupProductLink (group_id, product_id, status, source, validation_reason, requested_at)
                VALUES (35, ?, 'pending_validation', 'cvlac_public', 'Software desde CvLAC de los investigadores', GETDATE());
            END
        """, p_id, p_id)

        # Authors:
        # 1. Ronald Alexander Vacca Ascanio (273)
        # 2. Tonny Enrique Jimenez Marquez (187)
        # 3. Amilkar Sierra Romano (218)
        # 4. Gail Albeiro Gutierrez Ramirez (236)
        # 5. Ricardo Duran Baron (external)
        authors = [
            (273, None, 1, 'verified'),
            (187, None, 2, 'verified'),
            (218, None, 3, 'verified'),
            (236, None, 4, 'verified'),
            (None, "RICARDO DURAN BARON", 5, 'unverified')
        ]

        for res_id, ext_name, order, match_st in authors:
            if res_id:
                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND researcher_id = ?)
                    BEGIN
                        INSERT INTO ProductAuthor (product_id, researcher_id, author_order, match_status)
                        VALUES (?, ?, ?, ?);
                    END
                """, p_id, res_id, p_id, res_id, order, match_st)
            else:
                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND external_author_name = ?)
                    BEGIN
                        INSERT INTO ProductAuthor (product_id, external_author_name, author_order, match_status)
                        VALUES (?, ?, ?, ?);
                    END
                """, p_id, ext_name, p_id, ext_name, order, match_st)

        conn.commit()
        print("[SUCCESS] Product APLICACION MOVIL TU RUTA successfully restored and fully linked!")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] {e}")
        raise e
    finally:
        conn.close()

    repository.initialize(repository.InitMode.Database, CONN_STR)
    print(f"[RAM RECONSTRUCTED] Total RAM products: {len(repository.list_products())}")

if __name__ == "__main__":
    run()
