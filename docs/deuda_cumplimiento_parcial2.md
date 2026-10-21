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
| `cumple` | 12 | R1, R2, R3, R4fuentes, R5, R6, R10, R14, R18, R19, R20, R22 |
| `parcial` | 9 | R4word, R7, R8, R9, R11, R13, R15, R16, R17, R23 |
| `no_cumple` | 2 | R12, R21 |

**Los gaps más críticos (funcionales, no formales):**
1. **R12 — I_Grupo no existe en backend.** El indicador del grupo solo vive en demos sueltos (`Taller2.cpp` / `Taller2.py`). No hay endpoint de grupo que lo devuelva, ni `pea_cli indicator group` lo calcula, ni pybind expone función de indicador.
2. **R13 — Fórmula desviada.** `I_Investigador` sí se computa, pero con `AP = ASC + DPC` y luego `1.5·AP + 0.5·DPC`, dando a DPC un peso efectivo de 2.0 en vez del 0.5 oficial (`docs/modelo-medicion-2024.md:7218-7225`).
3. **R23 — Carga de datos rota.** `pea_indicador.py` llama a `repository.load_json` que no existe; debería ser `load_from_file` (`context.py:44`).

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
| R7 | CRUD + desactivar + categoría + validación | `parcial` | `create/get/list/update/delete_product` (`product_service.cpp:33-101`); `family/subtype/quality_category_id` en `product.h:14-16`; `status="inactive"` en DB | `update_product` no valida `validation_status` (acepta cualquier string); membresía solo eliminación física (no desactivación); `product_author` sin update dedicado; delete en RAM es físico |
| R8 | Filtrar por año | `parcial` | `products by-year <start><end>\|last <N>` (`product_commands.cpp:121-167`); Python `filter_products` (`product_filters.py:15-49`) | `by-year` imprime conteos por año, no listado registro a registro |
| R9 | Editar cualquier dato | `parcial` | Servicios aceptan struct completo (`update_group:91-112`, `update_researcher:73-91`, `update_product:75-99`) | CLI edita solo subconjunto (products: título+año; researchers: nombres; groups: nombre); categoría/familia/estado solo por API REST; `validation_status` sin validación de valores |
| R10 | Resumen en C / tablas descriptivas | `cumple` | `print_summary()` (`group_service.cpp:378-418`); comando CLI `summary` (`pea_cli.cpp:35`) | Ninguna |
| R11 | Dashboard Python (histogramas / barras) | `parcial` | Dashboard web React+recharts; `ProductionHistogram` = BarChart por año (`production-histogram.tsx:1-197`); `FamiliesDonut`, `EducationDonut`, `TopSubtypesRanking` | R11 pide dashboard en **Python**; el implementado es web, no script Python con matplotlib/chart libs |
| R12 | Indicador del GRUPO (I_Grupo) | `no_cumple` | `Taller2.py:123-207` / `Taller2.cpp:175-237` calculan I_Grupo = 11.700 (demo standalone) | `i_grupo` no integrado punta a punta: `evaluate_group_minciencias` no retorna `i_grupo` (`__init__.py:12-59`); `collect_group_metrics` no aplica suma ponderada (`metrics_collector.py:21-203`); no hay endpoint de grupo que retorne `i_grupo`; `pea_cli indicator group` difiere a Python (`researcher_commands.cpp:166-177`); pybind no expone función de indicador; `load_json` inexistente en `pea_indicador.py:55` |
| R13 | Indicador del INVESTIGADOR (I_Investigador) | `parcial` | `i_investigador` retornado (`__init__.py:62-97:78`); endpoint `/researchers/{res_id}/indicator` (`researchers.py:139-149`); C++ calcula directamente (`researcher_commands.cpp:86-164`); Taller2.py = 8.400 | Desviación `AP = asc + dpc` luego `1.5·AP + 0.5·dpc` → DPC peso efectivo 2.0 vs 0.5 oficial (`metrics_collector.py:337-353`, `docs/modelo-medicion-2024.md:7218-7225`); `Cohe=0` hardcodeado; misma desviación en Taller2.py/cpp |
| R14 | 2 archivos de texto con respuestas | `cumple` | `Taller2.cpp` (Ejercicio 1 ll.161-237, Ejercicio 2 ll.243-316) y `Taller2.py` (ll.123-207, 214-298) con fórmula y ejecución real | Ambos usan datos embebidos en `main()`, no leen `pea_data.json` |
| R15 | Especificación Word + UML | `parcial` | `docs/word/Parcial2_WP-DN-EO.docx` existe (372250 bytes); diagramas UML en `docs/diagrams/` | Es el Word del Taller 2 renombrado (solo 1 línea distinta); `build_word_doc.py` lee spec md del Taller 2; falta documentación de `I_Grupo`/`I_Investigador` (pesos 3,7/2,3/0,4/1,5/0,5/1,0/0,2/0,1/0,3) en el cuerpo; 15 menciones residuales de "Taller 2" |
| R16 | Video YouTube ~10 min, UPC, estudiantes | `parcial` | Enlace vivo en `INTEGRANTENES.txt:37`; oEmbed HTTP 200 "PRESENTACION KHEMIA" | Duración ~10 min no verificable; identidad UPC y estudiantes visibles no auditables desde repo; guion de sustentación del Parcial 2 **borrado** (`docs/guion_de_sustentaci_n_en_video_taller_2_edd.*`, estado 'D') |
| R17 | Archivo identificación estudiantes | `parcial` | `INTEGRANTENES.txt` con 3 integrantes WP-DN-EO (ll.12-26) | Ll.38 apunta a `Taller2_WP-DN-EO.docx` (viejo) no a `Parcial2_WP-DN-EO.docx`; ll.41 referencia guion PDF borrado; no hay guion del Parcial 2; archivos fuente sin iniciales |
| R18 | Correo a adithperez@unicesar.edu.co | `cumple` | Borrador `docs/correo_entrega_parcial2.md`: destinatario ll.3, asunto ll.4 y 12, cuerpo ll.27-31 | Envío real no verificable; ll.28-29 menciona adjuntos `WPDE.cpp/WPDE.py` que **no existen** (solo `Taller2.cpp/py`) |
| R19 | Fechas 23/26 oct 11:59 am | `cumple` | `correo_entrega_parcial2.md:41-42` (preliminar 23 oct, definitiva 26 oct) | Solo declaradas en borrador; sin evidencia de envío anticipado |
| R20 | Subject byte-exacto | `cumple` | `INTEGRANTENES.txt:33` y `correo_entrega_parcial2.md:4,12`: "Estructura de datos Parcial 2 Grupo # 2026" | Solo resta usarlo en el envío real |
| R21 | Nombres de archivo con iniciales | `no_cumple` | Ningún fuente con iniciales WP/DN/EO (`Taller2.cpp`, `Taller2.py`, `pea_indicador.py` sin iniciales) | No existe `Taller2_WP-DN-EO.cpp/.py` ni similar; solo `INTEGRANTENES.txt` declara las iniciales |
| R22 | Archivo de persistencia | `cumple` | `pea_data.json` válido: 12 claves top-level, 8898 items (groups:2, researchers:166, memberships:179, products:1778, authors:2368, groupProductLinks:1896, projects:604, groupProjectLinks:125, workPlans:2, validationQueue:1778, undoOperations:0) | Ninguna |
| R23 | Cargar datos o ejecutar sin datos | `parcial` | `pea_indicador.py` acepta `--archivo/--grupo/--investigador` (ll.135-140), modo vacío (ll.153), default `pea_data.json` (ll.144-147) | `cargar_datos_json()` llama a `repository.load_json` que **no existe** (debería ser `load_from_file`, `context.py:44`); carga de `pea_data.json` es camino muerto |

