// core_cpp/src/cli/group_commands.cpp
#include "group_commands.h"
#include "cli_helpers.h"
#include <iostream>
#include <string>

namespace peai::cli {

int handle_groups(int argc, char* argv[]) {
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

    std::cerr << "Unknown subcommand: " << sub << "\n";
    return 1;
}

int handle_members(int argc, char* argv[]) {
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
            std::cout << "Researchers in group " << gid << ":\n";
            for (int id : ids) {
                auto det = membership_details(gid, id);
                if (det) {
                    std::cout << "  ID " << id << " (" << det->role << ", " << det->start_date << " - " << det->end_date << ")\n";
                } else {
                    std::cout << "  ID " << id << "\n";
                }
            }
        }
        return 0;
    }

    if (sub == "update") {
        if (argc < 8) { std::cerr << "Provide group_id, researcher_id, role, start_date, end_date\n"; return 1; }
        int gid = std::stoi(argv[3]);
        int rid = std::stoi(argv[4]);
        auto prev = membership_details(gid, rid);
        if (!prev) { std::cerr << "Link not found\n"; return 1; }
        push_undo("UPDATE_MEMBERSHIP", "GroupMembership", prev->membershipId, std::to_string(gid) + ":" + std::to_string(rid) + "\x1F" + prev->role + "\x1F" + prev->start_date + "\x1F" + prev->end_date);
        if (update_membership(gid, rid, argv[5], argv[6], argv[7])) {
            std::cout << "Membership updated (operación apilada)\n";
        } else {
            std::cerr << "Update failed\n";
        }
        return 0;
    }

    if (sub == "remove") {
        if (argc < 5) { std::cerr << "Provide group_id and researcher_id\n"; return 1; }
        int gid = std::stoi(argv[3]);
        int rid = std::stoi(argv[4]);
        auto prev = membership_details(gid, rid);
        if (remove_member_from_group(gid, rid)) {
            if (prev) {
                push_undo("UNLINK_MEMBER", "GroupMembership", gid, std::to_string(gid) + ":" + std::to_string(rid) + "\x1F" + prev->role + "\x1F" + prev->start_date + "\x1F" + prev->end_date);
            } else {
                push_undo("UNLINK_MEMBER", "GroupMembership", gid, std::to_string(gid) + ":" + std::to_string(rid));
            }
            std::cout << "Removed researcher " << rid << " from group " << gid
                      << " (operación apilada)\n";
        } else {
            std::cerr << "Link not found\n";
        }
        return 0;
    }

    std::cerr << "Unknown subcommand: " << sub << "\n";
    return 1;
}

} // namespace peai::cli
