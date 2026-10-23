# backend/app/evaluator/official_population.py
"""
Adaptador del repositorio (RAM) al modelo oficial de medición Minciencias 2024.

`official_indicator.py` es puro: recibe estructuras `GrupoOficial` /
`ProductoOficial` y aplica el modelo (§2.2.9 → §3.10). Este módulo hace la
traducción de lo que el backend ya tiene cargado —grupos, productos,
membresías y autores en RAM— a esas estructuras, y construye la POBLACIÓN
completa de grupos.

Por qué la población completa: §3.9 normaliza cada indicador contra el
MÁXIMO del indicador en la población de grupos del área OCDE. El evaluador
legacy (`minciencias_evaluator`) normaliza cada grupo contra sí mismo y
suma conteos crudos; este adaptador hace la medición oficial completa
(λ §2.2.9, pesos §3.6, clases §3.7, Ind_Clase §3.8.1, Cohe/Coop §2.2.10,
normalización §3.9 y fórmula §3.10) sobre el catálogo 2024.

Relación con el evaluador legacy: conviven. El legacy se conserva porque el
frontend y los tests dependen de su forma (`i_grupo`, tiers, semáforo); este
módulo agrega la lectura oficial como dato ADITIVO (`modelo_oficial_2024`).

Las funciones puras de este archivo (`extraer_anio`, `grupos_relacionados`,
`edad_grupo`) las reutiliza `scripts/pea_indicador_ofICIAL.py`, que trabaja
sobre `pea_data.json` en vez de la RAM: así el reporte y la API calculan lo
mismo.
"""

from __future__ import annotations

import datetime
import re
from collections import defaultdict
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Set

from .helpers import extract_year_from_date
from .official_indicator import (
    CLASES,
    COEFICIENTES,
    GrupoOficial,
    ProductoOficial,
    cargar_catalogo,
    evaluar_poblacion,
    inferir_categoria,
)
from .product_classifier import determine_family

# Ventana de años plausible para un producto: el dataset trae años espurios
# (p.ej. 1909) que harían "envejecer" al grupo sin sentido.
_ANIO_MINIMO = 1950
_ANIO_MAXIMO = 2050
_ANIO_RE = re.compile(r"\b(19[5-9]\d|20[0-4]\d)\b")


# --- Funciones puras (compartidas con scripts/pea_indicador_ofICIAL.py) --------


def _valor(producto: Any, campo: str) -> Any:
    """Lee un campo de un producto tanto si es dict (JSON) como modelo (RAM)."""
    if isinstance(producto, Mapping):
        return producto.get(campo)
    return getattr(producto, campo, None)


def extraer_anio(producto: Any) -> Optional[int]:
    """Año del producto: campos de la RAM primero; si no, primer año plausible
    de la descripción GrupLAC ("Desde 9 2025 hasta Abril 2026" → 2025).

    Se acota a 1950–2050: el dataset trae años espurios que harían
    "envejecer" al grupo sin sentido.
    """
    for campo in ("year", "obtained_date", "publication_date"):
        valor = _valor(producto, campo)
        if valor is None or valor == "":
            continue
        try:
            valor = int(valor)
        except (TypeError, ValueError):
            anio = extract_year_from_date(valor)
            if anio and _ANIO_MINIMO <= anio <= _ANIO_MAXIMO:
                return anio
            continue
        if _ANIO_MINIMO <= valor <= _ANIO_MAXIMO:
            return valor

    coincidencia = _ANIO_RE.search(_valor(producto, "description") or "")
    if coincidencia:
        return int(coincidencia.group(1))
    return None


def grupos_relacionados(
    grupo_id: int,
    autores: Iterable[int],
    membresias: Mapping[int, Set[int]],
) -> int:
    """Grupos donde están vinculados los coautores de un producto (§2.2.10.2).

    Cuenta el grupo propio —el producto es del grupo— más los grupos donde
    están vinculados los coautores que sí tienen investigador en el
    repositorio. Los autores externos (sin investigador vinculado) no aportan
    grupos: no hay dato de afiliación para ellos.
    """
    relacionados = {grupo_id}
    for rid in autores:
        if rid and rid > 0:
            relacionados |= membresias.get(rid) or set()
    return len(relacionados)


def edad_grupo(
    ano_cierre: int,
    anios: Iterable[int],
    edad_manual: Optional[int] = None,
) -> int:
    """Edad del grupo al cierre de la ventana (§2.2.9 usa min(edad, ventana))."""
    if edad_manual:
        return max(1, int(edad_manual))
    anios = [a for a in anios if a]
    if anios:
        return max(1, ano_cierre - min(anios))
    return 1


