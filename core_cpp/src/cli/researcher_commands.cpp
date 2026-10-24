// core_cpp/src/cli/researcher_commands.cpp
#include "researcher_commands.h"
#include "cli_helpers.h"
#include "services/group_service.h"
#include "services/product_service.h"
#include "services/official_indicator.h"
#include <cmath>
#include <iomanip>
#include <iostream>
#include <string>

namespace peai::cli {

namespace {

// Opciones de la línea de comandos del indicador.
// Cada invocación de pea_cli es un proceso nuevo con la RAM vacía, así que el
// dato de entrada se carga explícitamente con --data.
struct OpcionesIndicador {
    std::string archivo_datos;   // --data <archivo.json>
    bool json = false;           // --json (salida legible por máquina para la paridad)
    int anio = 0;                // --year <anio> (cierre de la ventana §2.2.9)
};

// Parsea las opciones después del subcomando. El primer posicional es el id.
bool parsear_opciones(int argc, char* argv[], int desde, int& id, OpcionesIndicador& op) {
    for (int i = desde; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--data") {
            if (i + 1 >= argc) { std::cerr << "--data requires a file path\n"; return false; }
            op.archivo_datos = argv[++i];
        } else if (arg == "--json") {
            op.json = true;
        } else if (arg == "--year") {
            if (i + 1 >= argc) { std::cerr << "--year requires a year\n"; return false; }
            op.anio = std::stoi(argv[++i]);
        } else if (!arg.empty() && arg[0] == '-') {
            std::cerr << "Unknown option: " << arg << "\n";
            return false;
        } else if (id == 0) {
            id = std::stoi(arg);
        } else {
            std::cerr << "Unexpected argument: " << arg << "\n";
            return false;
        }
    }
    return true;
}

// Carga el repositorio en la RAM si el usuario pasó --data.
bool cargar_datos(const OpcionesIndicador& op) {
    if (op.archivo_datos.empty()) return true;
    if (!load_from_file(op.archivo_datos)) {
        std::cerr << "Could not load data from " << op.archivo_datos << "\n";
        return false;
    }
    return true;
}

// Impresión legible del modelo oficial (§2.2.9 → §3.10).
void imprimir_modelo_oficial(const official::ResultadoOficial& r) {
    std::cout << "=== Indicador oficial de grupo Minciencias 2024 ===\n";
    std::cout << "Grupo: " << r.grupo << "  (edad: " << r.edad_grupo << " anios, cierre: "
              << r.anio_cierre << ")\n";
    std::cout << std::fixed << std::setprecision(6);
    std::cout << "Ind.Grupo = " << r.ind_grupo() << "  (rango teorico " << official::rango_teorico()
              << ")\n";
    std::cout << "Posicion en la poblacion: " << r.puesto << " de " << r.de
              << "  (percentil " << r.percentil << ")\n";
    std::cout << "--- Terminos §3.10 (indice §3.9 x coeficiente) ---\n";
    for (size_t i = 0; i < r.indices.size(); ++i) {
        std::cout << "  " << std::setw(8) << std::left << r.indices[i]
                  << " indice " << std::setw(10) << std::right << r.valores_indice[i]
                  << "  coef " << std::setw(4) << official::COEFICIENTES[i]
                  << "  ->  " << r.terminos[i] << "\n";
    }
    std::cout << "--- Ind_Clase por clase (§3.7 / §3.8.1) ---\n";
    for (size_t i = 0; i < r.clases.size(); ++i) {
        std::cout << "  " << std::setw(8) << std::left << r.clases[i]
                  << " valor " << std::setw(12) << std::right << r.valores_clase[i]
                  << "  maximo poblacion " << r.maximos_clase[i] << "\n";
    }
    std::cout << "--- Cohe (§2.2.10.1) / Coop (§2.2.10.2) ---\n";
    std::cout << "  Cohe = " << r.cohe.valor << "  (" << r.cohe.suma_autores << " autores del grupo / "
              << r.cohe.productos << " productos)\n";
    std::cout << "  Coop = " << r.coop.valor << "  (" << r.coop.suma_grupos << " grupos relacionados / "
              << r.coop.productos << " productos)\n";
    if (!r.subtipos.empty()) {
        std::cout << "--- Desglose por subtipo ---\n";
        for (const official::DetalleSubtipo& d : r.subtipos) {
            std::cout << "  " << std::setw(12) << std::left << d.codigo
                      << " n=" << d.n << " periodo=" << d.periodo
                      << " lambda=" << d.lambda
                      << " peso_global=" << d.peso_global
                      << " termino=" << d.termino << "\n";
        }
    }
    if (!r.excluidos.empty()) {
        std::cout << "--- Exclusiones (lo que la fuente no permite verificar) ---\n";
        for (const auto& par : r.excluidos) {
            std::cout << "  [" << par.second << "] " << par.first << "\n";
        }
    }
    std::cout << "Supuestos documentados en docs/indicador-oficial-2024.md\n";
}

// Impresión legible de la ADAPTACIÓN INDIVIDUAL (§2.2.9 → §3.10).
// OJO con el rótulo: el modelo de medición 2024 define UN solo indicador de
// producción y es DE GRUPO (§3.10). Lo que se muestra aquí es una adaptación
// declarada del mismo pipeline a la unidad "investigador": NO es un
// indicador oficial del modelo.
void imprimir_modelo_individual(const official::ResultadoOficial& r) {
    std::cout << "=== Adaptación individual del modelo Minciencias 2024 (NO OFICIAL) ===\n";
    std::cout << "Investigador: " << r.grupo << "  (antigüedad: " << r.edad_grupo
              << " anios, cierre: " << r.anio_cierre << ")\n";
    std::cout << std::fixed << std::setprecision(6);
    std::cout << "Ind.Investigador = " << r.ind_grupo() << "  (rango teorico "
              << official::rango_teorico() << ")\n";
    std::cout << "Posicion en la poblacion de investigadores: " << r.puesto << " de " << r.de
              << "  (percentil " << r.percentil << ")\n";
    std::cout << "--- Terminos §3.10 (indice §3.9 x coeficiente) ---\n";
    for (size_t i = 0; i < r.indices.size(); ++i) {
        std::cout << "  " << std::setw(8) << std::left << r.indices[i]
                  << " indice " << std::setw(10) << std::right << r.valores_indice[i]
                  << "  coef " << std::setw(4) << official::COEFICIENTES[i]
                  << "  ->  " << r.terminos[i] << "\n";
    }
    std::cout << "--- Ind_Clase por clase (§3.7 / §3.8.1) ---\n";
    for (size_t i = 0; i < r.clases.size(); ++i) {
        std::cout << "  " << std::setw(8) << std::left << r.clases[i]
                  << " valor " << std::setw(12) << std::right << r.valores_clase[i]
                  << "  maximo poblacion " << r.maximos_clase[i] << "\n";
    }
    std::cout << "--- Cohe (§2.2.10.1) / Coop (§2.2.10.2) de la RED ---\n";
    std::cout << "  Cohe = " << r.cohe.valor << "  (" << r.cohe.suma_autores
              << " firmantes registrados / " << r.cohe.productos << " productos)\n";
    std::cout << "  Coop = " << r.coop.valor << "  (" << r.coop.suma_grupos
              << " grupos de la red / " << r.coop.productos << " productos)\n";
    if (!r.subtipos.empty()) {
        std::cout << "--- Desglose por subtipo ---\n";
        for (const official::DetalleSubtipo& d : r.subtipos) {
            std::cout << "  " << std::setw(12) << std::left << d.codigo
                      << " n=" << d.n << " periodo=" << d.periodo
                      << " lambda=" << d.lambda
                      << " peso_global=" << d.peso_global
                      << " termino=" << d.termino << "\n";
        }
    }
    if (!r.excluidos.empty()) {
        std::cout << "--- Exclusiones (lo que la fuente no permite verificar) ---\n";
        for (const auto& par : r.excluidos) {
            std::cout << "  [" << par.second << "] " << par.first << "\n";
        }
    }
    std::cout << "Las TRES adaptaciones declaradas y los supuestos estan en el JSON (--json)\n";
    std::cout << "y en docs/indicador-oficial-2024.md\n";
}

} // namespace

