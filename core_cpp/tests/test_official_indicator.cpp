// core_cpp/tests/test_official_indicator.cpp
// Pruebas unitarias del indicador oficial de grupo Minciencias 2024.
// Fase 4 (brecha B6) del plan docs/plan-integracion-modelo-oficial.md.
//
// El núcleo C++ es el TERCER cálculo del modelo (§2.2.9 → §3.10). Sin estas
// pruebas, una regresión en C++ solo aparecería al comparar contra Python
// (`scripts/pea_paridad_indicador.py`), que corre en otro lenguaje, sobre
// otro ejecutable y únicamente si alguien se acuerda de correrlo.
//
// Qué cubren:
//   - las piezas puras del modelo: λ (§2.2.9), la clasificación por
//     descripción, la familia relacional (§2.2.10) y la cascada de años;
//   - la evaluación completa sobre el CASO SINTÉTICO del contrato
//     (backend/tests/fixtures/indicador_oficial_caso.json): los mismos
//     números que fija el golden versionado;
//   - los invariantes: §3.9 (el índice del máximo de la población es 1),
//     §3.10 (Ind.Grupo = Σ términos) y el rango teórico 10;
//   - el CONTRATO: `resultado_a_json` emite las 20 claves raíz que declara
//     backend/app/evaluator/contrato_oficial.py::CONTRATO.
//
// Framework mínimo (sin dependencias externas), como en test_structures.cpp.

#include "core.h"
#include "services/official_indicator.h"

#include <cmath>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace peai;

// ---- Framework mínimo ----
static int g_passed = 0;
static int g_failed = 0;

#define CHECK(cond, msg)                                            \
    do {                                                            \
        if (cond) { g_passed++; }                                   \
        else {                                                      \
            g_failed++;                                             \
            std::cout << "  [FALLA] " << msg                        \
                      << " (linea " << __LINE__ << ")\n";           \
        }                                                           \
    } while (0)

#define CHECK_NEAR(actual, esperado, msg)                                     \
    do {                                                                      \
        double a_ = static_cast<double>(actual);                              \
        double e_ = static_cast<double>(esperado);                            \
        if (std::fabs(a_ - e_) <= 1e-9) { g_passed++; }                       \
        else {                                                                \
            g_failed++;                                                       \
            std::cout << "  [FALLA] " << msg                                  \
                      << " (linea " << __LINE__ << "): " << a_                \
                      << " != " << e_ << "\n";                                \
        }                                                                     \
    } while (0)

// Estado limpio antes de cada prueba (las estructuras son globales).
static void reset_state() {
    for (const auto& g : list_groups())      delete_group(g.id);
    for (const auto& r : list_researchers()) delete_researcher(r.id);
    for (const auto& p : list_products())    delete_product(p.id);
    for (const auto& p : list_projects())    delete_project(p.id);
    clear_product_authors();
    vq_clear();
    undo_clear();
}

#define RUN_TEST(fn)                                \
    do {                                            \
        reset_state();                              \
        std::cout << "[TEST] " << #fn << "\n";      \
        fn();                                       \
    } while (0)

// ---- Utilidades --------------------------------------------------------------

#ifndef PEAI_REPO_ROOT
#define PEAI_REPO_ROOT ".."
#endif

/// Ruta del caso sintético del contrato (misma entrada que usa el backend).
/// Se busca subiendo directorios desde el actual: el test corre desde el
/// build (ctest) o desde la raíz del repo, y en ambos casos el caso está
/// cuatro niveles arriba como máximo.
static std::string ruta_caso() {
    std::string base = ".";
    for (int nivel = 0; nivel < 8; ++nivel) {
        std::string candidato =
            base + "/backend/tests/fixtures/indicador_oficial_caso.json";
        std::ifstream archivo(candidato);
        if (archivo.good()) return candidato;
        base += "/..";
    }
    return "";
}

/// ¿El JSON emitted contiene esta clave raíz? (las raíz van indentadas 2)
static bool tiene_clave_raiz(const std::string& json, const std::string& clave) {
    return json.find("\n  \"" + clave + "\":") != std::string::npos;
}

/// Detalle de un subtipo por código (nullptr si no está).
static const official::DetalleSubtipo* buscar_subtipo(
    const official::ResultadoOficial& r, const std::string& codigo) {
    for (const official::DetalleSubtipo& s : r.subtipos) {
        if (s.codigo == codigo) return &s;
    }
    return nullptr;
}

