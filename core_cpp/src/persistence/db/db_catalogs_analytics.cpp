// core_cpp/src/persistence/db/db_catalogs_analytics.cpp
// SQL analytics: Minciencias product family, subtype, and quality category catalog serialization.
//
// El catálogo 2024 (database/catalog_2024.json) tiene una forma rica: code,
// model_ref, subtipo, clase de medición, pesos y orden del modelo. La lectura
// desde SQL Server expone ESA misma forma, que es la que consumen el frontend
// (selectores de tipología y categoría) y el evaluador oficial (categoría de
// calidad validada -> código del catálogo). Si la base de datos está en el
// esquema legacy (sin la extensión 2024), se cae al respaldo de solo
// id/nombre para no dejar el catálogo vacío.

#include "persistence/db_persistence.h"
#include "persistence/db/db_common.h"

#include <string>
#include <vector>

namespace peai {

// =====================================================================
//  Product Catalogs JSON
// =====================================================================

std::string get_product_catalogs_json(const std::string& connection_string) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return "{}";

    std::string json = "{\"families\":[";

    static const std::vector<CatalogColumn> FAMILIAS = {
        {"id", "id", 0},
        {"code", "code", 1},
        {"name", "name", 1},
        {"sort_order", "sort_order", 0},
    };
    static const std::vector<CatalogColumn> SUBTIPOS = {
        {"id", "id", 0},
        {"family_id", "family_id", 0},
        {"code", "code", 1},
        {"name", "name", 1},
        {"model_ref", "model_ref", 1},
        {"sort_order", "sort_order", 0},
    };
    static const std::vector<CatalogColumn> CATEGORIAS = {
        {"id", "id", 0},
        {"code", "code", 1},
        {"name", "name", 1},
        {"subtype_id", "subtype_id", 0},
        {"measurement_class", "measurement_class", 1},
        {"weight", "weight", 2},
        {"global_weight", "global_weight", 2},
        {"sort_order", "sort_order", 0},
    };

    // Orden del modelo 2024: familia -> tipología -> categoría.
    const char* sql_familias =
        "SELECT id, code, name, sort_order FROM ProductFamily ORDER BY sort_order, id";
    const char* sql_subtipos =
        "SELECT ps.id, ps.family_id, ps.code, ps.name, ps.model_ref, ps.sort_order "
        "FROM ProductSubtype ps LEFT JOIN ProductFamily pf ON pf.id = ps.family_id "
        "ORDER BY pf.sort_order, ps.sort_order, ps.id";
    const char* sql_categorias =
        "SELECT qc.id, qc.code, qc.name, qc.subtype_id, qc.measurement_class, "
        "qc.weight, qc.global_weight, qc.sort_order "
        "FROM QualityCategory qc "
        "LEFT JOIN ProductSubtype ps ON ps.id = qc.subtype_id "
        "LEFT JOIN ProductFamily pf ON pf.id = ps.family_id "
        "ORDER BY pf.sort_order, ps.sort_order, qc.sort_order, qc.id";

    if (!query_catalog_rows(dbc, sql_familias, FAMILIAS, json))
        query_catalog(dbc, "SELECT id, name FROM ProductFamily ORDER BY name", false, json);
    json += "],\"subtypes\":[";
    if (!query_catalog_rows(dbc, sql_subtipos, SUBTIPOS, json))
        query_catalog(dbc, "SELECT id, family_id, name FROM ProductSubtype ORDER BY name", true, json);
    json += "],\"quality_categories\":[";
    if (!query_catalog_rows(dbc, sql_categorias, CATEGORIAS, json))
        query_catalog(dbc, "SELECT id, name FROM QualityCategory ORDER BY name", false, json);
    json += "]}";
    return json;
}

} // namespace peai
