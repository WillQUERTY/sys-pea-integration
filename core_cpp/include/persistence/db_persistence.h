// core_cpp/include/persistence/db_persistence.h
// SQL Server persistence layer declarations.

#ifndef PEAI_PERSISTENCE_DB_H
#define PEAI_PERSISTENCE_DB_H

#include <string>
#include <vector>
#include "../entities/project.h"

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

// ---- Option A Refactor ----
std::string get_dashboard_stats_json(const std::string& connection_string);
// Product catalogs (ProductFamily / ProductSubtype / QualityCategory) as JSON.
std::string get_product_catalogs_json(const std::string& connection_string);
int link_project_to_group_db(const std::string& conn, int group_id, const Project& p);
bool unlink_project_from_group_db(const std::string& conn, int group_id, int project_id);
int link_research_line_to_group_db(const std::string& conn, int group_id, const std::string& name);
bool unlink_research_line_from_group_db(const std::string& conn, int group_id, const std::string& name);

std::vector<Project> get_group_projects_db(const std::string& conn, int group_id);
std::vector<std::string> get_group_research_lines_db(const std::string& conn, int group_id);

// ---- Architectural consolidation: the core owns ALL SQL ----
// (repository.py must not use pyodbc; scraper ingestion is the only
//  documented exception)
bool delete_group_from_db(const std::string& conn, int group_id, bool hard);
bool delete_researcher_from_db(const std::string& conn, int res_id, bool hard);
bool delete_product_from_db(const std::string& conn, int prod_id, bool hard);
bool delete_membership_from_db(const std::string& conn, int group_id, int researcher_id);
bool delete_product_link_from_db(const std::string& conn, int group_id, int product_id);
// Compound, transactional: Product + GroupProductLink + ValidationQueueItem + AuditLog
bool set_product_validation_db(const std::string& conn, int product_id, const std::string& validation_status, int quality_category_id, const std::string& reason);
bool insert_audit_log_db(const std::string& conn, const std::string& entity_type, int entity_id, const std::string& action, const std::string& changed_by, const std::string& details);
bool insert_import_record_db(const std::string& conn, int job_id, const std::string& entity_type, const std::string& external_identifier, const std::string& action_taken, const std::string& summary, const std::string& details);
bool upsert_product_group_link_db(const std::string& conn, int group_id, int product_id, const std::string& status, const std::string& source, const std::string& reason);
bool insert_external_product_author_db(const std::string& conn, int product_id, int author_order, const std::string& name, const std::string& identifier, const std::string& match_status);
std::vector<int> products_of_researcher_db(const std::string& conn, int researcher_id);
bool vq_enqueue_db(const std::string& conn, int product_id, const std::string& assigned_to);
// ---- Initialization modes (spec section 33.3) ----
enum class InitMode { Database, File, Empty };
bool initialize(InitMode mode, const std::string& source = "");

} // namespace peai

#endif // PEAI_PERSISTENCE_DB_H
