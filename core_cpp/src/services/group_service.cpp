// core_cpp/src/services/group_service.cpp
// Group CRUD, multilista traversal and summary statistics.
// All data lives in a manually managed linked list (academic requirement).

#include "services/group_service.h"
#include "entities/project.h"   // PlanNode (cadena de planes del grupo)
#include "services/researcher_service.h"
#include "services/product_service.h"
#include "services/undo_stack.h"
#include "services/validation_queue.h"
#include "services/work_plan_service.h"
#include "services/project_service.h"
#include <iostream>
#include <iomanip>
#include <algorithm>

namespace peai {

// =====================================================================
//  In-memory storage (linked list head + id counters)
// =====================================================================

static GroupNode* _groupHead          = nullptr;
static int        _nextGroupId        = 1;
static int        _nextMembershipId   = 1;
static int        _nextProductLinkId  = 1;

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

GroupNode* get_group_head() { return _groupHead; }

// =====================================================================
//  Group CRUD
// =====================================================================

Group create_group(const Group& prototype) {
    GroupNode* node  = new GroupNode();
    node->data       = prototype;
    if (prototype.id > 0) {
        node->data.id = prototype.id;
        if (prototype.id >= _nextGroupId) _nextGroupId = prototype.id + 1;
    } else {
        node->data.id = _nextGroupId++;
    }

    // Entidades creadas por API pueden venir sin external_code; el MERGE de
    // sync_group_to_db hace match por external_code, asi que se auto-genera
    // uno unico para garantizar idempotencia del write-through.
    if (node->data.external_code.empty()) {
        node->data.external_code = "API-GRP-" + std::to_string(node->data.id);
    }

    // Append at end of linked list
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
    node->data.external_code          = updates.external_code;
    node->data.name                   = updates.name;
    node->data.acronym                = updates.acronym;
    node->data.description            = updates.description;
    node->data.mission                = updates.mission;
    node->data.vision                 = updates.vision;
    node->data.declared_creation_date = updates.declared_creation_date;
    node->data.knowledge_area         = updates.knowledge_area;
    node->data.knowledge_subarea      = updates.knowledge_subarea;
    node->data.city                   = updates.city;
    node->data.department             = updates.department;
    node->data.website                = updates.website;
    node->data.email                  = updates.email;
    node->data.institution            = updates.institution;
    node->data.classification         = updates.classification;
    node->data.leader_id              = updates.leader_id;
    node->data.status                 = updates.status;
    return true;
}

bool delete_group(int id) {
    GroupNode* prev = nullptr;
    GroupNode* cur  = _groupHead;
    while (cur) {
        if (cur->data.id == id) {
            if (prev) prev->nextGroup = cur->nextGroup;
            else      _groupHead = cur->nextGroup;

            // Free membership chain
            MembershipNode* m = cur->firstMember;
            while (m) { auto* tmp = m; m = m->nextInGroup; delete tmp; }

            // Free product link chain
            GroupProductNode* p = cur->firstProduct;
            while (p) { auto* tmp = p; p = p->nextInGroup; delete tmp; }

            // Free project link chain (multilista Grupo -> proyectos)
            GroupProjectNode* pj = cur->firstProject;
            while (pj) { auto* tmp = pj; pj = pj->nextInGroup; delete tmp; }

            // Free work plan chain (multilista Grupo -> planes)
            PlanNode* pl = cur->firstPlan;
            while (pl) { auto* tmp = pl; pl = pl->next; delete tmp; }

            delete cur;
            return true;
        }
        prev = cur;
        cur  = cur->nextGroup;
    }
    return false;
}

// =====================================================================
//  Multilista: membership links (Group <-> Researcher)
// =====================================================================

MembershipNode* add_member_to_group(int group_id, int researcher_id) {
    GroupNode* gn = find_group_node(group_id);
    if (!gn) return nullptr;

    // Duplicate check
    MembershipNode* check = gn->firstMember;
    while (check) {
        if (check->data.researcherId == researcher_id) return check;
        check = check->nextInGroup;
    }

    auto* node             = new MembershipNode();
    node->data.membershipId = _nextMembershipId++;
    node->data.researcherId = researcher_id;
    node->nextInGroup       = gn->firstMember;   // prepend
    gn->firstMember         = node;
    return node;
}

std::vector<int> members_of_group(int group_id) {
    std::vector<int> ids;
    GroupNode* gn = find_group_node(group_id);
    if (!gn) return ids;
    MembershipNode* m = gn->firstMember;
    while (m) { ids.push_back(m->data.researcherId); m = m->nextInGroup; }
    return ids;
}

std::vector<int> groups_of_researcher(int researcher_id) {
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
//  Multilista: product links (Group <-> Product)
// =====================================================================

GroupProductNode* link_product_to_group(int group_id, int product_id) {
    GroupNode* gn = find_group_node(group_id);
    if (!gn) return nullptr;

    GroupProductNode* check = gn->firstProduct;
    while (check) {
        if (check->data.productId == product_id) return check;
        check = check->nextInGroup;
    }

    auto* node          = new GroupProductNode();
    node->data.linkId   = _nextProductLinkId++;
    node->data.productId = product_id;
    node->nextInGroup    = gn->firstProduct;
    gn->firstProduct     = node;
    return node;
}

std::vector<int> products_of_group(int group_id) {
    std::vector<int> ids;
    GroupNode* gn = find_group_node(group_id);
    if (!gn) return ids;
    GroupProductNode* p = gn->firstProduct;
    while (p) { ids.push_back(p->data.productId); p = p->nextInGroup; }
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

// Resumen en tablas y números (Requerimiento 12a — esquema descriptivo C++).
void print_summary() {
    // Grupos activos: recorrido de la lista de grupos.
    int active_groups = 0;
    {
        GroupNode* cur = _groupHead;
        while (cur) {
            if (cur->data.status == "active") active_groups++;
            cur = cur->nextGroup;
        }
    }

    // Investigadores activos (servicio de investigadores).
    int active_researchers = 0;
    for (const auto& r : list_researchers()) {
        if (r.status == "active") active_researchers++;
    }

    // Productos: registrados / validados / pendientes (servicio de productos).
    int registered = 0, valid = 0, pending = 0;
    for (const auto& p : list_products()) {
        registered++;
        if      (p.validation_status == "valid")   valid++;
        else if (p.validation_status == "pending") pending++;
    }

    std::cout << "+----------------------------------+-------+\n";
    std::cout << "| Indicador                        | Total |\n";
    std::cout << "+----------------------------------+-------+\n";
    std::cout << "| Grupos activos                   | " << std::setw(5) << active_groups    << " |\n";
    std::cout << "| Investigadores activos            | " << std::setw(5) << active_researchers << " |\n";
    std::cout << "| Productos registrados            | " << std::setw(5) << registered      << " |\n";
    std::cout << "| Productos validados               | " << std::setw(5) << valid           << " |\n";
    std::cout << "| Productos pendientes              | " << std::setw(5) << pending         << " |\n";
    std::cout << "| Planes de trabajo               | " << std::setw(5) << total_work_plans() << " |\n";
    std::cout << "| Proyectos registrados           | " << std::setw(5) << total_projects() << " |\n";
    std::cout << "| Vinculaciones (memberships)      | " << std::setw(5) << total_members()   << " |\n";
    std::cout << "| Enlaces grupo-producto            | " << std::setw(5) << total_product_links() << " |\n";
    std::cout << "| Cola de validación (pendientes)   | " << std::setw(5) << vq_pending_count() << " |\n";
    std::cout << "| Pila de operaciones (undo)        | " << std::setw(5) << undo_size()        << " |\n";
    std::cout << "+----------------------------------+-------+\n";
}

} // namespace peai
