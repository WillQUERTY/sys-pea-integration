#!/usr/bin/env python3
"""
Generador del visor index.html 100% autónomo (offline y compatible con protocolo file://).
Incrusta el código Mermaid directamente en variables JavaScript para eliminar cualquier fetch()
y enlaza a los archivos PNG y SVG ya renderizados.
"""

import json
from pathlib import Path

DIAGRAMS_DIR = Path(__file__).resolve().parent

METADATA = [
    {
        "id": "01_casos_de_uso",
        "title": "01. Diagrama de Casos de Uso del Sistema",
        "subtitle": "Requisito Nota 2.a del Taller 2 — Interacciones entre actores y subsistemas",
        "category": "Modelado Estructural",
        "spec_sec": "§38.1",
        "desc": "Modela los límites del sistema PEA-i, los 5 actores clave (Administrador, Gestor de Investigación, Validador, Líder/Investigador, Público) y los casos de uso organizados en 6 subsistemas funcionales (Entidades en RAM, Multilista Ortogonal, Ingesta Scienti con Deduplicación, Flujo de Calidad FIFO, Control LIFO y Persistencia, Analítica e Hipercubo)."
    },
    {
        "id": "02_modelo_entidad_relacion",
        "title": "02. Modelo Entidad-Relación Relacional (16 Tablas)",
        "subtitle": "Complemento b: Base de Datos SQL Server (peai)",
        "category": "Modelado Estructural",
        "spec_sec": "§38.2",
        "desc": "Modelo relacional físico completo con 16 tablas normalizadas en SQL Server, reflejando el catálogo Minciencias 2024 (ProductFamily, ProductSubtype con las 70 tipologías canónicas, QualityCategory con pesos), vínculos ortogonales, cola de validación técnica, historial de operaciones de deshacer y tabla de auditoría inmutable."
    },
    {
        "id": "03_multilista_memoria_ram",
        "title": "03. Estructura de Memoria RAM — Multilista Ortogonal y Punteros C++",
        "subtitle": "Puntos 8 y 9: Estructura de Listas, Multilistas, Pilas y Colas en RAM",
        "category": "Modelado Estructural",
        "spec_sec": "§38.3.1",
        "desc": "Mapeo detallado de la memoria física del núcleo C++. Muestra cómo GroupNode conecta con listas subordinadas (membresías, productos, proyectos, planes), cómo MembershipNode y ProductAuthorNode forman cruces ortogonales bidireccionales, la Pila LIFO (UndoStack) y la Cola FIFO (ValidationQueue)."
    },
    {
        "id": "04_clases_cpp",
        "title": "04. Diagrama de Clases C++ y Servicios de Datos",
        "subtitle": "Diseño Orientado a Objetos del núcleo en C++20",
        "category": "Modelado Estructural",
        "spec_sec": "§38.3",
        "desc": "Estructuras de datos dinámicas (nodos), servicios gestores (GroupService, ProductService), estructuras especializadas (UndoStack, ValidationQueue) y adaptadores de persistencia (DBPersistence, JSONPersistence)."
    },
    {
        "id": "05_hipercubo_informacion",
        "title": "05. Hipercubo de Información Multidimensional",
        "subtitle": "Recomendación del Taller 2: Espacio Analítico H = D1 × D2 × D3 × D4",
        "category": "Modelado Estructural",
        "spec_sec": "§38.6",
        "desc": "Visualización conceptual del hipercubo de información con 4 dimensiones canónicas, 4 dimensiones secundarias del catálogo 2024, vector de medidas analíticas y las 5 operaciones OLAP de consulta (Slice, Dice, Drill-down, Roll-up y Pivot)."
    },
    {
        "id": "06_secuencia_creacion_escritura_dual",
        "title": "06. Secuencia: Creación Write-Through (RAM + BD)",
        "subtitle": "Flujo sincrónico de mutación con registro en Pila LIFO y SQL Server",
        "category": "Flujos de Interacción",
        "spec_sec": "§38.4.1",
        "desc": "Traza paso a paso la creación de una entidad desde la interfaz React, cruzando FastAPI y pybind11, instanciando nodos en RAM, apilando el snapshot inverso en UndoStack y persistiendo en SQL Server y AuditLog."
    },
    {
        "id": "07_secuencia_ingesta_scienti",
        "title": "07. Secuencia: Ingesta desde URL Scienti con Deduplicación",
        "subtitle": "Punto 7 y Decisión D-03: Scraping GrupLAC/CvLAC en vivo",
        "category": "Flujos de Interacción",
        "spec_sec": "§38.4.2",
        "desc": "Flujo de scraping idempotente: descarga HTML, parseo estructurado, previsualización para el gestor, generación de huellas deterministas / hashes de deduplicación, inserción transaccional en SQL Server y reconstrucción de la RAM."
    },
    {
        "id": "08_secuencia_membresias_reglas",
        "title": "08. Secuencia: Vinculación de Integrante y Reglas RV-001/RV-002",
        "subtitle": "Punto 3 y HU-02: Validación temporal estricta",
        "category": "Flujos de Interacción",
        "spec_sec": "§38.4.3",
        "desc": "Evaluación y aplicación de las reglas RV-001 (rechazo de fecha inicio posterior a fecha fin) y RV-002 (rechazo de periodos solapados en el mismo grupo y aceptación de reingresos discontinuos) con emisión de HTTP 400 o inserción ortogonal."
    },
    {
        "id": "09_secuencia_validacion_fifo",
        "title": "09. Secuencia: Flujo de Validación Técnica en Cola FIFO",
        "subtitle": "Punto 9 y 12: Encolamiento y dictamen de evidencias",
        "category": "Flujos de Interacción",
        "spec_sec": "§38.4.4",
        "desc": "Inspección y dictamen de productos en orden estricto de llegada (FIFO). La decisión técnica actualiza sincrónicamente el estado en RAM, aprueba el vínculo con el grupo en BD y registra la auditoría inmutable."
    },
    {
        "id": "10_secuencia_deshacer_lifo",
        "title": "10. Secuencia: Deshacer Última Operación en Pila LIFO",
        "subtitle": "Punto 9: Reversión de mutaciones sin recursión",
        "category": "Flujos de Interacción",
        "spec_sec": "§38.4.5",
        "desc": "Extracción de la operación en la cima de UndoStack (_topNode), deserialización del snapshot de reversión, mutación inversa simétrica en memoria RAM y base de datos, garantizando consistencia absoluta."
    },
    {
        "id": "11_arquitectura_despliegue",
        "title": "11. Diagrama de Arquitectura de Integración y Despliegue Físico",
        "subtitle": "Complemento d e Integración: Solución de Punta a Punta",
        "category": "Arquitectura Física",
        "spec_sec": "§38.5",
        "desc": "Topología física de los procesos: Navegador con SPA React, proceso Python 3.12 con FastAPI/Uvicorn, módulo nativo abpoxx_pybind.pyd comunicando con el núcleo C++20, y la persistencia dual en SQL Server y pea_data.json."
    }
]

