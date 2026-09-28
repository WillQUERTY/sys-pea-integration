// core_cpp/src/services/undo_stack.cpp
// Undo operation stack — manually managed singly-linked list (LIFO).
// undo_perform() reverts the last operation pushed by the C++ side (CLI).

#include "services/undo_stack.h"
#include "services/group_service.h"
#include "services/researcher_service.h"
#include "services/product_service.h"
#include "services/work_plan_service.h"
#include "services/project_service.h"

#include <iostream>

namespace peai {

// =====================================================================
//  Stack node (singly linked list)
// =====================================================================

struct UndoNode {
    UndoOperation data;
    UndoNode*     next = nullptr;
};

static UndoNode* _stackTop = nullptr;
static int       _stackSize = 0;
static int       _nextUndoId = 1;

// Field separator for snapshots (unit separator: never appears in user data).
static const char* SEP = "\x1F";

// =====================================================================
//  Stack operations
// =====================================================================

void undo_push(const UndoOperation& op) {
    auto* node   = new UndoNode();
    node->data   = op;
    node->data.id = _nextUndoId++;
    node->next   = _stackTop;
    _stackTop    = node;
    _stackSize++;
}

std::optional<UndoOperation> undo_top() {
    if (!_stackTop) return std::nullopt;
    return _stackTop->data;
}

std::optional<UndoOperation> undo_pop() {
    if (!_stackTop) return std::nullopt;
    UndoNode* node = _stackTop;
    _stackTop = node->next;
    _stackSize--;
    UndoOperation op = node->data;
    delete node;
    return op;
}

std::vector<UndoOperation> undo_list() {
    std::vector<UndoOperation> result;
    UndoNode* cur = _stackTop;
    while (cur) {
        result.push_back(cur->data);
        cur = cur->next;
    }
    return result;
}

int undo_size() { return _stackSize; }

void undo_clear() {
    while (_stackTop) {
        UndoNode* tmp = _stackTop;
        _stackTop = tmp->next;
        delete tmp;
    }
    _stackSize = 0;
}

// =====================================================================
//  Snapshot helpers (CLI pushes these before mutating an entity)
// =====================================================================

static void join(std::string& out, const std::string& field) {
    if (!out.empty()) out += SEP;
    out += field;
}

std::string undo_snapshot_group(const Group& g) {
    std::string s;
    join(s, std::to_string(g.id));
    join(s, g.external_code);
    join(s, g.name);
    join(s, g.acronym);
    join(s, g.description);
    join(s, g.classification);
    join(s, g.status);
    return s;
}

std::string undo_snapshot_researcher(const Researcher& r) {
    std::string s;
    join(s, std::to_string(r.id));
    join(s, r.external_code);
    join(s, r.first_names);
    join(s, r.last_names);
    join(s, r.institutional_email);
    join(s, r.status);
    return s;
}

std::string undo_snapshot_product(const Product& p) {
    std::string s;
    join(s, std::to_string(p.id));
    join(s, p.external_code);
    join(s, p.title);
    join(s, p.obtained_date);
    join(s, std::to_string(p.year));
    join(s, p.validation_status);
    join(s, p.status);
    return s;
}

std::string undo_snapshot_work_plan(const WorkPlan& wp) {
    std::string s;
    join(s, std::to_string(wp.id));
    join(s, std::to_string(wp.group_id));
    join(s, wp.title);
    join(s, wp.description);
    join(s, wp.start_date);
    join(s, wp.end_date);
    join(s, wp.status);
    return s;
}

std::string undo_snapshot_project(const Project& p) {
    std::string s;
    join(s, std::to_string(p.id));
    join(s, p.title);
    join(s, p.summary);
    join(s, p.project_type);
    join(s, p.start_date);
    join(s, p.end_date);
    join(s, p.status);
    join(s, p.funding_type);
    join(s, std::to_string(p.budget));
    join(s, std::to_string(p.principal_investigator_id));
    return s;
}

// =====================================================================
//  Revert logic
// =====================================================================

namespace {

// Split a snapshot into its \x1F-separated fields.
std::vector<std::string> split_snapshot(const std::string& s) {
    std::vector<std::string> fields;
    size_t start = 0;
    while (true) {
        auto pos = s.find(SEP, start);
        if (pos == std::string::npos) {
            fields.push_back(s.substr(start));
            break;
        }
        fields.push_back(s.substr(start, pos - start));
        start = pos + 1;
    }
    return fields;
}

// Parse "<a>:<b>" pair stored by the CLI link/unlink operations.
bool parse_pair(const std::string& s, int& a, int& b) {
    auto pos = s.find(':');
    if (pos == std::string::npos) return false;
    try {
        a = std::stoi(s.substr(0, pos));
        b = std::stoi(s.substr(pos + 1));
    } catch (...) {
        return false;
    }
    return true;
}

bool revert_delete(const UndoOperation& op) {
    auto f = split_snapshot(op.previous_state);
    auto at = [&](size_t i) { return i < f.size() ? f[i] : std::string(); };
    int id = 0;
    try { id = std::stoi(at(0)); } catch (...) {}

    if (op.entity_type == "Group") {
        Group g;
        g.id             = id;
        g.external_code  = at(1);
        g.name           = at(2);
        g.acronym        = at(3);
        g.description    = at(4);
        g.classification = at(5);
        g.status         = at(6);
        create_group(g);
        return true;
    }
    if (op.entity_type == "Researcher") {
        Researcher r;
        r.id                 = id;
        r.external_code      = at(1);
        r.first_names        = at(2);
        r.last_names         = at(3);
        r.institutional_email = at(4);
        r.status             = at(5);
        create_researcher(r);
        return true;
    }
    if (op.entity_type == "Product") {
        Product p;
        p.id                = id;
        p.external_code     = at(1);
        p.title             = at(2);
        p.obtained_date     = at(3);
        try { p.year = std::stoi(at(4)); } catch (...) {}
        p.validation_status = at(5);
        p.status            = at(6);
        create_product(p);
        return true;
    }
    if (op.entity_type == "WorkPlan") {
        WorkPlan wp;
        wp.id          = id;
        try { wp.group_id = std::stoi(at(1)); } catch (...) {}
        wp.title       = at(2);
        wp.description = at(3);
        wp.start_date  = at(4);
        wp.end_date    = at(5);
        wp.status      = at(6);
        if (wp.title.empty()) return false;
        create_work_plan(wp);
        return true;
    }
    if (op.entity_type == "Project") {
        Project p;
        p.id          = id;
        p.title       = at(1);
        p.summary     = at(2);
        p.project_type = at(3);
        p.start_date  = at(4);
        p.end_date    = at(5);
        p.status      = at(6);
        p.funding_type = at(7);
        try { p.budget = std::stod(at(8)); } catch (...) {}
        try { p.principal_investigator_id = std::stoi(at(9)); } catch (...) {}
        if (p.title.empty()) return false;
        create_project(p);
        return true;
    }
    return false;
}

} // namespace

bool undo_perform() {
    auto op = undo_pop();
    if (!op) {
        std::cerr << "[UNDO] Stack is empty, nothing to undo.\n";
        return false;
    }

    const std::string& t    = op->operation_type;
    const std::string& e    = op->entity_type;
    const int          id   = op->entity_id;
    const std::string& prev = op->previous_state;

    // CREATE → the undo is to delete what was created.
    if (t == "CREATE") {
        bool ok = false;
        if      (e == "Group")      ok = delete_group(id);
        else if (e == "Researcher") ok = delete_researcher(id);
        else if (e == "Product")    ok = delete_product(id);
        else if (e == "WorkPlan")   ok = delete_work_plan(id);
        else if (e == "Project")    ok = delete_project(id);
        std::cout << "[UNDO] CREATE " << e << " #" << id
                  << (ok ? " revertido: entidad eliminada.\n"
                          : " (ya no existe, nada que revertir).\n");
        return ok;
    }

    // UPDATE → restore the captured fields in place. Fields not captured by
    // the snapshot (mission, city, doi, ...) keep their current value, so the
    // entity is fetched first and only the snapshot fields are overlaid.
    if (t == "UPDATE") {
        if (prev.empty() || prev.front() == '{') {
            std::cerr << "[UNDO] UPDATE " << e << " #" << id
                      << ": previous_state no es un snapshot C++ válido.\n";
            return false;
        }
        auto f = split_snapshot(prev);
        auto at = [&](size_t i) { return i < f.size() ? f[i] : std::string(); };

        if (e == "Group") {
            auto cur = get_group(id);
            if (!cur) { std::cerr << "[UNDO] UPDATE: grupo " << id << " no encontrado.\n"; return false; }
            Group restored = *cur;
            restored.external_code  = at(1);
            restored.name           = at(2);
            restored.acronym        = at(3);
            restored.description    = at(4);
            restored.classification = at(5);
            restored.status         = at(6);
            update_group(id, restored);
        } else if (e == "Researcher") {
            auto cur = get_researcher(id);
            if (!cur) { std::cerr << "[UNDO] UPDATE: investigador " << id << " no encontrado.\n"; return false; }
            Researcher restored = *cur;
            restored.external_code       = at(1);
            restored.first_names         = at(2);
            restored.last_names          = at(3);
            restored.institutional_email = at(4);
            restored.status              = at(5);
            update_researcher(id, restored);
        } else if (e == "Product") {
            auto cur = get_product(id);
            if (!cur) { std::cerr << "[UNDO] UPDATE: producto " << id << " no encontrado.\n"; return false; }
            Product restored = *cur;
            restored.external_code     = at(1);
            restored.title             = at(2);
            restored.obtained_date     = at(3);
            try { restored.year = std::stoi(at(4)); } catch (...) {}
            restored.validation_status = at(5);
            restored.status            = at(6);
            update_product(id, restored);
        } else if (e == "WorkPlan") {
            auto cur = get_work_plan(id);
            if (!cur) { std::cerr << "[UNDO] UPDATE: plan " << id << " no encontrado.\n"; return false; }
            WorkPlan restored = *cur;
            restored.title       = at(2);
            restored.description = at(3);
            restored.start_date  = at(4);
            restored.end_date    = at(5);
            restored.status      = at(6);
            update_work_plan(id, restored);
        } else if (e == "Project") {
            auto cur = get_project(id);
            if (!cur) { std::cerr << "[UNDO] UPDATE: proyecto " << id << " no encontrado.\n"; return false; }
            Project restored = *cur;
            restored.title       = at(1);
            restored.summary     = at(2);
            restored.project_type = at(3);
            restored.start_date  = at(4);
            restored.end_date    = at(5);
            restored.status      = at(6);
            restored.funding_type = at(7);
            try { restored.budget = std::stod(at(8)); } catch (...) {}
            try { restored.principal_investigator_id = std::stoi(at(9)); } catch (...) {}
            update_project(id, restored);
        } else {
            std::cerr << "[UNDO] UPDATE: tipo de entidad desconocido: " << e << "\n";
            return false;
        }
        std::cout << "[UNDO] UPDATE " << e << " #" << id << " revertido al estado previo.\n";
        return true;
    }

    // DELETE → re-create the entity with its original id.
    // Note: memberships/product links of a deleted group are not restored.
    if (t == "DELETE") {
        if (prev.empty() || prev.front() == '{') {
            std::cerr << "[UNDO] DELETE " << e << " #" << id
                      << ": previous_state no es un snapshot C++ válido.\n";
            return false;
        }
        if (revert_delete(*op)) {
            std::cout << "[UNDO] DELETE " << e << " #" << id
                      << " revertido: entidad restaurada con su id original.\n";
            return true;
        }
        std::cerr << "[UNDO] DELETE " << e << ": formato de previous_state no reconocido.\n";
        return false;
    }

    // Link operations: previous_state = "<gid>:<rid|pid>".
    if (t == "LINK_MEMBER" || t == "UNLINK_MEMBER" ||
        t == "LINK_PRODUCT" || t == "UNLINK_PRODUCT" ||
        t == "LINK_PROJECT" || t == "UNLINK_PROJECT") {
        int gid = 0, other = 0;
        if (!parse_pair(prev, gid, other)) {
            std::cerr << "[UNDO] " << t << ": previous_state corrupto ('" << prev << "')\n";
            return false;
        }
        bool ok = false;
        if      (t == "LINK_MEMBER")    ok = remove_member_from_group(gid, other);
        else if (t == "UNLINK_MEMBER")  ok = add_member_to_group(gid, other) != nullptr;
        else if (t == "LINK_PRODUCT")   ok = unlink_product_from_group(gid, other);
        else if (t == "UNLINK_PRODUCT") ok = link_product_to_group(gid, other) != nullptr;
        else if (t == "LINK_PROJECT")   ok = unlink_project_from_group(gid, other);
        else                            ok = link_project_to_group(gid, other) != nullptr;
        std::cout << "[UNDO] " << t << " (" << gid << ":" << other << ")"
                  << (ok ? " revertido.\n" : " (el enlace ya no estaba en el estado esperado).\n");
        return ok;
    }

    // VALIDATE → restore the prior validation_status of the product.
    if (t == "VALIDATE") {
        auto current = get_product(id);
        if (!current) {
            std::cerr << "[UNDO] VALIDATE: producto " << id << " no encontrado.\n";
            return false;
        }
        Product restored = *current;
        restored.validation_status = prev.empty() ? "pending" : prev;
        update_product(id, restored);
        std::cout << "[UNDO] VALIDATE producto #" << id
                  << " revertido: validation_status → " << restored.validation_status << "\n";
        return true;
    }

    std::cerr << "[UNDO] Tipo de operación desconocido: " << t << "\n";
    return false;
}

} // namespace peai
