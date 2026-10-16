// core_cpp/src/persistence/db/db_catalogs_analytics.cpp
// SQL analytics: Minciencias product family, subtype, and quality category catalog serialization.

#include "persistence/db_persistence.h"
#include "persistence/db/db_common.h"

#include <string>

namespace peai {

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
