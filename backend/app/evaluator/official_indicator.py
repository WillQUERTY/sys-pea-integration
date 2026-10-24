"""
Indicador oficial de grupo Minciencias 2024 — pipeline completo (docs/modelo-medicion-2024.md).

Implementa las secciones que el evaluador simplificado (metrics_collector.py)
no aplica, de punta a punta:

  §2.2.9   λ_subtipo = ln(n_subtipo / período + 1), donde el "período de
           observación" es el MENOR entre la edad del grupo al cierre de la
           ventana y la ventana de observación del subtipo (Tabla 5).
  §3.6     PesoGlobal_subtipo = ancla_del_subtipo (Tabla 6) × peso_relativo (Anexo 1).
           Confirmado por los tres ejemplos del propio documento:
             ART_A2   = 100 × 5,5 = 550
             CAP_LIB_B = 60 × 8   = 480
             PA1      = 500 × 10  = 5000
           Es decir: la fila de Tabla 6 es el ANCLA del subtipo ("peso del
           subtipo en su más alta calidad"), NO el peso final — hasta la
           categoría publicada se multiplica por su peso relativo.
  §3.7     Las seis clases de medición: TOP, A, B, ASC (apropiación), DPC
           (divulgación) y FRH (formación, que se reporta como Fr.A / Fr.B).
  §3.8.1   Ind_Clase = Σ λ_subtipo × PesoGlobal_subtipo  (subtipos ∈ Clase)
  §2.2.10.1 / §3.8.2   Cohe = (Σ autores del grupo por producto GNC+DTI / productos) − 1
           ("por cada producto se toma el número de autores que son del grupo
            y se calcula la suma total; al final se divide por el número de
            productos" — 0 significa un autor por producto).
  §2.2.10.2 / §3.8.3   Coop = (Σ grupos relacionados por producto GNC+DTI / productos) − 1
           (grupos donde están vinculados los coautores, contando el propio:
            "cero significa ausencia de cooperación", "0.2 indica que en
            promedio cada producto es firmado por 1.2 grupos").
  §3.9     índice = valor del indicador / máximo del indicador en la población
           de grupos del área OCDE. Se aplica a los seis indicadores de
           producción y también a Cohe y Coop.
  §3.10    Ind.Grupo = 3,7·Nc.Top + 2,3·Nc.A + 0,4·Nc.B + 1,5·AP + 0,5·DPC
                         + 1·Fr.A + 0,2·Fr.B + 0,1·Cohe + 0,3·Coop
           (todos los términos son ÍNDICES §3.9, no conteos crudos).

El módulo es puro (sin BD, pybind ni FastAPI) para poder probarlo con una
población sintética golden. La clasificación de un producto a una categoría
del catálogo se recibe como dato (`ProductoOficial.categoria`) o se infiere
de la descripción con reglas conservadoras y documentadas
(`inferir_categoria`): lo que no es verificable en la fuente, se excluye con
motivo explícito en vez de inventarse una categoría.
"""

from __future__ import annotations

import json
import math
import pathlib
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

RUTA_CATALOGO_PREDETERMINADA = (
    pathlib.Path(__file__).resolve().parents[3] / "database" / "catalog_2024.json"
)

# --- §3.10: coeficientes oficiales del Ind.Grupo -----------------------------
COEFICIENTES = {
    "Nc.Top": 3.7,
    "Nc.A": 2.3,
    "Nc.B": 0.4,
    "AP": 1.5,
    "DPC": 0.5,
    "Fr.A": 1.0,
    "Fr.B": 0.2,
    "Cohe": 0.1,
    "Coop": 0.3,
}

# Clases de medición (§3.7) tal como vienen en el catálogo 2024
CLASES = ["TOP", "A", "B", "ASC", "DPC", "FRH-A", "FRH-B"]

TERMINO_POR_CLASE = {
    "TOP": "Nc.Top",
    "A": "Nc.A",
    "B": "Nc.B",
    "ASC": "AP",
    "DPC": "DPC",
    "FRH-A": "Fr.A",
    "FRH-B": "Fr.B",
}

