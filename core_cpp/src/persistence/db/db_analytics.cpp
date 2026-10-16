// core_cpp/src/persistence/db/db_analytics.cpp
// SQL analytics, executive reporting, network graph queries, and catalog JSON serialization.

#include "persistence/db_persistence.h"
#include "persistence/db/db_common.h"

#include <cstdio>
#include <string>
#include <unordered_map>
#include <vector>

namespace peai {

// =====================================================================
//  Dashboard Statistics JSON
// =====================================================================

std::string get_dashboard_stats_json(const std::string& connection_string) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return "{}";

    int total_groups = 0, total_researchers = 0, total_products = 0;
    SQLHSTMT stmt;

    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)"SELECT COUNT(*) FROM ResearchGroup WHERE status != 'inactive'", SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) { SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &total_groups, 0, &ind); }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)"SELECT COUNT(*) FROM Researcher WHERE status != 'inactive'", SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) { SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &total_researchers, 0, &ind); }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)"SELECT COUNT(*) FROM Product WHERE status != 'inactive'", SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) { SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &total_products, 0, &ind); }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    std::string json = "{\"total_groups\":" + std::to_string(total_groups) +
           ",\"total_researchers\":" + std::to_string(total_researchers) +
           ",\"total_products\":" + std::to_string(total_products);

    // Productos por estado de validacion
    json += ",\"validation\":{";
    bool first = true;
    for (auto& row : query_group_counts(dbc,
            "SELECT ISNULL(validation_status, 'pending'), COUNT(*) FROM Product WHERE status != 'inactive' GROUP BY ISNULL(validation_status, 'pending')")) {
        if (!first) json += ",";
        json += "\"" + json_escape(row.first) + "\":" + std::to_string(row.second);
        first = false;
    }
    json += "}";

    // Productos por anio (publication_date con fallback a obtained_date)
    json += ",\"by_year\":[";
    first = true;
    for (auto& row : query_group_counts(dbc,
            "SELECT ISNULL(YEAR(publication_date), YEAR(obtained_date)), COUNT(*) FROM Product WHERE status != 'inactive' GROUP BY ISNULL(YEAR(publication_date), YEAR(obtained_date)) ORDER BY 1")) {
        if (row.first.empty()) continue;
        if (!first) json += ",";
        json += "{\"year\":\"" + json_escape(row.first) + "\",\"count\":" + std::to_string(row.second) + "}";
        first = false;
    }
    json += "]";

    // Grupos por clasificacion
    json += ",\"groups_by_classification\":{";
    first = true;
    for (auto& row : query_group_counts(dbc,
            "SELECT ISNULL(NULLIF(LTRIM(RTRIM(classification)), ''), 'Sin clasificar'), COUNT(*) FROM ResearchGroup WHERE status != 'inactive' GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(classification)), ''), 'Sin clasificar')")) {
        if (!first) json += ",";
        json += "\"" + json_escape(row.first) + "\":" + std::to_string(row.second);
        first = false;
    }
    json += "}";

    // Modelo de Medicion 2024
    int endorsed_products = 0, researchers_with_orcid = 0, postgraduate_count = 0, total_projects = 0;
    int products_without_subtype = 0, products_with_quality = 0;

    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)"SELECT "
        "(SELECT COUNT(*) FROM Product WHERE status != 'inactive' AND (specialized_attributes LIKE '%\"avalado\": true%' OR specialized_attributes LIKE '%\"aval\": true%' OR evidence LIKE '%avalado%')), "
        "(SELECT COUNT(*) FROM Researcher WHERE status != 'inactive' AND NULLIF(LTRIM(RTRIM(orcid)), '') IS NOT NULL), "
        "(SELECT COUNT(*) FROM Researcher WHERE status != 'inactive' AND (highest_education_level LIKE 'Doc%' OR highest_education_level LIKE 'Maest%' OR highest_education_level LIKE 'Esp%')), "
        "(SELECT COUNT(*) FROM Project WHERE status != 'inactive'), "
        "(SELECT COUNT(*) FROM Product WHERE status != 'inactive' AND ISNULL(subtype_id, 0) = 0), "
        "(SELECT COUNT(*) FROM Product WHERE status != 'inactive' AND ISNULL(quality_category_id, 0) > 0)", SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind;
        SQLGetData(stmt, 1, SQL_C_LONG, &endorsed_products, 0, &ind);
        SQLGetData(stmt, 2, SQL_C_LONG, &researchers_with_orcid, 0, &ind);
        SQLGetData(stmt, 3, SQL_C_LONG, &postgraduate_count, 0, &ind);
        SQLGetData(stmt, 4, SQL_C_LONG, &total_projects, 0, &ind);
        SQLGetData(stmt, 5, SQL_C_LONG, &products_without_subtype, 0, &ind);
        SQLGetData(stmt, 6, SQL_C_LONG, &products_with_quality, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    json += ",\"modelo_2024\":{"
            "\"products_without_subtype\":" + std::to_string(products_without_subtype) + ","
            "\"products_with_quality\":" + std::to_string(products_with_quality) + ","
            "\"endorsed_products\":" + std::to_string(endorsed_products) + ","
            "\"researchers_with_orcid\":" + std::to_string(researchers_with_orcid) + ","
            "\"total_projects\":" + std::to_string(total_projects) + "}";

    // Familias de Productos Minciencias 2024
    struct FamilyStat {
        int id;
        std::string code;
        std::string name;
        int count;
    };
    std::vector<FamilyStat> fam_stats;
    int total_classified_fam = 0;

    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)"SELECT pf.id, ISNULL(pf.code, ''), ISNULL(pf.name, ''), COUNT(p.id) "
        "FROM ProductFamily pf "
        "LEFT JOIN Product p ON p.family_id = pf.id AND p.status != 'inactive' "
        "GROUP BY pf.id, pf.code, pf.name, pf.sort_order "
        "ORDER BY ISNULL(pf.sort_order, 9999), pf.name", SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        int fid = 0, fcnt = 0; char fcode[64] = {0}; char fname[256] = {0}; SQLLEN i1, i2, i3, i4;
        SQLGetData(stmt, 1, SQL_C_LONG, &fid, 0, &i1);
        SQLGetData(stmt, 2, SQL_C_CHAR, fcode, sizeof(fcode), &i2);
        SQLGetData(stmt, 3, SQL_C_CHAR, fname, sizeof(fname), &i3);
        SQLGetData(stmt, 4, SQL_C_LONG, &fcnt, 0, &i4);
        fam_stats.push_back({fid, i2 != SQL_NULL_DATA ? fcode : "", i3 != SQL_NULL_DATA ? cp1252_to_utf8(fname) : "", fcnt});
        total_classified_fam += fcnt;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    json += ",\"families_distribution\":[";
    first = true;
    for (const auto& f : fam_stats) {
        if (!first) json += ",";
        double pct = total_classified_fam > 0 ? (f.count * 100.0 / total_classified_fam) : 0.0;
        char pbuf[32]; snprintf(pbuf, sizeof(pbuf), "%.1f", pct);
        json += "{\"family_id\":" + std::to_string(f.id) +
                ",\"code\":\"" + json_escape(f.code) + "\"" +
                ",\"name\":\"" + json_escape(f.name) + "\"" +
                ",\"count\":" + std::to_string(f.count) +
                ",\"percentage\":" + pbuf + "}";
        first = false;
    }
    json += "]";

    // Formacion Academica del Talento Humano
    json += ",\"researchers_education\":[";
    first = true;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)"SELECT ISNULL(NULLIF(LTRIM(RTRIM(highest_education_level)), ''), 'Sin especificar'), COUNT(*) "
        "FROM Researcher WHERE status != 'inactive' "
        "GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(highest_education_level)), ''), 'Sin especificar') "
        "ORDER BY COUNT(*) DESC", SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        char elvl[256] = {0}; int ecnt = 0; SQLLEN i1, i2;
        SQLGetData(stmt, 1, SQL_C_CHAR, elvl, sizeof(elvl), &i1);
        SQLGetData(stmt, 2, SQL_C_LONG, &ecnt, 0, &i2);
        std::string lvl_utf8 = i1 != SQL_NULL_DATA ? cp1252_to_utf8(elvl) : "";
        if (!first) json += ",";
        double pct = total_researchers > 0 ? (ecnt * 100.0 / total_researchers) : 0.0;
        char pbuf[32]; snprintf(pbuf, sizeof(pbuf), "%.1f", pct);
        json += "{\"level\":\"" + json_escape(lvl_utf8) + "\"" +
                ",\"count\":" + std::to_string(ecnt) +
                ",\"percentage\":" + pbuf + "}";
        first = false;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    json += "]";

    // Top Tipologias de Produccion Cientifica
    json += ",\"top_subtypes\":[";
    first = true;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)"SELECT TOP 8 ps.id, ISNULL(ps.code, ''), ISNULL(ps.name, ''), COUNT(p.id) "
        "FROM ProductSubtype ps "
        "JOIN Product p ON p.subtype_id = ps.id AND p.status != 'inactive' "
        "GROUP BY ps.id, ps.code, ps.name "
        "ORDER BY COUNT(p.id) DESC", SQL_NTS);
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

    // Ratios Estrategicos Institucionales
    double endorsement_rate = total_products > 0 ? (endorsed_products * 100.0 / total_products) : 0.0;
    double postgraduate_rate = total_researchers > 0 ? (postgraduate_count * 100.0 / total_researchers) : 0.0;
    double avg_prod = total_researchers > 0 ? (static_cast<double>(total_products) / total_researchers) : 0.0;
    double orcid_rate = total_researchers > 0 ? (researchers_with_orcid * 100.0 / total_researchers) : 0.0;

    char buf_end[32], buf_post[32], buf_avg[32], buf_orc[32];
    snprintf(buf_end, sizeof(buf_end), "%.1f", endorsement_rate);
    snprintf(buf_post, sizeof(buf_post), "%.1f", postgraduate_rate);
    snprintf(buf_avg, sizeof(buf_avg), "%.1f", avg_prod);
    snprintf(buf_orc, sizeof(buf_orc), "%.1f", orcid_rate);

    json += ",\"strategic_ratios\":{"
            "\"endorsement_rate\":" + std::string(buf_end) + ","
            "\"postgraduate_rate\":" + std::string(buf_post) + ","
            "\"avg_products_per_researcher\":" + std::string(buf_avg) + ","
            "\"orcid_coverage_rate\":" + std::string(buf_orc) + "}";

    json += "}";
    return json;
}

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

