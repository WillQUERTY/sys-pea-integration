// core_cpp/src/cli/interactive_repl.h
#ifndef PEAI_CLI_INTERACTIVE_REPL_H
#define PEAI_CLI_INTERACTIVE_REPL_H

namespace peai::cli {

typedef int (*DispatchFn)(int argc, char* argv[]);

int interactive_mode(DispatchFn dispatch_fn);

} // namespace peai::cli

#endif // PEAI_CLI_INTERACTIVE_REPL_H
