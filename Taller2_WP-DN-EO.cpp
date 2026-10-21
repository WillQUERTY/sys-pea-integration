// =============================================================================
// Taller2_WP-DN-EO.cpp — Respuestas a los ejercicios del Parcial 2 EdD
// Estructura de Datos — Grupo WP-DN-EO — Universidad Popular del Cesar
//
// Ejercicio 1: Indicador de produccion cientifica del GRUPO (I_Grupo)
// Ejercicio 2: Indicador de produccion cientifica del INVESTIGADOR (I_Investigador)
//
// Formula Minciencias 2024 (seccion 10.6):
//   I_Grupo ≡ 3,7·Nc.Top + 2,3·Nc.A + 0,4·Nc.B + 1,5·AP + 0,5·DPC
//             + 1,0·Fr.A + 0,2·Fr.B + 0,1·Cohe + 0,3·Coop
//
// Variables de entrada:
//   - productos[] : arreglo de productos del grupo o del investigador
//   - investigador_id : ID del investigador (solo ejercicio 2)
//   - grupo_id : ID del grupo (solo ejercicio 1)
//   - año_actual : año para calcular antiguedad de productos
//
// Variables de salida:
//   - I_Grupo / I_Investigador : valor numerico del indicador
//   - Desglose por clase de producto (TOP, Tipo A, Tipo B, ASC, DPC, FRH-A, FRH-B)
//   - Indice de cohesion (IC) y cooperacion (Coop)
// =============================================================================

#include <iostream>
#include <vector>
#include <string>
#include <cmath>
#include <iomanip>

using namespace std;

// -----------------------------------------------------------------------------
// Estructuras de datos (simplificadas del core C++ del proyecto)
// -----------------------------------------------------------------------------

struct Producto {
    int id;
    string titulo;
    string descripcion;
    int family_id;      // 1=GNC, 2=DTI, 3=ASC, 4=DPC, 5=FRH
    int quality_category_id; // 1=TOP, 2=Tipo A, 3=Tipo B
    int year;
    string obtained_date;
    string publication_date;
    string status;      // "active" o "inactive"
};

struct Investigador {
    int id;
    string first_names;
    string last_names;
    string external_code;
    string highest_education_level;
};

struct ProductoAutor {
    int productId;
    int researcherId;
};

// -----------------------------------------------------------------------------
// Funciones auxiliares
// -----------------------------------------------------------------------------

int extraer_ano(const string& fecha, int ano_defecto) {
    // Extrae año de 4 digitos de una cadena de fecha
    for (size_t i = 0; i + 3 < fecha.size(); ++i) {
        if (isdigit(fecha[i]) && isdigit(fecha[i+1]) &&
            isdigit(fecha[i+2]) && isdigit(fecha[i+3])) {
            int ano = stoi(fecha.substr(i, 4));
            if (ano >= 1900 && ano <= 2100) return ano;
        }
    }
    return ano_defecto;
}

int ano_producto(const Producto& p, int ano_actual) {
    if (p.year > 0) return p.year;
    int a = extraer_ano(p.obtained_date, ano_actual);
    if (a == ano_actual) a = extraer_ano(p.publication_date, ano_actual);
    return a;
}

int ventana_aplicable(const string& desc_lower) {
    // Ventana 10 años: patentes, variedad vegetal, raza animal, investigacion-creacion
    if (desc_lower.find("patente") != string::npos ||
        desc_lower.find("variedad vegetal") != string::npos ||
        desc_lower.find("raza animal") != string::npos ||
        desc_lower.find("investigacion-creacion") != string::npos ||
        desc_lower.find("creacion") != string::npos)
        return 10;
    // Ventana 7 años: publicado en revista, libro resultado (sin calidad D/C)
    if ((desc_lower.find("publicado en revista") != string::npos ||
         desc_lower.find("libro resultado") != string::npos) &&
        desc_lower.find("calidad d") == string::npos &&
        desc_lower.find("categoria d") == string::npos)
        return 7;
    return 5;
}

