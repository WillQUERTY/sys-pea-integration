// core_cpp/src/cli/interactive_repl.cpp
#include "interactive_repl.h"
#include <iostream>
#include <string>
#include <vector>

namespace peai::cli {

int interactive_mode(DispatchFn dispatch_fn) {
    std::cout << "Khemia CLI  (modo interactivo)\n";
    std::cout << "Escribe comandos como: groups add G01 \"Grupo Alpha\"\n";
    std::cout << "Escribe 'exit' o 'quit' para salir.\n\n";

    std::string line;
    while (true) {
        std::cout << "pea> ";
        if (!std::getline(std::cin, line)) break;
        if (line.empty()) continue;
        if (line == "exit" || line == "quit") break;

        // Tokenize the line (simple split by spaces, respecting quotes)
        std::vector<std::string> tokens;
        std::string token;
        bool in_quote = false;
        for (char c : line) {
            if (c == '"') { in_quote = !in_quote; continue; }
            if (c == ' ' && !in_quote) {
                if (!token.empty()) { tokens.push_back(token); token.clear(); }
            } else {
                token += c;
            }
        }
        if (!token.empty()) tokens.push_back(token);
        if (tokens.empty()) continue;

        // Build argc/argv for dispatch
        std::vector<char*> args;
        std::string prog = "pea_cli";
        args.push_back(prog.data());
        for (auto& t : tokens) args.push_back(t.data());

        dispatch_fn(static_cast<int>(args.size()), args.data());
        std::cout << "\n";
    }
    return 0;
}

} // namespace peai::cli
