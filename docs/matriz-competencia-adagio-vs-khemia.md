# Matriz de competencia · Adagio vs Khemia (PEA-i)

**Fecha de corte:** 25-oct-2026 · **Fuente de verdad de la columna Adaggio:** [`scripts/mapa_adagio.py`](../scripts/mapa_adagio.py)
**Salidas del script:** [`mapa-funcional-adagio.md`](mapa-funcional-adaggio.md) (detalle completo de 908 operaciones) · [`adagio-superficie.csv`](adagio-superficie.csv) (filtro por Excel) · [`adagio-snapshot.json`](adagio-snapshot.json) (huella para diffs)

Este documento es la **vista de decisión**: una fila por capacidad del competidor, con lo que tenemos, lo que falta y en qué orden取り扱lo.
El detalle de cada endpoint (método, ruta, acceso, permisos documentados) vive en el mapa; este archivo solo resume y prioriza.

> **Alcance.** Todo lo anterior proviene de material **público** de Adaggio (OpenAPI expuesto, robots, sitemap, cabeceras HTTP). No se hizo autenticación forzada, ni subida de archivos, ni espejo de sus datos. Cualquier verificación intrusiva exige autorización escrita de ADAGGIO (ver §8 del [informe competitivo](analisis-competitivo-adagio-2026-10-25.md)).

---

## 1. Cifras del corte

| Métrica | Adaggio | Khemia (PEA-i) |
|---|---:|---:|
| Rutas | 666 | — |
| Operaciones (API) | **908** | **87** |
| Módulos/capacidades | 27 | 8 routers |
| Familias funcionales | 8 | 5 dominios |
| Operaciones públicas sin token | 161 (18 %) | **87 (100 %)** |
| Documentadas con descripción | 570 (63 %) | 0 % (OpenAPI sin texto) |
| Control de acceso | JWT + cookie + header, multi-tenant por host | **ninguno** en el backend Python |
| Catálogo oficial MinCiencias 2024 | ❌ **0 endpoints** | ✅ 5 familias / 70 subtipos / 170 categorías |

> La última fila es la que importa: Adaggio **no mide** nada. Su API no contiene un solo endpoint de indicador, ponderación ni medición (verificable con `grep -i "indicator|peso|scoring|minciencias" docs/adagio-superficie.csv` → 0 resultados de ese tipo).

---

## 2. Brecha por familia

| Familia Adaggio | Ops | Khemia | Lectura |
|---|---:|---|---|
| Identidad (acceso, SSO, consentimiento) | 21 | ❌ 0 | Los dos arrancamos por lados distintos: ellos por auth, nosotros por datos. Pero el cliente institucional necesita lo mismo. |
| Producción (personas, producción, productos, proyectos) | 353 | 🟡 ~45 | Tenemos el **dato medido**; nos falta el **flujo editorial** (ficha, progreso, adjuntos, revisiones). |
| Convocatorias (convocar → postular → evaluar) | 340 | ❌ 0 | **El gap #1.** 340 operaciones = su core de negocio. |
| Gestión (Scrum, interacción) | 37 | 🟡 4 | Plan de trabajo por grupo; nada de Scrum ni networking. |
| Catálogos (referencia, índice, búsqueda) | 106 | 🟡 1 | Nuestro catálogo 2024 es profundo pero estrecho (5 familias, sin países/ODS/skills). |
| Recursos (biblioteca, metadatos, banco) | 36 | 🟡 4 (enriquecimiento) | carecemos biblioteca; enriqueccemos desde datos abiertos (Minciencias directo). |
| Portal (páginas, landing, búsqueda global) | 11 | 🟡 6 | Portal público real, pero sin multi-institución ni SEO institucional. |
| Plataforma (OpenAPI, operaciones masivas) | 4 | 🟡 12 | Ellos ganan la batalla de documentación: 1,5 MB de esquema público (y por eso lo filtran). El nuestro no está publicado. |

Leyenda: ✅ paridad · 🟡 parcial · ❌ ausente

---

## 3. Matriz por capacidad (27 filas)

