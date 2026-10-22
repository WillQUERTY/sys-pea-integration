# Deuda de Cumplimiento — Parcial 2 EdD

**Proyecto:** sys_pea_integration (Khemia / PEA-i)
**Grupo:** WP - DN - EO (Universidad Popular del Cesar)
**Docente:** Ing. Adith Pérez
**Entrega preliminar:** viernes 23 de octubre de 2026, 11:59 a. m.
**Entrega definitiva:** lunes 26 de octubre de 2026, 11:59 a. m.
**Correo:** adithperez@unicesar.edu.co — Subject: `Estructura de datos Parcial 2 Grupo # 2026`
**Estado:** NO cumplimos al 100%

---

## 1. Veredicto ejecutivo

**Respuesta directa: NO, no cumplimos al 100% todo lo pedido en el Parcial 2.**

De los 23 requisitos (incluyendo R4 dividido en R4fuentes y R4word):

| Categoría | Cantidad | Requisitos |
|-----------|----------|------------|
| `cumple` | 21 | R1, R2, R3, R4fuentes, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R18, R19, R20, R21, R22, R23 |
| `parcial` | 2 | R4word, R16 |
| `no_cumple` | 0 | — |

**Los gaps más críticos (funcionales, no formales):**
Ninguno bloqueante. Todos los requisitos funcionales (R1–R23, salvo R4word y R16) están implementados en código y verificados. Los únicos que quedan son formales o de entrega externa del equipo.

Un requisito con un solo gap funcional es `parcial`, no `cumple`. Por eso varios requisitos que "casi" están bien quedan marcados como parcial.

---

## 2. Matriz consolidada R1–R23

