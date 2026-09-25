// core_cpp/include/persistence/db_persistence.h
// SQL Server persistence layer declarations.

#ifndef PEAI_PERSISTENCE_DB_H
#define PEAI_PERSISTENCE_DB_H

#include <string>

namespace peai {

// ---- SQL Server operations ----
bool load_from_db(const std::string& connection_string);
bool save_to_db(const std::string& connection_string);
bool sync_group_to_db(const std::string& connection_string, int group_id);
bool sync_researcher_to_db(const std::string& connection_string, int res_id);
bool sync_product_to_db(const std::string& connection_string, int prod_id);
bool sync_membership_to_db(const std::string& connection_string, int group_id, int researcher_id);
bool sync_membership_details_to_db(const std::string& connection_string, int group_id, int researcher_id, const std::string& role, const std::string& start_date, const std::string& end_date);
bool sync_product_link_to_db(const std::string& connection_string, int group_id, int product_id);
bool sync_product_author_to_db(const std::string& connection_string, int product_id, int researcher_id, int author_order = 1);

// ---- Initialization modes (spec section 33.3) ----
enum class InitMode { Database, File, Empty };
bool initialize(InitMode mode, const std::string& source = "");

} // namespace peai

#endif // PEAI_PERSISTENCE_DB_H
