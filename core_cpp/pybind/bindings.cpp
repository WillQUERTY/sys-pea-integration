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
        .def_readwrite("status",                  &Researcher::status);

    // ---- Researcher CRUD ----
    m.def("create_researcher", &peai::create_researcher);
    m.def("get_researcher",    &peai::get_researcher);
    m.def("list_researchers",  &peai::list_researchers);
    m.def("update_researcher", &peai::update_researcher);
    m.def("delete_researcher", &peai::delete_researcher);

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
        .def_readwrite("status",              &Product::status);

    // ---- Product CRUD ----
    m.def("create_product", &peai::create_product);
    m.def("get_product",    &peai::get_product);
    m.def("list_products",  &peai::list_products);
    m.def("update_product", &peai::update_product);
    m.def("delete_product", &peai::delete_product);

    // ---- Multilista: membership ----
    m.def("add_member_to_group",      &peai::add_member_to_group,
          py::return_value_policy::reference,
          "Link a researcher to a group");
    m.def("members_of_group",         &peai::members_of_group,
          "List researcher ids in a group");
    m.def("groups_of_researcher",     &peai::groups_of_researcher,
          "List group ids where a researcher is a member");
    m.def("remove_member_from_group", &peai::remove_member_from_group,
          "Unlink a researcher from a group");

    // ---- Multilista: product links ----
    m.def("link_product_to_group",    &peai::link_product_to_group,
          py::return_value_policy::reference,
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
    m.def("sync_product_to_db", &peai::sync_product_to_db, "Sync a specific product to DB");

    // ---- Summary ----
    m.def("total_groups",        &peai::total_groups);
    m.def("total_members",       &peai::total_members);
    m.def("total_product_links", &peai::total_product_links);
    m.def("print_summary",       &peai::print_summary,
          "Print summary table to stdout");
}
