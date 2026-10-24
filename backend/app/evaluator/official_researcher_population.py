# backend/app/evaluator/official_researcher_population.py
"""
Adaptador del repositorio (RAM) al modelo INDIVIDUAL de producción
(adaptación declarada del modelo Minciencias 2024).

`official_researcher.py` es puro: recibe `InvestigadorOficial` y reusa el
pipeline del grupo (`official_indicator.evaluar_poblacion`). Este módulo hace
la traducción de lo que el backend tiene cargado —grupos, productos,
membresías y autores en RAM— a esas estructuras, y construye la POBLACIÓN
completa de investigadores para la normalización §3.9.

Las tres adaptaciones (unidad, período y Cohe/Coop de la red) están
declaradas en `official_researcher.ADAPTACIONES` y viajan en el payload:
el bloque se rotula SIEMPRE como "adaptación individual (NO oficial)" porque
el archivo normativo de 2024 no define un indicador de producción por
persona (ver el docstring de `official_researcher`).

Relación con el evaluador legacy: conviven. El legacy (`i_investigador` de
`metrics_collector.collect_researcher_metrics`) es una suma ponderada de
CONTEO CRUDOS sobre la fórmula del grupo; se conserva como insumo
descriptivo, rotulado "aproximación legacy, no oficial", mientras este
módulo entrega la lectura con escala del modelo.
"""

from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional

from .helpers import extract_year_from_date
from .official_indicator import (
    COEFICIENTES,
    ProductoOficial,
    cargar_catalogo,
)
from .official_population import (
    categoria_producto,
    descripcion_producto,
    extraer_anio,
    familia_relacional,
    mapa_membresias,
    resolver_autores,
    resolver_calidades,
)
from .official_researcher import (
    ADAPTACIONES,
    BASE_NORMATIVA,
    MODELO_INDIVIDUAL,
    SUPUESTOS,
    InvestigadorOficial,
    evaluar_poblacion_investigadores,
)


# --- Lectura del repositorio ----------------------------------------------------


def _detalle_membresia(repository_module: Any):
    """Callable (group_id, researcher_id) -> detalle de la membresía o None.

    La fachada real no expone `membership_details`; se llega al módulo nativo
    (`abpoxx_pybind`). El adaptador JSON del contrato expone la misma firma.
    Si no hay ninguna, las antigüedades quedan vacías y el modelo degrada a
    "antigüedad = 1 año" (supuesto documentado)."""
    fn = getattr(repository_module, "membership_details", None)
    if callable(fn):
        return fn

    try:
        import abpoxx_pybind  # import local: el evaluador no debe depender de él
    except Exception:
        return None

    return abpoxx_pybind.membership_details


def _inicio_membresia(detalle: Any) -> Optional[int]:
    """Año de inicio de una membresía ('YYYY-MM-DD' o 'YYYY'). None si no aplica."""
    if detalle is None:
        return None
    inicio = getattr(detalle, "start_date", None)
    if inicio is None and isinstance(detalle, dict):
        inicio = detalle.get("start_date")
    if not inicio:
        return None
    return extract_year_from_date(inicio)


def _membresia_inactiva(detalle: Any) -> bool:
    """True si la membresía está desactivada (soft delete)."""
    if detalle is None:
        return False
    estado = getattr(detalle, "status", None)
    if estado is None and isinstance(detalle, dict):
        estado = detalle.get("status")
    return str(estado or "active").lower() == "inactive"


def _primeras_vinculaciones(
    repository_module: Any,
    grupos_ram: List[Any],
    membresias: Dict[int, set],
) -> Dict[int, int]:
    """mapa investigador -> año de su PRIMERA vinculación (membresía vigente).

    Fuente preferida: `get_group_members_detailed` (una lectura por grupo).
    Respaldo: `membership_details(grupo, investigador)`. Si no hay ninguna de
    las dos, el mapa queda vacío y la antigüedad se aproxima con el primer
    producto del investigador."""
    inicio_por_investigador: Dict[int, int] = {}

    def _registrar(rid: Any, anio: Optional[int], detalle: Any = None) -> None:
        if anio is None or _membresia_inactiva(detalle):
            return
        rid = int(rid)
        actual = inicio_por_investigador.get(rid)
        if actual is None or anio < actual:
            inicio_por_investigador[rid] = anio

    detallado = getattr(repository_module, "get_group_members_detailed", None)
    if callable(detallado):
        for grupo in grupos_ram:
            try:
                filas = detallado(grupo.id) or []
            except Exception:
                continue
            for fila in filas:
                rid = fila.get("researcher_id")
                if not rid:
                    continue
                _registrar(rid, extract_year_from_date(fila.get("start_date")), fila)
        return inicio_por_investigador

    detalle_de = _detalle_membresia(repository_module)
    if detalle_de is None:
        return inicio_por_investigador

    for rid, grupos in membresias.items():
        for gid in sorted(grupos):
            try:
                detalle = detalle_de(gid, rid)
            except Exception:
                continue
            _registrar(rid, _inicio_membresia(detalle), detalle)
    return inicio_por_investigador