/// Cuenta de productos excluidos cuyo motivo contiene el fragmento (-1 = no está).
static int motivo_excluido(const official::ResultadoOficial& r,
                            const std::string& fragmento) {
    for (const auto& kv : r.excluidos) {
        if (kv.first.find(fragmento) != std::string::npos) return kv.second;
    }
    return -1;
}

// =====================================================================
//  PIEZAS PURAS DEL MODELO
// =====================================================================

// λ (§2.2.9) = ln(n / período + 1).
static void test_lambda_subtipo() {
    CHECK_NEAR(official::lambda_subtipo(1, 5), std::log(1.2), "lambda(1,5) = ln(1,2)");
    CHECK_NEAR(official::lambda_subtipo(1, 2), std::log(1.5), "lambda(1,2) = ln(1,5)");
    CHECK_NEAR(official::lambda_subtipo(1, 2), 0.4054651081081644, "lambda(1,2) = ln(1,5)");
    CHECK_NEAR(official::lambda_subtipo(6, 5), std::log(2.2), "lambda(6,5) = ln(2,2)");
    CHECK_NEAR(official::lambda_subtipo(0, 5), 0.0, "sin productos, lambda = 0");
    CHECK_NEAR(official::lambda_subtipo(3, 0), 0.0, "sin período, lambda = 0");
}

// Clasificación conservadora por descripción GrupLAC: lo verificable entra,
// lo que no, se excluye con motivo explícito.
static void test_inferir_categoria() {
    auto wp = official::inferir_categoria("3.- Documento de trabajo (Working Paper) : Ensayo, 2024");
    CHECK(wp.first == "WP", "working paper -> WP");
    CHECK(!wp.second.empty(), "el motivo explica la categoria");

    auto lib = official::inferir_categoria("6.- Libros de divulgacion : Compilacion, 2024");
    CHECK(lib.first == "LIB_DIV", "libro de divulgacion -> LIB_DIV");

    auto ifi = official::inferir_categoria("6.- Informe final proyecto de investigacion : Informe, 2024");
    CHECK(ifi.first == "IFI", "informe final de investigacion -> IFI");

    auto tpb = official::inferir_categoria("1.- Trabajo de grado de pregrado : Tesis, 2025");
    CHECK(tpb.first == "TP_B", "trabajo de pregrado -> TP_B");

    auto tmb = official::inferir_categoria("2.- Trabajo de grado de maestria : Tesis, 2025");
    CHECK(tmb.first == "TM_B", "trabajo de maestria -> TM_B");

    // Sin calidad oficial verificable: se EXCLUYE, no se inventa categoria.
    auto art = official::inferir_categoria("12.- Publicado en revista especializada : Paper, 2023");
    CHECK(art.first.empty(), "articulo sin calidad oficial no tiene categoria");
    CHECK(art.second.find("Publindex") != std::string::npos, "el motivo cita Publindex");

    auto evento = official::inferir_categoria("15.- Trabajos en eventos : Ponencia, 2024");
    CHECK(evento.first.empty(), "ponencia no es tipo de producto del modelo 2024");
    CHECK(!evento.second.empty(), "la exclusion explica el motivo");

    auto vacio = official::inferir_categoria("");
    CHECK(vacio.first.empty(), "sin descripcion no hay categoria");
    CHECK(vacio.second.find("descripci") != std::string::npos, "el motivo dice 'sin descripcion'");
}

// §2.2.10 es RELACIONAL: un artículo sin Publindex sigue siendo GNC.
static void test_familia_relacional() {
    CHECK(official::determinar_familia(6, "12.- publicado en revista especializada : paper") == "GNC",
          "un articulo es GNC por su familia");
    CHECK(official::determinar_familia(9, "3.- documento de trabajo (working paper) : ensayo") == "DPC",
          "un working paper es DPC");
    CHECK(official::determinar_familia(10, "2.- trabajo de grado de maestria : tesis") == "FRH",
          "una tesis es FRH");

    CHECK(official::familia_relacional(6, "12.- Publicado en revista especializada : Paper") == "GNC",
          "el articulo sin calidad si cuenta para Cohe/Coop");
    CHECK(official::familia_relacional(9, "3.- Documento de trabajo (Working Paper) : Ensayo").empty(),
          "el working paper no entra al dominio relacional");
    CHECK(official::familia_relacional(0, "").empty(),
          "sin descripcion no hay familia relacional");
}

