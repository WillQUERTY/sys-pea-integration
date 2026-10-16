// core_cpp/src/persistence/json_persistence.cpp
// Facade and coordinator for JSON file persistence.
// Schema (sección 33.2 de la especificación — contenido mínimo):
//   groups, researchers, memberships, products, authors, groupProductLinks,
//   projects, groupProjectLinks, workPlans, validationQueue, undoOperations.
//
// Implementation is partitioned into focused submodules under src/persistence/json/:
//   - json_common.h / json_common.cpp : JSON string escaping/unescaping, stream helpers & state cleanup
//   - json_exporter.cpp               : export_to_file (structures in memory -> JSON file)
//   - json_loader.cpp                 : load_from_file (JSON file -> structures in memory)

#include "persistence/json_persistence.h"

namespace peai {

// export_to_file and load_from_file are implemented in
// src/persistence/json/json_exporter.cpp and src/persistence/json/json_loader.cpp

} // namespace peai
