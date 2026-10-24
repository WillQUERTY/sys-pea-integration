// =============================================================================
// Taller2.cpp - Respuestas a los ejercicios del Parcial 2 EdD
// Estructura de Datos - Grupo WP-DN-EO - Universidad Popular del Cesar
//
// Ejercicio 1: Indicador de produccion cientifica del GRUPO (I_Grupo)
// Ejercicio 2: Indicador de produccion cientifica del INVESTIGADOR (I_Investigador)
//
// Formula Minciencias 2024 (seccion 10.6):
//   I_Grupo = 3,7*Nc.Top + 2,3*Nc.A + 0,4*Nc.B + 1,5*AP + 0,5*DPC
//             + 1,0*Fr.A + 0,2*Fr.B + 0,1*Cohe + 0,3*Coop
//
// Variables de entrada:
//   - productos[] : arreglo de productos del grupo o del investigador
//   - investigador_id : ID del investigador (solo ejercicio 2)
//   - grupo_id : ID del grupo (solo ejercicio 1)
//   - ano_actual : ano para calcular antiguedad de productos
//
// Variables de salida:
//   - I_Grupo / I_Investigador : valor numerico del indicador
//   - Desglose por clase de producto (TOP, Tipo A, Tipo B, ASC, DPC, FRH-A, FRH-B)
//   - Indice de cohesion (IC) y cooperacion (Coop)
// =============================================================================
//
// NOTAS DE IMPLEMENTACION (identicas en la version Python, Taller2_WP-DN-EO.py)
//
// 1. NORMALIZACION DEL TEXTO.  El catalogo real de GrupLAC describe los productos
//    con tildes ("Articulo publicado en revista A1" con tilde) y los patrones de
//    clasificacion se escriben sin tilde.  Por eso TODO texto se normaliza
//    (minusculas + sin tildes + espacios colapsados) ANTES de clasificar: asi el
//    indicador NO depende de como venga escrito el dato y las dos versiones del
//    taller calculan EXACTAMENTE lo mismo.  Esta version C++ embebe los mismos
//    datos de ejemplo SIN tildes (para no depender de la codificacion del
//    compilador) y la version Python los embebe CON tildes: el resultado es
//    identico, lo que demuestra que la clasificacion es insensible a la
//    acentuacion.
//
// 2. COHESION (seccion 2.2.10.1).  Cohe = (autores coincidentes / productos
//    GNC+DTI) - 1, calculado sobre los productos en ventana de las familias GNC
//    y DTI, contando como coincidente todo autor que ES integrante del grupo.
//    A nivel de investigador la cohesion interna no aplica y se deja en 0.
//
// 3. COOPERACION (seccion 2.2.10.2).  El Coop oficial es (grupos relacionados /
//    productos) - 1 y exige afiliaciones multi-grupo, que el dataset de ejemplo
//    (un solo grupo) NO trae.  Se usa el proxy estandar: numero de productos
//    COAUTORIZADOS (2 o mas autores distintos).  Para el investigador se cuenta
//    igual: productos que tienen al menos un autor distinto del propio.
// =============================================================================

#include <iostream>
#include <vector>
#include <string>
#include <cmath>
#include <cstdint>
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

// Decodifica el caracter UTF-8 que empieza en `pos`.  Si los bytes no forman
// un UTF-8 valido devuelve el byte tal cual (longitud 1), sin perder informacion.
size_t utf8_decode(const string& s, size_t pos, char32_t& cp) {
    unsigned char c = static_cast<unsigned char>(s[pos]);
    if (c < 0x80) { cp = c; return 1; }
    size_t extra;
    char32_t value;
    if ((c & 0xE0) == 0xC0)      { extra = 1; value = c & 0x1F; }
    else if ((c & 0xF0) == 0xE0) { extra = 2; value = c & 0x0F; }
    else if ((c & 0xF8) == 0xF0) { extra = 3; value = c & 0x07; }
    else                         { cp = c; return 1; }
    if (pos + extra >= s.size()) { cp = c; return 1; }
    for (size_t i = 1; i <= extra; ++i) {
        unsigned char cc = static_cast<unsigned char>(s[pos + i]);
        if ((cc & 0xC0) != 0x80) { cp = c; return 1; }
        value = (value << 6) | (cc & 0x3F);
    }
    cp = value;
    return extra + 1;
}

