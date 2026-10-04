#!/usr/bin/env python3
"""
Renderizador ultrarrápido y robusto de diagramas Mermaid a PNG y SVG.
Inyecta mermaid.js directamente en la página para evitar restricciones de origen o red.
"""

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

def render_all():
    mermaid_js_file = DIAGRAMS_DIR / "mermaid.min.js"
    if not mermaid_js_file.exists():
        print(f"Error: {mermaid_js_file} no encontrado.")
        sys.exit(1)
        
    mermaid_js_code = mermaid_js_file.read_text(encoding="utf-8")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # device_scale_factor=2 produce imágenes de resolución retina (300 DPI aprox para Word)
        context = browser.new_context(device_scale_factor=2)
        page = context.new_page()

        # Página base limpia
        page.set_content("""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: inline-block;
    }
    #wrap {
      display: inline-block;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <div id="wrap"></div>
</body>
</html>
""")

        # Inyectar biblioteca mermaid en el contexto de la página
        page.add_script_tag(content=mermaid_js_code)
        page.evaluate("""() => {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            });
        }""")

        print(f"Iniciando renderizado de {len(DIAGRAMS)} diagramas...")

        for idx, name in enumerate(DIAGRAMS, 1):
            mmd_file = DIAGRAMS_DIR / f"{name}.mmd"
            png_file = DIAGRAMS_DIR / f"{name}.png"
            svg_file = DIAGRAMS_DIR / f"{name}.svg"

            if not mmd_file.exists():
                print(f"[{idx}/{len(DIAGRAMS)}] Omitido: {name}.mmd no existe.")
                continue

            mmd_code = mmd_file.read_text(encoding="utf-8")

            try:
                # Renderizar con la API de Mermaid en JavaScript
                render_result = page.evaluate("""async ([id, code]) => {
                    try {
                        const res = await mermaid.render(id, code);
                        return { ok: true, svg: res.svg };
                    } catch (e) {
                        return { ok: false, error: e.message || String(e) };
                    }
                }""", [f"diag_{idx}", mmd_code])

                if not render_result.get("ok"):
                    print(f"[{idx}/{len(DIAGRAMS)}] ERROR en {name}: {render_result.get('error')}")
                    continue

                svg_content = render_result["svg"]

                # Guardar SVG
                svg_file.write_text(svg_content, encoding="utf-8")

                # Insertar en DOM y capturar screenshot
                page.evaluate("""(svg) => {
                    const wrap = document.getElementById('wrap');
                    wrap.innerHTML = svg;
                }""", svg_content)

                wrap_el = page.query_selector("#wrap")
                wrap_el.screenshot(path=str(png_file))

                size_kb = png_file.stat().st_size / 1024
                print(f"[{idx}/{len(DIAGRAMS)}] OK: {name}.png ({size_kb:.1f} KB) y {name}.svg")

            except Exception as ex:
                print(f"[{idx}/{len(DIAGRAMS)}] Excepción en {name}: {ex}")

        browser.close()
        print("¡Todos los diagramas fueron procesados exitosamente!")

if __name__ == "__main__":
    render_all()