def productos_de_investigador(repository_module: Any, researcher_id: int) -> List[int]:
    """Productos del investigador: BD si está conectada, RAM si no.

    El adaptador JSON del contrato implementa `products_of_researcher`, así
    que el fallback a la RAM nativa solo se usa con la fachada real (que es
    la que tiene `_active_connection_string`)."""
    pids: List[int] = []
    getter = getattr(repository_module, "products_of_researcher", None)
    if callable(getter):
        try:
            pids = [int(pid) for pid in (getter(researcher_id) or [])]
        except Exception:
            pids = []
    if pids:
        return pids

    es_fachada = hasattr(repository_module, "_active_connection_string")
    if not es_fachada:
        return []  # adaptador de contrato: su respuesta es la válida
    if getattr(repository_module, "_active_connection_string", None):
        return []  # hay BD conectada: su respuesta (vacía) es la válida

    try:
        import abpoxx_pybind  # import local: el evaluador no debe depender de él

        return [
            int(pid) for pid in (abpoxx_pybind.products_of_researcher_ram(researcher_id) or [])
        ]
    except Exception:
        return []


# --- Construcción de la población de investigadores ------------------------------


def _identificacion(investigador: Any) -> str:
    """'Nombre Apellido (#id)' — el mismo formato que usa el grupo."""
    rid = int(getattr(investigador, "id", 0) or 0)
    nombres = " ".join(
        parte
        for parte in (
            str(getattr(investigador, "first_names", "") or "").strip(),
            str(getattr(investigador, "last_names", "") or "").strip(),
        )
        if parte
    )
    return f"{nombres} (#{rid})" if nombres else f"investigador #{rid}"


def construir_poblacion_investigadores(
    repository_module: Any,
    ano_cierre: int,
    catalogo: Optional[Dict[str, Any]] = None,
) -> List[InvestigadorOficial]:
    """Construye la población de investigadores del repositorio.

    Cada investigador queda con:
      - su antigüedad (años desde su primera vinculación; si no hay membresía
        con fecha, desde su primer producto),
      - sus productos clasificados con el catálogo 2024 (misma regla del
        grupo: la categoría de calidad validada manda y, sin ella, lo no
        verificable en la fuente se excluye con motivo),
      - los datos relacionales de SU RED: firmantes registrados del producto
        (Cohe) y grupos de la red (Coop).
    """
    catalogo = catalogo if catalogo is not None else cargar_catalogo()
    grupos_ram = list(repository_module.list_groups() or [])
    membresias = mapa_membresias(repository_module, grupos_ram)
    inicios = _primeras_vinculaciones(repository_module, grupos_ram, membresias)
    autores_de = resolver_autores(repository_module)
    codigo_de = resolver_calidades(repository_module)

    investigadores: List[InvestigadorOficial] = []
    for investigador in repository_module.list_researchers() or []:
        rid = int(getattr(investigador, "id", 0) or 0)
        if rid <= 0:
            continue

        grupos_propios = set(membresias.get(rid) or set())

        # Antigüedad: primera vinculación con fecha; si no hay, primer producto.
        anio_inicio = inicios.get(rid)

        productos: List[ProductoOficial] = []
        anios: List[int] = []
        for pid in productos_de_investigador(repository_module, rid):
            try:
                producto = repository_module.get_product(pid)
            except KeyError:
                continue  # enlace colgante: el producto no está en la RAM
            if producto is None:
                continue

            descripcion = descripcion_producto(producto)
            anio = extraer_anio(producto)
            if anio:
                anios.append(anio)

            categoria, motivo = categoria_producto(producto, descripcion, codigo_de, catalogo)

            firmantes: List[int] = []
            if autores_de is not None:
                try:
                    firmantes = [r for r in autores_de(pid) if r and r > 0]
                except Exception:
                    firmantes = []

            # Cohe individual: firmantes REGISTRADOS del producto, incluido el
            # propio investigador (0 = autoría sola, igual que en el grupo).
            autores_red = {int(r) for r in firmantes}
            autores_red.add(rid)
            n_autores = max(1, len(autores_red))

            # Coop individual: grupos donde está el investigador + los grupos
            # de sus coautores (0 = sin cooperación entre grupos).
            relacionados = set(grupos_propios)
            for autor in firmantes:
                relacionados |= set(membresias.get(int(autor)) or set())
            n_grupos = max(1, len(relacionados))

            productos.append(
                ProductoOficial(
                    identificacion=str(pid),
                    categoria=categoria,
                    motivo=motivo,
                    ano=anio,
                    autores_del_grupo=n_autores,
                    grupos_relacionados=n_grupos,
                    familia_medicion=(
                        familia_relacional(producto, descripcion) if categoria is None else None
                    ),
                )
            )

        if anio_inicio is None:
            anio_inicio = min(anios) if anios else None
        antiguedad = (
            max(1, ano_cierre - anio_inicio) if anio_inicio and anio_inicio <= ano_cierre else 1
        )

        investigadores.append(
            InvestigadorOficial(
                identificacion=_identificacion(investigador),
                antiguedad_anos=antiguedad,
                productos=productos,
                id_investigador=rid,
            )
        )

    return investigadores


