// core_cpp/src/persistence/db_persistence.cpp
// Facade and coordinator for the SQL Server persistence layer.
// Implementation is partitioned into focused submodules under src/persistence/db/:
//   - db_common.cpp       : ODBC connection management, text conversion, DDL & query helpers
//   - db_loader.cpp       : load_from_db & initialize
//   - db_saver.cpp        : save_to_db (graph-level persistence)
//   - db_entity_sync.cpp  : write-through synchronization and deletions for entities & links
//   - db_operations.cpp   : granular links, validation queue, audit log & transactional operations
//   - db_analytics.cpp    : dashboard metrics, executive statistics & collaboration network JSON

#include "persistence/db_persistence.h"
#include "persistence/db/db_common.h"

namespace peai {

// All declarations in include/persistence/db_persistence.h are implemented
// by the respective modular sources in the persistence/db sub-package.

} // namespace peai
