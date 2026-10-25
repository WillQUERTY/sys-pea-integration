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

**Respuesta directa: NO, todavía no cumplimos al 100% todo lo pedido en el Parcial 2, pero los dos huecos que quedan son de entrega externa del equipo, no de código.**

De los 24 requisitos (R1–R23, con R4 dividido en R4fuentes y R4word):

| Categoría | Cantidad | Requisitos |
|-----------|----------|------------|
| `cumple` | 22 | R1, R2, R3, R4fuentes, R4word, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R18, R19, R20, R21, R22, R23 |
| `parcial` | 1 | R16 |
| `no_cumple` | 0 | — |

**Los gaps más críticos (funcionales, no formales):**
Ninguno bloqueante: los 24 requisitos están implementados en código y verificados, y los dos `parcial` son de entrega externa del equipo (R16: duración del video —21:23 frente a los ~10 min de la NOTA 6.i—; R17: archivo de identificación completo con nombres e iniciales, el enunciado no pide código ni correo).

Un requisito con un solo gap funcional es `parcial`, no `cumple`. Por eso varios requisitos que "casi" están bien quedan marcados como parcial.

**Cambios de esta sesión (2026-10-24):** R4word pasó de `parcial` a `cumple` (la §46 de la especificación integral documenta las variables de entrada y salida de grupo e investigador, y el Word se regenera desde ella); R16 y R17 se acotaron a un único hueco cada uno, ambos verificables y resolubles el lunes.

---

## 2. Matriz consolidada R1–R23

