// core_cpp/include/services/undo_stack.h
// Undo operation stack (LIFO) — wraps a manually managed singly-linked list.
//
// Operation contract (used by the CLI and the standalone C++ solution):
//   CREATE         previous_state = ""                      → undo deletes the entity
//   DELETE         previous_state = snapshot of entity     → undo re-creates it (same id)
//   LINK_MEMBER    previous_state = "<gid>:<rid>"           → undo removes the link
//   UNLINK_MEMBER  previous_state = "<gid>:<rid>"           → undo re-links
//   LINK_PRODUCT   previous_state = "<gid>:<pid>"           → undo removes the link
//   UNLINK_PRODUCT previous_state = "<gid>:<pid>"           → undo re-links
//   VALIDATE       previous_state = prior validation_status  → undo restores the status
//
// The Python layer (backend/app/repository.py) pushes its own operations with
// JSON snapshots and implements its own revert on top of undo_pop(); the
// formats above only apply to operations pushed by the C++ side.

#ifndef PEAI_SERVICES_UNDO_STACK_H
#define PEAI_SERVICES_UNDO_STACK_H

#include "../entities/group.h"
#include "../entities/researcher.h"
#include "../entities/product.h"
#include "../entities/project.h"

#include <string>
#include <optional>
#include <vector>

namespace peai {

struct UndoOperation {
    int         id = 0;
    std::string operation_type;   // "CREATE", "DELETE", "LINK_MEMBER", ... (see contract above)
    std::string entity_type;      // "Group", "Researcher", "Product", ...
    int         entity_id = 0;
    std::string previous_state;   // snapshot before the change (format depends on the operation)
    std::string performed_at;
    std::string undone_at;        // empty if not yet undone
};

// ---- Stack operations ----
void                        undo_push(const UndoOperation& op);
std::optional<UndoOperation> undo_top();
std::optional<UndoOperation> undo_pop();
bool                        undo_perform();   // pop + revert the last operation
std::vector<UndoOperation>  undo_list();       // view full history (top first)
int                         undo_size();
void                        undo_clear();

// ---- Snapshot helpers (fields joined by the \x1F unit separator) ----
std::string undo_snapshot_group(const Group& g);
std::string undo_snapshot_researcher(const Researcher& r);
std::string undo_snapshot_product(const Product& p);
std::string undo_snapshot_work_plan(const WorkPlan& wp);
std::string undo_snapshot_project(const Project& p);

} // namespace peai

#endif // PEAI_SERVICES_UNDO_STACK_H
