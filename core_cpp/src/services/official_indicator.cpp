// core_cpp/src/services/official_indicator.cpp
// Indicador oficial de grupo Minciencias 2024 — puerto C++ del modelo de
// medición (§2.2.9 → §3.10). Equivalente línea a línea a
// backend/app/evaluator/official_indicator.py y official_population.py.
//
//   §2.2.9   λ_subtipo = ln(n_subtipo / período + 1), período = min(edad del
//            grupo, ventana del subtipo — Tabla 5).
//   §3.6     PesoGlobal = ancla del subtipo (Tabla 6) × peso relativo (Anexo 1).
//   §3.7     Clases de medición: TOP, A, B, ASC, DPC, FRH-A, FRH-B.
//   §3.8.1   Ind_Clase = Σ λ_subtipo × PesoGlobal_subtipo.
//   §2.2.10  Cohe = (Σ autores del grupo / productos) − 1;  Coop = (Σ grupos
//            relacionados / productos) − 1 (dominio GNC/DTI dentro del período).
//   §3.9     índice = valor / máximo del indicador en la POBLACIÓN de grupos.
//   §3.10    Ind.Grupo = 3,7·Nc.Top + 2,3·Nc.A + 0,4·Nc.B + 1,5·AP + 0,5·DPC
//                         + 1·Fr.A + 0,2·Fr.B + 0,1·Cohe + 0,3·Coop.

#include "services/official_indicator.h"
#include "services/catalog_2024_generated.h"
#include "services/group_service.h"
#include "services/product_service.h"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <map>
#include <set>
#include <sstream>

