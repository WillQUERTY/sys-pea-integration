// core_cpp/src/cli/researcher_commands.cpp
#include "researcher_commands.h"
#include "cli_helpers.h"
#include "services/group_service.h"
#include "services/product_service.h"
#include <iostream>
#include <string>

namespace peai::cli {

int handle_researchers(int argc, char* argv[]) {
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
        if (argc >= 7) updates.external_code = argv[6];
        if (argc >= 8) updates.institutional_email = argv[7];
        if (argc >= 9) updates.highest_education_level = argv[8];
        if (argc >= 10) updates.status = argv[9];
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

    std::cerr << "Unknown subcommand: " << sub << "\n";
    return 1;
}

int handle_indicator(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "Usage: pea_cli indicator researcher <id>\n";
        std::cerr << "       pea_cli indicator group <id>\n";
        return 1;
    }
    std::string sub = argv[2];

    if (sub == "researcher") {
        if (argc < 4) { std::cerr << "Provide researcher id\n"; return 1; }
        int id = std::stoi(argv[3]);
        auto opt = get_researcher(id);
        if (!opt) { std::cerr << "Researcher " << id << " not found\n"; return 1; }
        const auto& r = *opt;

        // Productos vinculados al investigador (memoria RAM del core C++)
        std::vector<int> pids = products_of_researcher_ram(id);

        int total = 0, top = 0, type_a = 0, type_b = 0;
        int asc = 0, dpc = 0, frh_a = 0, frh_b = 0, coop = 0;
        int in_window = 0;
        int current = current_year();

        for (int pid : pids) {
            auto popt = get_product(pid);
            if (!popt) continue;
            const auto& p = *popt;
            if (p.status != "active") continue;

            int py = product_year(p);
            if (py <= 0) py = current;
            int age = current - py;
            if (age < 0) age = 0;

            // Ventana simplificada: 5 años por defecto, 10 para patentes (DTI)
            int window = (p.family_id == 2) ? 10 : 5;
            if (age > window) continue;

            in_window++;
            total++;

            switch (p.family_id) {
                case 3: asc++; break;  // ASC
                case 4: dpc++; break;  // DPC
                case 5: {
                    // FRH: sin distincion doctoral/maestria en C++, se cuenta como Fr.B por defecto
                    frh_b++;
                    break;
                }
                default: break;
            }

            // Calidad aproximada por categoria
            switch (p.quality_category_id) {
                case 1: top++; break;   // TOP
                case 2: type_a++; break; // Tipo A
                case 3: type_b++; break; // Tipo B
                default: break;
            }

            // Cooperacion: si el producto tiene mas de un autor vinculado
            auto authors = authors_of_product(pid);
            int others = 0;
            for (const auto& pa : authors) if (pa.researcherId != id) others++;
            if (others > 0) coop++;
        }

        // Formula I_Investigador (Minciencias 2024, seccion 10.6, adaptada a individual)
        double ap = asc + dpc;
        double i_investigador = 3.7 * top + 2.3 * type_a + 0.4 * type_b
                              + 1.5 * ap + 0.5 * dpc
                              + 1.0 * frh_a + 0.2 * frh_b
                              + 0.3 * coop;

        std::cout << "=== I_Investigador — Investigador " << id << " ===\n";
        std::cout << "Nombre: " << r.first_names << " " << r.last_names << "\n";
        std::cout << "Codigo externo: " << r.external_code << "\n";
        std::cout << "Nivel formacion: " << r.highest_education_level << "\n";
        std::cout << "Productos totales: " << total << "\n";
        std::cout << "Productos en ventana: " << in_window << "\n";
        std::cout << "  TOP: " << top << " | Tipo A: " << type_a << " | Tipo B: " << type_b << "\n";
        std::cout << "  ASC: " << asc << " | DPC: " << dpc << " | FRH-A: " << frh_a << " | FRH-B: " << frh_b << "\n";
        std::cout << "  Productos coautorizados: " << coop << "\n";
        std::cout << "-------------------------------\n";
        std::cout << "I_Investigador = " << i_investigador << "\n";
        return 0;
    }

    if (sub == "group") {
        if (argc < 4) { std::cerr << "Provide group id\n"; return 1; }
        int id = std::stoi(argv[3]);
        auto opt = get_group(id);
        if (!opt) { std::cerr << "Group " << id << " not found\n"; return 1; }
        const auto& g = *opt;

        std::vector<int> pids = products_of_group(id);

        int total = 0, top = 0, type_a = 0, type_b = 0;
        int asc = 0, dpc = 0, frh_a = 0, frh_b = 0, coop = 0;
        int in_window = 0;
        int current = current_year();

        for (int pid : pids) {
            auto popt = get_product(pid);
            if (!popt) continue;
            const auto& p = *popt;
            if (p.status != "active") continue;

            int py = product_year(p);
            if (py <= 0) py = current;
            int age = current - py;
            if (age < 0) age = 0;

            // Ventana simplificada: 5 años por defecto, 10 para patentes (DTI)
            int window = (p.family_id == 2) ? 10 : 5;
            if (age > window) continue;

            in_window++;
            total++;

            switch (p.family_id) {
                case 3: asc++; break;  // ASC
                case 4: dpc++; break;  // DPC
                case 5: frh_b++; break;  // FRH (C++ no distingue Fr.A/Fr.B)
                default: break;
            }

            switch (p.quality_category_id) {
                case 1: top++; break;
                case 2: type_a++; break;
                case 3: type_b++; break;
                default: break;
            }

            // Cooperacion: producto con mas de un autor vinculado
            auto authors = authors_of_product(pid);
            if (authors.size() > 1) coop++;
        }

        double cohe = 0.0;  // cohesion interna del colectivo (pendiente de analisis de autores del grupo)

        // Formula I_Grupo (Minciencias 2024, seccion 10.6).
        // AP (apropiacion social) y DPC (divulgacion publica) son terminos separados.
        double i_grupo = 3.7 * top + 2.3 * type_a + 0.4 * type_b
                       + 1.5 * asc + 0.5 * dpc
                       + 1.0 * frh_a + 0.2 * frh_b
                       + 0.1 * cohe + 0.3 * coop;

        std::cout << "=== I_Grupo — Grupo " << id << " ===\n";
        std::cout << "Nombre: " << g.name << " (ID " << g.id << ", clasificacion: " << g.classification << ")\n";
        std::cout << "Miembros: " << total_members() << "\n";
        std::cout << "Productos en ventana: " << in_window << " (de " << total << " vinculados)\n";
        std::cout << "  TOP: " << top << " | Tipo A: " << type_a << " | Tipo B: " << type_b << "\n";
        std::cout << "  ASC: " << asc << " | DPC: " << dpc << " | FRH-B: " << frh_b << "\n";
        std::cout << "  Productos coautorizados: " << coop << "\n";
        std::cout << "-------------------------------\n";
        std::cout << "I_Grupo = " << i_grupo << "\n";
        return 0;
    }

    std::cerr << "Unknown subcommand: " << sub << "\n";
    std::cerr << "Usage: pea_cli indicator researcher <id>\n";
    std::cerr << "       pea_cli indicator group <id>\n";
    return 1;
}

} // namespace peai::cli