---

## 3. Detalle por requisito con acciones recomendadas

### R12 — Indicador del GRUPO (I_Grupo) — no_cumple — CRÍTICO

**Estado:** El indicador del grupo no existe en ninguna capa backend integrada.

**Evidencia:**
- `backend/app/evaluator/__init__.py:12-59` — `evaluate_group_minciencias` devuelve `group_id`, `group_name`, `current_classification`, `max_qualified_tier`, etc. Nunca una clave `i_grupo`.
- `backend/app/evaluator/metrics_collector.py:21-203` — `collect_group_metrics` solo agrega contadores (`top_count`, `type_a_count`, `asc_count`, `dpc_count`, `cohesion_index/icoh` en l.192) pero nunca aplica la suma ponderada; el dict de retorno (l.177-203) no contiene `i_grupo`.
- `backend/app/api/routers/groups.py:183-191` — endpoint `/groups/{group_id}/minciencias-diagnosis` solo retorna diagnóstico de tiers, no `i_grupo`.
- `core_cpp/src/cli/researcher_commands.cpp:166-177` — `pea_cli indicator group` imprime "Usar el backend Python para el indicador completo de grupo (I_Grupo)" y difiere totalmente a Python; no calcula `I_Grupo` en C++.
- `core_cpp/pybind/bindings.cpp` — no expone ninguna función de indicador (grep de `i_grupo` solo da hits en `Taller2.py`/`Taller2.cpp`).
- `scripts/pea_indicador.py:62-86` — imprime el resumen del grupo pero nunca imprime `i_grupo` (l.76 imprime `max_qualified_tier` como "Tier alcanzado").

