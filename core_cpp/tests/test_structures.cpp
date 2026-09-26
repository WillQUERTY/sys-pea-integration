// core_cpp/tests/test_structures.cpp
// Pruebas de las estructuras manuales (sección 41.1 de la especificación).
// Sin dependencias externas: framework de asserts mínimo.
//
// Cobertura:
//   LISTA       — insertar en vacía / al final, buscar existente / inexistente,
//                 modificar, desactivar, eliminar primero / intermedio / último.
//   MULTILISTA  — enlaces y recorridos grupo→integrantes e investigador→grupos
//   PILA        — push/top/pop/undo_perform (pendiente: bloque 3)
//   COLA        — FIFO (pendiente: bloque 4)

#include "core.h"
#include <iostream>
#include <string>
#include <cstdio>

using namespace peai;

// ---- Framework mínimo ----
static int g_passed = 0;
static int g_failed = 0;

#define CHECK(cond, msg)                                            \
    do {                                                            \
        if (cond) { g_passed++; }                                   \
        else {                                                      \
            g_failed++;                                             \
            std::cout << "  [FALLA] " << msg                        \
                      << " (línea " << __LINE__ << ")\n";           \
        }                                                           \
    } while (0)

// Estado limpio antes de cada prueba (las estructuras son globales).
static void reset_state() {
    for (const auto& g : list_groups())      delete_group(g.id);
    for (const auto& r : list_researchers()) delete_researcher(r.id);
    for (const auto& p : list_products())    delete_product(p.id);
    vq_clear();
    undo_clear();
}

#define RUN_TEST(fn)                                \
    do {                                            \
        reset_state();                              \
        std::cout << "[TEST] " << #fn << "\n";      \
        fn();                                       \
    } while (0)

// =====================================================================
//  LISTA — grupos (la lista principal del sistema)
// =====================================================================

// Insertar en lista vacía e insertar al final (append preserva el orden).
static void test_lista_insertar_vacia_y_final() {
    CHECK(list_groups().empty(), "la lista inicia vacía");

    Group g1; g1.external_code = "G1"; g1.name = "Primero";
    Group g2; g2.external_code = "G2"; g2.name = "Segundo";
    Group g3; g3.external_code = "G3"; g3.name = "Tercero";
    Group c1 = create_group(g1);
    create_group(g2);
    create_group(g3);

    auto all = list_groups();
    CHECK(all.size() == 3, "tres grupos insertados");
    CHECK(all[0].id == c1.id, "el primero insertado queda al frente");
    CHECK(all[1].name == "Segundo", "el segundo queda en el medio");
    CHECK(all[2].name == "Tercero", "el último insertado queda al final");
}

// Buscar un elemento existente y uno inexistente.
static void test_lista_buscar() {
    Group g; g.external_code = "G1"; g.name = "Buscable";
    Group created = create_group(g);

    auto found = get_group(created.id);
    CHECK(found.has_value(), "get_group encuentra el id existente");
    CHECK(found->name == "Buscable", "el grupo encontrado tiene los datos correctos");
    CHECK(!get_group(999999).has_value(), "get_group de id inexistente devuelve vacío");
}

// Modificar un elemento y desactivarlo (cambio de estado).
static void test_lista_modificar_y_desactivar() {
    Group g; g.external_code = "G1"; g.name = "Original"; g.status = "active";
    Group created = create_group(g);

    Group upd = *get_group(created.id);
    upd.name = "Modificado";
    CHECK(update_group(created.id, upd), "update_group devuelve true");
    CHECK(get_group(created.id)->name == "Modificado", "el nombre quedó modificado");

    upd = *get_group(created.id);
    upd.status = "inactive";
    update_group(created.id, upd);
    CHECK(get_group(created.id)->status == "inactive", "el grupo quedó desactivado");
}

// Eliminar el primero, el intermedio y el último de la lista.
static void test_lista_eliminar_primero_intermedio_ultimo() {
    Group g; g.status = "active";
    g.name = "A"; int idA = create_group(g).id;
    g.name = "B"; int idB = create_group(g).id;
    g.name = "C"; int idC = create_group(g).id;

    // Eliminar el intermedio
    CHECK(delete_group(idB), "eliminar intermedio devuelve true");
    auto all = list_groups();
    CHECK(all.size() == 2, "quedan 2 tras eliminar el intermedio");
    CHECK(all[0].id == idA && all[1].id == idC, "A y C sobreviven y la cadena no se rompe");

    // Eliminar el primero
    CHECK(delete_group(idA), "eliminar primero devuelve true");
    all = list_groups();
    CHECK(all.size() == 1 && all[0].id == idC, "solo queda C");

    // Eliminar el último (ahora también es el único)
    CHECK(delete_group(idC), "eliminar último devuelve true");
    CHECK(list_groups().empty(), "la lista queda vacía");
    CHECK(!delete_group(idC), "eliminar de nuevo devuelve false (id inexistente)");
}

