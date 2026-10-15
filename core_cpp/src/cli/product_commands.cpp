// core_cpp/src/cli/product_commands.cpp
#include "product_commands.h"
#include "cli_helpers.h"
#include <iostream>
#include <iomanip>
#include <string>
#include <vector>
#include <algorithm>

namespace peai::cli {

int handle_products(int argc, char* argv[]) {
    if (argc < 3) { usage(); return 1; }
    std::string sub = argv[2];

    if (sub == "all") {
        auto products = list_products();
        if (products.empty()) {
            std::cout << "(no products)\n";
        } else {
            std::cout << "Products (" << products.size() << "):\n";
            for (const auto& p : products) print_product(p);
        }
        return 0;
    }

    if (sub == "add") {
        if (argc < 5) { std::cerr << "Provide code and title\n"; return 1; }
        Product proto;
        proto.external_code = argv[3];
        proto.title = argv[4];
        if (argc >= 6) proto.year = std::stoi(argv[5]);
        Product created = create_product(proto);
        push_undo("CREATE", "Product", created.id);
        std::cout << "Created product with ID " << created.id
                  << " (operación apilada)\n";
        return 0;
    }

    if (sub == "update") {
        if (argc < 5) { std::cerr << "Provide id and title\n"; return 1; }
        int id = std::stoi(argv[3]);
        auto prev = get_product(id);
        if (!prev) { std::cerr << "Product " << id << " not found\n"; return 1; }
        Product updates = *prev;
        updates.title = argv[4];
        if (argc >= 6) updates.year = std::stoi(argv[5]);
        push_undo("UPDATE", "Product", id, undo_snapshot_product(*prev));
        if (update_product(id, updates))
            std::cout << "Product " << id << " updated (operación apilada)\n";
        else
            std::cerr << "Update failed\n";
        return 0;
    }

    if (sub == "delete") {
        if (argc < 4) { std::cerr << "Provide product id\n"; return 1; }
        int id = std::stoi(argv[3]);
        auto prev = get_product(id);
        if (!prev) { std::cerr << "Product " << id << " not found\n"; return 1; }
        push_undo("DELETE", "Product", id, undo_snapshot_product(*prev));
        if (delete_product(id)) std::cout << "Deleted product " << id << " (operación apilada)\n";
        else                    std::cerr << "Delete failed\n";
        return 0;
    }

    if (sub == "link") {
        if (argc < 5) { std::cerr << "Provide group_id and product_id\n"; return 1; }
        int gid = std::stoi(argv[3]);
        int pid = std::stoi(argv[4]);
        if (contains_id(products_of_group(gid), pid)) {
            std::cout << "Product " << pid << " already linked to group " << gid << "\n";
            return 0;
        }
        auto* node = link_product_to_group(gid, pid);
        if (node) {
            push_undo("LINK_PRODUCT", "GroupProductLink", gid,
                      std::to_string(gid) + ":" + std::to_string(pid));
            std::cout << "Product " << pid << " linked to group " << gid
                      << " (enlace #" << node->data.linkId << ", operación apilada)\n";
        } else {
            std::cerr << "Group " << gid << " not found\n";
        }
        return 0;
    }

    if (sub == "list") {
        if (argc < 4) { std::cerr << "Provide group_id\n"; return 1; }
        int gid = std::stoi(argv[3]);
        auto ids = products_of_group(gid);
        if (ids.empty()) {
            std::cout << "(no products in group " << gid << ")\n";
        } else {
            std::cout << "Products in group " << gid << " (" << ids.size() << "):\n";
            for (int id : ids) {
                auto p = get_product(id);
                if (p) print_product(*p);
                else   std::cout << "  [product " << id << " not in memory]\n";
            }
        }
        return 0;
    }

    if (sub == "unlink") {
        if (argc < 5) { std::cerr << "Provide group_id and product_id\n"; return 1; }
        int gid = std::stoi(argv[3]);
        int pid = std::stoi(argv[4]);
        if (unlink_product_from_group(gid, pid)) {
            push_undo("UNLINK_PRODUCT", "GroupProductLink", gid,
                      std::to_string(gid) + ":" + std::to_string(pid));
            std::cout << "Product " << pid << " unlinked from group " << gid
                      << " (operación apilada)\n";
        } else {
            std::cerr << "Link not found\n";
        }
        return 0;
    }

    // products by-year <start> <end>   |   products by-year last <N>
    // Ventana de observación (Requerimiento 10) — usa la fecha de obtención.
    if (sub == "by-year") {
        if (argc < 5) {
            std::cerr << "Uso: products by-year <start> <end>  |  products by-year last <N>\n";
            return 1;
        }
        int start = 0, end = 0;
        if (std::string(argv[3]) == "last") {
            int n = std::stoi(argv[4]);
            if (n <= 0) { std::cerr << "N debe ser positivo\n"; return 1; }
            end = current_year();
            start = end - n;
        } else {
            start = std::stoi(argv[3]);
            end   = std::stoi(argv[4]);
        }
        if (start > end) std::swap(start, end);

        // Conteos por año dentro de la ventana.
        std::vector<std::pair<int,int>> per_year;  // (year, count)
        int in_window = 0, no_date = 0;
        for (const auto& p : list_products()) {
            int y = product_year(p);
            if (y == 0) { no_date++; continue; }
            if (y < start || y > end) continue;
            in_window++;
            auto it = std::find_if(per_year.begin(), per_year.end(),
                                   [y](const auto& kv) { return kv.first == y; });
            if (it != per_year.end()) it->second++;
            else per_year.push_back({y, 1});
        }
        std::sort(per_year.begin(), per_year.end());

        std::cout << "Ventana de observación: " << start << "-" << end
                  << " (año de obtención, Req. 10)\n";
        std::cout << "+------+-------+\n";
        std::cout << "| Año  | Total |\n";
        std::cout << "+------+-------+\n";
        for (const auto& [y, c] : per_year) {
            std::cout << "| " << std::setw(4) << y << " | " << std::setw(5) << c << " |\n";
        }
        std::cout << "+------+-------+\n";
        std::cout << "| Total productos en ventana: " << std::setw(6) << in_window << " |\n";
        if (no_date > 0)
            std::cout << "| Productos sin fecha válida: " << std::setw(7) << no_date << " |\n";
        std::cout << "+--------------------------------+\n";
        return 0;
    }

    std::cerr << "Unknown subcommand: " << sub << "\n";
    return 1;
}

} // namespace peai::cli
