// core_cpp/include/services/product_service.h
// Product CRUD and related operations.

#ifndef PEAI_SERVICES_PRODUCT_SERVICE_H
#define PEAI_SERVICES_PRODUCT_SERVICE_H

#include "../entities/product.h"
#include <vector>
#include <optional>

namespace peai {

// ---- Product CRUD ----
Product                create_product(const Product& prototype);
std::optional<Product> get_product(int id);
std::vector<Product>   list_products();
bool                   update_product(int id, const Product& updates);
bool                   delete_product(int id);

// ---- Summary / stats ----
int total_products();

// ---- Internal access (used by persistence layers) ----
ProductNode* get_product_head();

} // namespace peai

#endif // PEAI_SERVICES_PRODUCT_SERVICE_H