| # | Capacidad Adaggio | Ops | Khemia | Estado | Qué falta exactamente | Prioridad |
|---|---|---:|---|---|---|---|
| 1 | Convocatorias | 102 | ❌ | — | Modelo de convocatoria: fases, presupuesto, cronograma, documentos | **P1** |
| 2 | Postulaciones a fuentes de financiación | 87 | ❌ | — | Postulación con aliados, ítems de presupuesto, envío | **P1** |
| 3 | Instituciones | 81 | 🟡 | [`backend/app/api/routers/groups.py`](../backend/app/api/routers/groups.py) | Registro de instituciones + unidades; hoy la institución es un dato del grupo, no una entidad | **P1** |
| 4 | Expertos e investigadores | 77 | 🟡 | [`researchers.py`](../backend/app/api/routers/researchers.py) (10 ops) | Verificar/recategorizar/postular (workflow); tenemos alta y ficha, no ciclo de vida | P2 |
| 5 | Postulaciones a convocatorias | 71 | ❌ | — | Estados de postulación, autores, Experts aliados, documentos | **P1** |
| 6 | Producción científica (v3) | 65 | 🟡 | [`products.py`](../backend/app/api/routers/products.py) + `evaluator/` | Fichas unificadas con progreso y visibilidad; hoy el producto es un registro medido | P2 |
| 7 | Proyectos de investigación | 63 | 🟡 | [`projects.py`](../backend/app/api/routers/projects.py) (7 ops) | Hitos, responsables, presupuesto, ajustes de avance | P2 |
| 8 | Evaluación de propuestas | 51 | ❌ | — | Rúbricas, conflicto de interés, expertos externos, sesiones de evaluación | P2 (P1 si el cliente es MinCiencias) |
| 9 | Gestor de proyectos (Scrum) | 35 | ❌ | — | Epics, sprints, backlog, tareas, adjuntos | P3 · no es nuestro mercado |
| 10 | Productos de investigación | 33 | ✅🟡 | `products.py` (11 ops) + endpoints de productos por grupo | Falta catálogo de productos por tipo con ficha y responsables | P2 |
| 11 | Publicaciones | 31 | 🟡 | importadas vía GrupLAC/CvLAC | CRUD editorial de publicación (revista, ISSN, quartile, autores) | P2 |
| 12 | Empresas y prototipos | 28 | 🟡 | `PI`/`PI_C` del catálogo 2024 | Companyá como entidad; hoy los prototipos se miden pero no se gestionan | P2 |
| 13 | Producción jurídica | 28 | ❌ | — | Leyes/decretos como producción | P3 |
| 14 | Patentes | 28 | 🟡 | [`contracts_2024`](../docs/catalogo_oficial_pesos_minciencias_2024.md) (`PI`, `PI_C`) | Patentes con número, oficina, inventor; hoy solo el subtipo tipificado | P2 |
| 15 | Financiamiento | 25 | ❌ | — | Convocatorias de fondos y capítulos de presupuesto | P1 |
| 16 | Catálogos de dominio | 22 | 🟡 | 5 familias 2024, 22 catálogos en su API | Países, áreas, ODS, skills, líneas: catálogo propio versionado | P2 |
| 17 | Metadatos externos | 21 | ✅🟡 | [`imports.py`](../backend/app/api/routers/imports.py) (`datos_abiertos`, `enrich`) | Enrichment funcionando, pero sin caché ni fuente secundaria | **P1 (fortaleza)** |
| 18 | Identidad y acceso | 15 | ❌ | — | JWT + roles + SSO; **el backend Java ya lo tiene** | **P0** |
| 19 | Biblioteca | 14 | ❌ | — | Repositorio documental institucional | P3 |
| 20 | Landing pages institucionales | 8 | 🟡 | rutas `_public/` | Página por institución, multi-tenant | P2 |
| 21 | Derechos del titular | 6 | ❌ | — | Consentimiento, marketing, supresión de datos (Ley 1581) | **P0/P1** |
| 22 | Operaciones masivas | 4 | ❌ | — | Edición masiva por modelo | P3 |
| 23 | Eventos | 4 | ❌ | — | Agenda institucional | P3 |
| 24 | Búsqueda global | 3 | 🟡 | `GET /groups/search/scienti` | Búsqueda transversal con facetas | P2 |
| 25 | Índices v3 | 3 | 🟡 | filtros por tipo en listados | Dependency graph de tipos | P3 |
| 26 | Interacciones (networking) | 2 | ❌ | — | Conexiones entre investigadores | P3 |
| 27 | Banco de recursos | 1 | ❌ | — | Repositorio compartido | P3 |

---

## 4. Lo que solo tenemos nosotros (esto se vende como diferenciador)

| Capacidad nuestra | Evidencia | Por qué Adaggio no lo tiene |
|---|---|---|
| **Indicador oficial MinCiencias 2024** | `backend/app/evaluator/official_indicator.py`, `official_researcher.py`, `contrato_oficial.py`; contrato único §3.6 (Peso relativo × Ancla = Peso global); paridad exact Python↔C++ | **0 endpoints de medición en sus 908** |
| **Catálogo oficial completo** | 5 familias · 70 subtipos · **170 categorías** con pesos transcritos del PDF M601PR04g01 v02-09 | Su API no distingue categoría de producción con pesos oficiales |
| **Import masivo institucional** | GrupLAC, CvLAC, PDF, CSV + `enrich` de datos abiertos | Traen sus datos por digitación o S3 manual, no por scraping del oficial |
| **Trazabilidad de borrado** | Soft-delete + `restore` + undo LIFO + cola de validación FIFO | Su API expone `DELETE` duro |
| **Núcleo C++ en RAM** | `backend/app/abpoxx_pybind.pyd`, multilistas ortogonales | Django/DRF objeto-relacional puro |
| **Exports institucionales** | PDF de grupo, dossier PDF, ranking CSV, productos CSV, Word oficial | Sin equivalente en su superficie |