# --- Payload -------------------------------------------------------------------


def evaluar_modelo_individual(
    repository_module: Any,
    researcher_id: int,
    ano_cierre: Optional[int] = None,
    catalogo: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Evalúa un investigador con la adaptación individual del modelo 2024.

    Devuelve un dict JSON-serializable con el desglose completo (índices §3.9,
    términos §3.10, clases frente al máximo de la población, subtipos que
    aportan, Cohe/Coop, exclusiones, adaptaciones y supuestos).
    """
    ano_cierre = ano_cierre or datetime.datetime.now().year
    catalogo = catalogo if catalogo is not None else cargar_catalogo()

    investigadores = construir_poblacion_investigadores(repository_module, ano_cierre, catalogo)
    if not investigadores:
        raise ValueError("El repositorio no tiene investigadores para medir")

    indice_objetivo = next(
        (i for i, inv in enumerate(investigadores) if inv.id_investigador == researcher_id),
        None,
    )
    if indice_objetivo is None:
        raise KeyError(f"Investigador {researcher_id} no está en la población medida")

    resultados = evaluar_poblacion_investigadores(investigadores, ano_cierre, catalogo)
    objetivo = resultados[indice_objetivo]

    ranking = sorted(
        zip(resultados, investigadores), key=lambda par: -par[0]["ind_investigador"]
    )
    total = len(resultados)
    puesto = next(
        i + 1 for i, (r, inv) in enumerate(ranking) if inv.id_investigador == researcher_id
    )

    subtipos = [
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
        for code, detalle in objetivo["subtipos"].items()
    ]
    subtipos.sort(key=lambda d: -d["termino"])

    return {
        "modelo": MODELO_INDIVIDUAL,
        "base_normativa": BASE_NORMATIVA,
        "anio_cierre": ano_cierre,
        "investigador": {
            "id": researcher_id,
            "identificacion": objetivo["investigador"],
            "antiguedad_anos": objetivo["antiguedad_anos"],
        },
        "ind_investigador": objetivo["ind_investigador"],
        "rango_teorico": sum(COEFICIENTES.values()),
        "posicion_poblacion": {
            "puesto": puesto,
            "de": total,
            "percentil": round(100.0 * (total - puesto + 1) / total, 1),
        },
        "poblacion": [
            {
                "id": inv.id_investigador,
                "investigador": r["investigador"],
                "ind_investigador": r["ind_investigador"],
            }
            for r, inv in ranking
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
        "adaptaciones": list(ADAPTACIONES),
        "supuestos": list(SUPUESTOS),
    }


__all__ = [
    "construir_poblacion_investigadores",
    "evaluar_modelo_individual",
    "productos_de_investigador",
]