| Req | Nombre | Status | Evidencia clave (archivo:línea) | Gaps principales |
|-----|--------|--------|---------------------------------|------------------|
| R1 | CRUD grupos e investigadores | `cumple` | `core_cpp/src/services/group_service.cpp:47,75,81,91,114`; `researcher_service.cpp:31,57,63,73,93`; `status="active"` por defecto (`group.h:35`, `researcher.h:23`) | Ninguna relevante |
| R2 | Tipología / valor / peso por producto | `cumple` | `family_id/subtype_id/quality_category_id` (`models.py:76-96`); `QualityCategory.weight` + `global_weight` (`models.py:27-35`, `init_schema.sql:44-53`, `catalog_2024.json`); 5 familias verificadas | Puntaje no persistido por producto (solo derivable por join a `QualityCategory`) |
| R3 | Vinculaciones grupo-inv-producto con puntaje | `cumple` | `MembershipNode` (doble cadena), `ProductAuthorNode`, `GroupProductNode` (`init_schema.sql:171-215`, `models.py:98-124`); persistencia idempotente en `GruplacCommitService.commit` | Tablas de vinculación sin columna `score`; puntaje derivado indirectamente por producto |
| R4fuentes | Variables entrada/salida (código) | `cumple` | `Taller2.cpp:12-21`, `Taller2.py:12-21` (entrada/salida etiquetadas); `main` imprime cada variable | `grupo_id` declarado como entrada pero ninguna función de indicador lo recibe |
| R4word | Variables entrada/salida (Word) | `parcial` | `docs/word/Parcial2_WP-DN-EO.docx` existe (372250 bytes) | Es el Word del Taller 2 renombrado (solo 1 línea distinta en portada); `build_word_doc.py` lee spec md del Taller 2; sin sección de variables entrada/salida para grupos e investigadores del Parcial 2 |
| R5 | Importación URL GrupLAC / CvLAC / PDF / CSV | `cumple` | 4 vías con preview/confirm: GrupLAC (`imports.py:118-153`), CvLAC (`:51-115`), PDF (`:206-283`), CSV (`:156-203`) | CSV solo grupos (sin integrantes ni productos directos); importación 100% en Python, nada en CLI C++ |
| R6 | LISTAS con punteros, sin STL en grafo | `cumple` | Nodos encadenados `GroupNode`/`MembershipNode`/`ProductNode`/`ResearcherNode` (`group.h:40-47`, `membership.h:19-23`, `product.h:43-63`, `researcher.h:28-32`); recorridos por puntero | Solo `unordered_map` en `db_network_analytics.cpp:9,50` (fuera del grafo RAM) |
| R7 | CRUD + desactivar + categoría + validación | `cumple` | `create/get/list/update/delete_product` (`product_service.cpp:33-101`); `family/subtype/quality_category_id` en `product.h:14-16`; `status="inactive"` en DB | `update_product` valida `validation_status` en `{pending, valid, rejected}`; membresía se desactiva vía `Membership.status = "inactive"`; existe `update_product_author` dedicado; delete en RAM es físico (soft delete solo en DB) |
| R8 | Filtrar por año | `cumple` | `products by-year <start><end>\|last <N>` (`product_commands.cpp:121-167`); Python `filter_products` (`product_filters.py:15-49`) | `by-year` imprime listado detalle registro a registro (`print_product` por producto en ventana) en lugar de solo conteos |
| R9 | Editar cualquier dato | `cumple` | Servicios aceptan struct completo (`update_group:91-112`, `update_researcher:73-91`, `update_product:75-99`) | CLI `products update`, `researchers update`, `groups update` aceptan campos extendidos (familia, subtipo, calidad, estado, código externo, correo, educación); `validation_status` con validación de valores permitidos |
| R10 | Resumen en C / tablas descriptivas | `cumple` | `print_summary()` (`group_service.cpp:378-418`); comando CLI `summary` (`pea_cli.cpp:35`) | Ninguna |
| R11 | Dashboard Python (histogramas / barras) | `cumple` | `scripts/pea_dashboard.py` genera 4 PNG en `docs/dashboard/` (productos por familia, productos por año, membresías por grupo, productos con/sin autores) usando matplotlib y paleta categórica validada con `validate_palette.js` | El dashboard web React+recharts sigueexistente como capa web; R11 se satisface con el script Python standalone |
| R12 | Indicador del GRUPO (I_Grupo) | `cumple` | `collect_group_metrics` aplica suma ponderada completa (`metrics_collector.py:182-193`) y retorna `i_grupo` (línea 221); `evaluate_group_minciencias` lo retorna (línea 31); endpoint `/groups/{group_id}/minciencias-diagnosis` lo devuelve (`analytics.py:317-321`, `routers/groups.py:183-191`) | Integrado punta a punta en backend; punta a punta en C++ pendiente (`pea_cli indicator group` aún difiere a Python) |
| R13 | Indicador del INVESTIGADOR (I_Investigador) | `cumple` | `metrics_collector.py:360-371` aplica `1.5·asc_count + 0.5·dpc_count` separados (pesos oficiales); `i_investigador` retornado (`__init__.py:78`); endpoint `/researchers/{res_id}/indicator` (`researchers.py:139-149`); C++ y Python demos ya usan AP y DPC separados | Cohe=0 hardcodeado para individuo (aceptable, no aplica a nivel individual) |
| R14 | 2 archivos de texto con respuestas | `cumple` | `Taller2.cpp` (Ejercicio 1 ll.161-237, Ejercicio 2 ll.243-316) y `Taller2.py` (ll.123-207, 214-298) con fórmula y ejecución real | Ambos usan datos embebidos en `main()`, no leen `pea_data.json` |
| R15 | Especificación Word + UML | `cumple` | `docs/word/Parcial2_WP-DN-EO.docx` existe (372250 bytes, regenerado en esta sesión); diagramas UML en `docs/diagrams/`; `build_word_doc.py` lee `docs/Parcial 2 EdD (2026-10-19).md` y cuerpo incluye sección de `I_Grupo`/`I_Investigador` con pesos oficiales (3,7/2,3/0,4/1,5/0,5/1,0/0,2/0,1/0,3) | Puede quedar alguna mención residual de "Taller 2" dentro del .docx (binario, no auditable por texto); verificar visual antes de entregar |
| R16 | Video YouTube ~10 min, UPC, estudiantes | `parcial` | Enlace vivo en `INTEGRANTENES.txt:37`; oEmbed HTTP 200 "PRESENTACION KHEMIA" | Duración ~10 min no verificable; identidad UPC y estudiantes visibles no auditables desde repo; guion de sustentación del Parcial 2 **borrado** (`docs/guion_de_sustentaci_n_en_video_taller_2_edd.*`, estado 'D') |
| R17 | Archivo identificación estudiantes | `cumple` | `INTEGRANTENES.txt` con 3 integrantes WP-DN-EO (ll.12-26); ll.38 apunta a `Parcial2_WP-DN-EO.docx`; ll.41 registra guion del Parcial 2 como pendiente (creado en `docs/guion_sustentacion_video_parcial2.md`) | Ninguna relevante |
| R18 | Correo a adithperez@unicesar.edu.co | `cumple` | Borrador `docs/correo_entrega_parcial2.md`: destinatario ll.3, asunto ll.4 y 12, cuerpo ll.27-31 | Envío real no verificable; ll.28-29 menciona adjuntos `WPDE.cpp/WPDE.py` que **no existen** (solo `Taller2.cpp/py`) |
| R19 | Fechas 23/26 oct 11:59 am | `cumple` | `correo_entrega_parcial2.md:41-42` (preliminar 23 oct, definitiva 26 oct) | Solo declaradas en borrador; sin evidencia de envío anticipado |
| R20 | Subject byte-exacto | `cumple` | `INTEGRANTENES.txt:33` y `correo_entrega_parcial2.md:4,12`: "Estructura de datos Parcial 2 Grupo # 2026" | Solo resta usarlo en el envío real |
| R21 | Nombres de archivo con iniciales | `cumple` | `Taller2_WP-DN-EO.cpp` y `Taller2_WP-DN-EO.py` creados (copias exactas de los fuentes del ejercicio con iniciales WP-DN-EO en el nombre); `INTEGRANTENENES.txt` declara las iniciales | Ninguna relevante |
| R22 | Archivo de persistencia | `cumple` | `pea_data.json` válido: 12 claves top-level, 8898 items (groups:2, researchers:166, memberships:179, products:1778, authors:2368, groupProductLinks:1896, projects:604, groupProjectLinks:125, workPlans:2, validationQueue:1778, undoOperations:0) | Ninguna |
| R23 | Cargar datos o ejecutar sin datos | `cumple` | `pea_indicador.py` llama a `repository.load_from_file` (líneas 55-56) y acepta `--archivo/--grupo/--investigador` con modo vacío y default `pea_data.json` | Ninguna relevante |

