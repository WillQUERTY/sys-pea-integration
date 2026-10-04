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
    std::string language;
    std::string country;
    std::string doi;
    std::string isbn;
    std::string issn;
    std::string url;
    std::string evidence;
    std::string specialized_attributes;
    std::string status            = "active";
    int         year              = 0;
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

struct ProductNode {
    Product       data;
    ProductNode*  nextProduct = nullptr;
    // For later: pointers to cross-chains (e.g., links from groups) could be anchored here
};

struct ProductAuthor {
    int id           = 0;
    int productId    = 0;
    int researcherId = 0;
    int authorOrder  = 1;
    std::string externalAuthorName;
    std::string externalAuthorIdentifier;
    std::string matchStatus = "unverified";
};

struct ProductAuthorNode {
    ProductAuthor      data;
    ProductAuthorNode* nextInProduct     = nullptr;
    ProductAuthorNode* nextForResearcher = nullptr;
};

#endif // PEAI_ENTITIES_PRODUCT_H
