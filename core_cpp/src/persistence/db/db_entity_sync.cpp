// core_cpp/src/persistence/db/db_entity_sync.cpp
// Write-through synchronization and deletion for entities and relational links in SQL Server.

#include "persistence/db_persistence.h"
#include "persistence/db/db_common.h"
#include "services/group_service.h"
#include "services/researcher_service.h"
#include "services/product_service.h"
#include "services/work_plan_service.h"
#include "services/project_service.h"

#include <optional>
#include <sstream>
#include <string>

namespace peai {

// =====================================================================
//  Entity Synchronization (Write-Through)
// =====================================================================

bool sync_group_to_db(const std::string& connection_string, int group_id) {
    std::optional<Group> g_opt = get_group(group_id);
    if (!g_opt) return false;
    Group g = g_opt.value();
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;

    std::string sql = 
        "MERGE ResearchGroup AS target "
        "USING (SELECT '" + escape_sql(utf8_to_cp1252(g.external_code)) + "' AS ext, '" + escape_sql(utf8_to_cp1252(g.name)) + "' AS name, '" + escape_sql(utf8_to_cp1252(g.acronym)) + "' AS acr, '" + escape_sql(utf8_to_cp1252(g.institution)) + "' AS inst, '" + escape_sql(utf8_to_cp1252(g.classification)) + "' AS clas, '" + escape_sql(utf8_to_cp1252(g.description)) + "' AS descr, '" + escape_sql(utf8_to_cp1252(g.mission)) + "' AS miss, '" + escape_sql(utf8_to_cp1252(g.vision)) + "' AS vis, '" + escape_sql(utf8_to_cp1252(g.declared_creation_date)) + "' AS cdate, '" + escape_sql(utf8_to_cp1252(g.knowledge_area)) + "' AS karea, '" + escape_sql(utf8_to_cp1252(g.knowledge_subarea)) + "' AS ksub, '" + escape_sql(utf8_to_cp1252(g.city)) + "' AS city, '" + escape_sql(utf8_to_cp1252(g.department)) + "' AS dep, '" + escape_sql(utf8_to_cp1252(g.website)) + "' AS web, '" + escape_sql(utf8_to_cp1252(g.email)) + "' AS email, " + nullable_int(g.leader_id) + " AS lid, '" + escape_sql(utf8_to_cp1252(g.status)) + "' AS sts) AS source "
        "ON (target.external_code = source.ext) "
        "WHEN MATCHED THEN "
        "  UPDATE SET name = source.name, acronym = source.acr, institution = source.inst, classification = source.clas, description = source.descr, mission = source.miss, vision = source.vis, declared_creation_date = source.cdate, knowledge_area = source.karea, knowledge_subarea = source.ksub, city = source.city, department = source.dep, website = source.web, email = source.email, leader_id = source.lid, status = source.sts, updated_at = GETDATE() "
        "WHEN NOT MATCHED THEN "
        "  INSERT (external_code, name, acronym, institution, classification, description, mission, vision, declared_creation_date, knowledge_area, knowledge_subarea, city, department, website, email, leader_id, status) VALUES (source.ext, source.name, source.acr, source.inst, source.clas, source.descr, source.miss, source.vis, source.cdate, source.karea, source.ksub, source.city, source.dep, source.web, source.email, source.lid, source.sts);";
    
    return exec_sql(dbc, sql);
}

bool sync_researcher_to_db(const std::string& connection_string, int res_id) {
    std::optional<Researcher> r_opt = get_researcher(res_id);
    if (!r_opt) return false;
    Researcher r = r_opt.value();
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;

    std::string sql = 
        "MERGE Researcher AS target "
        "USING (SELECT '" + escape_sql(utf8_to_cp1252(r.external_code)) + "' AS ext, '" + escape_sql(utf8_to_cp1252(r.identification_type)) + "' AS idt, '" + escape_sql(utf8_to_cp1252(r.identification_number)) + "' AS idn, '" + escape_sql(utf8_to_cp1252(r.first_names)) + "' AS fname, '" + escape_sql(utf8_to_cp1252(r.last_names)) + "' AS lname, '" + escape_sql(utf8_to_cp1252(r.nationality)) + "' AS nat, '" + escape_sql(utf8_to_cp1252(r.country_of_residence)) + "' AS cres, '" + escape_sql(utf8_to_cp1252(r.institutional_email)) + "' AS email, '" + escape_sql(utf8_to_cp1252(r.orcid)) + "' AS orcid, '" + escape_sql(utf8_to_cp1252(r.highest_education_level)) + "' AS edu, '" + escape_sql(utf8_to_cp1252(r.education_records)) + "' AS edur, '" + escape_sql(utf8_to_cp1252(r.classification_records)) + "' AS clasr, '" + escape_sql(utf8_to_cp1252(r.status)) + "' AS sts) AS source "
        "ON (target.external_code = source.ext) "
        "WHEN MATCHED THEN "
        "  UPDATE SET identification_type = source.idt, identification_number = source.idn, first_names = source.fname, last_names = source.lname, nationality = source.nat, country_of_residence = source.cres, institutional_email = source.email, orcid = source.orcid, highest_education_level = source.edu, education_records = source.edur, classification_records = source.clasr, status = source.sts, updated_at = GETDATE() "
        "WHEN NOT MATCHED THEN "
        "  INSERT (external_code, identification_type, identification_number, first_names, last_names, nationality, country_of_residence, institutional_email, orcid, highest_education_level, education_records, classification_records, status) VALUES (source.ext, source.idt, source.idn, source.fname, source.lname, source.nat, source.cres, source.email, source.orcid, source.edu, source.edur, source.clasr, source.sts);";
    
    return exec_sql(dbc, sql);
}

bool sync_product_to_db(const std::string& connection_string, int prod_id) {
    std::optional<Product> p_opt = get_product(prod_id);
    if (!p_opt) return false;
    Product p = p_opt.value();
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;

    std::string sql = 
        "MERGE Product AS target "
        "USING (SELECT '" + escape_sql(utf8_to_cp1252(p.external_code)) + "' AS ext, '" + escape_sql(utf8_to_cp1252(p.title)) + "' AS title, '" + escape_sql(utf8_to_cp1252(p.description)) + "' AS descr, " + nullable_int(p.family_id) + " AS fam, " + nullable_int(p.subtype_id) + " AS sub, " + nullable_int(p.quality_category_id) + " AS qc, " + nullable_date(p.obtained_date) + " AS odate, " + nullable_date(p.publication_date) + " AS pdate, '" + escape_sql(utf8_to_cp1252(p.validation_status)) + "' AS vsts, '" + escape_sql(utf8_to_cp1252(p.language)) + "' AS lang, '" + escape_sql(utf8_to_cp1252(p.country)) + "' AS ctry, '" + escape_sql(utf8_to_cp1252(p.doi)) + "' AS doi, '" + escape_sql(utf8_to_cp1252(p.isbn)) + "' AS isbn, '" + escape_sql(utf8_to_cp1252(p.issn)) + "' AS issn, '" + escape_sql(utf8_to_cp1252(p.url)) + "' AS url, '" + escape_sql(utf8_to_cp1252(p.evidence)) + "' AS evid, '" + escape_sql(utf8_to_cp1252(p.specialized_attributes)) + "' AS spec, '" + escape_sql(utf8_to_cp1252(p.status)) + "' AS sts, " + std::to_string(p.year) + " AS yr) AS source "
        "ON (target.external_code = source.ext) "
        "WHEN MATCHED THEN "
        "  UPDATE SET title = source.title, description = source.descr, family_id = source.fam, subtype_id = source.sub, quality_category_id = source.qc, obtained_date = source.odate, publication_date = source.pdate, validation_status = source.vsts, language = source.lang, country = source.ctry, doi = source.doi, isbn = source.isbn, issn = source.issn, url = source.url, evidence = source.evid, specialized_attributes = source.spec, status = source.sts, year = source.yr, updated_at = GETDATE() "
        "WHEN NOT MATCHED THEN "
        "  INSERT (external_code, title, description, family_id, subtype_id, quality_category_id, obtained_date, publication_date, validation_status, language, country, doi, isbn, issn, url, evidence, specialized_attributes, status, year) VALUES (source.ext, source.title, source.descr, source.fam, source.sub, source.qc, source.odate, source.pdate, source.vsts, source.lang, source.ctry, source.doi, source.isbn, source.issn, source.url, source.evid, source.spec, source.sts, source.yr);";
    
    return exec_sql(dbc, sql);
}

bool sync_membership_details_to_db(const std::string& connection_string, int group_id, int researcher_id, const std::string& role, const std::string& start_date, const std::string& end_date) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;
    auto g_opt = get_group(group_id);
    auto r_opt = get_researcher(researcher_id);
    std::string g_ext = g_opt ? escape_sql(utf8_to_cp1252(g_opt->external_code)) : "";
    std::string r_ext = r_opt ? escape_sql(utf8_to_cp1252(r_opt->external_code)) : "";

