// core_cpp/src/services/project_service.cpp
// Project CRUD standalone y multilista Grupo <-> Proyecto.
// El dato vive en la lista global de ProjectNode; cada GroupNode cuelga una
// cadena de GroupProjectNode con los ids de sus proyectos (nextInGroup).

#include "services/project_service.h"
#include "services/group_service.h"

namespace peai {

static ProjectNode* _projectHead = nullptr;
static int          _nextProjectId = 1;

static ProjectNode* find_project_node(int id) {
    ProjectNode* cur = _projectHead;
    while (cur) {
        if (cur->data.id == id) return cur;
        cur = cur->next;
    }
    return nullptr;
}

ProjectNode* get_project_head() { return _projectHead; }

// =====================================================================
//  Project CRUD
// =====================================================================

Project create_project(const Project& prototype) {
    auto* node  = new ProjectNode();
    node->data  = prototype;
    if (prototype.id > 0) {
        node->data.id = prototype.id;
        if (prototype.id >= _nextProjectId) _nextProjectId = prototype.id + 1;
    } else {
        node->data.id = _nextProjectId++;
    }
    if (node->data.status.empty()) node->data.status = "active";

    // Append al final para preservar el orden de carga (id ascendente)
    if (!_projectHead) {
        _projectHead = node;
    } else {
        ProjectNode* tail = _projectHead;
        while (tail->next) tail = tail->next;
        tail->next = node;
    }
    return node->data;
}

std::optional<Project> get_project(int id) {
    auto* node = find_project_node(id);
    if (node) return node->data;
    return std::nullopt;
}

std::vector<Project> list_projects() {
    std::vector<Project> result;
    ProjectNode* cur = _projectHead;
    while (cur) { result.push_back(cur->data); cur = cur->next; }
    return result;
}

bool update_project(int id, const Project& updates) {
    auto* node = find_project_node(id);
    if (!node) return false;

    node->data.title                     = updates.title;
    node->data.summary                   = updates.summary;
    node->data.project_type              = updates.project_type;
    node->data.start_date                = updates.start_date;
    node->data.end_date                  = updates.end_date;
    node->data.status                    = updates.status;
    node->data.funding_type              = updates.funding_type;
    node->data.budget                    = updates.budget;
    node->data.principal_investigator_id = updates.principal_investigator_id;
    return true;
}

bool delete_project(int id) {
    // Cascada: quitar el enlace de cada grupo antes de liberar el nodo.
    GroupNode* g = get_group_head();
    while (g) {
        unlink_project_from_group(g->data.id, id);
        g = g->nextGroup;
    }

    ProjectNode* prev = nullptr;
    ProjectNode* cur  = _projectHead;
    while (cur) {
        if (cur->data.id == id) {
            if (prev) prev->next = cur->next;
            else      _projectHead = cur->next;
            delete cur;
            return true;
        }
        prev = cur;
        cur  = cur->next;
    }
    return false;
}

// =====================================================================
//  Multilista: enlaces Grupo <-> Proyecto
// =====================================================================

GroupProjectNode* link_project_to_group(int group_id, int project_id) {
    GroupNode* gn = get_group_head();
    while (gn && gn->data.id != group_id) gn = gn->nextGroup;
    if (!gn) return nullptr;
    if (!find_project_node(project_id)) return nullptr;

    GroupProjectNode* check = gn->firstProject;
    while (check) {
        if (check->projectId == project_id) return check;   // enlace ya existe
        check = check->nextInGroup;
    }

    auto* node        = new GroupProjectNode();
    node->projectId   = project_id;
    node->nextInGroup = gn->firstProject;
    gn->firstProject  = node;
    return node;
}

std::vector<int> projects_of_group(int group_id) {
    std::vector<int> ids;
    GroupNode* gn = get_group_head();
    while (gn && gn->data.id != group_id) gn = gn->nextGroup;
    if (!gn) return ids;
    GroupProjectNode* p = gn->firstProject;
    while (p) { ids.push_back(p->projectId); p = p->nextInGroup; }
    return ids;
}

std::vector<int> groups_of_project(int project_id) {
    std::vector<int> ids;
    GroupNode* gn = get_group_head();
    while (gn) {
        GroupProjectNode* p = gn->firstProject;
        while (p) {
            if (p->projectId == project_id) { ids.push_back(gn->data.id); break; }
            p = p->nextInGroup;
        }
        gn = gn->nextGroup;
    }
    return ids;
}

bool unlink_project_from_group(int group_id, int project_id) {
    GroupNode* gn = get_group_head();
    while (gn && gn->data.id != group_id) gn = gn->nextGroup;
    if (!gn) return false;

    GroupProjectNode* prev = nullptr;
    GroupProjectNode* cur  = gn->firstProject;
    while (cur) {
        if (cur->projectId == project_id) {
            if (prev) prev->nextInGroup = cur->nextInGroup;
            else      gn->firstProject = cur->nextInGroup;
            delete cur;
            return true;
        }
        prev = cur;
        cur  = cur->nextInGroup;
    }
    return false;
}

// =====================================================================
//  Stats
// =====================================================================

int total_projects() {
    int count = 0;
    ProjectNode* cur = _projectHead;
    while (cur) { count++; cur = cur->next; }
    return count;
}

int total_project_links() {
    int count = 0;
    GroupNode* gn = get_group_head();
    while (gn) {
        GroupProjectNode* p = gn->firstProject;
        while (p) { count++; p = p->nextInGroup; }
        gn = gn->nextGroup;
    }
    return count;
}

} // namespace peai
