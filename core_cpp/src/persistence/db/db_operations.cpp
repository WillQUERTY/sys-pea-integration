// core_cpp/src/persistence/db/db_operations.cpp
// Granular transactional relational operations, validation queues, audit logging, and links.

#include "persistence/db_persistence.h"
#include "persistence/db/db_common.h"
#include "services/group_service.h"
#include "services/product_service.h"
#include "services/project_service.h"

#include <iostream>
#include <string>
#include <vector>

namespace peai {

// =====================================================================
//  Project & Research Line Group Linking
// =====================================================================

int link_project_to_group_db(const std::string& conn, int group_id, const Project& p) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return 0;
    
    int project_id = 0;
    std::string sql = "SELECT id FROM Project WHERE title = '" + escape_sql(p.title) + "'";
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &project_id, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    if (project_id == 0) {
        std::string ins = "INSERT INTO Project (title, summary, start_date, end_date, status, project_type, funding_type, budget, principal_investigator_id) OUTPUT INSERTED.id VALUES ('" + escape_sql(p.title) + "', '" + escape_sql(p.summary) + "', '" + escape_sql(p.start_date) + "', '" + escape_sql(p.end_date) + "', '" + escape_sql(p.status) + "', '" + escape_sql(p.project_type) + "', '" + escape_sql(p.funding_type) + "', " + std::to_string(p.budget) + ", " + std::to_string(p.principal_investigator_id) + ")";
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)ins.c_str(), SQL_NTS);
        if (SQLFetch(stmt) == SQL_SUCCESS) {
            SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &project_id, 0, &ind);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    std::string gid = group_db_id(group_id);
    std::string link_chk = "SELECT 1 FROM GroupProject WHERE group_id=" + gid + " AND project_id=" + std::to_string(project_id);
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    bool exists = false;
    SQLExecDirect(stmt, (SQLCHAR*)link_chk.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) exists = true;
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    if (!exists) {
        std::string link_ins = "INSERT INTO GroupProject (group_id, project_id) VALUES (" + gid + ", " + std::to_string(project_id) + ")";
        exec_sql(dbc, link_ins);
    }
    return project_id;
}

bool unlink_project_from_group_db(const std::string& conn, int group_id, int project_id) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    return exec_sql(dbc, "DELETE FROM GroupProject WHERE group_id=" + group_db_id(group_id) + " AND project_id=" + std::to_string(project_id));
}

int link_research_line_to_group_db(const std::string& conn, int group_id, const std::string& name) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return 0;
    
    int line_id = 0;
    std::string sql = "SELECT id FROM ResearchLine WHERE name = '" + escape_sql(name) + "'";
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &line_id, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    if (line_id == 0) {
        std::string ins = "INSERT INTO ResearchLine (name) OUTPUT INSERTED.id VALUES ('" + escape_sql(name) + "')";
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)ins.c_str(), SQL_NTS);
        if (SQLFetch(stmt) == SQL_SUCCESS) {
            SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &line_id, 0, &ind);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    std::string gid = group_db_id(group_id);
    std::string link_chk = "SELECT 1 FROM GroupResearchLine WHERE group_id=" + gid + " AND line_id=" + std::to_string(line_id);
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    bool exists = false;
    SQLExecDirect(stmt, (SQLCHAR*)link_chk.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) exists = true;
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    if (!exists) {
        std::string link_ins = "INSERT INTO GroupResearchLine (group_id, line_id) VALUES (" + gid + ", " + std::to_string(line_id) + ")";
        exec_sql(dbc, link_ins);
    }
    return line_id;
}

bool unlink_research_line_from_group_db(const std::string& conn, int group_id, const std::string& name) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    return exec_sql(dbc, "DELETE grl FROM GroupResearchLine grl JOIN ResearchLine rl ON grl.line_id = rl.id WHERE grl.group_id=" + group_db_id(group_id) + " AND rl.name='" + escape_sql(utf8_to_cp1252(name)) + "'");
}

std::vector<Project> get_group_projects_db(const std::string& conn, int group_id) {
    std::vector<Project> res;
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return res;
    
    std::string sql = "SELECT p.id, p.title, p.summary, p.start_date, p.end_date, p.status, p.project_type, p.funding_type, p.budget, p.principal_investigator_id FROM Project p JOIN GroupProject gp ON p.id = gp.project_id WHERE gp.group_id=" + group_db_id(group_id);
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        Project p;
        SQLLEN ind;
        char buf[1024];
        
        SQLGetData(stmt, 1, SQL_C_LONG, &p.id, 0, &ind);
        
        SQLGetData(stmt, 2, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.title = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 3, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.summary = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 4, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.start_date = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 5, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.end_date = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 6, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.status = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 7, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.project_type = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 8, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.funding_type = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 9, SQL_C_DOUBLE, &p.budget, 0, &ind);
        SQLGetData(stmt, 10, SQL_C_LONG, &p.principal_investigator_id, 0, &ind);
        
        res.push_back(p);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    return res;
}