    std::string g_clause = g_ext.empty() ? ("g.id = " + std::to_string(group_id)) : ("g.external_code = '" + g_ext + "'");
    std::string r_clause = r_ext.empty() ? ("r.id = " + std::to_string(researcher_id)) : ("r.external_code = '" + r_ext + "'");

    std::string sql = 
        "IF EXISTS (SELECT 1 FROM GroupMembership m, ResearchGroup g, Researcher r WHERE m.group_id = g.id AND m.researcher_id = r.id AND " + g_clause + " AND " + r_clause + ") "
        "  UPDATE m SET role = '" + escape_sql(utf8_to_cp1252(role)) + "', start_date = '" + escape_sql(utf8_to_cp1252(start_date)) + "', end_date = '" + escape_sql(utf8_to_cp1252(end_date)) + "', status = 'active' "
        "  FROM GroupMembership m, ResearchGroup g, Researcher r "
        "  WHERE m.group_id = g.id AND m.researcher_id = r.id AND " + g_clause + " AND " + r_clause + " "
        "ELSE "
        "  INSERT INTO GroupMembership (group_id, researcher_id, role, start_date, end_date, status) "
        "  SELECT g.id, r.id, '" + escape_sql(utf8_to_cp1252(role)) + "', '" + escape_sql(utf8_to_cp1252(start_date)) + "', '" + escape_sql(utf8_to_cp1252(end_date)) + "', 'active' "
        "  FROM ResearchGroup g, Researcher r "
        "  WHERE (" + g_clause + ") AND (" + r_clause + ");";
    return exec_sql(dbc, sql);
}