---

## 5. Brechas de plataforma (no son "módulos" pero deciden la venta)

| Brecha | Adaggio | Khemia | Acción |
|---|---|---|---|
| Autenticación | JWT + cookie + header | **Ninguna** en Python | **P0** — migrar a `gestion-contractual-api` (Java) o proteger el Python mientras tanto |
| CORS | Allowlist estricto | `allow_origins=["*"]` + `allow_credentials=True` → refleja cualquier origen | **P0** — dejar de reflejar credenciales |
| Aislamiento por tenant | Un backend por host + S3 por tenant | Instancia única, un solo tenant | **P1** — modelo de instituciones/unidades antes que multi-tenant |
| Carga de archivos | S3 por tenant (`files.adaggio...`) + documentos en convocatorias | No hay upload propio | **P1** — solo si sikamos Diagnóstico→Convocatorias con adjuntos |
| Documentación de API | OpenAPI 1,5 MB público (y por eso lo filtran) | OpenAPI local sin publicar | **P1** — publicar la nuestra, sanitizada |
| SSO institucional | Microsoft Entra ID | Ninguno | P2 |
| Consentimiento / data-rights | 6 endpoints + 12 de auth | Ninguno, y publicamos datos personales | **P0** (riesgo Ley 1581) |

---

## 6. Lo que NO hay que copiar

Concreto, y todo está documentado con evidencia reproducible en el informe:

- **No copiar su `DEBUG=True`**: cada 404 filtra el URLconf completo (Django) y texto de error literal.
- **No publicar un esquema de 1,5 MB sin revisar**: el suyo expone 908 operaciones, 338 sin descripción y 6 objetos de permiso en texto plano.
- **No copiar su configuración multi-tenant dispersa**: su `robots.txt` de un tenant enlaza el sitemap de otro (fuga cross-tenant entre UAO y Cartagena).
- **No copiar su operación de datos "en vivo"**: 15 848 publicaciones servidas sin autenticación es una fuga waiting to happen, no una feature.
- **No copiar su cwd: "TEST PRUEBA"** en catálogos públicos: es su IA de datos sin curador.

---

## 7. Hoja de ruta derivada

### P0 — antes de cualquier cliente (bloqueante)
1. **Auth + RBAC**: poner el frontend y el API en el backend Java (JWT ya implementado, `ApiContractParityTest` verde) o, como mínimo, proteger los 87 endpoints Python con `Depends`.
2. **CORS**: allowlist explícita, `allow_credentials` solo con orígenes propios.
3. **Consentimiento Ley 1581**: al menos registro de consentimiento + endpoint de supresión para los datos que publicamos en `_public/`.

### P1 — paridad mínima de un cliente institucional
4. **Módulo de convocatorias** (convocatoria + postulación + documentos) — es lo que MinCencias compra.
5. **Instituciones como entidad** + aislamiento de datos por institución.
6. **Publicar nuestra OpenAPI** (la necesitamos para integraciones; la suya es la puerta de entrada de otros a su API).
7. **Profundizar el enrich** desde datos abiertos: es nuestra ventaja, hoy subutilizada.

### P2 — profundidad y evaluadores
8. Evaluación con rúbricas + conflicto de interés (cuando el cliente sea MinCiencias o otra entidad que evalúa).
9. Publicaciones, patentes y empresas con CRUD editorial.
10. Búsqueda global con facetas + catálogos de referencia más allá de las 5 familias 2024.

### P3 — fuera de alcance
Scrum, biblioteca, banco de recursos, producción jurídica, landing pages por tenant, networking.

---

## 8. Mantenimiento de esta matriz

```bash
# Regenerar el mapa completo (descarga el esquema público de Adaggio y lo clasifica)
python scripts/mapa_adagio.py --nuestro

# Guarda el corte actual para poder comparar la próxima vez
copy docs\adaggio-superficie.csv docs\adaggio-superficie.csv.prev
```

El script calcula el diff contra `docs/adaggio-superficie.csv.prev` y escribe `docs/adagio-cambios-<FECHA>.md`.
**Recomendación:** correrlo una vez al mes o cuando el competidor anuncie módulo nuevo; la comparación de superficies es Cheap y el mapa es la base de las decisiones de roadmap.

**Regla de uso:** antes de proponer un módulo nuevo en el roadmap, revisar §3 de este documento y §3 del [informe competitivo](analisis-competitivo-adagio-2026-10-25.md). Si la capacidad no aparece contra una necesidad real del cliente, no entra.