int handle_researchers(int argc, char* argv[]) {
    if (argc < 3) { usage(); return 1; }
    std::string sub = argv[2];

    if (sub == "list") {
        auto res = list_researchers();
        if (res.empty()) {
            std::cout << "(no researchers)\n";
        } else {
            for (const auto& r : res) print_researcher(r);
        }
        return 0;
    }

    if (sub == "show") {
        if (argc < 4) { std::cerr << "Provide researcher id\n"; return 1; }
        int id = std::stoi(argv[3]);
        auto opt = get_researcher(id);
        if (opt) print_researcher(*opt);
        else     std::cerr << "Researcher " << id << " not found\n";
        return 0;
    }

    if (sub == "add") {
        if (argc < 6) { std::cerr << "Provide code, first_names and last_names\n"; return 1; }
        Researcher proto;
        proto.external_code = argv[3];
        proto.first_names = argv[4];
        proto.last_names = argv[5];
        Researcher created = create_researcher(proto);
        push_undo("CREATE", "Researcher", created.id);
        std::cout << "Created researcher with ID " << created.id
                  << " (operación apilada)\n";
        return 0;
    }

    if (sub == "update") {
        if (argc < 6) { std::cerr << "Provide id, first_names and last_names\n"; return 1; }
        int id = std::stoi(argv[3]);
        auto prev = get_researcher(id);
        if (!prev) { std::cerr << "Researcher " << id << " not found\n"; return 1; }
        Researcher updates = *prev;
        updates.first_names = argv[4];
        updates.last_names = argv[5];
        if (argc >= 7) updates.external_code = argv[6];
        if (argc >= 8) updates.institutional_email = argv[7];
        if (argc >= 9) updates.highest_education_level = argv[8];
        if (argc >= 10) updates.status = argv[9];
        push_undo("UPDATE", "Researcher", id, undo_snapshot_researcher(*prev));
        if (update_researcher(id, updates))
            std::cout << "Researcher " << id << " updated (operación apilada)\n";
        else
            std::cerr << "Update failed\n";
        return 0;
    }

    if (sub == "delete") {
        if (argc < 4) { std::cerr << "Provide researcher id\n"; return 1; }
        int id = std::stoi(argv[3]);
        auto prev = get_researcher(id);
        if (!prev) { std::cerr << "Researcher " << id << " not found\n"; return 1; }
        push_undo("DELETE", "Researcher", id, undo_snapshot_researcher(*prev));
        if (delete_researcher(id)) std::cout << "Deleted researcher " << id << " (operación apilada)\n";
        else                       std::cerr << "Delete failed\n";
        return 0;
    }

    std::cerr << "Unknown subcommand: " << sub << "\n";
    return 1;
}