bool sync_membership_to_db(const std::string& connection_string, int group_id, int researcher_id) {
    return sync_membership_details_to_db(connection_string, group_id, researcher_id, "Investigador", "", "");
}

bool sync_product_link_to_db(const std::string& connection_string, int group_id, int product_id) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;
    auto g_opt = get_group(group_id);
    auto p_opt = get_product(product_id);
    std::string g_ext = g_opt ? escape_sql(utf8_to_cp1252(g_opt->external_code)) : "";
    std::string p_ext = p_opt ? escape_sql(utf8_to_cp1252(p_opt->external_code)) : "";

    std::string g_clause = g_ext.empty() ? ("g.id = " + std::to_string(group_id)) : ("g.external_code = '" + g_ext + "'");
    std::string p_clause = p_ext.empty() ? ("p.id = " + std::to_string(product_id)) : ("p.external_code = '" + p_ext + "'");

    std::string sql = 
        "INSERT INTO GroupProductLink (group_id, product_id) "
        "SELECT g.id, p.id "
        "FROM ResearchGroup g, Product p "
        "WHERE (" + g_clause + ") "
        "  AND (" + p_clause + ") "
        "  AND NOT EXISTS (SELECT 1 FROM GroupProductLink l WHERE l.group_id = g.id AND l.product_id = p.id);";
    return exec_sql(dbc, sql);
}

