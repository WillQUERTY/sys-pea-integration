// core_cpp/src/cli/structure_commands.h
#ifndef PEAI_CLI_STRUCTURE_COMMANDS_H
#define PEAI_CLI_STRUCTURE_COMMANDS_H

#include <string>

namespace peai::cli {

int handle_structures(int argc, char* argv[]);
int handle_summary();
int handle_persistence(const std::string& cmd, int argc, char* argv[]);

} // namespace peai::cli

#endif // PEAI_CLI_STRUCTURE_COMMANDS_H
