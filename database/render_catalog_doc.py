"""Regenera docs/modelo-2024/catalogo-tipologias.md desde database/catalog_2024.json.

Uso (desde la raíz del repo):
    python database/render_catalog_doc.py

El documento generado es la referencia legible del catálogo 2024 (para el
profesor y para verificación manual). No editar el .md a mano: corregir el
JSON y volver a correr este script.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / "database" / "catalog_2024.json"
OUT = ROOT / "docs" / "modelo-2024" / "catalogo-tipologias.md"


def fmt_w(value):
    """Peso con coma decimal (es-CO); '-' para null."""
    if value is None:
        return "-"
    text = ("%g" % value).replace(".", ",")
    return text


MAPPING_MD = """## Mapeo GrupLAC → catálogo 2024

Patrones de encabezado normalizados (sin tildes, minúsculas) tal como los usa
`SECTION_MAP` en `backend/app/scraper.py`. Destinos:

- **Directo**: la sección GrupLAC corresponde a una tipología 2024. El producto
  importa con `subtype_id` de esa tipología y `quality_category_id = NULL`
  (la calidad se asigna manualmente en la cola de validación).
- **Refinar por fila**: la sección mezcla tipologías; el subtipo se decide con
  datos de la fila (como ya hace "Trabajos dirigidos").
- **Sin clasificar**: la sección no tiene equivalente 2024 o es ambigua →
  `subtype_id = NULL` + `ImportRecord` con `action_taken='unclassified_subtype'`
  para reclasificación manual desde el detalle del producto.
- **Tentativo**: el encabezado exacto debe confirmarse contra un GrupLAC real
  en la Fase 6 (el patrón puede requerir ajuste).