string familia_producto(const Producto& p, const string& desc_lower) {
    if (p.family_id == 1 || p.family_id == 6 ||
        desc_lower.find("publicado en revista") != string::npos ||
        desc_lower.find("libro") != string::npos ||
        desc_lower.find("capitulo") != string::npos)
        return "GNC";
    if (p.family_id == 2 || p.family_id == 7 ||
        desc_lower.find("software") != string::npos ||
        desc_lower.find("patente") != string::npos ||
        desc_lower.find("prototipo") != string::npos ||
        desc_lower.find("innovacion") != string::npos)
        return "DTI";
    if (p.family_id == 3 || desc_lower.find("apropiacion") != string::npos)
        return "ASC";
    if (p.family_id == 4 || p.family_id == 9 ||
        desc_lower.find("divulgacion") != string::npos ||
        desc_lower.find("congreso") != string::npos)
        return "DPC";
    if (p.family_id == 5 || p.family_id == 10 ||
        desc_lower.find("tesis") != string::npos ||
        desc_lower.find("trabajo de grado") != string::npos)
        return "FRH";
    return "OTRA";
}

void clasificar_calidad_formacion(const string& desc_lower, const string& fam,
                                  bool& is_top, bool& is_a, bool& is_b,
                                  bool& is_frh_a, bool& is_frh_b) {
    is_top = (desc_lower.find("a1") != string::npos ||
              desc_lower.find("q1") != string::npos ||
              desc_lower.find("q2") != string::npos ||
              desc_lower.find("a2") != string::npos ||
              desc_lower.find("patente de invencion") != string::npos ||
              desc_lower.find("libro resultado de investigacion") != string::npos);

    is_a = (desc_lower.find("calidad b") != string::npos ||
            desc_lower.find("categoria b") != string::npos ||
            desc_lower.find("calidad c") != string::npos ||
            desc_lower.find("categoria c") != string::npos ||
            desc_lower.find("q3") != string::npos ||
            desc_lower.find("q4") != string::npos ||
            desc_lower.find("revista especializada") != string::npos ||
            desc_lower.find("software") != string::npos ||
            desc_lower.find("prototipo") != string::npos ||
            desc_lower.find("innovacion") != string::npos);

    is_b = !is_top && !is_a;

    is_frh_a = false;
    is_frh_b = false;
    if (fam == "FRH") {
        if (desc_lower.find("tesis de doctorado") != string::npos ||
            desc_lower.find("doctoral") != string::npos)
            is_frh_a = true;
        else
            is_frh_b = true;
    }
}

// -----------------------------------------------------------------------------
// EJERCICIO 1: I_Grupo — Indicador de produccion científica del grupo
// -----------------------------------------------------------------------------

struct ResultadoGrupo {
    int total_products;
    int products_in_window;
    int top_count, type_a_count, type_b_count;
    int gnc_count, dti_count, asc_count, dpc_count, frh_count;
    int frh_a_count, frh_b_count;
    int coauthored_products_count;
    double cohesion_index;
    double i_grupo;
};

