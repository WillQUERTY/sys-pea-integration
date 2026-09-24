// core_cpp/include/services/group_service.h
// Group CRUD, multilista operations and summary statistics.

#ifndef PEAI_SERVICES_GROUP_SERVICE_H
#define PEAI_SERVICES_GROUP_SERVICE_H

#include "../entities/group.h"
#include "../entities/membership.h"
#include "../entities/product.h"

#include <vector>
#include <optional>

namespace peai {

// ---- Group CRUD ----
Group                create_group(const Group& prototype);
std::optional<Group> get_group(int id);
std::vector<Group>   list_groups();
bool                 update_group(int id, const Group& updates);
bool                 delete_group(int id);

// ---- Multilista: membership links (Group <-> Researcher) ----
MembershipNode*      add_member_to_group(int group_id, int researcher_id);
std::vector<int>     members_of_group(int group_id);
std::vector<int>     groups_of_researcher(int researcher_id);
bool                 remove_member_from_group(int group_id, int researcher_id);

// ---- Multilista: product links (Group <-> Product) ----
GroupProductNode*    link_product_to_group(int group_id, int product_id);
std::vector<int>     products_of_group(int group_id);
bool                 unlink_product_from_group(int group_id, int product_id);

// ---- Summary / stats ----
int  total_groups();
int  total_members();
int  total_product_links();
void print_summary();

// ---- Internal access (used by persistence layers) ----
GroupNode* get_group_head();

} // namespace peai

#endif // PEAI_SERVICES_GROUP_SERVICE_H
