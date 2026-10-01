"""Script de limpieza total para dejar la base de datos y la memoria RAM C++
completamente en blanco (Clean Slate), manteniendo intacto el catálogo oficial Minciencias 2024.

Limpia todas las tablas operativas:
- Productos, autores, enlaces producto-grupo
- Cola de validación
- Grupos, membresías, planes de trabajo, líneas de investigación
- Investigadores
- Proyectos y enlaces
- Trabajos de importación (ImportJob, ImportRecord)
- Auditoría y operaciones de deshecho (AuditLog, UndoOperation)

Reinicia los contadores IDENTITY a 0 para que los nuevos IDs comiencen en 1.
Sincroniza la memoria RAM del núcleo C++ para reflejar el estado vacío de inmediato.
"""

import sys
import json
import urllib.request
import urllib.error
import pyodbc

CONN_STR = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=localhost;"
    "Database=peai;"
    "Trusted_Connection=yes;"
)

API_URL = "http://127.0.0.1:8000"

OPERATIONAL_TABLES = [
    # 1. Dependencias de Product
    "ValidationQueueItem",
    "ProjectProduct",
    "GroupProductLink",
    "ProductAuthor",
    # 2. Historial de importaciones
    "ImportRecord",
    "ImportJob",
    # 3. Productos
    "Product",
    # 4. Proyectos y relaciones
    "ResearcherProject",
    "GroupProject",
    "Project",
    # 5. Membresías e Investigadores
    "GroupMembership",
    "Researcher",
    # 6. Grupos, planes y líneas
    "GroupResearchLine",
    "ResearchLine",
    "WorkPlan",
    "ResearchGroup",
    # 7. Auditoría y deshacer
    "AuditLog",
    "UndoOperation",
]


def wipe_database():
    print("[1/4] Limpiando tablas operacionales en SQL Server...")
    cn = pyodbc.connect(CONN_STR, autocommit=False)
    cur = cn.cursor()
    try:
        # Desconectar PI en Project antes de borrar
        cur.execute("UPDATE Project SET principal_investigator_id = NULL")

        for table in OPERATIONAL_TABLES:
            cur.execute(f"DELETE FROM {table}")
            print(f"  - DELETE FROM {table} OK")

        # Reseed identity columns
        print("\n[2/4] Reiniciando contadores IDENTITY a 0...")
        for table in OPERATIONAL_TABLES:
            try:
                cur.execute(f"DBCC CHECKIDENT ('{table}', RESEED, 0)")
            except Exception as e:
                # Algunas tablas intermedias sin identity simplemente ignoran
                pass

        cn.commit()
        print("  [OK] Transaccion completada con exito.")
    except Exception as e:
        cn.rollback()
        print(f"  [ERROR] Error en limpieza: {e}")
        sys.exit(1)
    finally:
        cn.close()


def verify_catalog():
    print("\n[3/4] Verificando catalogo Minciencias 2024...")
    cn = pyodbc.connect(CONN_STR, autocommit=True)
    cur = cn.cursor()
    fam_count = cur.execute("SELECT COUNT(*) FROM ProductFamily").fetchone()[0]
    sub_count = cur.execute("SELECT COUNT(*) FROM ProductSubtype").fetchone()[0]
    cat_count = cur.execute("SELECT COUNT(*) FROM QualityCategory").fetchone()[0]
    cn.close()

    print(f"  - Familias: {fam_count} (Esperadas: 5)")
    print(f"  - Subtipos: {sub_count} (Esperados: 70)")
    print(f"  - Categorias de Calidad: {cat_count} (Esperadas: 170)")

    if fam_count != 5 or sub_count != 70 or cat_count != 170:
        print("  ! Catalogo incompleto. Ejecutando seed_catalog_2024.py...")
        import subprocess
        subprocess.run([sys.executable, "database/seed_catalog_2024.py"], check=True)
    else:
        print("  [OK] Catalogo 2024 integro y listo.")


def sync_cpp_memory():
    print("\n[4/4] Sincronizando memoria RAM del nucleo C++...")
    # Intentar sincronizar por API si el backend esta activo
    payload = json.dumps({"connection_string": CONN_STR, "replace_existing": True}).encode("utf-8")
    req = urllib.request.Request(
        f"{API_URL}/api/v1/system/initialize/database",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    api_synced = False
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                print("  [OK] Memoria C++ reinicializada mediante endpoint de backend FastAPI.")
                api_synced = True
    except Exception as e:
        print(f"  Aviso: No se pudo contactar endpoint API ({e}). Intentando via modulo repository...")

    if not api_synced:
        try:
            # Import directo si se ejecuta en el entorno con abpoxx_pybind
            sys.path.insert(0, "backend")
            from app import repository
            repository.initialize(repository.InitMode.Database, CONN_STR)
            print("  [OK] Memoria C++ reinicializada directamente via repository.initialize().")
        except Exception as e:
            print(f"  Aviso: Backend no estaba corriendo o abpoxx no cargable directamente ({e}).")
            print("  Al arrancar el backend cargara automaticamente la BD vacia.")


def report_summary():
    print("\n================ RESUMEN DE ESTADO LIMPIO ================")
    cn = pyodbc.connect(CONN_STR, autocommit=True)
    cur = cn.cursor()
    tables = [
        "Product", "ResearchGroup", "Researcher", "GroupMembership",
        "ValidationQueueItem", "ImportJob", "ImportRecord", "Project",
        "AuditLog", "ProductFamily", "ProductSubtype", "QualityCategory"
    ]
    for t in tables:
        count = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        status = "0 (Limpio)" if count == 0 else f"{count} (Catalogo)" if "Product" in t or "Quality" in t else f"{count}"
        print(f"  {t.ljust(22)}: {status}")
    cn.close()

    # Verificar API si esta activa
    try:
        with urllib.request.urlopen(f"{API_URL}/api/v1/dashboard/stats", timeout=5) as r:
            stats = json.loads(r.read().decode("utf-8"))
            print("\n  Dashboard Stats (via API Backend):")
            print(f"    - Total Grupos: {stats.get('total_groups', 0)}")
            print(f"    - Total Investigadores: {stats.get('total_researchers', 0)}")
            print(f"    - Total Productos: {stats.get('total_products', 0)}")
            print(f"    - Pendientes en Cola: {stats.get('pending_validation', 0)}")
    except Exception:
        pass
    print("=========================================================\n")


if __name__ == "__main__":
    wipe_database()
    verify_catalog()
    sync_cpp_memory()
    report_summary()
