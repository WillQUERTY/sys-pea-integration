// core_cpp/src/services/validation_queue.cpp
// Product validation queue — manually managed singly-linked list (FIFO).

#include "services/validation_queue.h"
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

bool vq_process_next() {
    auto item = vq_dequeue();
    if (!item) {
        std::cerr << "[QUEUE] Queue is empty, nothing to process.\n";
        return false;
    }
    // TODO: implement actual validation logic for the product.
    std::cout << "[QUEUE] Processed validation for product_id="
              << item->product_id << " (status → done)\n";
    return true;
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