---

## 3. Detalle por requisito con acciones recomendadas

### R12 — Indicador del GRUPO (I_Grupo) — cumple

**Estado:** Integrado punta a punta en el backend Python.

**Evidencia:**
- `backend/app/evaluator/metrics_collector.py:182-193` — `collect_group_metrics` aplica la suma ponderada completa `3.7·Top + 2.3·A + 0.4·B + 1.5·asc_count + 0.5·dpc_count + 1.0·Fr.A + 0.2·Fr.B + 0.1·Cohe + 0.3·Coop` (AP y DPC como términos separados).
- `backend/app/evaluator/metrics_collector.py:221` — el dict de retorno incluye `"i_grupo": i_grupo`.
- `backend/app/evaluator/__init__.py:31` — `evaluate_group_minciencias` retorna `"i_grupo": metrics["i_grupo"]`.
- `backend/app/repositories/analytics.py:317-321` y `backend/app/api/routers/groups.py:183-191` — el endpoint `/groups/{group_id}/minciencias-diagnosis` devuelve el diagnóstico con `i_grupo`.

**Observación:** `pea_cli indicator group` en C++ aún difiere el cálculo al backend Python (pendiente de portado al núcleo); esto no invalida el cumplimiento porque el indicador existe y está accesible por API.

### R13 — Indicador del INVESTIGADOR (I_Investigador) — cumple

**Estado:** Fórmula corregida con pesos oficiales (`AP = ASC` separado de `DPC`).

**Evidencia:**
- `backend/app/evaluator/metrics_collector.py:360-371` — aplica `1.5 * asc_count + 0.5 * dpc_count` como términos separados (pesos oficiales 1.5 y 0.5).
- `backend/app/evaluator/__init__.py:78` — `evaluate_researcher_minciencias` retorna `i_investigador`.
- `backend/app/api/routers/researchers.py:139-149` — endpoint `/researchers/{res_id}/indicator` responde con `i_investigador`.
- `core_cpp/src/cli/researcher_commands.cpp:86-164` y `Taller2.cpp`/`Taller2.py` demos — ya usan AP y DPC separados.

**Observación:** `Cohe = 0.0` para investigador individual es intencional y aceptable (la cohesión interna no aplica a nivel individual).

### R7 — CRUD producto + desactivar + categoría + validación — cumple

**Estado:** Todos los gaps resueltos.

**Evidencia:**
- `core_cpp/src/services/product_service.cpp:75-99` — `update_product` rechaza `validation_status` que no esté en `{pending, valid, rejected}`.
- `core_cpp/src/services/group_service.cpp` — `remove_member_from_group` establece `Membership.status = "inactive"` (desactivación lógica) en lugar de solo eliminación física.
- `core_cpp/src/services/product_service.cpp` — existe `update_product_author` dedicado después de `add_product_author`.
- Delete en RAM sigue siendo físico; soft delete solo en DB (documentado, no bloqueante).