ResultadoGrupo calcular_i_grupo(
    const vector<Producto>& productos,
    const vector<ProductoAutor>& autores_productos,
    int ano_actual)
{
    ResultadoGrupo r{};
    r.total_products = (int)productos.size();
    r.cohesion_index = 0.0;

    for (const auto& p : productos) {
        if (p.status != "active") continue;

        string desc = p.descripcion + " " + p.titulo;
        // minusculas
        string desc_l;
        desc_l.reserve(desc.size());
        for (char c : desc) desc_l += (char)tolower((unsigned char)c);

        int py = ano_producto(p, ano_actual);
        int edad = ano_actual - py;
        if (edad < 0) edad = 0;

        string fam = familia_producto(p, desc_l);
        int ventana = ventana_aplicable(desc_l);
        if (edad > ventana) continue;

        r.products_in_window++;

        if (fam == "GNC") { r.gnc_count++; }
        else if (fam == "DTI") { r.dti_count++; }
        else if (fam == "ASC") { r.asc_count++; }
        else if (fam == "DPC") { r.dpc_count++; }
        else if (fam == "FRH") { r.frh_count++; }

        bool is_top, is_a, is_b, is_frh_a, is_frh_b;
        clasificar_calidad_formacion(desc_l, fam,
                                     is_top, is_a, is_b, is_frh_a, is_frh_b);
        if (is_top) r.top_count++;
        else if (is_a) r.type_a_count++;
        else if (is_b) r.type_b_count++;

        if (is_frh_a) r.frh_a_count++;
        else if (is_frh_b) r.frh_b_count++;

        // Cooperacion: producto tiene al menos otro autor distinto
        for (const auto& pa : autores_productos) {
            if (pa.productId == p.id) {
                // Contar como coautorizado si hay otro autor (simplificado: cualquier otro autor)
                r.coauthored_products_count++;
                break;
            }
        }
    }

    // Formula I_Grupo (Minciencias 2024, seccion 10.6)
    double ap = r.asc_count + r.dpc_count;
    r.i_grupo = 3.7 * r.top_count + 2.3 * r.type_a_count + 0.4 * r.type_b_count
              + 1.5 * ap + 0.5 * r.dpc_count
              + 1.0 * r.frh_a_count + 0.2 * r.frh_b_count
              + 0.1 * r.cohesion_index + 0.3 * r.coauthored_products_count;

    return r;
}

// -----------------------------------------------------------------------------
// EJERCICIO 2: I_Investigador — Indicador de produccion científica del investigador
// -----------------------------------------------------------------------------

struct ResultadoInvestigador {
    int researcher_id;
    string researcher_name;
    int total_products;
    int products_in_window;
    int top_count, type_a_count, type_b_count;
    int asc_count, dpc_count, frh_count;
    int frh_a_count, frh_b_count;
    int coauthored_products_count;
    double i_investigador;
};

ResultadoInvestigador calcular_i_investigador(
    const Investigador& inv,
    const vector<Producto>& productos_del_investigador,
    const vector<ProductoAutor>& todos_los_autores,
    int ano_actual)
{
    ResultadoInvestigador r{};
    r.researcher_id = inv.id;
    r.researcher_name = inv.first_names + " " + inv.last_names;
    r.total_products = (int)productos_del_investigador.size();

    for (const auto& p : productos_del_investigador) {
        if (p.status != "active") continue;

        string desc = p.descripcion + " " + p.titulo;
        string desc_l;
        desc_l.reserve(desc.size());
        for (char c : desc) desc_l += (char)tolower((unsigned char)c);

        int py = ano_producto(p, ano_actual);
        int edad = ano_actual - py;
        if (edad < 0) edad = 0;

        string fam = familia_producto(p, desc_l);
        int ventana = ventana_aplicable(desc_l);
        if (edad > ventana) continue;

        r.products_in_window++;

        if (fam == "ASC") r.asc_count++;
        else if (fam == "DPC") r.dpc_count++;
        else if (fam == "FRH") r.frh_count++;

        bool is_top, is_a, is_b, is_frh_a, is_frh_b;
        clasificar_calidad_formacion(desc_l, fam,
                                     is_top, is_a, is_b, is_frh_a, is_frh_b);
        if (is_top) r.top_count++;
        else if (is_a) r.type_a_count++;
        else if (is_b) r.type_b_count++;

        if (is_frh_a) r.frh_a_count++;
        else if (is_frh_b) r.frh_b_count++;

        // Cooperacion: producto tiene al menos otro autor distinto a este investigador
        for (const auto& pa : todos_los_autores) {
            if (pa.productId == p.id && pa.researcherId != inv.id) {
                r.coauthored_products_count++;
                break;
            }
        }
    }

    // Formula I_Investigador (misma que I_Grupo, nivel individual)
    double ap = r.asc_count + r.dpc_count;
    double cohe = 0.0; // Cohesion interna no aplica a investigador individual
    r.i_investigador = 3.7 * r.top_count + 2.3 * r.type_a_count + 0.4 * r.type_b_count
                     + 1.5 * ap + 0.5 * r.dpc_count
                     + 1.0 * r.frh_a_count + 0.2 * r.frh_b_count
                     + 0.1 * cohe + 0.3 * r.coauthored_products_count;

    return r;
}

