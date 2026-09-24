// core_cpp/include/persistence/json_persistence.h
// JSON file import/export for the multilista state.

#ifndef PEAI_PERSISTENCE_JSON_H
#define PEAI_PERSISTENCE_JSON_H

#include <string>

namespace peai {

bool load_from_file(const std::string& path);
bool export_to_file(const std::string& path);

} // namespace peai

#endif // PEAI_PERSISTENCE_JSON_H
