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

    // ---- Summary ----
    m.def("total_groups",        &peai::total_groups);
    m.def("total_members",       &peai::total_members);
    m.def("total_product_links", &peai::total_product_links);
    m.def("print_summary",       &peai::print_summary,
          "Print summary table to stdout");
}
