// core_cpp/src/pea_cli.cpp
// Command-line interface for PEA-i core.
// Usage:
//   pea_cli groups list
//   pea_cli groups show <id>
//   pea_cli groups add <external_code> <name>
//   pea_cli groups delete <id>
//   pea_cli members add <group_id> <researcher_id>
//   pea_cli members list <group_id>
//   pea_cli members remove <group_id> <researcher_id>
//   pea_cli products link <group_id> <product_id>
//   pea_cli products list <group_id>
//   pea_cli products unlink <group_id> <product_id>
//   pea_cli summary
//   pea_cli load <path>
//   pea_cli export <path>

#include "core.h"
#include <iostream>
#include <string>
#include <cstring>

using namespace peai;

// ---- Helpers ----

static void usage() {
    std::cout
        << "PEA-i CLI  (Taller 2 - Estructura de Datos)\n"
        << "=============================================\n\n"
        << "Usage: pea_cli <command> [subcommand] [args...]\n\n"
        << "Commands:\n"
        << "  groups   list                       List all groups\n"
        << "  groups   show   <id>                Show a single group\n"
        << "  groups   add    <code> <name>       Create a new group\n"
        << "  groups   delete <id>                Delete a group\n"
        << "  members  add    <gid> <rid>         Link researcher to group\n"
        << "  members  list   <gid>               List researchers in group\n"
        << "  members  remove <gid> <rid>         Remove researcher from group\n"
        << "  products link   <gid> <pid>         Link product to group\n"
        << "  products list   <gid>               List products of group\n"
        << "  products unlink <gid> <pid>         Unlink product from group\n"
        << "  summary                             Print stats table\n"
        << "  load     <path>                     Load state from JSON file\n"
        << "  export   <path>                     Export state to JSON file\n";
}

static void print_group(const Group& g) {
    std::cout << "  ID: " << g.id
              << "  | Code: " << g.external_code
              << "  | Name: " << g.name;
    if (!g.acronym.empty()) std::cout << "  | Acronym: " << g.acronym;
    std::cout << "\n";
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
            std::cout << "Created group with ID " << created.id << "\n";
            return 0;
        }

        if (sub == "delete") {
            if (argc < 4) { std::cerr << "Provide group id\n"; return 1; }
            int id = std::stoi(argv[3]);
            if (delete_group(id)) std::cout << "Deleted group " << id << "\n";
            else                  std::cerr << "Group " << id << " not found\n";
            return 0;
        }
    }

    // ---- members ----
    if (cmd == "members") {
        if (argc < 3) { usage(); return 1; }
        std::string sub = argv[2];

        if (sub == "add") {
            if (argc < 5) { std::cerr << "Provide group_id and researcher_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            int rid = std::stoi(argv[4]);
            auto* node = add_member_to_group(gid, rid);
            if (node) std::cout << "Researcher " << rid << " linked to group " << gid << "\n";
            else      std::cerr << "Group " << gid << " not found\n";
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
            if (remove_member_from_group(gid, rid))
                std::cout << "Removed researcher " << rid << " from group " << gid << "\n";
            else
                std::cerr << "Link not found\n";
            return 0;
        }
    }

    // ---- products ----
    if (cmd == "products") {
        if (argc < 3) { usage(); return 1; }
        std::string sub = argv[2];

        if (sub == "link") {
            if (argc < 5) { std::cerr << "Provide group_id and product_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            int pid = std::stoi(argv[4]);
            auto* node = link_product_to_group(gid, pid);
            if (node) std::cout << "Product " << pid << " linked to group " << gid << "\n";
            else      std::cerr << "Group " << gid << " not found\n";
            return 0;
        }

        if (sub == "list") {
            if (argc < 4) { std::cerr << "Provide group_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            auto ids = products_of_group(gid);
            if (ids.empty()) {
                std::cout << "(no products in group " << gid << ")\n";
            } else {
                std::cout << "Products in group " << gid << ": ";
                for (int id : ids) std::cout << id << " ";
                std::cout << "\n";
            }
            return 0;
        }

        if (sub == "unlink") {
            if (argc < 5) { std::cerr << "Provide group_id and product_id\n"; return 1; }
            int gid = std::stoi(argv[3]);
            int pid = std::stoi(argv[4]);
            if (unlink_product_from_group(gid, pid))
                std::cout << "Product " << pid << " unlinked from group " << gid << "\n";
            else
                std::cerr << "Link not found\n";
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
