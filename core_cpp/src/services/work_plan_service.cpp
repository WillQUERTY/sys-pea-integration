// core_cpp/src/services/work_plan_service.cpp
// WorkPlan CRUD — planes de trabajo por grupo (Requerimiento 3 / T-08).
// Cada plan es un PlanNode en la cadena firstPlan del GroupNode dueño
// (multilista manual, igual que integrantes y productos).

#include "services/work_plan_service.h"
#include "services/group_service.h"

namespace peai {

static int _nextPlanId = 1;

// Localiza el nodo de plan recorriendo la cadena firstPlan de cada grupo.
static PlanNode* find_plan_node(int id, GroupNode** owner_out = nullptr) {
    GroupNode* g = get_group_head();
    while (g) {
        PlanNode* p = g->firstPlan;
        while (p) {
            if (p->data.id == id) {
                if (owner_out) *owner_out = g;
                return p;
            }
            p = p->next;
        }
        g = g->nextGroup;
    }
    return nullptr;
}

WorkPlan create_work_plan(const WorkPlan& prototype) {
    GroupNode* gn = get_group_head();
    while (gn && gn->data.id != prototype.group_id) gn = gn->nextGroup;
    if (!gn) return WorkPlan{};   // el grupo debe existir

    PlanNode* node = new PlanNode();
    node->data     = prototype;
    if (prototype.id > 0) {
        node->data.id = prototype.id;
        if (prototype.id >= _nextPlanId) _nextPlanId = prototype.id + 1;
    } else {
        node->data.id = _nextPlanId++;
    }
    if (node->data.status.empty()) node->data.status = "active";

    // Prepend a la cadena de planes del grupo
    node->next    = gn->firstPlan;
    gn->firstPlan = node;
    return node->data;
}

std::optional<WorkPlan> get_work_plan(int id) {
    PlanNode* node = find_plan_node(id);
    if (node) return node->data;
    return std::nullopt;
}

std::vector<WorkPlan> list_work_plans() {
    std::vector<WorkPlan> result;
    GroupNode* g = get_group_head();
    while (g) {
        PlanNode* p = g->firstPlan;
        while (p) { result.push_back(p->data); p = p->next; }
        g = g->nextGroup;
    }
    return result;
}

std::vector<WorkPlan> plans_of_group(int group_id) {
    std::vector<WorkPlan> result;
    GroupNode* g = get_group_head();
    while (g && g->data.id != group_id) g = g->nextGroup;
    if (!g) return result;
    PlanNode* p = g->firstPlan;
    while (p) { result.push_back(p->data); p = p->next; }
    return result;
}

bool update_work_plan(int id, const WorkPlan& updates) {
    PlanNode* node = find_plan_node(id);
    if (!node) return false;
    node->data.title       = updates.title;
    node->data.description = updates.description;
    node->data.start_date  = updates.start_date;
    node->data.end_date    = updates.end_date;
    node->data.status      = updates.status;
    return true;
}

bool delete_work_plan(int id) {
    GroupNode* g = get_group_head();
    while (g) {
        PlanNode* prev = nullptr;
        PlanNode* cur  = g->firstPlan;
        while (cur) {
            if (cur->data.id == id) {
                if (prev) prev->next = cur->next;
                else      g->firstPlan = cur->next;
                delete cur;
                return true;
            }
            prev = cur;
            cur  = cur->next;
        }
        g = g->nextGroup;
    }
    return false;
}

int total_work_plans() {
    int count = 0;
    GroupNode* g = get_group_head();
    while (g) {
        PlanNode* p = g->firstPlan;
        while (p) { count++; p = p->next; }
        g = g->nextGroup;
    }
    return count;
}

} // namespace peai
