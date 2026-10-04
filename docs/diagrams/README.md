# PEA-i: Directorio Oficial de Diagramas del Sistema

Este directorio contiene los diagramas técnicos y de modelado formal requeridos para el Taller 2 de Estructura de Datos (Universidad Popular del Cesar) y el documento de entrega `ABPOXX.docx`.

## Contenido del directorio

| Archivo | Formato | Tipo de Diagrama | Sección en Especificación |
|---|---|---|---|
| `01_casos_de_uso.mmd` | Mermaid | Diagrama de Casos de Uso del Sistema | §38.1 |
| `02_modelo_entidad_relacion.mmd` | Mermaid | Modelo Entidad-Relación (16 Tablas SQL Server) | §38.2 |
| `03_multilista_memoria_ram.mmd` | Mermaid | Estructura de Multilista Ortogonal y Nodos RAM | §38.3 (Memoria) |
| `04_clases_cpp.mmd` | Mermaid | Diagrama de Clases y Servicios C++ | §38.3 (POO) |
| `05_hipercubo_informacion.mmd` | Mermaid | Hipercubo Multidimensional y Operaciones OLAP | §4 y §29 |
| `06_secuencia_creacion_escritura_dual.mmd` | Mermaid | Secuencia: Creación Write-Through (RAM + BD) | §38.4.1 |
| `07_secuencia_ingesta_scienti.mmd` | Mermaid | Secuencia: Ingesta Scienti y Deduplicación | §38.4.2 |
| `08_secuencia_membresias_reglas.mmd` | Mermaid | Secuencia: Membresías y Reglas RV-001/RV-002 | §38.4.3 |
| `09_secuencia_validacion_fifo.mmd` | Mermaid | Secuencia: Procesamiento FIFO en Cola de Validación | §38.4.4 |
| `10_secuencia_deshacer_lifo.mmd` | Mermaid | Secuencia: Deshacer LIFO en Pila de Operaciones | §38.4.5 |
| `11_arquitectura_despliegue.mmd` | Mermaid | Arquitectura de Integración y Despliegue Físico | §38.5 |
| `index.html` | HTML5 / JS | Visor Interactivo con Renderizado en Vivo (Mermaid.js) | Galería visual |
| `export_diagrams.py` | Python (Playwright) | Script para exportar todos los diagramas a PNG alta resolución | Generador de imágenes |
