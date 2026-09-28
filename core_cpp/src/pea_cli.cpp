// core_cpp/src/pea_cli.cpp
// Command-line interface for the PEA-i core (solución C/C++ — decisión D-01).
//
// Usage (sección 34 de la especificación):
//   pea_cli summary                          Resumen en tablas y números
//   pea_cli groups list|show|add|update|delete
//   pea_cli researchers list|show|add|update|delete
//   pea_cli members add|list|remove <gid> <rid>
//   pea_cli products all|add|update|delete|list|link|unlink|by-year
//   pea_cli products by-year <start> <end>   Ventana de observación exacta
//   pea_cli products by-year last <N>        Últimos N años (Req. 10)
//   pea_cli queue list|enqueue <pid>|process Cola FIFO de validación
//   pea_cli history list|top|undo|clear      Pila LIFO de operaciones
//   pea_cli structures groups|multilist <gid>|products|researchers
//   pea_cli load <path> / export <path>      Persistencia JSON
//   pea_cli interactive                      REPL

#include "core.h"
#include <iostream>
#include <iomanip>
#include <string>
#include <vector>
#include <algorithm>
#include <chrono>
#include <cstring>

using namespace peai;

// ---- Helpers ----

static void usage() {
    std::cout
        << "PEA-i CLI  (Taller 2 - Estructura de Datos)\n"
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

static void print_group(const Group& g) {
    std::cout << "  ID: " << g.id
              << "  | Code: " << g.external_code
              << "  | Name: " << g.name;
    if (!g.acronym.empty()) std::cout << "  | Acronym: " << g.acronym;
    std::cout << "  | " << g.status << "\n";
}

static void print_researcher(const Researcher& r) {
    std::cout << "  ID: " << r.id
              << "  | Code: " << r.external_code
              << "  | " << r.first_names << " " << r.last_names;
    if (!r.institutional_email.empty()) std::cout << "  | " << r.institutional_email;
    std::cout << "  | " << r.status << "\n";
}

static void print_product(const Product& p) {
    std::cout << "  ID: " << p.id
              << "  | Code: " << p.external_code
              << "  | " << p.title;
    if (p.year > 0) std::cout << "  | Año: " << p.year;
    else if (!p.obtained_date.empty()) std::cout << "  | Fecha: " << p.obtained_date;
    std::cout << "  | " << p.validation_status << "\n";
}

// Year of a product: explicit year field, else parsed from obtained_date.
static int product_year(const Product& p) {
    if (p.year != 0) return p.year;
    if (p.obtained_date.size() >= 4 &&
        p.obtained_date[0] >= '0' && p.obtained_date[0] <= '9') {
        try { return std::stoi(p.obtained_date.substr(0, 4)); } catch (...) {}
    }
    return 0;
}

static int current_year() {
    auto ymd = std::chrono::year_month_day{std::chrono::sys_days{
        std::chrono::floor<std::chrono::days>(std::chrono::system_clock::now())}};
    return static_cast<int>(ymd.year());
}

// Push an operation onto the undo stack (pila LIFO — Req. T-16).
static void push_undo(const std::string& type, const std::string& etype,
                      int entity_id, const std::string& prev = "") {
    UndoOperation op;
    op.operation_type = type;
    op.entity_type    = etype;
    op.entity_id      = entity_id;
    op.previous_state = prev;
    undo_push(op);
}

static bool contains_id(const std::vector<int>& ids, int id) {
    return std::find(ids.begin(), ids.end(), id) != ids.end();
}

// Forward declaration: process a single command (returns 0 on success)
static int dispatch(int argc, char* argv[]);

// ---- Interactive REPL ----
static int interactive_mode() {
    std::cout << "PEA-i CLI  (modo interactivo)\n";
    std::cout << "Escribe comandos como: groups add G01 \"Grupo Alpha\"\n";
    std::cout << "Escribe 'exit' o 'quit' para salir.\n\n";

    std::string line;
    while (true) {
        std::cout << "pea> ";
        if (!std::getline(std::cin, line)) break;
        if (line.empty()) continue;
        if (line == "exit" || line == "quit") break;

        // Tokenize the line (simple split by spaces, respecting quotes)
        std::vector<std::string> tokens;
        std::string token;
        bool in_quote = false;
        for (char c : line) {
            if (c == '"') { in_quote = !in_quote; continue; }
            if (c == ' ' && !in_quote) {
                if (!token.empty()) { tokens.push_back(token); token.clear(); }
            } else {
                token += c;
            }
        }
        if (!token.empty()) tokens.push_back(token);
        if (tokens.empty()) continue;

        // Build argc/argv for dispatch
        std::vector<char*> args;
        std::string prog = "pea_cli";
        args.push_back(prog.data());
        for (auto& t : tokens) args.push_back(t.data());

        dispatch(static_cast<int>(args.size()), args.data());
        std::cout << "\n";
    }
    return 0;
}

// ---- Main ----

int main(int argc, char* argv[]) {
    if (argc < 2) {
        usage();
        return 1;
    }

    std::string cmd = argv[1];
    if (cmd == "interactive" || cmd == "i") {
        return interactive_mode();
    }

    return dispatch(argc, argv);
}

// ---- Command dispatch (one-shot) ----

static int dispatch(int argc, char* argv[]) {
    if (argc < 2) {
        usage();
        return 1;
    }

    std::string cmd = argv[1];

    // ---- groups ----
    if (cmd == "groups") {
        if (argc < 3) { usage(); return 1; }
        std::string sub = argv[2];

        if (sub == "list") {
            auto groups = list_groups();
            if (groups.empty()) {
                std::cout << "(no groups)\n";
            } else {
                for (const auto& g : groups) print_group(g);
            }
            return 0;
        }

        if (sub == "show") {
            if (argc < 4) { std::cerr << "Provide group id\n"; return 1; }
            int id = std::stoi(argv[3]);
            auto opt = get_group(id);
            if (opt) print_group(*opt);
            else     std::cerr << "Group " << id << " not found\n";
            return 0;
        }

        if (sub == "add") {
            if (argc < 5) { std::cerr << "Provide external_code and name\n"; return 1; }
            Group proto;
            proto.id = 0;
            proto.external_code = argv[3];
            proto.name = argv[4];
            if (argc >= 6) proto.acronym = argv[5];
            Group created = create_group(proto);
            push_undo("CREATE", "Group", created.id);
            std::cout << "Created group with ID " << created.id
                      << " (operación apilada: history undo la elimina)\n";
            return 0;
        }

        if (sub == "update") {
            if (argc < 5) { std::cerr << "Provide group id and new name\n"; return 1; }
            int id = std::stoi(argv[3]);
            auto prev = get_group(id);
            if (!prev) { std::cerr << "Group " << id << " not found\n"; return 1; }
            Group updates = *prev;
            updates.name = argv[4];
            push_undo("UPDATE", "Group", id, undo_snapshot_group(*prev));
            if (update_group(id, updates))
                std::cout << "Group " << id << " updated (operación apilada)\n";
            else
                std::cerr << "Update failed\n";
            return 0;
        }

        if (sub == "delete") {
            if (argc < 4) { std::cerr << "Provide group id\n"; return 1; }
            int id = std::stoi(argv[3]);
            auto prev = get_group(id);
            if (!prev) { std::cerr << "Group " << id << " not found\n"; return 1; }
            push_undo("DELETE", "Group", id, undo_snapshot_group(*prev));
            if (delete_group(id)) std::cout << "Deleted group " << id << " (operación apilada)\n";
            else                  std::cerr << "Delete failed\n";
            return 0;
        }
    }

    // ---- researchers ----
    if (cmd == "researchers") {
        if (argc < 3) { usage(); return 1; }
        std::string sub = argv[2];

        if (sub == "list") {
            auto res = list_researchers();
            if (res.empty()) {
                std::cout << "(no researchers)\n";
            } else {
                for (const auto& r : res) print_researcher(r);
            }
            return 0;
        }

        if (sub == "show") {
            if (argc < 4) { std::cerr << "Provide researcher id\n"; return 1; }
            int id = std::stoi(argv[3]);
            auto opt = get_researcher(id);
            if (opt) print_researcher(*opt);
            else     std::cerr << "Researcher " << id << " not found\n";
            return 0;
        }

        if (sub == "add") {
            if (argc < 6) { std::cerr << "Provide code, first_names and last_names\n"; return 1; }
            Researcher proto;
            proto.external_code = argv[3];
            proto.first_names = argv[4];
            proto.last_names = argv[5];
            Researcher created = create_researcher(proto);
            push_undo("CREATE", "Researcher", created.id);
            std::cout << "Created researcher with ID " << created.id
                      << " (operación apilada)\n";
            return 0;
        }

        if (sub == "update") {
            if (argc < 6) { std::cerr << "Provide id, first_names and last_names\n"; return 1; }
            int id = std::stoi(argv[3]);
            auto prev = get_researcher(id);
            if (!prev) { std::cerr << "Researcher " << id << " not found\n"; return 1; }
            Researcher updates = *prev;
            updates.first_names = argv[4];
            updates.last_names = argv[5];
            push_undo("UPDATE", "Researcher", id, undo_snapshot_researcher(*prev));
            if (update_researcher(id, updates))
                std::cout << "Researcher " << id << " updated (operación apilada)\n";
            else
                std::cerr << "Update failed\n";
            return 0;
        }

        if (sub == "delete") {
            if (argc < 4) { std::cerr << "Provide researcher id\n"; return 1; }
            int id = std::stoi(argv[3]);
            auto prev = get_researcher(id);
            if (!prev) { std::cerr << "Researcher " << id << " not found\n"; return 1; }
            push_undo("DELETE", "Researcher", id, undo_snapshot_researcher(*prev));
            if (delete_researcher(id)) std::cout << "Deleted researcher " << id << " (operación apilada)\n";
            else                       std::cerr << "Delete failed\n";
            return 0;
        }
    }

    // ---- members (multilista Group ↔ Researcher) ----
    if (cmd == "members") {
        if (argc < 3) { usage(); return 1; }
        std::string sub = argv[2];

        if (sub == "add") {
            if (argc < 5) { std::cerr << "Provide group_id and researcher_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            int rid = std::stoi(argv[4]);
            if (contains_id(members_of_group(gid), rid)) {
                std::cout << "Researcher " << rid << " already in group " << gid << "\n";
                return 0;
            }
            auto* node = add_member_to_group(gid, rid);
            if (node) {
                push_undo("LINK_MEMBER", "GroupMembership", gid,
                          std::to_string(gid) + ":" + std::to_string(rid));
                std::cout << "Researcher " << rid << " linked to group " << gid
                          << " (membership #" << node->data.membershipId << ", operación apilada)\n";
            } else {
                std::cerr << "Group " << gid << " not found\n";
            }
            return 0;
        }

        if (sub == "list") {
            if (argc < 4) { std::cerr << "Provide group_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            auto ids = members_of_group(gid);
            if (ids.empty()) {
                std::cout << "(no members in group " << gid << ")\n";
            } else {
                std::cout << "Researchers in group " << gid << ": ";
                for (int id : ids) std::cout << id << " ";
                std::cout << "\n";
            }
            return 0;
        }

        if (sub == "remove") {
            if (argc < 5) { std::cerr << "Provide group_id and researcher_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            int rid = std::stoi(argv[4]);
            if (remove_member_from_group(gid, rid)) {
                push_undo("UNLINK_MEMBER", "GroupMembership", gid,
                          std::to_string(gid) + ":" + std::to_string(rid));
                std::cout << "Removed researcher " << rid << " from group " << gid
                          << " (operación apilada)\n";
            } else {
                std::cerr << "Link not found\n";
            }
            return 0;
        }
    }

    // ---- products ----
    if (cmd == "products") {
        if (argc < 3) { usage(); return 1; }
        std::string sub = argv[2];

        if (sub == "all") {
            auto products = list_products();
            if (products.empty()) {
                std::cout << "(no products)\n";
            } else {
                std::cout << "Products (" << products.size() << "):\n";
                for (const auto& p : products) print_product(p);
            }
            return 0;
        }

        if (sub == "add") {
            if (argc < 5) { std::cerr << "Provide code and title\n"; return 1; }
            Product proto;
            proto.external_code = argv[3];
            proto.title = argv[4];
            if (argc >= 6) proto.year = std::stoi(argv[5]);
            Product created = create_product(proto);
            push_undo("CREATE", "Product", created.id);
            std::cout << "Created product with ID " << created.id
                      << " (operación apilada)\n";
            return 0;
        }

        if (sub == "update") {
            if (argc < 5) { std::cerr << "Provide id and title\n"; return 1; }
            int id = std::stoi(argv[3]);
            auto prev = get_product(id);
            if (!prev) { std::cerr << "Product " << id << " not found\n"; return 1; }
            Product updates = *prev;
            updates.title = argv[4];
            if (argc >= 6) updates.year = std::stoi(argv[5]);
            push_undo("UPDATE", "Product", id, undo_snapshot_product(*prev));
            if (update_product(id, updates))
                std::cout << "Product " << id << " updated (operación apilada)\n";
            else
                std::cerr << "Update failed\n";
            return 0;
        }

        if (sub == "delete") {
            if (argc < 4) { std::cerr << "Provide product id\n"; return 1; }
            int id = std::stoi(argv[3]);
            auto prev = get_product(id);
            if (!prev) { std::cerr << "Product " << id << " not found\n"; return 1; }
            push_undo("DELETE", "Product", id, undo_snapshot_product(*prev));
            if (delete_product(id)) std::cout << "Deleted product " << id << " (operación apilada)\n";
            else                    std::cerr << "Delete failed\n";
            return 0;
        }

        if (sub == "link") {
            if (argc < 5) { std::cerr << "Provide group_id and product_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            int pid = std::stoi(argv[4]);
            if (contains_id(products_of_group(gid), pid)) {
                std::cout << "Product " << pid << " already linked to group " << gid << "\n";
                return 0;
            }
            auto* node = link_product_to_group(gid, pid);
            if (node) {
                push_undo("LINK_PRODUCT", "GroupProductLink", gid,
                          std::to_string(gid) + ":" + std::to_string(pid));
                std::cout << "Product " << pid << " linked to group " << gid
                          << " (enlace #" << node->data.linkId << ", operación apilada)\n";
            } else {
                std::cerr << "Group " << gid << " not found\n";
            }
            return 0;
        }

        if (sub == "list") {
            if (argc < 4) { std::cerr << "Provide group_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            auto ids = products_of_group(gid);
            if (ids.empty()) {
                std::cout << "(no products in group " << gid << ")\n";
            } else {
                std::cout << "Products in group " << gid << " (" << ids.size() << "):\n";
                for (int id : ids) {
                    auto p = get_product(id);
                    if (p) print_product(*p);
                    else   std::cout << "  [product " << id << " not in memory]\n";
                }
            }
            return 0;
        }

        if (sub == "unlink") {
            if (argc < 5) { std::cerr << "Provide group_id and product_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            int pid = std::stoi(argv[4]);
            if (unlink_product_from_group(gid, pid)) {
                push_undo("UNLINK_PRODUCT", "GroupProductLink", gid,
                          std::to_string(gid) + ":" + std::to_string(pid));
                std::cout << "Product " << pid << " unlinked from group " << gid
                          << " (operación apilada)\n";
            } else {
                std::cerr << "Link not found\n";
            }
            return 0;
        }

        // products by-year <start> <end>   |   products by-year last <N>
        // Ventana de observación (Requerimiento 10) — usa la fecha de obtención.
        if (sub == "by-year") {
            if (argc < 5) {
                std::cerr << "Uso: products by-year <start> <end>  |  products by-year last <N>\n";
                return 1;
            }
            int start = 0, end = 0;
            if (std::string(argv[3]) == "last") {
                int n = std::stoi(argv[4]);
                if (n <= 0) { std::cerr << "N debe ser positivo\n"; return 1; }
                end = current_year();
                start = end - n;
            } else {
                start = std::stoi(argv[3]);
                end   = std::stoi(argv[4]);
            }
            if (start > end) std::swap(start, end);

            // Conteos por año dentro de la ventana.
            std::vector<std::pair<int,int>> per_year;  // (year, count)
            int in_window = 0, no_date = 0;
            for (const auto& p : list_products()) {
                int y = product_year(p);
                if (y == 0) { no_date++; continue; }
                if (y < start || y > end) continue;
                in_window++;
                auto it = std::find_if(per_year.begin(), per_year.end(),
                                       [y](const auto& kv) { return kv.first == y; });
                if (it != per_year.end()) it->second++;
                else per_year.push_back({y, 1});
            }
            std::sort(per_year.begin(), per_year.end());

            std::cout << "Ventana de observación: " << start << "-" << end
                      << " (año de obtención, Req. 10)\n";
            std::cout << "+------+-------+\n";
            std::cout << "| Año  | Total |\n";
            std::cout << "+------+-------+\n";
            for (const auto& [y, c] : per_year) {
                std::cout << "| " << std::setw(4) << y << " | " << std::setw(5) << c << " |\n";
            }
            std::cout << "+------+-------+\n";
            std::cout << "| Total productos en ventana: " << std::setw(6) << in_window << " |\n";
            if (no_date > 0)
                std::cout << "| Productos sin fecha válida: " << std::setw(7) << no_date << " |\n";
            std::cout << "+--------------------------------+\n";
            return 0;
        }
    }

    // ---- plans (multilista Grupo → planes de trabajo, T-08) ----
    if (cmd == "plans") {
        if (argc < 3) { usage(); return 1; }
        std::string sub = argv[2];

        if (sub == "list") {
            if (argc < 4) { std::cerr << "Provide group_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            auto plans = plans_of_group(gid);
            if (plans.empty()) {
                std::cout << "(no plans in group " << gid << ")\n";
            } else {
                std::cout << "Planes del grupo " << gid << " (" << plans.size() << "):\n";
                for (const auto& wp : plans) {
                    std::cout << "  ID: " << wp.id << "  | " << wp.title;
                    if (!wp.start_date.empty() || !wp.end_date.empty())
                        std::cout << "  | " << wp.start_date << " → " << wp.end_date;
                    std::cout << "  | " << wp.status << "\n";
                }
            }
            return 0;
        }

        if (sub == "add") {
            if (argc < 5) { std::cerr << "Provide group_id and title\n"; return 1; }
            WorkPlan proto;
            proto.group_id = std::stoi(argv[3]);
            proto.title    = argv[4];
            if (argc >= 6) proto.start_date = argv[5];
            if (argc >= 7) proto.end_date   = argv[6];
            WorkPlan created = create_work_plan(proto);
            if (created.id == 0) { std::cerr << "Group " << proto.group_id << " not found\n"; return 1; }
            push_undo("CREATE", "WorkPlan", created.id);
            std::cout << "Created work plan with ID " << created.id
                      << " in group " << created.group_id << " (operación apilada)\n";
            return 0;
        }

        if (sub == "update") {
            if (argc < 5) { std::cerr << "Provide plan id and new title\n"; return 1; }
            int id = std::stoi(argv[3]);
            auto prev = get_work_plan(id);
            if (!prev) { std::cerr << "Work plan " << id << " not found\n"; return 1; }
            WorkPlan updates = *prev;
            updates.title = argv[4];
            push_undo("UPDATE", "WorkPlan", id, undo_snapshot_work_plan(*prev));
            if (update_work_plan(id, updates))
                std::cout << "Work plan " << id << " updated (operación apilada)\n";
            else
                std::cerr << "Update failed\n";
            return 0;
        }

        if (sub == "delete") {
            if (argc < 4) { std::cerr << "Provide plan id\n"; return 1; }
            int id = std::stoi(argv[3]);
            auto prev = get_work_plan(id);
            if (!prev) { std::cerr << "Work plan " << id << " not found\n"; return 1; }
            push_undo("DELETE", "WorkPlan", id, undo_snapshot_work_plan(*prev));
            if (delete_work_plan(id)) std::cout << "Deleted work plan " << id << " (operación apilada)\n";
            else                      std::cerr << "Delete failed\n";
            return 0;
        }
    }

    // ---- projects (lista global + multilista Grupo → proyectos, Req. 3) ----
    if (cmd == "projects") {
        if (argc < 3) { usage(); return 1; }
        std::string sub = argv[2];

        if (sub == "all") {
            auto projects = list_projects();
            if (projects.empty()) {
                std::cout << "(no projects)\n";
            } else {
                std::cout << "Proyectos (" << projects.size() << "):\n";
                for (const auto& p : projects) {
                    std::cout << "  ID: " << p.id << "  | " << p.title;
                    if (!p.project_type.empty()) std::cout << "  | " << p.project_type;
                    if (!p.start_date.empty() || !p.end_date.empty())
                        std::cout << "  | " << p.start_date << " → " << p.end_date;
                    std::cout << "  | " << p.status << "\n";
                }
            }
            return 0;
        }

        if (sub == "add") {
            if (argc < 4) { std::cerr << "Provide title\n"; return 1; }
            Project proto;
            proto.title = argv[3];
            if (argc >= 5) proto.project_type = argv[4];
            if (argc >= 6) proto.start_date   = argv[5];
            if (argc >= 7) proto.end_date     = argv[6];
            Project created = create_project(proto);
            push_undo("CREATE", "Project", created.id);
            std::cout << "Created project with ID " << created.id << " (operación apilada)\n";
            return 0;
        }

        if (sub == "update") {
            if (argc < 5) { std::cerr << "Provide project id and new title\n"; return 1; }
            int id = std::stoi(argv[3]);
            auto prev = get_project(id);
            if (!prev) { std::cerr << "Project " << id << " not found\n"; return 1; }
            Project updates = *prev;
            updates.title = argv[4];
            push_undo("UPDATE", "Project", id, undo_snapshot_project(*prev));
            if (update_project(id, updates))
                std::cout << "Project " << id << " updated (operación apilada)\n";
            else
                std::cerr << "Update failed\n";
            return 0;
        }

        if (sub == "delete") {
            if (argc < 4) { std::cerr << "Provide project id\n"; return 1; }
            int id = std::stoi(argv[3]);
            auto prev = get_project(id);
            if (!prev) { std::cerr << "Project " << id << " not found\n"; return 1; }
            push_undo("DELETE", "Project", id, undo_snapshot_project(*prev));
            if (delete_project(id)) std::cout << "Deleted project " << id << " (operación apilada)\n";
            else                    std::cerr << "Delete failed\n";
            return 0;
        }

        if (sub == "list") {
            if (argc < 4) { std::cerr << "Provide group_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            auto ids = projects_of_group(gid);
            if (ids.empty()) {
                std::cout << "(no projects in group " << gid << ")\n";
            } else {
                std::cout << "Proyectos del grupo " << gid << " (" << ids.size() << "):\n";
                for (int pid : ids) {
                    auto p = get_project(pid);
                    if (p) std::cout << "  ID: " << p->id << "  | " << p->title << "  | " << p->status << "\n";
                }
            }
            return 0;
        }

        if (sub == "link" || sub == "unlink") {
            if (argc < 5) { std::cerr << "Provide group_id and project_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            int pid = std::stoi(argv[4]);
            std::string pair = std::to_string(gid) + ":" + std::to_string(pid);
            if (sub == "link") {
                if (!link_project_to_group(gid, pid)) { std::cerr << "Link failed (grupo o proyecto inexistente)\n"; return 1; }
                push_undo("LINK_PROJECT", "Project", pid, pair);
                std::cout << "Linked project " << pid << " to group " << gid << " (operación apilada)\n";
            } else {
                if (!unlink_project_from_group(gid, pid)) { std::cerr << "Unlink failed\n"; return 1; }
                push_undo("UNLINK_PROJECT", "Project", pid, pair);
                std::cout << "Unlinked project " << pid << " from group " << gid << " (operación apilada)\n";
            }
            return 0;
        }
    }

    // ---- queue (cola FIFO de validación) ----
    if (cmd == "queue") {
        if (argc < 3) { usage(); return 1; }
        std::string sub = argv[2];

        if (sub == "list") {
            auto items = vq_list();
            if (items.empty()) {
                std::cout << "(cola de validación vacía)\n";
            } else {
                std::cout << "Cola de validación (FIFO, frente primero — " << items.size() << "):\n";
                for (const auto& it : items) {
                    std::cout << "  #" << it.id
                              << " | producto " << it.product_id
                              << " | " << it.status
                              << " | intentos: " << it.attempts;
                    if (!it.assigned_to.empty()) std::cout << " | " << it.assigned_to;
                    std::cout << "\n";
                }
            }
            return 0;
        }

        if (sub == "enqueue") {
            if (argc < 4) { std::cerr << "Provide product id\n"; return 1; }
            int pid = std::stoi(argv[3]);
            ValidationQueueItem item;
            item.product_id = pid;
            item.assigned_to = argc >= 5 ? argv[4] : "evaluador_tecnico";
            vq_enqueue(item);
            std::cout << "Product " << pid << " enqueued (cola: " << vq_size()
                      << ", pendientes: " << vq_pending_count() << ")\n";
            return 0;
        }

        if (sub == "process") {
            auto item = vq_dequeue();   // dequeue = front de la FIFO
            if (!item) {
                std::cout << "(cola de validación vacía, nada que procesar)\n";
                return 0;
            }
            std::cout << "Procesando (FIFO): producto " << item->product_id << "\n";
            auto prod = get_product(item->product_id);
            if (prod) {
                std::cout << "  Antes : validation_status = " << prod->validation_status << "\n";
                push_undo("VALIDATE", "Product", prod->id, prod->validation_status);
                Product updated = *prod;
                updated.validation_status = "valid";
                update_product(prod->id, updated);
                std::cout << "  Después: validation_status = valid (operación apilada)\n";
            } else {
                std::cout << "  (producto no está en memoria; solo se desencola)\n";
            }
            std::cout << "Pendientes restantes: " << vq_pending_count() << "\n";
            return 0;
        }
    }

    // ---- history (pila LIFO de operaciones) ----
    if (cmd == "history") {
        if (argc < 3) { usage(); return 1; }
        std::string sub = argv[2];

        if (sub == "list") {
            auto ops = undo_list();   // cima primero
            if (ops.empty()) {
                std::cout << "(pila de operaciones vacía)\n";
            } else {
                std::cout << "Pila de operaciones (LIFO, cima primero — " << ops.size() << "):\n";
                for (const auto& op : ops) {
                    std::cout << "  #" << op.id
                              << " | " << op.operation_type
                              << " " << op.entity_type
                              << " #" << op.entity_id << "\n";
                }
            }
            return 0;
        }

        if (sub == "top") {
            auto op = undo_top();
            if (op) {
                std::cout << "Cima de la pila: #" << op->id
                          << " | " << op->operation_type
                          << " " << op->entity_type
                          << " #" << op->entity_id << "\n";
            } else {
                std::cout << "(pila vacía)\n";
            }
            return 0;
        }

        if (sub == "undo") {
            if (undo_perform())
                std::cout << "Undo OK (pila: " << undo_size() << " restantes)\n";
            return 0;
        }

        if (sub == "clear") {
            undo_clear();
            std::cout << "Pila de operaciones vaciada.\n";
            return 0;
        }
    }

    // ---- structures (recorridos de las estructuras manuales) ----
    if (cmd == "structures") {
        if (argc < 3) { usage(); return 1; }
        std::string sub = argv[2];

        if (sub == "groups") {
            std::cout << "Recorrido de la lista de grupos (GroupNode → nextGroup):\n";
            auto groups = list_groups();
            if (groups.empty()) { std::cout << "  (lista vacía)\n"; return 0; }
            int i = 0;
            for (const auto& g : groups) {
                std::cout << "  [nodo " << (++i) << "] grupo #" << g.id
                          << " \"" << g.name << "\" (" << g.status << ")"
                          << " → integrantes: " << members_of_group(g.id).size()
                          << " | enlaces producto: " << products_of_group(g.id).size()
                          << " | proyectos: " << projects_of_group(g.id).size()
                          << " | planes: " << plans_of_group(g.id).size() << "\n";
            }
            std::cout << "  (fin de la lista — " << i << " nodos)\n";
            return 0;
        }

        if (sub == "researchers") {
            std::cout << "Recorrido de la lista de investigadores (ResearcherNode → nextResearcher):\n";
            auto res = list_researchers();
            if (res.empty()) { std::cout << "  (lista vacía)\n"; return 0; }
            int i = 0;
            for (const auto& r : res) {
                std::cout << "  [nodo " << (++i) << "] investigador #" << r.id
                          << " " << r.first_names << " " << r.last_names
                          << " (" << r.status << ")\n";
            }
            std::cout << "  (fin de la lista — " << i << " nodos)\n";
            return 0;
        }

        if (sub == "products") {
            std::cout << "Recorrido de la lista de productos (ProductNode → nextProduct):\n";
            auto products = list_products();
            if (products.empty()) { std::cout << "  (lista vacía)\n"; return 0; }
            int i = 0;
            for (const auto& p : products) {
                std::cout << "  [nodo " << (++i) << "] producto #" << p.id
                          << " \"" << p.title << "\""
                          << " | año: " << (product_year(p) ? std::to_string(product_year(p)) : "s/f")
                          << " | " << p.validation_status << "\n";
            }
            std::cout << "  (fin de la lista — " << i << " nodos)\n";
            return 0;
        }

        if (sub == "multilist") {
            if (argc < 4) { std::cerr << "Provide group_id: structures multilist <gid>\n"; return 1; }
            int gid = std::stoi(argv[3]);
            auto g = get_group(gid);
            if (!g) { std::cerr << "Group " << gid << " not found\n"; return 1; }

            std::cout << "Recorrido de la multilista — grupo #" << g->id
                      << " \"" << g->name << "\":\n";

            std::cout << "  Cadena de integrantes (MembershipNode → nextInGroup):\n";
            auto member_ids = members_of_group(gid);
            if (member_ids.empty()) std::cout << "    (sin integrantes)\n";
            for (int rid : member_ids) {
                auto r = get_researcher(rid);
                std::cout << "    → researcher " << rid
                          << (r ? " (" + r->first_names + " " + r->last_names + ")" : " (no en memoria)")
                          << "\n";
            }

            std::cout << "  Cadena de productos (GroupProductNode → nextInGroup):\n";
            auto product_ids = products_of_group(gid);
            if (product_ids.empty()) std::cout << "    (sin productos)\n";
            for (int pid : product_ids) {
                auto p = get_product(pid);
                std::cout << "    → product " << pid
                          << (p ? " (\"" + p->title + "\")" : " (no en memoria)")
                          << "\n";
            }

            std::cout << "  Cadena de proyectos (GroupProjectNode → nextInGroup):\n";
            auto project_ids = projects_of_group(gid);
            if (project_ids.empty()) std::cout << "    (sin proyectos)\n";
            for (int pid : project_ids) {
                auto p = get_project(pid);
                std::cout << "    → project " << pid
                          << (p ? " (\"" + p->title + "\")" : " (no en memoria)")
                          << "\n";
            }

            std::cout << "  Cadena de planes (PlanNode → next):\n";
            auto plans = plans_of_group(gid);
            if (plans.empty()) std::cout << "    (sin planes)\n";
            for (const auto& wp : plans) {
                std::cout << "    → plan " << wp.id << " (\"" << wp.title << "\", "
                          << wp.status << ")\n";
            }
            return 0;
        }
    }

    // ---- summary ----
    if (cmd == "summary") {
        print_summary();
        return 0;
    }

    // ---- load / export ----
    if (cmd == "load") {
        if (argc < 3) { std::cerr << "Provide file path\n"; return 1; }
        if (load_from_file(argv[2]))
            std::cout << "Loaded state from " << argv[2] << "\n";
        else
            std::cerr << "Failed to load from " << argv[2] << "\n";
        return 0;
    }

    if (cmd == "export") {
        if (argc < 3) { std::cerr << "Provide file path\n"; return 1; }
        if (export_to_file(argv[2]))
            std::cout << "Exported state to " << argv[2] << "\n";
        else
            std::cerr << "Failed to export to " << argv[2] << "\n";
        return 0;
    }

    std::cerr << "Unknown command: " << cmd << "\n";
    usage();
    return 1;
}