# --- Adaptador RAM ------------------------------------------------------------


def _descripcion(producto: Any) -> str:
    return (_valor(producto, "description") or "").strip()


class _ProductoVista:
    """Vista mínima de un producto para el clasificador heredado: solo necesita
    `family_id` (y funciona igual con dicts del JSON y modelos de la RAM)."""

    __slots__ = ("family_id",)

    def __init__(self, family_id: Any = 0):
        try:
            self.family_id = int(family_id or 0)
        except (TypeError, ValueError):
            self.family_id = 0


def familia_relacional(producto: Any, descripcion: Optional[str] = None) -> Optional[str]:
    """Familia amplia GNC/DTI que la fuente evidencia aunque el producto no
    tenga categoría oficial verificable (p.ej. un artículo sin Publindex).

    §2.2.10 es RELACIONAL (autores/grupos), no de calidad: ese producto sigue
    contando para Cohe/Coop aunque no entre a los indicadores de producción.
    Se usa el clasificador heredado `determine_family` (misma lectura que usa
    el evaluador legacy) y solo se propagan GNC y DTI.
    """
    if descripcion is None:
        descripcion = _valor(producto, "description") or ""
    if not descripcion.strip():
        return None
    try:
        familia = determine_family(
            _ProductoVista(_valor(producto, "family_id")), descripcion.lower()
        )
    except Exception:
        return None
    return familia if familia in ("GNC", "DTI") else None


def _resolver_autores(repository_module: Any):
    """Devuelve un callable (product_id) -> [researcher_id] o None si el
    repositorio no expone los autores del producto en RAM."""
    fn = getattr(repository_module, "authors_of_product_ram", None)
    if callable(fn):
        def _por_fachada(pid):
            return [int(getattr(a, "researcher_id", 0) or 0) for a in fn(pid)]
        return _por_fachada

    try:
        import abpoxx_pybind  # import local: el evaluador no debe depender de él
    except Exception:
        return None

    def _por_nucleo(pid):
        return [int(getattr(a, "researcher_id", 0) or 0) for a in abpoxx_pybind.authors_of_product_ram(pid)]

    return _por_nucleo


def _membresias(repository_module: Any, grupos: Sequence[Any]) -> Dict[int, Set[int]]:
    """mapa investigador -> grupos donde está vinculado."""
    membresias: Dict[int, Set[int]] = defaultdict(set)
    for grupo in grupos:
        try:
            miembros = repository_module.members_of_group(grupo.id)
        except Exception:
            continue
        for rid in miembros or []:
            if rid and rid > 0:
                memberships_set = membresias.setdefault(int(rid), set())
                memberships_set.add(grupo.id)
    return dict(membresias)


def construir_poblacion(
    repository_module: Any,
    ano_cierre: int,
    catalogo: Optional[Dict[str, Any]] = None,
) -> List[GrupoOficial]:
    """Construye la población de grupos del repositorio en estructuras del
    modelo oficial (productos clasificados, años y datos relacionales)."""
    catalogo = catalogo if catalogo is not None else cargar_catalogo()
    grupos_ram = list(repository_module.list_groups() or [])
    membresias = _membresias(repository_module, grupos_ram)
    autores_de = _resolver_autores(repository_module)

    grupos: List[GrupoOficial] = []
    for grupo in grupos_ram:
        try:
            pids = list(repository_module.products_of_group(grupo.id) or [])
        except Exception:
            pids = []

        productos: List[ProductoOficial] = []
        anios: List[int] = []
        for pid in pids:
            try:
                producto = repository_module.get_product(pid)
            except KeyError:
                # Enlace colgante: el producto no está en la RAM.
                continue
            if producto is None:
                continue
            descripcion = _descripcion(producto)
            anio = extraer_anio(producto)
            if anio:
                anios.append(anio)

            categoria, motivo = inferir_categoria(descripcion)
            firmantes: List[int] = []
            if autores_de is not None:
                try:
                    firmantes = [rid for rid in autores_de(pid) if rid and rid > 0]
                except Exception:
                    firmantes = []

            del_grupo = [rid for rid in firmantes if grupo.id in (membresias.get(rid) or set())]
            productos.append(
                ProductoOficial(
                    identificacion=str(pid),
                    categoria=categoria,
                    motivo=motivo,
                    ano=anio,
                    autores_del_grupo=len(del_grupo),
                    grupos_relacionados=grupos_relacionados(grupo.id, firmantes, membresias),
                    familia_medicion=(
                        familia_relacional(producto, descripcion) if categoria is None else None
                    ),
                )
            )

        # Edad del grupo: fecha de fundación declarada si el repositorio la
        # trae; si no, el primer año de producción registrada.
        anio_fundacion = extract_year_from_date(getattr(grupo, "declared_creation_date", None))
        if anio_fundacion and anio_fundacion <= ano_cierre:
            edad = max(1, ano_cierre - anio_fundacion)
        else:
            edad = edad_grupo(ano_cierre, anios)

        nombre = getattr(grupo, "acronym", None) or getattr(grupo, "name", "") or f"grupo {grupo.id}"
        grupos.append(GrupoOficial(f"{nombre} (#{grupo.id})", edad, productos))

    return grupos