**Acción recomendada:**
1. Implementar `collect_group_metrics` con la suma ponderada completa: `3.7·Top + 2.3·A + 0.4·B + 1.5·AP + 0.5·DPC + 1.0·Fr.A + 0.2·Fr.B + 0.1·Cohe + 0.3·Coop`.
2. Que `evaluate_group_minciencias` retorne `i_grupo` en el dict de salida.
3. Que el endpoint `/groups/{group_id}/minciencias-diagnosis` incluya `i_grupo`.
4. Que `pea_cli indicator group` calcule `I_Grupo` en C++ (no difiera a Python).
5. Opcional: exponer función de indicador en `core_cpp/pybind/bindings.cpp`.

### R13 — Indicador del INVESTIGADOR (I_Investigador) — parcial

**Estado:** Sí se computa y devuelve numéricamente, pero con fórmula desviada.

**Evidencia:**
- `backend/app/evaluator/__init__.py:62-97` — `evaluate_researcher_minciencias` retorna `i_investigador` en l.78.
- `backend/app/evaluator/metrics_collector.py:206-375` — aplica la suma ponderada en l.337-353, pero con `AP = asc_count + dpc_count` (l.338) y luego `+ 1.5 * AP + 0.5 * dpc_count` (l.346-347), equivalente a `1.5·asc + 2.0·dpc` en vez del oficial `1.5·asc + 0.5·dpc`.
- `backend/app/api/routers/researchers.py:139-149` — endpoint `/researchers/{res_id}/indicator` responde con `i_investigador`.
- `core_cpp/src/cli/researcher_commands.cpp:86-164` — calcula `I_Investigador` directamente en C++ (fórmula en l.146-150).
- `Taller2.py:214-298` / `Taller2.cpp:255-316` — replican la misma desviación (`AP=asc+dpc`, `cohe=0.0`).

**Acción recomendada:**
1. Corregir `metrics_collector.py:337-353`: `AP` debe ser solo `asc_count` (Apropiación Social del Conocimiento = ASC), separado de `DPC`. Fórmula: `1.5·asc + 0.5·dpc + ...`.
2. Corregir la misma desviación en `Taller2.py` y `Taller2.cpp`.
3. Verificar que `Cohe=0` sea intencional para el investigador (cohesión no aplica a individuo, aceptable per spec).

### R7 — CRUD producto + desactivar + categoría + validación — parcial

**Gaps:**
- `update_product` no valida `validation_status` (acepta cualquier string) — `core_cpp/src/services/product_service.cpp:75-99`.
- Membresía sin desactivación: `remove_member_from_group` elimina físicamente el nodo; `Membership.status` existe pero nunca se usa para desactivar — `group_service.cpp:257-292`.
- `product_author` sin update dedicado: `add_product_author` hace upsert implícito in-place pero no hay `update_product_author` exclusivo — `product_service.cpp:144-180`, remoción vía `remove_product_author_ram` (l.209-232).
- Delete en RAM es físico; soft delete solo en DB.

