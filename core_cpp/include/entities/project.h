// core_cpp/include/entities/project.h
// Project entity and placeholder multilista nodes.

#ifndef PEAI_ENTITIES_PROJECT_H
#define PEAI_ENTITIES_PROJECT_H

#include <string>

struct Project {
    int         id = 0;
    std::string title;
    std::string summary;
    std::string project_type;
    std::string start_date;
    std::string end_date;
    std::string status       = "active";
    std::string funding_type;
    double      budget       = 0.0;
    int         principal_investigator_id = 0;
};

// Placeholder nodes for the multilista (Group <-> Project)
struct GroupProjectNode {
    int               projectId      = 0;
    GroupProjectNode* nextInGroup    = nullptr;
    GroupProjectNode* nextForProject = nullptr;
};

struct WorkPlan {
    int         id       = 0;
    int         group_id = 0;
    std::string title;
    std::string description;
    std::string start_date;
    std::string end_date;
    std::string status   = "active";
};

// Nodo de la cadena de planes de un grupo (multilista Grupo -> planes).
// El dato viaja en el nodo, igual que MembershipNode/GroupProductNode.
struct PlanNode {
    WorkPlan  data;
    PlanNode* next = nullptr;
};

#endif // PEAI_ENTITIES_PROJECT_H
