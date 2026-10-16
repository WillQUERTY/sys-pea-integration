// core_cpp/src/cli/cli_helpers.h
#ifndef PEAI_CLI_HELPERS_H
#define PEAI_CLI_HELPERS_H

#include "core.h"
#include <string>
#include <vector>

namespace peai::cli {

void usage();
void print_group(const Group& g);
void print_researcher(const Researcher& r);
void print_product(const Product& p);
int product_year(const Product& p);
int current_year();
void push_undo(const std::string& type, const std::string& etype,
               int entity_id, const std::string& prev = "");
bool contains_id(const std::vector<int>& ids, int id);

} // namespace peai::cli

#endif // PEAI_CLI_HELPERS_H
