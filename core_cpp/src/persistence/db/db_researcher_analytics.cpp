// core_cpp/src/persistence/db/db_researcher_analytics.cpp
// SQL analytics: Researcher production profiles, temporal trends, group contribution, and coauthorship rankings.

#include "persistence/db_persistence.h"
#include "persistence/db/db_common.h"

#include <cstdio>
#include <string>

namespace peai {

// =====================================================================
//  Researcher Statistics JSON
// =====================================================================

std::string get_researcher_stats_json(const std::string& connection_string, int researcher_id) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return "{}";

    std::string rid_expr = researcher_db_id(researcher_id);
    SQLHSTMT stmt;
    std::string json = "{";

    // 0. Resolver ID real de base de datos
    int db_rid = 0;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_res = "SELECT " + rid_expr;
    if (SQL_SUCCEEDED(SQLExecDirect(stmt, (SQLCHAR*)q_res.c_str(), SQL_NTS))) {
        if (SQLFetch(stmt) == SQL_SUCCESS) {
            SQLLEN ind;
            SQLGetData(stmt, 1, SQL_C_LONG, &db_rid, 0, &ind);
        }
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    if (db_rid <= 0) db_rid = researcher_id;
    std::string s_rid = std::to_string(db_rid);

    // 1. Total de Productos del Investigador
    int total_products = 0;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_tot_p = "SELECT COUNT(DISTINCT pa.product_id) "
                          "FROM ProductAuthor pa "
                          "JOIN Product p ON pa.product_id = p.id "
                          "WHERE pa.researcher_id = " + s_rid + " AND p.status != 'inactive'";
    SQLExecDirect(stmt, (SQLCHAR*)q_tot_p.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind;
        SQLGetData(stmt, 1, SQL_C_LONG, &total_products, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    json += "\"total_products\":" + std::to_string(total_products);

    // 2. Serie temporal (by_year)
    json += ",\"by_year\":[";
    bool first = true;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_by_year = "SELECT COALESCE(NULLIF(LEFT(p.obtained_date, 4), ''), NULLIF(LEFT(p.publication_date, 4), ''), 'Sin fecha') AS yr, "
                            "COUNT(DISTINCT p.id) AS cnt "
                            "FROM Product p "
                            "JOIN ProductAuthor pa ON p.id = pa.product_id "
                            "WHERE pa.researcher_id = " + s_rid + " AND p.status != 'inactive' "
                            "GROUP BY COALESCE(NULLIF(LEFT(p.obtained_date, 4), ''), NULLIF(LEFT(p.publication_date, 4), ''), 'Sin fecha') "
                            "ORDER BY yr ASC";
    SQLExecDirect(stmt, (SQLCHAR*)q_by_year.c_str(), SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        char y_buf[32] = {0}; int y_cnt = 0; SQLLEN i1, i2;
        SQLGetData(stmt, 1, SQL_C_CHAR, y_buf, sizeof(y_buf), &i1);
        SQLGetData(stmt, 2, SQL_C_LONG, &y_cnt, 0, &i2);
        if (!first) json += ",";
        json += "{\"year\":\"" + json_escape(y_buf) + "\",\"count\":" + std::to_string(y_cnt) + "}";
        first = false;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    json += "]";

    // 3. Familias de Productos Minciencias (GNC, DTI, ASC, DPC, FRH)
    json += ",\"families_distribution\":[";
    first = true;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_fam = "SELECT pf.code, pf.name, COUNT(DISTINCT p.id) AS cnt "
                        "FROM Product p "
                        "JOIN ProductAuthor pa ON p.id = pa.product_id "
                        "JOIN ProductFamily pf ON p.family_id = pf.id "
                        "WHERE pa.researcher_id = " + s_rid + " AND p.status != 'inactive' "
                        "GROUP BY pf.code, pf.name "
                        "ORDER BY cnt DESC";
    SQLExecDirect(stmt, (SQLCHAR*)q_fam.c_str(), SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        char fcode[32] = {0}; char fname[256] = {0}; int fcnt = 0; SQLLEN i1, i2, i3;
        SQLGetData(stmt, 1, SQL_C_CHAR, fcode, sizeof(fcode), &i1);
        SQLGetData(stmt, 2, SQL_C_CHAR, fname, sizeof(fname), &i2);
        SQLGetData(stmt, 3, SQL_C_LONG, &fcnt, 0, &i3);
        std::string fname_utf8 = i2 != SQL_NULL_DATA ? cp1252_to_utf8(fname) : "";
        double pct = total_products > 0 ? (fcnt * 100.0 / total_products) : 0.0;
        char buf_pct[32]; snprintf(buf_pct, sizeof(buf_pct), "%.1f", pct);
        if (!first) json += ",";
        json += "{\"code\":\"" + json_escape(fcode) + "\"" +
                ",\"name\":\"" + json_escape(fname_utf8) + "\"" +
                ",\"count\":" + std::to_string(fcnt) +
                ",\"percentage\":" + std::string(buf_pct) + "}";
        first = false;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    json += "]";

    // 4. Top Tipologias / Subtipos
    json += ",\"top_subtypes\":[";
    first = true;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_subtypes = "SELECT TOP 6 ps.id, ISNULL(ps.code, ''), ISNULL(ps.name, ''), COUNT(DISTINCT p.id) AS cnt "
                             "FROM Product p "
                             "JOIN ProductAuthor pa ON p.id = pa.product_id "
                             "JOIN ProductSubtype ps ON p.subtype_id = ps.id "
                             "WHERE pa.researcher_id = " + s_rid + " AND p.status != 'inactive' "
                             "GROUP BY ps.id, ps.code, ps.name "
                             "ORDER BY cnt DESC";
    SQLExecDirect(stmt, (SQLCHAR*)q_subtypes.c_str(), SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        int sid = 0, scnt = 0; char scode[64] = {0}; char sname[256] = {0}; SQLLEN i1, i2, i3, i4;
        SQLGetData(stmt, 1, SQL_C_LONG, &sid, 0, &i1);
        SQLGetData(stmt, 2, SQL_C_CHAR, scode, sizeof(scode), &i2);
        SQLGetData(stmt, 3, SQL_C_CHAR, sname, sizeof(sname), &i3);
        SQLGetData(stmt, 4, SQL_C_LONG, &scnt, 0, &i4);
        std::string name_utf8 = i3 != SQL_NULL_DATA ? cp1252_to_utf8(sname) : "";
        if (!first) json += ",";
        json += "{\"subtype_id\":" + std::to_string(sid) +
                ",\"code\":\"" + json_escape(i2 != SQL_NULL_DATA ? scode : "") + "\"" +
                ",\"name\":\"" + json_escape(name_utf8) + "\"" +
                ",\"count\":" + std::to_string(scnt) + "}";
        first = false;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    json += "]";

    // 5. Aporte y Distribución por Grupos de Investigación
    json += ",\"groups_contribution\":[";
    first = true;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_groups = "SELECT rg.id, ISNULL(rg.name, ''), ISNULL(rg.acronym, ''), ISNULL(gm.role, 'Integrante'), "
                           "COUNT(DISTINCT gpl.product_id) AS prod_in_group "
                           "FROM GroupMembership gm "
                           "JOIN ResearchGroup rg ON gm.group_id = rg.id "
                           "LEFT JOIN GroupProductLink gpl ON rg.id = gpl.group_id AND gpl.product_id IN ("
                           "  SELECT pa.product_id FROM ProductAuthor pa "
                           "  JOIN Product p ON pa.product_id = p.id "
                           "  WHERE pa.researcher_id = " + s_rid + " AND p.status != 'inactive'"
                           ") "
                           "WHERE gm.researcher_id = " + s_rid + " AND rg.status != 'inactive' "
                           "GROUP BY rg.id, rg.name, rg.acronym, gm.role "
                           "ORDER BY prod_in_group DESC";
    SQLExecDirect(stmt, (SQLCHAR*)q_groups.c_str(), SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        int gid = 0, gcnt = 0; char gname[256] = {0}; char gacr[64] = {0}; char grole[128] = {0}; SQLLEN i1, i2, i3, i4, i5;
        SQLGetData(stmt, 1, SQL_C_LONG, &gid, 0, &i1);
        SQLGetData(stmt, 2, SQL_C_CHAR, gname, sizeof(gname), &i2);
        SQLGetData(stmt, 3, SQL_C_CHAR, gacr, sizeof(gacr), &i3);
        SQLGetData(stmt, 4, SQL_C_CHAR, grole, sizeof(grole), &i4);
        SQLGetData(stmt, 5, SQL_C_LONG, &gcnt, 0, &i5);
        std::string gname_utf8 = i2 != SQL_NULL_DATA ? cp1252_to_utf8(gname) : "";
        std::string grole_utf8 = i4 != SQL_NULL_DATA ? cp1252_to_utf8(grole) : "";
        double pct = total_products > 0 ? (gcnt * 100.0 / total_products) : 0.0;
        char buf_pct[32]; snprintf(buf_pct, sizeof(buf_pct), "%.1f", pct);
        if (!first) json += ",";
        json += "{\"id\":" + std::to_string(gid) +
                ",\"name\":\"" + json_escape(gname_utf8) + "\"" +
                ",\"acronym\":\"" + json_escape(i3 != SQL_NULL_DATA ? gacr : "") + "\"" +
                ",\"role\":\"" + json_escape(grole_utf8) + "\"" +
                ",\"products_count\":" + std::to_string(gcnt) +
                ",\"percentage\":" + std::string(buf_pct) + "}";
        first = false;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    json += "]";

    // 6. Colaboradores Frecuentes (Top 5 Coautores)
    json += ",\"top_coauthors\":[";
    first = true;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_coauthors = "SELECT TOP 5 r2.id, "
                              "ISNULL(r2.first_names, ''), "
                              "ISNULL(r2.last_names, ''), "
                              "ISNULL(r2.highest_education_level, 'Pregrado'), "
                              "COUNT(DISTINCT pa1.product_id) AS shared_prods "
                              "FROM ProductAuthor pa1 "
                              "JOIN ProductAuthor pa2 ON pa1.product_id = pa2.product_id AND pa2.researcher_id != " + s_rid + " "
                              "JOIN Researcher r2 ON pa2.researcher_id = r2.id AND r2.status != 'inactive' "
                              "JOIN Product p ON pa1.product_id = p.id AND p.status != 'inactive' "
                              "WHERE pa1.researcher_id = " + s_rid + " "
                              "GROUP BY r2.id, r2.first_names, r2.last_names, r2.highest_education_level "
                              "ORDER BY shared_prods DESC";
    SQLExecDirect(stmt, (SQLCHAR*)q_coauthors.c_str(), SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        int cid = 0, cprods = 0; char cfname[128] = {0}; char clname[128] = {0}; char cedu[128] = {0}; SQLLEN i1, i2, i3, i4, i5;
        SQLGetData(stmt, 1, SQL_C_LONG, &cid, 0, &i1);
        SQLGetData(stmt, 2, SQL_C_CHAR, cfname, sizeof(cfname), &i2);
        SQLGetData(stmt, 3, SQL_C_CHAR, clname, sizeof(clname), &i3);
        SQLGetData(stmt, 4, SQL_C_CHAR, cedu, sizeof(cedu), &i4);
        SQLGetData(stmt, 5, SQL_C_LONG, &cprods, 0, &i5);
        std::string full_name = (i2 != SQL_NULL_DATA ? cp1252_to_utf8(cfname) : "") + " " +
                                (i3 != SQL_NULL_DATA ? cp1252_to_utf8(clname) : "");
        while (!full_name.empty() && full_name.front() == ' ') full_name.erase(0, 1);
        while (!full_name.empty() && full_name.back() == ' ') full_name.pop_back();
        std::string edu_utf8 = i4 != SQL_NULL_DATA ? cp1252_to_utf8(cedu) : "Pregrado";
        if (!first) json += ",";
        json += "{\"id\":" + std::to_string(cid) +
                ",\"name\":\"" + json_escape(full_name) + "\"" +
                ",\"highest_education\":\"" + json_escape(edu_utf8) + "\"" +
                ",\"shared_products\":" + std::to_string(cprods) + "}";
        first = false;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    json += "]";

    // 7. Métricas y Ratios Estratégicos del Investigador
    int endorsed_count = 0;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_end = "SELECT COUNT(DISTINCT p.id) FROM Product p "
                        "JOIN ProductAuthor pa ON p.id = pa.product_id "
                        "WHERE pa.researcher_id = " + s_rid + " AND p.is_endorsed = 1 AND p.status != 'inactive'";
    SQLExecDirect(stmt, (SQLCHAR*)q_end.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &endorsed_count, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    int valid_count = 0;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_val = "SELECT COUNT(DISTINCT p.id) FROM Product p "
                        "JOIN ProductAuthor pa ON p.id = pa.product_id "
                        "WHERE pa.researcher_id = " + s_rid + " AND p.validation_status = 'valid' AND p.status != 'inactive'";
    SQLExecDirect(stmt, (SQLCHAR*)q_val.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &valid_count, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    int distinct_coauthors = 0;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_coauth_cnt = "SELECT COUNT(DISTINCT pa2.researcher_id) FROM ProductAuthor pa1 "
                               "JOIN ProductAuthor pa2 ON pa1.product_id = pa2.product_id AND pa2.researcher_id != " + s_rid + " "
                               "JOIN Product p ON pa1.product_id = p.id AND p.status != 'inactive' "
                               "WHERE pa1.researcher_id = " + s_rid;
    SQLExecDirect(stmt, (SQLCHAR*)q_coauth_cnt.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &distinct_coauthors, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    double endorsement_rate = total_products > 0 ? (endorsed_count * 100.0 / total_products) : 0.0;
    double validation_rate = total_products > 0 ? (valid_count * 100.0 / total_products) : 0.0;

    char buf_end[32], buf_val[32];
    snprintf(buf_end, sizeof(buf_end), "%.1f", endorsement_rate);
    snprintf(buf_val, sizeof(buf_val), "%.1f", validation_rate);

    json += ",\"strategic_ratios\":{"
            "\"endorsed_count\":" + std::to_string(endorsed_count) + ","
            "\"endorsement_rate\":" + std::string(buf_end) + ","
            "\"valid_count\":" + std::to_string(valid_count) + ","
            "\"validation_rate\":" + std::string(buf_val) + ","
            "\"total_coauthors\":" + std::to_string(distinct_coauthors) + "}";

    json += "}";
    return json;
}

} // namespace peai
