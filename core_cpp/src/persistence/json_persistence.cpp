// core_cpp/src/persistence/json_persistence.cpp
// JSON file import/export — no external dependencies (manual serialization).
//
// Schema (sección 33.2 de la especificación — contenido mínimo):
//   groups, researchers, memberships, products, groupProductLinks,
//   validationQueue, undoOperations.

#include "persistence/json_persistence.h"
#include "services/group_service.h"
#include "services/researcher_service.h"
#include "services/product_service.h"
#include "services/undo_stack.h"
#include "services/validation_queue.h"
#include "services/work_plan_service.h"
#include "services/project_service.h"

#include <fstream>
#include <sstream>
#include <iostream>
#include <string>

namespace peai {

// =====================================================================
//  Helpers
// =====================================================================

static std::string json_escape(const std::string& s) {
    std::string out;
    for (char c : s) {
        switch (c) {
            case '"':   out += "\\\"";  break;
            case '\\':  out += "\\\\";  break;
            case '\n':  out += "\\n";   break;
            case '\r':  out += "\\r";   break;
            case '\t':  out += "\\t";   break;
            case '\x1F': out += "\\u001F"; break;  // snapshot field separator
            default:    out += c;
        }
    }
    return out;
}

static std::string json_unescape(const std::string& s) {
    std::string out;
    for (size_t i = 0; i < s.size(); i++) {
        if (s[i] != '\\') { out += s[i]; continue; }
        if (i + 1 >= s.size()) break;
        char n = s[++i];
        switch (n) {
            case '"':  out += '"';  break;
            case '\\': out += '\\'; break;
            case 'n':  out += '\n'; break;
            case 'r':  out += '\r'; break;
            case 't':  out += '\t'; break;
            case 'u':  // \uXXXX — only the control separator we emit (\u001F)
                if (i + 4 < s.size() && s.compare(i + 1, 4, "001F") == 0) {
                    out += '\x1F';
                    i += 4;
                }
                break;
            default:   out += n;   break;
        }
    }
    return out;
}

static std::string read_file_contents(const std::string& path) {
    std::ifstream in(path);
    if (!in.is_open()) return "";
    std::ostringstream ss;
    ss << in.rdbuf();
    return ss.str();
}

// Extract a string value, skipping escaped quotes inside the value.
static std::string extract_string(const std::string& block, const std::string& key) {
    std::string search = "\"" + key + "\": \"";
    auto pos = block.find(search);
    if (pos == std::string::npos) return "";
    pos += search.size();
    std::string raw;
    while (pos < block.size()) {
        char c = block[pos];
        if (c == '\\' && pos + 1 < block.size()) { raw += c; raw += block[pos + 1]; pos += 2; continue; }
        if (c == '"') break;
        raw += c;
        pos++;
    }
    return json_unescape(raw);
}

static int extract_int(const std::string& block, const std::string& key) {
    std::string search = "\"" + key + "\": ";
    auto pos = block.find(search);
    if (pos == std::string::npos) return 0;
    pos += search.size();
    int val = 0;
    bool neg = false;
    if (pos < block.size() && block[pos] == '-') { neg = true; pos++; }
    while (pos < block.size() && block[pos] >= '0' && block[pos] <= '9') {
        val = val * 10 + (block[pos] - '0');
        pos++;
    }
    return neg ? -val : val;
}

static double extract_double(const std::string& block, const std::string& key) {
    std::string search = "\"" + key + "\": ";
    auto pos = block.find(search);
    if (pos == std::string::npos) return 0.0;
    pos += search.size();
    size_t end = pos;
    while (end < block.size() &&
           (isdigit((unsigned char)block[end]) || block[end] == '-' ||
            block[end] == '+' || block[end] == '.' ||
            block[end] == 'e' || block[end] == 'E')) end++;
    try { return std::stod(block.substr(pos, end - pos)); }
    catch (...) { return 0.0; }
}

// Iterate over the JSON objects of an array section: {"key": [ ... ]}.
// Calls fn(block) for each { ... } object, returns number of objects parsed.
template <typename Fn>
static size_t for_each_object(const std::string& content, const std::string& key, Fn fn) {
    std::string marker = "\"" + key + "\": [";
    auto pos = content.find(marker);
    if (pos == std::string::npos) return 0;
    pos += marker.size();
    auto end = content.find(']', pos);
    if (end == std::string::npos) return 0;
    std::string section = content.substr(pos, end - pos);

    size_t count = 0;
    size_t cursor = 0;
    while (true) {
        auto obj_start = section.find('{', cursor);
        if (obj_start == std::string::npos) break;
        auto obj_end = section.find('}', obj_start);
        if (obj_end == std::string::npos) break;
        fn(section.substr(obj_start, obj_end - obj_start + 1));
        count++;
        cursor = obj_end + 1;
    }
    return count;
}

// =====================================================================
//  State cleanup (used before loading)
// =====================================================================

static void clear_all_state() {
    for (const auto& g : list_groups())     delete_group(g.id);
    for (const auto& r : list_researchers()) delete_researcher(r.id);
    for (const auto& p : list_products())  delete_product(p.id);
    for (const auto& p : list_projects())  delete_project(p.id);
    clear_product_authors();
    vq_clear();
    undo_clear();
}

// =====================================================================
//  Export  (structures in memory → JSON file)
// =====================================================================

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

// =====================================================================
//  Load  (JSON file → structures in memory)
// =====================================================================

bool load_from_file(const std::string& path) {
    std::string content = read_file_contents(path);
    if (content.empty()) return false;

    // Clear existing state (all structures — RAM is rebuilt from the file)
    clear_all_state();

    // Groups
    for_each_object(content, "groups", [](const std::string& block) {
        Group g;
        g.id             = extract_int(block, "id");
        g.external_code  = extract_string(block, "external_code");
        g.name           = extract_string(block, "name");
        g.acronym        = extract_string(block, "acronym");
        g.description    = extract_string(block, "description");
        g.classification = extract_string(block, "classification");
        g.status         = extract_string(block, "status");
        if (g.status.empty()) g.status = "active";
        create_group(g);
    });

    // Researchers
    for_each_object(content, "researchers", [](const std::string& block) {
        Researcher r;
        r.id                  = extract_int(block, "id");
        r.external_code       = extract_string(block, "external_code");
        r.first_names         = extract_string(block, "first_names");
        r.last_names          = extract_string(block, "last_names");
        r.institutional_email = extract_string(block, "institutional_email");
        r.status              = extract_string(block, "status");
        if (r.status.empty()) r.status = "active";
        create_researcher(r);
    });

    // Memberships
    for_each_object(content, "memberships", [](const std::string& block) {
        std::string role = extract_string(block, "role");
        if (role.empty()) role = "Investigador";
        std::string start_date = extract_string(block, "start_date");
        std::string end_date = extract_string(block, "end_date");
        add_member_to_group(extract_int(block, "groupId"), extract_int(block, "researcherId"), role, start_date, end_date);
    });

    // Products (20 campos modelo 2024)
    for_each_object(content, "products", [](const std::string& block) {
        Product p;
        p.id                     = extract_int(block, "id");
        p.external_code          = extract_string(block, "external_code");
        p.title                  = extract_string(block, "title");
        p.description            = extract_string(block, "description");
        p.family_id              = extract_int(block, "family_id");
        p.subtype_id             = extract_int(block, "subtype_id");
        p.quality_category_id    = extract_int(block, "quality_category_id");
        p.obtained_date          = extract_string(block, "obtained_date");
        p.publication_date       = extract_string(block, "publication_date");
        p.year                   = extract_int(block, "year");
        p.language               = extract_string(block, "language");
        p.country                = extract_string(block, "country");
        p.doi                    = extract_string(block, "doi");
        p.isbn                   = extract_string(block, "isbn");
        p.issn                   = extract_string(block, "issn");
        p.url                    = extract_string(block, "url");
        p.evidence               = extract_string(block, "evidence");
        p.specialized_attributes = extract_string(block, "specialized_attributes");
        p.validation_status      = extract_string(block, "validation_status");
        if (p.validation_status.empty()) p.validation_status = "pending";
        p.status                 = extract_string(block, "status");
        if (p.status.empty()) p.status = "active";
        create_product(p);
    });

    // Authors (§33.2 / ProductAuthor)
    for_each_object(content, "authors", [](const std::string& block) {
        ProductAuthor a;
        a.id                       = extract_int(block, "id");
        a.productId                = extract_int(block, "productId");
        a.researcherId             = extract_int(block, "researcherId");
        a.authorOrder              = extract_int(block, "authorOrder");
        if (a.authorOrder <= 0) a.authorOrder = 1;
        a.externalAuthorName       = extract_string(block, "externalAuthorName");
        a.externalAuthorIdentifier = extract_string(block, "externalAuthorIdentifier");
        a.matchStatus              = extract_string(block, "matchStatus");
        if (a.matchStatus.empty()) a.matchStatus = "unverified";
        add_product_author(a);
    });

    // Group-product links
    for_each_object(content, "groupProductLinks", [](const std::string& block) {
        link_product_to_group(extract_int(block, "groupId"), extract_int(block, "productId"));
    });

    // Projects (lista global; debe ir antes de los enlaces)
    for_each_object(content, "projects", [](const std::string& block) {
        Project p;
        p.id             = extract_int(block, "id");
        p.title          = extract_string(block, "title");
        p.summary        = extract_string(block, "summary");
        p.project_type   = extract_string(block, "project_type");
        p.start_date     = extract_string(block, "start_date");
        p.end_date       = extract_string(block, "end_date");
        p.status         = extract_string(block, "status");
        if (p.status.empty()) p.status = "active";
        p.funding_type   = extract_string(block, "funding_type");
        p.budget         = extract_double(block, "budget");
        p.principal_investigator_id = extract_int(block, "principal_investigator_id");
        create_project(p);
    });

    // Group-project links
    for_each_object(content, "groupProjectLinks", [](const std::string& block) {
        link_project_to_group(extract_int(block, "groupId"), extract_int(block, "projectId"));
    });

    // Work plans (recorrido Grupo -> planes reconstruido nodo a nodo)
    for_each_object(content, "workPlans", [](const std::string& block) {
        WorkPlan wp;
        wp.id          = extract_int(block, "id");
        wp.group_id    = extract_int(block, "group_id");
        wp.title       = extract_string(block, "title");
        wp.description = extract_string(block, "description");
        wp.start_date  = extract_string(block, "start_date");
        wp.end_date    = extract_string(block, "end_date");
        wp.status      = extract_string(block, "status");
        if (wp.status.empty()) wp.status = "active";
        create_work_plan(wp);
    });

    // Validation queue (enqueue in file order keeps FIFO)
    for_each_object(content, "validationQueue", [](const std::string& block) {
        ValidationQueueItem it;
        it.product_id  = extract_int(block, "product_id");
        it.status      = extract_string(block, "status");
        if (it.status.empty()) it.status = "pending";
        it.attempts    = extract_int(block, "attempts");
        it.assigned_to = extract_string(block, "assigned_to");
        vq_enqueue(it);
    });

    // Undo operations: file is top-first, push in reverse to rebuild LIFO order.
    {
        std::vector<UndoOperation> ops;
        for_each_object(content, "undoOperations", [&](const std::string& block) {
            UndoOperation op;
            op.operation_type = extract_string(block, "operation_type");
            op.entity_type    = extract_string(block, "entity_type");
            op.entity_id      = extract_int(block, "entity_id");
            op.previous_state = extract_string(block, "previous_state");
            ops.push_back(op);
        });
        for (auto it = ops.rbegin(); it != ops.rend(); ++it) {
            undo_push(*it);
        }
    }

    return true;
}

} // namespace peai