# --- Tabla 5 (§2.2.5): ventana de observación por subtipo --------------------
VENTANA_POR_SUBTIPO = {
    "ART": 7,      # artículos A1/A2/B/C → 7 años (D → 5, ver _ventana_subtipo)
    "N": 5,        # notas científicas: el OCR de la Tabla 5 no preserva el
                   # valor; se usa 5, en línea con get_applicable_window.
    "LIB": 7,      # libros resultado de investigación
    "CAP_LIB": 5,  # capítulos en libro resultado de investigación
    "PAT_INV": 10,
    "MOD_UTIL": 10,
    "VV": 10,
    "NRA": 10,
    "PMR": 10,
    "AAD": 10,
}
VENTANA_RESTO = 5  # DTI certificados, ASC, DPC y FRH (Tabla 5)

# --- Catálogo -----------------------------------------------------------------


@dataclass(frozen=True)
class CategoriaOficial:
    code: str
    familia: str                    # GNC / DTI / ASC / DPC / FRH
    subtipo: str
    clase: str                      # TOP / A / B / ASC / DPC / FRH-A / FRH-B
    peso_relativo: float            # Anexo 1
    ancla_subtipo: Optional[float]  # Tabla 6 (ancla del subtipo; None si no hay)
    ventana_subtipo: int            # Tabla 5

    @property
    def peso_global(self) -> Optional[float]:
        """§3.6: peso individual final = ancla (Tabla 6) × peso relativo."""
        if self.ancla_subtipo is None:
            return None
        return self.ancla_subtipo * self.peso_relativo


# Orden para elegir el ancla del subtipo entre las filas que sí publica la
# Tabla 6: primero la "más alta calidad" por clase (TOP > A > B > ...), luego
# el mayor peso relativo y por último el mayor valor de Tabla 6. Resuelve los
# subtipos con dos filas publicadas (ART: OPEN_A1=100 vs OPEN_D=5; LIB: A1=300
# vs C=15) a favor de la fila de mayor calidad, tal como lo hacen los ejemplos
# de §3.6 (el de ART_A2 usa 100, no 5).
_RANGO_CLASE = {"TOP": 0, "A": 1, "B": 2, "ASC": 3, "DPC": 4, "FRH-A": 5, "FRH-B": 6}


def _ventana_subtipo(subtipo: str, code: str) -> int:
    if code in ("ART_D", "ART_OPEN_D"):  # artículos D → 5 años (Tabla 5)
        return 5
    return VENTANA_POR_SUBTIPO.get(subtipo, VENTANA_RESTO)


def construir_catalogo(doc: dict) -> Dict[str, CategoriaOficial]:
    """Indexa catalog_2024.json por código de categoría, calculando el ancla de cada subtipo."""
    catalogo: Dict[str, CategoriaOficial] = {}
    for fam in doc.get("families", []):
        for sub in fam.get("subtypes", []):
            ancla, mejor_clave = None, None
            for cat in sub.get("categories", []):
                gw = cat.get("global_weight")
                if gw is None:
                    continue
                clave = (
                    _RANGO_CLASE.get(cat.get("measurement_class") or "", 99),
                    -(float(cat.get("weight") or 0)),
                    -float(gw),
                )
                if mejor_clave is None or clave < mejor_clave:
                    mejor_clave, ancla = clave, float(gw)
            for cat in sub.get("categories", []):
                rel = cat.get("weight")
                if rel is None:  # p.ej. LIB_CRE: categoría sin pesos en el PDF oficial
                    continue
                code = cat["code"]
                catalogo[code] = CategoriaOficial(
                    code=code,
                    familia=fam["code"],
                    subtipo=sub["code"],
                    clase=cat.get("measurement_class") or "",
                    peso_relativo=float(rel),
                    ancla_subtipo=ancla,
                    ventana_subtipo=_ventana_subtipo(sub["code"], code),
                )
    return catalogo


def cargar_catalogo(ruta=None) -> Dict[str, CategoriaOficial]:
    ruta = pathlib.Path(ruta) if ruta else RUTA_CATALOGO_PREDETERMINADA
    with open(ruta, encoding="utf-8") as f:
        return construir_catalogo(json.load(f))


# --- Insumos por grupo ---------------------------------------------------------


@dataclass
class ProductoOficial:
    identificacion: str
    categoria: Optional[str] = None   # código de categoría del catálogo (None: no clasificable)
    motivo: str = ""                  # explicación de la categoría o del motivo de exclusión
    ano: Optional[int] = None         # año de publicación/obtención
    # Cohe/Coop (§2.2.10): solo se leen en productos GNC/DTI dentro del período
    autores_del_grupo: int = 0        # firmantes del producto que son integrantes del grupo
    grupos_relacionados: int = 0      # grupos donde están vinculados los coautores (incluye el propio)
    # Familia amplia GNC/DTI que la FUENTE evidencia aunque no publique la
    # categoría oficial (p.ej. un artículo sin Publindex sigue siendo GNC):
    # hace que el producto participe del dominio relacional de Cohe/Coop,
    # pero NO de los indicadores de producción (que exigen categoría+calidad).
    familia_medicion: Optional[str] = None