// =====================================================================
//  MULTILISTA — grupo ↔ investigadores y grupo ↔ productos
// =====================================================================

static int make_group(const char* name) {
    Group g; g.external_code = name; g.name = name;
    return create_group(g).id;
}
static int make_researcher(const char* code) {
    Researcher r; r.external_code = code; r.first_names = code; r.last_names = "Test";
    return create_researcher(r).id;
}
static int make_product(const char* code) {
    Product p; p.external_code = code; p.title = code;
    return create_product(p).id;
}

// Enlazar integrantes, recorrido grupo→integrantes, dedupe y desenlace.
static void test_multilista_enlaces_integrantes() {
    int g  = make_group("G");
    int r1 = make_researcher("R1");
    int r2 = make_researcher("R2");

    CHECK(add_member_to_group(g, r1) != nullptr, "enlazar R1 devuelve nodo");
    CHECK(add_member_to_group(g, r2) != nullptr, "enlazar R2 devuelve nodo");

    auto members = members_of_group(g);
    CHECK(members.size() == 2, "recorrido grupo→integrantes: 2 miembros");

    // Dedupe: enlazar dos veces el mismo par no duplica el nodo.
    add_member_to_group(g, r1);
    CHECK(members_of_group(g).size() == 2, "enlace duplicado no crea nodo nuevo");

    // Enlace a grupo inexistente.
    CHECK(add_member_to_group(999999, r1) == nullptr, "enlazar a grupo inexistente devuelve null");

    // Desenlace.
    CHECK(remove_member_from_group(g, r1), "desenlazar R1 devuelve true");
    members = members_of_group(g);
    CHECK(members.size() == 1 && members[0] == r2, "solo queda R2 tras el desenlace");
    CHECK(!remove_member_from_group(g, r1), "desenlazar de nuevo devuelve false");
}

// Recorrido inverso de la multilista: investigador→grupos.
static void test_multilista_recorrido_investigador_a_grupos() {
    int g1 = make_group("G1");
    int g2 = make_group("G2");
    int g3 = make_group("G3");
    int r  = make_researcher("R");

    add_member_to_group(g1, r);
    add_member_to_group(g2, r);
    // g3 queda sin enlazar a propósito.

    auto groups = groups_of_researcher(r);
    CHECK(groups.size() == 2, "investigador→grupos: pertenece a 2 grupos");
    bool has_g1 = false, has_g2 = false, has_g3 = false;
    for (int id : groups) {
        if (id == g1) has_g1 = true;
        if (id == g2) has_g2 = true;
        if (id == g3) has_g3 = true;
    }
    CHECK(has_g1 && has_g2 && !has_g3, "el recorrido devuelve exactamente G1 y G2");
}

// Enlaces grupo→productos y liberación en cascada al eliminar el grupo.
static void test_multilista_enlaces_productos_y_cascada() {
    int g  = make_group("G");
    int p1 = make_product("P1");
    int p2 = make_product("P2");

    CHECK(link_product_to_group(g, p1) != nullptr, "enlazar P1 devuelve nodo");
    CHECK(link_product_to_group(g, p2) != nullptr, "enlazar P2 devuelve nodo");
    CHECK(products_of_group(g).size() == 2, "recorrido grupo→productos: 2 enlaces");
    CHECK(total_product_links() == 2, "total de enlaces = 2");

    // Dedupe.
    link_product_to_group(g, p1);
    CHECK(products_of_group(g).size() == 2, "enlace de producto duplicado no duplica nodo");

    // Cascada: eliminar el grupo libera su cadena de enlaces,
    // pero los productos (lista independiente) sobreviven.
    CHECK(delete_group(g), "eliminar el grupo devuelve true");
    CHECK(total_product_links() == 0, "los enlaces se liberan en cascada");
    CHECK(get_product(p1).has_value() && get_product(p2).has_value(),
          "los productos sobreviven a la eliminación del grupo");
    CHECK(unlink_product_from_group(g, p2) == false, "desenlazar de grupo eliminado devuelve false");
}

// =====================================================================
//  PILA (LIFO) — pila de operaciones y reversión real (undo_perform)
// =====================================================================

static void push_op(const std::string& type, const std::string& etype,
                    int id, const std::string& prev = "") {
    UndoOperation op;
    op.operation_type = type;
    op.entity_type    = etype;
    op.entity_id      = id;
    op.previous_state = prev;
    undo_push(op);
}

