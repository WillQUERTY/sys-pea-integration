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
from backend.app import repository, datos_abiertos
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
        print("  -> Creando base de datos peai limpia con Collation UTF-8...")
        try:
            cur.execute("CREATE DATABASE peai COLLATE Latin1_General_100_CI_AS_SC_UTF8;")
        except pyodbc.Error as e:
            print(f"Advertencia: No se pudo usar Collation UTF-8 ({e}), creando por defecto...")
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

    # Enriquecimiento en cascada: tras importar el grupo, se descarga el CvLAC
    # de cada integrante con cod_rh (1 req/seg; los fallos quedan como warnings).
    result = scrape_gruplac(GRUPLAC_URL, PEAI_CONN_STR, enrich_cvlac=True)
    print(f"  [OK] Ingesta finalizada con éxito:")
    print(f"       Total procesados: {result.get('total_records')}")
    print(f"       Nuevos: {result.get('new_records')}")
    print(f"       {result.get('reconciliation_summary')}")
    enr = result.get("cvlac_enrichment")
    if enr:
        print(f"       CvLAC: {enr['enriched']} integrantes enriquecidos, {enr['failed']} fallidos")


def enrich_from_open_data():
    print("=================================================================")
    print("PASO 4b: Enriquecimiento desde datos abiertos (datos.gov.co / Socrata)")
    print("=================================================================")
    # Rellena formación, clasificación Minciencias, nacionalidad y residencia
    # de los investigadores reconocidos en convocatorias, usando su cod_rh.
    summary = datos_abiertos.enrich_all(only_missing=True)
    print(f"  [OK] Procesados: {summary['processed']} | Enriquecidos: {summary['enriched']} | "
          f"Sin registro: {summary['not_found']} | Ya al día: {summary['up_to_date']}")


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


def notify_running_api():
    """Si la API FastAPI está corriendo, le ordena recargar su RAM desde la BD recién creada."""
    print("PASO 6: Sincronizando RAM de la API en ejecución (si aplica)")
    try:
        import requests
        resp = requests.post(
            "http://localhost:8000/api/v1/system/initialize/database",
            json={"connection_string": PEAI_CONN_STR},
            timeout=120,
        )
        print(f"  [OK] API recargada desde la BD nueva (HTTP {resp.status_code}).")
    except Exception:
        print("  -> API no está corriendo (o no responde); al iniciarla tomará la BD nueva.")


if __name__ == "__main__":
    recreate_sql_database()
    apply_schema()
    seed_upc_groups()
    run_ingestion()
    enrich_from_open_data()
    verify_report()
    notify_running_api()
