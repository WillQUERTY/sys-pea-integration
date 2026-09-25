"""
test_write_model.py
Verificación Integral del Modelo de Escritura (Write-Through), Multilistas,
Flujo de Validación Técnica, Ventana de Observación y Pila LIFO Undo.
"""

import pyodbc
from backend.app import repository
from backend.app.models import Group, Researcher, Product
from fastapi.testclient import TestClient
from backend.app.main import app

DB_CONN_STR = "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"

def run_tests():
    print("=" * 65)
    print("INICIANDO PRUEBAS DEL MODELO DE ESCRITURA Y API (PEA-i)")
    print("=" * 65)

    # 1. Inicialización en modo Base de Datos
    init_ok = repository.initialize(repository.InitMode.Database, DB_CONN_STR)
    repository._active_connection_string = DB_CONN_STR
    print(f"[OK] Inicialización desde BD: {init_ok}")

    # 2. Verificar carga inicial de RAM
    groups = repository.list_groups()
    researchers = repository.list_researchers()
    products = repository.list_products()
    print(f"[OK] Memoria RAM C++: {len(groups)} grupos, {len(researchers)} investigadores, {len(products)} productos.")
    assert len(groups) > 0, "No se cargaron grupos"
    assert len(products) > 0, "No se cargaron productos"

    # 3. Prueba de Actualización (Update con Write-Through)
    sample_prod = products[0]
    prod_id = sample_prod.id
    original_title = sample_prod.title
    print(f"\n--- Prueba UPDATE Producto #{prod_id} ---")
    print(f"  Título original: {original_title[:50]}...")

    sample_prod.description = "Descripcion de prueba actualizada mediante API Write-Through"
    updated_prod = repository.update_product(prod_id, sample_prod)
    assert updated_prod.description == sample_prod.description, "Fallo actualizacion en RAM"

    # Verificar en SQL Server
    with pyodbc.connect(DB_CONN_STR) as conn:
        cur = conn.cursor()
        cur.execute("SELECT description FROM Product WHERE id = ?", prod_id)
        db_desc = cur.fetchone()[0]
        assert db_desc == sample_prod.description, "Fallo sincronizacion write-through a SQL Server"
        print(f"  [OK] Producto actualizado en RAM y SQL Server: '{db_desc[:50]}...'")

    # 4. Prueba de Validacion Tecnica (set_product_validation)
    print(f"\n--- Prueba VALIDACION Producto #{prod_id} ---")
    val_prod = repository.set_product_validation(prod_id, "valid", quality_category_id=2, reason="Aprobado en comite cientifico")
    assert val_prod.validation_status == "valid", "Fallo cambio de estado a valid en RAM"
    assert val_prod.quality_category_id == 2, "Fallo asignación de categoría en RAM"

    with pyodbc.connect(DB_CONN_STR) as conn:
        cur = conn.cursor()
        cur.execute("SELECT validation_status, quality_category_id FROM Product WHERE id = ?", prod_id)
        row = cur.fetchone()
        assert row[0] == "valid" and row[1] == 2, "Fallo persistencia de validación en SQL Server"
        cur.execute("SELECT status, validation_reason FROM GroupProductLink WHERE product_id = ?", prod_id)
        gpl_row = cur.fetchone()
        print(f"  [OK] Estado en Product: {row[0]} | Calidad: {row[1]}")
        if gpl_row:
            print(f"  [OK] Enlace en GroupProductLink: {gpl_row[0]} ({gpl_row[1]})")

    # 5. Prueba de Reversión (LIFO Undo)
    print(f"\n--- Prueba LIFO UNDO (Revertir validación) ---")
    undo_res = repository.undo_perform()
    print(f"  Resultado Undo: {undo_res}")
    reverted_prod = repository.get_product(prod_id)
    print(f"  Estado revertido en RAM: {reverted_prod.validation_status}")
    with pyodbc.connect(DB_CONN_STR) as conn:
        cur = conn.cursor()
        cur.execute("SELECT validation_status FROM Product WHERE id = ?", prod_id)
        db_vsts = cur.fetchone()[0]
        print(f"  Estado revertido en SQL Server: {db_vsts}")
        assert db_vsts == "pending", "El estado debió volver a pending mediante Undo"

    # 6. Prueba Ventana de Observación (Requerimiento 10)
    print(f"\n--- Prueba VENTANA DE OBSERVACIÓN (Filtro por Años) ---")
    # Filtrar productos 2024-2026
    filtered_window = repository.filter_products(start_year=2024, end_year=2026)
    print(f"  Productos encontrados en ventana 2024-2026: {len(filtered_window)}")
    for p in filtered_window[:3]:
        print(f"    - [{p.year}] {p.title[:60]}...")
    assert len(filtered_window) > 0, "Debe haber productos en ventana 2024-2026"

    # 7. Pruebas de Endpoints HTTP mediante TestClient
    print(f"\n--- Prueba ENDPOINTS HTTP FASTAPI ---")
    client = TestClient(app)
    
    # GET /api/v1/products con filtro de ventana de observación
    resp = client.get("/api/v1/products?start_year=2024&end_year=2026&limit=5")
    assert resp.status_code == 200, f"Error HTTP {resp.status_code}"
    data = resp.json()
    print(f"  [OK] GET /api/v1/products (Ventana 2024-2026): {len(data)} ítems")

    # PATCH /api/v1/products/{id}/validation
    val_payload = {
        "validation_status": "valid",
        "quality_category_id": 1,
        "reason": "Validacion via API HTTP"
    }
    resp_val = client.patch(f"/api/v1/products/{prod_id}/validation", json=val_payload)
    assert resp_val.status_code == 200
    assert resp_val.json()["validation_status"] == "valid"
    print(f"  [OK] PATCH /api/v1/products/{prod_id}/validation -> valid")

    # POST /api/v1/system/undo
    resp_undo = client.post("/api/v1/system/undo")
    assert resp_undo.status_code == 200
    print(f"  [OK] POST /api/v1/system/undo -> {resp_undo.json()['message']}")

    # Multilistas y relaciones
    active_group_id = next(g.id for g in groups if len(repository.products_of_group(g.id)) > 0)
    resp_members = client.get(f"/api/v1/groups/{active_group_id}/members")
    assert resp_members.status_code == 200
    initial_member_count = len(resp_members.json())
    print(f"  [OK] GET /api/v1/groups/{active_group_id}/members -> {initial_member_count} integrantes")
    assert initial_member_count > 0, "El grupo activo debe tener integrantes"

    resp_prods = client.get(f"/api/v1/groups/{active_group_id}/products")
    assert resp_prods.status_code == 200
    initial_prod_count = len(resp_prods.json())
    print(f"  [OK] GET /api/v1/groups/{active_group_id}/products -> {initial_prod_count} productos")
    assert initial_prod_count > 0, "El grupo activo debe tener productos"

    # Multilista: desvincular producto y revertir con Undo
    sample_pid = resp_prods.json()[0]["id"]
    resp_del_link = client.delete(f"/api/v1/groups/{active_group_id}/products/{sample_pid}")
    assert resp_del_link.status_code == 200
    prods_after_unlink = len(client.get(f"/api/v1/groups/{active_group_id}/products").json())
    assert prods_after_unlink == initial_prod_count - 1, "Fallo al desvincular producto del grupo"
    print(f"  [OK] DELETE /api/v1/groups/{active_group_id}/products/{sample_pid} -> Desvinculado ({prods_after_unlink} restantes)")

    # Revertir desvinculación mediante Undo
    resp_undo_link = client.post("/api/v1/system/undo")
    assert resp_undo_link.status_code == 200
    prods_after_undo = len(client.get(f"/api/v1/groups/{active_group_id}/products").json())
    assert prods_after_undo == initial_prod_count, "Fallo al restaurar enlace producto mediante Undo"
    print(f"  [OK] POST /api/v1/system/undo -> Restaurado enlace producto (#{sample_pid})")

    # FIFO Validation Queue
    resp_vq = client.post("/api/v1/system/validation-queue/enqueue", json={"product_id": sample_pid, "assigned_to": "revisor_test"})
    assert resp_vq.status_code == 201
    resp_qlist = client.get("/api/v1/system/validation-queue")
    assert resp_qlist.status_code == 200
    print(f"  [OK] Cola FIFO de Validacion: {len(resp_qlist.json())} items en cola")

    print("\n" + "=" * 65)
    print("TODAS LAS PRUEBAS DEL MODELO DE ESCRITURA Y API PASARON CON EXITO")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
