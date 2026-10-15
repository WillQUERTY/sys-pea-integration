import csv
import io
from datetime import datetime

from .. import repository


def export_group_ranking_csv(group_id: int) -> str:
    """
    Exporta el ranking de investigadores del grupo en CSV delimitado por punto y coma (;)
    con codificación UTF-8 BOM para apertura nativa y directa en Microsoft Excel en español.
    """
    stats = repository.get_group_stats(group_id)
    top_res = stats.get("top_researchers", [])

    out = io.StringIO()
    out.write("\ufeff")
    writer = csv.writer(out, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    writer.writerow([
        "Posición",
        "Investigador",
        "Nivel Académico",
        "ORCID",
        "Productos en Grupo",
        "Porcentaje Aporte Grupo (%)",
        "Total Obras del Autor"
    ])

    for idx, r in enumerate(top_res, 1):
        writer.writerow([
            idx,
            r.get("name", ""),
            r.get("highest_education", ""),
            r.get("orcid", ""),
            r.get("products_count", 0),
            f"{r.get('percentage_of_group', 0):.1f}",
            r.get("total_authored_count", 0),
        ])
    return out.getvalue()


def export_group_products_csv(group_id: int, start_year=None, end_year=None,
                              window_years=None) -> str:
    """
    Exporta el inventario de productos científicos del grupo en CSV delimitado por punto y coma (;)
    con codificación UTF-8 BOM, admitiendo filtros temporales por ventana de observación.
    """
    cur_year = datetime.now().year
    eff_start, eff_end = start_year, end_year
    if window_years is not None and window_years > 0:
        eff_start, eff_end = cur_year - window_years, cur_year
    if eff_start is not None and eff_end is not None and eff_start > eff_end:
        eff_start, eff_end = eff_end, eff_start

    catalogs = repository.get_product_catalogs()
    fam_map = {f["id"]: f["name"] for f in catalogs.get("families", [])}
    sub_map = {s["id"]: s["name"] for s in catalogs.get("subtypes", [])}

    prods = repository.filter_products(group_id=group_id, start_year=eff_start, end_year=eff_end)

    out = io.StringIO()
    out.write("\ufeff")
    writer = csv.writer(out, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    writer.writerow([
        "ID",
        "Código Externo",
        "Título del Producto",
        "Familia Minciencias",
        "Subtipo Minciencias",
        "Año",
        "DOI",
        "Estado Validación",
        "Aval Institucional",
        "Autores"
    ])

    for p in prods:
        fam_name = fam_map.get(p.family_id, "")
        sub_name = sub_map.get(p.subtype_id, "")
        endorsed = "SÍ" if getattr(p, "is_endorsed", False) else "NO"

        try:
            autores = repository.get_product_authors(p.id)
            nombres = [(a.get("researcher_name") or a.get("external_author_name") or "").strip() for a in autores]
            autores_str = ", ".join([n for n in nombres if n])
        except Exception:
            autores_str = ""

        writer.writerow([
            p.id,
            p.external_code or "",
            p.title or "",
            fam_name,
            sub_name,
            p.year or "",
            p.doi or "",
            p.validation_status or "",
            endorsed,
            autores_str,
        ])

    return out.getvalue()
