"""
recreate_database.py
Script maestro para recrear completamente la base de datos peai desde cero,
aplicar el esquema oficial actualizado, sembrar catalogos y grupos UPC desde pea_data.json,
y ejecutar la ingesta atomica mediante el importador refactorizado.
"""

import os
import sys
import re
import pyodbc
from backend.app import repository
from backend.app.scraper import scrape_gruplac

MASTER_CONN_STR = "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=master;Trusted_Connection=yes;"
PEAI_CONN_STR = "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "database", "init_schema.sql")
PEA_DATA_PATH = os.path.join(os.path.dirname(__file__), "pea_data.json")
GRUPLAC_URL = "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000002093"


def recreate_sql_database():
    print("=================================================================")
    print("PASO 1: Recreando base de datos peai en SQL Server (Localhost)")
    print("=================================================================")
    with pyodbc.connect(MASTER_CONN_STR, autocommit=True) as master_conn:
        cur = master_conn.cursor()
        print("  -> Verificando si peai existe...")
        cur.execute("SELECT database_id FROM sys.databases WHERE name = 'peai'")
        if cur.fetchone():
            print("  -> Forzando cierre de conexiones y eliminando base de datos peai...")
            cur.execute("ALTER DATABASE peai SET SINGLE_USER WITH ROLLBACK IMMEDIATE;")
            cur.execute("DROP DATABASE peai;")
        print("  -> Creando base de datos peai limpia...")
        cur.execute("CREATE DATABASE peai;")
    print("  [OK] Base de datos peai recreada exitosamente.")


def apply_schema():
    print("=================================================================")
    print("PASO 2: Aplicando esquema DDL oficial (database/init_schema.sql)")
    print("=================================================================")
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Dividir por bloques GO
    batches = [b.strip() for b in re.split(r"(?i)^\s*GO\s*$", sql_content, flags=re.MULTILINE) if b.strip()]

    with pyodbc.connect(PEAI_CONN_STR, autocommit=True) as conn:
        cur = conn.cursor()
        for idx, batch in enumerate(batches, start=1):
            # Omitir comandos USE peai redundantes
            clean_b = re.sub(r"(?i)^\s*USE\s+peai\s*;?", "", batch).strip()
            if clean_b:
                cur.execute(clean_b)
    print(f"  [OK] Esquema ejecutado ({len(batches)} lotes DDL procesados).")


def seed_upc_groups():
    print("=================================================================")
    print("PASO 3: Sembrando grupos base de la UPC desde pea_data.json")
    print("=================================================================")
    # Inicializar memoria nativa C++
    repository.initialize(repository.InitMode.Empty)
    
    # Cargar 60 grupos base de la UPC en RAM nativa
    loaded = repository.load_from_file(PEA_DATA_PATH)
    groups = repository.list_groups()
    print(f"  -> Grupos cargados en memoria RAM: {len(groups)}")
    
    # Sincronizar hacia SQL Server
    saved = repository.save_to_db(PEAI_CONN_STR)
    print(f"  [OK] Grupos sincronizados a SQL Server: {saved}")


def run_ingestion():
    print("=================================================================")
    print("PASO 4: Ingesta atómica de Minciencias GrupLAC")
    print(f"URL: {GRUPLAC_URL}")
    print("=================================================================")
    # Inicializar repositorio conectado a la BD recién creada
    repository.initialize(repository.InitMode.Database, PEAI_CONN_STR)
    repository._active_connection_string = PEAI_CONN_STR

    result = scrape_gruplac(GRUPLAC_URL, PEAI_CONN_STR)
    print(f"  [OK] Ingesta finalizada con éxito:")
    print(f"       Total procesados: {result.get('total_records')}")
    print(f"       Nuevos: {result.get('new_records')}")
    print(f"       {result.get('reconciliation_summary')}")


def verify_report():
    print("=================================================================")
    print("PASO 5: Reporte y auditoría final de tablas en SQL Server")
    print("=================================================================")
    with pyodbc.connect(PEAI_CONN_STR) as conn:
        cur = conn.cursor()
        cur.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")
        tables = [r[0] for r in cur.fetchall()]
        total_all = 0
        for t in tables:
            cnt = cur.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
            total_all += cnt
            print(f"  {t:24} : {cnt:>6} filas")
        print("-----------------------------------------------------------------")
        print(f"  TOTAL TABLAS: {len(tables)} | TOTAL REGISTROS: {total_all}")
        print("=================================================================")

        # Métricas de conciliación específicas
        print("MÉTRICAS DE GOBERNANZA:")
        cur.execute("SELECT status, source, COUNT(*) FROM GroupProductLink GROUP BY status, source")
        for r in cur.fetchall():
            print(f"  - Enlaces Producto-Grupo [{r[0]} / {r[1]}]: {r[2]}")

        cur.execute("SELECT CASE WHEN researcher_id IS NOT NULL THEN 'Institucional' ELSE 'Externo' END, COUNT(*) FROM ProductAuthor GROUP BY CASE WHEN researcher_id IS NOT NULL THEN 'Institucional' ELSE 'Externo' END")
        for r in cur.fetchall():
            print(f"  - Autores [{r[0]}]: {r[1]}")

        cur.execute("SELECT entity_type, action_taken, COUNT(*) FROM ImportRecord GROUP BY entity_type, action_taken")
        for r in cur.fetchall():
            print(f"  - Conciliación ImportRecord [{r[0]} / {r[1]}]: {r[2]}")


if __name__ == "__main__":
    recreate_sql_database()
    apply_schema()
    seed_upc_groups()
    run_ingestion()
    verify_report()