// Cascada de años: year -> obtained_date -> publication_date -> descripcion.
// El núcleo usa 0 como "sin año verificable".
static void test_extraer_anio() {
    CHECK(official::extraer_anio(2024, "", "", "") == 2024, "el campo year manda");
    CHECK(official::extraer_anio(0, "2019-05-01", "", "") == 2019, "obtained_date es el segundo");
    CHECK(official::extraer_anio(0, "", "2018", "") == 2018, "publication_date es el tercero");
    CHECK(official::extraer_anio(0, "", "", "Desde 9 2025 hasta Abril 2026") == 2025,
          "la descripcion es el ultimo recurso");
    CHECK(official::extraer_anio(1909, "", "", "") == 0, "los anios espurios no cuentan");
    CHECK(official::extraer_anio(0, "", "", "") == 0, "sin anio verificable");
}

// =====================================================================
//  EVALUACIÓN SOBRE EL CASO SINTÉTICO DEL CONTRATO
// =====================================================================

static void test_evaluacion_del_caso_sintetico() {
    CHECK(load_from_file(ruta_caso()), "el caso sintetico se carga en la RAM");
    CHECK(list_groups().size() == 2, "el caso tiene dos grupos");

    std::string error;
    official::ResultadoOficial a = official::evaluar_modelo_oficial(10, 2026, &error);
    CHECK(error.empty(), "el grupo 10 se evalua sin error");
    CHECK(a.grupo == "AITICE (#10)", "el grupo 10 es AITICE");

    // Edad: primer año de producción (2018) -> 2026 - 2018 = 8 años.
    CHECK(a.edad_grupo == 8, "la edad del grupo 10 es 8 anos");

    // §3.10: Ind.Grupo del golden versionado.
    CHECK_NEAR(a.ind_grupo(), 0.8152872176748235, "Ind.Grupo del grupo 10");
    CHECK(a.puesto == 2 && a.de == 2, "el grupo 10 va segundo de dos");
    CHECK_NEAR(a.percentil, 50.0, "percentil del grupo 10");

    // §3.8.1: Ind_Clase por clase.
    CHECK_NEAR(a.maximo_clase("DPC"), 405.4651081081644, "maximo de la poblacion en DPC");
    CHECK_NEAR(a.maximo_clase("FRH-B"), 141.91278783785754, "maximo de la poblacion en FRH-B");
    CHECK_NEAR(a.indice("DPC"), 0.8993205735735829, "indice DPC del grupo 10");
    CHECK_NEAR(a.indice("Fr.B"), 0.5781346544401604, "indice Fr.B del grupo 10");
    CHECK_NEAR(a.indice("Cohe"), 1.0, "indice Cohe del grupo 10");
    CHECK_NEAR(a.indice("Coop"), 0.5, "indice Coop del grupo 10");

    // §2.2.10.1/.2: Cohe y Coop.
    CHECK(a.cohe.suma_autores == 4 && a.cohe.productos == 2, "Cohe: 4 autores sobre 2 productos");
    CHECK_NEAR(a.cohe.valor, 1.0, "Cohe = 4/2 - 1");
    CHECK(a.coop.suma_grupos == 3 && a.coop.productos == 2, "Coop: 3 grupos sobre 2 productos");
    CHECK_NEAR(a.coop.valor, 0.5, "Coop = 3/2 - 1");

    // Desglose por subtipo (§2.2.9 y §3.6): la ventana (5) manda sobre la edad (8).
    const official::DetalleSubtipo* lib = buscar_subtipo(a, "LIB_DIV");
    CHECK(lib != nullptr, "LIB_DIV aporta");
    if (lib) {
        CHECK(lib->n == 1, "LIB_DIV: un producto en la ventana");
        CHECK(lib->periodo == 5, "LIB_DIV: periodo = min(edad, ventana) = 5");
        CHECK_NEAR(lib->lambda, 0.1823215567939546, "LIB_DIV: lambda");
        CHECK_NEAR(lib->peso_global, 1000.0, "LIB_DIV: peso global = ancla 100 x 10");
        CHECK_NEAR(lib->termino, 182.32155679395458, "LIB_DIV: termino = lambda x peso global");
        CHECK(lib->clase == "DPC" && lib->familia == "DPC", "LIB_DIV: clase DPC");
    }
    const official::DetalleSubtipo* tmb = buscar_subtipo(a, "TM_B");
    CHECK(tmb != nullptr, "TM_B aporta");
    if (tmb) {
        CHECK_NEAR(tmb->peso_global, 350.0, "TM_B: peso global = ancla 70 x 5");
        CHECK(tmb->clase == "FRH-B", "TM_B: clase FRH-B");
    }
    const official::DetalleSubtipo* tpb = buscar_subtipo(a, "TP_B");
    CHECK(tpb != nullptr, "TP_B aporta");
    if (tpb) {
        CHECK_NEAR(tpb->peso_global, 100.0, "TP_B: peso global = ancla 20 x 5");
    }
    CHECK(buscar_subtipo(a, "ART_A1") == nullptr, "lo excluido no aporta");

    // Histogramas: sin año, fuera de la ventana y exclusiones con motivo.
    CHECK(a.sin_ano.size() == 1 && a.sin_ano.begin()->second == 1, "un producto sin ano");
    CHECK(a.fuera_de_periodo.size() == 1 && a.fuera_de_periodo.begin()->second == 1,
          "un producto fuera de la ventana");
    CHECK(motivo_excluido(a, "Publindex") == 2, "dos articulos sin calidad oficial");
    CHECK(motivo_excluido(a, "trabajo en evento") == 1, "una ponderncia excluida");
    CHECK(motivo_excluido(a, "sin descripci") == 1, "un producto sin descripcion");

    // El grupo joven: la EDAD (2) manda sobre la ventana (5).
    official::ResultadoOficial g = official::evaluar_modelo_oficial(20, 2026, &error);
    CHECK(error.empty(), "el grupo 20 se evalua sin error");
    CHECK(g.edad_grupo == 2, "la edad del grupo 20 es 2 anos");
    CHECK_NEAR(g.ind_grupo(), 1.0, "Ind.Grupo del grupo 20");
    CHECK(g.puesto == 1 && g.de == 2, "el grupo 20 va primero de dos");
    CHECK_NEAR(g.percentil, 100.0, "percentil del grupo 20");
    CHECK_NEAR(g.cohe.valor, 0.0, "Cohe del grupo 20 = 0 (firma solo)");
    CHECK_NEAR(g.coop.valor, 1.0, "Coop del grupo 20 = 1 (coautoria con otro grupo)");
    const official::DetalleSubtipo* wp = buscar_subtipo(g, "WP");
    CHECK(wp != nullptr, "WP aporta en el grupo 20");
    if (wp) CHECK(wp->periodo == 2, "WP: periodo = min(edad 2, ventana 5) = 2");
}