def evaluar_modelo_oficial(
    repository_module: Any,
    group_id: int,
    ano_cierre: Optional[int] = None,
    catalogo: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Evalúa un grupo con el modelo oficial 2024, normalizado contra TODA la
    población de grupos del repositorio (§3.9).

    Devuelve un dict JSON-serializable con el desglose completo del grupo y
    el contexto de población (índices, términos ponderados, máximos,
    Cohe/Coop, exclusiones y supuestos documentados).
    """
    ano_cierre = ano_cierre or datetime.datetime.now().year
    catalogo = catalogo if catalogo is not None else cargar_catalogo()

    grupos = construir_poblacion(repository_module, ano_cierre, catalogo)
    if not grupos:
        raise ValueError("El repositorio no tiene grupos para medir")

    resultados = evaluar_poblacion(grupos, ano_cierre, catalogo)

    # El grupo pedido se identifica por su identificador exacto (#id), no por
    # posición: la población se ordena por Ind.Grupo para el ranking.
    grupo_ram = repository_module.get_group(group_id)
    nombre = getattr(grupo_ram, "acronym", None) or getattr(grupo_ram, "name", "") or f"grupo {group_id}"
    identificacion = f"{nombre} (#{group_id})"

    objetivo = next((r for r in resultados if r["grupo"] == identificacion), None)
    if objetivo is None:
        raise KeyError(f"Grupo {group_id} no está en la población medida")

    ranking = sorted(resultados, key=lambda r: -r["ind_grupo"])
    posiciones = [r["grupo"] for r in ranking]
    total = len(resultados)

    subtipos = []
    for code, detalle in objetivo["subtipos"].items():
        subtipos.append(
            {
                "codigo": code,
                "clase": detalle["clase"],
                "familia": detalle["familia"],
                "n": detalle["n"],
                "periodo": detalle["periodo"],
                "lambda": detalle["lambda"],
                "ancla_subtipo": detalle["ancla_subtipo"],
                "peso_relativo": detalle["peso_relativo"],
                "peso_global": detalle["peso_global"],
                "termino": detalle["termino"],
            }
        )
    subtipos.sort(key=lambda d: -d["termino"])

    return {
        "modelo": "Minciencias 2024 — modelo de medición (§2.2.9 → §3.10)",
        "anio_cierre": ano_cierre,
        "grupo": {
            "id": group_id,
            "identificacion": objetivo["grupo"],
            "edad_anos": objetivo["edad_grupo"],
        },
        "ind_grupo": objetivo["ind_grupo"],
        "rango_teorico": sum(COEFICIENTES.values()),
        "posicion_poblacion": {
            "puesto": posiciones.index(objetivo["grupo"]) + 1,
            "de": total,
            "percentil": round(100.0 * (total - posiciones.index(objetivo["grupo"])) / total, 1),
        },
        "poblacion": [
            {"grupo": r["grupo"], "ind_grupo": r["ind_grupo"]} for r in ranking
        ],
        "indices": objetivo["indices"],
        "terminos_ponderados": objetivo["terminos_ponderados"],
        "ind_clase": objetivo["ind_clase"],
        "maximos_poblacion": objetivo["maximos_poblacion"],
        "maximo_cohe_poblacion": objetivo["maximo_cohe_poblacion"],
        "maximo_coop_poblacion": objetivo["maximo_coop_poblacion"],
        "subtipos": subtipos,
        "cohe": objetivo["cohe"],
        "coop": objetivo["coop"],
        "excluidos": objetivo["excluidos"],
        "sin_ano": objetivo["sin_ano"],
        "fuera_de_periodo": objetivo["fuera_de_periodo"],
        "supuestos": _supuestos(),
    }


def _supuestos() -> List[str]:
    """Supuestos documentados: lo que NO se inventa del lado del cálculo."""
    return [
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
    ]


__all__ = [
    "CLASES",
    "COEFICIENTES",
    "construir_poblacion",
    "edad_grupo",
    "evaluar_modelo_oficial",
    "extraer_anio",
    "familia_relacional",
    "grupos_relacionados",
]
