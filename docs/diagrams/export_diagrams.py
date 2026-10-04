#!/usr/bin/env python3
"""
Script de renderizado y exportación automatizada de diagramas Mermaid a PNG (alta resolución) y SVG.
Utiliza Playwright y la copia local de mermaid.min.js para operar sin requerir conexión externa.
"""

import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

DIAGRAMS_DIR = Path(__file__).resolve().parent

DIAGRAMS = [
    "01_casos_de_uso",
    "02_modelo_entidad_relacion",
    "03_multilista_memoria_ram",
    "04_clases_cpp",
    "05_hipercubo_informacion",
    "06_secuencia_creacion_escritura_dual",
    "07_secuencia_ingesta_scienti",
    "08_secuencia_membresias_reglas",
    "09_secuencia_validacion_fifo",
    "10_secuencia_deshacer_lifo",
    "11_arquitectura_despliegue",
]

HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="{mermaid_js_url}"></script>
  <style>
    body {{
      margin: 0;
      padding: 30px;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: inline-block;
    }}
    #container {{
      display: inline-block;
    }}
  </style>
</head>
<body>
  <div id="container">
    <div id="target" class="mermaid">
{mermaid_code}
    </div>
  </div>
  <script>
    mermaid.initialize({{
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose'
    }});
  </script>
</body>
</html>
"""

def render_diagrams():
    mermaid_js_path = DIAGRAMS_DIR / "mermaid.min.js"
    if not mermaid_js_path.exists():
        print("ERROR: mermaid.min.js no encontrado en", mermaid_js_path)
        sys.exit(1)

    mermaid_js_url = mermaid_js_path.as_uri()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # device_scale_factor=2 para renderizado retina nítido en Word
        context = browser.new_context(device_scale_factor=2)
        page = context.new_page()

        print(f"=== Iniciando renderizado de {len(DIAGRAMS)} diagramas ===")

        for name in DIAGRAMS:
            mmd_file = DIAGRAMS_DIR / f"{name}.mmd"
            png_file = DIAGRAMS_DIR / f"{name}.png"
            svg_file = DIAGRAMS_DIR / f"{name}.svg"

            if not mmd_file.exists():
                print(f"[!] Omitiendo {name}: archivo .mmd no existe")
                continue

            mmd_code = mmd_file.read_text(encoding="utf-8")
            html_content = HTML_TEMPLATE.format(
                mermaid_js_url=mermaid_js_url,
                mermaid_code=mmd_code
            )

            # Cargar HTML en la página
            page.set_content(html_content, wait_until="networkidle")

            # Esperar a que el SVG esté renderizado
            try:
                page.wait_for_selector("#container svg", timeout=10000)
            except Exception as e:
                print(f"[ERROR] Falló renderizado de {name}: {e}")
                continue

            # Obtener el elemento SVG
            svg_handle = page.query_selector("#container svg")
            if not svg_handle:
                print(f"[ERROR] No se encontró SVG para {name}")
                continue

            # Guardar SVG crudo
            svg_text = page.evaluate("el => el.outerHTML", svg_handle)
            svg_file.write_text(svg_text, encoding="utf-8")

            # Tomar screenshot del contenedor a tamaño exacto
            container_handle = page.query_selector("#container")
            container_handle.screenshot(path=str(png_file))

            png_size_kb = png_file.stat().st_size / 1024
            print(f"[OK] {name}.png ({png_size_kb:.1f} KB) y {name}.svg generados correctamente.")

        browser.close()
        print("=== Renderizado completado con éxito ===")

if __name__ == "__main__":
    render_diagrams()