namespace peai::official {

// --- §3.10: coeficientes y clases ---------------------------------------------

const char* const TERMINOS[9] = {
    "Nc.Top", "Nc.A", "Nc.B", "AP", "DPC", "Fr.A", "Fr.B", "Cohe", "Coop"
};
const double COEFICIENTES[9] = { 3.7, 2.3, 0.4, 1.5, 0.5, 1.0, 0.2, 0.1, 0.3 };
const char* const CLASES[7] = { "TOP", "A", "B", "ASC", "DPC", "FRH-A", "FRH-B" };
const char* const TERMINO_POR_CLASE[7] = {
    "Nc.Top", "Nc.A", "Nc.B", "AP", "DPC", "Fr.A", "Fr.B"
};

double rango_teorico() {
    double total = 0.0;
    for (int i = 0; i < 9; ++i) total += COEFICIENTES[i];
    return total;
}

// --- Texto: minúsculas UTF-8 y eliminación de acentos --------------------------
// El backend normaliza con NFD + quitar marcas combinantes; aquí se hace el
// equivalente con un mapa de los caracteresLATINOS que aparecen en la fuente
// (á é í ó ú ü ñ ç y sus mayúsculas).

namespace {

// Decodifica el carácter UTF-8 que empieza en `pos`. Si es inválido, devuelve
// el byte tal cual (longitud 1) para no perder información.
size_t utf8_decode(const std::string& s, size_t pos, char32_t& cp) {
    unsigned char c = static_cast<unsigned char>(s[pos]);
    if (c < 0x80) { cp = c; return 1; }
    size_t extra = 0;
    char32_t value = 0;
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

void utf8_encode(char32_t cp, std::string& out) {
    if (cp < 0x80) {
        out += static_cast<char>(cp);
    } else if (cp < 0x800) {
        out += static_cast<char>(0xC0 | (cp >> 6));
        out += static_cast<char>(0x80 | (cp & 0x3F));
    } else if (cp < 0x10000) {
        out += static_cast<char>(0xE0 | (cp >> 12));
        out += static_cast<char>(0x80 | ((cp >> 6) & 0x3F));
        out += static_cast<char>(0x80 | (cp & 0x3F));
    } else {
        out += static_cast<char>(0xF0 | (cp >> 18));
        out += static_cast<char>(0x80 | ((cp >> 12) & 0x3F));
        out += static_cast<char>(0x80 | ((cp >> 6) & 0x3F));
        out += static_cast<char>(0x80 | (cp & 0x3F));
    }
}

// Minúsculas como las de Python: ASCII + el bloque Latin-1 (À–Þ, excepto ×).
std::string to_lower_utf8(const std::string& s) {
    std::string out;
    out.reserve(s.size());
    size_t i = 0;
    while (i < s.size()) {
        char32_t cp = 0;
        size_t len = utf8_decode(s, i, cp);
        if (cp >= 'A' && cp <= 'Z') {
            out += static_cast<char>(cp + 32);
        } else if (cp >= 0x00C0 && cp <= 0x00DE && cp != 0x00D7) {
            utf8_encode(cp + 0x20, out);
        } else {
            out.append(s, i, len);
        }
        i += len;
    }
    return out;
}

// Base ASCII de los caracteres acentuados (equivale a NFD + quitar Mn).
// Solo se mapean los que NFD SÍ descompone: Æ, Ø, Ð, Ý, Œ, Ŋ no tienen
// descomposición canónica, así que Python los deja intactos.
char32_t base_sin_acento(char32_t cp) {
    switch (cp) {
        // Latin-1 Supplement
        case 0x00C0: case 0x00C1: case 0x00C2: case 0x00C3:
        case 0x00C4: case 0x00C5: case 0x00E0: case 0x00E1:
        case 0x00E2: case 0x00E3: case 0x00E4: case 0x00E5: return 'a';   // À Á Â Ã Ä Å
        case 0x00C7: case 0x00E7: return 'c';                             // Ç ç
        case 0x00C8: case 0x00C9: case 0x00CA: case 0x00CB:
        case 0x00E8: case 0x00E9: case 0x00EA: case 0x00EB: return 'e';   // È É Ê Ë
        case 0x00CC: case 0x00CD: case 0x00CE: case 0x00CF:
        case 0x00EC: case 0x00ED: case 0x00EE: case 0x00EF:
        case 0x0130: case 0x0131: return 'i';                             // Ì Í Î Ï İ ı
        case 0x00D1: case 0x00F1: return 'n';                             // Ñ ñ
        case 0x00D2: case 0x00D3: case 0x00D4: case 0x00D5:
        case 0x00D6: case 0x00F2: case 0x00F3: case 0x00F4:
        case 0x00F5: case 0x00F6: return 'o';                             // Ò Ó Ô Õ Ö
        case 0x00D9: case 0x00DA: case 0x00DB: case 0x00DC:
        case 0x00F9: case 0x00FA: case 0x00FB: case 0x00FC: return 'u';   // Ù Ú Û Ü
        case 0x00AA: return 'a';                                          // ª
        case 0x00BA: return 'o';                                          // º
        default: break;
    }
    // Latin Extended-A
    switch (cp) {
        case 0x0100: case 0x0101: case 0x0102: case 0x0103:
        case 0x0104: case 0x0105: return 'a';
        case 0x0106: case 0x0107: case 0x0108: case 0x0109:
        case 0x010A: case 0x010B: case 0x010C: case 0x010D: return 'c';
        case 0x010E: case 0x010F: case 0x0110: case 0x0111: return 'd';
        case 0x0112: case 0x0113: case 0x0114: case 0x0115:
        case 0x0116: case 0x0117: case 0x0118: case 0x0119:
        case 0x011A: case 0x011B: return 'e';
        case 0x011C: case 0x011D: case 0x011E: case 0x011F:
        case 0x0120: case 0x0121: case 0x0122: case 0x0123: return 'g';
        case 0x0124: case 0x0125: case 0x0126: case 0x0127: return 'h';
        case 0x0128: case 0x0129: case 0x012A: case 0x012B:
        case 0x012C: case 0x012D: case 0x012E: case 0x012F: return 'i';
        case 0x0132: case 0x0133: case 0x0134: case 0x0135: return 'j';
        case 0x0136: case 0x0137: return 'k';
        case 0x0139: case 0x013A: case 0x013B: case 0x013C:
        case 0x013D: case 0x013E: case 0x013F: case 0x0140:
        case 0x0141: case 0x0142: return 'l';
        case 0x0143: case 0x0144: case 0x0145: case 0x0146:
        case 0x0147: return 'n';
        case 0x014B: case 0x014C: case 0x014D: case 0x014E:
        case 0x014F: case 0x0150: return 'o';
        case 0x0153: case 0x0154: case 0x0155: case 0x0156:
        case 0x0157: case 0x0158: return 'r';
        case 0x0159: case 0x015A: case 0x015B: case 0x015C:
        case 0x015D: case 0x015E: case 0x015F: case 0x0160: return 's';
        case 0x0161: case 0x0162: case 0x0163: case 0x0164: return 't';
        case 0x0165: case 0x0166: case 0x0167: case 0x0168:
        case 0x0169: case 0x016A: case 0x016B: case 0x016C:
        case 0x016D: case 0x016E: case 0x016F: case 0x0170: return 'u';
        case 0x0171: case 0x0172: return 'w';
        case 0x0173: case 0x0174: case 0x0175: case 0x0176:
        case 0x0177: return 'y';
        case 0x0178: case 0x0179: case 0x017A: case 0x017B:
        case 0x017C: case 0x017D: case 0x017E: case 0x017F: return 'z';
        default: return 0;
    }
}

std::string strip_acentos(const std::string& s) {
    std::string out;
    out.reserve(s.size());
    size_t i = 0;
    while (i < s.size()) {
        char32_t cp = 0;
        size_t len = utf8_decode(s, i, cp);
        char32_t base = base_sin_acento(cp);
        if (base != 0) {
            out += static_cast<char>(base);
        } else {
            out.append(s, i, len);
        }
        i += len;
    }
    return out;
}

// El dataset real trae mojibake de doble codificación UTF-8→cp1252
// ("maestrã­a" por "maestría"); se corrige antes de quitar acentos.
// Las mismas cinco correcciones que en el backend.
void replace_all(std::string& texto, const std::string& desde, const std::string& hasta) {
    if (desde.empty()) return;
    size_t pos = 0;
    while ((pos = texto.find(desde, pos)) != std::string::npos) {
        texto.replace(pos, desde.size(), hasta);
        pos += hasta.size();
    }
}

// Minúsculas + corrección de mojibake + eliminación de acentos.
std::string texto_normalizado(const std::string& s) {
    std::string t = to_lower_utf8(s);
    replace_all(t, "ã©", "e");   // á
    replace_all(t, "ã³", "o");   // ó
    replace_all(t, "ã­", "i");   // í
    replace_all(t, "ã¡", "a");   // á
    replace_all(t, "ã±", "n");   // ñ
    return strip_acentos(t);
}

// ¿El byte es un carácter de palabra para los límites \b de Python?
bool es_caracter_palabra(unsigned char c) {
    return (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
           c == '_' || c >= 0x80;
}

// Primer año de 4 dígitos del texto que cumple el rango y está delimitado por
// límites de palabra (equivalente a re.search(r'\b(19\d\d|20\d\d)\b')).
int primer_anio_delimitado(const std::string& texto, int anio_min, int anio_max) {
    size_t i = 0;
    while (i < texto.size()) {
        if (texto[i] < '0' || texto[i] > '9') { ++i; continue; }
        size_t inicio = i;
        while (i < texto.size() && texto[i] >= '0' && texto[i] <= '9') ++i;
        size_t largo = i - inicio;
        if (largo != 4) continue;                       // \b exige 4 dígitos exactos
        bool izq = (inicio == 0) || !es_caracter_palabra(static_cast<unsigned char>(texto[inicio - 1]));
        bool der = (i == texto.size()) || !es_caracter_palabra(static_cast<unsigned char>(texto[i]));
        if (!izq || !der) continue;
        int anio = (texto[inicio] - '0') * 1000 + (texto[inicio + 1] - '0') * 100 +
                   (texto[inicio + 2] - '0') * 10 + (texto[inicio + 3] - '0');
        if (anio >= anio_min && anio <= anio_max) return anio;
    }
    return 0;
}

// ¿El texto es un entero puro (como int() de Python)?
bool parsear_entero(const std::string& s, int& valor) {
    size_t i = 0;
    while (i < s.size() && std::isspace(static_cast<unsigned char>(s[i]))) ++i;
    size_t fin = s.size();
    while (fin > i && std::isspace(static_cast<unsigned char>(s[fin - 1]))) --fin;
    if (i >= fin) return false;
    bool signo = false;
    if (s[i] == '+' || s[i] == '-') { signo = (s[i] == '-'); ++i; }
    if (i >= fin) return false;
    long long acc = 0;
    for (; i < fin; ++i) {
        if (s[i] < '0' || s[i] > '9') return false;
        acc = acc * 10 + (s[i] - '0');
        if (acc > 2147483647LL) return false;
    }
    valor = static_cast<int>(signo ? -acc : acc);
    return true;
}

} // namespace

// --- Catálogo ------------------------------------------------------------------

const Catalogo& catalogo() {
    static Catalogo* tabla = [] {
        auto* t = new Catalogo();
        for (int i = 0; i < CATALOGO_2024_SIZE; ++i) {
            const CategoriaOficial& c = CATALOGO_2024[i];
            CatalogoCategoria cat;
            cat.code = c.code;
            cat.familia = c.familia;
            cat.subtipo = c.subtipo;
            cat.clase = c.clase;
            cat.peso_relativo = c.peso_relativo;
            cat.ancla_subtipo = c.ancla_subtipo;
            cat.ventana_subtipo = c.ventana_subtipo;
            t->emplace(cat.code, cat);
        }
        return t;
    }();
    return *tabla;
}

const CatalogoCategoria* categoria(const std::string& code) {
    const Catalogo& cat = catalogo();
    auto it = cat.find(code);
    return it == cat.end() ? nullptr : &it->second;
}

// --- Clasificación conservadora (GrupLAC) --------------------------------------

std::pair<std::string, std::string> inferir_categoria(const std::string& descripcion) {
    using Resultado = std::pair<std::string, std::string>;

    bool vacio = true;
    for (char c : descripcion) {
        if (!std::isspace(static_cast<unsigned char>(c))) { vacio = false; break; }
    }
    if (vacio) return Resultado("", "sin descripción (categoría no verificable)");

    // El tipo del producto vive en el prefijo de la línea GrupLAC ("N.- TIPO : ...");
    // el título/journal/años/autores van después de ":" y NO se usan para clasificar.
    std::string prefijo = descripcion;
    auto pos_colon = descripcion.find(':');
    if (pos_colon != std::string::npos) prefijo = descripcion.substr(0, pos_colon);

    std::string t = texto_normalizado(prefijo);
    bool prefijo_vacio = true;
    for (char c : t) {
        if (!std::isspace(static_cast<unsigned char>(c))) { prefijo_vacio = false; break; }
    }
    if (prefijo_vacio) t = texto_normalizado(descripcion);

    auto contiene = [&](const char* patron) { return t.find(patron) != std::string::npos; };

    // --- FRH: direcciones de trabajo (§2.2.6). Tipo verificable; la CALIDAD se
    // asume B porque GrupLAC no evidencia la "categoría A" de la dirección.
    if (contiene("trabajo de grado de pregrado") || contiene("trabajos de grado de pregrado"))
        return Resultado("TP_B", "dirección de trabajo de pregrado (calidad B asumida: GrupLAC no evidencia categoría A)");
    if (contiene("trabajo de grado de maestria"))
        return Resultado("TM_B", "dirección de trabajo de maestría (calidad B asumida: GrupLAC no evidencia categoría A)");

    // --- DPC con etiqueta verificable de palabra
    if (contiene("documento de trabajo") || contiene("working paper"))
        return Resultado("WP", "documento de trabajo (working paper)");
    if (contiene("libros de divulgacion") || contiene("libro de divulgacion") || contiene("compilacion de divulgacion"))
        return Resultado("LIB_DIV", "libros de divulgación y/o compilación de divulgación");
    if (contiene("informe final proyecto de investigacion") || contiene("informes de investigacion"))
        return Resultado("IFI", "informe final de investigación");
    if (contiene("boletin"))
        return Resultado("BOL", "boletín divulgativo de resultado de investigación");

    // --- Exclusiones con motivo explícito (no se inventa categoría)
    if (contiene("publicado en revista especializada") || contiene("articulo publicado") || contiene("articulo de investigacion"))
        return Resultado("", "artículo sin calidad oficial A1–D (Publindex/Scimago no está en la fuente)");
    if (contiene("revista de divulgacion"))
        return Resultado("", "artículo en revista de divulgación: sin categoría oficial A1–D en la fuente");
    if (contiene("corto") && contiene("resumen"))
        return Resultado("", "artículo corto/nota científica sin calidad oficial en la fuente");
    if (contiene("otro capitulo de libro"))
        return Resultado("", "capítulo en libro NO resultado de investigación: sin categoría oficial 2024");
    if (contiene("capitulo de libro"))
        return Resultado("", "capítulo de libro resultado: sin calidad A1–C (cuartil de citaciones no disponible)");
    if (contiene("libro resultado de investigacion"))
        return Resultado("", "libro resultado de investigación: sin calidad A1–C (cuartil de citaciones no disponible)");
    if (contiene("libros de formacion") || contiene("libro de formacion"))
        return Resultado("", "libro de formación: sin cuartil Q1–Q3 en la fuente");
    if (contiene("trabajos dirigidos") || contiene("tutorias de otro tipo"))
        return Resultado("", "tutoría de otro tipo: sin subtipo oficial 2024");
    if (contiene("extension extracurricular") || contiene("perfeccionamiento") || contiene("curso de") || contiene("monografia"))
        return Resultado("", "curso/extensión/monografía: no es tipo de producto en el modelo 2024");
    if (contiene("trabajos en eventos") || contiene("congreso") || contiene("encuentro") ||
        contiene("seminario") || contiene("simposio") || contiene("ponencia"))
        return Resultado("", "trabajo en evento (ponencia/congreso): no es tipo de producto en el modelo 2024");
    if (contiene("computacional") || contiene("industrial") || contiene("servicios"))
        return Resultado("", "producto tecnológico GrupLAC (Computacional/Industrial/Servicios) sin categoría oficial verificable");
    if (contiene("desarrollo web") || contiene("micrositio") || contiene("pagina web"))
        return Resultado("", "desarrollo web: sin calidad A1–C (la fuente no la evidencia)");
    if (contiene("cartilla") || contiene("periodico"))
        return Resultado("", "cartilla/periódico: tipo sin categoría oficial verificable 2024");

    return Resultado("", "sección de GrupLAC sin categoría oficial 2024");
}

std::string determinar_familia(int family_id, const std::string& descripcion_lower) {
    auto contiene = [&](const char* patron) { return descripcion_lower.find(patron) != std::string::npos; };

    if (family_id == 1 || family_id == 6 || contiene("publicado en revista") || contiene("libro") ||
        contiene("capítulo") || contiene("capitulo"))
        return "GNC";
    if (family_id == 2 || family_id == 7 || contiene("computacional") || contiene("software") ||
        contiene("patente") || contiene("prototipo") || contiene("innovación"))
        return "DTI";
    if (family_id == 3 || contiene("apropiación") || contiene("social del conocimiento"))
        return "ASC";
    if (family_id == 4 || family_id == 9 || contiene("divulgación") || contiene("congreso") ||
        contiene("web") || contiene("informe técnico"))
        return "DPC";
    if (family_id == 5 || family_id == 10 || contiene("trabajo de grado") || contiene("tesis") ||
        contiene("pregrado") || contiene("maestría") || contiene("maestria"))
        return "FRH";
    return "OTRA";
}

std::string familia_relacional(int family_id, const std::string& descripcion) {
    bool vacio = true;
    for (char c : descripcion) {
        if (!std::isspace(static_cast<unsigned char>(c))) { vacio = false; break; }
    }
    if (vacio) return "";
    std::string familia = determinar_familia(family_id, to_lower_utf8(descripcion));
    return (familia == "GNC" || familia == "DTI") ? familia : std::string();
}

// --- Año del producto (§2.2.9) -------------------------------------------------

static const int ANIO_MINIMO = 1950;
static const int ANIO_MAXIMO = 2050;
static const int ANIO_DESCRIPCION_MAXIMO = 2049;   // \b(19[5-9]\d|20[0-4]\d)\b

int extraer_anio(int year, const std::string& obtained_date,
                 const std::string& publication_date, const std::string& descripcion) {
    // 1) year (numérico)
    if (year != 0 && year >= ANIO_MINIMO && year <= ANIO_MAXIMO) return year;

    // 2) obtained_date / publication_date: enteras o fecha (regex 19xx|20xx)
    const std::string campos[2] = { obtained_date, publication_date };
    for (const std::string& campo : campos) {
        if (campo.empty()) continue;
        int valor = 0;
        if (parsear_entero(campo, valor)) {
            if (valor >= ANIO_MINIMO && valor <= ANIO_MAXIMO) return valor;
            continue;                       // fuera de rango: se prueba el campo siguiente
        }
        int anio = primer_anio_delimitado(campo, 1900, 2099);
        if (anio != 0 && anio >= ANIO_MINIMO && anio <= ANIO_MAXIMO) return anio;
    }

    // 3) primer año plausible de la descripción ("Desde 9 2025 hasta Abril 2026").
    //    El backend usa \b(19[5-9]\d|20[0-4]\d)\b → 1950–2049 (2050 NO entra).
    return primer_anio_delimitado(descripcion, ANIO_MINIMO, ANIO_DESCRIPCION_MAXIMO);
}

int extraer_anio_fecha(const std::string& fecha) {
    if (fecha.empty()) return 0;
    return primer_anio_delimitado(fecha, 1900, 2099);
}

// --- §2.2.9 --------------------------------------------------------------------

double lambda_subtipo(int n_productos, double periodo) {
    if (n_productos == 0 || periodo <= 0) return 0.0;
    return std::log(static_cast<double>(n_productos) / periodo + 1.0);
}

// --- Población desde la RAM ---------------------------------------------------

std::vector<GrupoOficial> construir_poblacion(int ano_cierre) {
    // mapa investigador -> grupos donde está vinculado
    std::map<int, std::set<int>> membresias;
    std::vector<Group> grupos_ram = list_groups();
    for (const Group& grupo : grupos_ram) {
        for (int rid : members_of_group(grupo.id)) {
            if (rid > 0) membresias[rid].insert(grupo.id);
        }
    }

    std::vector<GrupoOficial> grupos;
    for (const Group& grupo : grupos_ram) {
        std::vector<int> pids = products_of_group(grupo.id);

        std::vector<ProductoOficial> productos;
        std::vector<int> anios;
        for (int pid : pids) {
            auto popt = get_product(pid);
            if (!popt) continue;                       // enlace colgante
            const Product& producto = *popt;

            std::string descripcion = producto.description;
            // recorte de espacios, como el .strip() del backend
            while (!descripcion.empty() && std::isspace(static_cast<unsigned char>(descripcion.front())))
                descripcion.erase(descripcion.begin());
            while (!descripcion.empty() && std::isspace(static_cast<unsigned char>(descripcion.back())))
                descripcion.pop_back();

            int anio = extraer_anio(producto.year, producto.obtained_date,
                                    producto.publication_date, producto.description);
            if (anio != 0) anios.push_back(anio);

            auto clasificacion = inferir_categoria(descripcion);
            const std::string& cat = clasificacion.first;

            std::vector<int> firmantes;
            for (const ProductAuthor& autor : authors_of_product(pid)) {
                if (autor.researcherId > 0) firmantes.push_back(autor.researcherId);
            }

            int del_grupo = 0;
            std::set<int> relacionados;
            relacionados.insert(grupo.id);
            for (int rid : firmantes) {
                auto it = membresias.find(rid);
                if (it == membresias.end()) continue;
                if (it->second.count(grupo.id)) ++del_grupo;
                relacionados.insert(it->second.begin(), it->second.end());
            }

            ProductoOficial p;
            p.identificacion = std::to_string(pid);
            p.categoria = cat;
            p.motivo = clasificacion.second;
            p.anio = (anio != 0) ? anio : -1;
            p.autores_del_grupo = del_grupo;
            p.grupos_relacionados = static_cast<int>(relacionados.size());
            p.familia_medicion = cat.empty() ? familia_relacional(producto.family_id, descripcion)
                                             : std::string();
            productos.push_back(p);
        }

        // Edad del grupo: fecha de fundación declarada si la hay; si no, el
        // primer año de producción registrada.
        int edad = 1;
        int anio_fundacion = extraer_anio_fecha(grupo.declared_creation_date);
        if (anio_fundacion != 0 && anio_fundacion <= ano_cierre) {
            edad = std::max(1, ano_cierre - anio_fundacion);
        } else if (!anios.empty()) {
            int minimo = *std::min_element(anios.begin(), anios.end());
            edad = std::max(1, ano_cierre - minimo);
        }

        std::string nombre = !grupo.acronym.empty() ? grupo.acronym
                          : (!grupo.name.empty() ? grupo.name
                                                 : ("grupo " + std::to_string(grupo.id)));
        GrupoOficial g;
        g.identificacion = nombre + " (#" + std::to_string(grupo.id) + ")";
        g.edad_grupo = edad;
        g.productos = std::move(productos);
        grupos.push_back(std::move(g));
    }
    return grupos;
}

// --- §3.8.1 + §2.2.10 + §3.9 + §3.10 ------------------------------------------

namespace {

struct Recopilacion {
    int edad_grupo = 1;
    std::map<std::string, int> conteos;                  // categoría → n en período
    std::vector<DetalleSubtipo> subtipos;
    std::vector<double> valores_clase;                   // 7 clases (§3.7)
    Relacionales cohe, coop;
    std::map<std::string, int> excluidos, sin_ano, fuera_de_periodo;
};

Recopilacion recopilar_produccion(const GrupoOficial& grupo, int ano_cierre) {
    Recopilacion r;
    r.edad_grupo = grupo.edad_grupo;

    for (const ProductoOficial& p : grupo.productos) {
        const CatalogoCategoria* cat = p.categoria.empty() ? nullptr : categoria(p.categoria);
        if (cat == nullptr) {
            r.excluidos[p.motivo.empty() ? std::string("sin categoría oficial") : p.motivo] += 1;
            continue;
        }
        if (!cat->tiene_ancla()) {
            r.excluidos["subtipo '" + cat->subtipo + "' sin ancla en Tabla 6: peso no calculable"] += 1;
            continue;
        }
        if (p.anio < 0) {
            r.sin_ano[cat->code] += 1;
            continue;
        }
        int periodo = std::min(r.edad_grupo, cat->ventana_subtipo);
        int edad = ano_cierre - p.anio;
        if (edad < 0 || edad > periodo) {
            r.fuera_de_periodo[cat->code] += 1;
            continue;
        }
        r.conteos[cat->code] += 1;
    }

    // Detalle por subtipo: n, período, λ (§2.2.9), pesos (§3.6) y término λ×peso.
    for (const auto& par : r.conteos) {
        const CatalogoCategoria* cat = categoria(par.first);
        if (!cat) continue;
        DetalleSubtipo d;
        d.codigo = cat->code;
        d.clase = cat->clase;
        d.familia = cat->familia;
        d.n = par.second;
        d.periodo = std::min(r.edad_grupo, cat->ventana_subtipo);
        d.lambda = lambda_subtipo(d.n, d.periodo);
        d.ancla_subtipo = cat->ancla_subtipo;
        d.peso_relativo = cat->peso_relativo;
        d.peso_global = cat->peso_global();
        d.termino = d.lambda * d.peso_global;
        r.subtipos.push_back(d);
    }

    // §3.8.1: índice por clase = Σ términos de la clase
    r.valores_clase.assign(7, 0.0);
    for (const DetalleSubtipo& d : r.subtipos) {
        for (int i = 0; i < 7; ++i) {
            if (d.clase == CLASES[i]) { r.valores_clase[i] += d.termino; break; }
        }
    }

    // §2.2.10: Cohe/Coop sobre los productos GNC/DTI que participan en la
    // medición (los que la fuente evidencia como familia aunque no publiquen
    // calidad oficial también cuentan: §2.2.10 es relacional, no de calidad).
    std::vector<const ProductoOficial*> dominio;
    for (const ProductoOficial& p : grupo.productos) {
        if (p.anio < 0) continue;
        int ventana = 0;
        const CatalogoCategoria* cat = p.categoria.empty() ? nullptr : categoria(p.categoria);
        if (cat != nullptr) {
            if (cat->familia != "GNC" && cat->familia != "DTI") continue;
            ventana = cat->ventana_subtipo;
        } else if (p.familia_medicion == "GNC" || p.familia_medicion == "DTI") {
            ventana = (p.familia_medicion == "GNC") ? 7 : 5;
        } else {
            continue;
        }
        int edad = ano_cierre - p.anio;
        if (edad < 0 || edad > std::min(r.edad_grupo, ventana)) continue;
        dominio.push_back(&p);
    }
    if (!dominio.empty()) {
        int suma_autores = 0, suma_grupos = 0;
        for (const ProductoOficial* p : dominio) {
            suma_autores += p->autores_del_grupo;
            suma_grupos += p->grupos_relacionados;
        }
        int n = static_cast<int>(dominio.size());
        r.cohe.suma_autores = suma_autores;
        r.cohe.productos = n;
        r.cohe.valor = static_cast<double>(suma_autores) / n - 1.0;
        r.coop.suma_grupos = suma_grupos;
        r.coop.productos = n;
        r.coop.valor = static_cast<double>(suma_grupos) / n - 1.0;
    }
    return r;
}

} // namespace

double ResultadoOficial::ind_grupo() const {
    double total = 0.0;
    for (double t : terminos) total += t;
    return total;
}

double ResultadoOficial::indice(const std::string& termino) const {
    for (size_t i = 0; i < indices.size() && i < valores_indice.size(); ++i) {
        if (indices[i] == termino) return valores_indice[i];
    }
    return 0.0;
}

double ResultadoOficial::maximo_clase(const std::string& clase) const {
    for (size_t i = 0; i < clases.size() && i < maximos_clase.size(); ++i) {
        if (clases[i] == clase) return maximos_clase[i];
    }
    return 0.0;
}

std::vector<ResultadoOficial> evaluar_poblacion(const std::vector<GrupoOficial>& grupos, int ano_cierre) {
    std::vector<Recopilacion> predicciones;
    predicciones.reserve(grupos.size());
    for (const GrupoOficial& g : grupos) predicciones.push_back(recopilar_produccion(g, ano_cierre));

    // §3.9: máximo de cada indicador dentro de la población (incluye Cohe y Coop)
    std::vector<double> maximos(7, 0.0);
    for (const Recopilacion& r : predicciones) {
        for (int i = 0; i < 7; ++i) maximos[i] = std::max(maximos[i], r.valores_clase[i]);
    }
    double maximo_cohe = 0.0, maximo_coop = 0.0;
    for (const Recopilacion& r : predicciones) {
        maximo_cohe = std::max(maximo_cohe, r.cohe.valor);
        maximo_coop = std::max(maximo_coop, r.coop.valor);
    }

    std::vector<ResultadoOficial> resultados;
    for (size_t gi = 0; gi < grupos.size(); ++gi) {
        const GrupoOficial& grupo = grupos[gi];
        const Recopilacion& r = predicciones[gi];

        ResultadoOficial res;
        res.grupo = grupo.identificacion;
        res.anio_cierre = ano_cierre;
        res.edad_grupo = r.edad_grupo;
        res.maximos_clase = maximos;
        res.maximo_cohe = maximo_cohe;
        res.maximo_coop = maximo_coop;
        res.cohe = r.cohe;
        res.coop = r.coop;
        res.excluidos = r.excluidos;
        res.sin_ano = r.sin_ano;
        res.fuera_de_periodo = r.fuera_de_periodo;
        res.subtipos = r.subtipos;

        for (int i = 0; i < 7; ++i) {
            res.clases.push_back(CLASES[i]);
            res.valores_clase.push_back(r.valores_clase[i]);
        }
        for (int i = 0; i < 9; ++i) {
            double valor = 0.0;
            if (i < 7) {
                valor = (maximos[i] > 0.0) ? r.valores_clase[i] / maximos[i] : 0.0;
            } else if (i == 7) {
                valor = (maximo_cohe > 0.0) ? r.cohe.valor / maximo_cohe : 0.0;
            } else {
                valor = (maximo_coop > 0.0) ? r.coop.valor / maximo_coop : 0.0;
            }
            res.indices.push_back(TERMINOS[i]);
            res.valores_indice.push_back(valor);
            res.terminos.push_back(COEFICIENTES[i] * valor);
        }

        // orden del desglose: por término descendente (estable por código)
        std::stable_sort(res.subtipos.begin(), res.subtipos.end(),
                         [](const DetalleSubtipo& a, const DetalleSubtipo& b) {
                             if (a.termino != b.termino) return a.termino > b.termino;
                             return a.codigo < b.codigo;
                         });

        resultados.push_back(std::move(res));
    }

    // Ranking (§3.9 se normaliza contra la población; el puesto se ordena por
    // Ind.Grupo descendente, igual que en el backend).
    std::vector<size_t> orden(resultados.size());
    for (size_t i = 0; i < orden.size(); ++i) orden[i] = i;
    std::stable_sort(orden.begin(), orden.end(), [&](size_t a, size_t b) {
        return resultados[a].ind_grupo() > resultados[b].ind_grupo();
    });
    const int total = static_cast<int>(resultados.size());
    for (size_t pos = 0; pos < orden.size(); ++pos) {
        ResultadoOficial& res = resultados[orden[pos]];
        res.puesto = static_cast<int>(pos) + 1;
        res.de = total;
        res.percentil = std::round(100.0 * (total - static_cast<int>(pos)) / total * 10.0) / 10.0;
    }
    return resultados;
}

ResultadoOficial evaluar_modelo_oficial(int group_id, int ano_cierre, std::string* error) {
    if (error) error->clear();
    std::vector<GrupoOficial> grupos = construir_poblacion(ano_cierre);
    if (grupos.empty()) {
        if (error) *error = "El repositorio no tiene grupos para medir";
        return ResultadoOficial();
    }

    std::vector<ResultadoOficial> resultados = evaluar_poblacion(grupos, ano_cierre);

    auto gopt = get_group(group_id);
    if (!gopt) {
        if (error) *error = "Grupo " + std::to_string(group_id) + " no encontrado";
        return ResultadoOficial();
    }
    std::string nombre = !gopt->acronym.empty() ? gopt->acronym
                        : (!gopt->name.empty() ? gopt->name
                                               : ("grupo " + std::to_string(group_id)));
    std::string identificacion = nombre + " (#" + std::to_string(group_id) + ")";

    for (ResultadoOficial& res : resultados) {
        if (res.grupo == identificacion) {
            res.grupo_id = group_id;
            return res;
        }
    }
    if (error) *error = "Grupo " + std::to_string(group_id) + " no está en la población medida";
    return ResultadoOficial();
}

// --- Serialización -------------------------------------------------------------

namespace {

std::string json_escapar(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 8);
    for (unsigned char c : s) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\b': out += "\\b"; break;
            case '\f': out += "\\f"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:
                if (c < 0x20) {
                    char buf[8];
                    std::snprintf(buf, sizeof(buf), "\\u%04x", c);
                    out += buf;
                } else {
                    out += static_cast<char>(c);
                }
        }
    }
    return out;
}

std::string json_cadena(const std::string& s) {
    return "\"" + json_escapar(s) + "\"";
}

std::string json_numero(double v) {
    if (!std::isfinite(v)) return "null";
    char buf[40];
    std::snprintf(buf, sizeof(buf), "%.17g", v);
    return buf;
}

std::string json_histograma(const std::map<std::string, int>& hist) {
    std::string out = "{";
    bool primero = true;
    for (const auto& par : hist) {
        if (!primero) out += ", ";
        primero = false;
        out += json_cadena(par.first) + ": " + std::to_string(par.second);
    }
    out += "}";
    return out;
}

} // namespace

