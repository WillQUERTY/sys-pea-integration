// core_cpp/src/cli/researcher_commands.cpp
#include "researcher_commands.h"
#include "cli_helpers.h"
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

} // namespace peai::cli
