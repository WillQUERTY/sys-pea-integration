// core_cpp/src/persistence/db/db_network_analytics.cpp
// SQL analytics: Group coauthorship network graph, nodes, edges, density, and cohesion metrics.

#include "persistence/db_persistence.h"
#include "persistence/db/db_common.h"

#include <cstdio>
#include <string>
#include <unordered_map>
#include <vector>

namespace peai {

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

} // namespace peai