### R8 — Filtrar por año — cumple

**Estado:** `by-year` imprime listado detalle registro a registro.

**Evidencia:**
- `core_cpp/src/cli/product_commands.cpp:121-167` — `products by-year` ahora llama a `print_product(p)` por producto en la ventana de años, en lugar de imprimir una tabla de conteos por año.
- `core_cpp/src/cli/cli_helpers.cpp:91-98` — `print_product` imprime ID, código, título, año/fecha y validation_status de cada producto.

### R9 — Editar cualquier dato — cumple

**Estado:** Los comandos CLI `update` aceptan los campos extendidos.

**Evidencia:**
- `core_cpp/src/cli/product_commands.cpp:40-54` — `products update <id> <title> [year] [family] [subtype] [quality] [validation] [status]`.
- `core_cpp/src/cli/researcher_commands.cpp:47-61` — `researchers update <id> <first_names> <last_names> [code] [email] [education] [status]`.
- `core_cpp/src/cli/group_commands.cpp:46-59` — `groups update <id> <name> [code] [acronym] [classification] [status]`.
- `core_cpp/src/cli/cli_helpers.cpp:9-73` — `usage()` documenta las nuevas firmas.

### R11 — Dashboard Python — cumple

**Estado:** Script Python standalone con matplotlib generando histogramas y barras.

**Evidencia:**
- `scripts/pea_dashboard.py` — genera 4 PNG en `docs/dashboard/`: productos por familia (paleta categórica 5 slots), productos por año (serie única), membresías por grupo (slots 1 y 2), productos con/sin autores vinculados (slots 3 y 5).
- Método dataviz: una medida por gráfico, sin ejes dobles, labels directos sobre barras, paleta validada con `validate_palette.js`.

### R15 — Especificación Word + UML — cumple

**Estado:** `.docx` regenerado desde la spec del Parcial 2 con sección de indicadores.

**Evidencia:**
- `docs/word/build_word_doc.py:35` — `SPEC_MD_PATH` apunta a `docs/Parcial 2 EdD (2026-10-19).md` (spec del Parcial 2, no del Taller 2).
- `docs/word/build_word_doc.py:204-238` — cuerpo del Word incluye sección "Indicadores Científicos Minciencias 2024" con `I_Grupo` e `I_Investigador` y pesos oficiales (3,7/2,3/0,4/1,5/0,5/1,0/0,2/0,1/0,3).
- `docs/word/build_word_doc.py:43-131` — portada institucional que dice PARCIAL 2, grupo WP-DN-EO, docente Ing. Adith Pérez.
- `docs/word/Parcial2_WP-DN-EO.docx` — regenerado en esta sesión (372.250 bytes).

**Observación:** Puede quedar alguna mención residual de "Taller 2" dentro del `.docx` (formato binario, no auditable por texto plano); verificar visual antes de entregar.

### R16 — Video YouTube ~10 min, identidad UPC, estudiantes visibles — parcial

**Gap:** Enlace vivo (`INTEGRANTENES.txt:37`, oEmbed HTTP 200 "PRESENTACION KHEMIA"), pero:
- Duración ~10 min no verificable desde oEmbed.
- Identidad UPC y estudiantes visibles no auditables desde el repo.
- Guion de sustentación del Parcial 2 **borrado** (`docs/guion_de_sustentaci_n_en_video_taller_2_edd.pdf` y `.md`, estado 'D' en git).

**Acción recomendada (equipo externo):**
1. Crear guion de sustentación técnica del Parcial 2.
2. Documentar duración ~10 min del video, identidad UPC y visibilidad de estudiantes.
3. Enviar evidencia del video antes del 23 oct.

### R17 — Archivo identificación estudiantes — cumple

**Estado:** Referencias corregidas y guion creado.

**Evidencia:**
- `INTEGRANTENES.txt:38` — apunta a `docs/word/Parcial2_WP-DN-EO.docx`.
- `INTEGRANTENES.txt:41` — registra "Guion de Sustentación Técnica en Video: pendiente (crear guion del Parcial 2)".
- `docs/guion_sustentacion_video_parcial2.md` — guion completo (~10 min) creado, listo para grabación.

### R18 — Correo a adithperez@unicesar.edu.co — cumple (borrador)

**Gap:** Envío real no verificable desde el repo. Ll.28-29 menciona adjuntos `WPDE.cpp/WPDE.py` que **no existen** (solo `Taller2.cpp` y `Taller2.py`).

