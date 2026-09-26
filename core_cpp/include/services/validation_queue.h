// core_cpp/include/services/validation_queue.h
// Validation queue (FIFO) — wraps a singly-linked list.

#ifndef PEAI_SERVICES_VALIDATION_QUEUE_H
#define PEAI_SERVICES_VALIDATION_QUEUE_H

#include <string>
#include <optional>
#include <vector>

namespace peai {

struct ValidationQueueItem {
    int         id         = 0;
    int         product_id = 0;
    std::string enqueued_at;
    std::string status      = "pending";  // pending, processing, done, failed
    int         attempts    = 0;
    std::string assigned_to;
    std::string result;
    std::string processed_at;
};

// ---- Queue operations ----
void                                 vq_enqueue(const ValidationQueueItem& item);
std::optional<ValidationQueueItem>   vq_front();
std::optional<ValidationQueueItem>   vq_dequeue();
bool                                 vq_process_next();  // dequeue + validate
std::vector<ValidationQueueItem>     vq_list();
int                                  vq_size();
int                                  vq_pending_count();
void                                 vq_clear();
// Remove all pending items for a product (validated directly, outside
// "process next"); returns how many were removed.
int                                  vq_resolve_for_product(int product_id, const std::string& result);

} // namespace peai

#endif // PEAI_SERVICES_VALIDATION_QUEUE_H