// -----------------------------------------------------------------------------
// main — Demostracion con datos de ejemplo
// -----------------------------------------------------------------------------

int main() {
    int ano_actual = 2026;

    // ========== Datos de ejemplo — Ejercicio 1: Grupo ==========
    vector<Producto> productos_grupo = {
        {1, "Articulo Q1 en revista indexada", "Articulo publicado en revista A1", 1, 1, 2024, "2024-03-15", "", "active"},
        {2, "Software de analisis de datos", "Software computacional para analisis", 2, 2, 2023, "", "2023-11-10", "active"},
        {3, "Tesis de doctorado en educacion", "Tesis doctoral dirigida", 5, 1, 2025, "", "2025-06-20", "active"},
        {4, "Articulo de divulgacion", "Articulo de divulgacion publica de la ciencia", 4, 3, 2022, "", "2022-09-01", "active"},
        {5, "Libro de texto", "Libro resultado de investigacion", 1, 2, 2021, "", "2021-01-10", "active"},
    };

    vector<ProductoAutor> autores_grupo = {
        {1, 101}, {1, 102},   // producto 1: coautorizado (101 y 102)
        {2, 101},             // producto 2: un solo autor
        {3, 101},             // producto 3: un solo autor
        {4, 103},             // producto 4: un solo autor diferente
        {5, 101}, {5, 102},   // producto 5: coautorizado
    };

    // ========== Datos de ejemplo — Ejercicio 2: Investigador ==========
    Investigador inv_ejemplo = {101, "Juan", "Perez", "EXT-101", "Doctorado"};

    vector<Producto> productos_inv_101 = {
        productos_grupo[0],  // articulo Q1
        productos_grupo[1],  // software
        productos_grupo[2],  // tesis doctorado
        productos_grupo[4],  // libro
    };

    // =========================================================================
    // EJERCICIO 1: Calcular I_Grupo
    // =========================================================================
    cout << "========================================\n";
    cout << "  EJERCICIO 1 — I_Grupo (Grupo)\n";
    cout << "========================================\n";

    ResultadoGrupo rg = calcular_i_grupo(productos_grupo, autores_grupo, ano_actual);

    cout << left << setw(28) << "Variable de entrada: productos del grupo"
         << " = " << rg.total_products << " productos totales\n";
    cout << left << setw(28) << "Variable de entrada: año actual"
         << " = " << ano_actual << "\n";
    cout << left << setw(28) << "Variable de salida: productos en ventana"
         << " = " << rg.products_in_window << "\n";
    cout << left << setw(28) << "Variable de salida: Nc.Top"
         << " = " << rg.top_count << "\n";
    cout << left << setw(28) << "Variable de salida: Nc.A"
         << " = " << rg.type_a_count << "\n";
    cout << left << setw(28) << "Variable de salida: Nc.B"
         << " = " << rg.type_b_count << "\n";
    cout << left << setw(28) << "Variable de salida: AP (ASC+DPC)"
         << " = " << (rg.asc_count + rg.dpc_count) << "\n";
    cout << left << setw(28) << "Variable de salida: DPC"
         << " = " << rg.dpc_count << "\n";
    cout << left << setw(28) << "Variable de salida: Fr.A"
         << " = " << rg.frh_a_count << "\n";
    cout << left << setw(28) << "Variable de salida: Fr.B"
         << " = " << rg.frh_b_count << "\n";
    cout << left << setw(28) << "Variable de salida: Cohe (cohesion)"
         << " = " << rg.cohesion_index << "\n";
    cout << left << setw(28) << "Variable de salida: Coop (coautorias)"
         << " = " << rg.coauthored_products_count << "\n";
    cout << left << setw(28) << "VARIABLE DE SALIDA: I_Grupo"
         << " = " << fixed << setprecision(3) << rg.i_grupo << "\n";
    cout << "\nFormula aplicada:\n";
    cout << "  I_Grupo = 3.7*TOP + 2.3*A + 0.4*B + 1.5*AP + 0.5*DPC\n";
    cout << "          + 1.0*Fr.A + 0.2*Fr.B + 0.1*Cohe + 0.3*Coop\n";
    cout << "  I_Grupo = 3.7*" << rg.top_count << " + 2.3*" << rg.type_a_count
         << " + 0.4*" << rg.type_b_count << " + 1.5*" << (rg.asc_count + rg.dpc_count)
         << " + 0.5*" << rg.dpc_count << " + 1.0*" << rg.frh_a_count
         << " + 0.2*" << rg.frh_b_count << " + 0.1*" << rg.cohesion_index
         << " + 0.3*" << rg.coauthored_products_count
         << " = " << fixed << setprecision(3) << rg.i_grupo << "\n\n";

    // =========================================================================
    // EJERCICIO 2: Calcular I_Investigador
    // =========================================================================
    cout << "========================================\n";
    cout << "  EJERCICIO 2 — I_Investigador\n";
    cout << "========================================\n";

    ResultadoInvestigador ri = calcular_i_investigador(
        inv_ejemplo, productos_inv_101, autores_grupo, ano_actual);

    cout << left << setw(28) << "Variable de entrada: investigador_id"
         << " = " << ri.researcher_id << "\n";
    cout << left << setw(28) << "Variable de entrada: investigador"
         << " = " << ri.researcher_name << "\n";
    cout << left << setw(28) << "Variable de entrada: año actual"
         << " = " << ano_actual << "\n";
    cout << left << setw(28) << "Variable de salida: productos totales del investigador"
         << " = " << ri.total_products << "\n";
    cout << left << setw(28) << "Variable de salida: productos en ventana"
         << " = " << ri.products_in_window << "\n";
    cout << left << setw(28) << "Variable de salida: Nc.Top"
         << " = " << ri.top_count << "\n";
    cout << left << setw(28) << "Variable de salida: Nc.A"
         << " = " << ri.type_a_count << "\n";
    cout << left << setw(28) << "Variable de salida: Nc.B"
         << " = " << ri.type_b_count << "\n";
    cout << left << setw(28) << "Variable de salida: AP (ASC+DPC)"
         << " = " << (ri.asc_count + ri.dpc_count) << "\n";
    cout << left << setw(28) << "Variable de salida: DPC"
         << " = " << ri.dpc_count << "\n";
    cout << left << setw(28) << "Variable de salida: Fr.A"
         << " = " << ri.frh_a_count << "\n";
    cout << left << setw(28) << "Variable de salida: Fr.B"
         << " = " << ri.frh_b_count << "\n";
    cout << left << setw(28) << "Variable de salida: Cohe (cohesion, individual=0)"
         << " = 0.0\n";
    cout << left << setw(28) << "Variable de salida: Coop (coautorias)"
         << " = " << ri.coauthored_products_count << "\n";
    cout << left << setw(28) << "VARIABLE DE SALIDA: I_Investigador"
         << " = " << fixed << setprecision(3) << ri.i_investigador << "\n";
    cout << "\nFormula aplicada (misma que I_Grupo, nivel individual):\n";
    cout << "  I_Investigador = 3.7*TOP + 2.3*A + 0.4*B + 1.5*AP + 0.5*DPC\n";
    cout << "                 + 1.0*Fr.A + 0.2*Fr.B + 0.1*Cohe + 0.3*Coop\n";
    cout << "  I_Investigador = 3.7*" << ri.top_count << " + 2.3*" << ri.type_a_count
         << " + 0.4*" << ri.type_b_count << " + 1.5*" << (ri.asc_count + ri.dpc_count)
         << " + 0.5*" << ri.dpc_count << " + 1.0*" << ri.frh_a_count
         << " + 0.2*" << ri.frh_b_count << " + 0.1*0.0 + 0.3*" << ri.coauthored_products_count
         << " = " << fixed << setprecision(3) << ri.i_investigador << "\n";

    return 0;
}