// §3.9: el índice es el valor sobre el máximo de la población; el máximo es 1.
static void test_normalizacion_sobre_la_poblacion() {
    CHECK(load_from_file(ruta_caso()), "el caso sintetico se carga en la RAM");
    std::vector<official::GrupoOficial> grupos = official::construir_poblacion(2026);
    CHECK(grupos.size() == 2, "la poblacion tiene dos grupos");

    std::vector<official::ResultadoOficial> res = official::evaluar_poblacion(grupos, 2026);
    CHECK(res.size() == 2, "se evaluan los dos grupos");

    for (const official::ResultadoOficial& r : res) {
        for (size_t i = 0; i < r.valores_indice.size(); ++i) {
            CHECK(r.valores_indice[i] >= -1e-12 && r.valores_indice[i] <= 1.0 + 1e-12,
                  "el indice normalizado esta entre 0 y 1");
        }
        // Ningún grupo puede superar el máximo de su clase (§3.9).
        for (size_t c = 0; c < r.clases.size(); ++c) {
            CHECK(r.valores_clase[c] <= r.maximos_clase[c] + 1e-9,
                  "el valor de la clase no supera el maximo de la poblacion");
            if (r.maximos_clase[c] > 0.0 && r.valores_clase[c] >= r.maximos_clase[c] - 1e-12) {
                break;  // este grupo topa la clase: su índice es 1 (se comprueba abajo)
            }
        }
    }

    // El tope exacto: el grupo 20 gana DPC y FRH-B, luego su indice es 1.
    // OJO: `evaluar_poblacion` no fija `grupo_id` (solo `evaluar_modelo_oficial`
    // lo hace), asi que los grupos se(localizan por su identificacion.
    const official::ResultadoOficial* veinte = nullptr;
    const official::ResultadoOficial* diez = nullptr;
    for (const official::ResultadoOficial& r : res) {
        if (r.grupo == "GISICO (#20)") veinte = &r;
        if (r.grupo == "AITICE (#10)") diez = &r;
    }
    CHECK(veinte && diez, "los dos grupos quedan identificados");
    if (veinte && diez) {
        CHECK_NEAR(veinte->indice("DPC"), 1.0, "el grupo 20 topa DPC en la poblacion");
        CHECK_NEAR(veinte->indice("Fr.B"), 1.0, "el grupo 20 topa FRH-B en la poblacion");
        CHECK_NEAR(veinte->indice("Coop"), 1.0, "el grupo 20 topa Coop en la poblacion");
        CHECK_NEAR(diez->indice("DPC"), 0.8993205735735829, "el grupo 10 queda por debajo del tope");
    }
}