std::vector<std::string> get_group_research_lines_db(const std::string& conn, int group_id) {
    std::vector<std::string> res;
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return res;
    
    std::string sql = "SELECT rl.name FROM ResearchLine rl JOIN GroupResearchLine grl ON rl.id = grl.line_id WHERE grl.group_id=" + group_db_id(group_id);
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        char buf[1024]; SQLLEN ind;
        SQLGetData(stmt, 1, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) res.push_back(cp1252_to_utf8(buf));
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    return res;
}

// =====================================================================
//  Validation, Audit Log & Import Records
// =====================================================================

bool insert_audit_log_db(const std::string& conn, const std::string& entity_type, int entity_id,
                         const std::string& action, const std::string& changed_by, const std::string& details) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    return exec_sql(dbc,
        "INSERT INTO AuditLog (entity_type, entity_id, action, changed_by, change_details) VALUES ('" +
        escape_sql(utf8_to_cp1252(entity_type)) + "', " + std::to_string(entity_id) + ", '" +
        escape_sql(utf8_to_cp1252(action)) + "', '" + escape_sql(utf8_to_cp1252(changed_by)) + "', '" +
        escape_sql(utf8_to_cp1252(details)) + "');");
}

bool set_product_validation_db(const std::string& conn, int product_id, const std::string& validation_status,
                               int quality_category_id, const std::string& reason) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;

    // Operacion compuesta: las 4 escrituras van en una sola transaccion ODBC
    // para preservar la atomicidad que tenia el bloque pyodbc original.
    SQLSetConnectAttr(dbc, SQL_ATTR_AUTOCOMMIT, (SQLPOINTER)SQL_AUTOCOMMIT_OFF, 0);

    std::string qc = nullable_int(quality_category_id);
    std::string pid = product_db_id(product_id);
    std::string gpl_status = validation_status == "valid" ? "approved"
                           : validation_status == "rejected" ? "rejected" : "pending_validation";

    bool ok = true;
    ok &= exec_sql(dbc,
        "UPDATE Product SET validation_status = '" + escape_sql(utf8_to_cp1252(validation_status)) +
        "', quality_category_id = COALESCE(" + qc + ", quality_category_id), updated_at = GETDATE() " +
        "WHERE id = " + pid + ";");

    ok &= exec_sql(dbc,
        "UPDATE GroupProductLink SET status = '" + gpl_status + "', validation_reason = '" +
        escape_sql(utf8_to_cp1252(reason)) + "', authorized_at = CASE WHEN '" + gpl_status +
        "' IN ('approved', 'rejected') THEN GETDATE() ELSE NULL END " +
        "WHERE product_id = " + pid + ";");

    ok &= exec_sql(dbc,
        "UPDATE ValidationQueueItem SET status = 'processed', result = '" +
        escape_sql(utf8_to_cp1252(validation_status)) + "', processed_at = GETDATE() " +
        "WHERE product_id = " + pid + " AND status = 'pending';");

    ok &= insert_audit_log_db(conn, "Product", product_id, "VALIDATE_PRODUCT", "api_user",
        "Validación cambiada a " + validation_status + " (" + reason + ")");

    SQLEndTran(SQL_HANDLE_DBC, dbc, ok ? SQL_COMMIT : SQL_ROLLBACK);
    SQLSetConnectAttr(dbc, SQL_ATTR_AUTOCOMMIT, (SQLPOINTER)SQL_AUTOCOMMIT_ON, 0);
    return ok;
}

bool insert_import_record_db(const std::string& conn, int job_id, const std::string& entity_type,
                             const std::string& external_identifier, const std::string& action_taken,
                             const std::string& summary, const std::string& details) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;

    std::string trimmed_summary = summary.substr(0, 500);
    return exec_sql(dbc,
        "INSERT INTO ImportRecord (job_id, entity_type, external_identifier, action_taken, source_data_summary, resolution_details, created_at) VALUES (" +
        std::to_string(job_id) + ", '" + escape_sql(utf8_to_cp1252(entity_type)) + "', '" +
        escape_sql(utf8_to_cp1252(external_identifier)) + "', '" + escape_sql(utf8_to_cp1252(action_taken)) + "', '" +
        escape_sql(utf8_to_cp1252(trimmed_summary)) + "', '" + escape_sql(utf8_to_cp1252(details)) + "', GETDATE());");
}