// Minusculas como las de Python: ASCII + bloque Latin-1 (salvo el signo de
// multiplicacion).
string to_lower_utf8(const string& s) {
    string out;
    out.reserve(s.size());
    size_t i = 0;
    while (i < s.size()) {
        char32_t cp = 0;
        size_t len = utf8_decode(s, i, cp);
        if (cp >= 'A' && cp <= 'Z') {
            out += static_cast<char>(cp + 32);
        } else if (cp >= 0x00C0 && cp <= 0x00DE && cp != 0x00D7) {
            out += static_cast<char>(0xC0 | ((cp + 0x20) >> 6));
            out += static_cast<char>(0x80 | ((cp + 0x20) & 0x3F));
        } else {
            out.append(s, i, len);
        }
        i += len;
    }
    return out;
}

// Base ASCII de los caracteres acentuados (equivale a NFD + quitar los
// diacriticos, que es lo que hace unicodedata en la version Python).
char32_t base_sin_acento(char32_t cp) {
    switch (cp) {
        case 0x00C0: case 0x00C1: case 0x00C2: case 0x00C3:
        case 0x00C4: case 0x00C5: case 0x00E0: case 0x00E1:
        case 0x00E2: case 0x00E3: case 0x00E4: case 0x00E5: return 'a';
        case 0x00C7: case 0x00E7: return 'c';
        case 0x00C8: case 0x00C9: case 0x00CA: case 0x00CB:
        case 0x00E8: case 0x00E9: case 0x00EA: case 0x00EB: return 'e';
        case 0x00CC: case 0x00CD: case 0x00CE: case 0x00CF:
        case 0x00EC: case 0x00ED: case 0x00EE: case 0x00EF: return 'i';
        case 0x00D1: case 0x00F1: return 'n';   // enye
        case 0x00D2: case 0x00D3: case 0x00D4: case 0x00D5:
        case 0x00D6: case 0x00F2: case 0x00F3: case 0x00F4:
        case 0x00F5: case 0x00F6: return 'o';
        case 0x00D9: case 0x00DA: case 0x00DB: case 0x00DC:
        case 0x00F9: case 0x00FA: case 0x00FB: case 0x00FC: return 'u';
        default: return 0;
    }
}

// Minusculas + sin tildes + espacios colapsados.  Equivale a la funcion
// `normalizar` de la version Python del taller.
string normalizar(const string& s) {
    string t = to_lower_utf8(s);
    string plano;
    plano.reserve(t.size());
    size_t i = 0;
    while (i < t.size()) {
        char32_t cp = 0;
        size_t len = utf8_decode(t, i, cp);
        char32_t base = base_sin_acento(cp);
        if (base != 0) plano += static_cast<char>(base);
        else plano.append(t, i, len);
        i += len;
    }
    // Colapsa espacios (como re.sub(r"\s+", " ") en Python) y recorta extremos.
    string limpio;
    bool espacio = true;   // evita dejar un espacio inicial
    for (char c : plano) {
        if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
            if (!espacio) limpio += ' ';
            espacio = true;
        } else {
            limpio += c;
            espacio = false;
        }
    }
    size_t fin = limpio.find_last_not_of(' ');
    if (fin == string::npos) return "";
    return limpio.substr(0, fin + 1);
}