bool sync_product_author_to_db(const std::string& connection_string, int product_id, int researcher_id, int author_order) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;
    auto p_opt = get_product(product_id);
    auto r_opt = get_researcher(researcher_id);
    std::string p_ext = p_opt ? escape_sql(utf8_to_cp1252(p_opt->external_code)) : "";
    std::string r_ext = r_opt ? escape_sql(utf8_to_cp1252(r_opt->external_code)) : "";

    std::string p_clause = p_ext.empty() ? ("p.id = " + std::to_string(product_id)) : ("p.external_code = '" + p_ext + "'");
    std::string r_clause = r_ext.empty() ? ("r.id = " + std::to_string(researcher_id)) : ("r.external_code = '" + r_ext + "'");

    std::string sql = 
        "INSERT INTO ProductAuthor (product_id, researcher_id, author_order) "
        "SELECT p.id, r.id, " + std::to_string(author_order) + " "
        "FROM Product p, Researcher r "
        "WHERE (" + p_clause + ") "
        "  AND (" + r_clause + ") "
        "  AND NOT EXISTS (SELECT 1 FROM ProductAuthor a WHERE a.product_id = p.id AND a.researcher_id = r.id);";
    return exec_sql(dbc, sql);
}

// WorkPlan (T-08)
bool sync_work_plan_to_db(const std::string& connection_string, int plan_id) {
    std::optional<WorkPlan> wp_opt = get_work_plan(plan_id);
    if (!wp_opt) return false;
    WorkPlan wp = wp_opt.value();
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;

    std::string gid_expr = group_db_id(wp.group_id);
    std::string sql =
        "SET IDENTITY_INSERT WorkPlan ON; "
        "MERGE WorkPlan AS target "
        "USING (SELECT " + std::to_string(wp.id) + " AS id, " + gid_expr + " AS gid, '" + escape_sql(utf8_to_cp1252(wp.title)) + "' AS title, '" + escape_sql(utf8_to_cp1252(wp.description)) + "' AS descr, " + nullable_date(wp.start_date) + " AS sdate, " + nullable_date(wp.end_date) + " AS edate, '" + escape_sql(utf8_to_cp1252(wp.status)) + "' AS sts) AS source "
        "ON (target.id = source.id) "
        "WHEN MATCHED THEN "
        "  UPDATE SET group_id = source.gid, title = source.title, description = source.descr, start_date = source.sdate, end_date = source.edate, status = source.sts "
        "WHEN NOT MATCHED THEN "
        "  INSERT (id, group_id, title, description, start_date, end_date, status) VALUES (source.id, source.gid, source.title, source.descr, source.sdate, source.edate, source.sts); "
        "SET IDENTITY_INSERT WorkPlan OFF;";
    return exec_sql(dbc, sql);
}

bool delete_work_plan_from_db(const std::string& conn, int plan_id, bool hard) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;

    std::string sql = hard
        ? "DELETE FROM WorkPlan WHERE id = " + std::to_string(plan_id) + ";"
        : "UPDATE WorkPlan SET status = 'inactive' WHERE id = " + std::to_string(plan_id) + ";";
    return exec_sql(dbc, sql);
}

