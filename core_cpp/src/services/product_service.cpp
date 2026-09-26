// core_cpp/src/services/product_service.cpp
// Product CRUD and multilista traversal.

#include "services/product_service.h"

namespace peai {

static ProductNode* _productHead = nullptr;
static int          _nextProductId = 1;

// =====================================================================
//  Internal helpers
// =====================================================================

static ProductNode* find_product_node(int id) {
    ProductNode* cur = _productHead;
    while (cur) {
        if (cur->data.id == id) return cur;
        cur = cur->nextProduct;
    }
    return nullptr;
}

ProductNode* get_product_head() { return _productHead; }

// =====================================================================
//  Product CRUD
// =====================================================================

Product create_product(const Product& prototype) {
    auto* node = new ProductNode();
    node->data = prototype;
    if (prototype.id > 0) {
        node->data.id = prototype.id;
        if (prototype.id >= _nextProductId) _nextProductId = prototype.id + 1;
    } else {
        node->data.id = _nextProductId++;
    }

    // Auto-generar external_code para que el MERGE de sync_product_to_db
    // sea idempotente en entidades creadas por API.
    if (node->data.external_code.empty()) {
        node->data.external_code = "API-PROD-" + std::to_string(node->data.id);
    }

    if (!_productHead) {
        _productHead = node;
    } else {
        ProductNode* tail = _productHead;
        while (tail->nextProduct) tail = tail->nextProduct;
        tail->nextProduct = node;
    }
    return node->data;
}

std::optional<Product> get_product(int id) {
    auto* node = find_product_node(id);
    if (node) return node->data;
    return std::nullopt;
}

std::vector<Product> list_products() {
    std::vector<Product> result;
    ProductNode* cur = _productHead;
    while (cur) {
        result.push_back(cur->data);
        cur = cur->nextProduct;
    }
    return result;
}

bool update_product(int id, const Product& updates) {
    auto* node = find_product_node(id);
    if (!node) return false;
    
    node->data.external_code       = updates.external_code;
    node->data.title               = updates.title;
    node->data.description         = updates.description;
    node->data.family_id           = updates.family_id;
    node->data.subtype_id          = updates.subtype_id;
    node->data.quality_category_id = updates.quality_category_id;
    node->data.obtained_date       = updates.obtained_date;
    node->data.publication_date    = updates.publication_date;
    node->data.validation_status   = updates.validation_status;
    node->data.language            = updates.language;
    node->data.country             = updates.country;
    node->data.doi                 = updates.doi;
    node->data.isbn                = updates.isbn;
    node->data.issn                = updates.issn;
    node->data.url                 = updates.url;
    node->data.evidence            = updates.evidence;
    node->data.specialized_attributes = updates.specialized_attributes;
    node->data.year                = updates.year;
    node->data.status              = updates.status;
    return true;
}

bool delete_product(int id) {
    ProductNode* prev = nullptr;
    ProductNode* cur  = _productHead;
    while (cur) {
        if (cur->data.id == id) {
            if (prev) prev->nextProduct = cur->nextProduct;
            else      _productHead = cur->nextProduct;
            // TODO: Also cleanup any links from groups to this product
            delete cur;
            return true;
        }
        prev = cur;
        cur  = cur->nextProduct;
    }
    return false;
}

int total_products() {
    int count = 0;
    ProductNode* cur = _productHead;
    while (cur) { count++; cur = cur->nextProduct; }
    return count;
}

} // namespace peai
