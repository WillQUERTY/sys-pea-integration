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
    std::string mission;
    std::string vision;
    std::string declared_creation_date;
    std::string knowledge_area;
    std::string knowledge_subarea;
    std::string city;
    std::string department;
    std::string website;
    std::string email;
    std::string institution;
    std::string classification;
    int         leader_id = 0;
    std::string status = "active";
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