**Acción recomendada:**
1. Añadir validación de `validation_status` en `update_product` (valores permitidos).
2. Implementar desactivación de membresía vía `Membership.status = "inactive"` en lugar de solo eliminación física.
3. Añadir `update_product_author` dedicado.

### R8 — Filtrar por año — parcial

**Gap:** `by-year` en CLI imprime conteos por año (tabla año|Total), no listado registro a registro — `product_commands.cpp:138-165`.

**Acción recomendada:** Añadir comando CLI de listado de productos detalle filtrado por año.

### R9 — Editar cualquier dato — parcial

**Gap:** CLI edita subconjunto de campos: products update solo título y año (`product_commands.cpp:40-54`), researchers update solo first_names y last_names (`researcher_commands.cpp:47-61`), groups update solo name (`group_commands.cpp:46-59`). Categoría/familia/estado solo por API REST.

**Acción recomendada:** Extender comandos CLI de update para aceptar categoría, familia, estado y demás campos.

### R11 — Dashboard Python — parcial

**Gap:** El dashboard es React+recharts (web), no un script Python con histogramas/barras. `scripts/pea_indicador.py` computa indicadores, no es un dashboard con gráficos.

**Acción recomendada:** Crear script Python con matplotlib (u otra librería de gráficos) que genere histogramas y diagramas de barras a partir de `pea_data.json` o de las métricas del evaluador.

### R15 — Especificación Word + UML — parcial

**Gap:** El Word es básicamente el del Taller 2 renombrado (solo 1 línea distinta: subtítulo de portada). `build_word_doc.py` aún lee la spec md del Taller 2. Falta documentación de `I_Grupo`/`I_Investigador` (pesos 3,7/2,3/0,4/1,5/0,5/1,0/0,2/0,1/0,3) en el cuerpo. 15 menciones residuales de "Taller 2".

**Acción recomendada:**
1. Actualizar `build_word_doc.py` para leer una spec md del Parcial 2 (no del Taller 2).
2. Documentar `I_Grupo` e `I_Investigador` en el cuerpo del Word con los pesos oficiales.
3. Portada que diga PARCIAL 2 (no Taller 2).
4. Eliminar menciones residuales de "Taller 2".

### R16 — Video YouTube ~10 min, identidad UPC, estudiantes visibles — parcial

**Gap:** Enlace vivo (`INTEGRANTENES.txt:37`, oEmbed HTTP 200 "PRESENTACION KHEMIA"), pero:
- Duración ~10 min no verificable desde oEmbed.
- Identidad UPC y estudiantes visibles no auditables desde el repo.
- Guion de sustentación del Parcial 2 **borrado** (`docs/guion_de_sustentaci_n_en_video_taller_2_edd.pdf` y `.md`, estado 'D' en git).

**Acción recomendada (equipo externo):**
1. Crear guion de sustentación técnica del Parcial 2.
2. Documentar duración ~10 min del video, identidad UPC y visibilidad de estudiantes.
3. Enviar evidencia del video antes del 23 oct.

### R17 — Archivo identificación estudiantes — parcial

**Gaps:**
- `INTEGRANTENES.txt` ll.38 apunta a `Taller2_WP-DN-EO.docx` (viejo) no a `docs/word/Parcial2_WP-DN-EO.docx`.
- Ll.41 referencia guion PDF borrado.
- No hay archivo de guion del Parcial 2.

**Acción recomendada:**
1. Corregir ll.38 → `docs/word/Parcial2_WP-DN-EO.docx`.
2. Corregir o eliminar ll.41 (referencia a guion borrado); ideal: crear guion del Parcial 2.

### R18 — Correo a adithperez@unicesar.edu.co — cumple (borrador)

**Gap:** Envío real no verificable desde el repo. Ll.28-29 menciona adjuntos `WPDE.cpp/WPDE.py` que **no existen** (solo `Taller2.cpp` y `Taller2.py`).

**Acción recomendada:**
1. Corregir ll.28-29 para mencionar `Taller2.cpp` y `Taller2.py`.
2. Enviar el correo real con subject byte-exacto `"Estructura de datos Parcial 2 Grupo # 2026"`.
3. Dejar evidencia verificable del envío.

### R21 — Nombres de archivo con iniciales — no_cumple