bool upsert_product_group_link_db(const std::string& conn, int group_id, int product_id,
                                  const std::string& status, const std::string& source, const std::string& reason) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    std::string gid = group_db_id(group_id);
    std::string pid = product_db_id(product_id);
    return exec_sql(dbc,
        "IF EXISTS (SELECT 1 FROM GroupProductLink WHERE group_id = " + gid +
        " AND product_id = " + pid + ") "
        "BEGIN "
        "  UPDATE GroupProductLink SET status = '" + escape_sql(utf8_to_cp1252(status)) +
        "', source = '" + escape_sql(utf8_to_cp1252(source)) + "', validation_reason = '" +
        escape_sql(utf8_to_cp1252(reason)) + "' "
        "  WHERE group_id = " + gid + " AND product_id = " + pid +
        " AND (source = 'system' OR source IS NULL); "
        "END "
        "ELSE "
        "BEGIN "
        "  INSERT INTO GroupProductLink (group_id, product_id, status, source, requested_at, validation_reason) VALUES (" +
        gid + ", " + pid + ", '" + escape_sql(utf8_to_cp1252(status)) +
        "', '" + escape_sql(utf8_to_cp1252(source)) + "', GETDATE(), '" + escape_sql(utf8_to_cp1252(reason)) + "'); "
        "END");
}

bool insert_external_product_author_db(const std::string& conn, int product_id, int author_order,
                                       const std::string& name, const std::string& identifier, const std::string& match_status) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    std::string pid = product_db_id(product_id);
    return exec_sql(dbc,
        "IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = " + pid +
        " AND external_author_name = '" + escape_sql(utf8_to_cp1252(name)) + "') "
        "BEGIN "
        "  INSERT INTO ProductAuthor (product_id, researcher_id, author_order, external_author_name, external_author_identifier, match_status) VALUES (" +
        pid + ", NULL, " + std::to_string(author_order) + ", '" +
        escape_sql(utf8_to_cp1252(name)) + "', '" + escape_sql(utf8_to_cp1252(identifier)) + "', '" +
        escape_sql(utf8_to_cp1252(match_status)) + "'); "
        "END");
}

std::vector<int> products_of_researcher_db(const std::string& conn, int researcher_id) {
    std::vector<int> res;
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return res;

    std::string sql = "SELECT product_id FROM ProductAuthor WHERE researcher_id = " + researcher_db_id(researcher_id);
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        int pid = 0; SQLLEN ind;
        SQLGetData(stmt, 1, SQL_C_LONG, &pid, 0, &ind);
        if (ind != SQL_NULL_DATA) res.push_back(pid);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    return res;
}

bool vq_enqueue_db(const std::string& conn, int product_id, const std::string& assigned_to) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    std::string pid = product_db_id(product_id);
    return exec_sql(dbc,
        "IF NOT EXISTS (SELECT 1 FROM ValidationQueueItem WHERE product_id = " + pid +
        " AND status = 'pending') "
        "BEGIN "
        "  INSERT INTO ValidationQueueItem (product_id, status, assigned_to, enqueued_at) VALUES (" +
        pid + ", 'pending', '" + escape_sql(utf8_to_cp1252(assigned_to)) + "', GETDATE()); "
        "END");
}

bool vq_cancel_db(const std::string& conn, int product_id) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    std::string pid = product_db_id(product_id);
    return exec_sql(dbc,
        "UPDATE ValidationQueueItem SET status = 'cancelled', processed_at = GETDATE() "
        "WHERE product_id = " + pid + " AND status = 'pending';");
}