// Project (Req. 3)
bool sync_project_to_db(const std::string& connection_string, int project_id) {
    std::optional<Project> p_opt = get_project(project_id);
    if (!p_opt) return false;
    Project p = p_opt.value();
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;

    // principal_investigator_id: RAM id -> DB id via external_code del investigador
    std::string pi_expr = "NULL";
    if (p.principal_investigator_id > 0)
        pi_expr = researcher_db_id(p.principal_investigator_id);

    std::ostringstream oss;
    oss << "SET IDENTITY_INSERT Project ON; "
        << "MERGE Project AS target "
        << "USING (SELECT " << p.id << " AS id, '"
        << escape_sql(utf8_to_cp1252(p.title)) << "' AS title, '"
        << escape_sql(utf8_to_cp1252(p.summary)) << "' AS summary, '"
        << escape_sql(utf8_to_cp1252(p.project_type)) << "' AS ptype, "
        << nullable_date(p.start_date) << " AS sdate, "
        << nullable_date(p.end_date) << " AS edate, '"
        << escape_sql(utf8_to_cp1252(p.status)) << "' AS sts, '"
        << escape_sql(utf8_to_cp1252(p.funding_type)) << "' AS ftype, "
        << std::to_string(p.budget) << " AS budget, "
        << pi_expr << " AS pi_id) AS source "
        << "ON (target.id = source.id) "
        << "WHEN MATCHED THEN "
        << "  UPDATE SET title = source.title, summary = source.summary, project_type = source.ptype, start_date = source.sdate, end_date = source.edate, status = source.sts, funding_type = source.ftype, budget = source.budget, principal_investigator_id = source.pi_id, updated_at = GETDATE() "
        << "WHEN NOT MATCHED THEN "
        << "  INSERT (id, title, summary, project_type, start_date, end_date, status, funding_type, budget, principal_investigator_id) VALUES (source.id, source.title, source.summary, source.ptype, source.sdate, source.edate, source.sts, source.ftype, source.budget, source.pi_id); "
        << "SET IDENTITY_INSERT Project OFF;";
    return exec_sql(dbc, oss.str());
}

bool delete_project_from_db(const std::string& conn, int project_id, bool hard) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;

    std::string sql = hard
        ? "DELETE FROM GroupProject WHERE project_id = " + std::to_string(project_id) + "; "
          "DELETE FROM Project WHERE id = " + std::to_string(project_id) + ";"
        : "UPDATE Project SET status = 'inactive', updated_at = GETDATE() WHERE id = " + std::to_string(project_id) + ";";
    return exec_sql(dbc, sql);
}

bool sync_project_link_to_db(const std::string& conn, int group_id, int project_id) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;

    std::string gid = group_db_id(group_id);
    std::string sql =
        "IF NOT EXISTS (SELECT 1 FROM GroupProject WHERE group_id = " + gid +
        " AND project_id = " + std::to_string(project_id) + ") "
        "INSERT INTO GroupProject (group_id, project_id) VALUES (" + gid +
        ", " + std::to_string(project_id) + ");";
    return exec_sql(dbc, sql);
}

bool delete_project_link_from_db(const std::string& conn, int group_id, int project_id) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;

    std::string gid = group_db_id(group_id);
    std::string sql =
        "DELETE FROM GroupProject WHERE group_id = " + gid +
        " AND project_id = " + std::to_string(project_id) + ";";
    return exec_sql(dbc, sql);
}

// =====================================================================
//  Entity Deletion Helpers
// =====================================================================

static bool delete_entity_from_db(const std::string& conn, const std::string& id_expr, const char* table, bool hard) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    std::string sql = hard
        ? "DELETE FROM " + std::string(table) + " WHERE id = " + id_expr + ";"
        : "UPDATE " + std::string(table) + " SET status = 'inactive', updated_at = GETDATE() WHERE id = " + id_expr + ";";
    return exec_sql(dbc, sql);
}

bool delete_group_from_db(const std::string& conn, int group_id, bool hard) {
    return delete_entity_from_db(conn, group_db_id(group_id), "ResearchGroup", hard);
}

bool delete_researcher_from_db(const std::string& conn, int res_id, bool hard) {
    return delete_entity_from_db(conn, researcher_db_id(res_id), "Researcher", hard);
}

bool delete_product_from_db(const std::string& conn, int prod_id, bool hard) {
    return delete_entity_from_db(conn, product_db_id(prod_id), "Product", hard);
}

bool delete_membership_from_db(const std::string& conn, int group_id, int researcher_id) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    return exec_sql(dbc,
        "DELETE FROM GroupMembership WHERE group_id = " + group_db_id(group_id) +
        " AND researcher_id = " + researcher_db_id(researcher_id) + ";");
}

bool delete_product_link_from_db(const std::string& conn, int group_id, int product_id) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    return exec_sql(dbc,
        "DELETE FROM GroupProductLink WHERE group_id = " + group_db_id(group_id) +
        " AND product_id = " + product_db_id(product_id) + ";");
}

} // namespace peai
