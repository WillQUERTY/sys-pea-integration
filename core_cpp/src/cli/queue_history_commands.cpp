// core_cpp/src/cli/queue_history_commands.cpp
#include "queue_history_commands.h"
#include "cli_helpers.h"
#include <iostream>
#include <string>

namespace peai::cli {

int handle_queue(int argc, char* argv[]) {
    if (argc < 3) { usage(); return 1; }
    std::string sub = argv[2];

    if (sub == "list") {
        auto items = vq_list();
        if (items.empty()) {
            std::cout << "(cola de validación vacía)\n";
        } else {
            std::cout << "Cola de validación (FIFO, frente primero — " << items.size() << "):\n";
            for (const auto& it : items) {
                std::cout << "  #" << it.id
                          << " | producto " << it.product_id
                          << " | " << it.status
                          << " | intentos: " << it.attempts;
                if (!it.assigned_to.empty()) std::cout << " | " << it.assigned_to;
                std::cout << "\n";
            }
        }
        return 0;
    }

    if (sub == "enqueue") {
        if (argc < 4) { std::cerr << "Provide product id\n"; return 1; }
        int pid = std::stoi(argv[3]);
        ValidationQueueItem item;
        item.product_id = pid;
        item.assigned_to = argc >= 5 ? argv[4] : "evaluador_tecnico";
        vq_enqueue(item);
        std::cout << "Product " << pid << " enqueued (cola: " << vq_size()
                  << ", pendientes: " << vq_pending_count() << ")\n";
        return 0;
    }

    if (sub == "process") {
        auto item = vq_dequeue();   // dequeue = front de la FIFO
        if (!item) {
            std::cout << "(cola de validación vacía, nada que procesar)\n";
            return 0;
        }
        std::cout << "Procesando (FIFO): producto " << item->product_id << "\n";
        auto prod = get_product(item->product_id);
        if (prod) {
            std::cout << "  Antes : validation_status = " << prod->validation_status << "\n";
            push_undo("VALIDATE", "Product", prod->id, prod->validation_status);
            Product updated = *prod;
            updated.validation_status = "valid";
            update_product(prod->id, updated);
            std::cout << "  Después: validation_status = valid (operación apilada)\n";
        } else {
            std::cout << "  (producto no está en memoria; solo se desencola)\n";
        }
        std::cout << "Pendientes restantes: " << vq_pending_count() << "\n";
        return 0;
    }

    std::cerr << "Unknown subcommand: " << sub << "\n";
    return 1;
}

int handle_history(int argc, char* argv[]) {
    if (argc < 3) { usage(); return 1; }
    std::string sub = argv[2];

    if (sub == "list") {
        auto ops = undo_list();   // cima primero
        if (ops.empty()) {
            std::cout << "(pila de operaciones vacía)\n";
        } else {
            std::cout << "Pila de operaciones (LIFO, cima primero — " << ops.size() << "):\n";
            for (const auto& op : ops) {
                std::cout << "  #" << op.id
                          << " | " << op.operation_type
                          << " " << op.entity_type
                          << " #" << op.entity_id << "\n";
            }
        }
        return 0;
    }

    if (sub == "top") {
        auto op = undo_top();
        if (op) {
            std::cout << "Cima de la pila: #" << op->id
                      << " | " << op->operation_type
                      << " " << op->entity_type
                      << " #" << op->entity_id << "\n";
        } else {
            std::cout << "(pila vacía)\n";
        }
        return 0;
    }

    if (sub == "undo") {
        if (undo_perform())
            std::cout << "Undo OK (pila: " << undo_size() << " restantes)\n";
        return 0;
    }

    if (sub == "clear") {
        undo_clear();
        std::cout << "Pila de operaciones vaciada.\n";
        return 0;
    }

    std::cerr << "Unknown subcommand: " << sub << "\n";
    return 1;
}

} // namespace peai::cli
