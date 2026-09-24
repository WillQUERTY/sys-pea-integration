// core_cpp/src/services/undo_stack.cpp
// Undo operation stack — manually managed singly-linked list (LIFO).

#include "services/undo_stack.h"
#include <iostream>

namespace peai {

// =====================================================================
//  Stack node (singly linked list)
// =====================================================================

struct UndoNode {
    UndoOperation data;
    UndoNode*     next = nullptr;
};

static UndoNode* _stackTop = nullptr;
static int       _stackSize = 0;
static int       _nextUndoId = 1;

// =====================================================================
//  Stack operations
// =====================================================================

void undo_push(const UndoOperation& op) {
    auto* node   = new UndoNode();
    node->data   = op;
    node->data.id = _nextUndoId++;
    node->next   = _stackTop;
    _stackTop    = node;
    _stackSize++;
}

std::optional<UndoOperation> undo_top() {
    if (!_stackTop) return std::nullopt;
    return _stackTop->data;
}

std::optional<UndoOperation> undo_pop() {
    if (!_stackTop) return std::nullopt;
    UndoNode* node = _stackTop;
    _stackTop = node->next;
    _stackSize--;
    UndoOperation op = node->data;
    delete node;
    return op;
}

bool undo_perform() {
    auto op = undo_pop();
    if (!op) {
        std::cerr << "[UNDO] Stack is empty, nothing to undo.\n";
        return false;
    }
    // TODO: implement actual revert logic based on op->operation_type
    // and op->previous_state (JSON snapshot).
    std::cout << "[UNDO] Reverted " << op->operation_type
              << " on " << op->entity_type
              << " (id=" << op->entity_id << ")\n";
    return true;
}

std::vector<UndoOperation> undo_list() {
    std::vector<UndoOperation> result;
    UndoNode* cur = _stackTop;
    while (cur) {
        result.push_back(cur->data);
        cur = cur->next;
    }
    return result;
}

int undo_size() { return _stackSize; }

void undo_clear() {
    while (_stackTop) {
        UndoNode* tmp = _stackTop;
        _stackTop = tmp->next;
        delete tmp;
    }
    _stackSize = 0;
}

} // namespace peai