std::vector<std::string> supuestos() {
    return {
        "Edad del grupo: fecha de fundación declarada si el repositorio la trae; "
        "si no, se aproxima al primer año plausible de producción registrada.",
        "Calidad de las direcciones de trabajo (TP/TM): se asume B — la fuente no "
        "evidencia la 'categoría A' de la dirección.",
        "Los artículos en 'revista especializada' quedan fuera de los indicadores de "
        "producción (la calidad A1–D depende de Publindex/Scimago, que la fuente no "
        "trae), pero §2.2.10 es relacional: sí cuentan para Cohe/Coop.",
        "Normalización §3.9: contra la población cargada en el repositorio; el modelo "
        "oficial exigiría TODOS los grupos del área OCDE.",
        "Coop solo cuenta firmantes con investigador vinculado en el repositorio; "
        "los autores externos no aportan grupos relacionados.",
        "Ventana de notas científicas: el OCR de la Tabla 5 no la preserva (5 años).",
    };
}

std::string resultado_a_json(const ResultadoOficial& r, const std::vector<ResultadoOficial>& poblacion) {
    std::ostringstream o;
    o << "{\n";
    o << "  \"modelo\": " << json_cadena("Minciencias 2024 — modelo de medición (§2.2.9 → §3.10)") << ",\n";
    o << "  \"anio_cierre\": " << r.anio_cierre << ",\n";
    o << "  \"grupo\": {\"id\": " << r.grupo_id << ", \"identificacion\": " << json_cadena(r.grupo)
      << ", \"edad_anos\": " << r.edad_grupo << "},\n";
    o << "  \"ind_grupo\": " << json_numero(r.ind_grupo()) << ",\n";
    o << "  \"rango_teorico\": " << json_numero(rango_teorico()) << ",\n";
    o << "  \"posicion_poblacion\": {\"puesto\": " << r.puesto << ", \"de\": " << r.de
      << ", \"percentil\": " << json_numero(r.percentil) << "},\n";

    o << "  \"indices\": {";
    for (size_t i = 0; i < r.indices.size(); ++i) {
        if (i) o << ", ";
        o << json_cadena(r.indices[i]) << ": " << json_numero(r.valores_indice[i]);
    }
    o << "},\n";

    o << "  \"terminos_ponderados\": {";
    for (size_t i = 0; i < r.indices.size(); ++i) {
        if (i) o << ", ";
        o << json_cadena(r.indices[i]) << ": " << json_numero(r.terminos[i]);
    }
    o << "},\n";

    o << "  \"ind_clase\": {";
    for (size_t i = 0; i < r.clases.size(); ++i) {
        if (i) o << ", ";
        o << json_cadena(r.clases[i]) << ": " << json_numero(r.valores_clase[i]);
    }
    o << "},\n";

    o << "  \"maximos_poblacion\": {";
    for (size_t i = 0; i < r.clases.size(); ++i) {
        if (i) o << ", ";
        o << json_cadena(r.clases[i]) << ": " << json_numero(r.maximos_clase[i]);
    }
    o << "},\n";

    o << "  \"maximo_cohe_poblacion\": " << json_numero(r.maximo_cohe) << ",\n";
    o << "  \"maximo_coop_poblacion\": " << json_numero(r.maximo_coop) << ",\n";

    o << "  \"poblacion\": [";
    std::vector<const ResultadoOficial*> orden;
    orden.reserve(poblacion.size());
    for (const ResultadoOficial& p : poblacion) orden.push_back(&p);
    std::stable_sort(orden.begin(), orden.end(), [](const ResultadoOficial* a, const ResultadoOficial* b) {
        return a->ind_grupo() > b->ind_grupo();
    });
    for (size_t i = 0; i < orden.size(); ++i) {
        if (i) o << ", ";
        o << "{\"grupo\": " << json_cadena(orden[i]->grupo) << ", \"ind_grupo\": "
          << json_numero(orden[i]->ind_grupo()) << "}";
    }
    o << "],\n";

    o << "  \"subtipos\": [";
    for (size_t i = 0; i < r.subtipos.size(); ++i) {
        const DetalleSubtipo& d = r.subtipos[i];
        if (i) o << ", ";
        o << "{\"codigo\": " << json_cadena(d.codigo)
          << ", \"clase\": " << json_cadena(d.clase)
          << ", \"familia\": " << json_cadena(d.familia)
          << ", \"n\": " << d.n
          << ", \"periodo\": " << d.periodo
          << ", \"lambda\": " << json_numero(d.lambda)
          << ", \"ancla_subtipo\": " << (d.ancla_subtipo < 0 ? std::string("null") : json_numero(d.ancla_subtipo))
          << ", \"peso_relativo\": " << json_numero(d.peso_relativo)
          << ", \"peso_global\": " << json_numero(d.peso_global)
          << ", \"termino\": " << json_numero(d.termino)
          << "}";
    }
    o << "],\n";

    o << "  \"cohe\": {\"suma_autores\": " << r.cohe.suma_autores << ", \"productos\": " << r.cohe.productos
      << ", \"valor\": " << json_numero(r.cohe.valor) << "},\n";
    o << "  \"coop\": {\"suma_grupos\": " << r.coop.suma_grupos << ", \"productos\": " << r.coop.productos
      << ", \"valor\": " << json_numero(r.coop.valor) << "},\n";

    o << "  \"excluidos\": " << json_histograma(r.excluidos) << ",\n";
    o << "  \"sin_ano\": " << json_histograma(r.sin_ano) << ",\n";
    o << "  \"fuera_de_periodo\": " << json_histograma(r.fuera_de_periodo) << ",\n";

    o << "  \"supuestos\": [";
    std::vector<std::string> sup = supuestos();
    for (size_t i = 0; i < sup.size(); ++i) {
        if (i) o << ", ";
        o << json_cadena(sup[i]);
    }
    o << "]\n";
    o << "}\n";
    return o.str();
}

} // namespace peai::official