| Req | Nombre | Status | Evidencia clave (archivo:línea) | Gaps principales |
|-----|--------|--------|---------------------------------|------------------|
| R1 | CRUD grupos e investigadores | `cumple` | `core_cpp/src/services/group_service.cpp:47,75,81,91,114`; `researcher_service.cpp:31,57,63,73,93`; `status="active"` por defecto (`group.h:35`, `researcher.h:23`) | Ninguna relevante |
| R2 | Tipología / valor / peso por producto | `cumple` | `family_id/subtype_id/quality_category_id` (`models.py:76-96`); `QualityCategory.weight` + `global_weight` (`models.py:27-35`, `init_schema.sql:44-53`, `catalog_2024.json`); 5 familias verificadas | Puntaje no persistido por producto (solo derivable por join a `QualityCategory`) |
| R3 | Vinculaciones grupo-inv-producto con puntaje | `cumple` | `MembershipNode` (doble cadena), `ProductAuthorNode`, `GroupProductNode` (`init_schema.sql:171-215`, `models.py:98-124`); persistencia idempotente en `GruplacCommitService.commit` | Tablas de vinculación sin columna `score`; puntaje derivado indirectamente por producto |
| R4fuentes | Variables entrada/salida (código) | `cumple` | `Taller2_WP-DN-EO.py:12-22`, `Taller2_WP-DN-EO.cpp:12-22` (entrada/salida etiquetadas + NOTAS de implementación); `main` imprime cada variable | `grupo_id` declarado como entrada pero ninguna función de indicador lo recibe |
| R4word | Variables entrada/salida (Word) | `cumple` | `docs/PEA-i_Especificacion_Integral_Cumplimiento_Taller2.md:2654-2676` §46.2 «Variables de entrada y salida del modelo (ejercicio 6)» con las tablas de grupo e investigador; el Word se regenera desde esa spec | Ninguna relevante |
| R5 | Importación URL GrupLAC / CvLAC / PDF / CSV | `cumple` | 4 vías con preview/confirm: GrupLAC (`imports.py:118-153`), CvLAC (`:51-115`), PDF (`:206-283`), CSV (`:156-203`) | CSV solo grupos (sin integrantes ni productos directos); importación 100% en Python, nada en CLI C++ |
| R6 | LISTAS con punteros, sin STL en grafo | `cumple` | Nodos encadenados `GroupNode`/`MembershipNode`/`ProductNode`/`ResearcherNode` (`group.h:40-47`, `membership.h:19-23`, `product.h:43-63`, `researcher.h:28-32`); recorridos por puntero | Solo `unordered_map` en `db_network_analytics.cpp:9,50` (fuera del grafo RAM) |
| R7 | CRUD + desactivar + categoría + validación | `cumple` | `create/get/list/update/delete_product` (`product_service.cpp:33-101`); `family/subtype/quality_category_id` en `product.h:14-16`; `status="inactive"` en DB | `update_product` valida `validation_status` en `{pending, valid, rejected}`; membresía se desactiva vía `Membership.status = "inactive"`; existe `update_product_author` dedicado; delete en RAM es físico (soft delete solo en DB) |
| R8 | Filtrar por año | `cumple` | `products by-year <start><end>\|last <N>` (`product_commands.cpp:121-167`); Python `filter_products` (`product_filters.py:15-49`) | `by-year` imprime listado detalle registro a registro (`print_product` por producto en ventana) en lugar de solo conteos |
| R9 | Editar cualquier dato | `cumple` | Servicios aceptan struct completo (`update_group:91-112`, `update_researcher:73-91`, `update_product:75-99`) | CLI `products update`, `researchers update`, `groups update` aceptan campos extendidos (familia, subtipo, calidad, estado, código externo, correo, educación); `validation_status` con validación de valores permitidos |
| R10 | Resumen en C / tablas descriptivas | `cumple` | `print_summary()` (`group_service.cpp:378-418`); comando CLI `summary` (`pea_cli.cpp:35`) | Ninguna |
| R11 | Dashboard Python (histogramas / barras) | `cumple` | `scripts/pea_dashboard.py` genera 4 PNG en `docs/dashboard/` (productos por familia, productos por año, membresías por grupo, productos con/sin autores) usando matplotlib y paleta categórica validada con `validate_palette.js` | El dashboard web React+recharts sigueexistente como capa web; R11 se satisface con el script Python standalone |
| R12 | Indicador del GRUPO (I_Grupo) | `cumple` | `collect_group_metrics` aplica suma ponderada completa (`metrics_collector.py:182-193`) como base de conteos crudos; el endpoint `/groups/{group_id}/minciencias-diagnosis` devuelve el diagnóstico con `modelo_oficial_2024` y ya **no** devuelve `i_grupo_legacy` (eliminado del payload el 2026-10-24) | **C++ resuelto**: `pea_cli indicator group` ya aplica el modelo oficial (§2.2.9→§3.10) en `core_cpp/src/services/official_indicator.cpp`; la paridad con Python la verifica `scripts/pea_paridad_indicador.py` (mismo Ind.Grupo exacto). El CLI imprime solo el modelo oficial; el legacy ya no se calcula ni se expone en la API |
| R13 | Indicador del INVESTIGADOR (I_Investigador) | `cumple` (con rótulo honesto) | `metrics_collector.py:379-390` aplica `1.5·asc_count + 0.5·dpc_count` separados (pesos oficiales) como conteos base; endpoint `/researchers/{res_id}/indicator` (`researchers.py:138-158`) devuelve `adaptacion_individual_2024` y ya **no** devuelve `i_investigador_legacy` (eliminado del payload el 2026-10-24); C++ y Python demos ya usan AP y DPC separados | **Fase 5**: el modelo 2024 NO define un indicador de producción por persona (§3.10 es de grupo), así que la lectura con la escala del modelo llega como `adaptacion_individual_2024` —**adaptación declarada (NO oficial)** del mismo pipeline §2.2.9→§3.10, con Cohe/Coop de la red del investigador—; el legacy se eliminó del payload y el CLI ya no lo calcula |
| R14 | 2 archivos de texto con respuestas | `cumple` | `Taller2_WP-DN-EO.cpp` (Ejercicio 1 ll.300-396, Ejercicio 2 ll.399-462) y `Taller2_WP-DN-EO.py` (ll.162-267, 272-362) con fórmula y ejecución real | Ambos usan datos embebidos en `main()`, no leen `pea_data.json`; ya **no divergen numéricamente** (paridad exacta py↔cpp) |
| R15 | Especificación Word + UML | `cumple` | `docs/word/Parcial2_WP-DN-EO.docx` (376.434 bytes, 11 PNG embebidos, 89.297 caracteres) regenerado desde la **spec integral** (`build_word_doc.py:35` → `PEA-i_Especificacion_Integral_Cumplimiento_Taller2.md`); §46 del documento con `I_Grupo`/`I_Investigador`, fórmula §3.10, valores 12,667 y 11,700 y variables de entrada/salida | Verificado por extracción de texto: 0 menciones de «Taller 2 Grupo 5 2026», «19 de octubre» y «Taller2_WP-DN-EO.docx»; 2 menciones del asunto «Estructura de datos Parcial 2 Grupo # 2026» y de las fechas 23/26 de octubre |
| R16 | Video YouTube ~10 min, UPC, estudiantes | `parcial` | Video **publicado y revisable**: https://www.youtube.com/watch?v=eezB3oZ3n2w — oEmbed «PRESENTACION KHEMIA», canal de William Peñaranda, `lengthSeconds` 1283 | La duración real es **21 min 23 s**, el doble de los ~10 min que pide la NOTA 6.i; identidad UPC y estudiantes visibles no son auditables desde el repositorio |
| R17 | Archivo identificación estudiantes | `cumple` | `INTEGRANTES.txt` con los 3 integrantes WP-DN-EO (nombres completos, iniciales, programa y universidad), listado de archivos de entrega y enlaces de entrega | Ninguno — el enunciado (NOTA 4) pide identificación de los estudiantes y no exige código ni correo; el archivo se entrega tal cual. |
| R18 | Correo a adithperez@unicesar.edu.co | `cumple` | Borrador `docs/correo_entrega_parcial2.md`: destinatario ll.3, asunto ll.4 y 12, adjuntos ll.27-35 ya con los nombres que llevan iniciales (NOTA 8) | Envío real no verificable desde el repositorio |
| R19 | Fechas 23/26 oct 11:59 am | `cumple` | `correo_entrega_parcial2.md:41-42` (preliminar 23 oct, definitiva 26 oct) | Solo declaradas en borrador; sin evidencia de envío anticipado |
| R20 | Subject byte-exacto | `cumple` | `INTEGRANTES.txt:48` y `correo_entrega_parcial2.md:4,12`: "Estructura de datos Parcial 2 Grupo # 2026" | Solo resta usarlo en el envío real |
| R21 | Nombres de archivo con iniciales | `cumple` | `Taller2_WP-DN-EO.cpp` y `Taller2_WP-DN-EO.py` versionados en la raíz y **adjuntados al correo con ese nombre** (NOTA 8 del enunciado); `INTEGRANTES.txt` declara las iniciales y lista los archivos de entrega | Las copias de trabajo `Taller2.cpp` / `Taller2.py` de la raíz están en `.gitignore`: se regeneran desde las fuentes con iniciales, nunca se editan aparte |
| R22 | Archivo de persistencia | `cumple` | `pea_data.json` válido: 12 claves top-level, 8898 items (groups:2, researchers:166, memberships:179, products:1778, authors:2368, groupProductLinks:1896, projects:604, groupProjectLinks:125, workPlans:2, validationQueue:1778, undoOperations:0) | Ninguna |
| R23 | Cargar datos o ejecutar sin datos | `cumple` | `pea_indicador.py` llama a `repository.load_from_file` (líneas 55-56) y acepta `--archivo/--grupo/--investigador` con modo vacío y default `pea_data.json` | Ninguna relevante |

