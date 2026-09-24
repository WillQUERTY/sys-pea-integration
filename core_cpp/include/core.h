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

// ---- Persistence (SQL Server) ----
// connection_string example: "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"
bool load_from_db(const std::string& connection_string);    // DB → multilista in memory
bool save_to_db(const std::string& connection_string);      // multilista in memory → DB (full overwrite)
bool sync_group_to_db(const std::string& connection_string, int group_id); // single group sync

// ---- Initialization modes (mirrors spec section 33.3) ----
enum class InitMode { Database, File, Empty };
bool initialize(InitMode mode, const std::string& source = "");

// ---- Summary / stats ----
int  total_groups();
int  total_members();
int  total_product_links();
void print_summary();

} // namespace peai

#endif // PEAI_CORE_H