@dataclass
class GrupoOficial:
    identificacion: str
    edad_grupo: int                   # años de existencia al cierre de la ventana
    productos: List[ProductoOficial] = field(default_factory=list)


# --- §2.2.9: λ ------------------------------------------------------------------


def lambda_subtipo(n_productos: int, periodo: Optional[float]) -> float:
    """λ_subtipo = ln(número de productos en el subtipo / período de observación + 1)."""
    if not n_productos or not periodo or periodo <= 0:
        return 0.0
    return math.log(n_productos / periodo + 1)


# --- Clasificación conservadora por descripción (GrupLAC) ----------------------

# El dataset real trae mojibake de doble codificación UTF-8→cp1252
# ("maestrã­a" por "maestría"); se corrige antes de quitar acentos.
_CORRECCIONES_MOJIBAKE = {
    "ã©": "e",
    "ã³": "o",
    "ã­": "i",
    "ã¡": "a",
    "ã±": "n",
}


def _texto_normalizado(texto: str) -> str:
    t = (texto or "").lower()
    for mojibake, ch in _CORRECCIONES_MOJIBAKE.items():
        t = t.replace(mojibake, ch)
    t = unicodedata.normalize("NFD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))
    return t


def inferir_categoria(descripcion: str) -> Tuple[Optional[str], str]:
    """Clasifica una descripción GrupLAC en una categoría oficial del catálogo 2024.

    Solo mapea lo verificable en la fuente (el Tipo en que GrupLAC registró el
    producto). Cuando GrupLAC no publica la calidad oficial (Publindex, cuartil,
    categoría A de una dirección de trabajo...), el producto se excluye con un
    motivo explícito: el modelo oficial exige esa calidad y inventaría el dato.
    """
    if not (descripcion or "").strip():
        return None, "sin descripción (categoría no verificable)"

    # El tipo del producto vive en el prefijo de la línea GrupLAC ("N.- TIPO : ...");
    # el título/journal/años/authores van después de ":" y NO se usan para clasificar.
    prefijo = descripcion.split(":", 1)[0]
    t = _texto_normalizado(prefijo)
    if not t.strip():
        t = _texto_normalizado(descripcion)

    # --- FRH: direcciones de trabajo (§2.2.6). Tipo verificable; la CALIDAD se
    # asume B porque GrupLAC no evidencia la "categoría A" de la dirección.
    if "trabajo de grado de pregrado" in t or "trabajos de grado de pregrado" in t:
        return "TP_B", "dirección de trabajo de pregrado (calidad B asumida: GrupLAC no evidencia categoría A)"
    if "trabajo de grado de maestria" in t:
        return "TM_B", "dirección de trabajo de maestría (calidad B asumida: GrupLAC no evidencia categoría A)"

    # --- DPC con etiqueta verificable de palabra
    if "documento de trabajo" in t or "working paper" in t:
        return "WP", "documento de trabajo (working paper)"
    if "libros de divulgacion" in t or "libro de divulgacion" in t or "compilacion de divulgacion" in t:
        return "LIB_DIV", "libros de divulgación y/o compilación de divulgación"
    if "informe final proyecto de investigacion" in t or "informes de investigacion" in t:
        return "IFI", "informe final de investigación"
    if "boletin" in t:
        return "BOL", "boletín divulgativo de resultado de investigación"

    # --- Exclusiones con motivo explícito (no se inventa categoría)
    if "publicado en revista especializada" in t or "articulo publicado" in t or "articulo de investigacion" in t:
        return None, "artículo sin calidad oficial A1–D (Publindex/Scimago no está en la fuente)"
    if "revista de divulgacion" in t:
        return None, "artículo en revista de divulgación: sin categoría oficial A1–D en la fuente"
    if "corto" in t and "resumen" in t:
        return None, "artículo corto/nota científica sin calidad oficial en la fuente"
    if "otro capitulo de libro" in t:
        return None, "capítulo en libro NO resultado de investigación: sin categoría oficial 2024"
    if "capitulo de libro" in t:
        return None, "capítulo de libro resultado: sin calidad A1–C (cuartil de citaciones no disponible)"
    if "libro resultado de investigacion" in t:
        return None, "libro resultado de investigación: sin calidad A1–C (cuartil de citaciones no disponible)"
    if "libros de formacion" in t or "libro de formacion" in t:
        return None, "libro de formación: sin cuartil Q1–Q3 en la fuente"
    if "trabajos dirigidos" in t or "tutorias de otro tipo" in t:
        return None, "tutoría de otro tipo: sin subtipo oficial 2024"
    if "extension extracurricular" in t or "perfeccionamiento" in t or "curso de" in t or "monografia" in t:
        return None, "curso/extensión/monografía: no es tipo de producto en el modelo 2024"
    if (
        "trabajos en eventos" in t
        or "congreso" in t
        or "encuentro" in t
        or "seminario" in t
        or "simposio" in t
        or "ponencia" in t
    ):
        return None, "trabajo en evento (ponencia/congreso): no es tipo de producto en el modelo 2024"
    if "computacional" in t or "industrial" in t or "servicios" in t:
        return None, "producto tecnológico GrupLAC (Computacional/Industrial/Servicios) sin categoría oficial verificable"
    if "desarrollo web" in t or "micrositio" in t or "pagina web" in t:
        return None, "desarrollo web: sin calidad A1–C (la fuente no la evidencia)"
    if "cartilla" in t or "periodico" in t:
        return None, "cartilla/periódico: tipo sin categoría oficial verificable 2024"

    return None, "sección de GrupLAC sin categoría oficial 2024"


# --- §3.8.1 + §2.2.10: recopilación por grupo ----------------------------------


def _en_periodo(producto: ProductoOficial, cat: CategoriaOficial, grupo: GrupoOficial, ano_cierre: int) -> bool:
    """El producto está dentro del período de observación de su subtipo:
    período = min(edad del grupo, ventana del subtipo); edad del producto ≤ período."""
    if producto.ano is None:
        return False
    periodo = min(grupo.edad_grupo, cat.ventana_subtipo)
    edad = ano_cierre - producto.ano
    return 0 <= edad <= periodo


def recopilar_produccion(grupo: GrupoOficial, ano_cierre: int, catalogo: Dict[str, CategoriaOficial]) -> dict:
    """Por grupo: conteos por categoría en período, Ind_Clase por clase (§3.8.1),
    Cohe (§2.2.10.1) y Coop (§2.2.10.2) sobre los GNC/DTI que participan."""
    excluidos: Counter = Counter()
    fuera_de_periodo: Counter = Counter()
    sin_ano: Counter = Counter()
    conteos: Counter = Counter()

    for p in grupo.productos:
        cat = catalogo.get(p.categoria) if p.categoria else None
        if cat is None:
            excluidos[p.motivo or "sin categoría oficial"] += 1
            continue
        if cat.peso_global is None:
            excluidos["subtipo '%s' sin ancla en Tabla 6: peso no calculable" % cat.subtipo] += 1
            continue
        if p.ano is None:
            sin_ano[cat.code] += 1
            continue
        if not _en_periodo(p, cat, grupo, ano_cierre):
            fuera_de_periodo[cat.code] += 1
            continue
        conteos[cat.code] += 1

    # Detalle por subtipo: n, período, λ (§2.2.9), pesos (§3.6) y término λ×peso (§3.8.1)
    subtipos = {}
    for code, n in sorted(conteos.items()):
        cat = catalogo[code]
        periodo = min(grupo.edad_grupo, cat.ventana_subtipo)
        lam = lambda_subtipo(n, periodo)
        peso = cat.peso_global or 0.0
        subtipos[code] = {
            "clase": cat.clase,
            "familia": cat.familia,
            "n": n,
            "periodo": periodo,
            "lambda": lam,
            "ancla_subtipo": cat.ancla_subtipo,
            "peso_relativo": cat.peso_relativo,
            "peso_global": peso,
            "termino": lam * peso,
        }

    # §3.8.1: índice por clase = Σ términos de la clase
    ind_clase = {clase: 0.0 for clase in CLASES}
    for detalle in subtipos.values():
        if detalle["clase"] in ind_clase:
            ind_clase[detalle["clase"]] += detalle["termino"]

    # §2.2.10: Cohe/Coop sobre los productos GNC/DTI que participan en la
    # medición. Un producto cuenta si su categoría es GNC/DTI, o si la fuente
    # evidencia SU FAMILIA amplia aunque no la calidad (un "artículo sin
    # Publindex" sigue siendo un producto GNC: §2.2.10 es relacional, no de
    # calidad). Ventana: la del subtipo si hay categoría; si no, la dominante
    # de la familia (GNC 7 por artículos A1–C, DTI 5 — Tabla 5), documentada.
    dominio = []
    for p in grupo.productos:
        if p.ano is None:
            continue
        if p.categoria and p.categoria in catalogo:
            cat = catalogo[p.categoria]
            if cat.familia not in ("GNC", "DTI"):
                continue
            ventana = cat.ventana_subtipo
        elif p.familia_medicion in ("GNC", "DTI"):
            ventana = 7 if p.familia_medicion == "GNC" else 5
        else:
            continue
        edad = ano_cierre - p.ano
        if 0 <= edad <= min(grupo.edad_grupo, ventana):
            dominio.append(p)
    if dominio:
        suma_autores = sum(p.autores_del_grupo for p in dominio)
        suma_grupos = sum(p.grupos_relacionados for p in dominio)
        cohe = {"suma_autores": suma_autores, "productos": len(dominio), "valor": suma_autores / len(dominio) - 1}
        coop = {"suma_grupos": suma_grupos, "productos": len(dominio), "valor": suma_grupos / len(dominio) - 1}
    else:
        cohe = {"suma_autores": 0, "productos": 0, "valor": 0.0}
        coop = {"suma_grupos": 0, "productos": 0, "valor": 0.0}

    return {
        "grupo": grupo.identificacion,
        "edad_grupo": grupo.edad_grupo,
        "ano_cierre": ano_cierre,
        "subtipos": subtipos,
        "ind_clase": ind_clase,
        "cohe": cohe,
        "coop": coop,
        "excluidos": dict(excluidos),
        "sin_ano": dict(sin_ano),
        "fuera_de_periodo": dict(fuera_de_periodo),
    }


# --- §3.9 + §3.10: población, normalización y fórmula final --------------------


def evaluar_poblacion(
    grupos: List[GrupoOficial],
    ano_cierre: int,
    catalogo: Optional[Dict[str, CategoriaOficial]] = None,
) -> List[dict]:
    """Evalúa toda la población de grupos del área OCDE, normaliza contra el
    máximo de cada indicador (§3.9) y aplica la fórmula §3.10 a cada grupo.

    Devuelve, por grupo, el desglose completo: subtipos que aportan, Ind_Clase
    por clase, máximos de la población, Cohe/Coop, los 9 índices de §3.10 con
    su coeficiente y el Ind.Grupo final.
    """
    catalogo = catalogo if catalogo is not None else cargar_catalogo()
    producciones = [recopilar_produccion(g, ano_cierre, catalogo) for g in grupos]

    # §3.9: máximo de cada indicador dentro de la población (incluye Cohe y Coop)
    maximos_clase = {c: max((pp["ind_clase"][c] for pp in producciones), default=0.0) for c in CLASES}
    maximo_cohe = max((pp["cohe"]["valor"] for pp in producciones), default=0.0)
    maximo_coop = max((pp["coop"]["valor"] for pp in producciones), default=0.0)

    resultados = []
    for grupo, pp in zip(grupos, producciones):
        indices = {}
        terminos = {}
        for clase in CLASES:
            termino = TERMINO_POR_CLASE[clase]
            maximo = maximos_clase[clase]
            indices[termino] = (pp["ind_clase"][clase] / maximo) if maximo > 0 else 0.0

        indices["Cohe"] = (pp["cohe"]["valor"] / maximo_cohe) if maximo_cohe > 0 else 0.0
        indices["Coop"] = (pp["coop"]["valor"] / maximo_coop) if maximo_coop > 0 else 0.0

        for termino, coef in COEFICIENTES.items():
            terminos[termino] = coef * indices[termino]

        resultado = dict(pp)
        resultado.update(
            {
                "maximos_poblacion": dict(maximos_clase),
                "maximo_cohe_poblacion": maximo_cohe,
                "maximo_coop_poblacion": maximo_coop,
                "indices": indices,
                "terminos_ponderados": terminos,
                "ind_grupo": sum(terminos.values()),
            }
        )
        resultados.append(resultado)
    return resultados
