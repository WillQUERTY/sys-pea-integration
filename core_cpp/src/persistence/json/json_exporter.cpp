// core_cpp/src/persistence/json/json_exporter.cpp
// In-memory multilista structures serialization to JSON file (export_to_file).

#include "persistence/json_persistence.h"
#include "persistence/json/json_common.h"
#include "services/group_service.h"
#include "services/researcher_service.h"
#include "services/product_service.h"
#include "services/undo_stack.h"
#include "services/validation_queue.h"
#include "services/work_plan_service.h"
#include "services/project_service.h"

#include <fstream>

namespace peai {

bool export_to_file(const std::string& path) {
    std::ofstream out(path);
    if (!out.is_open()) return false;

    out << "{\n";
    out << "  \"schemaVersion\": \"1.2\",\n";

    // Groups
    out << "  \"groups\": [\n";
    bool first = true;
    for (const auto& g : list_groups()) {
        if (!first) out << ",\n";
        first = false;
        out << "    {"
            << "\"id\": "              << g.id << ", "
            << "\"external_code\": \"" << json_escape(g.external_code) << "\", "
            << "\"name\": \""          << json_escape(g.name) << "\", "
            << "\"acronym\": \""       << json_escape(g.acronym) << "\", "
            << "\"description\": \""   << json_escape(g.description) << "\", "
            << "\"classification\": \"" << json_escape(g.classification) << "\", "
            << "\"status\": \""        << json_escape(g.status) << "\""
            << "}";
    }
    out << "\n  ],\n";

    // Researchers
    out << "  \"researchers\": [\n";
    first = true;
    for (const auto& r : list_researchers()) {
        if (!first) out << ",\n";
        first = false;
        out << "    {"
            << "\"id\": "                 << r.id << ", "
            << "\"external_code\": \""    << json_escape(r.external_code) << "\", "
            << "\"first_names\": \""      << json_escape(r.first_names) << "\", "
            << "\"last_names\": \""       << json_escape(r.last_names) << "\", "
            << "\"institutional_email\": \"" << json_escape(r.institutional_email) << "\", "
            << "\"status\": \""           << json_escape(r.status) << "\""
            << "}";
    }
    out << "\n  ],\n";

    // Memberships
    out << "  \"memberships\": [\n";
    first = true;
    for (const auto& g : list_groups()) {
        for (int rid : members_of_group(g.id)) {
            if (!first) out << ",\n";
            first = false;
            auto det = membership_details(g.id, rid);
            out << "    {"
                << "\"groupId\": "      << g.id << ", "
                << "\"researcherId\": " << rid << ", ";
            if (det) {
                out << "\"role\": \"" << json_escape(det->role) << "\", "
                    << "\"start_date\": \"" << json_escape(det->start_date) << "\", "
                    << "\"end_date\": \"" << json_escape(det->end_date) << "\"";
            } else {
                out << "\"role\": \"Investigador\", "
                    << "\"start_date\": \"\", "
                    << "\"end_date\": \"\"";
            }
            out << "}";
        }
    }
    out << "\n  ],\n";

    // Products (20 campos del modelo 2024 / Minciencias)
    out << "  \"products\": [\n";
    first = true;
    for (const auto& p : list_products()) {
        if (!first) out << ",\n";
        first = false;
        out << "    {"
            << "\"id\": "                     << p.id << ", "
            << "\"external_code\": \""        << json_escape(p.external_code) << "\", "
            << "\"title\": \""                << json_escape(p.title) << "\", "
            << "\"description\": \""          << json_escape(p.description) << "\", "
            << "\"family_id\": "              << p.family_id << ", "
            << "\"subtype_id\": "             << p.subtype_id << ", "
            << "\"quality_category_id\": "    << p.quality_category_id << ", "
            << "\"obtained_date\": \""        << json_escape(p.obtained_date) << "\", "
            << "\"publication_date\": \""     << json_escape(p.publication_date) << "\", "
            << "\"year\": "                   << p.year << ", "
            << "\"language\": \""             << json_escape(p.language) << "\", "
            << "\"country\": \""              << json_escape(p.country) << "\", "
            << "\"doi\": \""                  << json_escape(p.doi) << "\", "
            << "\"isbn\": \""                 << json_escape(p.isbn) << "\", "
            << "\"issn\": \""                 << json_escape(p.issn) << "\", "
            << "\"url\": \""                  << json_escape(p.url) << "\", "
            << "\"evidence\": \""             << json_escape(p.evidence) << "\", "
            << "\"specialized_attributes\": \"" << json_escape(p.specialized_attributes) << "\", "
            << "\"validation_status\": \""    << json_escape(p.validation_status) << "\", "
            << "\"status\": \""               << json_escape(p.status) << "\""
            << "}";
    }
    out << "\n  ],\n";

    // Authors (§33.2 / ProductAuthor)
    out << "  \"authors\": [\n";
    first = true;
    for (const auto& a : list_all_product_authors()) {
        if (!first) out << ",\n";
        first = false;
        out << "    {"
            << "\"id\": "                         << a.id << ", "
            << "\"productId\": "                  << a.productId << ", "
            << "\"researcherId\": "               << a.researcherId << ", "
            << "\"authorOrder\": "                << a.authorOrder << ", "
            << "\"externalAuthorName\": \""       << json_escape(a.externalAuthorName) << "\", "
            << "\"externalAuthorIdentifier\": \"" << json_escape(a.externalAuthorIdentifier) << "\", "
            << "\"matchStatus\": \""              << json_escape(a.matchStatus) << "\""
            << "}";
    }
    out << "\n  ],\n";

    // Group-product links
    out << "  \"groupProductLinks\": [\n";
    first = true;
    for (const auto& g : list_groups()) {
        for (int pid : products_of_group(g.id)) {
            if (!first) out << ",\n";
            first = false;
            out << "    {"
                << "\"groupId\": "   << g.id << ", "
                << "\"productId\": " << pid
                << "}";
        }
    }
    out << "\n  ],\n";

    // Projects (lista global de ProjectNode)
    out << "  \"projects\": [\n";
    first = true;
    for (const auto& p : list_projects()) {
        if (!first) out << ",\n";
        first = false;
        out << "    {"
            << "\"id\": "               << p.id << ", "
            << "\"title\": \""          << json_escape(p.title) << "\", "
            << "\"summary\": \""        << json_escape(p.summary) << "\", "
            << "\"project_type\": \""   << json_escape(p.project_type) << "\", "
            << "\"start_date\": \""     << json_escape(p.start_date) << "\", "
            << "\"end_date\": \""       << json_escape(p.end_date) << "\", "
            << "\"status\": \""         << json_escape(p.status) << "\", "
            << "\"funding_type\": \""   << json_escape(p.funding_type) << "\", "
            << "\"budget\": "           << p.budget << ", "
            << "\"principal_investigator_id\": " << p.principal_investigator_id
            << "}";
    }
    out << "\n  ],\n";

    // Group-project links (multilista Grupo -> proyectos)
    out << "  \"groupProjectLinks\": [\n";
    first = true;
    for (const auto& g : list_groups()) {
        for (int pid : projects_of_group(g.id)) {
            if (!first) out << ",\n";
            first = false;
            out << "    {"
                << "\"groupId\": "   << g.id << ", "
                << "\"projectId\": " << pid
                << "}";
        }
    }
    out << "\n  ],\n";

    // Work plans (multilista Grupo -> planes, T-08)
    out << "  \"workPlans\": [\n";
    first = true;
    for (const auto& wp : list_work_plans()) {
        if (!first) out << ",\n";
        first = false;
        out << "    {"
            << "\"id\": "             << wp.id << ", "
            << "\"group_id\": "       << wp.group_id << ", "
            << "\"title\": \""        << json_escape(wp.title) << "\", "
            << "\"description\": \""  << json_escape(wp.description) << "\", "
            << "\"start_date\": \""   << json_escape(wp.start_date) << "\", "
            << "\"end_date\": \""     << json_escape(wp.end_date) << "\", "
            << "\"status\": \""       << json_escape(wp.status) << "\""
            << "}";
    }
    out << "\n  ],\n";

    // Validation queue (FIFO order: front first)
    out << "  \"validationQueue\": [\n";
    first = true;
    for (const auto& it : vq_list()) {
        if (!first) out << ",\n";
        first = false;
        out << "    {"
            << "\"product_id\": "    << it.product_id << ", "
            << "\"status\": \""      << json_escape(it.status) << "\", "
            << "\"attempts\": "      << it.attempts << ", "
            << "\"assigned_to\": \"" << json_escape(it.assigned_to) << "\""
            << "}";
    }
    out << "\n  ],\n";

    // Undo operations (top first; reloaded in reverse to preserve LIFO order)
    out << "  \"undoOperations\": [\n";
    first = true;
    for (const auto& op : undo_list()) {
        if (!first) out << ",\n";
        first = false;
        out << "    {"
            << "\"operation_type\": \"" << json_escape(op.operation_type) << "\", "
            << "\"entity_type\": \""    << json_escape(op.entity_type) << "\", "
            << "\"entity_id\": "        << op.entity_id << ", "
            << "\"previous_state\": \"" << json_escape(op.previous_state) << "\""
            << "}";
    }
    out << "\n  ]\n";

    out << "}\n";
    out.close();
    return true;
}

} // namespace peai
