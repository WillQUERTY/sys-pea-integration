// core_cpp/src/persistence/json/json_common.h
// Common parsing utilities, string escaping/unescaping, and memory state reset.

#ifndef PEAI_PERSISTENCE_JSON_COMMON_H
#define PEAI_PERSISTENCE_JSON_COMMON_H

#include <cstddef>
#include <string>

namespace peai {

namespace json_util {
    std::string json_escape(const std::string& s);
    std::string json_unescape(const std::string& s);
} // namespace json_util

using json_util::json_escape;
using json_util::json_unescape;

std::string read_file_contents(const std::string& path);
std::string extract_string(const std::string& block, const std::string& key);
int extract_int(const std::string& block, const std::string& key);
double extract_double(const std::string& block, const std::string& key);

// Iterate over the JSON objects of an array section: {"key": [ ... ]}.
// Calls fn(block) for each { ... } object, returns number of objects parsed.
template <typename Fn>
size_t for_each_object(const std::string& content, const std::string& key, Fn fn) {
    std::string marker = "\"" + key + "\": [";
    auto pos = content.find(marker);
    if (pos == std::string::npos) return 0;
    pos += marker.size();
    auto end = content.find(']', pos);
    if (end == std::string::npos) return 0;
    std::string section = content.substr(pos, end - pos);

    size_t count = 0;
    size_t cursor = 0;
    while (true) {
        auto obj_start = section.find('{', cursor);
        if (obj_start == std::string::npos) break;
        auto obj_end = section.find('}', obj_start);
        if (obj_end == std::string::npos) break;
        fn(section.substr(obj_start, obj_end - obj_start + 1));
        count++;
        cursor = obj_end + 1;
    }
    return count;
}

void clear_all_state();

} // namespace peai

#endif // PEAI_PERSISTENCE_JSON_COMMON_H
