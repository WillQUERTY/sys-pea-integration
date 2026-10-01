"""Siembra el catalogo Minciencias 2024 en peai desde database/catalog_2024.json.

Upsert idempotente por `code` (una corrida repetida no duplica nada).
Orden requerido:
    1. sqlcmd -S localhost -d peai -i database/reset_for_2024_catalog.sql
    2. sqlcmd -S localhost -d peai -i database/init_schema.sql
    3. python database/seed_catalog_2024.py   (este script)

Sembrar sobre una BD sin reset deja las filas legacy (code NULL) junto a las
2024: el script lo detecta y sale con codigo 1.
"""
import json
import pathlib
import sys

import pyodbc

ROOT = pathlib.Path(__file__).resolve().parent
CATALOG = ROOT / "catalog_2024.json"
CONN = ("Driver={ODBC Driver 17 for SQL Server};Server=localhost;"
        "Database=peai;Trusted_Connection=yes;")

REQUIRED_COLUMNS = {
    "ProductFamily": {"code", "sort_order"},
    "ProductSubtype": {"code", "model_ref", "sort_order"},
    "QualityCategory": {"code", "subtype_id", "measurement_class",
                        "weight", "global_weight", "sort_order"},
}


def verify_columns(cur):
    """Aborta con mensaje claro si falta la extension 2024 (init_schema.sql)."""
    missing = []
    for table, cols in REQUIRED_COLUMNS.items():
        have = {row[0] for row in cur.execute(
            "SELECT name FROM sys.columns WHERE object_id = OBJECT_ID(?)", table
        ).fetchall()}
        if not have:
            raise SystemExit(f"ERROR: la tabla {table} no existe. "
                             "Correr: sqlcmd -S localhost -d peai -i database/init_schema.sql")
        missing += [f"{table}.{c}" for c in cols if c not in have]
    if missing:
        raise SystemExit("ERROR: faltan columnas 2024 (" + ", ".join(missing)
                         + "). Correr: sqlcmd -S localhost -d peai -i database/init_schema.sql")


def upsert_family(cur, fam):
    row = cur.execute("SELECT id FROM ProductFamily WHERE code = ?",
                      fam["code"]).fetchone()
    if row:
        cur.execute("UPDATE ProductFamily SET name = ?, sort_order = ? WHERE id = ?",
                    fam["name"], fam["sort_order"], row[0])
        return row[0], 0
    cur.execute("INSERT INTO ProductFamily (code, name, sort_order) VALUES (?, ?, ?)",
                fam["code"], fam["name"], fam["sort_order"])
    return cur.execute("SELECT id FROM ProductFamily WHERE code = ?",
                       fam["code"]).fetchone()[0], 1


def upsert_subtype(cur, fam_id, sub):
    row = cur.execute("SELECT id FROM ProductSubtype WHERE code = ?",
                      sub["code"]).fetchone()
    if row:
        cur.execute("UPDATE ProductSubtype SET family_id = ?, name = ?, model_ref = ?, "
                    "sort_order = ? WHERE id = ?",
                    fam_id, sub["name"], sub.get("model_ref"), sub["sort_order"], row[0])
        return row[0], 0
    cur.execute("INSERT INTO ProductSubtype (family_id, code, name, model_ref, sort_order) "
                "VALUES (?, ?, ?, ?, ?)",
                fam_id, sub["code"], sub["name"], sub.get("model_ref"), sub["sort_order"])
    return cur.execute("SELECT id FROM ProductSubtype WHERE code = ?",
                       sub["code"]).fetchone()[0], 1


def upsert_category(cur, sub_id, cat):
    row = cur.execute("SELECT id FROM QualityCategory WHERE code = ?",
                      cat["code"]).fetchone()
    if row:
        cur.execute("UPDATE QualityCategory SET name = ?, subtype_id = ?, "
                    "measurement_class = ?, weight = ?, global_weight = ?, sort_order = ? "
                    "WHERE id = ?",
                    cat["label"], sub_id, cat["measurement_class"], cat["weight"],
                    cat.get("global_weight"), cat["sort_order"], row[0])
        return 0
    cur.execute("INSERT INTO QualityCategory (code, name, subtype_id, measurement_class, "
                "weight, global_weight, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
                cat["code"], cat["label"], sub_id, cat["measurement_class"], cat["weight"],
                cat.get("global_weight"), cat["sort_order"])
    return 1


def main():
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    cn = pyodbc.connect(CONN, autocommit=True)
    cur = cn.cursor()
    verify_columns(cur)

    fams_added = subs_added = cats_added = 0
    for fam in catalog["families"]:
        fam_id, n = upsert_family(cur, fam)
        fams_added += n
        for sub in fam["subtypes"]:
            sub_id, n = upsert_subtype(cur, fam_id, sub)
            subs_added += n
            for cat in sub["categories"]:
                cats_added += upsert_category(cur, sub_id, cat)

    # Resumen por familia: BD vs JSON
    print("Catalogo 2024 (insertados esta corrida: familias %d, subtipos %d, categorias %d)"
          % (fams_added, subs_added, cats_added))
    for fam in catalog["families"]:
        exp_s = len(fam["subtypes"])
        exp_c = sum(len(s["categories"]) for s in fam["subtypes"])
        db_s = cur.execute("SELECT COUNT(*) FROM ProductSubtype s "
                           "JOIN ProductFamily f ON f.id = s.family_id WHERE f.code = ?",
                           fam["code"]).fetchone()[0]
        db_c = cur.execute("SELECT COUNT(*) FROM QualityCategory q "
                           "JOIN ProductSubtype s ON s.id = q.subtype_id "
                           "JOIN ProductFamily f ON f.id = s.family_id WHERE f.code = ?",
                           fam["code"]).fetchone()[0]
        ok = "OK" if (db_s, db_c) == (exp_s, exp_c) else "MISMATCH"
        print(f"  {fam['code']}: subtipos {db_s}/{exp_s}, categorias {db_c}/{exp_c} [{ok}]")

    # Filas legacy (sin code) = senal de que falto el reset
    orphans = cur.execute("""
        SELECT (SELECT COUNT(*) FROM ProductFamily  WHERE code IS NULL),
               (SELECT COUNT(*) FROM ProductSubtype WHERE code IS NULL),
               (SELECT COUNT(*) FROM QualityCategory WHERE code IS NULL)
    """).fetchone()
    total = cur.execute("""
        SELECT (SELECT COUNT(*) FROM ProductFamily),
               (SELECT COUNT(*) FROM ProductSubtype),
               (SELECT COUNT(*) FROM QualityCategory)
    """).fetchone()
    print("Total en BD -> familias: %d, subtipos: %d, categorias: %d"
          % (total[0], total[1], total[2]))
    if sum(orphans):
        print("ADVERTENCIA: hay filas legacy sin code (%d familias, %d subtipos, "
              "%d categorias). Correr reset_for_2024_catalog.sql y re-sembrar."
              % (orphans[0], orphans[1], orphans[2]))
        sys.exit(1)
    cn.close()


if __name__ == "__main__":
    main()
