"""
recreate_database.py
Script maestro para recrear completamente la base de datos peai desde cero,
aplicar el esquema oficial actualizado, sembrar el catálogo Minciencias 2024
y ejecutar la ingesta atómica exclusivamente para AITICE y Grupo de Óptica e Informática.
"""

import os
import sys
import re
import pyodbc
from backend.app.config import settings
from backend.app import repository, datos_abiertos
from backend.app.scraper import scrape_gruplac


def _conn_str(database: str) -> str:
    """Connection string para una BD concreta, con credenciales de backend/.env."""
    return (
        f"Driver={{{settings.DB_DRIVER}}};"
        f"Server={settings.DB_SERVER},{settings.DB_PORT};"
        f"Database={database};"
        f"UID={settings.DB_USER};"
        f"PWD={settings.DB_PASSWORD};"
        f"TrustServerCertificate={settings.DB_TRUST_CERT};"
    )


MASTER_CONN_STR = _conn_str("master")
PEAI_CONN_STR = _conn_str("peai")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "database", "init_schema.sql")

TARGET_GROUPS = [
    {
        "name": "AITICE",
        "url": "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000002668",
        "code": "COL0043834",
        "local_html": os.path.join(os.path.dirname(__file__), "docs", "AITICE-PAGE.html"),
    },
    {
        "name": "Grupo de óptica e informática",
        "url": "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000002093",
        "code": "COL0002093",
        "local_html": None,
    },
]


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
            clean_b = re.sub(r"(?i)^\s*USE\s+peai\s*;?", "", batch).strip()
            if clean_b:
                cur.execute(clean_b)
    print(f"  [OK] Esquema ejecutado ({len(batches)} lotes DDL procesados).")


def seed_catalog():
    print("=================================================================")
    print("PASO 3: Sembrando catálogo oficial Minciencias 2024")
    print("=================================================================")
    from database.seed_catalog_2024 import main as seed_catalog_main
    seed_catalog_main()
    print("  [OK] Catálogo 2024 sembrado exitosamente.")


def run_ingestion():
    print("=================================================================")
    print("PASO 4: Ingesta atómica de Minciencias GrupLAC")
    print(f"        Grupos a importar: {len(TARGET_GROUPS)}")
    print("=================================================================")
    # Inicializar repositorio conectado a la BD recién creada
    repository.initialize(repository.InitMode.Database, PEAI_CONN_STR)
    repository._active_connection_string = PEAI_CONN_STR

    for idx, grp in enumerate(TARGET_GROUPS, start=1):
        print(f"\n--- [{idx}/{len(TARGET_GROUPS)}] Ingestando: {grp['name']} ({grp['code']}) ---")
        print(f"URL: {grp['url']}")
        try:
            print("  -> Descargando e ingiriendo en vivo desde Scienti...")
            result = scrape_gruplac(grp["url"], PEAI_CONN_STR, enrich_cvlac=True)
        except Exception as e:
            print(f"  [AVISO] No se pudo descargar en vivo desde Scienti ({e}).")
            if grp.get("local_html") and os.path.exists(grp["local_html"]):
                print(f"  -> Usando snapshot local {grp['local_html']}...")
                from backend.app.scraper import GruplacHtmlParser, GruplacCommitService
                with open(grp["local_html"], "r", encoding="utf-8", errors="replace") as f:
                    html = f.read()
                data = GruplacHtmlParser.parse(html, source_url=grp["url"])
                data.group["external_code"] = grp["code"]
                result = GruplacCommitService.commit(data, db_conn_str=PEAI_CONN_STR)
            else:
                print(f"  [ERROR] Falló la ingesta del grupo {grp['name']}: {e}")
                continue

        print(f"  [OK] Ingesta de {grp['name']} finalizada con éxito:")
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
            "http://127.0.0.1:8000/api/v1/system/initialize/database",
            json={"connection_string": PEAI_CONN_STR},
            timeout=120,
        )
        print(f"  [OK] API recargada desde la BD nueva (HTTP {resp.status_code}).")
    except Exception:
        print("  -> API no está corriendo (o no responde); al iniciarla tomará la BD nueva.")


if __name__ == "__main__":
    if not settings.DB_PASSWORD:
        sys.exit("Falta DB_PASSWORD: configura backend/.env antes de recrear la BD.")
    recreate_sql_database()
    apply_schema()
    seed_catalog()
    run_ingestion()
    enrich_from_open_data()
    verify_report()
    notify_running_api()
