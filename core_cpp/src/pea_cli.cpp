// core_cpp/src/pea_cli.cpp
// Command-line interface for the Khemia core (solución C/C++ — decisión D-01).

#include "cli/cli_helpers.h"
#include "cli/group_commands.h"
#include "cli/researcher_commands.h"
#include "cli/product_commands.h"
#include "cli/plan_project_commands.h"
#include "cli/queue_history_commands.h"
#include "cli/structure_commands.h"
#include "cli/interactive_repl.h"
#include <iostream>
#include <string>

using namespace peai;

static int dispatch(int argc, char* argv[]) {
    if (argc < 2) {
        cli::usage();
        return 1;
    }

    std::string cmd = argv[1];

    if (cmd == "groups")      return cli::handle_groups(argc, argv);
    if (cmd == "members")     return cli::handle_members(argc, argv);
    if (cmd == "researchers") return cli::handle_researchers(argc, argv);
    if (cmd == "indicator")   return cli::handle_indicator(argc, argv);
    if (cmd == "products")    return cli::handle_products(argc, argv);
    if (cmd == "plans")       return cli::handle_plans(argc, argv);
    if (cmd == "projects")    return cli::handle_projects(argc, argv);
    if (cmd == "queue")       return cli::handle_queue(argc, argv);
    if (cmd == "history")     return cli::handle_history(argc, argv);
    if (cmd == "structures")  return cli::handle_structures(argc, argv);
    if (cmd == "summary")     return cli::handle_summary();
    if (cmd == "load" || cmd == "export")
        return cli::handle_persistence(cmd, argc, argv);

    std::cerr << "Unknown command: " << cmd << "\n";
    cli::usage();
    return 1;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        cli::usage();
        return 1;
    }

    std::string cmd = argv[1];
    if (cmd == "interactive" || cmd == "i") {
        return cli::interactive_mode(dispatch);
    }

    return dispatch(argc, argv);
}
