// core_cpp/src/persistence/db/db_group_analytics.cpp
// SQL analytics: Research group metrics, temporal trends, family distribution, and researcher rankings.

#include "persistence/db_persistence.h"
#include "persistence/db/db_common.h"

#include <cstdio>
#include <string>

namespace peai {

// =====================================================================
//  Group Statistics JSON
// =====================================================================

std::string get_group_stats_json(const std::string& connection_string, int group_id) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return "{}";

    std::string gid = group_db_id(group_id);
    SQLHSTMT stmt;
    std::string json = "{";

    // 1. Total de Productos del Grupo
    int total_products = 0;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_tot_p = "SELECT COUNT(DISTINCT gpl.product_id) FROM GroupProductLink gpl "
                          "JOIN Product p ON gpl.product_id = p.id "
                          "WHERE gpl.group_id = " + gid + " AND p.status != 'inactive'";
    SQLExecDirect(stmt, (SQLCHAR*)q_tot_p.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind;
        SQLGetData(stmt, 1, SQL_C_LONG, &total_products, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    json += "\"total_products\":" + std::to_string(total_products);

    // 2. Total de Integrantes del Grupo
    int total_members = 0;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_tot_m = "SELECT COUNT(DISTINCT gm.researcher_id) FROM GroupMembership gm "
                          "JOIN Researcher r ON gm.researcher_id = r.id "
                          "WHERE gm.group_id = " + gid + " AND r.status != 'inactive'";
    SQLExecDirect(stmt, (SQLCHAR*)q_tot_m.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind;
        SQLGetData(stmt, 1, SQL_C_LONG, &total_members, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    json += ",\"total_members\":" + std::to_string(total_members);

    // 3. Serie temporal (by_year)
    json += ",\"by_year\":[";
    bool first = true;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_by_year = "SELECT COALESCE(NULLIF(LEFT(p.obtained_date, 4), ''), NULLIF(LEFT(p.publication_date, 4), ''), 'Sin fecha') AS yr, "
                            "COUNT(DISTINCT p.id) AS cnt "
                            "FROM Product p "
                            "JOIN GroupProductLink gpl ON p.id = gpl.product_id "
                            "WHERE gpl.group_id = " + gid + " AND p.status != 'inactive' "
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

    // 4. Familias de Productos Minciencias (GNC, DTI, ASC, DPC, FRH)
    json += ",\"families_distribution\":[";
    first = true;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_fam = "SELECT pf.code, pf.name, COUNT(DISTINCT p.id) AS cnt "
                        "FROM Product p "
                        "JOIN GroupProductLink gpl ON p.id = gpl.product_id "
                        "JOIN ProductFamily pf ON p.family_id = pf.id "
                        "WHERE gpl.group_id = " + gid + " AND p.status != 'inactive' "
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

    // 5. Nivel de Formacion Academica de los Investigadores del Grupo
    json += ",\"researchers_education\":[";
    first = true;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_edu = "SELECT "
                        "  CASE "
                        "    WHEN r.highest_education_level LIKE 'Doc%' THEN 'Doctorado' "
                        "    WHEN r.highest_education_level LIKE 'Maest%' THEN 'Maestría' "
                        "    WHEN r.highest_education_level LIKE 'Esp%' THEN 'Especialización' "
                        "    ELSE 'Pregrado' "
                        "  END AS edu_tier, "
                        "  COUNT(DISTINCT r.id) AS cnt "
                        "FROM Researcher r "
                        "JOIN GroupMembership gm ON r.id = gm.researcher_id "
                        "WHERE gm.group_id = " + gid + " AND r.status != 'inactive' "
                        "GROUP BY "
                        "  CASE "
                        "    WHEN r.highest_education_level LIKE 'Doc%' THEN 'Doctorado' "
                        "    WHEN r.highest_education_level LIKE 'Maest%' THEN 'Maestría' "
                        "    WHEN r.highest_education_level LIKE 'Esp%' THEN 'Especialización' "
                        "    ELSE 'Pregrado' "
                        "  END "
                        "ORDER BY cnt DESC";
    SQLExecDirect(stmt, (SQLCHAR*)q_edu.c_str(), SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        char eduname[128] = {0}; int educnt = 0; SQLLEN i1, i2;
        SQLGetData(stmt, 1, SQL_C_CHAR, eduname, sizeof(eduname), &i1);
        SQLGetData(stmt, 2, SQL_C_LONG, &educnt, 0, &i2);
        double pct = total_members > 0 ? (educnt * 100.0 / total_members) : 0.0;
        char buf_pct[32]; snprintf(buf_pct, sizeof(buf_pct), "%.1f", pct);
        if (!first) json += ",";
        json += "{\"level\":\"" + json_escape(eduname) + "\"" +
                ",\"count\":" + std::to_string(educnt) +
                ",\"percentage\":" + std::string(buf_pct) + "}";
        first = false;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    json += "]";

    // 6. Top Investigadores por Impacto y Produccion en el Grupo (Top 12)
    json += ",\"top_researchers\":[";
    first = true;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_top_res = "SELECT TOP 12 "
                            "  r.id, "
                            "  ISNULL(r.first_names, ''), "
                            "  ISNULL(r.last_names, ''), "
                            "  ISNULL(r.highest_education_level, 'Pregrado'), "
                            "  ISNULL(r.orcid, ''), "
                            "  ISNULL(gm.role, 'Integrante'), "
                            "  COUNT(DISTINCT gpl.product_id) AS prod_in_group, "
                            "  COUNT(DISTINCT pa.product_id) AS prod_total "
                            "FROM Researcher r "
                            "JOIN GroupMembership gm ON r.id = gm.researcher_id AND gm.group_id = " + gid + " "
                            "LEFT JOIN ProductAuthor pa ON r.id = pa.researcher_id "
                            "LEFT JOIN GroupProductLink gpl ON pa.product_id = gpl.product_id AND gpl.group_id = " + gid + " "
                            "LEFT JOIN Product p ON pa.product_id = p.id AND p.status != 'inactive' "
                            "WHERE r.status != 'inactive' "
                            "GROUP BY r.id, r.first_names, r.last_names, r.highest_education_level, r.orcid, gm.role "
                            "ORDER BY prod_in_group DESC, prod_total DESC";
    SQLExecDirect(stmt, (SQLCHAR*)q_top_res.c_str(), SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        int rid = 0, in_grp_cnt = 0, tot_auth_cnt = 0;
        char fname[128] = {0}, lname[128] = {0}, edu[128] = {0}, orcid[64] = {0}, role[64] = {0};
        SQLLEN i0, i1, i2, i3, i4, i5, i6, i7;
        SQLGetData(stmt, 1, SQL_C_LONG, &rid, 0, &i0);
        SQLGetData(stmt, 2, SQL_C_CHAR, fname, sizeof(fname), &i1);
        SQLGetData(stmt, 3, SQL_C_CHAR, lname, sizeof(lname), &i2);
        SQLGetData(stmt, 4, SQL_C_CHAR, edu, sizeof(edu), &i3);
        SQLGetData(stmt, 5, SQL_C_CHAR, orcid, sizeof(orcid), &i4);
        SQLGetData(stmt, 6, SQL_C_CHAR, role, sizeof(role), &i5);
        SQLGetData(stmt, 7, SQL_C_LONG, &in_grp_cnt, 0, &i6);
        SQLGetData(stmt, 8, SQL_C_LONG, &tot_auth_cnt, 0, &i7);

        std::string full_name = cp1252_to_utf8((std::string(fname) + " " + std::string(lname)).c_str());
        std::string edu_utf8 = cp1252_to_utf8(edu);
        std::string role_utf8 = cp1252_to_utf8(role);
        double pct_grp = total_products > 0 ? (in_grp_cnt * 100.0 / total_products) : 0.0;
        char buf_pct[32]; snprintf(buf_pct, sizeof(buf_pct), "%.1f", pct_grp);

        if (!first) json += ",";
        json += "{\"id\":" + std::to_string(rid) +
                ",\"name\":\"" + json_escape(full_name) + "\"" +
                ",\"highest_education\":\"" + json_escape(edu_utf8) + "\"" +
                ",\"orcid\":\"" + json_escape(orcid) + "\"" +
                ",\"role\":\"" + json_escape(role_utf8) + "\"" +
                ",\"products_count\":" + std::to_string(in_grp_cnt) +
                ",\"total_authored_count\":" + std::to_string(tot_auth_cnt) +
                ",\"percentage_of_group\":" + std::string(buf_pct) + "}";
        first = false;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    json += "]";

    // 7. Top Subtipologias del Grupo (Top 6)
    json += ",\"top_subtypes\":[";
    first = true;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_sub = "SELECT TOP 6 ps.id, ISNULL(ps.code, ''), ISNULL(ps.name, ''), COUNT(DISTINCT p.id) "
                        "FROM Product p "
                        "JOIN GroupProductLink gpl ON p.id = gpl.product_id "
                        "JOIN ProductSubtype ps ON p.subtype_id = ps.id "
                        "WHERE gpl.group_id = " + gid + " AND p.status != 'inactive' "
                        "GROUP BY ps.id, ps.code, ps.name "
                        "ORDER BY COUNT(DISTINCT p.id) DESC";
    SQLExecDirect(stmt, (SQLCHAR*)q_sub.c_str(), SQL_NTS);
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

    // 8. Ratios Estrategicos del Grupo
    int endorsed_count = 0;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_end = "SELECT COUNT(DISTINCT p.id) FROM Product p "
                        "JOIN GroupProductLink gpl ON p.id = gpl.product_id "
                        "WHERE gpl.group_id = " + gid + " AND p.is_endorsed = 1 AND p.status != 'inactive'";
    SQLExecDirect(stmt, (SQLCHAR*)q_end.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &endorsed_count, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    int valid_count = 0;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_val = "SELECT COUNT(DISTINCT p.id) FROM Product p "
                        "JOIN GroupProductLink gpl ON p.id = gpl.product_id "
                        "WHERE gpl.group_id = " + gid + " AND p.validation_status = 'valid' AND p.status != 'inactive'";
    SQLExecDirect(stmt, (SQLCHAR*)q_val.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &valid_count, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    int postgraduate_count = 0;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_post = "SELECT COUNT(DISTINCT r.id) FROM Researcher r "
                         "JOIN GroupMembership gm ON r.id = gm.researcher_id "
                         "WHERE gm.group_id = " + gid + " AND r.status != 'inactive' AND "
                         "(r.highest_education_level LIKE 'Doc%' OR r.highest_education_level LIKE 'Maest%' OR r.highest_education_level LIKE 'Esp%')";
    SQLExecDirect(stmt, (SQLCHAR*)q_post.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &postgraduate_count, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    int orcid_count = 0;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_orc = "SELECT COUNT(DISTINCT r.id) FROM Researcher r "
                        "JOIN GroupMembership gm ON r.id = gm.researcher_id "
                        "WHERE gm.group_id = " + gid + " AND r.status != 'inactive' AND "
                        "r.orcid IS NOT NULL AND r.orcid <> ''";
    SQLExecDirect(stmt, (SQLCHAR*)q_orc.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &orcid_count, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    double endorsement_rate = total_products > 0 ? (endorsed_count * 100.0 / total_products) : 0.0;
    double validation_rate = total_products > 0 ? (valid_count * 100.0 / total_products) : 0.0;
    double postgraduate_rate = total_members > 0 ? (postgraduate_count * 100.0 / total_members) : 0.0;
    double avg_prod = total_members > 0 ? (static_cast<double>(total_products) / total_members) : 0.0;
    double orcid_rate = total_members > 0 ? (orcid_count * 100.0 / total_members) : 0.0;

    char buf_end[32], buf_val[32], buf_post[32], buf_avg[32], buf_orc[32];
    snprintf(buf_end, sizeof(buf_end), "%.1f", endorsement_rate);
    snprintf(buf_val, sizeof(buf_val), "%.1f", validation_rate);
    snprintf(buf_post, sizeof(buf_post), "%.1f", postgraduate_rate);
    snprintf(buf_avg, sizeof(buf_avg), "%.1f", avg_prod);
    snprintf(buf_orc, sizeof(buf_orc), "%.1f", orcid_rate);

    json += ",\"strategic_ratios\":{"
            "\"endorsed_count\":" + std::to_string(endorsed_count) + ","
            "\"endorsement_rate\":" + std::string(buf_end) + ","
            "\"valid_count\":" + std::to_string(valid_count) + ","
            "\"validation_rate\":" + std::string(buf_val) + ","
            "\"postgraduate_count\":" + std::to_string(postgraduate_count) + ","
            "\"postgraduate_rate\":" + std::string(buf_post) + ","
            "\"avg_products_per_member\":" + std::string(buf_avg) + ","
            "\"orcid_count\":" + std::to_string(orcid_count) + ","
            "\"orcid_coverage_rate\":" + std::string(buf_orc) + "}";

    json += "}";
    return json;
}

} // namespace peai
