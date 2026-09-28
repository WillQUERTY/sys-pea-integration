// core_cpp/include/services/work_plan_service.h
// WorkPlan CRUD — planes de trabajo de cada grupo (Requerimiento 3 / T-08).
// Almacenamiento: cadena de PlanNode colgando de cada GroupNode (multilista
// Grupo -> planes, sección 30 de la especificación).

#ifndef PEAI_SERVICES_WORK_PLAN_SERVICE_H
#define PEAI_SERVICES_WORK_PLAN_SERVICE_H

#include "../entities/project.h"

#include <vector>
#include <optional>

namespace peai {

// ---- WorkPlan CRUD ----
WorkPlan                create_work_plan(const WorkPlan& prototype);
std::optional<WorkPlan> get_work_plan(int id);
std::vector<WorkPlan>   list_work_plans();                 // todos los planes
std::vector<WorkPlan>   plans_of_group(int group_id);      // recorrido Grupo -> planes
bool                    update_work_plan(int id, const WorkPlan& updates);
bool                    delete_work_plan(int id);          // remueve el nodo

// ---- Stats ----
int total_work_plans();

} // namespace peai

#endif // PEAI_SERVICES_WORK_PLAN_SERVICE_H
