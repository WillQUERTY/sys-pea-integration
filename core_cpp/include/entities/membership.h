// core_cpp/include/entities/membership.h
// Membership entity and multilista node.

#ifndef PEAI_ENTITIES_MEMBERSHIP_H
#define PEAI_ENTITIES_MEMBERSHIP_H

#include <string>

struct Membership {
    int         membershipId = 0;
    int         groupId      = 0;
    int         researcherId = 0;
    std::string role         = "Investigador";
    std::string start_date;
    std::string end_date;
    std::string status       = "active";
};

struct MembershipNode {
    Membership      data;
    MembershipNode* nextInGroup       = nullptr;  // chain within one group
    MembershipNode* nextForResearcher = nullptr;  // cross-chain across groups
};

#endif // PEAI_ENTITIES_MEMBERSHIP_H