std::string authors_of_product_json(const std::string& connection_string, int product_id) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return "[]";
    std::string pid = product_db_id(product_id);
    std::string sql =
        "SELECT pa.id, pa.author_order, pa.researcher_id, pa.external_author_name, "
        "pa.external_author_identifier, pa.match_status, r.external_code, r.first_names, r.last_names "
        "FROM ProductAuthor pa LEFT JOIN Researcher r ON r.id = pa.researcher_id "
        "WHERE pa.product_id = " + pid + " ORDER BY pa.author_order, pa.id";

    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    if (!SQL_SUCCEEDED(SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS))) {
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
        return "[]";
    }
    std::string out = "[";
    bool first = true;
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        int id = 0, ord = 0, rid = 0; SQLLEN i1, i2, i3, i4, i5, i6, i7, i8, i9;
        char ext_name[512], ext_id[256], match[128], r_ext[128], r_first[256], r_last[256];
        SQLGetData(stmt, 1, SQL_C_LONG, &id, 0, &i1);
        SQLGetData(stmt, 2, SQL_C_LONG, &ord, 0, &i2);
        SQLGetData(stmt, 3, SQL_C_LONG, &rid, 0, &i3);
        SQLGetData(stmt, 4, SQL_C_CHAR, ext_name, sizeof(ext_name), &i4);
        SQLGetData(stmt, 5, SQL_C_CHAR, ext_id, sizeof(ext_id), &i5);
        SQLGetData(stmt, 6, SQL_C_CHAR, match, sizeof(match), &i6);
        SQLGetData(stmt, 7, SQL_C_CHAR, r_ext, sizeof(r_ext), &i7);
        SQLGetData(stmt, 8, SQL_C_CHAR, r_first, sizeof(r_first), &i8);
        SQLGetData(stmt, 9, SQL_C_CHAR, r_last, sizeof(r_last), &i9);
        if (!first) out += ",";
        out += "{\"id\":" + std::to_string(id);
        out += ",\"author_order\":" + std::to_string(i2 != SQL_NULL_DATA ? ord : 1);
        out += ",\"researcher_db_id\":" + (i3 != SQL_NULL_DATA ? std::to_string(rid) : std::string("null"));
        out += ",\"researcher_external_code\":\"" + json_escape(i7 != SQL_NULL_DATA ? cp1252_to_utf8(r_ext) : "") + "\"";
        std::string rname = (i8 != SQL_NULL_DATA ? cp1252_to_utf8(r_first) : "") + " " +
                            (i9 != SQL_NULL_DATA ? cp1252_to_utf8(r_last) : "");
        out += ",\"researcher_name\":\"" + json_escape(rname) + "\"";
        out += ",\"external_author_name\":\"" + json_escape(i4 != SQL_NULL_DATA ? cp1252_to_utf8(ext_name) : "") + "\"";
        out += ",\"external_author_identifier\":\"" + json_escape(i5 != SQL_NULL_DATA ? cp1252_to_utf8(ext_id) : "") + "\"";
        out += ",\"match_status\":\"" + json_escape(i6 != SQL_NULL_DATA ? cp1252_to_utf8(match) : "") + "\"}";
        first = false;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    out += "]";
    return out;
}

std::string members_of_group_details_json(const std::string& connection_string, int group_id) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return "[]";
    auto g_opt = get_group(group_id);
    std::string g_ext = g_opt ? escape_sql(utf8_to_cp1252(g_opt->external_code)) : "";
    std::string g_clause = g_ext.empty() ? ("g.id = " + std::to_string(group_id)) : ("g.external_code = '" + g_ext + "'");
    std::string sql =
        "SELECT r.external_code, m.role, m.start_date, m.end_date, m.status "
        "FROM GroupMembership m "
        "JOIN ResearchGroup g ON g.id = m.group_id "
        "JOIN Researcher r ON r.id = m.researcher_id "
        "WHERE " + g_clause + " ORDER BY m.id";

    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    if (!SQL_SUCCEEDED(SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS))) {
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
        return "[]";
    }
    std::string out = "[";
    bool first = true;
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        char ext[128], role[200], sd[64], ed[64], st[64];
        SQLLEN i1, i2, i3, i4, i5;
        SQLGetData(stmt, 1, SQL_C_CHAR, ext, sizeof(ext), &i1);
        SQLGetData(stmt, 2, SQL_C_CHAR, role, sizeof(role), &i2);
        SQLGetData(stmt, 3, SQL_C_CHAR, sd, sizeof(sd), &i3);
        SQLGetData(stmt, 4, SQL_C_CHAR, ed, sizeof(ed), &i4);
        SQLGetData(stmt, 5, SQL_C_CHAR, st, sizeof(st), &i5);
        if (!first) out += ",";
        out += "{\"researcher_external_code\":\"" + json_escape(i1 != SQL_NULL_DATA ? cp1252_to_utf8(ext) : "") + "\"";
        out += ",\"role\":\"" + json_escape(i2 != SQL_NULL_DATA ? cp1252_to_utf8(role) : "") + "\"";
        std::string sds = i3 != SQL_NULL_DATA ? cp1252_to_utf8(sd) : "";
        std::string eds = i4 != SQL_NULL_DATA ? cp1252_to_utf8(ed) : "";
        out += ",\"start_date\":\"" + json_escape(sds.substr(0, 10)) + "\"";
        out += ",\"end_date\":\"" + json_escape(eds.substr(0, 10)) + "\"";
        out += ",\"status\":\"" + json_escape(i5 != SQL_NULL_DATA ? cp1252_to_utf8(st) : "") + "\"}";
        first = false;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    out += "]";
    return out;
}

bool remove_product_author_db(const std::string& conn, int product_id, int researcher_id, const std::string& external_name) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    std::string pid = product_db_id(product_id);
    std::string cond = researcher_id > 0
        ? "researcher_id = " + researcher_db_id(researcher_id)
        : "external_author_name = '" + escape_sql(utf8_to_cp1252(external_name)) + "'";
    return exec_sql(dbc, "DELETE FROM ProductAuthor WHERE product_id = " + pid + " AND " + cond);
}

} // namespace peai
