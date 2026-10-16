// core_cpp/src/persistence/db/db_common.h
// Common ODBC connection management, text conversion, and SQL utility helpers.

#ifndef PEAI_PERSISTENCE_DB_COMMON_H
#define PEAI_PERSISTENCE_DB_COMMON_H

#ifdef _WIN32
#include <windows.h>
#endif
#include <sql.h>
#include <sqlext.h>

#include <string>
#include <vector>
#include <utility>

namespace peai {

// ODBC connection handle manager (thread-local or single shared active connection).
SQLHDBC get_or_create_dbc(const std::string& connection_string);
void close_active_dbc();

// Character encoding conversion (Windows CP1252 <-> UTF-8)
std::string cp1252_to_utf8(const char* str);
std::string utf8_to_cp1252(const std::string& utf8_str);

// SQL syntax helpers
std::string escape_sql(const std::string& str);
bool exec_sql(SQLHDBC dbc, const std::string& sql);
bool ensure_schema(SQLHDBC dbc);

// JSON escaping
std::string json_escape(const std::string& s);

// Entity ID resolution (RAM ID <-> DB IDENTITY via external_code)
std::string db_id_expr(const char* table, const std::string& ext, int ram_id);
std::string group_db_id(int ram_id);
std::string researcher_db_id(int ram_id);
std::string product_db_id(int ram_id);

// Nullable formatting helpers
std::string nullable_int(int v);
std::string nullable_date(const std::string& s);

// SQL aggregation & catalog query helpers
std::vector<std::pair<std::string, int>> query_group_counts(SQLHDBC dbc, const std::string& sql);
void query_catalog(SQLHDBC dbc, const char* sql, bool with_extra, std::string& out);

} // namespace peai

#endif // PEAI_PERSISTENCE_DB_COMMON_H
