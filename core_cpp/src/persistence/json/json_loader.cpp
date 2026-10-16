// core_cpp/src/persistence/json/json_loader.cpp
// Rebuilding in-memory multilista structures from a JSON file (load_from_file).

#include "persistence/json_persistence.h"
#include "persistence/json/json_common.h"
#include "services/group_service.h"
#include "services/researcher_service.h"
#include "services/product_service.h"
#include "services/undo_stack.h"
#include "services/validation_queue.h"
#include "services/work_plan_service.h"
#include "services/project_service.h"

#include <vector>

namespace peai {

bool load_from_file(const std::string& path) {
    std::string content = read_file_contents(path);
    if (content.empty()) return false;

    // Clear existing state (all structures — RAM is rebuilt from the file)
    clear_all_state();

    // Groups
    for_each_object(content, "groups", [](const std::string& block) {
        Group g;
        g.id             = extract_int(block, "id");
        g.external_code  = extract_string(block, "external_code");
        g.name           = extract_string(block, "name");
        g.acronym        = extract_string(block, "acronym");
        g.description    = extract_string(block, "description");
        g.classification = extract_string(block, "classification");
        g.status         = extract_string(block, "status");
        if (g.status.empty()) g.status = "active";
        create_group(g);
    });

    // Researchers
    for_each_object(content, "researchers", [](const std::string& block) {
        Researcher r;
        r.id                  = extract_int(block, "id");
        r.external_code       = extract_string(block, "external_code");
        r.first_names         = extract_string(block, "first_names");
        r.last_names          = extract_string(block, "last_names");
        r.institutional_email = extract_string(block, "institutional_email");
        r.status              = extract_string(block, "status");
        if (r.status.empty()) r.status = "active";
        create_researcher(r);
    });

    // Memberships
    for_each_object(content, "memberships", [](const std::string& block) {
        std::string role = extract_string(block, "role");
        if (role.empty()) role = "Investigador";
        std::string start_date = extract_string(block, "start_date");
        std::string end_date = extract_string(block, "end_date");
        add_member_to_group(extract_int(block, "groupId"), extract_int(block, "researcherId"), role, start_date, end_date);
    });

    // Products (20 campos modelo 2024)
    for_each_object(content, "products", [](const std::string& block) {
        Product p;
        p.id                     = extract_int(block, "id");
        p.external_code          = extract_string(block, "external_code");
        p.title                  = extract_string(block, "title");
        p.description            = extract_string(block, "description");
        p.family_id              = extract_int(block, "family_id");
        p.subtype_id             = extract_int(block, "subtype_id");
        p.quality_category_id    = extract_int(block, "quality_category_id");
        p.obtained_date          = extract_string(block, "obtained_date");
        p.publication_date       = extract_string(block, "publication_date");
        p.year                   = extract_int(block, "year");
        p.language               = extract_string(block, "language");
        p.country                = extract_string(block, "country");
        p.doi                    = extract_string(block, "doi");
        p.isbn                   = extract_string(block, "isbn");
        p.issn                   = extract_string(block, "issn");
        p.url                    = extract_string(block, "url");
        p.evidence               = extract_string(block, "evidence");
        p.specialized_attributes = extract_string(block, "specialized_attributes");
        p.validation_status      = extract_string(block, "validation_status");
        if (p.validation_status.empty()) p.validation_status = "pending";
        p.status                 = extract_string(block, "status");
        if (p.status.empty()) p.status = "active";
        create_product(p);
    });

    // Authors (§33.2 / ProductAuthor)
    for_each_object(content, "authors", [](const std::string& block) {
        ProductAuthor a;
        a.id                       = extract_int(block, "id");
        a.productId                = extract_int(block, "productId");
        a.researcherId             = extract_int(block, "researcherId");
        a.authorOrder              = extract_int(block, "authorOrder");
        if (a.authorOrder <= 0) a.authorOrder = 1;
        a.externalAuthorName       = extract_string(block, "externalAuthorName");
        a.externalAuthorIdentifier = extract_string(block, "externalAuthorIdentifier");
        a.matchStatus              = extract_string(block, "matchStatus");
        if (a.matchStatus.empty()) a.matchStatus = "unverified";
        add_product_author(a);
    });

    // Group-product links
    for_each_object(content, "groupProductLinks", [](const std::string& block) {
        link_product_to_group(extract_int(block, "groupId"), extract_int(block, "productId"));
    });

    // Projects (lista global; debe ir antes de los enlaces)
    for_each_object(content, "projects", [](const std::string& block) {
        Project p;
        p.id             = extract_int(block, "id");
        p.title          = extract_string(block, "title");
        p.summary        = extract_string(block, "summary");
        p.project_type   = extract_string(block, "project_type");
        p.start_date     = extract_string(block, "start_date");
        p.end_date       = extract_string(block, "end_date");
        p.status         = extract_string(block, "status");
        if (p.status.empty()) p.status = "active";
        p.funding_type   = extract_string(block, "funding_type");
        p.budget         = extract_double(block, "budget");
        p.principal_investigator_id = extract_int(block, "principal_investigator_id");
        create_project(p);
    });

    // Group-project links
    for_each_object(content, "groupProjectLinks", [](const std::string& block) {
        link_project_to_group(extract_int(block, "groupId"), extract_int(block, "projectId"));
    });

    // Work plans (recorrido Grupo -> planes reconstruido nodo a nodo)
    for_each_object(content, "workPlans", [](const std::string& block) {
        WorkPlan wp;
        wp.id          = extract_int(block, "id");
        wp.group_id    = extract_int(block, "group_id");
        wp.title       = extract_string(block, "title");
        wp.description = extract_string(block, "description");
        wp.start_date  = extract_string(block, "start_date");
        wp.end_date    = extract_string(block, "end_date");
        wp.status      = extract_string(block, "status");
        if (wp.status.empty()) wp.status = "active";
        create_work_plan(wp);
    });

    // Validation queue (enqueue in file order keeps FIFO)
    for_each_object(content, "validationQueue", [](const std::string& block) {
        ValidationQueueItem it;
        it.product_id  = extract_int(block, "product_id");
        it.status      = extract_string(block, "status");
        if (it.status.empty()) it.status = "pending";
        it.attempts    = extract_int(block, "attempts");
        it.assigned_to = extract_string(block, "assigned_to");
        vq_enqueue(it);
    });

    // Undo operations: file is top-first, push in reverse to rebuild LIFO order.
    {
        std::vector<UndoOperation> ops;
        for_each_object(content, "undoOperations", [&](const std::string& block) {
            UndoOperation op;
            op.operation_type = extract_string(block, "operation_type");
            op.entity_type    = extract_string(block, "entity_type");
            op.entity_id      = extract_int(block, "entity_id");
            op.previous_state = extract_string(block, "previous_state");
            ops.push_back(op);
        });
        for (auto it = ops.rbegin(); it != ops.rend(); ++it) {
            undo_push(*it);
        }
    }

    return true;
}

} // namespace peai