**Gap:** Ningún archivo fuente lleva iniciales WP/DN/EO en el nombre (`Taller2.cpp`, `Taller2.py`, `pea_indicador.py` no las tienen). Búsqueda `**/*{WP,DN,EO}*` solo devolvió docs/word y zip, no archivos fuente de los ejercicios.

**Acción recomendada:** Crear `Taller2_WP-DN-EO.cpp` y `Taller2_WP-DN-EO.py` (o con iniciales individuales de cada integrante) para satisfacer este requisito formal.

### R23 — Cargar datos o ejecutar sin datos — parcial

**Gap:** `cargar_datos_json()` (ll.48-60) consulta `hasattr(repository, 'load_json')` en ll.55, pero `load_json` no existe; `bindings.cpp` expone `load_from_file` (ll.271), no `load_json`. La carga de `pea_data.json` es camino muerto.

**Acción recomendada:** Cambiar `load_json` por `load_from_file` en `scripts/pea_indicador.py:55`.

### R4word, R2, R3, R5, R6, R10, R14, R19, R20, R22 — cumplen

Estos requisitos están funcionalmente cubiertos. Algunos tienen observaciones menores (ej. puntaje no persistido por producto en R2/R3, CSV solo grupos en R5) que no bloquean el cumplimiento pero son mejora técnica.

---

## 4. Plan de acción priorizado

### Antes del 23 oct 2026, 11:59 a. m. (entrega preliminar)

| Prioridad | Req | Acción | Archivo |
|-----------|-----|--------|---------|
| 1 | R17 | Corregir `INTEGRANTENES.txt` ll.38 → `Parcial2_WP-DN-EO.docx`; ll.41 eliminar o reintegrar guion | `INTEGRANTENES.txt` |
| 2 | R18 | Corregir borrador de correo: reemplazar `WPDE.cpp/WPDE.py` por `Taller2.cpp/Taller2.py` | `docs/correo_entrega_parcial2.md` |
| 3 | R23 | Arreglar `load_json` → `load_from_file` en `pea_indicador.py` | `scripts/pea_indicador.py:55` |
| 4 | R21 | Crear archivos fuente con iniciales WP/DN/EO | `Taller2_WP-DN-EO.cpp`, `Taller2_WP-DN-EO.py` |
| 5 | R18 | Enviar correo real con subject byte-exacto; dejar evidencia | (externo) |
| 6 | R16 | Crear guion de sustentación del Parcial 2 (reemplazar el del Taller 2 borrado) | (externo) |

### Antes del 26 oct 2026, 11:59 a. m. (entrega definitiva)

| Prioridad | Req | Acción | Archivo |
|-----------|-----|--------|---------|
| 1 | R12 | Integrar `I_Grupo` en backend: `collect_group_metrics` con suma ponderada, endpoint de grupo, `pea_cli indicator group` real | `backend/app/evaluator/metrics_collector.py`, `__init__.py`, `routers/groups.py`, `cli/researcher_commands.cpp` |
| 2 | R13 | Corregir fórmula `AP = ASC` separado de `DPC` (pesos oficiales) | `backend/app/evaluator/metrics_collector.py:337-353`, `Taller2.py`, `Taller2.cpp` |
| 3 | R15 | Actualizar Word para Parcial 2: portada, cuerpo con indicadores, eliminar menciones "Taller 2" | `docs/word/build_word_doc.py`, `docs/word/Parcial2_WP-DN-EO.docx` |
| 4 | R7 | Validación `validation_status`, desactivación membresía, `update_product_author` | `core_cpp/src/services/product_service.cpp`, `group_service.cpp` |
| 5 | R8 | Listado registro a registro filtrado por año en CLI | `core_cpp/src/cli/product_commands.cpp` |
| 6 | R9 | CLI editar categoría/familia/estado | `core_cpp/src/cli/product_commands.cpp`, `researcher_commands.cpp`, `group_commands.cpp` |
| 7 | R11 | Dashboard Python con histogramas/barras | Nuevo script Python |
| 8 | R23 | Verificar que `pea_indicador.py` cargue `pea_data.json` realmente | `scripts/pea_indicador.py` |

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
