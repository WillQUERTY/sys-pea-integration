// core_cpp/src/cli/cli_helpers.cpp
#include "cli_helpers.h"
#include <iostream>
#include <algorithm>
#include <chrono>

namespace peai::cli {

void usage() {
    std::cout
        << "Khemia CLI  (Taller 2 - Estructura de Datos)\n"
        << "=============================================\n\n"
        << "Usage: pea_cli <command> [subcommand] [args...]\n\n"
        << "Resumen:\n"
        << "  summary                             Tablas y números del estado (Req. 12a)\n\n"
        << "Grupos (lista enlazada):\n"
        << "  groups   list                       Recorrer la lista de grupos\n"
        << "  groups   show   <id>                 Buscar un grupo\n"
        << "  groups   add    <code> <name> [acronym]   Crear (push a la pila)\n"
        << "  groups   update <id> <name>          Modificar (push a la pila)\n"
        << "  groups   delete <id>                Eliminar (push a la pila)\n\n"
        << "Investigadores (lista enlazada):\n"
        << "  researchers list\n"
        << "  researchers show   <id>\n"
        << "  researchers add    <code> <first_names> <last_names>\n"
        << "  researchers update <id> <first_names> <last_names>\n"
        << "  researchers delete <id>\n\n"
        << "Vinculaciones (multilista):\n"
        << "  members  add    <gid> <rid>         Enlazar investigador a grupo\n"
        << "  members  list   <gid>               Recorrer integrantes del grupo\n"
        << "  members  remove <gid> <rid>         Desenlazar\n\n"
        << "Productos (lista + multilista):\n"
        << "  products all                       Recorrer la lista completa\n"
        << "  products add    <code> <title> [year]\n"
        << "  products update <id> <title> [year]\n"
        << "  products delete <id>\n"
        << "  products list   <gid>               Productos del grupo (multilista)\n"
        << "  products link   <gid> <pid>         Asociar producto a grupo\n"
        << "  products unlink <gid> <pid>         Desasociar\n"
        << "  products by-year <start> <end>      Ventana de observación (Req. 10)\n"
        << "  products by-year last <N>           Últimos N años\n\n"
        << "Planes de trabajo (multilista Grupo → planes):\n"
        << "  plans    list   <gid>               Planes del grupo\n"
        << "  plans    add    <gid> <title> [start] [end]   Crear plan\n"
        << "  plans    update <id> <title>          Modificar (push a la pila)\n"
        << "  plans    delete <id>                Eliminar (push a la pila)\n\n"
        << "Proyectos (lista global + multilista Grupo → proyectos):\n"
        << "  projects all                        Recorrer la lista completa\n"
        << "  projects add    <title> [type] [start] [end]   Crear proyecto\n"
        << "  projects update <id> <title>          Modificar (push a la pila)\n"
        << "  projects delete <id>                Eliminar (push a la pila)\n"
        << "  projects list   <gid>               Proyectos del grupo (multilista)\n"
        << "  projects link   <gid> <pid>         Asociar proyecto a grupo\n"
        << "  projects unlink <gid> <pid>         Desasociar\n\n"
        << "Cola de validación (FIFO):\n"
        << "  queue    list                       Ver la cola en orden de llegada\n"
        << "  queue    enqueue <pid>              Encolar producto\n"
        << "  queue    process                    Desencolar y validar el primero\n\n"
        << "Pila de operaciones (LIFO):\n"
        << "  history  list                       Ver la pila (toque primero)\n"
        << "  history  top                        Inspeccionar la cima sin extraer\n"
        << "  history  undo                       Deshacer la última operación\n"
        << "  history  clear                      Vaciar la pila\n\n"
        << "Estructuras (evidencia de recorridos):\n"
        << "  structures groups                  Lista de grupos con punteros\n"
        << "  structures multilist <gid>          Recorrido grupo → integrantes/productos\n"
        << "  structures products                 Lista de productos\n"
        << "  structures researchers               Lista de investigadores\n\n"
        << "Persistencia:\n"
        << "  load     <path>                     Cargar estado desde JSON\n"
        << "  export   <path>                     Exportar estado a JSON\n\n"
        << "  interactive                         Modo REPL";
}

void print_group(const Group& g) {
    std::cout << "  ID: " << g.id
              << "  | Code: " << g.external_code
              << "  | Name: " << g.name;
    if (!g.acronym.empty()) std::cout << "  | Acronym: " << g.acronym;
    std::cout << "  | " << g.status << "\n";
}

void print_researcher(const Researcher& r) {
    std::cout << "  ID: " << r.id
              << "  | Code: " << r.external_code
              << "  | " << r.first_names << " " << r.last_names;
    if (!r.institutional_email.empty()) std::cout << "  | " << r.institutional_email;
    std::cout << "  | " << r.status << "\n";
}

void print_product(const Product& p) {
    std::cout << "  ID: " << p.id
              << "  | Code: " << p.external_code
              << "  | " << p.title;
    if (p.year > 0) std::cout << "  | Año: " << p.year;
    else if (!p.obtained_date.empty()) std::cout << "  | Fecha: " << p.obtained_date;
    std::cout << "  | " << p.validation_status << "\n";
}

int product_year(const Product& p) {
    if (p.year != 0) return p.year;
    if (p.obtained_date.size() >= 4 &&
        p.obtained_date[0] >= '0' && p.obtained_date[0] <= '9') {
        try { return std::stoi(p.obtained_date.substr(0, 4)); } catch (...) {}
    }
    return 0;
}

int current_year() {
    auto ymd = std::chrono::year_month_day{std::chrono::sys_days{
        std::chrono::floor<std::chrono::days>(std::chrono::system_clock::now())}};
    return static_cast<int>(ymd.year());
}

void push_undo(const std::string& type, const std::string& etype,
               int entity_id, const std::string& prev) {
    UndoOperation op;
    op.operation_type = type;
    op.entity_type    = etype;
    op.entity_id      = entity_id;
    op.previous_state = prev;
    undo_push(op);
}

bool contains_id(const std::vector<int>& ids, int id) {
    return std::find(ids.begin(), ids.end(), id) != ids.end();
}

} // namespace peai::cli
