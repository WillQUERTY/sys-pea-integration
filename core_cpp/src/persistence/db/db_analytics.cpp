// core_cpp/src/persistence/db/db_analytics.cpp
// Facade and coordinator for SQL analytics, executive reporting, network graph queries, and catalog JSON serialization.
// Implementation is partitioned into focused submodules under src/persistence/db/:
//   - db_dashboard_analytics.cpp   : get_dashboard_stats_json
//   - db_group_analytics.cpp       : get_group_stats_json
//   - db_researcher_analytics.cpp  : get_researcher_stats_json
//   - db_network_analytics.cpp     : get_group_collaboration_network_json
//   - db_catalogs_analytics.cpp    : get_product_catalogs_json

#include "persistence/db_persistence.h"
#include "persistence/db/db_common.h"

namespace peai {

// All analytics functions declared in include/persistence/db_persistence.h
// are implemented by the respective domain modules in this directory.

} // namespace peai
