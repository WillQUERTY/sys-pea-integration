#!/usr/bin/env python3
"""
Generador del Documento Oficial Word (.docx) para la entrega del Parcial 2 de Estructura de Datos.
Universidad Popular del Cesar - Grupo Oficial: WP-DN-EO
Procesa la especificación técnica maestra completa (2.600+ líneas), incrusta imágenes retina
de los diagramas, aplica el formateador institucional de tablas de alta fidelidad,
cajas de callout y bloques de consola.
"""

import os
import re
import sys
from pathlib import Path
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

# Asegurar importación de módulos hermanos
DOCS_WORD_DIR = Path(__file__).resolve().parent
if str(DOCS_WORD_DIR) not in sys.path:
    sys.path.append(str(DOCS_WORD_DIR))

from doc_formatter import (
    COLOR_PRIMARY_HEX,
    COLOR_SECONDARY_HEX,
    COLOR_ACCENT_HEX,
    split_markdown_table_row,
    render_table_from_markdown,
    add_callout_box,
    add_code_block,
    apply_inline_formatting,
)

REPO_ROOT = DOCS_WORD_DIR.parent.parent
# Fuente ÚNICA del entregable Word: la especificación integral (2.700+ líneas).
# Es la que contiene los encabezados §38.x que anclan el mapeo de diagramas y
# la sección §46 con los indicadores; el EdD del Parcial 2 (5 KB) es solo el
# enunciado y no debe usarse como insumo del documento.
SPEC_MD_PATH = REPO_ROOT / "docs" / "PEA-i_Especificacion_Integral_Cumplimiento_Taller2.md"
DIAGRAMS_DIR = REPO_ROOT / "docs" / "diagrams"
WORD_OUTPUT_DIR = DOCS_WORD_DIR

# Iniciales oficiales
INITIALS = "WP-DN-EO"
DOCX_NAME = f"Parcial2_{INITIALS}.docx"

def create_cover_page(doc):
    """Genera la portada institucional de la Universidad Popular del Cesar."""
    for _ in range(2):
        doc.add_paragraph()

    # Institución
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_inst = p_inst.add_run("UNIVERSIDAD POPULAR DEL CESAR\n")
    run_inst.font.name = "Arial"
    run_inst.font.size = Pt(18)
    run_inst.font.bold = True
    run_inst.font.color.rgb = RGBColor(0x1A, 0x36, 0x5D)

    run_fac = p_inst.add_run("FACULTAD DE INGENIERÍAS Y TECNOLÓGICAS\nDEPARTAMENTO DE INGENIERÍA DE SISTEMAS\n")
    run_fac.font.name = "Arial"
    run_fac.font.size = Pt(13)
    run_fac.font.bold = True
    run_fac.font.color.rgb = RGBColor(0x0D, 0x94, 0x88)

    run_sub = p_inst.add_run("ASIGNATURA: ESTRUCTURA DE DATOS\n")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(12)
    run_sub.font.bold = True
    run_sub.font.color.rgb = RGBColor(0x4A, 0x55, 0x68)

    for _ in range(3):
        doc.add_paragraph()

    # Título del Proyecto
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run("PEA-i: PROGRAMA ESTADÍSTICO DE ANÁLISIS DE INVESTIGACIÓN\n")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(20)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(0x1A, 0x36, 0x5D)

    run_taller = p_title.add_run("DOCUMENTO MAESTRO DE ESPECIFICACIÓN TÉCNICA, ARQUITECTURA,\nMODELO DE DATOS Y CUMPLIMIENTO DEL PARCIAL 2\n")
    run_taller.font.name = "Arial"
    run_taller.font.size = Pt(12)
    run_taller.font.bold = True
    run_taller.font.color.rgb = RGBColor(0x2B, 0x6C, 0xB0)

    for _ in range(4):
        doc.add_paragraph()

    # Integrantes y Docente
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER

    run_doc_lbl = p_meta.add_run("DOCENTE:\n")
    run_doc_lbl.font.size = Pt(10)
    run_doc_lbl.font.bold = True
    run_doc_lbl.font.color.rgb = RGBColor(0x71, 0x80, 0x96)

    run_doc = p_meta.add_run("ING. ADITH PÉREZ\n\n")
    run_doc.font.size = Pt(12)
    run_doc.font.bold = True
    run_doc.font.color.rgb = RGBColor(0x1A, 0x20, 0x2C)

    run_int_lbl = p_meta.add_run("INTEGRANTES DEL GRUPO (INICIALES: WP - DN - EO):\n")
    run_int_lbl.font.size = Pt(10)
    run_int_lbl.font.bold = True
    run_int_lbl.font.color.rgb = RGBColor(0x71, 0x80, 0x96)

    run_int = p_meta.add_run(
        "WILLIAM ANDRÉS PEÑARANDA OÑATE (WP)\n"
        "DONALDO DAVID NORIEGA PALOMINO (DN)\n"
        "EDINSON JOSÉ OLIVERO ROJAS (EO)\n\n"
        "(Grupo Oficial Parcial 2 — 2026)\n"
    )
    run_int.font.size = Pt(11)
    run_int.font.bold = True
    run_int.font.color.rgb = RGBColor(0x0D, 0x94, 0x88)

    for _ in range(2):
        doc.add_paragraph()

    # Ciudad y Fecha
    p_foot = doc.add_paragraph()
    p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_foot = p_foot.add_run("VALLEDUPAR, CESAR, COLOMBIA\nOCTUBRE DE 2026")
    run_foot.font.name = "Arial"
    run_foot.font.size = Pt(11)
    run_foot.font.bold = True
    run_foot.font.color.rgb = RGBColor(0x4A, 0x55, 0x68)

    doc.add_page_break()

