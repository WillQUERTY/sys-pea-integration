// core_cpp/src/services/product_service.cpp
// Product CRUD and multilista traversal.

#include "services/product_service.h"
#include <algorithm>

namespace peai {

static ProductNode*       _productHead = nullptr;
static int                _nextProductId = 1;
static ProductAuthorNode* _authorHead = nullptr;
static int                _nextAuthorId = 1;

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
            delete cur;

            // Cascade cleanup of authors of this product in RAM
            ProductAuthorNode* a_prev = nullptr;
            ProductAuthorNode* a_cur  = _authorHead;
            while (a_cur) {
                if (a_cur->data.productId == id) {
                    ProductAuthorNode* to_del = a_cur;
                    if (a_prev) a_prev->nextInProduct = a_cur->nextInProduct;
                    else        _authorHead           = a_cur->nextInProduct;
                    a_cur = a_cur->nextInProduct;
                    delete to_del;
                } else {
                    a_prev = a_cur;
                    a_cur  = a_cur->nextInProduct;
                }
            }
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

// =====================================================================
//  Product Authors Multilista (RAM)
// =====================================================================

ProductAuthorNode* add_product_author(const ProductAuthor& prototype) {
    ProductAuthorNode* cur = _authorHead;
    while (cur) {
        if (cur->data.productId == prototype.productId) {
            if (prototype.researcherId > 0 && cur->data.researcherId == prototype.researcherId) {
                cur->data.authorOrder = prototype.authorOrder;
                cur->data.matchStatus = prototype.matchStatus;
                return cur;
            }
            if (!prototype.externalAuthorName.empty() && cur->data.externalAuthorName == prototype.externalAuthorName) {
                cur->data.authorOrder = prototype.authorOrder;
                cur->data.externalAuthorIdentifier = prototype.externalAuthorIdentifier;
                cur->data.matchStatus = prototype.matchStatus;
                return cur;
            }
        }
        cur = cur->nextInProduct;
    }

    auto* node = new ProductAuthorNode();
    node->data = prototype;
    if (prototype.id > 0) {
        node->data.id = prototype.id;
        if (prototype.id >= _nextAuthorId) _nextAuthorId = prototype.id + 1;
    } else {
        node->data.id = _nextAuthorId++;
    }

    if (!_authorHead) {
        _authorHead = node;
    } else {
        ProductAuthorNode* tail = _authorHead;
        while (tail->nextInProduct) tail = tail->nextInProduct;
        tail->nextInProduct = node;
    }
    return node;
}

std::vector<ProductAuthor> authors_of_product(int product_id) {
    std::vector<ProductAuthor> result;
    ProductAuthorNode* cur = _authorHead;
    while (cur) {
        if (cur->data.productId == product_id) {
            result.push_back(cur->data);
        }
        cur = cur->nextInProduct;
    }
    std::sort(result.begin(), result.end(), [](const ProductAuthor& a, const ProductAuthor& b){
        return a.authorOrder < b.authorOrder;
    });
    return result;
}

std::vector<int> products_of_researcher_ram(int researcher_id) {
    std::vector<int> result;
    ProductAuthorNode* cur = _authorHead;
    while (cur) {
        if (cur->data.researcherId == researcher_id) {
            result.push_back(cur->data.productId);
        }
        cur = cur->nextInProduct;
    }
    return result;
}

bool remove_product_author_ram(int product_id, int researcher_id, const std::string& ext_name) {
    ProductAuthorNode* prev = nullptr;
    ProductAuthorNode* cur  = _authorHead;
    bool any_removed = false;
    while (cur) {
        bool match = false;
        if (cur->data.productId == product_id) {
            if (researcher_id > 0 && cur->data.researcherId == researcher_id) match = true;
            else if (!ext_name.empty() && cur->data.externalAuthorName == ext_name) match = true;
        }
        if (match) {
            ProductAuthorNode* to_del = cur;
            if (prev) prev->nextInProduct = cur->nextInProduct;
            else      _authorHead           = cur->nextInProduct;
            cur = cur->nextInProduct;
            delete to_del;
            any_removed = true;
        } else {
            prev = cur;
            cur  = cur->nextInProduct;
        }
    }
    return any_removed;
}

std::vector<ProductAuthor> list_all_product_authors() {
    std::vector<ProductAuthor> result;
    ProductAuthorNode* cur = _authorHead;
    while (cur) {
        result.push_back(cur->data);
        cur = cur->nextInProduct;
    }
    return result;
}

void clear_product_authors() {
    ProductAuthorNode* cur = _authorHead;
    while (cur) {
        ProductAuthorNode* next = cur->nextInProduct;
        delete cur;
        cur = next;
    }
    _authorHead = nullptr;
    _nextAuthorId = 1;
}

} // namespace peai
