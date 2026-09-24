// core_cpp/src/services/researcher_service.cpp
// Researcher CRUD and multilista traversal.

#include "services/researcher_service.h"

namespace peai {

static ResearcherNode* _researcherHead = nullptr;
static int             _nextResearcherId = 1;

// =====================================================================
//  Internal helpers
// =====================================================================

static ResearcherNode* find_researcher_node(int id) {
    ResearcherNode* cur = _researcherHead;
    while (cur) {
        if (cur->data.id == id) return cur;
        cur = cur->nextResearcher;
    }
    return nullptr;
}

ResearcherNode* get_researcher_head() { return _researcherHead; }

// =====================================================================
//  Researcher CRUD
// =====================================================================

Researcher create_researcher(const Researcher& prototype) {
    auto* node = new ResearcherNode();
    node->data = prototype;
    node->data.id = _nextResearcherId++;

    if (!_researcherHead) {
        _researcherHead = node;
    } else {
        ResearcherNode* tail = _researcherHead;
        while (tail->nextResearcher) tail = tail->nextResearcher;
        tail->nextResearcher = node;
    }
    return node->data;
}

std::optional<Researcher> get_researcher(int id) {
    auto* node = find_researcher_node(id);
    if (node) return node->data;
    return std::nullopt;
}

std::vector<Researcher> list_researchers() {
    std::vector<Researcher> result;
    ResearcherNode* cur = _researcherHead;
    while (cur) {
        result.push_back(cur->data);
        cur = cur->nextResearcher;
    }
    return result;
}

bool update_researcher(int id, const Researcher& updates) {
    auto* node = find_researcher_node(id);
    if (!node) return false;
    
    node->data.external_code           = updates.external_code;
    node->data.identification_type     = updates.identification_type;
    node->data.identification_number   = updates.identification_number;
    node->data.first_names             = updates.first_names;
    node->data.last_names              = updates.last_names;
    node->data.nationality             = updates.nationality;
    node->data.country_of_residence    = updates.country_of_residence;
    node->data.institutional_email     = updates.institutional_email;
    node->data.orcid                   = updates.orcid;
    node->data.highest_education_level = updates.highest_education_level;
    node->data.status                  = updates.status;
    return true;
}

bool delete_researcher(int id) {
    ResearcherNode* prev = nullptr;
    ResearcherNode* cur  = _researcherHead;
    while (cur) {
        if (cur->data.id == id) {
            if (prev) prev->nextResearcher = cur->nextResearcher;
            else      _researcherHead = cur->nextResearcher;
            // TODO: Also cleanup any memberships in groups pointing to this researcher
            delete cur;
            return true;
        }
        prev = cur;
        cur  = cur->nextResearcher;
    }
    return false;
}

int total_researchers() {
    int count = 0;
    ResearcherNode* cur = _researcherHead;
    while (cur) { count++; cur = cur->nextResearcher; }
    return count;
}

} // namespace peai