| Encabezado GrupLAC (patrón) | Destino 2024 | Notas |
|---|---|---|
| `articulos` | ART (GNC) | Directo |
| `notas cientificas` | N (GNC) | Directo |
| `libros publicados` | LIB (GNC) | Directo |
| `capitulos` | CAP_LIB (GNC) | Directo |
| `patente` | PAT_INV (GNC) | Refinar por fila: tipo "modelo de utilidad" → MOD_UTIL |
| `nuevas variedades` | VV (GNC) | Directo |
| `nuevas razas` | NRA (GNC) | Tentativo |
| `poblaciones mejoradas` | PMR (GNC) | Tentativo |
| `obras o productos`, `produccion en arte` | AAD (GNC) | Las obras de creación van a GNC en 2024 (antes familia "arte") |
| `software` | SF (DTI) | Directo. **Software es DTI en 2024, no GNC** |
| `prototipo` | PI (DTI) | Directo |
| `planta piloto` | PP (DTI) | Separado de prototipos |
| `disenos industriales` | DI (DTI) | Directo |
| `esquemas de trazados` | ECI (DTI) | Directo |
| `productos nutraceuticos` | PN (DTI) | Directo |
| `signos distintivos` | SD (DTI) | Directo |
| `colecciones cientificas` | CC (DTI) | Tentativo |
| `nuevos registros` | NRC (DTI) | Tentativo |
| `secreto empresarial` | SE (DTI) | Tentativo (sección ausente del mapa viejo) |
| `empresas de base tecnologica` | EBT (DTI) | Directo |
| `empresas creativas` | ICC (DTI) | Tentativo |
| `innovaciones generadas` | IG (DTI) | Directo |
| `innovaciones en procesos` | IPP (DTI) | Directo |
| `regulaciones y normas` | RNL (DTI) | Directo |
| `protocolos de vigilancia epidemiologica` | PVE (DTI) | Nombre exacto del Anexo 1; confirmado contra la página real (Fase 6) |
| `reglamentos tecnicos` | RNL (DTI) | Los reglamentos amparan en RNL (2.2.2.3); confirmado Fase 6 |
| `guias de practica clinica` | RNPC (DTI) | Tentativo |
| `proyectos de ley` | RNPL (DTI) | Tentativo |
| `conceptos tecnicos` | CT (DTI) | Tentativo |
| `centro de ciencia` | TCCG (ASC) | Trabajo conjunto entre centros de ciencia y grupos de investigación (2.2.3.3.1.4); confirmado Fase 6 |
| `proceso de apropiacion social` | Sin clasificar | Ambiguo: 2024 lo divide en FIS/GPP/FCP/TCCG según el propósito |
| `consultorias` | CON_CT (DPC) | **2024 ubica las consultorías en DPC**, no en ASC |
| `informes de investigacion`, `informe final` | IFI (DPC) | Directo |
| `informes tecnicos` | INF (DPC) | Directo |
| `eventos` (científicos) | EC (DPC) | Directo |
| `redes de conocimiento` | RC (DPC) | Tentativo |
| `talleres de creacion` | TC (DPC) | Directo |
| `eventos artisticos` | ECA (DPC) | Los eventos artísticos van a DPC en 2024 (antes familia "arte") |
| `documentos de trabajo` | WP (DPC) | Directo |
| `secuencias geneticas` | NSG (DPC) | Tentativo |
| `ediciones` | ERL (DPC) | Directo |
| `contenido impreso` | PEE (DPC) | Directo |
| `publicaciones editoriales no especializadas` | PEE (DPC) | Nombre exacto del Anexo 1; confirmado contra la página real (Fase 6) |
| `contenido multimedia`, `contenido de audio`, `audiovisual`, `recursos graficos`, `contenido virtual`, `contenido digital` | PCD (DPC) | 2024 unifica estos formatos en "Producciones de contenido digital"; `contenido digital` cubre la sección "…- Sonoro" (confirmada Fase 6) |
| `estrategias de comunicacion`, `produccion de estrategias`, `estrategias y contenidos` | TRM (DPC) | Directo |
| `desarrollo web` | DW (DPC) | Directo |
| `libros de formacion` | LIB_FOR (DPC) | Directo |
| `boletines` | BOL (DPC) | Tentativo |
| `libros de divulgacion` | LIB_DIV (DPC) | Directo |
| `generacion de contenido` | GC (DPC) | Tentativo |
| `manuales y guias` | MAN_GUI (DPC) | Directo |
| `trabajos dirigidos`, `tesis` | TD / TM / TP (FRH) | Refinar por fila: doctorado → TD, maestría → TM, pregrado → TP |
| `asesorias al programa ondas` | APO (FRH) | Directo |
| `otros articulos` | Sin clasificar | Catch-all dudoso |
| `demas trabajos` | Sin clasificar | Catch-all dudoso |
| `otros libros` | Sin clasificar | Catch-all dudoso |
| `otra publicacion divulgativa` | Sin clasificar | Catch-all dudoso |
| `otros productos tecnologicos` | Sin clasificar | Catch-all dudoso |
| `curso de corta duracion`, `curso de doctorado`, `curso de maestria`, `curso especializado de extension` | Sin clasificar | Dictar cursos no es producto 2024 (AP cubre *crear* programas/cursos, no dictarlos) |
| `programa academico`, `otro programa academico` | Sin clasificar | Formación del investigador, no producto del grupo |
| `jurado`, `comites` | Sin clasificar | Actividades de evaluador: no son productos en el modelo 2024 |
| `actividades como evaluador` | Sin clasificar | Actividad del evaluador; confirmada Fase 6 |
| `comitas` | Sin clasificar | Mojibake de "comités" en el HTML de Scienti (doble encoding); confirmado Fase 6 |
| `participacion ciudadana` | Sin clasificar | "Espacios de participación ciudadana" no existe en el Anexo 1 de 2024 |
| `estrategias pedagogicas` | Sin clasificar | Sin equivalente 2024 como producto |
| `cartas mapas o similares` | Sin clasificar | Sin equivalente 2024 |
| `traducciones` | Sin clasificar | Sin equivalente 2024 |
| `monografias` (refinamiento de trabajos dirigidos) | Sin clasificar | Sin equivalente 2024 |
| `trabajos dirigidos de otro tipo` | Sin clasificar | Sin equivalente 2024 |
| Cualquier sección no listada | Sin clasificar | Se registra en `ImportJob.details` (fin del silencio); los banners de sección de GrupLAC no traen productos y no se reportan |
"""


def main():
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    lines = []
    add = lines.append

    add("# Catálogo de tipologías de productos — Modelo de Medición Minciencias 2024")
    add("")
    add("Fuente: *Modelo de Medición de Grupos de Investigación, Desarrollo Tecnológico o de "
        "Innovación y de Reconocimiento de Investigadores del SNCTI, Año 2024* "
        "(doc. M601PR04G01, versión 02; copia local en `docs/modelo-medicion-2024.md`).")
    add("")
    add("Generado automáticamente desde `database/catalog_2024.json` con "
        "`database/render_catalog_doc.py`. **No editar a mano.**")
    add("")
    add("## Cómo se leen los pesos")
    add("")
    add("- **Peso relativo** (Anexo 1, tablas I–XXI): valor de la categoría dentro de su tipología.")
    add("- **Peso global** (Tabla 6, §3.6): peso del producto de más alta calidad de la tipología "
        "(o el valor directo que la Tabla 6 asigna a esa categoría). `-` = no listado en Tabla 6.")
    add("- **Peso individual final** = peso global (Tabla 6) × peso relativo (Anexo 1). "
        "Ejemplos del propio documento: ART_A2 = 100 × 5,5 = 550; CAP_LIB_B = 60 × 8 = 480; "
        "PA1 = 500 × 10 = 5000.")
    add("- **Clase de medición** (§3.7): TOP, A, B (clases de visibilidad/impacto), ASC, DPC, "
        "FRH-A (formación doctoral) y FRH-B.")
    add("")

    families = catalog["families"]
    add("## Resumen")
    add("")
    add("| Familia | Tipologías | Categorías |")
    add("|---|---|---|")
    for fam in families:
        n_sub = len(fam["subtypes"])
        n_cat = sum(len(s["categories"]) for s in fam["subtypes"])
        add(f"| {fam['code']} — {fam['name']} | {n_sub} | {n_cat} |")
    total_sub = sum(len(f["subtypes"]) for f in families)
    total_cat = sum(len(s["categories"]) for f in families for s in f["subtypes"])
    add(f"| **Total** | **{total_sub}** | **{total_cat}** |")
    add("")

    for fam in families:
        add(f"## {fam['code']} — {fam['name']}")
        add("")
        for sub in fam["subtypes"]:
            add(f"### {sub['name']} (`{sub['code']}`, {sub['model_ref']})")
            add("")
            if sub.get("notes"):
                add(f"> **Nota:** {sub['notes']}")
                add("")
            add("| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |")
            add("|---|---|---|---|---|")
            for cat in sub["categories"]:
                flag = " ⚠️" if cat.get("needs_review") else ""
                label = cat["label"]
                add(f"| `{cat['code']}` | {label}{flag} | {cat['measurement_class'] or '-'} | "
                    f"{fmt_w(cat['weight'])} | {fmt_w(cat.get('global_weight'))} |")
            add("")

    pendientes = [
        (sub, cat)
        for sub in (s for fam in families for s in fam["subtypes"])
        for cat in sub["categories"]
        if cat.get("needs_review")
    ]
    if pendientes:
        add("## ⚠️ Valores pendientes de verificación contra el PDF original")
        add("")
        add("La conversión del PDF a markdown perdió comas decimales en algunas tablas. "
            "Estos valores se infirieron por consistencia de las series y **deben "
            "confirmarse contra el PDF oficial**:")
        add("")
        for sub, cat in pendientes:
            add(f"- `{cat['code']}` ({sub['name']}): sembrado como "
                f"**{fmt_w(cat['weight'])}**. {cat['notes']}")
    else:
        add("## Pesos verificados contra el PDF oficial")
        add("")
        add("Todos los pesos relativos (Anexo 1) están verificados contra la "
            "transcripción literal del PDF en `docs/catalogo_oficial_pesos_minciencias_2024.md` "
            "(páginas 131–169) y los pesos globales contra la Tabla 6. "
            "Nota: el PDF muestra `ART_OPEN_D`=10, `ART_D`=9, `LIB_C`=10 y `CAP_LIB_C`=10 "
            "**literalmente** (rompe la serie decreciente); se transcriben como fuente "
            "documental, sin normalizar.")
    add("")
    add("Para corregir un peso: editar `database/catalog_2024.json` y volver a correr "
        "`python database/seed_catalog_2024.py` (upsert idempotente) y este generador.")
    add("")
    add(MAPPING_MD)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    # Salida ASCII-safe (la consola es cp1252)
    print(f"OK: {OUT} ({len(lines)} lineas)")


if __name__ == "__main__":
    main()
