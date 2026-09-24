// core_cpp/include/core.h
// Public API for the PEA-i core library.
// All CRUD, persistence and utility functions live under the peai namespace.

#ifndef PEAI_CORE_H
#define PEAI_CORE_H

#include "structures.h"
#include <vector>
#include <optional>
#include <string>

namespace peai {

// ---- Group CRUD ----
Group               create_group(const Group& prototype);
std::optional<Group> get_group(int id);
std::vector<Group>   list_groups();
bool                 update_group(int id, const Group& updates);
bool                 delete_group(int id);

// ---- Multilista: membership links ----
MembershipNode*      add_member_to_group(int group_id, int researcher_id);
std::vector<int>     members_of_group(int group_id);
std::vector<int>     groups_of_researcher(int researcher_id);
bool                 remove_member_from_group(int group_id, int researcher_id);

// ---- Multilista: product links ----
GroupProductNode*    link_product_to_group(int group_id, int product_id);
std::vector<int>     products_of_group(int group_id);
bool                 unlink_product_from_group(int group_id, int product_id);

// ---- Persistence (JSON file) ----
bool load_from_file(const std::string& path);
bool export_to_file(const std::string& path);

// ---- Summary / stats ----
int  total_groups();
int  total_members();
int  total_product_links();
void print_summary();

} // namespace peai

#endif // PEAI_CORE_H
