// core_cpp/src/cli/structure_commands.cpp
#include "structure_commands.h"
#include "cli_helpers.h"
#include <iostream>
#include <string>

namespace peai::cli {

int handle_structures(int argc, char* argv[]) {
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

    std::cerr << "Unknown subcommand: " << sub << "\n";
    return 1;
}

int handle_summary() {
    print_summary();
    return 0;
}

int handle_persistence(const std::string& cmd, int argc, char* argv[]) {
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

    return 1;
}

} // namespace peai::cli
