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
    for (const auto& p : list_projects())    delete_project(p.id);
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

// Leer y actualizar detalles de membresía, y undo de UPDATE_MEMBERSHIP.
static void test_multilista_membresia_detalles() {
    int g = make_group("G");
    int r = make_researcher("R");

    // Add with details
    add_member_to_group(g, r, "Director", "2020", "2024");
    auto det = membership_details(g, r);
    CHECK(det.has_value() && det->role == "Director", "los detalles se guardan en el nodo");

    // Update
    UndoOperation op;
    op.operation_type = "UPDATE_MEMBERSHIP";
    op.entity_type = "GroupMembership";
    op.entity_id = det->membershipId;
    op.previous_state = std::to_string(g) + ":" + std::to_string(r) + "\x1f" "Director" "\x1f" "2020" "\x1f" "2024";
    undo_push(op);
    update_membership(g, r, "Asesor", "2021", "2025");
    auto det2 = membership_details(g, r);
    CHECK(det2->role == "Asesor", "el update cambia el rol en RAM");

    // Undo
    CHECK(undo_perform(), "undo de UPDATE_MEMBERSHIP devuelve true");
    auto det3 = membership_details(g, r);
    CHECK(det3->role == "Director", "undo restaura el rol previo");
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
//  PLANES DE TRABAJO (T-08) — multilista Grupo → planes
// =====================================================================

static int make_plan(int gid, const char* title) {
    WorkPlan wp; wp.group_id = gid; wp.title = title;
    return create_work_plan(wp).id;
}

// CRUD sobre la cadena de planes del grupo.
static void test_planes_crud() {
    int g = make_group("G");

    int p1 = make_plan(g, "Plan 2024");
    int p2 = make_plan(g, "Plan 2025");
    CHECK(p1 > 0 && p2 > 0 && p1 != p2, "crear dos planes asigna ids distintos");
    CHECK(plans_of_group(g).size() == 2, "recorrido grupo→planes: 2 planes");
    CHECK(total_work_plans() == 2, "total de planes = 2");

    // Crear en grupo inexistente falla sin crear nada.
    WorkPlan bad; bad.group_id = 999999; bad.title = "Huérfano";
    CHECK(create_work_plan(bad).id == 0, "crear en grupo inexistente devuelve id 0");
    CHECK(total_work_plans() == 2, "no se creó el plan huérfano");

    // Consultar / modificar / desactivar.
    auto found = get_work_plan(p1);
    CHECK(found.has_value() && found->title == "Plan 2024", "get_work_plan encuentra el plan");
    WorkPlan upd = *found;
    upd.title = "Plan 2024 (rev)";
    upd.status = "inactive";
    CHECK(update_work_plan(p1, upd), "update_work_plan devuelve true");
    CHECK(get_work_plan(p1)->title == "Plan 2024 (rev)", "el título quedó modificado");
    CHECK(get_work_plan(p1)->status == "inactive", "el plan quedó desactivado");

    // Eliminar.
    CHECK(delete_work_plan(p2), "delete_work_plan devuelve true");
    CHECK(plans_of_group(g).size() == 1, "queda 1 plan tras eliminar");
    CHECK(!delete_work_plan(p2), "eliminar de nuevo devuelve false");
}

// Cascada: eliminar el grupo libera su cadena de planes.
static void test_planes_cascada_al_eliminar_grupo() {
    int g = make_group("G");
    make_plan(g, "P1");
    make_plan(g, "P2");
    CHECK(total_work_plans() == 2, "ANTES: 2 planes");

    CHECK(delete_group(g), "eliminar el grupo devuelve true");
    CHECK(total_work_plans() == 0, "los planes se liberan en cascada");
}

// Undo de CREATE/UPDATE/DELETE sobre planes (pila LIFO).
static void test_planes_undo() {
    int g = make_group("G");

    // CREATE → undo elimina el plan.
    int pid = make_plan(g, "Plan Nuevo");
    push_op("CREATE", "WorkPlan", pid);
    CHECK(undo_perform(), "undo de CREATE devuelve true");
    CHECK(!get_work_plan(pid).has_value(), "DESPUÉS: el plan fue eliminado");

    // UPDATE → undo restaura los campos previos.
    pid = make_plan(g, "Título Viejo");
    push_op("UPDATE", "WorkPlan", pid, undo_snapshot_work_plan(*get_work_plan(pid)));
    WorkPlan upd = *get_work_plan(pid);
    upd.title = "Título Nuevo";
    update_work_plan(pid, upd);
    CHECK(get_work_plan(pid)->title == "Título Nuevo", "ANTES: el cambio se aplicó");
    CHECK(undo_perform(), "undo de UPDATE devuelve true");
    CHECK(get_work_plan(pid)->title == "Título Viejo", "DESPUÉS: el título volvió al valor previo");

    // DELETE → undo re-crea el plan con su id original.
    push_op("DELETE", "WorkPlan", pid, undo_snapshot_work_plan(*get_work_plan(pid)));
    delete_work_plan(pid);
    CHECK(!get_work_plan(pid).has_value(), "ANTES: el plan fue eliminado");
    CHECK(undo_perform(), "undo de DELETE devuelve true");
    CHECK(get_work_plan(pid).has_value() && get_work_plan(pid)->title == "Título Viejo",
          "DESPUÉS: el plan fue restaurado con sus datos");
}

// =====================================================================
//  PROYECTOS (Req. 3) — lista global + multilista Grupo → proyectos
// =====================================================================

static int make_project(const char* title) {
    Project p; p.title = title;
    return create_project(p).id;
}

// CRUD standalone sobre la lista global de proyectos.
static void test_proyectos_crud() {
    int p1 = make_project("Proyecto A");
    int p2 = make_project("Proyecto B");
    CHECK(p1 > 0 && p2 > 0 && p1 != p2, "crear dos proyectos asigna ids distintos");
    CHECK(list_projects().size() == 2, "la lista global tiene 2 proyectos");
    CHECK(total_projects() == 2, "total de proyectos = 2");

    auto found = get_project(p1);
    CHECK(found.has_value() && found->title == "Proyecto A", "get_project encuentra el proyecto");
    CHECK(found->status == "active", "status por defecto es active");

    Project upd = *found;
    upd.title = "Proyecto A (rev)";
    upd.status = "inactive";
    upd.budget = 1500.5;
    CHECK(update_project(p1, upd), "update_project devuelve true");
    CHECK(get_project(p1)->title == "Proyecto A (rev)", "el título quedó modificado");
    CHECK(get_project(p1)->status == "inactive", "el proyecto quedó desactivado");
    CHECK(get_project(p1)->budget == 1500.5, "el presupuesto quedó actualizado");

    CHECK(delete_project(p2), "delete_project devuelve true");
    CHECK(total_projects() == 1, "queda 1 proyecto tras eliminar");
    CHECK(!delete_project(p2), "eliminar de nuevo devuelve false");
}

// Enlaces multilista Grupo <-> Proyecto y cascadas.
static void test_proyectos_enlaces_y_cascada() {
    int g1 = make_group("G1");
    int g2 = make_group("G2");
    int p  = make_project("Proyecto multi-grupo");

    CHECK(link_project_to_group(g1, p) != nullptr, "enlazar a g1 devuelve nodo");
    CHECK(link_project_to_group(g2, p) != nullptr, "el mismo proyecto enlaza a g2");
    CHECK(link_project_to_group(g1, p) != nullptr, "re-enlazar no duplica (devuelve el nodo)");
    CHECK(projects_of_group(g1).size() == 1, "g1 tiene 1 proyecto (sin duplicar)");
    CHECK(groups_of_project(p).size() == 2, "el proyecto aparece en 2 grupos");
    CHECK(total_project_links() == 2, "2 enlaces en total");

    // Enlace a grupo o proyecto inexistente falla.
    CHECK(link_project_to_group(999999, p) == nullptr, "enlazar a grupo inexistente devuelve null");
    CHECK(link_project_to_group(g1, 999999) == nullptr, "enlazar proyecto inexistente devuelve null");

    // Desenlazar.
    CHECK(unlink_project_from_group(g2, p), "desenlazar de g2 devuelve true");
    CHECK(groups_of_project(p).size() == 1, "el proyecto queda solo en g1");

    // Cascada: eliminar el proyecto limpia la cadena del grupo.
    CHECK(delete_project(p), "eliminar el proyecto devuelve true");
    CHECK(projects_of_group(g1).empty(), "la cadena de g1 quedó vacía en cascada");
}

// Undo de CREATE/UPDATE/DELETE/LINK/UNLINK sobre proyectos.
static void test_proyectos_undo() {
    int g = make_group("G");

    // CREATE → undo elimina el proyecto.
    int pid = make_project("Proyecto Nuevo");
    push_op("CREATE", "Project", pid);
    CHECK(undo_perform(), "undo de CREATE devuelve true");
    CHECK(!get_project(pid).has_value(), "DESPUÉS: el proyecto fue eliminado");

    // UPDATE → undo restaura los campos previos.
    pid = make_project("Título Viejo");
    push_op("UPDATE", "Project", pid, undo_snapshot_project(*get_project(pid)));
    Project upd = *get_project(pid);
    upd.title = "Título Nuevo";
    update_project(pid, upd);
    CHECK(get_project(pid)->title == "Título Nuevo", "ANTES: el cambio se aplicó");
    CHECK(undo_perform(), "undo de UPDATE devuelve true");
    CHECK(get_project(pid)->title == "Título Viejo", "DESPUÉS: el título volvió al valor previo");

    // DELETE → undo re-crea el proyecto con su id original.
    push_op("DELETE", "Project", pid, undo_snapshot_project(*get_project(pid)));
    delete_project(pid);
    CHECK(!get_project(pid).has_value(), "ANTES: el proyecto fue eliminado");
    CHECK(undo_perform(), "undo de DELETE devuelve true");
    CHECK(get_project(pid).has_value() && get_project(pid)->title == "Título Viejo",
          "DESPUÉS: el proyecto fue restaurado con sus datos");

    // LINK_PROJECT → undo quita el enlace.
    CHECK(link_project_to_group(g, pid) != nullptr, "ANTES: enlace creado");
    push_op("LINK_PROJECT", "Project", pid, std::to_string(g) + ":" + std::to_string(pid));
    CHECK(undo_perform(), "undo de LINK_PROJECT devuelve true");
    CHECK(projects_of_group(g).empty(), "DESPUÉS: el enlace fue removido");

    // UNLINK_PROJECT → undo re-crea el enlace.
    CHECK(link_project_to_group(g, pid) != nullptr, "ANTES: enlace re-creado");
    push_op("UNLINK_PROJECT", "Project", pid, std::to_string(g) + ":" + std::to_string(pid));
    CHECK(unlink_project_from_group(g, pid), "ANTES: enlace quitado");
    CHECK(undo_perform(), "undo de UNLINK_PROJECT devuelve true");
    CHECK(projects_of_group(g).size() == 1, "DESPUÉS: el enlace fue restaurado");
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
    int pj = make_project("Proyecto RT");
    link_project_to_group(g, pj);
    make_plan(g, "Plan RT");
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
    CHECK(list_projects().size() == 1 && list_projects()[0].title == "Proyecto RT",
          "el proyecto se restauró");
    CHECK(projects_of_group(g).size() == 1, "el enlace proyecto se restauró");
    CHECK(plans_of_group(g).size() == 1 && plans_of_group(g)[0].title == "Plan RT",
          "el plan de trabajo se restauró");
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
    RUN_TEST(test_multilista_membresia_detalles);
    RUN_TEST(test_multilista_recorrido_investigador_a_grupos);
    RUN_TEST(test_multilista_enlaces_productos_y_cascada);

    std::cout << "\n--- PILA (LIFO de operaciones) ---\n";
    RUN_TEST(test_pila_push_top_pop_lifo);
    RUN_TEST(test_pila_undo_create);
    RUN_TEST(test_pila_undo_delete);
    RUN_TEST(test_pila_undo_update);
    RUN_TEST(test_pila_undo_enlaces);
    RUN_TEST(test_pila_undo_validate);

    std::cout << "\n--- PLANES DE TRABAJO (T-08) ---\n";
    RUN_TEST(test_planes_crud);
    RUN_TEST(test_planes_cascada_al_eliminar_grupo);
    RUN_TEST(test_planes_undo);

    std::cout << "\n--- PROYECTOS (Req. 3) ---\n";
    RUN_TEST(test_proyectos_crud);
    RUN_TEST(test_proyectos_enlaces_y_cascada);
    RUN_TEST(test_proyectos_undo);

    std::cout << "\n--- COLA (FIFO de validación) ---\n";
    RUN_TEST(test_cola_fifo_orden_de_llegada);
    RUN_TEST(test_cola_clear);

    std::cout << "\n--- PERSISTENCIA (round-trip JSON) ---\n";
    RUN_TEST(test_persistencia_json_roundtrip);

    std::cout << "\n===== Resultado: " << g_passed << " OK, "
              << g_failed << " fallas =====\n";
    return g_failed == 0 ? 0 : 1;
}
