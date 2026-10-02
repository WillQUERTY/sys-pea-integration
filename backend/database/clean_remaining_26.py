import sys
import os
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
        def transfer_authors_and_links(source_id: int, target_id: int):
            cur.execute("SELECT id FROM Product WHERE id = ?", target_id)
            if not cur.fetchone():
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

        def delete_cascade(pid: int):
            cur.execute("DELETE FROM ValidationQueueItem WHERE product_id = ?", pid)
            cur.execute("DELETE FROM GroupProductLink WHERE product_id = ?", pid)
            cur.execute("DELETE FROM ProductAuthor WHERE product_id = ?", pid)
            cur.execute("DELETE FROM Product WHERE id = ?", pid)

        # 1. Exact duplicates to merge and delete
        to_merge_and_delete = [
            (750, 760),
            (817, 856),
            (841, 874),
            (931, 178),
            (932, 178),
            (972, 971),
            (1650, 192),
            (1668, 192),
            (1669, 1292),
            (1879, 1880),
            (1780, 1903),
            (1904, 1903),
            (790, 1671)
        ]
        for src, tgt in to_merge_and_delete:
            transfer_authors_and_links(src, tgt)
            delete_cascade(src)

        # 2. Products to rename to clean canonical titles
        to_rename = [
            (827, "CD Interactivo de la Maestria en Ciencias Fisicas - SUE CARIBE", 69, 7, 2004),
            (844, "CD Interactivo del Laboratorio de Optica e Informatica", 69, 7, 2004),
            (940, "Sistema de Gestión y Consulta para la Red de Egresados", 69, 7, 2007),
            (1005, "APLICACIÓN MÓVIL PARA INCENTIVAR EL TURISMO COMUNITARIO EN EL MUNICIPIO DE PUEBLO BELLO, DEPARTAMENTO DEL CÉSAR - IKU", 69, 7, 2021),
            (1671, "EMPLEOONLINE", 69, 7, 2017),
            (1711, "EMSSoft", 69, 7, 2024),
            (1716, "C6MKII10-calculates", 69, 7, 2017),
            (1903, "SIMULADOR DE PROCESOS DE RUPTURA Y CRECIMIENTO EN POBLACIONES DE ELEMENTOS NO UNIFORMES - MBPP", 69, 7, 2019),
            (1907, "EXTRACCIÓN DEL ACEITE ESENCIAL, DE LAS HOJAS Y RAMAS DEL (GUAZUMA ULMIFOLIA) PARA LA ELABORACIÓN DE UN SHAMPOO", 60, 6, 2019),
            (1915, "APLICACIÓN MOVIL Y WEB PARA EL CONTROL EN TIEMPO REAL DE LA PUNTUACION PARA FESTIVALES Y CONCURSOS", 69, 7, 2018),
            (1970, "Informe Técnico Disfruta - Implementación de prototipo de aplicativo web Disfruta", 60, 6, 2020),
            (1971, "Informe Técnico Festival de la Quinta - Implementación de prototipo de aplicativo web Festival de la Quinta", 60, 6, 2020),
            (1972, "Informe Técnico Technipro - Implementación de prototipo de aplicativo web Technipro", 60, 6, 2020)
        ]

        for pid, title, sub, fam, yr in to_rename:
            new_code = GruplacNormalizer.product_external_code(title, yr)
            cur.execute("""
                UPDATE Product 
                SET title = ?, subtype_id = ?, family_id = ?, external_code = ?
                WHERE id = ?
            """, title, sub, fam, new_code, pid)

        # 3. Add explicit authors for 1005, 1711, 1716, 1903
        authors_map = {
            1005: ["MARIBEL ROMERO MESTRE", "IVAN JOSE LUQUEZ ARIAS", "RONALD ALEXANDER VACCA ASCANIO", "JOSE LUIS ALVAREZ CAMPO"],
            1711: ["ERNESTO PEREZ GONZALEZ", "GAIL ALBEIRO GUTIERREZ RAMIREZ", "ALBERT DELUQUE PINTO"],
            1716: ["GAIL ALBEIRO GUTIERREZ RAMIREZ", "MARLON JOSE BASTIDAS BARRANCO", "FAINER YESID CERPA OLIVERA", "DARIO ANDRES SERRANO FLOREZ"],
            1903: ["OMAR ALFREDO FIGUEROA MORENO", "JADER DARIO ALEAN VALLE"]
        }
        for pid, auth_list in authors_map.items():
            for idx, a_name in enumerate(auth_list, start=1):
                cur.execute("""
                    IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = ? AND external_author_name = ?)
                    BEGIN
                        INSERT INTO ProductAuthor (product_id, external_author_name, author_order, match_status)
                        VALUES (?, ?, ?, 'unverified');
                    END
                """, pid, a_name, pid, a_name, idx)

        conn.commit()
        print("[SUCCESS] All 26 products cleanly resolved and deduplicated!")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] {e}")
        raise e
    finally:
        conn.close()

    print("[RELOAD] Reconstructing RAM repository...")
    repository.initialize(repository.InitMode.Database, CONN_STR)
    print(f"[DONE] RAM products: {len(repository.list_products())}")

if __name__ == "__main__":
    run()
