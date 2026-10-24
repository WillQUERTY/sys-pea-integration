# Guion de sostenibilidad técnica — Video Parcial 2 EdD

**Asignatura:** Estructura de Datos  
**Docente:** Ing. Adith Pérez  
**Grupo:** WP - DN - EO — Universidad Popular del Cesar  
**Integrantes:**  
- William Andrés Peñaranda Oñate (WP)  
- Donaldo David Noriega Palomino (DN)  
- Edinson José Olivero Rojas (EO)  

**Programa:** PEA-i / Khemia — Programa Estadístico de Análisis de Investigación  
**Duración estimada:** ~10 minutos  
**Estado:** Video **grabado y publicado**: https://www.youtube.com/watch?v=eezB3oZ3n2w (título "PRESENTACION KHEMIA", canal de William Peñaranda, público para revisión del docente). Duración real verificada: **21 min 23 s** — por encima de los ~10 minutos que pide el enunciado (NOTAS 6.i); ver `docs/deuda_cumplimiento_parcial2.md` (R16) antes de enviar. El guion se conserva como soporte de la sustentación y para una eventual reedición recortada.

---

## 1. Apertura y presentación (0:00 – 1:00)

**Visual:** Diapositiva de portada con logo UPC, nombre de la asignatura, título "PEA-i — Estructura de Datos, Parcial 2", lista de integrantes con iniciales WP-DN-EO, nombre del docente.

**Guion (locución):**

> Buenas tardes, profesor. Somos el grupo WP-DN-EO de la Universidad Popular del Cesar, programa de Ingeniería de Sistemas. Presentamos el Parcial 2 de Estructura de Datos: el programa **PEA-i**, Programa Estadístico de Análisis de Investigación, también conocido como Khemia. En los próximos diez minutos le mostramos la arquitectura, las estructuras de datos, los indicadores de producción científica Minciencias 2024 y la demostración funcional del sistema.

---

## 2. Objetivo del parcial y alcance (1:00 – 2:00)

**Visual:** Diapositiva con el enunciado resumido del Parcial 2 y los entregables: código fuentes C++/Python, dashboard, persistencia JSON, Word de especificación, video.

**Guion:**

> El objetivo del parcial es diseñar e implementar un sistema que modele grupos de investigación, investigadores, miembros, productos científicos y sus vinculaciones, usando exclusivamente estructuras de datos dinámicas con punteros — listas enlazadas y multilistas ortogonales — sin STL en el grafo del núcleo C++. Además, se deben calcular dos indicadores de producción científica según el Modelo de Medición Minciencias 2024, **§3.10 «Indicador del Grupo de Investigación, Desarrollo Tecnológico o de Innovación»** del Anexo 1 M601PR04G01 v02: **I_Grupo** e **I_Investigador**. El primero es el indicador oficial de grupo del modelo; el segundo lo entregamos como una adaptación declarada a nivel individual, como explicamos en el minuto 5.
>
> *Nota de numeración para quien lo presente:* el enunciado y los dos archivos de texto entregados citan esta fórmula como «sección 10.6», que es la numeración de una versión anterior del modelo; en la versión vigente (Anexo 1 de la Convocatoria 2024, código M601PR04G01, versión 02) el indicador del grupo es el **§3.10** y su cadena de cálculo es §2.2.9 (λ) → §3.6 (peso global = ancla × peso relativo) → §3.8 (índices por clase, cohesión y cooperación) → §3.9 (normalización contra la población) → §3.10 (fórmula del indicador).

---

## 3. Arquitectura general (2:00 – 3:00)

**Visual:** Diagrama de arquitectura (docs/diagrams/11_arquitectura_despliegue): núcleo C++ → pybind11 → FastAPI → SQL Server / pea_data.json → frontend React.

**Guion:**

> La arquitectura está dividida en capas. En el núcleo, un core en C++ maneja todas las estructuras de datos en memoria RAM: grupos, investigadores y productos como listas enlazadas, y las vinculaciones grupo-investigador-producto como multilistas ortogonales con punteros. Sobre ese núcleo, pybind11 expone los servicios a Python. FastAPI brinda la API REST, con persistencia en SQL Server y respaldo en pea_data.json (8.898 ítems en doce colecciones). El frontend es una aplicación React con dashboard, y existe un CLI en C++ para operaciones directas sobre las estructuras.

---

## 4. Estructuras de datos con punteros (3:00 – 4:30)

**Visual:** Diagrama de clases C++ y esquema de punteros en RAM (docs/diagrams/04_clases_cpp, 03_multilista_memoria_ram). Comandos del CLI: `structures groups`, `structures multilist <gid>`.

**Guion:**

> El núcleo C++ implementa, sin contenedores STL para el grafo:  
> - **Lista enlazada de grupos** (GroupNode) con puntero al siguiente.  
> - **Lista enlazada de investigadores** (ResearcherNode).  
> - **Lista enlazada de productos** (ProductNode).  
> - **Multilista ortogonal grupo → miembros → productos**: cada grupo apunta a sus membresías y productos; cada membresía enlaza un investigador a un grupo con rol y estado; cada producto puede vincularse a varios grupos.  
> - Todas las inserciones se hacen push (cabeza de lista) y los recorridos son estrictamente por puntero (`next`, `down`, `right`), demostrando manejo directo de memoria dinámica.  
> - Además hay una **cola FIFO** de validación de productos y una **pila LIFO** de operaciones deshacer, con push, pop, enqueue y dequeue.

---

## 5. Indicadores de producción científica (4:30 – 6:30)

