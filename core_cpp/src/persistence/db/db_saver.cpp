// core_cpp/src/persistence/db/db_saver.cpp
// Persists the in-memory graph to SQL Server tables via write-through sync helpers.

#include "persistence/db_persistence.h"
#include "services/group_service.h"
#include "services/researcher_service.h"
#include "services/product_service.h"
#include "services/work_plan_service.h"
#include "services/project_service.h"

namespace peai {

bool save_to_db(const std::string& connection_string) {
    bool ok = true;
    for (const auto& g : list_groups()) {
        ok &= sync_group_to_db(connection_string, g.id);
        for (int rid : members_of_group(g.id)) {
            auto det = membership_details(g.id, rid);
            if (det) {
                ok &= sync_membership_details_to_db(connection_string, g.id, rid, det->role, det->start_date, det->end_date);
            } else {
                ok &= sync_membership_to_db(connection_string, g.id, rid);
            }
        }
        for (int pid : products_of_group(g.id)) {
            ok &= sync_product_link_to_db(connection_string, g.id, pid);
        }
        for (const auto& wp : plans_of_group(g.id)) {
            ok &= sync_work_plan_to_db(connection_string, wp.id);
        }
        for (int pid : projects_of_group(g.id)) {
            ok &= sync_project_link_to_db(connection_string, g.id, pid);
        }
    }
    for (const auto& r : list_researchers()) ok &= sync_researcher_to_db(connection_string, r.id);
    for (const auto& p : list_products()) ok &= sync_product_to_db(connection_string, p.id);
    for (const auto& p : list_projects()) ok &= sync_project_to_db(connection_string, p.id);
    return ok;
}

} // namespace peai
