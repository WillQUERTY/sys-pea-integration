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
    int               projectId = 0;
    GroupProjectNode*  nextInGroup   = nullptr;
    GroupProjectNode*  nextForProject = nullptr;
};

struct PlanNode {
    int        planId = 0;
    PlanNode*  next   = nullptr;
};

#endif // PEAI_ENTITIES_PROJECT_H