// push / top / pop respetan el orden LIFO; pop de pila vacía es seguro.
static void test_pila_push_top_pop_lifo() {
    CHECK(undo_size() == 0, "la pila inicia vacía");
    CHECK(!undo_top().has_value(), "top de pila vacía devuelve vacío");
    CHECK(!undo_pop().has_value(), "pop de pila vacía devuelve vacío");

    push_op("CREATE", "Group", 1);
    push_op("DELETE", "Group", 2);
    CHECK(undo_size() == 2, "dos push → tamaño 2");
    CHECK(undo_top()->operation_type == "DELETE", "top muestra el último push (LIFO)");

    auto popped = undo_pop();
    CHECK(popped->operation_type == "DELETE", "pop extrae el último push");
    CHECK(undo_top()->operation_type == "CREATE", "el siguiente es el primero insertado");
    undo_pop();
    CHECK(undo_size() == 0, "la pila queda vacía tras dos pop");
}

// undo_perform de CREATE: la entidad creada desaparece (antes/después).
static void test_pila_undo_create() {
    int gid = make_group("Des hacedor");
    push_op("CREATE", "Group", gid);
    CHECK(get_group(gid).has_value(), "ANTES: el grupo existe");

    CHECK(undo_perform(), "undo_perform devuelve true");
    CHECK(!get_group(gid).has_value(), "DESPUÉS: el grupo fue eliminado");
    CHECK(undo_size() == 0, "la operación se extrajo de la pila");
}

// undo_perform de DELETE: la entidad se restaura con su id original.
static void test_pila_undo_delete() {
    int gid = make_group("Resucitable");
    push_op("DELETE", "Group", gid, undo_snapshot_group(*get_group(gid)));
    delete_group(gid);
    CHECK(!get_group(gid).has_value(), "ANTES: el grupo fue eliminado");

    CHECK(undo_perform(), "undo_perform devuelve true");
    auto restored = get_group(gid);
    CHECK(restored.has_value(), "DESPUÉS: el grupo existe de nuevo");
    CHECK(restored->name == "Resucitable", "se restauró con los datos originales");
}

// undo_perform de UPDATE: los campos capturados vuelven al estado previo.
static void test_pila_undo_update() {
    int gid = make_group("Nombre Viejo");
    push_op("UPDATE", "Group", gid, undo_snapshot_group(*get_group(gid)));

    Group upd = *get_group(gid);
    upd.name = "Nombre Nuevo";
    update_group(gid, upd);
    CHECK(get_group(gid)->name == "Nombre Nuevo", "ANTES: el cambio se aplicó");

    CHECK(undo_perform(), "undo_perform devuelve true");
    CHECK(get_group(gid)->name == "Nombre Viejo", "DESPUÉS: el nombre volvió al valor previo");
}

// undo_perform de LINK_MEMBER / UNLINK_MEMBER sobre la multilista.
static void test_pila_undo_enlaces() {
    int g = make_group("G");
    int r = make_researcher("R");

    add_member_to_group(g, r);
    push_op("LINK_MEMBER", "GroupMembership", g, std::to_string(g) + ":" + std::to_string(r));
    CHECK(members_of_group(g).size() == 1, "ANTES: el integrante está enlazado");
    CHECK(undo_perform(), "undo de LINK_MEMBER devuelve true");
    CHECK(members_of_group(g).empty(), "DESPUÉS: el enlace fue removido");

    // Y el inverso: deshacer un UNLINK restaura el enlace.
    remove_member_from_group(g, r);  // ya estaba removido; lo enlazamos y desenlazamos de verdad
    add_member_to_group(g, r);
    remove_member_from_group(g, r);
    push_op("UNLINK_MEMBER", "GroupMembership", g, std::to_string(g) + ":" + std::to_string(r));
    CHECK(members_of_group(g).empty(), "ANTES: el integrante está desenlazado");
    CHECK(undo_perform(), "undo de UNLINK_MEMBER devuelve true");
    CHECK(members_of_group(g).size() == 1, "DESPUÉS: el enlace fue restaurado");
}

// undo_perform de VALIDATE: el estado de validación del producto se revierte.
static void test_pila_undo_validate() {
    int pid = make_product("P");
    {
        Product cur = *get_product(pid);
        cur.validation_status = "pending";
        update_product(pid, cur);
    }
    push_op("VALIDATE", "Product", pid, "pending");
    {
        Product cur = *get_product(pid);
        cur.validation_status = "valid";
        update_product(pid, cur);
    }
    CHECK(get_product(pid)->validation_status == "valid", "ANTES: producto validado");

    CHECK(undo_perform(), "undo_perform devuelve true");
    CHECK(get_product(pid)->validation_status == "pending", "DESPUÉS: vuelve a pendiente");
}

// =====================================================================
//  COLA (FIFO) — cola de validación
// =====================================================================