int handle_indicator(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "Usage: pea_cli indicator researcher <id> [--data <archivo.json>] [--year <anio>] [--json]\n";
        std::cerr << "       pea_cli indicator group <id> [--data <archivo.json>] [--year <anio>] [--json]\n";
        return 1;
    }
    std::string sub = argv[2];

    if (sub == "researcher") {
        int id = 0;
        OpcionesIndicador op;
        if (!parsear_opciones(argc, argv, 3, id, op)) return 1;
        if (id == 0) { std::cerr << "Provide researcher id\n"; return 1; }
        if (!cargar_datos(op)) return 1;
        auto opt = get_researcher(id);
        if (!opt) { std::cerr << "Researcher " << id << " not found\n"; return 1; }
        const auto& r = *opt;

        if (list_researchers().empty()) {
            std::cerr << "The repository is empty: load data with --data <archivo.json>\n";
            return 1;
        }

        // --- Adaptación individual del modelo 2024 (§2.2.9 → §3.10) ------------
        // Es el MISMO cálculo que hace la API (`adaptacion_individual_2024`) y
        // que verifica scripts/pea_paridad_individual.py contra Python.
        //
        // OJO CON EL RÓTULO: el modelo de medición 2024 define UN solo
        // indicador de producción y es DE GRUPO (§3.10): no existe un
        // indicador oficial por persona. Esto es una ADAPTACIÓN DECLARADA.
        int anio = op.anio > 0 ? op.anio : current_year();
        std::string error;
        official::ResultadoOficial individual =
            official::evaluar_modelo_individual(id, anio, &error);
        if (!error.empty()) { std::cerr << error << "\n"; return 1; }

        if (op.json) {
            std::vector<official::ResultadoOficial> poblacion =
                official::evaluar_poblacion_investigadores(
                    official::construir_poblacion_investigadores(anio), anio);
            std::cout << official::resultado_individual_a_json(individual, poblacion);
            return 0;
        }

        imprimir_modelo_individual(individual);

        // --- Datos de contexto (lectura directa del repositorio) --------------
        std::cout << "\n--- Contexto del investigador ---\n";
        std::cout << "Nombre: " << r.first_names << " " << r.last_names << "\n";
        std::cout << "Codigo externo: " << r.external_code << "\n";
        std::cout << "Nivel formacion: " << r.highest_education_level << "\n";
        std::cout << "Productos vinculados: " << products_of_researcher_ram(id).size() << "\n";

        // --- El legacy NO se calcula en el CLI (brecha B5, Fase 6) -------------
        // Aquí vivía una SEGUNDA fórmula de I_Investigador (conteos crudos
        // clasificados por `quality_category_id` y con una ventana propia)
        // que divergía de la de la API: para el mismo investigador el CLI y la
        // API daban números distintos porque cada una clasificaba los
        // productos con reglas diferentes. Dos "referencias legacy" para la
        // misma cifra es exactamente lo que la auditoría marcó como B5.
        // Ahora el legacy tiene UNA sola implementación, la de la API, que lo
        // expone como `i_investigador_legacy` (aproximación legacy, no
        // oficial) porque es insumo descriptivo, no un indicador del modelo.
        std::cout << "\nNota: el indicador legacy (conteos crudos) no se calcula aquí.\n"
                  << "La API lo expone como `i_investigador_legacy` (aproximación legacy, no oficial):\n"
                  << "es una suma de conteos SIN λ (§2.2.9), SIN pesos por clase (§3.6) y SIN\n"
                  << "normalización contra la población (§3.9); no es un indicador del modelo 2024.\n";
        return 0;
    }

    if (sub == "group") {
        int id = 0;
        OpcionesIndicador op;
        if (!parsear_opciones(argc, argv, 3, id, op)) return 1;
        if (id == 0) { std::cerr << "Provide group id\n"; return 1; }
        if (!cargar_datos(op)) return 1;

        auto opt = get_group(id);
        if (!opt) { std::cerr << "Group " << id << " not found\n"; return 1; }
        const auto& g = *opt;

        if (list_groups().empty()) {
            std::cerr << "The repository is empty: load data with --data <archivo.json>\n";
            return 1;
        }

        // --- Modelo oficial Minciencias 2024 (§2.2.9 → §3.10) -----------------
        // Es el MISMO cálculo que hace la API (`modelo_oficial_2024`) y que
        // verifica scripts/pea_paridad_indicador.py contra Python.
        int anio = op.anio > 0 ? op.anio : current_year();
        std::string error;
        official::ResultadoOficial oficial = official::evaluar_modelo_oficial(id, anio, &error);
        if (!error.empty()) { std::cerr << error << "\n"; return 1; }

        if (op.json) {
            std::vector<official::ResultadoOficial> poblacion =
                official::evaluar_poblacion(official::construir_poblacion(anio), anio);
            std::cout << official::resultado_a_json(oficial, poblacion);
            return 0;
        }

        imprimir_modelo_oficial(oficial);

        // --- Datos de contexto (lectura directa del repositorio) --------------
        std::cout << "\n--- Contexto del grupo ---\n";
        std::cout << "Nombre: " << g.name << " (ID " << g.id << ", clasificacion: " << g.classification << ")\n";
        std::cout << "Miembros: " << total_members() << "\n";

        // --- El legacy NO se calcula en el CLI (brecha B5, Fase 6) -------------
        // Aquí vivía una SEGUNDA fórmula de I_Grupo (conteos crudos) que
        // divergía de la de la API: para el mismo grupo el CLI daba 36,00 y la
        // API 491,704, porque cada una clasificaba los productos con reglas
        // distintas. Dos "referencias legacy" para la misma cifra es
        // exactamente lo que la auditoría marcó como B5.
        // Ahora el legacy tiene UNA sola implementación, la de la API, que lo
        // expone como `i_grupo_legacy` (aproximación, no oficial) porque es
        // insumo del semáforo de categorización y no un indicador del modelo.
        std::cout << "\nNota: el indicador legacy (conteos crudos) no se calcula aquí.\n"
                  << "La API lo expone como `i_grupo_legacy` (aproximación legacy, no oficial):\n"
                  << "es insumo del semáforo de categorización, no un indicador del modelo 2024.\n";
        return 0;
    }

    std::cerr << "Unknown subcommand: " << sub << "\n";
    std::cerr << "Usage: pea_cli indicator researcher <id> [--data <archivo.json>] [--year <anio>] [--json]\n";
    std::cerr << "       pea_cli indicator group <id> [--data <archivo.json>] [--year <anio>] [--json]\n";
    return 1;
}

} // namespace peai::cli