def setup_page_formatting(doc):
    """Configura márgenes estándar de 1 pulgada (2.54 cm)."""
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)

        # Encabezado
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("Universidad Popular del Cesar | PEA-i — Parcial 2 (Estructura de Datos)")
        hrun.font.name = "Calibri"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(0x71, 0x80, 0x96)

        # Pie de página
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        frun1 = fp.add_run(f"Grupo {INITIALS} — Especificación Técnica Integral")
        frun1.font.name = "Calibri"
        frun1.font.size = Pt(8.5)
        frun1.font.color.rgb = RGBColor(0x71, 0x80, 0x96)

def insert_diagram(doc, diagram_key, caption_text, figure_num):
    """Inserta una imagen de diagrama de alta resolución centrada y con caption formal."""
    png_path = DIAGRAMS_DIR / f"{diagram_key}.png"
    if not png_path.exists():
        print(f"Advertencia: No se encontró {png_path}")
        return

    # Párrafo para la imagen
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(12)
    p_img.paragraph_format.space_after = Pt(4)
    run_img = p_img.add_run()

    # Ajuste de ancho responsivo
    if "casos_de_uso" in diagram_key or "modelo_entidad" in diagram_key or "multilista" in diagram_key or "arquitectura" in diagram_key:
        run_img.add_picture(str(png_path), width=Inches(6.2))
    elif "hipercubo" in diagram_key or "clases_cpp" in diagram_key:
        run_img.add_picture(str(png_path), width=Inches(5.8))
    else:
        run_img.add_picture(str(png_path), width=Inches(5.5))

    # Párrafo del Pie de Figura (Caption)
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(14)

    run_lbl = p_cap.add_run(f"Figura {figure_num}: ")
    run_lbl.font.bold = True
    run_lbl.font.size = Pt(9.5)
    run_lbl.font.color.rgb = RGBColor(0x1A, 0x36, 0x5D)

    run_text = p_cap.add_run(caption_text)
    run_text.font.italic = True
    run_text.font.size = Pt(9.5)
    run_text.font.color.rgb = RGBColor(0x4A, 0x55, 0x68)

