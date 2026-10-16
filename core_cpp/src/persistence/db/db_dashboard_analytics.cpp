// core_cpp/src/persistence/db/db_dashboard_analytics.cpp
// SQL analytics: Institutional dashboard overview, Minciencias model indicators, and strategic ratios.

#include "persistence/db_persistence.h"
#include "persistence/db/db_common.h"

#include <cstdio>
#include <string>
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

} // namespace peai
