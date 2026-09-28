// core_cpp/include/services/project_service.h
// Project CRUD standalone (Requerimiento 3: gestionar proyectos) y enlaces
// multilista Grupo <-> Proyecto (GroupProjectNode, seccion 30 de la spec).
// Almacenamiento: lista enlazada global de ProjectNode; los enlaces cuelgan
// de la cadena firstProject de cada GroupNode (igual que GroupProductNode).

#ifndef PEAI_SERVICES_PROJECT_SERVICE_H
#define PEAI_SERVICES_PROJECT_SERVICE_H

#include "../entities/project.h"

#include <vector>
#include <optional>

namespace peai {

// ---- Project CRUD ----
Project                create_project(const Project& prototype);
std::optional<Project> get_project(int id);
std::vector<Project>   list_projects();
bool                   update_project(int id, const Project& updates);
bool                   delete_project(int id);   // desenlaza de todos los grupos

// ---- Multilista: project links (Group <-> Project) ----
GroupProjectNode*  link_project_to_group(int group_id, int project_id);
std::vector<int>   projects_of_group(int group_id);
std::vector<int>   groups_of_project(int project_id);
bool               unlink_project_from_group(int group_id, int project_id);

// ---- Stats ----
int total_projects();
int total_project_links();

// ---- Internal access (used by persistence layers) ----
ProjectNode* get_project_head();

} // namespace peai

#endif // PEAI_SERVICES_PROJECT_SERVICE_H