// =====================================================================
//  Collaboration Network Graph JSON
// =====================================================================

std::string get_group_collaboration_network_json(const std::string& connection_string, int group_id) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return "{\"nodes\":[],\"edges\":[],\"metrics\":{\"total_nodes\":0,\"total_edges\":0,\"isolated_nodes\":0,\"density\":0.0,\"max_weight\":0,\"cohesion_index\":0.0}}";

    std::string gid_expr = group_db_id(group_id);
    SQLHSTMT stmt;

    // 0. Resolver ID real de base de datos
    int db_gid = 0;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_grp = "SELECT " + gid_expr;
    if (SQL_SUCCEEDED(SQLExecDirect(stmt, (SQLCHAR*)q_grp.c_str(), SQL_NTS))) {
        if (SQLFetch(stmt) == SQL_SUCCESS) {
            SQLLEN ind;
            SQLGetData(stmt, 1, SQL_C_LONG, &db_gid, 0, &ind);
        }
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    if (db_gid <= 0) db_gid = group_id;
    std::string s_gid = std::to_string(db_gid);

    // 1. Obtener Nodos (Investigadores del Grupo)
    struct NetworkNode {
        int id;
        std::string name;
        std::string education;
        std::string role;
        int products_count;
        int degree = 0;
    };
    std::vector<NetworkNode> nodes;
    std::unordered_map<int, size_t> node_index_map;

    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_nodes = 
        "SELECT r.id, "
        "       ISNULL(r.first_names, ''), "
        "       ISNULL(r.last_names, ''), "
        "       ISNULL(r.highest_education_level, 'Pregrado'), "
        "       ISNULL(gm.role, 'Integrante'), "
        "       COUNT(DISTINCT gpl.product_id) AS prod_in_group "
        "FROM GroupMembership gm "
        "JOIN Researcher r ON gm.researcher_id = r.id AND r.status != 'inactive' "
        "LEFT JOIN GroupProductLink gpl ON gpl.group_id = " + s_gid + " AND gpl.product_id IN ("
        "   SELECT pa.product_id FROM ProductAuthor pa "
        "   JOIN Product p ON pa.product_id = p.id "
        "   WHERE pa.researcher_id = r.id AND p.status != 'inactive'"
        ") "
        "WHERE gm.group_id = " + s_gid + " "
        "GROUP BY r.id, r.first_names, r.last_names, r.highest_education_level, gm.role "
        "ORDER BY prod_in_group DESC, r.last_names ASC";

    SQLExecDirect(stmt, (SQLCHAR*)q_nodes.c_str(), SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        int rid = 0, prod_cnt = 0;
        char cfname[128] = {0}; char clname[128] = {0}; char cedu[128] = {0}; char crole[128] = {0};
        SQLLEN i1, i2, i3, i4, i5, i6;
        SQLGetData(stmt, 1, SQL_C_LONG, &rid, 0, &i1);
        SQLGetData(stmt, 2, SQL_C_CHAR, cfname, sizeof(cfname), &i2);
        SQLGetData(stmt, 3, SQL_C_CHAR, clname, sizeof(clname), &i3);
        SQLGetData(stmt, 4, SQL_C_CHAR, cedu, sizeof(cedu), &i4);
        SQLGetData(stmt, 5, SQL_C_CHAR, crole, sizeof(crole), &i5);
        SQLGetData(stmt, 6, SQL_C_LONG, &prod_cnt, 0, &i6);

        std::string full_name = (i2 != SQL_NULL_DATA ? cp1252_to_utf8(cfname) : "") + " " +
                                (i3 != SQL_NULL_DATA ? cp1252_to_utf8(clname) : "");
        while (!full_name.empty() && full_name.front() == ' ') full_name.erase(0, 1);
        while (!full_name.empty() && full_name.back() == ' ') full_name.pop_back();

        std::string edu_utf8 = i4 != SQL_NULL_DATA ? cp1252_to_utf8(cedu) : "Pregrado";
        std::string role_utf8 = i5 != SQL_NULL_DATA ? cp1252_to_utf8(crole) : "Integrante";

        node_index_map[rid] = nodes.size();
        nodes.push_back({rid, full_name, edu_utf8, role_utf8, prod_cnt, 0});
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    // 2. Obtener Enlaces (Coautorias entre miembros del Grupo)
    struct NetworkEdge {
        int source;
        int target;
        int weight;
    };
    std::vector<NetworkEdge> edges;
    int max_weight = 0;

    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    std::string q_edges = 
        "SELECT pa1.researcher_id AS source, "
        "       pa2.researcher_id AS target, "
        "       COUNT(DISTINCT pa1.product_id) AS weight "
        "FROM ProductAuthor pa1 "
        "JOIN ProductAuthor pa2 ON pa1.product_id = pa2.product_id AND pa1.researcher_id < pa2.researcher_id "
        "JOIN GroupMembership gm1 ON pa1.researcher_id = gm1.researcher_id AND gm1.group_id = " + s_gid + " "
        "JOIN GroupMembership gm2 ON pa2.researcher_id = gm2.researcher_id AND gm2.group_id = " + s_gid + " "
        "JOIN Product p ON pa1.product_id = p.id AND p.status != 'inactive' "
        "GROUP BY pa1.researcher_id, pa2.researcher_id "
        "HAVING COUNT(DISTINCT pa1.product_id) > 0 "
        "ORDER BY weight DESC";

    SQLExecDirect(stmt, (SQLCHAR*)q_edges.c_str(), SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        int src = 0, tgt = 0, w = 0;
        SQLLEN i1, i2, i3;
        SQLGetData(stmt, 1, SQL_C_LONG, &src, 0, &i1);
        SQLGetData(stmt, 2, SQL_C_LONG, &tgt, 0, &i2);
        SQLGetData(stmt, 3, SQL_C_LONG, &w, 0, &i3);

        edges.push_back({src, tgt, w});
        if (w > max_weight) max_weight = w;

        auto it1 = node_index_map.find(src);
        if (it1 != node_index_map.end()) nodes[it1->second].degree++;
        auto it2 = node_index_map.find(tgt);
        if (it2 != node_index_map.end()) nodes[it2->second].degree++;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    // 3. Metricas de Red
    int total_nodes = static_cast<int>(nodes.size());
    int total_edges = static_cast<int>(edges.size());
    int isolated_nodes = 0;
    for (const auto& n : nodes) {
        if (n.degree == 0) isolated_nodes++;
    }
    double max_possible_edges = total_nodes > 1 ? (total_nodes * (total_nodes - 1)) / 2.0 : 0.0;
    double density = max_possible_edges > 0.0 ? (total_edges / max_possible_edges) : 0.0;
    double cohesion_index = density * 100.0;

    char buf_den[32], buf_coh[32];
    snprintf(buf_den, sizeof(buf_den), "%.4f", density);
    snprintf(buf_coh, sizeof(buf_coh), "%.1f", cohesion_index);

    // 4. Construir JSON
    std::string json = "{";
    json += "\"nodes\":[";
    for (size_t i = 0; i < nodes.size(); ++i) {
        if (i > 0) json += ",";
        json += "{\"id\":" + std::to_string(nodes[i].id) +
                ",\"name\":\"" + json_escape(nodes[i].name) + "\"" +
                ",\"education\":\"" + json_escape(nodes[i].education) + "\"" +
                ",\"role\":\"" + json_escape(nodes[i].role) + "\"" +
                ",\"products_count\":" + std::to_string(nodes[i].products_count) +
                ",\"degree\":" + std::to_string(nodes[i].degree) + "}";
    }
    json += "],\"edges\":[";
    for (size_t i = 0; i < edges.size(); ++i) {
        if (i > 0) json += ",";
        json += "{\"source\":" + std::to_string(edges[i].source) +
                ",\"target\":" + std::to_string(edges[i].target) +
                ",\"weight\":" + std::to_string(edges[i].weight) + "}";
    }
    json += "],\"metrics\":{"
            "\"total_nodes\":" + std::to_string(total_nodes) + ","
            "\"total_edges\":" + std::to_string(total_edges) + ","
            "\"isolated_nodes\":" + std::to_string(isolated_nodes) + ","
            "\"max_weight\":" + std::to_string(max_weight) + ","
            "\"density\":" + std::string(buf_den) + ","
            "\"cohesion_index\":" + std::string(buf_coh) + "}}";

    return json;
}

// =====================================================================
//  Product Catalogs JSON
// =====================================================================

std::string get_product_catalogs_json(const std::string& connection_string) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return "{}";

    std::string json = "{\"families\":[";
    query_catalog(dbc, "SELECT id, name FROM ProductFamily ORDER BY name", false, json);
    json += "],\"subtypes\":[";
    query_catalog(dbc, "SELECT id, family_id, name FROM ProductSubtype ORDER BY name", true, json);
    json += "],\"quality_categories\":[";
    query_catalog(dbc, "SELECT id, name FROM QualityCategory ORDER BY name", false, json);
    json += "]}";
    return json;
}

} // namespace peai
