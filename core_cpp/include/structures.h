// core_cpp/include/structures.h
#ifndef PEAI_CORE_STRUCTURES_H
#define PEAI_CORE_STRUCTURES_H

#include <string>
#include <vector>

// Forward declarations
struct MembershipNode;
struct GroupProductNode;
struct GroupProjectNode;
struct PlanNode;

// Basic entity definitions (lightweight)
struct Group {
    int id;
    std::string external_code;
    std::string name;
    std::string acronym;
    std::string description;
    // ... other fields can be added as needed
};

struct Membership {
    int membershipId;
    int researcherId;
    // additional fields
};

struct GroupProductLink {
    int linkId;
    int productId;
    // additional fields
};

// Multilista node definitions
struct GroupNode {
    Group data;
    GroupNode* nextGroup = nullptr;
    MembershipNode* firstMember = nullptr;
    GroupProductNode* firstProduct = nullptr;
    GroupProjectNode* firstProject = nullptr;
    PlanNode* firstPlan = nullptr;
};

struct MembershipNode {
    Membership data;
    MembershipNode* nextInGroup = nullptr;   // linked list within a group
    MembershipNode* nextForResearcher = nullptr; // linked list across researchers
};

struct GroupProductNode {
    GroupProductLink data;
    GroupProductNode* nextInGroup = nullptr;
    GroupProductNode* nextForProduct = nullptr;
};

// Minimal placeholder structs for other multilista dimensions
struct GroupProjectNode { int dummy; };
struct PlanNode { int dummy; };

#endif // PEAI_CORE_STRUCTURES_H
