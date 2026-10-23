// core_cpp/include/services/official_indicator.h
// Indicador oficial de grupo Minciencias 2024 — puerto C++ del modelo de
// medición (§2.2.9 → §3.10), equivalente a
// backend/app/evaluator/official_indicator.py + official_population.py.
//
// Se implementa sobre la MISMA RAM que usa el backend (grupos, productos,
// membresías y autores), de modo que `pea_cli indicator group <id>` y
// `GET /groups/{id}/minciencias-diagnosis` → `modelo_oficial_2024` producen
// el mismo Ind.Grupo. La paridad se verifica con
// scripts/pea_paridad_indicador.py.

#ifndef PEAI_SERVICES_OFFICIAL_INDICATOR_H
#define PEAI_SERVICES_OFFICIAL_INDICATOR_H

#include <map>
#include <string>
#include <utility>
#include <vector>

namespace peai::official {

// --- §3.10: coeficientes oficiales -------------------------------------------
// Orden canónico: el que usa el backend Python y el modelo.
extern const char* const TERMINOS[9];     // Nc.Top … Coop
extern const double     COEFICIENTES[9];  // 3.7, 2.3, 0.4, 1.5, 0.5, 1.0, 0.2, 0.1, 0.3
extern const char* const CLASES[7];       // TOP, A, B, ASC, DPC, FRH-A, FRH-B
extern const char* const TERMINO_POR_CLASE[7];

double rango_teorico();

// --- Catálogo 2024 ------------------------------------------------------------
struct CatalogoCategoria {
    std::string code;
    std::string familia;        // GNC / DTI / ASC / DPC / FRH
    std::string subtipo;
    std::string clase;          // TOP / A / B / ASC / DPC / FRH-A / FRH-B
    double      peso_relativo = 0.0;  // Anexo 1
    double      ancla_subtipo = -1.0; // Tabla 6 (< 0 = sin ancla)
    int         ventana_subtipo = 5;  // Tabla 5

    bool tiene_ancla() const { return ancla_subtipo >= 0; }
    double peso_global() const { return tiene_ancla() ? ancla_subtipo * peso_relativo : -1.0; }
};

using Catalogo = std::map<std::string, CatalogoCategoria>;

/// Catálogo único (se construye una vez desde la tabla generada).
const Catalogo& catalogo();

/// Categoría del catálogo por código (nullptr si no existe).
const CatalogoCategoria* categoria(const std::string& code);

// --- Clasificación conservadora (GrupLAC) -------------------------------------

/// Clasifica una descripción GrupLAC en una categoría oficial.
/// Devuelve {código de categoría ("" si no clasificable), motivo}.
/// Reglas conservadoras: lo que la fuente no evidencia, se excluye con motivo
/// explícito en vez de inventarse una categoría (equivalente a
/// `inferir_categoria` del backend).
std::pair<std::string, std::string> inferir_categoria(const std::string& descripcion);

/// Familia amplia (GNC/DTI/ASC/DPC/FRH/OTRA) que la fuente evidencia.
/// Equivalente a `determine_family` del backend (mismas reglas, texto en
/// minúsculas SIN normalizar acentos).
std::string determinar_familia(int family_id, const std::string& descripcion_lower);

/// Familia relacional (§2.2.10): solo GNC y DTI; "" si no aplica.
std::string familia_relacional(int family_id, const std::string& descripcion);

// --- Año del producto (§2.2.9) -------------------------------------------------
int extraer_anio(int year, const std::string& obtained_date,
                 const std::string& publication_date, const std::string& descripcion);

/// Año de creación del grupo declarado; 0 si no hay.
int extraer_anio_fecha(const std::string& fecha);

// --- §2.2.9 --------------------------------------------------------------------
double lambda_subtipo(int n_productos, double periodo);

// --- Estructuras del modelo ----------------------------------------------------
struct ProductoOficial {
    std::string identificacion;
    std::string categoria;        // "" = no clasificable
    std::string motivo;
    int         anio = -1;        // -1 = sin año
    int         autores_del_grupo = 0;   // §2.2.10.1
    int         grupos_relacionados = 0; // §2.2.10.2
    std::string familia_medicion; // GNC/DTI que la fuente evidencia sin calidad
};

struct GrupoOficial {
    std::string identificacion;
    int         edad_grupo = 1;
    std::vector<ProductoOficial> productos;
};

struct DetalleSubtipo {
    std::string codigo;
    std::string clase;
    std::string familia;
    int         n = 0;
    int         periodo = 0;
    double      lambda = 0.0;
    double      ancla_subtipo = -1.0;
    double      peso_relativo = 0.0;
    double      peso_global = 0.0;
    double      termino = 0.0;
};

struct Relacionales {
    int    suma_autores = 0;   // Cohe: firmantes del grupo sumados (§2.2.10.1)
    int    suma_grupos = 0;    // Coop: grupos relacionados sumados (§2.2.10.2)
    int    productos = 0;      // productos del dominio relacional
    double valor = 0.0;
};

struct ResultadoOficial {
    std::string grupo;            // "AITICE (#10)"
    int         grupo_id = 0;
    int         anio_cierre = 0;
    int         edad_grupo = 0;

    std::vector<std::string>               indices;   // 9 (§3.9), en orden canónico
    std::vector<double>                    valores_indice;
    std::vector<double>                    terminos;  // coef × índice (§3.10)

    std::vector<std::string>               clases;    // 7 (§3.7)
    std::vector<double>                    valores_clase;
    std::vector<double>                    maximos_clase;

    double maximo_cohe = 0.0;
    double maximo_coop = 0.0;

    std::vector<DetalleSubtipo> subtipos;   // ordenado por término descendente
    Relacionales cohe, coop;

    std::map<std::string, int> excluidos;
    std::map<std::string, int> sin_ano;
    std::map<std::string, int> fuera_de_periodo;

    int    puesto = 0;
    int    de = 0;
    double percentil = 0.0;

    double ind_grupo() const;
    double rango() const { return rango_teorico(); }
    double indice(const std::string& termino) const;
    double maximo_clase(const std::string& clase) const;
};

/// Construye la población de grupos del repositorio (RAM).
std::vector<GrupoOficial> construir_poblacion(int ano_cierre);

/// Evalúa la población y normaliza contra el máximo (§3.9) + fórmula (§3.10).
std::vector<ResultadoOficial> evaluar_poblacion(const std::vector<GrupoOficial>& grupos,
                                                 int ano_cierre);

/// Evalúa un grupo concreto. `error` recibe el motivo si no se puede evaluar.
ResultadoOficial evaluar_modelo_oficial(int group_id, int ano_cierre, std::string* error);

/// Serializa el resultado (mismo contrato que `modelo_oficial_2024` de la API).
std::string resultado_a_json(const ResultadoOficial& r,
                             const std::vector<ResultadoOficial>& poblacion);

/// Supuestos documentados (los mismos del backend).
std::vector<std::string> supuestos();

} // namespace peai::official

#endif // PEAI_SERVICES_OFFICIAL_INDICATOR_H