int extraer_ano(const string& fecha, int ano_defecto) {
    // Extrae ano de 4 digitos de una cadena de fecha
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
    // Ventana 10 anos: patentes, variedad vegetal, raza animal, investigacion-creacion
    if (desc_lower.find("patente") != string::npos ||
        desc_lower.find("variedad vegetal") != string::npos ||
        desc_lower.find("raza animal") != string::npos ||
        desc_lower.find("investigacion-creacion") != string::npos ||
        desc_lower.find("creacion") != string::npos)
        return 10;
    // Ventana 7 anos: publicado en revista, libro resultado (sin calidad D/C)
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
// EJERCICIO 1: I_Grupo - Indicador de produccion cientifica del grupo
// -----------------------------------------------------------------------------

struct ResultadoGrupo {
    int total_products;
    int group_members;
    int products_in_window;
    int top_count, type_a_count, type_b_count;
    int gnc_count, dti_count, asc_count, dpc_count, frh_count;
    int frh_a_count, frh_b_count;
    int coauthored_products_count;
    int cohesion_products, cohesion_authors;
    double cohesion_index;
    double i_grupo;
};

ResultadoGrupo calcular_i_grupo(
    const vector<Producto>& productos,
    const vector<ProductoAutor>& autores_productos,
    const vector<int>& miembros_grupo,
    int ano_actual)
{
    ResultadoGrupo r{};
    r.total_products = (int)productos.size();
    r.group_members = (int)miembros_grupo.size();
    r.cohesion_index = 0.0;

    for (const auto& p : productos) {
        if (p.status != "active") continue;

        string desc = p.descripcion + " " + p.titulo;
        string desc_l = normalizar(desc);   // minusculas y sin tildes (ver NOTAS)

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

        // Autores del producto (se usan para cooperacion y cohesion)
        vector<int> autores_producto;
        for (const auto& pa : autores_productos)
            if (pa.productId == p.id) autores_producto.push_back(pa.researcherId);

        vector<int> unicos;   // autores distintos del producto
        for (int a : autores_producto) {
            bool repetido = false;
            for (int u : unicos) if (u == a) { repetido = true; break; }
            if (!repetido) unicos.push_back(a);
        }

        // Cooperacion (proxy 2.2.10.2): producto coautorizado = 2+ autores
        if (unicos.size() >= 2) r.coauthored_products_count++;

        // Cohesion (2.2.10.1): autores coincidentes sobre productos GNC+DTI
        if (fam == "GNC" || fam == "DTI") {
            r.cohesion_products++;
            for (int a : unicos) {
                for (int m : miembros_grupo) {
                    if (a == m) { r.cohesion_authors++; break; }
                }
            }
        }
    }

    // Indice de cohesion (2.2.10.1): (autores coincidentes / productos) - 1
    if (r.cohesion_products > 0)
        r.cohesion_index = round(((double)r.cohesion_authors / r.cohesion_products - 1.0) * 1000.0) / 1000.0;

    // Formula I_Grupo (Minciencias 2024, seccion 10.6)
    double ap = r.asc_count;  // AP = ASC, DPC es termino separado
    r.i_grupo = 3.7 * r.top_count + 2.3 * r.type_a_count + 0.4 * r.type_b_count
              + 1.5 * ap + 0.5 * r.dpc_count
              + 1.0 * r.frh_a_count + 0.2 * r.frh_b_count
              + 0.1 * r.cohesion_index + 0.3 * r.coauthored_products_count;

    return r;
}

// -----------------------------------------------------------------------------
// EJERCICIO 2: I_Investigador - Indicador de produccion cientifica del investigador
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
        string desc_l = normalizar(desc);   // minusculas y sin tildes (ver NOTAS)

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
    double ap = r.asc_count;  // AP = ASC, DPC es termino separado
    double cohe = 0.0; // Cohesion interna no aplica a investigador individual
    r.i_investigador = 3.7 * r.top_count + 2.3 * r.type_a_count + 0.4 * r.type_b_count
                     + 1.5 * ap + 0.5 * r.dpc_count
                     + 1.0 * r.frh_a_count + 0.2 * r.frh_b_count
                     + 0.1 * cohe + 0.3 * r.coauthored_products_count;

    return r;
}

// -----------------------------------------------------------------------------
// main - Demostracion con datos de ejemplo
// -----------------------------------------------------------------------------

