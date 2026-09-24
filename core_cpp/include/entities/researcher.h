// core_cpp/include/entities/researcher.h
// Researcher entity.

#ifndef PEAI_ENTITIES_RESEARCHER_H
#define PEAI_ENTITIES_RESEARCHER_H

#include <string>

struct Researcher {
    int         id = 0;
    std::string external_code;
    std::string identification_type;
    std::string identification_number;
    std::string first_names;
    std::string last_names;
    std::string nationality;
    std::string country_of_residence;
    std::string institutional_email;
    std::string orcid;
    std::string highest_education_level;
    std::string status = "active";
};

struct ResearcherNode {
    Researcher      data;
    ResearcherNode* nextResearcher = nullptr;
    // For later: pointers to cross-chains (e.g., memberships) could be added here
};

#endif // PEAI_ENTITIES_RESEARCHER_H
