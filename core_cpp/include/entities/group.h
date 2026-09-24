// core_cpp/include/entities/group.h
// Group entity and multilista node definitions.

#ifndef PEAI_ENTITIES_GROUP_H
#define PEAI_ENTITIES_GROUP_H

#include <string>

// Forward declarations for multilista pointers
struct MembershipNode;
struct GroupProductNode;
struct GroupProjectNode;
struct PlanNode;

// ---- Entity ----

struct Group {
    int         id = 0;
    std::string external_code;
    std::string name;
    std::string acronym;
    std::string description;
};

// ---- Multilista nodes ----

struct GroupNode {
    Group             data;
    GroupNode*         nextGroup    = nullptr;
    MembershipNode*   firstMember  = nullptr;
    GroupProductNode*  firstProduct = nullptr;
    GroupProjectNode*  firstProject = nullptr;
    PlanNode*          firstPlan   = nullptr;
};

#endif // PEAI_ENTITIES_GROUP_H
