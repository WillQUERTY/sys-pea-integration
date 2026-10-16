// core_cpp/src/persistence/json/json_common.cpp
// Implementation of JSON string escaping, unescaping, file read, and state clear.

#include "persistence/json/json_common.h"
#include "services/group_service.h"
#include "services/researcher_service.h"
#include "services/product_service.h"
#include "services/undo_stack.h"
#include "services/validation_queue.h"
#include "services/work_plan_service.h"
#include "services/project_service.h"

#include <cctype>
#include <fstream>
#include <sstream>

namespace peai {

namespace json_util {

std::string json_escape(const std::string& s) {
    std::string out;
    for (char c : s) {
        switch (c) {
            case '"':   out += "\\\"";  break;
            case '\\':  out += "\\\\";  break;
            case '\n':  out += "\\n";   break;
            case '\r':  out += "\\r";   break;
            case '\t':  out += "\\t";   break;
            case '\x1F': out += "\\u001F"; break;  // snapshot field separator
            default:    out += c;
        }
    }
    return out;
}

std::string json_unescape(const std::string& s) {
    std::string out;
    for (size_t i = 0; i < s.size(); i++) {
        if (s[i] != '\\') { out += s[i]; continue; }
        if (i + 1 >= s.size()) break;
        char n = s[++i];
        switch (n) {
            case '"':  out += '"';  break;
            case '\\': out += '\\'; break;
            case 'n':  out += '\n'; break;
            case 'r':  out += '\r'; break;
            case 't':  out += '\t'; break;
            case 'u':  // \uXXXX — control separator (\u001F or \u001f)
                if (i + 4 < s.size() &&
                    (s.compare(i + 1, 4, "001F") == 0 || s.compare(i + 1, 4, "001f") == 0)) {
                    out += '\x1F';
                    i += 4;
                }
                break;
            default:   out += n;   break;
        }
    }
    return out;
}

} // namespace json_util

std::string read_file_contents(const std::string& path) {
    std::ifstream in(path);
    if (!in.is_open()) return "";
    std::ostringstream ss;
    ss << in.rdbuf();
    return ss.str();
}

std::string extract_string(const std::string& block, const std::string& key) {
    std::string search = "\"" + key + "\": \"";
    auto pos = block.find(search);
    if (pos == std::string::npos) return "";
    pos += search.size();
    std::string raw;
    while (pos < block.size()) {
        char c = block[pos];
        if (c == '\\' && pos + 1 < block.size()) { raw += c; raw += block[pos + 1]; pos += 2; continue; }
        if (c == '"') break;
        raw += c;
        pos++;
    }
    return json_unescape(raw);
}

int extract_int(const std::string& block, const std::string& key) {
    std::string search = "\"" + key + "\": ";
    auto pos = block.find(search);
    if (pos == std::string::npos) return 0;
    pos += search.size();
    int val = 0;
    bool neg = false;
    if (pos < block.size() && block[pos] == '-') { neg = true; pos++; }
    while (pos < block.size() && block[pos] >= '0' && block[pos] <= '9') {
        val = val * 10 + (block[pos] - '0');
        pos++;
    }
    return neg ? -val : val;
}

double extract_double(const std::string& block, const std::string& key) {
    std::string search = "\"" + key + "\": ";
    auto pos = block.find(search);
    if (pos == std::string::npos) return 0.0;
    pos += search.size();
    size_t end = pos;
    while (end < block.size() &&
           (isdigit((unsigned char)block[end]) || block[end] == '-' ||
            block[end] == '+' || block[end] == '.' ||
            block[end] == 'e' || block[end] == 'E')) end++;
    try { return std::stod(block.substr(pos, end - pos)); }
    catch (...) { return 0.0; }
}

void clear_all_state() {
    for (const auto& g : list_groups())     delete_group(g.id);
    for (const auto& r : list_researchers()) delete_researcher(r.id);
    for (const auto& p : list_products())  delete_product(p.id);
    for (const auto& p : list_projects())  delete_project(p.id);
    clear_product_authors();
    vq_clear();
    undo_clear();
}

} // namespace peai