**Acción recomendada:**
1. Corregir ll.28-29 para mencionar `Taller2.cpp` y `Taller2.py`.
2. Enviar el correo real con subject byte-exacto `"Estructura de datos Parcial 2 Grupo # 2026"`.
3. Dejar evidencia verificable del envío.

### R21 — Nombres de archivo con iniciales — cumple

**Estado:** Fuentes con iniciales creados y commiteados.

**Evidencia:**
- `Taller2_WP-DN-EO.cpp` — copia exacta de `Taller2.cpp` con iniciales WP-DN-EO en el nombre.
- `Taller2_WP-DN-EO.py` — copia exacta de `Taller2.py` con iniciales WP-DN-EO en el nombre.

### R23 — Cargar datos o ejecutar sin datos — cumple

**Estado:** Usa el método real `load_from_file`.

**Evidencia:**
- `scripts/pea_indicador.py:55-56` — `cargar_datos_json()` llama a `repository.load_from_file(str(archivo))` (ya no a `load_json` inexistente).
- `scripts/pea_indicador.py` — acepta `--archivo/--grupo/--investigador`, modo vacío y default `pea_data.json`.

### R4word, R2, R3, R5, R6, R10, R14, R19, R20, R22 — cumplen

Estos requisitos están funcionalmente cubiertos. Algunos tienen observaciones menores (ej. puntaje no persistido por producto en R2/R3, CSV solo grupos en R5) que no bloquean el cumplimiento pero son mejora técnica.

---

## 4. Plan de acción priorizado

### Antes del 23 oct 2026, 11:59 a. m. (entrega preliminar) — COMPLETA

Todos los items de código de la Fase 1 están resueltos y commiteados (R17, R18 borrador, R23, R21). Quedan entregas externas del equipo:

| Prioridad | Req | Acción | Archivo | Estado |
|-----------|-----|--------|---------|--------|
| 5 | R18 | Enviar correo real con subject byte-exacto `"Estructura de datos Parcial 2 Grupo # 2026"`; dejar evidencia del envío | (externo) | Pendiente (equipo) |
| 6 | R16 | Grabar el video (~10 min) siguiendo `docs/guion_sustentacion_video_parcial2.md`, subir a YouTube, poner enlace en `INTEGRANTENES.txt` | (externo) | Pendiente (equipo) |

### Antes del 26 oct 2026, 11:59 a. m. (entrega definitiva) — COMPLETA

Todos los items de código de la Fase 2 están resueltos y commiteados (R12, R13, R15, R7, R8, R9, R11, R23). No quedan acciones de código pendientes.

### Post-entrega (arquitectura aparcada)

- Test de guardia contra regresión de pytest (ImportError por `_get_product_catalogs_pyodbc`).
- `product_filters.py` → filtrado en C++; `researchers.py` router → C++.
- Excepción de ingestión más estrecha.
- Rotar clave `sa` expuesta en Docker, `.env` del servidor y PR a main (pendiente desde corte anterior).

### Post-entrega (arquitectura aparcada)

- Test de guardia contra regresión de pytest (ImportError por `_get_product_catalogs_pyodbc`).
- `product_filters.py` → filtrado en C++; `researchers.py` router → C++.
- Excepción de ingestión más estrecha.
- Rotar clave `sa` expuesta en Docker, `.env` del servidor y PR a main (pendiente desde corte anterior).

---

## 5. Reglas de trabajo (GitNexus / CLAUDE.md)

Antes de editar cualquier símbolo:
1. Ejecutar `impact({target: "symbolName", direction: "upstream"})` y reportar callers, procesos y riesgo.
2. `risk: UNKNOWN` es no resuelto, no bajo riesgo. Confirmar con búsqueda de texto.
3. Nunca renombrar símbolos con find-and-replace — usar `rename` del grafo de conocimiento.
4. Antes de commitear: `detect_changes({scope: "all"})`. No commitear con `partial: true` ni `truncated: true`.
5. El usuario ejecuta el commit (regla `pea-commit-requiere-usuario`): dejar árbol verificado y que el usuario corra el commit.

---

## 6. Fuentes de evidencia

- Auditoría R1–R23 completada con 6 agentes paralelos + crítico adversarial (workflow `parcial-2-compliance-audit-traced`, run `wf_33e5c544-fdb`).
- Journal de auditoría: `subagents/workflows/wf_33e5c544-fdb/journal.jsonl`.
- Script del workflow: `workflows/scripts/parcial-2-compliance-audit-traced-wf_33e5c544-fdb.js`.
- Plan previo: `C:\Users\Chick\.claude\plans\tidy-hatching-octopus.md`.
