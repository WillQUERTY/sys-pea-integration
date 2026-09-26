// core_cpp/pybind/bindings.cpp
// Exposes the PEA-i core library to Python via pybind11.
// After building, import as:  import abpoxx_pybind as core

#include <pybind11/pybind11.h>
#include <pybind11/stl.h>          // automatic std::vector / std::optional conversions
#include "core.h"

namespace py = pybind11;

PYBIND11_MODULE(abpoxx_pybind, m) {
    m.doc() = "PEA-i core library — Python bindings (pybind11)";

    // ---- Struct: Group ----
    py::class_<Group>(m, "Group")
        .def(py::init<>())
        .def_readwrite("id",            &Group::id)
        .def_readwrite("external_code", &Group::external_code)
        .def_readwrite("name",          &Group::name)
        .def_readwrite("acronym",       &Group::acronym)
        .def_readwrite("description",   &Group::description)
        .def_readwrite("mission",       &Group::mission)
        .def_readwrite("vision",        &Group::vision)
        .def_readwrite("declared_creation_date", &Group::declared_creation_date)
        .def_readwrite("knowledge_area", &Group::knowledge_area)
        .def_readwrite("knowledge_subarea", &Group::knowledge_subarea)
        .def_readwrite("city",          &Group::city)
        .def_readwrite("department",    &Group::department)
        .def_readwrite("website",       &Group::website)
        .def_readwrite("email",         &Group::email)
        .def_readwrite("institution",   &Group::institution)
        .def_readwrite("classification",&Group::classification)
        .def_readwrite("leader_id",     &Group::leader_id)
        .def_readwrite("status",        &Group::status)
        .def("__repr__", [](const Group& g) {
            return "<Group id=" + std::to_string(g.id) +
                   " code='" + g.external_code +
                   "' name='" + g.name + "'>";
        });

    // ---- Group CRUD ----
    m.def("create_group",  &peai::create_group,  "Create a new group (id auto-assigned)");
    m.def("get_group",     &peai::get_group,     "Get group by id (returns None if not found)");
    m.def("list_groups",   &peai::list_groups,   "List all groups");
    m.def("update_group",  &peai::update_group,  "Update group fields by id");
    m.def("delete_group",  &peai::delete_group,  "Delete group by id");

    // ---- Struct: Researcher ----
    py::class_<Researcher>(m, "Researcher")
        .def(py::init<>())
        .def_readwrite("id",                      &Researcher::id)
        .def_readwrite("external_code",           &Researcher::external_code)
        .def_readwrite("identification_type",     &Researcher::identification_type)
        .def_readwrite("identification_number",   &Researcher::identification_number)
        .def_readwrite("first_names",             &Researcher::first_names)
        .def_readwrite("last_names",              &Researcher::last_names)
        .def_readwrite("nationality",             &Researcher::nationality)
        .def_readwrite("country_of_residence",    &Researcher::country_of_residence)
        .def_readwrite("institutional_email",     &Researcher::institutional_email)
        .def_readwrite("orcid",                   &Researcher::orcid)
        .def_readwrite("highest_education_level", &Researcher::highest_education_level)
        .def_readwrite("education_records",       &Researcher::education_records)
        .def_readwrite("classification_records",  &Researcher::classification_records)
        .def_readwrite("status",                  &Researcher::status);

    // ---- Researcher CRUD ----
    m.def("create_researcher", &peai::create_researcher);
    m.def("get_researcher",    &peai::get_researcher);
    m.def("list_researchers",  &peai::list_researchers);
    m.def("update_researcher", &peai::update_researcher);
    m.def("delete_researcher", &peai::delete_researcher);




    // ---- Option A Refactor Exports ----
    m.def("get_dashboard_stats_json", &peai::get_dashboard_stats_json);
    m.def("get_group_projects_db", &peai::get_group_projects_db);
    m.def("get_group_research_lines_db", &peai::get_group_research_lines_db);
    m.def("link_project_to_group_db", &peai::link_project_to_group_db);
    m.def("unlink_project_from_group_db", &peai::unlink_project_from_group_db);
    m.def("link_research_line_to_group_db", &peai::link_research_line_to_group_db);
    m.def("unlink_research_line_from_group_db", &peai::unlink_research_line_from_group_db);

    // ---- Struct: Product ----
    py::class_<Product>(m, "Product")
        .def(py::init<>())
        .def_readwrite("id",                  &Product::id)
        .def_readwrite("external_code",       &Product::external_code)
        .def_readwrite("title",               &Product::title)
        .def_readwrite("description",         &Product::description)
        .def_readwrite("family_id",           &Product::family_id)
        .def_readwrite("subtype_id",          &Product::subtype_id)
        .def_readwrite("quality_category_id", &Product::quality_category_id)
        .def_readwrite("obtained_date",       &Product::obtained_date)
        .def_readwrite("publication_date",    &Product::publication_date)
        .def_readwrite("validation_status",   &Product::validation_status)
        .def_readwrite("language",            &Product::language)
        .def_readwrite("country",             &Product::country)
        .def_readwrite("doi",                 &Product::doi)
        .def_readwrite("isbn",                &Product::isbn)
        .def_readwrite("issn",                &Product::issn)
        .def_readwrite("url",                 &Product::url)
        .def_readwrite("evidence",            &Product::evidence)
        .def_readwrite("specialized_attributes", &Product::specialized_attributes)
        .def_readwrite("status",              &Product::status)
        .def_readwrite("year",                &Product::year);

    // ---- Product CRUD ----
    m.def("create_product", &peai::create_product);
    m.def("get_product",    &peai::get_product);
    m.def("list_products",  &peai::list_products);
    m.def("update_product", &peai::update_product);
    m.def("delete_product", &peai::delete_product);

    // ---- Struct: Project ----
    py::class_<Project>(m, "Project")
        .def(py::init<>())
        .def_readwrite("id",                        &Project::id)
        .def_readwrite("title",                     &Project::title)
        .def_readwrite("summary",                   &Project::summary)
        .def_readwrite("project_type",              &Project::project_type)
        .def_readwrite("start_date",                &Project::start_date)
        .def_readwrite("end_date",                  &Project::end_date)
        .def_readwrite("status",                    &Project::status)
        .def_readwrite("funding_type",              &Project::funding_type)
        .def_readwrite("budget",                    &Project::budget)
        .def_readwrite("principal_investigator_id", &Project::principal_investigator_id);

    // ---- Struct: WorkPlan ----
    py::class_<WorkPlan>(m, "WorkPlan")
        .def(py::init<>())
        .def_readwrite("id",          &WorkPlan::id)
        .def_readwrite("group_id",    &WorkPlan::group_id)
        .def_readwrite("title",       &WorkPlan::title)
        .def_readwrite("description", &WorkPlan::description)
        .def_readwrite("start_date",  &WorkPlan::start_date)
        .def_readwrite("end_date",    &WorkPlan::end_date)
        .def_readwrite("status",      &WorkPlan::status);

    // ---- Struct: UndoOperation (Stack) ----
    py::class_<peai::UndoOperation>(m, "UndoOperation")
        .def(py::init<>())
        .def_readwrite("id",             &peai::UndoOperation::id)
        .def_readwrite("operation_type", &peai::UndoOperation::operation_type)
        .def_readwrite("entity_type",    &peai::UndoOperation::entity_type)
        .def_readwrite("entity_id",      &peai::UndoOperation::entity_id)
        .def_readwrite("previous_state", &peai::UndoOperation::previous_state)
        .def_readwrite("performed_at",   &peai::UndoOperation::performed_at)
        .def_readwrite("undone_at",      &peai::UndoOperation::undone_at);

    // ---- Undo Stack Operations ----
    m.def("undo_push",    &peai::undo_push,    "Push operation to undo stack");
    m.def("undo_top",     &peai::undo_top,     "Inspect top operation without popping");
    m.def("undo_pop",     &peai::undo_pop,     "Pop top operation");
    m.def("undo_perform", &peai::undo_perform, "Revert the last operation");
    m.def("undo_list",    &peai::undo_list,    "List all undo operations in stack");
    m.def("undo_size",    &peai::undo_size,    "Get size of undo stack");
    m.def("undo_clear",   &peai::undo_clear,   "Clear undo stack");

    // ---- Struct: ValidationQueueItem (Queue FIFO) ----
    py::class_<peai::ValidationQueueItem>(m, "ValidationQueueItem")
        .def(py::init<>())
        .def_readwrite("id",           &peai::ValidationQueueItem::id)
        .def_readwrite("product_id",   &peai::ValidationQueueItem::product_id)
        .def_readwrite("enqueued_at",  &peai::ValidationQueueItem::enqueued_at)
        .def_readwrite("status",       &peai::ValidationQueueItem::status)
        .def_readwrite("attempts",     &peai::ValidationQueueItem::attempts)
        .def_readwrite("assigned_to",  &peai::ValidationQueueItem::assigned_to)
        .def_readwrite("result",       &peai::ValidationQueueItem::result)
        .def_readwrite("processed_at", &peai::ValidationQueueItem::processed_at);

    // ---- Validation Queue Operations ----
    m.def("vq_enqueue",       &peai::vq_enqueue,       "Enqueue product for validation (FIFO)");
    m.def("vq_front",         &peai::vq_front,         "Inspect front element of queue");
    m.def("vq_dequeue",       &peai::vq_dequeue,       "Dequeue front item");
    m.def("vq_process_next",  &peai::vq_process_next,  "Process and validate next product in queue");
    m.def("vq_list",          &peai::vq_list,          "List all items in queue");
    m.def("vq_size",          &peai::vq_size,          "Get size of validation queue");
    m.def("vq_pending_count", &peai::vq_pending_count, "Get count of pending queue items");
    m.def("vq_clear",         &peai::vq_clear,         "Clear validation queue");
    m.def("vq_resolve_for_product", &peai::vq_resolve_for_product, "Mark pending queue items of a product as done");

    // ---- Multilista: membership ----
    m.def("add_member_to_group",      [](int g, int r){peai::add_member_to_group(g, r);},
          "Link a researcher to a group");
    m.def("members_of_group",         &peai::members_of_group,
          "List researcher ids in a group");
    m.def("groups_of_researcher",     &peai::groups_of_researcher,
          "List group ids where a researcher is a member");
    m.def("remove_member_from_group", &peai::remove_member_from_group,
          "Unlink a researcher from a group");

    // ---- Multilista: product links ----
    m.def("link_product_to_group",    [](int g, int p){peai::link_product_to_group(g, p);},
          "Link a product to a group");
    m.def("products_of_group",        &peai::products_of_group,
          "List product ids linked to a group");
    m.def("unlink_product_from_group",&peai::unlink_product_from_group,
          "Unlink a product from a group");

    // ---- Persistence ----
    m.def("load_from_file",  &peai::load_from_file,  "Load state from a JSON file");
    m.def("export_to_file",  &peai::export_to_file,  "Export current state to a JSON file");

    py::enum_<peai::InitMode>(m, "InitMode")
        .value("Database", peai::InitMode::Database)
        .value("File",     peai::InitMode::File)
        .value("Empty",    peai::InitMode::Empty)
        .export_values();

    m.def("initialize",       &peai::initialize,       "Initialize system state (DB, File, Empty)");
    m.def("load_from_db",     &peai::load_from_db,     "Load from SQL Server");
    m.def("save_to_db",       &peai::save_to_db,       "Save entire state to SQL Server");
    m.def("sync_group_to_db", &peai::sync_group_to_db, "Sync a specific group to DB");
    m.def("sync_researcher_to_db", &peai::sync_researcher_to_db, "Sync a specific researcher to DB");
    m.def("sync_product_to_db",    &peai::sync_product_to_db,    "Sync a specific product to DB");
    m.def("sync_membership_to_db", &peai::sync_membership_to_db, "Sync a group membership link to DB");
    m.def("sync_membership_details_to_db", &peai::sync_membership_details_to_db, "Sync group membership with role and dates to DB");
    m.def("sync_product_link_to_db",       &peai::sync_product_link_to_db,       "Sync a group product link to DB");
    m.def("sync_product_author_to_db",     &peai::sync_product_author_to_db,     "Sync a product author link to DB");

    // Architectural consolidation: the core owns ALL SQL
    m.def("delete_group_from_db",      &peai::delete_group_from_db,      "Soft/hard delete of a group in DB");
    m.def("delete_researcher_from_db", &peai::delete_researcher_from_db, "Soft/hard delete of a researcher in DB");
    m.def("delete_product_from_db",    &peai::delete_product_from_db,    "Soft/hard delete of a product in DB");
    m.def("delete_membership_from_db",    &peai::delete_membership_from_db,    "Delete a group membership link in DB");
    m.def("delete_product_link_from_db",  &peai::delete_product_link_from_db,  "Delete a group-product link in DB");
    m.def("set_product_validation_db",    &peai::set_product_validation_db,    "Transactional product validation (Product + GroupProductLink + ValidationQueueItem + AuditLog)");
    m.def("insert_audit_log_db",          &peai::insert_audit_log_db,          "Insert an AuditLog row");
    m.def("insert_import_record_db",      &peai::insert_import_record_db,      "Insert an ImportRecord row");
    m.def("upsert_product_group_link_db", &peai::upsert_product_group_link_db, "Propose/upsert a group-product link");
    m.def("insert_external_product_author_db", &peai::insert_external_product_author_db, "Insert an external product author");
    m.def("products_of_researcher_db",    &peai::products_of_researcher_db,    "List product ids authored by a researcher");
    m.def("vq_enqueue_db",                &peai::vq_enqueue_db,                "Persist a validation queue item");


    // ---- Summary ----
    m.def("total_groups",        &peai::total_groups);
    m.def("total_members",       &peai::total_members);
    m.def("total_product_links", &peai::total_product_links);
    m.def("print_summary",       &peai::print_summary,
          "Print summary table to stdout");
}

