// core_cpp/src/cli/plan_project_commands.cpp
#include "plan_project_commands.h"
#include "cli_helpers.h"
#include <iostream>
#include <string>

namespace peai::cli {

int handle_plans(int argc, char* argv[]) {
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

    std::cerr << "Unknown subcommand: " << sub << "\n";
    return 1;
}

int handle_projects(int argc, char* argv[]) {
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

    std::cerr << "Unknown subcommand: " << sub << "\n";
    return 1;
}

} // namespace peai::cli
