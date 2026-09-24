// core_cpp/include/core.h
// Unified facade — include this single header to access all PEA-i core APIs.

#ifndef PEAI_CORE_H
#define PEAI_CORE_H

// ---- Entities ----
#include "entities/group.h"
#include "entities/membership.h"
#include "entities/product.h"
#include "entities/researcher.h"
#include "entities/project.h"

// ---- Services ----
#include "services/group_service.h"
#include "services/researcher_service.h"
#include "services/product_service.h"
#include "services/undo_stack.h"
#include "services/validation_queue.h"

// ---- Persistence ----
#include "persistence/json_persistence.h"
#include "persistence/db_persistence.h"

#endif // PEAI_CORE_H