// §3.10: Ind.Grupo = Σ (coeficiente × índice); el rango teórico es 10.
static void test_formula_310_y_rango() {
    CHECK(load_from_file(ruta_caso()), "el caso sintetico se carga en la RAM");
    std::string error;
    official::ResultadoOficial r = official::evaluar_modelo_oficial(10, 2026, &error);

    CHECK(r.indices.size() == 9, "el modelo tiene los 9 terminos de §3.10");
    CHECK(r.terminos.size() == 9, "hay un termino ponderado por cada indice");
    CHECK_NEAR(official::rango_teorico(), 10.0, "el rango teorico es 10");

    double suma = 0.0;
    for (double t : r.terminos) suma += t;
    CHECK_NEAR(suma, r.ind_grupo(), "Ind.Grupo es la suma de los 9 terminos");

    for (size_t i = 0; i < r.indices.size(); ++i) {
        double coeficiente = official::COEFICIENTES[i];
        CHECK_NEAR(r.terminos[i], coeficiente * r.valores_indice[i],
                   "el termino es el coeficiente por el indice");
    }
}

// =====================================================================
//  CONTRATO: el JSON debe traer las 20 claves raíz del contrato
// =====================================================================

static void test_json_cumple_el_contrato() {
    CHECK(load_from_file(ruta_caso()), "el caso sintetico se carga en la RAM");
    std::string error;
    official::ResultadoOficial r = official::evaluar_modelo_oficial(10, 2026, &error);
    std::vector<official::ResultadoOficial> poblacion =
        official::evaluar_poblacion(official::construir_poblacion(2026), 2026);
    std::string json = official::resultado_a_json(r, poblacion);

    const char* claves[] = {
        "modelo", "anio_cierre", "grupo", "ind_grupo", "rango_teorico",
        "posicion_poblacion", "poblacion", "indices", "terminos_ponderados",
        "ind_clase", "maximos_poblacion", "maximo_cohe_poblacion",
        "maximo_coop_poblacion", "subtipos", "cohe", "coop", "excluidos",
        "sin_ano", "fuera_de_periodo", "supuestos",
    };
    for (const char* clave : claves) {
        CHECK(tiene_clave_raiz(json, clave), std::string("el JSON trae la clave ") + clave);
    }
    CHECK(json.front() == '{' && json.find("\n}\n") != std::string::npos,
          "el JSON es un objeto completo");
    CHECK(json.find("\"ind_grupo\":") != std::string::npos, "el JSON trae el Ind.Grupo");
    CHECK(official::supuestos().size() == 6, "los supuestos documentados son seis");
}

int main() {
    std::cout << "===== Pruebas del indicador oficial 2024 (Fase 4) =====\n\n";

    std::cout << "--- Piezas puras del modelo ---\n";
    RUN_TEST(test_lambda_subtipo);
    RUN_TEST(test_inferir_categoria);
    RUN_TEST(test_familia_relacional);
    RUN_TEST(test_extraer_anio);

    std::cout << "\n--- Evaluacion sobre el caso sintetico ---\n";
    RUN_TEST(test_evaluacion_del_caso_sintetico);
    RUN_TEST(test_normalizacion_sobre_la_poblacion);
    RUN_TEST(test_formula_310_y_rango);

    std::cout << "\n--- Contrato ---\n";
    RUN_TEST(test_json_cumple_el_contrato);

    std::cout << "\n===== Resultado: " << g_passed << " OK, "
              << g_failed << " fallas =====\n";
    return g_failed == 0 ? 0 : 1;
}