def build_index_html():
    diagrams_dict = {}
    for item in METADATA:
        diag_id = item["id"]
        mmd_path = DIAGRAMS_DIR / f"{diag_id}.mmd"
        mmd_content = mmd_path.read_text(encoding="utf-8") if mmd_path.exists() else ""
        item_copy = dict(item)
        item_copy["code"] = mmd_content
        item_copy["png"] = f"./{diag_id}.png"
        item_copy["svg"] = f"./{diag_id}.svg"
        diagrams_dict[diag_id] = item_copy

    diagrams_json = json.dumps(diagrams_dict, ensure_ascii=False)

    html_template = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PEA-i — Galería Oficial de Diagramas del Sistema | UPC</title>
  <style>
    :root {{
      --primary: #1a365d;
      --primary-light: #2b6cb0;
      --accent: #319795;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #1e293b;
      --text-muted: #64748b;
      --border: #e2e8f0;
    }}
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      min-height: 100vh;
    }}
    /* Sidebar */
    .sidebar {{
      width: 320px;
      background: #0f172a;
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      border-right: 1px solid #1e293b;
    }}
    .brand {{
      padding: 24px 20px;
      border-bottom: 1px solid #1e293b;
      background: #020617;
    }}
    .brand h1 {{
      font-size: 1.2rem;
      font-weight: 700;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    .brand p {{
      font-size: 0.8rem;
      color: #94a3b8;
      margin-top: 6px;
      line-height: 1.4;
    }}
    .nav-list {{
      list-style: none;
      padding: 16px 12px;
      flex: 1;
    }}
    .nav-category {{
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      padding: 14px 10px 6px;
      font-weight: 700;
    }}
    .nav-item {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 12px;
      border-radius: 8px;
      color: #cbd5e1;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 3px;
      transition: all 0.15s ease;
      cursor: pointer;
    }}
    .nav-item:hover {{
      background: #1e293b;
      color: #fff;
    }}
    .nav-item.active {{
      background: var(--primary-light);
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }}
    .nav-item .sec-badge {{
      font-size: 0.7rem;
      opacity: 0.75;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }}
    /* Main Content */
    .main {{
      flex: 1;
      padding: 36px 40px;
      max-width: calc(100vw - 320px);
      overflow-y: auto;
    }}
    .header-bar {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border);
    }}
    .title-area h2 {{
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--primary);
    }}
    .title-area p {{
      color: var(--text-muted);
      margin-top: 4px;
      font-size: 0.95rem;
    }}
    .actions {{
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }}
    .btn {{
      padding: 8px 14px;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: #fff;
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      text-decoration: none;
    }}
    .btn:hover {{
      background: #f1f5f9;
      border-color: #cbd5e1;
    }}
    .btn-primary {{
      background: var(--primary-light);
      color: #fff;
      border-color: var(--primary-light);
    }}
    .btn-primary:hover {{
      background: var(--primary);
    }}
    .btn-success {{
      background: #0d9488;
      color: #fff;
      border-color: #0d9488;
    }}
    .btn-success:hover {{
      background: #0f766e;
    }}
    .description-box {{
      background: #f0f9ff;
      border-left: 4px solid var(--primary-light);
      padding: 14px 18px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 24px;
      font-size: 0.92rem;
      line-height: 1.55;
      color: #0369a1;
    }}
    /* View Switcher */
    .view-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }}
    .tab-group {{
      display: inline-flex;
      background: #e2e8f0;
      border-radius: 8px;
      padding: 3px;
    }}
    .tab-btn {{
      padding: 6px 14px;
      font-size: 0.82rem;
      font-weight: 600;
      border: none;
      background: transparent;
      color: #475569;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }}
    .tab-btn.active {{
      background: #fff;
      color: var(--primary);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }}
    /* Diagram Card */
    .diagram-card {{
      background: var(--card-bg);
      border-radius: 12px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      padding: 24px;
      margin-bottom: 32px;
      overflow-x: auto;
    }}
    .diagram-viewport {{
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 480px;
      background: #ffffff;
      padding: 20px;
      border-radius: 8px;
    }}
    .diagram-img {{
      max-width: 100%;
      height: auto;
      display: block;
      border-radius: 4px;
    }}
    .source-box {{
      background: #0f172a;
      color: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      overflow-x: auto;
      white-space: pre;
      display: none;
      position: relative;
    }}
    .copy-btn {{
      position: absolute;
      top: 14px;
      right: 14px;
      background: #334155;
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }}
    .copy-btn:hover {{
      background: #475569;
    }}
  </style>
</head>
<body>

  <aside class="sidebar">
    <div class="brand">
      <h1><span>🏛️</span> PEA-i Diagrams</h1>
      <p>Universidad Popular del Cesar<br>Estructura de Datos — Taller 2</p>
    </div>
    <ul class="nav-list" id="nav-list">
      <!-- Se inyecta dinámicamente -->
    </ul>
  </aside>

  <main class="main">
    <div class="header-bar">
      <div class="title-area">
        <h2 id="diag-title">Cargando...</h2>
        <p id="diag-subtitle"></p>
      </div>
      <div class="actions">
        <a id="btn-png" class="btn btn-primary" download>📷 Descargar PNG (Word)</a>
        <a id="btn-svg" class="btn btn-success" download>📐 Descargar SVG</a>
      </div>
    </div>

    <div class="description-box" id="diag-desc"></div>

    <div class="view-bar">
      <div class="tab-group">
        <button class="tab-btn active" id="tab-preview" onclick="switchView('preview')">🖼️ Diagrama Renderizado</button>
        <button class="tab-btn" id="tab-source" onclick="switchView('source')">📝 Código Fuente Mermaid</button>
      </div>
    </div>

    <div class="diagram-card">
      <div class="diagram-viewport" id="viewport">
        <img id="diagram-image" class="diagram-img" src="" alt="Diagrama PEA-i" />
      </div>
      <div class="source-box" id="source-box">
        <button class="copy-btn" onclick="copyCode()">📋 Copiar Código</button>
        <code id="code-content"></code>
      </div>
    </div>
  </main>

  <script>
    const diagrams = {diagrams_json};
    let currentId = '01_casos_de_uso';
    let currentView = 'preview';

    function buildNav() {{
      const nav = document.getElementById('nav-list');
      nav.innerHTML = '';
      let currentCategory = '';

      Object.values(diagrams).forEach(d => {{
        if (d.category !== currentCategory) {{
          currentCategory = d.category;
          const catEl = document.createElement('div');
          catEl.className = 'nav-category';
          catEl.textContent = currentCategory;
          nav.appendChild(catEl);
        }}
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'nav-item' + (d.id === currentId ? ' active' : '');
        a.onclick = () => selectDiagram(d.id);
        a.innerHTML = `<span>${{d.title.split('. ')[0]}}. ${{d.title.split('. ')[1].split(' (')[0]}}</span><span class="sec-badge">${{d.spec_sec}}</span>`;
        li.appendChild(a);
        nav.appendChild(li);
      }});
    }}

    function selectDiagram(id) {{
      currentId = id;
      const d = diagrams[id];
      if (!d) return;

      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(el => el.textContent.includes(d.spec_sec));
      if (activeNav) activeNav.classList.add('active');

      document.getElementById('diag-title').textContent = d.title;
      document.getElementById('diag-subtitle').textContent = d.subtitle;
      document.getElementById('diag-desc').textContent = d.desc;

      // Actualizar imagen renderizada (usa SVG por defecto para máxima nitidez)
      const img = document.getElementById('diagram-image');
      img.src = d.svg;

      // Actualizar enlaces de descarga directa
      const btnPng = document.getElementById('btn-png');
      btnPng.href = d.png;
      btnPng.setAttribute('download', d.id + '.png');

      const btnSvg = document.getElementById('btn-svg');
      btnSvg.href = d.svg;
      btnSvg.setAttribute('download', d.id + '.svg');

      // Actualizar caja de código
      document.getElementById('code-content').textContent = d.code;
    }}

    function switchView(view) {{
      currentView = view;
      const tabPreview = document.getElementById('tab-preview');
      const tabSource = document.getElementById('tab-source');
      const viewport = document.getElementById('viewport');
      const sourceBox = document.getElementById('source-box');

      if (view === 'preview') {{
        tabPreview.classList.add('active');
        tabSource.classList.remove('active');
        viewport.style.display = 'flex';
        sourceBox.style.display = 'none';
      }} else {{
        tabSource.classList.add('active');
        tabPreview.classList.remove('active');
        viewport.style.display = 'none';
        sourceBox.style.display = 'block';
      }}
    }}

    function copyCode() {{
      const code = diagrams[currentId]?.code || '';
      navigator.clipboard.writeText(code).then(() => {{
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '✅ ¡Copiado!';
        setTimeout(() => {{ btn.textContent = '📋 Copiar Código'; }}, 2000);
      }});
    }}

    window.addEventListener('DOMContentLoaded', () => {{
      buildNav();
      selectDiagram('01_casos_de_uso');
    }});
  </script>
</body>
</html>
"""
    output_path = DIAGRAMS_DIR / "index.html"
    output_path.write_text(html_template, encoding="utf-8")
    print(f"Visor HTML autónomo generado exitosamente en: {output_path}")

if __name__ == "__main__":
    build_index_html()
