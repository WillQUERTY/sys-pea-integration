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

// ---- Initialization modes (spec section 33.3) ----
enum class InitMode { Database, File, Empty };
bool initialize(InitMode mode, const std::string& source = "");

} // namespace peai

#endif // PEAI_PERSISTENCE_DB_H
