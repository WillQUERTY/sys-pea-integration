// core_cpp/src/services/validation_queue.cpp
// Product validation queue — manually managed singly-linked list (FIFO).

#include "services/validation_queue.h"
#include "services/product_service.h"
#include "services/undo_stack.h"
#include <ctime>
#include <iostream>

namespace peai {

// =====================================================================
//  Queue node (singly linked list with tail pointer for O(1) enqueue)
// =====================================================================

struct VQNode {
    ValidationQueueItem data;
    VQNode*             next = nullptr;
};

static VQNode* _queueFront = nullptr;
static VQNode* _queueRear  = nullptr;
static int     _queueSize  = 0;
static int     _nextVQId   = 1;

// =====================================================================
//  Queue operations
// =====================================================================

void vq_enqueue(const ValidationQueueItem& item) {
    auto* node    = new VQNode();
    node->data    = item;
    node->data.id = _nextVQId++;
    node->next    = nullptr;

    if (!_queueRear) {
        _queueFront = _queueRear = node;
    } else {
        _queueRear->next = node;
        _queueRear       = node;
    }
    _queueSize++;
}

std::optional<ValidationQueueItem> vq_front() {
    if (!_queueFront) return std::nullopt;
    return _queueFront->data;
}

std::optional<ValidationQueueItem> vq_dequeue() {
    if (!_queueFront) return std::nullopt;

    VQNode* node = _queueFront;
    _queueFront  = node->next;
    if (!_queueFront) _queueRear = nullptr;
    _queueSize--;

    ValidationQueueItem item = node->data;
    delete node;
    return item;
}

static std::string now_iso() {
    std::time_t t = std::time(nullptr);
    std::tm tm{};
    localtime_s(&tm, &t);
    char buf[20];
    std::strftime(buf, sizeof buf, "%Y-%m-%dT%H:%M:%S", &tm);
    return buf;
}

bool vq_process_next() {
    auto item = vq_dequeue();
    if (!item) {
        std::cerr << "[QUEUE] Queue is empty, nothing to process.\n";
        return false;
    }
    // Actual validation: flip the product's validation_status to "valid"
    // and push a VALIDATE undo op (previous_state = prior status).
    if (auto prod = get_product(item->product_id)) {
        UndoOperation op;
        op.operation_type = "VALIDATE";
        op.entity_type    = "Product";
        op.entity_id      = prod->id;
        op.previous_state = prod->validation_status;
        undo_push(op);

        Product updated = *prod;
        updated.validation_status = "valid";
        update_product(prod->id, updated);
    }
    std::cout << "[QUEUE] Processed validation for product_id="
              << item->product_id << " (status → done)\n";
    return true;
}

int vq_resolve_for_product(int product_id, const std::string& result) {
    // Physically unlink the pending nodes of this product: the queue is FIFO
    // over its front, so a lingering "done" node would block the next dequeue.
    int resolved = 0;
    const std::string ts = now_iso();
    VQNode** link = &_queueFront;
    while (*link) {
        VQNode* node = *link;
        if (node->data.product_id == product_id && node->data.status == "pending") {
            node->data.status       = "done";
            node->data.result       = result;
            node->data.processed_at = ts;
            *link = node->next;
            if (_queueRear == node) _queueRear = nullptr;  // fixed below
            delete node;
            _queueSize--;
            resolved++;
        } else {
            link = &node->next;
        }
    }
    // Recompute rear after removals.
    _queueRear = nullptr;
    for (VQNode* cur = _queueFront; cur; cur = cur->next)
        if (!cur->next) _queueRear = cur;
    return resolved;
}

bool vq_remove(int item_id) {
    // Physically unlink the node (same reasoning as vq_resolve_for_product).
    VQNode** link = &_queueFront;
    while (*link) {
        VQNode* node = *link;
        if (node->data.id == item_id) {
            *link = node->next;
            delete node;
            _queueSize--;
            _queueRear = nullptr;
            for (VQNode* cur = _queueFront; cur; cur = cur->next)
                if (!cur->next) _queueRear = cur;
            return true;
        }
        link = &node->next;
    }
    return false;
}

std::vector<ValidationQueueItem> vq_list() {
    std::vector<ValidationQueueItem> result;
    VQNode* cur = _queueFront;
    while (cur) {
        result.push_back(cur->data);
        cur = cur->next;
    }
    return result;
}

int vq_size() { return _queueSize; }

int vq_pending_count() {
    int count = 0;
    VQNode* cur = _queueFront;
    while (cur) {
        if (cur->data.status == "pending") count++;
        cur = cur->next;
    }
    return count;
}

void vq_clear() {
    while (_queueFront) {
        VQNode* tmp = _queueFront;
        _queueFront = tmp->next;
        delete tmp;
    }
    _queueRear = nullptr;
    _queueSize = 0;
}

} // namespace peai
