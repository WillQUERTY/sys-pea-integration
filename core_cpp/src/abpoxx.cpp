// core_cpp/src/abpoxx.cpp
// Implementation of the PEA-i core: Group CRUD, multilista traversal,
// JSON persistence and summary reporting.

#include "core.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <iomanip>

namespace peai {

// =====================================================================
//  In-memory storage
// =====================================================================

// Head of the multilista (linked list of groups)
static GroupNode* _groupHead = nullptr;

// Separate flat list for fast ID lookups (mirrors the linked list)
static int _nextGroupId = 1;
static int _nextMembershipId = 1;
static int _nextProductLinkId = 1;

// =====================================================================
//  Internal helpers
// =====================================================================

static GroupNode* find_group_node(int id) {
    GroupNode* cur = _groupHead;
    while (cur) {
        if (cur->data.id == id) return cur;
        cur = cur->nextGroup;
    }
    return nullptr;
}

// =====================================================================
//  Group CRUD
// =====================================================================

Group create_group(const Group& prototype) {
    GroupNode* node = new GroupNode();
    node->data = prototype;
    node->data.id = _nextGroupId++;
    node->nextGroup = nullptr;
    node->firstMember = nullptr;
    node->firstProduct = nullptr;
    node->firstProject = nullptr;
    node->firstPlan = nullptr;

    // Append at the end of the linked list
    if (!_groupHead) {
        _groupHead = node;
    } else {
        GroupNode* tail = _groupHead;
        while (tail->nextGroup) tail = tail->nextGroup;
        tail->nextGroup = node;
    }
    return node->data;
}

std::optional<Group> get_group(int id) {
    GroupNode* node = find_group_node(id);
    if (node) return node->data;
    return std::nullopt;
}

std::vector<Group> list_groups() {
    std::vector<Group> result;
    GroupNode* cur = _groupHead;
    while (cur) {
        result.push_back(cur->data);
        cur = cur->nextGroup;
    }
    return result;
}

bool update_group(int id, const Group& updates) {
    GroupNode* node = find_group_node(id);
    if (!node) return false;
    // Preserve the id, update the rest
    node->data.external_code = updates.external_code;
    node->data.name          = updates.name;
    node->data.acronym       = updates.acronym;
    node->data.description   = updates.description;
    return true;
}

bool delete_group(int id) {
    GroupNode* prev = nullptr;
    GroupNode* cur  = _groupHead;
    while (cur) {
        if (cur->data.id == id) {
            // Unlink
            if (prev) prev->nextGroup = cur->nextGroup;
            else      _groupHead = cur->nextGroup;

            // Free membership chain
            MembershipNode* m = cur->firstMember;
            while (m) { MembershipNode* tmp = m; m = m->nextInGroup; delete tmp; }

            // Free product link chain
            GroupProductNode* p = cur->firstProduct;
            while (p) { GroupProductNode* tmp = p; p = p->nextInGroup; delete tmp; }

            delete cur;
            return true;
        }
        prev = cur;
        cur  = cur->nextGroup;
    }
    return false;
}

// =====================================================================
//  Multilista: membership links  (Group <-> Researcher)
// =====================================================================

MembershipNode* add_member_to_group(int group_id, int researcher_id) {
    GroupNode* gn = find_group_node(group_id);
    if (!gn) return nullptr;

    // Check for duplicates
    MembershipNode* check = gn->firstMember;
    while (check) {
        if (check->data.researcherId == researcher_id) return check; // already linked
        check = check->nextInGroup;
    }

    MembershipNode* node = new MembershipNode();
    node->data.membershipId  = _nextMembershipId++;
    node->data.researcherId  = researcher_id;
    node->nextInGroup        = gn->firstMember;   // prepend
    node->nextForResearcher  = nullptr;            // cross-link (to be wired externally)
    gn->firstMember          = node;
    return node;
}

std::vector<int> members_of_group(int group_id) {
    std::vector<int> ids;
    GroupNode* gn = find_group_node(group_id);
    if (!gn) return ids;
    MembershipNode* m = gn->firstMember;
    while (m) {
        ids.push_back(m->data.researcherId);
        m = m->nextInGroup;
    }
    return ids;
}

std::vector<int> groups_of_researcher(int researcher_id) {
    // Linear scan across all groups (full multilista traversal)
    std::vector<int> ids;
    GroupNode* cur = _groupHead;
    while (cur) {
        MembershipNode* m = cur->firstMember;
        while (m) {
            if (m->data.researcherId == researcher_id) {
                ids.push_back(cur->data.id);
                break;
            }
            m = m->nextInGroup;
        }
        cur = cur->nextGroup;
    }
    return ids;
}

bool remove_member_from_group(int group_id, int researcher_id) {
    GroupNode* gn = find_group_node(group_id);
    if (!gn) return false;

    MembershipNode* prev = nullptr;
    MembershipNode* cur  = gn->firstMember;
    while (cur) {
        if (cur->data.researcherId == researcher_id) {
            if (prev) prev->nextInGroup = cur->nextInGroup;
            else      gn->firstMember = cur->nextInGroup;
            delete cur;
            return true;
        }
        prev = cur;
        cur  = cur->nextInGroup;
    }
    return false;
}

// =====================================================================
//  Multilista: product links  (Group <-> Product)
// =====================================================================

GroupProductNode* link_product_to_group(int group_id, int product_id) {
    GroupNode* gn = find_group_node(group_id);
    if (!gn) return nullptr;

    // Check for duplicates
    GroupProductNode* check = gn->firstProduct;
    while (check) {
        if (check->data.productId == product_id) return check;
        check = check->nextInGroup;
    }

    GroupProductNode* node = new GroupProductNode();
    node->data.linkId     = _nextProductLinkId++;
    node->data.productId  = product_id;
    node->nextInGroup     = gn->firstProduct;   // prepend
    node->nextForProduct  = nullptr;
    gn->firstProduct      = node;
    return node;
}

std::vector<int> products_of_group(int group_id) {
    std::vector<int> ids;
    GroupNode* gn = find_group_node(group_id);
    if (!gn) return ids;
    GroupProductNode* p = gn->firstProduct;
    while (p) {
        ids.push_back(p->data.productId);
        p = p->nextInGroup;
    }
    return ids;
}

bool unlink_product_from_group(int group_id, int product_id) {
    GroupNode* gn = find_group_node(group_id);
    if (!gn) return false;

    GroupProductNode* prev = nullptr;
    GroupProductNode* cur  = gn->firstProduct;
    while (cur) {
        if (cur->data.productId == product_id) {
            if (prev) prev->nextInGroup = cur->nextInGroup;
            else      gn->firstProduct = cur->nextInGroup;
            delete cur;
            return true;
        }
        prev = cur;
        cur  = cur->nextInGroup;
    }
    return false;
}

// =====================================================================
//  Persistence (simple JSON — no external library, manual serialization)
// =====================================================================

// Escape a string for JSON output
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

bool export_to_file(const std::string& path) {
    std::ofstream out(path);
    if (!out.is_open()) return false;

    out << "{\n";
    out << "  \"schemaVersion\": \"1.0\",\n";

    // Groups
    out << "  \"groups\": [\n";
    GroupNode* cur = _groupHead;
    bool first = true;
    while (cur) {
        if (!first) out << ",\n";
        first = false;
        out << "    {"
            << "\"id\": "            << cur->data.id << ", "
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
    cur = _groupHead;
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
    cur = _groupHead;
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

// Minimal JSON token reader (no external dependency)
static std::string read_file_contents(const std::string& path) {
    std::ifstream in(path);
    if (!in.is_open()) return "";
    std::ostringstream ss;
    ss << in.rdbuf();
    return ss.str();
}

// Very simple JSON value extractor — finds "key": <value> for ints and strings.
// This is intentionally minimal; a real project would use nlohmann/json.
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

bool load_from_file(const std::string& path) {
    std::string content = read_file_contents(path);
    if (content.empty()) return false;

    // Free existing data
    while (_groupHead) {
        delete_group(_groupHead->data.id);
    }
    _nextGroupId = 1;
    _nextMembershipId = 1;
    _nextProductLinkId = 1;

    // Parse groups array — find each {...} block inside "groups": [...]
    std::string groups_key = "\"groups\": [";
    auto gpos = content.find(groups_key);
    if (gpos == std::string::npos) return false;
    gpos += groups_key.size();
    auto gend = content.find(']', gpos);

    std::string groups_section = content.substr(gpos, gend - gpos);

    // Iterate over each object block
    size_t cursor = 0;
    while (true) {
        auto obj_start = groups_section.find('{', cursor);
        if (obj_start == std::string::npos) break;
        auto obj_end = groups_section.find('}', obj_start);
        if (obj_end == std::string::npos) break;

        std::string block = groups_section.substr(obj_start, obj_end - obj_start + 1);

        Group g;
        g.id            = 0; // will be overridden by create_group
        g.external_code = extract_string(block, "external_code");
        g.name          = extract_string(block, "name");
        g.acronym       = extract_string(block, "acronym");
        g.description   = extract_string(block, "description");
        create_group(g);

        cursor = obj_end + 1;
    }

    // Parse memberships array
    std::string mem_key = "\"memberships\": [";
    auto mpos = content.find(mem_key);
    if (mpos != std::string::npos) {
        mpos += mem_key.size();
        auto mend = content.find(']', mpos);
        std::string mem_section = content.substr(mpos, mend - mpos);

        size_t mc = 0;
        while (true) {
            auto os = mem_section.find('{', mc);
            if (os == std::string::npos) break;
            auto oe = mem_section.find('}', os);
            if (oe == std::string::npos) break;

            std::string block = mem_section.substr(os, oe - os + 1);
            int gid = extract_int(block, "groupId");
            int rid = extract_int(block, "researcherId");
            add_member_to_group(gid, rid);

            mc = oe + 1;
        }
    }

    // Parse groupProductLinks array
    std::string pl_key = "\"groupProductLinks\": [";
    auto ppos = content.find(pl_key);
    if (ppos != std::string::npos) {
        ppos += pl_key.size();
        auto pend = content.find(']', ppos);
        std::string pl_section = content.substr(ppos, pend - ppos);

        size_t pc = 0;
        while (true) {
            auto os = pl_section.find('{', pc);
            if (os == std::string::npos) break;
            auto oe = pl_section.find('}', os);
            if (oe == std::string::npos) break;

            std::string block = pl_section.substr(os, oe - os + 1);
            int gid = extract_int(block, "groupId");
            int pid = extract_int(block, "productId");
            link_product_to_group(gid, pid);

            pc = oe + 1;
        }
    }

    return true;
}

// =====================================================================
//  Summary / stats
// =====================================================================

int total_groups() {
    int count = 0;
    GroupNode* cur = _groupHead;
    while (cur) { count++; cur = cur->nextGroup; }
    return count;
}

int total_members() {
    int count = 0;
    GroupNode* cur = _groupHead;
    while (cur) {
        MembershipNode* m = cur->firstMember;
        while (m) { count++; m = m->nextInGroup; }
        cur = cur->nextGroup;
    }
    return count;
}

int total_product_links() {
    int count = 0;
    GroupNode* cur = _groupHead;
    while (cur) {
        GroupProductNode* p = cur->firstProduct;
        while (p) { count++; p = p->nextInGroup; }
        cur = cur->nextGroup;
    }
    return count;
}

void print_summary() {
    std::cout << "+----------------------------------+-------+\n";
    std::cout << "| Indicador                        | Total |\n";
    std::cout << "+----------------------------------+-------+\n";
    std::cout << "| Grupos registrados               | "
              << std::setw(5) << total_groups() << " |\n";
    std::cout << "| Vinculaciones (memberships)      | "
              << std::setw(5) << total_members() << " |\n";
    std::cout << "| Enlaces grupo-producto           | "
              << std::setw(5) << total_product_links() << " |\n";
    std::cout << "+----------------------------------+-------+\n";
}

} // namespace peai
