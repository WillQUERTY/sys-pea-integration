// core_cpp/include/services/undo_stack.h
// Undo operation stack (LIFO) — wraps a singly-linked list.

#ifndef PEAI_SERVICES_UNDO_STACK_H
#define PEAI_SERVICES_UNDO_STACK_H

#include <string>
#include <optional>
#include <vector>

namespace peai {

struct UndoOperation {
    int         id = 0;
    std::string operation_type;   // "create", "update", "delete"
    std::string entity_type;      // "group", "researcher", "product"
    int         entity_id = 0;
    std::string previous_state;   // JSON snapshot before the change
    std::string performed_at;
    std::string undone_at;        // empty if not yet undone
};

// ---- Stack operations ----
void                        undo_push(const UndoOperation& op);
std::optional<UndoOperation> undo_top();
std::optional<UndoOperation> undo_pop();
bool                        undo_perform();   // pop + revert the last operation
std::vector<UndoOperation>  undo_list();      // view full history
int                         undo_size();
void                        undo_clear();

} // namespace peai

#endif // PEAI_SERVICES_UNDO_STACK_H