static void enqueue_product(int pid) {
    ValidationQueueItem it;
    it.product_id = pid;
    vq_enqueue(it);
}

// enqueue / front / dequeue respetan el orden de llegada (FIFO).
static void test_cola_fifo_orden_de_llegada() {
    CHECK(vq_size() == 0, "la cola inicia vacía");
    CHECK(!vq_front().has_value(), "front de cola vacía devuelve vacío");
    CHECK(!vq_dequeue().has_value(), "dequeue de cola vacía devuelve vacío");

    enqueue_product(10);
    enqueue_product(20);
    enqueue_product(30);
    CHECK(vq_size() == 3, "tres enqueue → tamaño 3");
    CHECK(vq_pending_count() == 3, "tres pendientes");

    CHECK(vq_front()->product_id == 10, "front muestra el primero en llegar");
    CHECK(vq_size() == 3, "front no extrae (la cola sigue en 3)");

    CHECK(vq_dequeue()->product_id == 10, "dequeue 1: sale el primero (FIFO)");
    CHECK(vq_dequeue()->product_id == 20, "dequeue 2: sale el segundo");
    CHECK(vq_dequeue()->product_id == 30, "dequeue 3: sale el tercero");
    CHECK(vq_size() == 0 && vq_pending_count() == 0, "la cola queda vacía");
}

// vq_clear vacía la cola por completo.
static void test_cola_clear() {
    enqueue_product(1);
    enqueue_product(2);
    vq_clear();
    CHECK(vq_size() == 0, "clear deja la cola vacía");
    CHECK(!vq_front().has_value(), "front tras clear devuelve vacío");
}

// =====================================================================
//  PERSISTENCIA — round-trip JSON (exportar → limpiar → cargar)
// =====================================================================

static void test_persistencia_json_roundtrip() {
    const std::string path = "pea_test_roundtrip.json";

    int g  = make_group("Grupo RT");
    int r  = make_researcher("R-RT");
    int p  = make_product("P-RT");
    add_member_to_group(g, r);
    link_product_to_group(g, p);
    enqueue_product(p);
    push_op("CREATE", "Group", g);

    CHECK(export_to_file(path), "export_to_file devuelve true");

    reset_state();
    CHECK(list_groups().empty() && vq_size() == 0 && undo_size() == 0,
          "el estado quedó vacío antes de cargar");

    CHECK(load_from_file(path), "load_from_file devuelve true");
    CHECK(list_groups().size() == 1 && list_groups()[0].name == "Grupo RT",
          "el grupo se restauró con sus datos");
    CHECK(list_researchers().size() == 1, "el investigador se restauró");
    CHECK(list_products().size() == 1, "el producto se restauró");
    CHECK(members_of_group(g).size() == 1, "la vinculación se restauró");
    CHECK(products_of_group(g).size() == 1, "el enlace producto se restauró");
    CHECK(vq_pending_count() == 1, "la cola se restauró");
    CHECK(undo_size() == 1 && undo_top()->operation_type == "CREATE",
          "la pila se restauró en orden LIFO");

    std::remove(path.c_str());
}

int main() {
    std::cout << "===== Pruebas de estructuras — sección 41.1 =====\n\n";
    std::cout << "--- LISTA (grupos) ---\n";
    RUN_TEST(test_lista_insertar_vacia_y_final);
    RUN_TEST(test_lista_buscar);
    RUN_TEST(test_lista_modificar_y_desactivar);
    RUN_TEST(test_lista_eliminar_primero_intermedio_ultimo);

    std::cout << "\n--- MULTILISTA (grupo ↔ integrantes / productos) ---\n";
    RUN_TEST(test_multilista_enlaces_integrantes);
    RUN_TEST(test_multilista_recorrido_investigador_a_grupos);
    RUN_TEST(test_multilista_enlaces_productos_y_cascada);

    std::cout << "\n--- PILA (LIFO de operaciones) ---\n";
    RUN_TEST(test_pila_push_top_pop_lifo);
    RUN_TEST(test_pila_undo_create);
    RUN_TEST(test_pila_undo_delete);
    RUN_TEST(test_pila_undo_update);
    RUN_TEST(test_pila_undo_enlaces);
    RUN_TEST(test_pila_undo_validate);

    std::cout << "\n--- COLA (FIFO de validación) ---\n";
    RUN_TEST(test_cola_fifo_orden_de_llegada);
    RUN_TEST(test_cola_clear);

    std::cout << "\n--- PERSISTENCIA (round-trip JSON) ---\n";
    RUN_TEST(test_persistencia_json_roundtrip);

    std::cout << "\n===== Resultado: " << g_passed << " OK, "
              << g_failed << " fallas =====\n";
    return g_failed == 0 ? 0 : 1;
}
