"""
clean_existing_dois.py
Migración y saneamiento transaccional de DOIs y códigos externos para productos en SQL Server (Khemia).
- Limpia prefijos como https://doi.org/, http://dx.doi.org/, doi:, %2F.
- Mueve URLs que no son DOI (file://, drive.google.com, etc) al campo url si este estaba vacío.
- Elimina basura accidentalmente extraída (Autores: ..., ISSN ..., Palabras:, etc) seteando doi = NULL.
- Recalcula external_code para asegurar coherencia y evitar duplicados en importaciones futuras.
- Recarga la memoria RAM del repositorio (C++ core).
"""

import sys
import os
import re
import urllib.parse
import pyodbc

# Ensure backend can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app import repository
from app.scraper import GruplacNormalizer

CONN_STR = "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"

def run_migration():
    conn = pyodbc.connect(CONN_STR)
    cur = conn.cursor()

    cur.execute("SELECT id, external_code, title, year, doi, url FROM Product")
    rows = cur.fetchall()
    print(f"Total productos evaluados: {len(rows)}")

    stats = {
        "already_clean": 0,
        "doi_cleaned": 0,
        "moved_to_url": 0,
        "junk_cleared": 0,
        "codes_updated": 0,
    }

    updates = []
    for r in rows:
        p_id, old_code, title, year, old_doi, old_url = r[0], r[1], r[2], r[3], r[4], r[5]
        clean_d = repository.clean_doi(old_doi)
        new_doi = clean_d if clean_d else None

        new_url = old_url
        if not new_doi and old_doi and not old_url:
            s_doi = old_doi.strip()
            if re.match(r"^(https?://|file:///)", s_doi, re.IGNORECASE):
                new_url = s_doi
                stats["moved_to_url"] += 1

        new_code = GruplacNormalizer.product_external_code(title, year, new_doi or "")

        doi_changed = (old_doi or None) != (new_doi or None)
        url_changed = (old_url or None) != (new_url or None)
        code_changed = old_code != new_code

        if doi_changed or url_changed or code_changed:
            if old_doi and not new_doi and not (new_url and new_url != old_url):
                stats["junk_cleared"] += 1
            elif old_doi and new_doi and old_doi != new_doi:
                stats["doi_cleaned"] += 1

            if code_changed:
                stats["codes_updated"] += 1

            updates.append((new_code, new_doi, new_url, p_id, old_code, old_doi))
        elif old_doi:
            stats["already_clean"] += 1

    print(f"\n--- Resumen de Cambios Detectados ---")
    print(f"DOIs ya limpios y válidos: {stats['already_clean']}")
    print(f"DOIs con prefijos/encoding limpiados a canónico: {stats['doi_cleaned']}")
    print(f"Enlaces no-DOI reubicados a campo 'url': {stats['moved_to_url']}")
    print(f"Textos basura eliminados de 'doi' (seteados a NULL): {stats['junk_cleared']}")
    print(f"Códigos externos recalculados: {stats['codes_updated']}")
    print(f"Total filas a actualizar en BD: {len(updates)}")

    if not updates:
        print("No se requieren actualizaciones en BD.")
        return

    # Ejecutar en transacción
    print("\nAplicando actualizaciones en base de datos...")
    conn.autocommit = False
    try:
        for u in updates:
            new_code, new_doi, new_url, p_id, old_code, old_doi = u
            cur.execute("""
                UPDATE Product
                SET external_code = ?,
                    doi = ?,
                    url = ?
                WHERE id = ?
            """, new_code, new_doi, new_url, p_id)
        conn.commit()
        print("Transacción SQL completada con éxito.")
    except Exception as e:
        conn.rollback()
        print(f"ERROR: Se realizó ROLLBACK debido a: {e}")
        raise
    finally:
        cur.close()
        conn.close()

    # Recargar RAM en el núcleo C++
    print("\nSincronizando RAM del repositorio (C++ Core)...")
    success = repository.initialize(repository.InitMode.Database, CONN_STR)
    if success:
        print("Memoria RAM sincronizada exitosamente con la base de datos.")
    else:
        print("ADVERTENCIA: Error reinicializando la memoria RAM del repositorio.")

if __name__ == "__main__":
    run_migration()