int main() {
    int ano_actual = 2026;

    // ========== Datos de ejemplo - Ejercicio 1: Grupo ==========
    // Son los MISMOS datos que usa la version Python de este taller, pero
    // escritos sin tildes para no depender de la codificacion con la que se
    // compile este archivo.  La funcion `normalizar` los iguala, de modo que el
    // indicador resultante es EXACTAMENTE el mismo en las dos versiones.
    // `quality_category_id` es el dato crudo del catalogo (1=TOP, 2=Tipo A,
    // 3=Tipo B); la clase TOP/A/B que usa la formula se deriva de la descripcion.
    vector<Producto> productos_grupo = {
        {1, "Articulo Q1 en revista indexada", "Articulo publicado en revista A1", 1, 1, 2024, "2024-03-15", "", "active"},
        {2, "Software de analisis de datos", "Software computacional para analisis", 2, 2, 2023, "", "2023-11-10", "active"},
        {3, "Tesis de doctorado en educacion", "Tesis doctoral dirigida", 5, 3, 2025, "", "2025-06-20", "active"},
        {4, "Articulo de divulgacion", "Articulo de divulgacion publica de la ciencia", 4, 3, 2022, "", "2022-09-01", "active"},
        {5, "Libro de texto", "Libro resultado de investigacion", 1, 1, 2021, "", "2021-01-10", "active"},
    };

    vector<ProductoAutor> autores_grupo = {
        {1, 101}, {1, 102},   // producto 1: coautorizado (101 y 102)
        {2, 101},             // producto 2: un solo autor
        {3, 101},             // producto 3: un solo autor
        {4, 103},             // producto 4: un solo autor diferente
        {5, 101}, {5, 102},   // producto 5: coautorizado
    };

    // Integrantes del grupo: sirven para contar los autores COINCIDENTES que
    // exige el indice de cohesion (2.2.10.1).
    vector<int> miembros_grupo = {101, 102, 103};

    // ========== Datos de ejemplo - Ejercicio 2: Investigador ==========
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
    cout << "  EJERCICIO 1 - I_Grupo (Grupo)\n";
    cout << "========================================\n";

    ResultadoGrupo rg = calcular_i_grupo(productos_grupo, autores_grupo, miembros_grupo, ano_actual);

    cout << left << setw(40) << "Variable de entrada: productos del grupo"
         << " = " << rg.total_products << " productos totales\n";
    cout << left << setw(40) << "Variable de entrada: integrantes del grupo"
         << " = " << rg.group_members << " integrantes\n";
    cout << left << setw(40) << "Variable de entrada: ano actual"
         << " = " << ano_actual << "\n";
    cout << left << setw(40) << "Variable de salida: productos en ventana"
         << " = " << rg.products_in_window << "\n";
    cout << left << setw(40) << "Variable de salida: Nc.Top"
         << " = " << rg.top_count << "\n";
    cout << left << setw(40) << "Variable de salida: Nc.A"
         << " = " << rg.type_a_count << "\n";
    cout << left << setw(40) << "Variable de salida: Nc.B"
         << " = " << rg.type_b_count << "\n";
    cout << left << setw(40) << "Variable de salida: AP (ASC)"
         << " = " << rg.asc_count << "\n";
    cout << left << setw(40) << "Variable de salida: DPC"
         << " = " << rg.dpc_count << "\n";
    cout << left << setw(40) << "Variable de salida: Fr.A"
         << " = " << rg.frh_a_count << "\n";
    cout << left << setw(40) << "Variable de salida: Fr.B"
         << " = " << rg.frh_b_count << "\n";
    cout << left << setw(40) << "Variable de salida: Cohe (cohesion)"
         << " = " << fixed << setprecision(3) << rg.cohesion_index << "\n";
    cout << left << setw(40) << "Variable de salida: Cohe (autores coincidentes/productos GNC+DTI)"
         << " = " << rg.cohesion_authors << "/" << rg.cohesion_products << " - 1\n";
    cout << left << setw(40) << "Variable de salida: Coop (productos coautorizados)"
         << " = " << rg.coauthored_products_count << "\n";
    cout << left << setw(40) << "VARIABLE DE SALIDA: I_Grupo"
         << " = " << fixed << setprecision(3) << rg.i_grupo << "\n";
    cout << "\nFormula aplicada:\n";
    cout << "  I_Grupo = 3.7*TOP + 2.3*A + 0.4*B + 1.5*AP + 0.5*DPC\n";
    cout << "          + 1.0*Fr.A + 0.2*Fr.B + 0.1*Cohe + 0.3*Coop\n";
    cout << "  I_Grupo = 3.7*" << rg.top_count << " + 2.3*" << rg.type_a_count
         << " + 0.4*" << rg.type_b_count << " + 1.5*" << rg.asc_count
         << " + 0.5*" << rg.dpc_count << " + 1.0*" << rg.frh_a_count
         << " + 0.2*" << rg.frh_b_count << " + 0.1*" << rg.cohesion_index
         << " + 0.3*" << rg.coauthored_products_count
         << " = " << fixed << setprecision(3) << rg.i_grupo << "\n\n";

    // =========================================================================
    // EJERCICIO 2: Calcular I_Investigador
    // =========================================================================
    cout << "========================================\n";
    cout << "  EJERCICIO 2 - I_Investigador\n";
    cout << "========================================\n";

    ResultadoInvestigador ri = calcular_i_investigador(
        inv_ejemplo, productos_inv_101, autores_grupo, ano_actual);

    cout << left << setw(40) << "Variable de entrada: investigador_id"
         << " = " << ri.researcher_id << "\n";
    cout << left << setw(40) << "Variable de entrada: investigador"
         << " = " << ri.researcher_name << "\n";
    cout << left << setw(40) << "Variable de entrada: ano actual"
         << " = " << ano_actual << "\n";
    cout << left << setw(40) << "Variable de salida: productos totales del investigador"
         << " = " << ri.total_products << "\n";
    cout << left << setw(40) << "Variable de salida: productos en ventana"
         << " = " << ri.products_in_window << "\n";
    cout << left << setw(40) << "Variable de salida: Nc.Top"
         << " = " << ri.top_count << "\n";
    cout << left << setw(40) << "Variable de salida: Nc.A"
         << " = " << ri.type_a_count << "\n";
    cout << left << setw(40) << "Variable de salida: Nc.B"
         << " = " << ri.type_b_count << "\n";
    cout << left << setw(40) << "Variable de salida: AP (ASC)"
         << " = " << ri.asc_count << "\n";
    cout << left << setw(40) << "Variable de salida: DPC"
         << " = " << ri.dpc_count << "\n";
    cout << left << setw(40) << "Variable de salida: Fr.A"
         << " = " << ri.frh_a_count << "\n";
    cout << left << setw(40) << "Variable de salida: Fr.B"
         << " = " << ri.frh_b_count << "\n";
    cout << left << setw(40) << "Variable de salida: Cohe (cohesion, individual=0)"
         << " = 0.0\n";
    cout << left << setw(40) << "Variable de salida: Coop (productos coautorizados)"
         << " = " << ri.coauthored_products_count << "\n";
    cout << left << setw(40) << "VARIABLE DE SALIDA: I_Investigador"
         << " = " << fixed << setprecision(3) << ri.i_investigador << "\n";
    cout << "\nFormula aplicada (misma que I_Grupo, nivel individual):\n";
    cout << "  I_Investigador = 3.7*TOP + 2.3*A + 0.4*B + 1.5*AP + 0.5*DPC\n";
    cout << "                 + 1.0*Fr.A + 0.2*Fr.B + 0.1*Cohe + 0.3*Coop\n";
    cout << "  I_Investigador = 3.7*" << ri.top_count << " + 2.3*" << ri.type_a_count
         << " + 0.4*" << ri.type_b_count << " + 1.5*" << ri.asc_count
         << " + 0.5*" << ri.dpc_count << " + 1.0*" << ri.frh_a_count
         << " + 0.2*" << ri.frh_b_count << " + 0.1*0.0 + 0.3*" << ri.coauthored_products_count
         << " = " << fixed << setprecision(3) << ri.i_investigador << "\n";

    return 0;
}
