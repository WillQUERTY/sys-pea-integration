# scripts/pea_dashboard.py
# Dashboard de cumplimiento Parcial 2 EdD: histogramas y diagramas de barras
# a partir de pea_data.json. Genera imagenes PNG en docs/dashboard/.
#
# Metodo dataviz (skill dataviz):
#  - Forma: barras para comparar magnitud; una medida por grafico (sin ejes dobles)
#  - Color: paleta categórica validada (slots 1-5) para series de identidad;
#    tono unico (series-1) para la serie unica de tendencia por anno
#  - Direct labels encima de cada barra (alivia el contrast WARN del validador)
#  - Sin rainbow, sin ejes dobles, sin generar mas huesos de los necesarios

import json
import os
from collections import Counter

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

PALETTE = {
    1: "#2a78d6",   # azul  - categorical slot 1 (light)
    2: "#eb6834",   # naranja - categorical slot 2
    3: "#1baf7a",   # aqua   - categorical slot 3
    4: "#eda100",   # amarillo - categorical slot 4
    5: "#e87ba4",   # magenta - categorical slot 5
}

DATA_PATH = "pea_data.json"
OUT_DIR = "docs/dashboard"


def load_data(path=DATA_PATH):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save(fig, name):
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, name)
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  generado: {out}")


def style_axes(ax, title, ylabel):
    ax.set_title(title, fontsize=13, fontweight="bold", loc="left", color="#0b0b0b")
    ax.set_ylabel(ylabel, fontsize=10, color="#52514e")
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(axis="x", labelsize=9, labelrotation=0)
    ax.tick_params(axis="y", labelsize=9, colors="#52514e")
    ax.grid(axis="y", linestyle="--", alpha=0.3)
    ax.set_axisbelow(True)


def bar_labels(ax, bars, fmt="{:,.0f}"):
    """Etiquetas de valor directa encima de cada barra (secondary encoding)."""
    for bar in bars:
        h = bar.get_height()
        ax.annotate(
            fmt.format(h),
            xy=(bar.get_x() + bar.get_width() / 2, h),
            xytext=(0, 3),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=9,
            color="#0b0b0b",
            fontweight="bold",
        )


def chart_products_by_family(d):
    """Barra: productos por familia (identidad categorica, 5 slots)."""
    fam = Counter(p.get("family_id", 0) for p in d["products"])
    items = sorted(fam.items(), key=lambda kv: -kv[1])
    labels = [f"Familia {k}" for k, _ in items]
    values = [v for _, v in items]
    colors = [PALETTE[i + 1] for i in range(len(items))]

    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.bar(labels, values, color=colors, width=0.62)
    style_axes(ax, "Productos por familia (pea_data.json)", "Cantidad de productos")
    ax.set_ylim(0, max(values) * 1.18)
    bar_labels(ax, bars)
    save(fig, "productos_por_familia.png")


def chart_products_by_year(d):
    """Barra: productos por anio obtenido (serie unica, tono azul slot 1)."""
    years = Counter()
    for p in d["products"]:
        dte = p.get("obtained_date", "")
        if dte and len(dte) >= 4 and dte[:4].isdigit():
            years[int(dte[:4])] += 1
    items = sorted(years.items())
    labels = [str(y) for y, _ in items]
    values = [v for _, v in items]

    fig, ax = plt.subplots(figsize=(10, 4.5))
    bars = ax.bar(labels, values, color=PALETTE[1], width=0.72)
    style_axes(ax, "Productos por ano de obtencion (histograma)", "Cantidad de productos")
    ax.set_ylim(0, max(values) * 1.18)
    # Direct labels solo en las barras mas altas para no saturar (serie unica)
    top_n = max(1, len(values) // 4)
    threshold = sorted(values, reverse=True)[top_n - 1]
    for bar, v in zip(bars, values):
        if v >= threshold:
            h = bar.get_height()
            ax.annotate(
                f"{v:,.0f}",
                xy=(bar.get_x() + bar.get_width() / 2, h),
                xytext=(0, 3),
                textcoords="offset points",
                ha="center",
                va="bottom",
                fontsize=8,
                color="#0b0b0b",
                fontweight="bold",
            )
    save(fig, "productos_por_anio.png")


def chart_memberships_by_group(d):
    """Barra: membresias por grupo (2 grupos, slots 1 y 2)."""
    mem = Counter(m["groupId"] for m in d.get("memberships", []))
    items = sorted(mem.items())
    labels = [f"Grupo {g}" for g, _ in items]
    values = [v for _, v in items]
    colors = [PALETTE[1], PALETTE[2]]

    fig, ax = plt.subplots(figsize=(7, 4.5))
    bars = ax.bar(labels, values, color=colors, width=0.55)
    style_axes(ax, "Miembros por grupo (membresias)", "Cantidad de membresias")
    ax.set_ylim(0, max(values) * 1.22)
    bar_labels(ax, bars)
    save(fig, "membresias_por_grupo.png")


def chart_products_authors(d):
    """Barra: productos con autores vs sin autores (2 barras, comparacion de magnitud)."""
    prod_ids = set(p["id"] for p in d["products"])
    with_authors = set(a["productId"] for a in d.get("authors", []))
    n_with = len(prod_ids & with_authors)
    n_without = len(prod_ids) - n_with

    fig, ax = plt.subplots(figsize=(7, 4.5))
    bars = ax.bar(["Con autores", "Sin autores"], [n_with, n_without],
                  color=[PALETTE[3], PALETTE[5]], width=0.5)
    style_axes(ax, "Productos con y sin autores vinculados", "Cantidad de productos")
    ax.set_ylim(0, max(n_with, n_without) * 1.22)
    bar_labels(ax, bars)
    save(fig, "productos_con_sin_autores.png")


def main():
    print("Cargando", DATA_PATH)
    d = load_data()
    print("  grupos:", len(d.get("groups", [])),
          "| investigadores:", len(d.get("researchers", [])),
          "| productos:", len(d.get("products", [])),
          "| membresias:", len(d.get("memberships", [])))
    print("Generando graficos en", OUT_DIR)
    chart_products_by_family(d)
    chart_products_by_year(d)
    chart_memberships_by_group(d)
    chart_products_authors(d)
    print("Dashboard listo.")


if __name__ == "__main__":
    main()