---

## 3. Detalle por requisito con acciones recomendadas

### R12 — Indicador del GRUPO (I_Grupo) — cumple

**Estado:** Integrado punta a punta en el backend Python.

**Evidencia:**
- `backend/app/evaluator/metrics_collector.py:182-193` — `collect_group_metrics` aplica la suma ponderada completa `3.7·Top + 2.3·A + 0.4·B + 1.5·asc_count + 0.5·dpc_count + 1.0·Fr.A + 0.2·Fr.B + 0.1·Cohe + 0.3·Coop` (AP y DPC como términos separados).
- `backend/app/evaluator/__init__.py` — `evaluate_group_minciencias` ya no retorna `i_grupo_legacy` (eliminado el 2026-10-24).
- `backend/app/repositories/analytics.py:317-321` y `backend/app/api/routers/groups.py:183-191` — el endpoint `/groups/{group_id}/minciencias-diagnosis` devuelve el diagnóstico con `modelo_oficial_2024` y ya **no** incluye `i_grupo_legacy`.

**Observación:** `pea_cli indicator group` en C++ ya no difiere del backend Python: el indicador oficial (§2.2.9 λ → §3.6 pesos → §3.9 normalización → §3.10 fórmula) está portado al núcleo (`core_cpp/src/services/official_indicator.cpp`) y la paridad exacta se verifica campo por campo con `scripts/pea_paridad_indicador.py` (AITICE #10 = 0,8541030927835052 en ambos lados; GISICO #35 = 0,5479201551398108). La CLI imprime **solo** el modelo oficial: desde el 2026-10-24 el legacy se eliminó del payload de la API y el CLI ya no lo calcula.

### R13 — Indicador del INVESTIGADOR (I_Investigador) — cumple (con rótulo honesto)

**Estado:** Fórmula legacy corregida con pesos oficiales (`AP = ASC` separado de `DPC`) y, desde la **Fase 5**, una lectura con la escala del modelo para la unidad "investigador" — declarada explícitamente como **NO oficial**.

**Evidencia:**
- `backend/app/evaluator/metrics_collector.py:379-390` — aplica `1.5 * asc_count + 0.5 * dpc_count` como términos separados (pesos oficiales 1.5 y 0.5) como base de conteos crudos.
- `backend/app/evaluator/__init__.py` — `evaluate_researcher_minciencias` ya no retorna `i_investigador_legacy` (eliminado el 2026-10-24).
- `backend/app/api/routers/researchers.py:138-158` — endpoint `/researchers/{res_id}/indicator` responde con `adaptacion_individual_2024` y ya **no** incluye `i_investigador_legacy`.
- `backend/app/repositories/analytics.py:332-360` — `get_researcher_minciencias_indicator` agrega la adaptación; el legacy ya no está en el payload.
- `backend/app/evaluator/official_researcher.py` + `official_researcher_population.py` — la adaptación: **mismas** partes normativas (§2.2.9 λ, §3.6 pesos, §3.7 clases, §3.8.1 Ind_Clase, §3.9 normalización, §3.10 los nueve términos) y **tres** adaptaciones declaradas: unidad = investigadores; período = antigüedad del investigador; Cohe/Coop = los de su red.
- `core_cpp/src/services/official_indicator.cpp` — el mismo pipeline en C++ (`evaluar_modelo_individual`, `evaluar_poblacion_investigadores`), verificado contra Python y contra el contrato versionado con `scripts/pea_paridad_individual.py --golden`, y con 4 casos propios en `core_cpp/tests/test_official_indicator.cpp` (12 casos / 281 aserciones en total).
- `core_cpp/src/cli/researcher_commands.cpp` — `pea_cli indicator researcher <id>` imprime la adaptación con el rótulo "NO OFICIAL"; desde la Fase 6 ya **no** calcula un segundo legacy.

**Observación (honesta):** el `Cohe = 0.0` del legacy era un hardcode ("aceptable, no aplica a nivel individual", `metrics_collector.py:376`). En la lectura nueva el Cohe es el **de la red** (firmantes registrados por producto, incluido el propio investigador) y el Coop, los grupos de la red: es una de las tres adaptaciones declaradas y viaja en el payload (`adaptaciones`), para que sea auditable. Eso **no** convierte la lectura en oficial: el modelo 2024 define un único indicador de producción y es de grupo (§3.10); §3.11, §3.12 y §3.13 también son de grupo.

### R7 — CRUD producto + desactivar + categoría + validación — cumple

**Estado:** Todos los gaps resueltos.

**Evidencia:**
- `core_cpp/src/services/product_service.cpp:75-99` — `update_product` rechaza `validation_status` que no esté en `{pending, valid, rejected}`.
- `core_cpp/src/services/group_service.cpp` — `remove_member_from_group` establece `Membership.status = "inactive"` (desactivación lógica) en lugar de solo eliminación física.
- `core_cpp/src/services/group_service.cpp` — la desactivación se respeta en el grafo: `members_of_group` y `groups_of_researcher` no listan las membresías inactivas; volver a vincular reactiva el mismo nodo (`add_member_to_group`) y el borrado del investigador purga sus membresías (`purge_member_from_group`) sin dejar punteros colgantes. Sin esto, `pea_tests` fallaba en 4 checks y 2 pruebas de `backend/tests` quedaban en rojo.
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

**Estado:** `.docx` regenerado desde la **especificación integral** (fuente única), con los 11 diagramas y la sección de indicadores.

**Evidencia:**
- `docs/word/build_word_doc.py:35` — `SPEC_MD_PATH` apunta a `docs/PEA-i_Especificacion_Integral_Cumplimiento_Taller2.md`. Antes apuntaba al EdD del Parcial 2 (5 KB), que **no** reproduce el documento oficial: sin los encabezados §38.x que anclan el mapeo de diagramas y sin la sección de variables.
- `docs/PEA-i_Especificacion_Integral_Cumplimiento_Taller2.md:2636-2725` — §46 «Indicador de producción científica (ejercicios PARCIAL 1 y 2)»: modelo normativo (§2.2.9, §3.6, §3.7, §3.8, §3.9, §3.10), variables de entrada y salida de grupo e investigador (ejercicio 6), fórmula con los valores verificados (I_Grupo = 12,667 e I_Investigador = 11,700) y alcance de la medición (conteo propio frente a índice normalizado).
- `docs/word/build_word_doc.py:43-131` — portada institucional: PARCIAL 2, grupo WP-DN-EO, docente Ing. Adith Pérez.
- `docs/word/Parcial2_WP-DN-EO.docx` — 376.434 bytes, 11 PNG embebidos, 11 figuras numeradas con caption, 89.297 caracteres.

**Verificación por extracción de texto del binario:**
- Presentes: «Estructura de datos Parcial 2 Grupo # 2026» (2), «23 de octubre» (2), «26 de octubre» (2), «I_Grupo», «I_Investigador», «12,667», «11,700», «peso relativo», «ancla», «λ», «Variables de entrada y salida del modelo», «Parcial2_WP-DN-EO.docx» (6).
- Ausentes: «Taller 2 Grupo 5 2026», «19 de octubre», «Taller2_WP-DN-EO.docx».

### R16 — Video YouTube ~10 min, identidad UPC, estudiantes visibles — parcial

**Estado:** El video **ya está grabado y publicado** y el profesor puede revisarlo: ese es el requisito de fondo de la NOTA 3.

**Evidencia:**
- `https://www.youtube.com/watch?v=eezB3oZ3n2w` — oEmbed responde con título «PRESENTACION KHEMIA», canal de William Peñaranda y miniatura pública.
- `lengthSeconds` = 1283 → **21 min 23 s**.
- `INTEGRANTES.txt` — enlace al video en la sección de información de entrega.
- `docs/guion_sustentacion_video_parcial2.md` — guion vigente (los archivos antiguos del Taller 2 están borrados); su línea de estado quedó actualizada con la URL y la duración real.

**Gap restante (uno solo, medible):** la duración real duplica los ~10 minutos que pide la NOTA 6.i. La identidad institucional de la UPC y la permanencia de los tres estudiantes en cámara no son auditables desde el repositorio.

**Acción recomendada (equipo externo):**
1. Verificar visualmente la identidad UPC y la visibilidad de los tres integrantes.

**Decisión del equipo (2026-10-24):** **no se menciona la duración en el correo**. La diferencia queda registrada solo en este documento (R16) y en la línea de estado de `docs/guion_sustentacion_video_parcial2.md`, como referencia interna para quienes presenten. El correo (`docs/correo_entrega_parcial2.md`) queda sin cambios al respecto.

### R17 — Archivo identificación estudiantes — cumple

**Estado:** El archivo cumple la NOTA 4: nombres completos, iniciales, programa y universidad de los 3 integrantes (WP-DN-EO), archivos de entrega con iniciales, enlaces oficiales (asunto, destinatario, plazos, repositorio, despliegue, video y Word). El enunciado no exige código estudiantil ni correo institucional.

**Evidencia:**
- `INTEGRANTES.txt` — 3 integrantes con nombre completo, iniciales, programa y universidad; sección de archivos de entrega (los 5 adjuntos, con las iniciales en el nombre conforme a la NOTA 8); sección de información de entrega con asunto, destinatario, plazos (23 y 26 de octubre), repositorio, despliegue, video, Word, spec, backup de base de datos, persistencia JSON y guion.
- `docs/guion_sustentacion_video_parcial2.md` — guion completo de la sustentación.

**Gap restante:** ninguno — el archivo ya cumple la NOTA 4 con nombres, iniciales, programa y universidad por integrante. El enunciado no exige código estudiantil ni correo institucional, por tanto no hay campos pendientes que completar.

**Evidencia de exención:** búsqueda exhaustiva del 2026-10-24 confirmó que esos datos no existen en ninguna fuente del proyecto (`pea_data.json` de GrupLAC/CvLAC trae 166 investigadores sin coincidir con WP/DN/EO y con `institutional_email` vacío, BD local de SQL solo con `admin`, API del despliegue vivo con 0 coincidencias, historial de Git con marcadores de plantilla desde `6dd2f86`). No se inventan datos.

**Acción recomendada:** ninguna pendiente para R17. Rearmar siempre el paquete con `python -X utf8 scripts/build_paquete_entrega.py` antes de enviar: verifica byte a byte cada adjunto contra su fuente y genera `dist/entrega_parcial2/` más el ZIP.

### R18 — Correo a adithperez@unicesar.edu.co — cumple (borrador)

**Estado:** Borrador con asunto byte-exacto y adjuntos reales.

**Evidencia:**
- `docs/correo_entrega_parcial2.md` — destinatario `adithperez@unicesar.edu.co` (ll.3), asunto «Estructura de datos Parcial 2 Grupo # 2026» (ll.4 y 12), cuerpo con los tres integrantes, **adjuntos corregidos** (ll.27-35): `Taller2_WP-DN-EO.py`, `Taller2_WP-DN-EO.cpp`, `Parcial2_WP-DN-EO.docx`, `INTEGRANTES.txt` y `pea_data.json`, con la nota de que los fuentes llevan las iniciales (NOTA 8); plazos 23 y 26 de octubre (ll.44-45).

**Gap:** el envío real no es verificable desde el repositorio.

**Acción recomendada:**
1. Rearmar el paquete con `python -X utf8 scripts/build_paquete_entrega.py` (verifica que cada adjunto coincide byte a byte con su fuente).
2. Enviar el correo con el asunto byte-exacto y adjuntar el ZIP (o los 5 archivos sueltos de `dist/entrega_parcial2/`).
3. Dejar evidencia verificable del envío.

### R21 — Nombres de archivo con iniciales — cumple

**Estado:** Fuentes con iniciales versionadas, commiteadas y **adjuntadas con ese nombre**; son la única fuente mantenida de los dos ejercicios.

**Evidencia:**
- `Taller2_WP-DN-EO.cpp` / `Taller2_WP-DN-EO.py` — fuentes versionadas en la raíz del repositorio, con las iniciales que exige la NOTA 8 del enunciado.
- `INTEGRANTES.txt` — declara las iniciales y lista los cinco archivos de entrega con esos nombres.
- `docs/correo_entrega_parcial2.md:27-35` — los adjuntos del correo son los archivos con iniciales.
- Las dos versiones calculan **lo mismo**: normalizan el texto antes de clasificar (minúsculas, sin tildes y espacios colapsados), el Cohe del grupo se calcula con §2.2.10.1 (`autores coincidentes / productos GNC+DTI − 1`) y la fórmula impresa coincide con el cálculo (`AP = ASC`, DPC como término aparte). Verificado en vivo: I_Grupo = 12,667 e I_Investigador = 11,700 en ambas.
- Las copias de trabajo `Taller2.cpp` / `Taller2.py` de la raíz están en `.gitignore` y se regeneran desde las fuentes con iniciales.

### R23 — Cargar datos o ejecutar sin datos — cumple

**Estado:** Usa el método real `load_from_file`.

**Evidencia:**
- `scripts/pea_indicador.py:55-56` — `cargar_datos_json()` llama a `repository.load_from_file(str(archivo))` (ya no a `load_json` inexistente).
- `scripts/pea_indicador.py` — acepta `--archivo/--grupo/--investigador`, modo vacío y default `pea_data.json`.

### R4word, R2, R3, R5, R6, R10, R14, R19, R20, R22 — cumplen

Estos requisitos están funcionalmente cubiertos. Algunos tienen observaciones menores (ej. puntaje no persistido por producto en R2/R3, CSV solo grupos en R5) que no bloquean el cumplimiento pero son mejora técnica.

---

## 4. Plan de acción priorizado

### Antes del 26 oct 2026, 11:59 a. m. (entrega definitiva)

Todo el trabajo de código y documentación está resuelto y verificado. Queda **una acción del equipo** (externa al repositorio):

| Prioridad | Req | Acción | Dónde | Estado |
|-----------|-----|--------|-------|--------|
| 1 | R18 | Enviar el correo con asunto byte-exacto `Estructura de datos Parcial 2 Grupo # 2026` y los 5 adjuntos | `docs/correo_entrega_parcial2.md` | Pendiente (equipo) |

R16 quedó **cerrado por decisión del equipo (2026-10-24)**: no se menciona la duración del video en el correo; la diferencia de 21:23 frente a los ~10 min de la NOTA 6.i queda registrada solo en este documento y en el guion, como referencia interna.

**Verificaciones de esta sesión (2026-10-24):**
- `docs/word/Parcial2_WP-DN-EO.docx` regenerado desde la especificación integral: 376.434 bytes, 11 PNG embebidos, 89.297 caracteres; asunto, plazos (23 y 26 de octubre) y sección de indicadores verificados por extracción de texto; 0 menciones de los metadatos viejos del Taller 2.
- Especificación integral con metadatos actualizados (asunto «Estructura de datos Parcial 2 Grupo # 2026», plazos del 23 y 26 de octubre) y con la §46 de indicadores y variables de entrada/salida.
- ` Taller2_WP-DN-EO.py` ejecutado en vivo: I_Grupo = 12,667 e I_Investigador = 11,700 (coincide con la fórmula impresa).
- Video publicado verificado por oEmbed («PRESENTACION KHEMIA», canal de William Peñaranda) y `lengthSeconds` = 1283 (21 min 23 s).

### Backlog de la app (después de la entrega)

Los dos P0 del panel del indicador oficial —**peso relativo por producto** (§3.6) y **variables de entrada y salida del modelo** — están revisados y especificados en `docs/p0-panel-indicador-oficial.md`. Son cambios de interfaz: no tocan el contrato, el golden, el núcleo C++ ni la paridad Python↔C++.

### Post-entrega (arquitectura aparcada)

- Test de guardia contra regresión de pytest (ImportError por `_get_product_catalogs_pyodbc`).
- `product_filters.py` → filtrado en C++; `researchers.py` router → C++.
- Excepción de ingestión más estrecha.
- Rotar clave `sa` expuesta en Docker, `.env` del servidor y PR a main (pendiente desde corte anterior).

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