**Visual:** Diapositiva con la fórmula I_Grupo / I_Investigador y la tabla de pesos.

**Guion:**

> Los indicadores de producción se calculan con la fórmula del Modelo de Medición Minciencias 2024 (sección 10.6 de nuestra investigación, que es el §3.10 del documento normativo):  
> I ≡ 3,7·Top + 2,3·A + 0,4·B + 1,5·AP + 0,5·DPC + 1,0·Fr.A + 0,2·Fr.B + 0,1·Cohe + 0,3·Coop  
>  
> Donde AP (apropiación social) y DPC (divulgación pública) son términos **separados**, cada uno con su propio peso.  
> - **I_Grupo** se calcula a nivel de grupo con todos los productos activos en ventana temporal (5, 7 u 10 años según tipología) e incluye el índice de cohesión interna.  
> - **I_Investigador** **no es un indicador oficial**: el modelo 2024 define un único indicador de producción y es de grupo. Lo que entregamos a nivel individual es una **adaptación declarada** —el mismo pipeline del grupo, con la antigüedad del investigador en el lugar de la edad del grupo— y el sistema la rotula como tal en todas partes, con sus adaptaciones y supuestos a la vista.  
>  
> La fórmula con los pesos está resuelta en los dos archivos de texto del parcial (`Taller2.cpp` y `Taller2.py`), que además tienen paridad exacta entre sí. El modelo completo del 2024 —con λ por subtipo, pesos globales por clase, normalización contra el máximo de la población y los nueve términos de §3.10— está implementado en el núcleo C++ y en Python, y la paridad se verifica campo por campo. La API expone las dos cosas por separado: para cada grupo, `modelo_oficial_2024` (el oficial de §3.10) junto a `i_grupo_legacy` (aproximación legacy, no oficial); y para cada investigador, `adaptacion_individual_2024` (adaptación declarada, no oficial) junto a `i_investigador_legacy`.

---

## 6. CRUD y operaciones (6:30 – 8:00)

**Visual:** Pantalla del CLI C++ ejecutando `products by-year last 5`, `products update`, `groups update`, `researchers update`.

**Guion:**

> El sistema ofrece CRUD completo para grupos, investigadores y productos, tanto por CLI en C++ como por API REST. Desde la línea de comandos se puede crear, leer, actualizar y eliminar cada entidad, aceptar campos extendidos (familia, subtipo, calidad, estado, código externo, correo institucional), filtrar productos por año con listado detalle registro a registro, vincular productos a grupos, encolar productos para validación y deshacer operaciones desde la pila LIFO. Las membresías se desactivan cambiando su estado a "inactive" en lugar de eliminarse físicamente, preservando el historial de vinculaciones.

---

## 7. Cumplimiento de requisitos R1–R23 (8:00 – 9:15)

**Visual:** Tabla resumida de requisitos con estado (cumple / parcial / no aplica) y archivo de evidencia.

**Guion:**

> De los veintitrés requisitos del parcial, la mayoría están cubiertos: CRUD de grupos e investigadores, tipología y peso por producto, vinculaciones con puntaje, listas con punteros sin STL, importación GrupLAC/CvLAC/PDF/CSV, resumen descriptivo, filtros por año, edición extendida desde el CLI, dashboard en Python con matplotlib, cuatro archivos de texto con respuestas, persistencia en pea_data.json y fechas de entrega. Los requisitos pendientes son formales o de entrega externa: el guion de este video y el envío del correo institucional al docente.

---

## 8. Demo en vivo del CLI (9:15 – 9:45)

**Visual:** Terminal ejecutando `pea_cli summary`, `pea_cli products by-year last 3`, `pea_cli groups list`, `pea_cli indicator group 1`.

**Guion:**

> Para cerrar, veamos el sistema en ejecución. El comando `summary` muestra las tablas descriptivas del estado. `products by-year last 3` lista detalle de productos de los últimos tres años, registro por registro, no solo conteos. `indicator group 1` devuelve el indicador oficial del grupo consultado, con su desglose: λ por subtipo, cada clase frente al máximo de la población, los nueve términos de §3.10 y el resultado normalizado. Todo esto corre sobre el núcleo C++ con estructuras de punteros que diseñamos.

---

## 9. Cierre y agradecimiento (9:45 – 10:00)

**Visual:** Diapositiva final con nombres, iniciales WP-DN-EO, correo del docente, enlace del repositorio GitHub y enlace del video.

**Guion:**

> Con esto concluimos la sustentación del Parcial 2 de Estructura de Datos. Gracias, profesor Adith Pérez, por su orientación. Quedamos atentos a sus observaciones.  
>  
> Grupo WP-DN-EO — Universidad Popular del Cesar — Octubre de 2026.

---

## Notas para la grabación

- Cada integrante debe aparecer y hablar frente a cámara al menos una vez (identidad UPC y estudiantes visibles).
- Mostrar el código en pantalla: `Taller2.cpp`, `Taller2.py`, `scripts/pea_dashboard.py`, `backend/app/evaluator/metrics_collector.py`.
- Abrir el dashboard de React y ejecutar el CLI en vivo.
- Subir el video a YouTube (enlace tipo youtu.be/...) y ponerlo en `INTEGRANTES.txt` junto al guion.
- Enviar el correo a adithperez@unicesar.edu.co con asunto exacto: `Estructura de datos Parcial 2 Grupo # 2026` y adjuntos: `Taller2.cpp`, `Taller2.py`, `docs/word/Parcial2_WP-DN-EO.docx`, `pea_data.json`, `INTEGRANTES.txt`.
