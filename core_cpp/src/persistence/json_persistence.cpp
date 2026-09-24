// core_cpp/src/persistence/json_persistence.cpp
// JSON file import/export — no external dependencies (manual serialization).

#include "persistence/json_persistence.h"
#include "services/group_service.h"

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
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n";  break;
            case '\t': out += "\\t";  break;
            default:   out += c;
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

static std::string extract_string(const std::string& block, const std::string& key) {
    std::string search = "\"" + key + "\": \"";
    auto pos = block.find(search);
    if (pos == std::string::npos) return "";
    pos += search.size();
    auto end = block.find('"', pos);
    if (end == std::string::npos) return "";
    return block.substr(pos, end - pos);
}

static int extract_int(const std::string& block, const std::string& key) {
    std::string search = "\"" + key + "\": ";
    auto pos = block.find(search);
    if (pos == std::string::npos) return 0;
    pos += search.size();
    int val = 0;
    while (pos < block.size() && block[pos] >= '0' && block[pos] <= '9') {
        val = val * 10 + (block[pos] - '0');
        pos++;
    }
    return val;
}

// =====================================================================
//  Export  (multilista in memory → JSON file)
// =====================================================================

bool export_to_file(const std::string& path) {
    std::ofstream out(path);
    if (!out.is_open()) return false;

    out << "{\n";
    out << "  \"schemaVersion\": \"1.0\",\n";

    // Groups
    out << "  \"groups\": [\n";
    GroupNode* cur = get_group_head();
    bool first = true;
    while (cur) {
        if (!first) out << ",\n";
        first = false;
        out << "    {"
            << "\"id\": "              << cur->data.id << ", "
            << "\"external_code\": \"" << json_escape(cur->data.external_code) << "\", "
            << "\"name\": \""          << json_escape(cur->data.name) << "\", "
            << "\"acronym\": \""       << json_escape(cur->data.acronym) << "\", "
            << "\"description\": \""   << json_escape(cur->data.description) << "\""
            << "}";
        cur = cur->nextGroup;
    }
    out << "\n  ],\n";

    // Memberships
    out << "  \"memberships\": [\n";
    cur = get_group_head();
    first = true;
    while (cur) {
        MembershipNode* m = cur->firstMember;
        while (m) {
            if (!first) out << ",\n";
            first = false;
            out << "    {"
                << "\"membershipId\": " << m->data.membershipId << ", "
                << "\"groupId\": "      << cur->data.id << ", "
                << "\"researcherId\": " << m->data.researcherId
                << "}";
            m = m->nextInGroup;
        }
        cur = cur->nextGroup;
    }
    out << "\n  ],\n";

    // Product links
    out << "  \"groupProductLinks\": [\n";
    cur = get_group_head();
    first = true;
    while (cur) {
        GroupProductNode* p = cur->firstProduct;
        while (p) {
            if (!first) out << ",\n";
            first = false;
            out << "    {"
                << "\"linkId\": "    << p->data.linkId << ", "
                << "\"groupId\": "   << cur->data.id << ", "
                << "\"productId\": " << p->data.productId
                << "}";
            p = p->nextInGroup;
        }
        cur = cur->nextGroup;
    }
    out << "\n  ]\n";

    out << "}\n";
    out.close();
    return true;
}

// =====================================================================
//  Load  (JSON file → multilista in memory)
// =====================================================================

bool load_from_file(const std::string& path) {
    std::string content = read_file_contents(path);
    if (content.empty()) return false;

    // Clear existing state
    while (!list_groups().empty()) {
        delete_group(list_groups()[0].id);
    }

    // Parse groups array
    std::string groups_key = "\"groups\": [";
    auto gpos = content.find(groups_key);
    if (gpos == std::string::npos) return false;
    gpos += groups_key.size();
    auto gend = content.find(']', gpos);
    std::string groups_section = content.substr(gpos, gend - gpos);

    size_t cursor = 0;
    while (true) {
        auto obj_start = groups_section.find('{', cursor);
        if (obj_start == std::string::npos) break;
        auto obj_end = groups_section.find('}', obj_start);
        if (obj_end == std::string::npos) break;

        std::string block = groups_section.substr(obj_start, obj_end - obj_start + 1);
        Group g;
        g.external_code = extract_string(block, "external_code");
        g.name          = extract_string(block, "name");
        g.acronym       = extract_string(block, "acronym");
        g.description   = extract_string(block, "description");
        create_group(g);
        cursor = obj_end + 1;
    }

    // Parse memberships
    std::string mem_key = "\"memberships\": [";
    auto mpos = content.find(mem_key);
    if (mpos != std::string::npos) {
        mpos += mem_key.size();
        auto mend = content.find(']', mpos);
        std::string section = content.substr(mpos, mend - mpos);
        size_t mc = 0;
        while (true) {
            auto os = section.find('{', mc);
            if (os == std::string::npos) break;
            auto oe = section.find('}', os);
            if (oe == std::string::npos) break;
            std::string block = section.substr(os, oe - os + 1);
            add_member_to_group(extract_int(block, "groupId"), extract_int(block, "researcherId"));
            mc = oe + 1;
        }
    }

    // Parse product links
    std::string pl_key = "\"groupProductLinks\": [";
    auto ppos = content.find(pl_key);
    if (ppos != std::string::npos) {
        ppos += pl_key.size();
        auto pend = content.find(']', ppos);
        std::string section = content.substr(ppos, pend - ppos);
        size_t pc = 0;
        while (true) {
            auto os = section.find('{', pc);
            if (os == std::string::npos) break;
            auto oe = section.find('}', os);
            if (oe == std::string::npos) break;
            std::string block = section.substr(os, oe - os + 1);
            link_product_to_group(extract_int(block, "groupId"), extract_int(block, "productId"));
            pc = oe + 1;
        }
    }

    return true;
}

} // namespace peai
