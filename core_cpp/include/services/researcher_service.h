// core_cpp/include/services/researcher_service.h
// Researcher CRUD and related operations.

#ifndef PEAI_SERVICES_RESEARCHER_SERVICE_H
#define PEAI_SERVICES_RESEARCHER_SERVICE_H

#include "../entities/researcher.h"
#include <vector>
#include <optional>

namespace peai {

// ---- Researcher CRUD ----
Researcher                create_researcher(const Researcher& prototype);
std::optional<Researcher> get_researcher(int id);
std::vector<Researcher>   list_researchers();
bool                      update_researcher(int id, const Researcher& updates);
bool                      delete_researcher(int id);

// ---- Summary / stats ----
int total_researchers();

// ---- Internal access (used by persistence layers) ----
ResearcherNode* get_researcher_head();

} // namespace peai

#endif // PEAI_SERVICES_RESEARCHER_SERVICE_H