def parse_markdown_and_build_doc():
    """Parsea el documento maestro de especificación completo y ensambla el .docx oficial."""
    print("Iniciando lectura de especificación completa...")
    content = SPEC_MD_PATH.read_text(encoding="utf-8")

    # La documentación de los indicadores Minciencias 2024 (I_Grupo /
    # I_Investigador, variables de entrada y salida del modelo y alcance de la
    # medición) vive en la §46 de la especificación integral: la especificación
    # es la fuente ÚNICA del entregable y no debe duplicarse aquí.

    doc = docx.Document()
    setup_page_formatting(doc)
    create_cover_page(doc)

    lines = content.splitlines()
    figure_counter = 1

    # Mapeo de secciones a imágenes de diagramas
    diagram_mapping = [
        (re.compile(r'### 38\.1 Diagrama de casos de uso', re.IGNORECASE), "01_casos_de_uso", "Diagrama de Casos de Uso del Sistema PEA-i (5 Actores y 6 Subsistemas)"),
        (re.compile(r'### 38\.2 Diagrama entidad-relación', re.IGNORECASE), "02_modelo_entidad_relacion", "Modelo Entidad-Relación Físico (17 Tablas Principales en SQL Server con Catálogo 2024)"),
        (re.compile(r'### 38\.3 Diagrama de clases C\+\+', re.IGNORECASE), "04_clases_cpp", "Diagrama de Clases C++ y Servicios del Núcleo de Dominio"),
        (re.compile(r'### 38\.3\.1 Esquema gráfico de punteros', re.IGNORECASE), "03_multilista_memoria_ram", "Disposición en Memoria RAM de la Multilista Ortogonal y Punteros C++"),
        (re.compile(r'#### Secuencia 1: Creación de Producto', re.IGNORECASE), "06_secuencia_creacion_escritura_dual", "Secuencia: Creación Write-Through en RAM y SQL Server con Pila LIFO"),
        (re.compile(r'#### Secuencia 2: Ingesta desde URL Scienti', re.IGNORECASE), "07_secuencia_ingesta_scienti", "Secuencia: Ingesta desde URL Scienti GrupLAC con Deduplicación Canónica"),
        (re.compile(r'#### Secuencia 3: Vinculación de Integrante', re.IGNORECASE), "08_secuencia_membresias_reglas", "Secuencia: Vinculación de Integrante y Validación de Reglas RV-001 y RV-002"),
        (re.compile(r'#### Secuencia 4: Validación Técnica de Evidencias', re.IGNORECASE), "09_secuencia_validacion_fifo", "Secuencia: Validación Técnica de Productos en Cola FIFO y Auditoría"),
        (re.compile(r'#### Secuencia 5: Deshacer Operación en Pila LIFO', re.IGNORECASE), "10_secuencia_deshacer_lifo", "Secuencia: Deshacer Última Operación en Pila LIFO (Reversión Simétrica)"),
        (re.compile(r'### 38\.5 Diagrama de despliegue', re.IGNORECASE), "11_arquitectura_despliegue", "Diagrama de Arquitectura de Integración y Despliegue Físico de Procesos"),
        (re.compile(r'### 38\.6 Diagrama del Hipercubo', re.IGNORECASE), "05_hipercubo_informacion", "Hipercubo de Información Multidimensional (4D/12D) y Operaciones OLAP")
    ]

    current_diagram_to_insert = None

    i = 0
    total_lines = len(lines)
    while i < total_lines:
        line = lines[i]

        # 1. Detección de títulos de diagramas mapeados
        for pattern, diag_key, cap_text in diagram_mapping:
            if pattern.search(line):
                current_diagram_to_insert = (diag_key, cap_text)
                break

        # 2. Manejo de bloques de código (```)
        if line.startswith("```"):
            code_lang = line[3:].strip().lower()
            code_lines = []
            i += 1
            while i < total_lines and not lines[i].startswith("```"):
                code_lines.append(lines[i])
                i += 1
            if i < total_lines:
                i += 1  # Consumir el ``` de cierre

            # Si era un bloque mermaid con diagrama mapeado, insertar la imagen renderizada
            if code_lang == "mermaid" and current_diagram_to_insert:
                diag_key, cap_text = current_diagram_to_insert
                insert_diagram(doc, diag_key, cap_text, figure_counter)
                figure_counter += 1
                current_diagram_to_insert = None
            else:
                code_text = "\n".join(code_lines)
                if code_text.strip():
                    add_code_block(doc, code_text)
            continue

        # 3. Manejo de tablas Markdown (| Col 1 | Col 2 |)
        if line.strip().startswith("|") and line.strip().endswith("|"):
            table_lines = []
            while i < total_lines and lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
                table_lines.append(lines[i])
                i += 1

            clean_rows = []
            for row_str in table_lines:
                cells = split_markdown_table_row(row_str)
                # Omitir separadores tipo |---|---|
                if all(re.match(r'^:?-+:?$', c) for c in cells if c):
                    continue
                clean_rows.append(cells)

            if clean_rows:
                render_table_from_markdown(doc, clean_rows)
            continue

        # 4. Manejo de llamadas / notas (> ...)
        if line.startswith("> "):
            callout_lines = []
            while i < total_lines and lines[i].startswith("> "):
                callout_lines.append(lines[i][2:].strip())
                i += 1
            callout_text = " ".join(callout_lines)

            # Detectar si inicia con un título destacado como **Nota:** o **Estado:**
            title_match = re.match(r'^\*\*(.*?)\*\*:?\s*(.*)$', callout_text)
            if title_match:
                title_str = title_match.group(1).upper()
                body_str = title_match.group(2)
                add_callout_box(doc, body_str, title=title_str)
            else:
                add_callout_box(doc, callout_text, title="NOTA TÉCNICA INSTITUCIONAL")
            continue

        # 5. Encabezados Markdown (#, ##, ###, ####)
        if line.startswith("# "):
            heading_text = line[2:].strip()
            h = doc.add_heading(heading_text, level=1)
            h.paragraph_format.space_before = Pt(18)
            h.paragraph_format.space_after = Pt(6)
            for r in h.runs:
                r.font.name = "Arial"
                r.font.size = Pt(16)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x1A, 0x36, 0x5D)
            i += 1
            continue
        elif line.startswith("## "):
            heading_text = line[3:].strip()
            h = doc.add_heading(heading_text, level=2)
            h.paragraph_format.space_before = Pt(14)
            h.paragraph_format.space_after = Pt(4)
            for r in h.runs:
                r.font.name = "Arial"
                r.font.size = Pt(13.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x2B, 0x6C, 0xB0)
            i += 1
            continue
        elif line.startswith("### "):
            heading_text = line[4:].strip()
            h = doc.add_heading(heading_text, level=3)
            h.paragraph_format.space_before = Pt(10)
            h.paragraph_format.space_after = Pt(3)
            for r in h.runs:
                r.font.name = "Arial"
                r.font.size = Pt(11.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x0D, 0x94, 0x88)
            i += 1
            continue
        elif line.startswith("#### "):
            heading_text = line[5:].strip()
            h = doc.add_heading(heading_text, level=4)
            h.paragraph_format.space_before = Pt(8)
            h.paragraph_format.space_after = Pt(2)
            for r in h.runs:
                r.font.name = "Arial"
                r.font.size = Pt(10.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x2D, 0x37, 0x48)
            i += 1
            continue

        # 6. Listas con viñetas (- o *)
        if re.match(r'^\s*[-*]\s+', line):
            indent_level = (len(line) - len(line.lstrip())) // 2
            bullet_text = re.sub(r'^\s*[-*]\s+', '', line).strip()
            # Eliminar checkboxes ([x] o [ ])
            bullet_text = re.sub(r'^\[[ xX]\]\s*', '', bullet_text)
            p_b = doc.add_paragraph(style='List Bullet')
            p_b.paragraph_format.left_indent = Inches(0.25 * (indent_level + 1))
            p_b.paragraph_format.space_before = Pt(1)
            p_b.paragraph_format.space_after = Pt(2)
            apply_inline_formatting(p_b, bullet_text, default_color=RGBColor(0x2D, 0x37, 0x48), default_size=Pt(9.5))
            i += 1
            continue

        # 7. Listas numeradas (1. 2. etc.)
        if re.match(r'^\s*\d+\.\s+', line):
            num_text = re.sub(r'^\s*\d+\.\s+', '', line).strip()
            p_n = doc.add_paragraph(style='List Number')
            p_n.paragraph_format.space_before = Pt(1)
            p_n.paragraph_format.space_after = Pt(2)
            apply_inline_formatting(p_n, num_text, default_color=RGBColor(0x2D, 0x37, 0x48), default_size=Pt(9.5))
            i += 1
            continue

        # 8. Líneas horizontales separadoras (---)
        if re.match(r'^-{3,}$', line.strip()):
            i += 1
            continue

        # 9. Párrafos de texto regular
        stripped_line = line.strip()
        if stripped_line:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.line_spacing = 1.15
            apply_inline_formatting(p, stripped_line, default_color=RGBColor(0x1E, 0x29, 0x3B), default_size=Pt(10))

        i += 1

    # Guardar documento oficial
    WORD_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_file = WORD_OUTPUT_DIR / DOCX_NAME
    try:
        doc.save(str(out_file))
        saved_file = out_file
    except PermissionError:
        fallback_file = WORD_OUTPUT_DIR / f"{out_file.stem}_actualizado.docx"
        print(f"\n[AVISO] El archivo '{out_file.name}' está abierto en Microsoft Word u otro visor.")
        print(f"[AVISO] Para no perder los cambios, se guardó en: {fallback_file.name}")
        doc.save(str(fallback_file))
        saved_file = fallback_file

    size_mb = saved_file.stat().st_size / (1024 * 1024)
    print(f"\n=== Documento Word generado con éxito ===")
    print(f"Archivo oficial: {saved_file} ({size_mb:.2f} MB)")
    if saved_file != out_file:
        print(f"Sugerencia: Cierra '{out_file.name}' en Microsoft Word para sobrescribir directamente el archivo principal.")

if __name__ == "__main__":
    parse_markdown_and_build_doc()
