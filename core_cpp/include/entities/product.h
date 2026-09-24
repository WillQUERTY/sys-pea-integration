// core_cpp/include/entities/product.h
// Product entity and group-product link node.

#ifndef PEAI_ENTITIES_PRODUCT_H
#define PEAI_ENTITIES_PRODUCT_H

#include <string>

struct Product {
    int         id = 0;
    std::string external_code;
    std::string title;
    std::string description;
    int         family_id          = 0;
    int         subtype_id         = 0;
    int         quality_category_id = 0;
    std::string obtained_date;
    std::string publication_date;
    std::string validation_status = "pending";
    std::string status            = "active";
};

struct GroupProductLink {
    int linkId    = 0;
    int productId = 0;
};

struct GroupProductNode {
    GroupProductLink  data;
    GroupProductNode* nextInGroup    = nullptr;  // chain within one group
    GroupProductNode* nextForProduct = nullptr;  // cross-chain across products
};

#endif // PEAI_ENTITIES_PRODUCT_H
