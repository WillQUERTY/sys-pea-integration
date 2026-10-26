# Mapa funcional de Adaggio — catálogo de módulos y funcionalidades

> **Corte:** 2026-10-25 · **Fuente:** esquema OpenAPI público `https://backend.adaggio.unicesar.edu.co/api/v3/schema/`
> **Hash del esquema:** `6249bbb10f5f02ca` · 1,521,805 bytes · 666 rutas · **908 operaciones**
> **Públicas (sin JWT):** 161 · **Con descripción documentada:** 570 (63%)

Generado con `python scripts/mapa_adagio.py`. El esquema crudo de ADAGGIO **no** se versiona en este
repositorio; se cachea en el directorio temporal del sistema. Para re-cortar su API: vuelve a ejecutar
el script y el delta (`docs/adagio-cambios-*.md`) registra qué añadieron o movieron.

---

## 1. Familias funcionales

| Familia | Alcance | Operaciones | Rutas | Módulos | Públicas |
|---|---|---|---|---|---|
| Identidad | Acceso, cuentas, SSO y consentimiento | 21 | 20 | 2 | 12 |
| Producción | Catálogo científico: personas, producción, productos, proyectos | 353 | 239 | 8 | 53 |
| Convocatorias | El ciclo completo: convocar, postular, evaluar | 340 | 256 | 6 | 61 |
| Gestión | Gestión interna de proyectos y colaboración | 37 | 28 | 2 | 0 |
| Catálogos | Catálogos de referencia del dominio | 106 | 86 | 3 | 24 |
| Recursos | Repositorios de documentos y metadatos | 36 | 26 | 3 | 1 |
| Portal | Descubrimiento público y páginas institucionales | 11 | 10 | 2 | 10 |
| Plataforma | Infraestructura de la API y operación | 4 | 1 | 1 | 0 |

## 2. Módulos (vista de árbol)

### Identidad — Acceso, cuentas, SSO y consentimiento

- **Identidad y acceso** — 15 operaciones / 14 rutas / 12 públicas
  - Cierre de sesión
  - Confirmación de correo
  - Consentimiento de datos (Ley 1581)
  - Inicio de sesión (JWT)
  - Recuperación de contraseña
  - Registro de usuario
  - Renovación de token
  - Restablecimiento de contraseña
  - SSO Microsoft Entra ID
  - Verificación de correo
  - Verificación de token
  - Verificación de token de reset
  - *rutas:* `auth/v2/account-confirm-email`, `auth/v2/consent`, `auth/v2/entra-id`, `auth/v2/forgot-password`, `auth/v2/login`, `auth/v2/logout`, `auth/v2/refresh`, `auth/v2/reset-password`, `auth/v2/sign-up`, `auth/v2/token`, `auth/v2/verify-email`, `auth/v2/verify-token-reset-password`
- **Derechos del titular** — 6 operaciones / 6 rutas / 0 públicas
  - Consentimiento, marketing, supresión y estado (data-rights)

### Producción — Catálogo científico: personas, producción, productos, proyectos

- **Empresas y prototipos** — 28 operaciones / 20 rutas / 5 públicas
  - Empresas, prototipos de servicio, emparejamiento con expertos
- **Producción jurídica** — 28 operaciones / 20 rutas / 5 públicas
  - Leyes, decretos y normas (producción normativa)
- **Patentes** — 28 operaciones / 20 rutas / 5 públicas
  - Patentes nacionales y extranjeras
- **Expertos e investigadores** — 77 operaciones / 44 rutas / 23 públicas
  - Directorio de personas, afiliación, roles y productividad
  - Fichas de experto y trazabilidad de perfil (about-of)
  - *rutas:* `api/v2/person`, `api/v3/person`
- **Productos de investigación** — 33 operaciones / 25 rutas / 5 públicas
  - Software, datasets, prototipos e instrumentos
- **Proyectos de investigación** — 63 operaciones / 46 rutas / 5 públicas
  - Proyectos, hitos y responsables
  - *rutas:* `api/v2/project`, `api/v2/project-manager`
- **Publicaciones** — 31 operaciones / 22 rutas / 5 públicas
  - Artículos, libros, capítulos y conference papers
- **Producción científica (v3)** — 65 operaciones / 42 rutas / 0 públicas
  - Fichas unificadas de producción con progreso y visibilidade

### Convocatorias — El ciclo completo: convocar, postular, evaluar

- **Eventos** — 4 operaciones / 4 rutas / 1 públicas
  - Catálogo y agenda de eventos
- **Financiamiento** — 25 operaciones / 25 rutas / 2 públicas
  - Convocatorias de fondos y sus capítulos de presupuesto
- **Postulaciones a fondos** — 87 operaciones / 71 rutas / 0 públicas
  - Propuestas de financiamiento, PRESUPUESTO, aliados y envío
- **Convocatorias** — 102 operaciones / 70 rutas / 31 públicas
  - Ciclo de vida de convocatorias (fases, presupuesto, cronograma)
- **Postulaciones a convocatorias** — 71 operaciones / 50 rutas / 26 públicas
  - Propuestas, expertos aliados, ítems de presupuesto, documentos
- **Evaluación de propuestas** — 51 operaciones / 36 rutas / 1 públicas
  - Rúbricas, conflicto de interés, expertos externos, sesiones

### Gestión — Gestión interna de proyectos y colaboración

- **Interacciones** — 2 operaciones / 2 rutas / 0 públicas
  - Networking entre investigadores y Flujos de colaboración
- **Gestor de proyectos (Scrum)** — 35 operaciones / 26 rutas / 0 públicas
  - Epics, sprints, backlog, tareas, responsables, recursos

### Catálogos — Catálogos de referencia del dominio

- **Catálogos de dominio** — 22 operaciones / 20 rutas / 20 públicas
  - 22 catálogos de referencia (países, áreas, líneas, ODS, skills…)
- **Instituciones** — 81 operaciones / 63 rutas / 4 públicas
  - Universidades y entidades (tenant, unidades)
- **Índices v3** — 3 operaciones / 3 rutas / 0 públicas
  - Búsqueda rápida y dependencias de tipos

### Recursos — Repositorios de documentos y metadatos

- **Biblioteca** — 14 operaciones / 10 rutas / 0 públicas
  - Recursos bibliográficos de la institución
- **Metadatos externos** — 21 operaciones / 15 rutas / 1 públicas
  - Enriquecimiento desde fuentes externas
- **Banco de recursos** — 1 operaciones / 1 rutas / 0 públicas
  - Recursos y materiales compartidos

### Portal — Descubrimiento público y páginas institucionales

- **Landing pages institucionales** — 8 operaciones / 7 rutas / 7 públicas
  - Páginas de presentación por institución
- **Búsqueda global** — 3 operaciones / 3 rutas / 3 públicas
  - Búsqueda transversal del ecosistema

### Plataforma — Infraestructura de la API y operación

- **Operaciones masivas** — 4 operaciones / 1 rutas / 0 públicas
  - Edición masiva por modelo (uso administrativo)

## 3. Catálogo por capacidad (detalle)

### Identidad y acceso

- Consentimiento de datos (Ley 1581) — 2 operaciones
- Confirmación de correo — 2 operaciones
- SSO Microsoft Entra ID — 2 operaciones
- Inicio de sesión (JWT) — 1 operaciones
- Renovación de token — 1 operaciones
- Verificación de token — 1 operaciones
- Cierre de sesión — 1 operaciones
- Registro de usuario — 1 operaciones
- Verificación de correo — 1 operaciones
- Recuperación de contraseña — 1 operaciones
- Verificación de token de reset — 1 operaciones
- Restablecimiento de contraseña — 1 operaciones

**`auth/v2/consent`** (2 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/auth/v2/consent/active-documents/` | pública | AllowAny (público); solo lectura; aislado por tenant; consentimiento Ley 1581 | Return both active legal documents (privacy policy + tenant terms) for public onboarding. |
| GET | `/auth/v2/consent/active-policy/` | pública | AllowAny (público); solo lectura; consentimiento Ley 1581 | Return the currently active data-processing policy for public onboarding. |

**`auth/v2/login`** (1 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/auth/v2/login/` | pública | — | Check the credentials and return the REST Token if the credentials are valid and authenticated. |

**`auth/v2/refresh`** (1 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/auth/v2/refresh/` | JWT | — | Takes a refresh type JSON web token and returns an access type JSON web token if the refresh token is valid. |

**`auth/v2/token`** (1 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/auth/v2/token/verify/` | JWT | — | Takes a token and indicates if it is valid. |

**`auth/v2/logout`** (1 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/auth/v2/logout/` | JWT | — | — |

**`auth/v2/sign-up`** (1 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/auth/v2/sign-up/` | pública | — | — |

**`auth/v2/verify-email`** (1 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/auth/v2/verify-email/` | pública | — | — |

**`auth/v2/account-confirm-email`** (2 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/auth/v2/account-confirm-email/` | pública | — | — |
| POST | `/auth/v2/account-confirm-email/{key}/` | pública | — | — |

**`auth/v2/entra-id`** (2 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/auth/v2/entra-id/login/complete/` | pública | aislado por tenant | Callback view for Entra ID Login flow. |
| POST | `/auth/v2/entra-id/login/complete/` | pública | — | Complete (or claim) a profile for the identity proven by the GET. |

**`auth/v2/forgot-password`** (1 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/auth/v2/forgot-password/` | pública | — | — |

**`auth/v2/verify-token-reset-password`** (1 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/auth/v2/verify-token-reset-password/` | pública | — | — |

**`auth/v2/reset-password`** (1 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/auth/v2/reset-password/` | pública | — | — |

### Operaciones masivas

- Edición masiva por modelo (uso administrativo) — 4 operaciones

**`api/v2/bulk-operation`** (4 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| DELETE | `/api/v2/bulk-operation/{model_name}/` | JWT | — | — |
| GET | `/api/v2/bulk-operation/{model_name}/` | JWT | — | — |
| POST | `/api/v2/bulk-operation/{model_name}/` | JWT | — | — |
| PUT | `/api/v2/bulk-operation/{model_name}/` | JWT | — | — |

### Catálogos de dominio

- 22 catálogos de referencia (países, áreas, líneas, ODS, skills…) — 22 operaciones

**`api/v2/index`** (22 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/index/age-ranges/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/areas/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/cities/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/countries/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/currencies/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/education-programs/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| POST | `/api/v2/index/education-programs/` | JWT | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/education-types/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/file-types/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/fraction-types/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/industry-types/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/interesting-topics/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| POST | `/api/v2/index/interesting-topics/` | JWT | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/languages/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/lines/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/media-types/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/ns4-access/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/ods/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/platforms/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/right-types/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/skills/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |
| GET | `/api/v2/index/social-networks/` | pública | documenta permisos | Indic* reference catalogs are public to read; writes require auth. |

### Empresas y prototipos

- Empresas, prototipos de servicio, emparejamiento con expertos — 28 operaciones

**`api/v2/enterprise`** (28 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/enterprise/` | JWT | — | Marca cada fila con `in_collection` respecto de `?collection_id=<id>`. |
| GET | `/api/v2/enterprise/enterprise-badges-index/` | JWT | — | — |
| GET | `/api/v2/enterprise/enterprise-identifiers-index/` | JWT | — | — |
| GET | `/api/v2/enterprise/enterprise-status-index/` | JWT | — | — |
| GET | `/api/v2/enterprise/enterprise-types-index/` | JWT | — | — |
| GET | `/api/v2/enterprise/match-detail/{id}/` | JWT | — | — |
| GET | `/api/v2/enterprise/person-enterprises/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/enterprise/person-enterprises/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/enterprise/person-enterprises/{cfpersid}/enterprises/` | pública | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| DELETE | `/api/v2/enterprise/person-enterprises/{resenterid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/enterprise/person-enterprises/{resenterid}/` | pública | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| PATCH | `/api/v2/enterprise/person-enterprises/{resenterid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| PUT | `/api/v2/enterprise/person-enterprises/{resenterid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/enterprise/person-enterprises/{resenterid}/ns4-access/` | JWT | — | — |
| POST | `/api/v2/enterprise/person-enterprises/{resenterid}/ns4-access/` | JWT | — | — |
| DELETE | `/api/v2/enterprise/person-enterprises/{resenterid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/enterprise/person-enterprises/{resenterid}/ns4-access/{id}/` | JWT | — | — |
| PATCH | `/api/v2/enterprise/person-enterprises/{resenterid}/ns4-access/{id}/` | JWT | — | — |
| PUT | `/api/v2/enterprise/person-enterprises/{resenterid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/enterprise/person-enterprises/{resenterid}/publication-years/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/enterprise/person-enterprises/{resenterid}/restore/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/enterprise/person-enterprises/{resenterid}/submit-for-evaluation/` | JWT | — | Submit a production for committee evaluation. |
| POST | `/api/v2/enterprise/person-link-to-enterprise/link/` | JWT | — | Viewset to link with an enterprise |
| POST | `/api/v2/enterprise/person-link-to-enterprise/unlink/` | JWT | — | Viewset to link with an enterprise |
| GET | `/api/v2/enterprise/search-faceted-v2/` | pública | — | Endpoint principal de búsqueda con facetas |
| GET | `/api/v2/enterprise/search-faceted-v2/{id}/recommendations/` | pública | — | Devuelve publicaciones similares basadas en el contenido del documento actual. |
| GET | `/api/v2/enterprise/search-faceted/` | pública | — | — |
| GET | `/api/v2/enterprise/{id}/details/` | JWT | — | Return a patent details to end-user profile view. |

### Eventos

- Catálogo y agenda de eventos — 4 operaciones

**`api/v2/event`** (4 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/event/` | JWT | — | — |
| POST | `/api/v2/event/catalog-events/` | JWT | — | Crea eventos de catálogo (origin=catalog) desde el modal de búsqueda. |
| GET | `/api/v2/event/catalog-events/types/` | JWT | — | Tipos de evento para el formulario de creación. |
| GET | `/api/v2/event/search-faceted/` | pública | — | — |

### Financiamiento

- Convocatorias de fondos y sus capítulos de presupuesto — 25 operaciones

**`api/v2/funding`** (25 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/funding/` | JWT | — | — |
| POST | `/api/v2/funding/about-of/` | JWT | — | — |
| POST | `/api/v2/funding/check-application/` | JWT | — | Endpoint para verificar si un usuario puede aplicar a una convocatoria |
| POST | `/api/v2/funding/financial-items/` | JWT | — | — |
| POST | `/api/v2/funding/financial-orgs/` | JWT | — | — |
| GET | `/api/v2/funding/funding-call-type-index/` | JWT | — | — |
| GET | `/api/v2/funding/funding-item-type-index/` | JWT | — | — |
| GET | `/api/v2/funding/funding-type-index/` | JWT | — | — |
| POST | `/api/v2/funding/general-info/` | JWT | — | — |
| GET | `/api/v2/funding/general-list/` | JWT | — | GET: /api/v2/funding/general-list/ |
| POST | `/api/v2/funding/ns4/` | JWT | — | — |
| POST | `/api/v2/funding/publish/` | JWT | — | — |
| GET | `/api/v2/funding/search-faceted/` | pública | — | — |
| PATCH | `/api/v2/funding/{aboutofid}/about-of/` | JWT | — | PATCH: /api/v2/funding/{aboutofid}/about-of/ |
| GET | `/api/v2/funding/{cffundid}/financial-items/detail/` | JWT | — | GET: /api/v2/funding/{cffundid}/financial-orgs/ |
| GET | `/api/v2/funding/{cffundid}/financial-items/types/` | JWT | — | — |
| GET | `/api/v2/funding/{cffundid}/financial-orgs/detail/` | JWT | — | GET: /api/v2/funding/{cffundid}/financial-orgs/ |
| PATCH | `/api/v2/funding/{cffundid}/general-info/` | JWT | — | PATCH: /api/v2/funding/{cffundid}/general-info/ |
| GET | `/api/v2/funding/{cffundid}/general/` | pública | — | GET: /api/v2/funding/{cffundid}/general/ |
| PATCH | `/api/v2/funding/{cforgunitfundid}/financial-orgs/` | JWT | — | — |
| DELETE | `/api/v2/funding/{cforgunitfundid}/remove/financial-orgs/` | JWT | — | — |
| PATCH | `/api/v2/funding/{fundingitemsid}/financial-items/` | JWT | — | — |
| DELETE | `/api/v2/funding/{fundingitemsid}/remove/financial-items/` | JWT | — | — |
| PATCH | `/api/v2/funding/{ns4id}/ns4/` | JWT | — | — |
| DELETE | `/api/v2/funding/{ns4id}/remove/ns4/` | JWT | — | — |

### Postulaciones a fondos

- Propuestas de financiamiento, PRESUPUESTO, aliados y envío — 87 operaciones

**`api/v2/funding-proposal`** (87 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/funding-proposal/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/add-areas/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/add-beneficiary-groups/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/add-focus-topics/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/add-ods/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/allie-org/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/allie-participant/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/apply-org/` | JWT | — | POST: /api/v2/funding-proposal/apply-org/ |
| POST | `/api/v2/funding-proposal/apply-support-org/` | JWT | — | POST: /api/v2/funding-proposal/apply-support-org/ |
| GET | `/api/v2/funding-proposal/area-topics/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/basic-info/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/beneficiary-groups/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/budget-items/` | JWT | — | Listar items del tipo especificado para una propuesta específica. |
| POST | `/api/v2/funding-proposal/budget-items/` | JWT | — | Crear nuevo item del tipo especificado. |
| GET | `/api/v2/funding-proposal/budget-items/subtypes/` | JWT | — | ViewSet para manejar CRUD específico por tipo de item. |
| GET | `/api/v2/funding-proposal/budget-items/{cffundpropid}/available-types/` | JWT | — | Obtener solo los tipos de items que existen para una propuesta específica. |
| GET | `/api/v2/funding-proposal/budget-items/{cffundpropid}/totals/` | JWT | — | ViewSet para manejar CRUD específico por tipo de item. |
| DELETE | `/api/v2/funding-proposal/budget-items/{id}/` | JWT | — | Eliminar item específico del tipo indicado. |
| GET | `/api/v2/funding-proposal/budget-items/{id}/` | JWT | — | Obtener item específico del tipo indicado. |
| PATCH | `/api/v2/funding-proposal/budget-items/{id}/` | JWT | — | Actualizar parcialmente item del tipo especificado (PATCH). |
| PUT | `/api/v2/funding-proposal/budget-items/{id}/` | JWT | — | Actualizar completamente item del tipo especificado (PUT). |
| GET | `/api/v2/funding-proposal/document-type-index/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/download-csv/` | JWT | — | Recibe una lista de IDs en el body y devuelve un CSV con los registros seleccionados. |
| POST | `/api/v2/funding-proposal/evaluation/answer/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/evaluation/send_evaluation/` | JWT | proceso de evaluación | Finaliza la evaluación: valida el concepto final y la identidad del evaluador, la marca como enviada (status = SENT) y calcula is_approved si la convo |
| GET | `/api/v2/funding-proposal/evaluation/{cffundid}/rubric/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/evaluation/{evaluation_id}/pdf/` | JWT | documenta permisos; proceso de evaluación | Descarga el PDF (formato FO-IN-003) del resultado de una evaluación ya emitida. |
| PATCH | `/api/v2/funding-proposal/evaluation/{id}/answer/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/expected-results-type-index/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/focus-topics/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/general-list/` | JWT | — | GET: /api/v2/funding-proposal/general-list/ |
| GET | `/api/v2/funding-proposal/impact-period-type-index/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/impacts/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/impacts/` | JWT | — | — |
| DELETE | `/api/v2/funding-proposal/impacts/{id}/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/impacts/{id}/` | JWT | — | — |
| PATCH | `/api/v2/funding-proposal/impacts/{id}/` | JWT | — | — |
| PUT | `/api/v2/funding-proposal/impacts/{id}/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/management-list/` | JWT | — | GET: /api/v2/funding-proposal/management-list/ |
| POST | `/api/v2/funding-proposal/managment/assign-evaluation/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/managment/change-status/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/managment/evaluation-list/{cffundpropid}/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/managment/has-conflict/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/managment/my-evaluations/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/managment/send-evaluation-invitation/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/managment/{cffundid}/conflict-interest/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/managment/{cffundpropid}/can-evaluate/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/managment/{cffundpropid}/evaluation-detail/` | JWT | — | — |
| DELETE | `/api/v2/funding-proposal/managment/{id}/remove-evaluator/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/narrative/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/ns4-access/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/ns4-access/` | JWT | — | — |
| DELETE | `/api/v2/funding-proposal/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/ns4-access/{id}/` | JWT | — | — |
| PATCH | `/api/v2/funding-proposal/ns4-access/{id}/` | JWT | — | — |
| PUT | `/api/v2/funding-proposal/ns4-access/{id}/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/participant/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/schedules/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/schedules/` | JWT | — | — |
| DELETE | `/api/v2/funding-proposal/schedules/{id}/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/schedules/{id}/` | JWT | — | — |
| PATCH | `/api/v2/funding-proposal/schedules/{id}/` | JWT | — | — |
| PUT | `/api/v2/funding-proposal/schedules/{id}/` | JWT | — | — |
| POST | `/api/v2/funding-proposal/send/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/subarea-topics/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/subline-focus-topics/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/tech-innovation-index/` | JWT | — | — |
| PATCH | `/api/v2/funding-proposal/update/allie-org/` | JWT | — | — |
| PATCH | `/api/v2/funding-proposal/update/apply-org/` | JWT | — | PATCH: /api/v2/funding-proposal/update/apply-org/ |
| PATCH | `/api/v2/funding-proposal/update/apply-support-org/` | JWT | — | PATCH: /api/v2/funding-proposal/update/apply-support-org/ |
| PATCH | `/api/v2/funding-proposal/{cffundpersid}/allie-participant/` | JWT | — | PATCH: /api/v2/funding/{cffundpropid}/participant/ |
| PATCH | `/api/v2/funding-proposal/{cffundpersid}/participant/` | JWT | — | PATCH: /api/v2/funding/{cffundpropid}/participant/ |
| DELETE | `/api/v2/funding-proposal/{cffundpersid}/remove/allie-participant/` | JWT | — | — |
| DELETE | `/api/v2/funding-proposal/{cffundpersid}/remove/participant/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/{cffundpropid}/allie-org/list/` | JWT | — | PATCH: /api/v2/funding/{cffundpropid}/narrative/ |
| GET | `/api/v2/funding-proposal/{cffundpropid}/allie-participants/list/` | JWT | — | — |
| GET | `/api/v2/funding-proposal/{cffundpropid}/apply-org/list/` | JWT | — | GET: /api/v2/funding-proposal/{cffundpropid}/apply-org/list/ |
| GET | `/api/v2/funding-proposal/{cffundpropid}/apply-support-org/list/` | JWT | — | GET: /api/v2/funding-proposal/{cffundpropid}/apply-support-org/list/ |
| PATCH | `/api/v2/funding-proposal/{cffundpropid}/basic-info/` | JWT | — | PATCH: /api/v2/funding-proposal/{cffundpropid}/basic-info/ |
| GET | `/api/v2/funding-proposal/{cffundpropid}/detail/` | JWT | — | GET: /api/v2/funding/{cffundid}/detail/ |
| PATCH | `/api/v2/funding-proposal/{cffundpropid}/narrative/` | JWT | — | PATCH: /api/v2/funding/{cffundpropid}/narrative/ |
| GET | `/api/v2/funding-proposal/{cffundpropid}/participants/list/` | JWT | — | PATCH: /api/v2/funding/{cffundpropid}/narrative/ |
| GET | `/api/v2/funding-proposal/{cffundpropid}/pdf/` | JWT | — | Return an presigned url of badge full text url. |
| PATCH | `/api/v2/funding-proposal/{cffundpropid}/update-areas/` | JWT | — | PATCH: /api/v2/funding-proposal/{cffundpropid}/update-areas/ |
| PATCH | `/api/v2/funding-proposal/{cffundpropid}/update-beneficiary-groups/` | JWT | — | PATCH: /api/v2/funding-proposal/{cffundpropid}/update-areas/ |
| PATCH | `/api/v2/funding-proposal/{cffundpropid}/update-focus-topics/` | JWT | — | PATCH: /api/v2/funding-proposal/{cffundpropid}/update-focus-topics/ |
| PATCH | `/api/v2/funding-proposal/{cffundpropid}/update-ods/` | JWT | — | PATCH: /api/v2/funding-proposal/{cffundpropid}/update-ods/ |

### Producción jurídica

- Leyes, decretos y normas (producción normativa) — 28 operaciones

**`api/v2/law`** (28 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/law/` | JWT | — | Marca cada fila con `in_collection` respecto de `?collection_id=<id>`. |
| GET | `/api/v2/law/law-badges-index/` | JWT | — | — |
| GET | `/api/v2/law/law-identifiers-index/` | JWT | — | — |
| GET | `/api/v2/law/law-status-index/` | JWT | — | — |
| GET | `/api/v2/law/law-types-index/` | JWT | — | — |
| GET | `/api/v2/law/match-detail/{id}/` | JWT | — | — |
| GET | `/api/v2/law/person-laws/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/law/person-laws/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/law/person-laws/{cfpersid}/laws/` | pública | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| DELETE | `/api/v2/law/person-laws/{reslawid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/law/person-laws/{reslawid}/` | pública | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| PATCH | `/api/v2/law/person-laws/{reslawid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| PUT | `/api/v2/law/person-laws/{reslawid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/law/person-laws/{reslawid}/ns4-access/` | JWT | — | — |
| POST | `/api/v2/law/person-laws/{reslawid}/ns4-access/` | JWT | — | — |
| DELETE | `/api/v2/law/person-laws/{reslawid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/law/person-laws/{reslawid}/ns4-access/{id}/` | JWT | — | — |
| PATCH | `/api/v2/law/person-laws/{reslawid}/ns4-access/{id}/` | JWT | — | — |
| PUT | `/api/v2/law/person-laws/{reslawid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/law/person-laws/{reslawid}/publication-years/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/law/person-laws/{reslawid}/restore/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/law/person-laws/{reslawid}/submit-for-evaluation/` | JWT | — | Submit a production for committee evaluation. |
| POST | `/api/v2/law/person-link-to-law/link/` | JWT | — | Viewset to link persons to laws. |
| POST | `/api/v2/law/person-link-to-law/unlink/` | JWT | — | Viewset to link persons to laws. |
| GET | `/api/v2/law/search-faceted-v2/` | pública | — | Endpoint principal de búsqueda con facetas |
| GET | `/api/v2/law/search-faceted-v2/{id}/recommendations/` | pública | — | Devuelve publicaciones similares basadas en el contenido del documento actual. |
| GET | `/api/v2/law/search-faceted/` | pública | — | — |
| GET | `/api/v2/law/{id}/details/` | JWT | — | Return a project details to end-user profile view. |

### Instituciones

- Universidades y entidades (tenant, unidades) — 81 operaciones

**`api/v2/organization`** (81 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/organization/` | JWT | — | Marca cada fila con `in_collection` respecto de `?collection_id=<id>`. |
| POST | `/api/v2/organization/` | JWT | — | Marca cada fila con `in_collection` respecto de `?collection_id=<id>`. |
| POST | `/api/v2/organization/about/` | JWT | — | — |
| PATCH | `/api/v2/organization/about/{cforgunitid}/` | JWT | — | — |
| PUT | `/api/v2/organization/about/{cforgunitid}/` | JWT | — | — |
| GET | `/api/v2/organization/about/{cforgunitid}/details/` | JWT | — | Return the details to end-user profile view. |
| GET | `/api/v2/organization/about/{cforgunitid}/edit-form/` | JWT | — | Return the details to about edit-form. |
| GET | `/api/v2/organization/analytics/{id}/ods/` | JWT | — | — |
| GET | `/api/v2/organization/analytics/{id}/production/` | JWT | — | — |
| GET | `/api/v2/organization/analytics/{id}/project/` | JWT | — | — |
| POST | `/api/v2/organization/badges/` | JWT | — | ** A viewset to controll workflow to grant and CRUD badges. |
| PATCH | `/api/v2/organization/badges/granted/change/{badge_id}/{cforgunitid}/` | JWT | — | ** A viewset to controll workflow to grant and CRUD badges. |
| DELETE | `/api/v2/organization/badges/granted/remove/{badge_id}/` | JWT | — | ** A viewset to controll workflow to grant and CRUD badges. |
| PATCH | `/api/v2/organization/badges/received/change/{badge_id}/{cforgunitid}/` | JWT | — | ** A viewset to controll workflow to grant and CRUD badges. |
| DELETE | `/api/v2/organization/badges/received/remove/{badge_id}/{cforgunitid}/` | JWT | — | ** A viewset to controll workflow to grant and CRUD badges. |
| GET | `/api/v2/organization/badges/{cforgunitid}/edit-form/granted/` | JWT | — | Return a list of badges granted from an specific organization. |
| GET | `/api/v2/organization/badges/{cforgunitid}/edit-form/received/` | JWT | — | Return a list to organization end-user view granted badges. |
| POST | `/api/v2/organization/badges/{cforgunitid}/edit-form/received/` | JWT | — | Return a list to organization end-user view granted badges. |
| GET | `/api/v2/organization/badges/{cforgunitid}/granted/` | JWT | — | Return a list to organization end-user view granted badges. |
| GET | `/api/v2/organization/badges/{cforgunitid}/received/` | JWT | — | Return a list to organization end-user view received badges. |
| DELETE | `/api/v2/organization/badges/{id}/` | JWT | — | ** A viewset to controll workflow to grant and CRUD badges. |
| PATCH | `/api/v2/organization/badges/{id}/` | JWT | — | ** A viewset to controll workflow to grant and CRUD badges. |
| PUT | `/api/v2/organization/badges/{id}/` | JWT | — | ** A viewset to controll workflow to grant and CRUD badges. |
| GET | `/api/v2/organization/badges/{id}/granted-badge-full-text-url/` | JWT | — | Return an presigned url of badge full text url. |
| GET | `/api/v2/organization/badges/{id}/received-badge-full-text-url/` | JWT | — | Return an presigned url of badge full text url. |
| GET | `/api/v2/organization/capacities/{id}/` | JWT | — | — |
| PATCH | `/api/v2/organization/capacities/{id}/` | JWT | — | — |
| PUT | `/api/v2/organization/capacities/{id}/` | JWT | — | — |
| GET | `/api/v2/organization/capacities/{id}/details/` | JWT | — | Return the details to end-user profile view. |
| GET | `/api/v2/organization/capacities/{id}/edit-form/` | JWT | — | Return the details to about edit-form. |
| PATCH | `/api/v2/organization/connections-requests/request/{personcfpersorgunit_id}/` | JWT | — | — |
| GET | `/api/v2/organization/connections-requests/{id}/` | JWT | — | Return a requests list of connections sent by experts. |
| GET | `/api/v2/organization/contact/{id}/` | JWT | — | — |
| PATCH | `/api/v2/organization/contact/{id}/` | JWT | — | — |
| PUT | `/api/v2/organization/contact/{id}/` | JWT | — | — |
| GET | `/api/v2/organization/digital-indentity/{id}/` | JWT | — | — |
| PATCH | `/api/v2/organization/digital-indentity/{id}/` | JWT | — | — |
| PUT | `/api/v2/organization/digital-indentity/{id}/` | JWT | — | — |
| PATCH | `/api/v2/organization/general/{id}/` | JWT | — | — |
| PUT | `/api/v2/organization/general/{id}/` | JWT | — | — |
| GET | `/api/v2/organization/general/{id}/details/` | JWT | — | Return the details to end-user profile view. |
| GET | `/api/v2/organization/general/{id}/edit-form/` | JWT | — | Return the details to about edit-form. |
| GET | `/api/v2/organization/main-organization/` | JWT | — | — |
| GET | `/api/v2/organization/my-organizations/committee-evaluation-requests/{model_name}/all/` | JWT | requiere admin; documenta permisos | An endpoint to controll the differents sections, permissions and actions for managements groups, like administrator, managers and leaders. |
| POST | `/api/v2/organization/my-organizations/filiation-request-multiple/update/{model_name}/` | JWT | — | Approve or reject a request of affiliation. |
| PATCH | `/api/v2/organization/my-organizations/filiation-request/{id}/{model_name}/` | JWT | — | Approve or reject a request of affiliation. |
| GET | `/api/v2/organization/my-organizations/organizations-list/` | JWT | requiere admin; documenta permisos | An endpoint to controll the differents sections, permissions and actions for managements groups, like administrator, managers and leaders. |
| GET | `/api/v2/organization/my-organizations/requests/{model_name}/all/` | JWT | requiere admin | Return ALL requests for all organizations filtered by model type. |
| GET | `/api/v2/organization/my-organizations/{cforgunitid}/content/{model_name}/list/` | JWT | — | Return a list of contents based on the model name. |
| GET | `/api/v2/organization/my-organizations/{cforgunitid}/requests/{model_name}/list/` | JWT | — | Return a list of requests based on the model name. |
| GET | `/api/v2/organization/my-organizations/{id}/details/` | JWT | requiere admin | Return the detail view for admins users.. |
| GET | `/api/v2/organization/organization-badges-index/` | JWT | — | — |
| POST | `/api/v2/organization/organization-connections/experts/` | JWT | — | — |
| DELETE | `/api/v2/organization/organization-connections/experts/connection/{personcfpersorgunit_id}/` | JWT | — | — |
| GET | `/api/v2/organization/organization-connections/experts/{id}/` | JWT | — | Get a list of experts based on organization children. |
| PATCH | `/api/v2/organization/organization-connections/experts/{id}/` | JWT | — | — |
| PUT | `/api/v2/organization/organization-connections/experts/{id}/` | JWT | — | — |
| GET | `/api/v2/organization/organization-connections/experts/{id}/actives/` | JWT | — | Return the list of actives experts. |
| GET | `/api/v2/organization/organization-connections/experts/{id}/history/` | JWT | — | Return the list of actives experts. |
| GET | `/api/v2/organization/organization-dc-identifiers-index/` | JWT | — | — |
| POST | `/api/v2/organization/organization-projects/{cfprojid}/ns4-access/` | JWT | — | — |
| DELETE | `/api/v2/organization/organization-projects/{cfprojid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/organization/organization-projects/{cfprojid}/ns4-access/{id}/` | JWT | — | — |
| PATCH | `/api/v2/organization/organization-projects/{cfprojid}/ns4-access/{id}/` | JWT | — | — |
| PUT | `/api/v2/organization/organization-projects/{cfprojid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/organization/organization-rol-index/` | JWT | — | — |
| GET | `/api/v2/organization/organization-types-index/` | JWT | — | — |
| GET | `/api/v2/organization/organizations/` | JWT | — | Get or create the relationship between organizations. |
| POST | `/api/v2/organization/organizations/` | JWT | — | Get or create the relationship between organizations. |
| GET | `/api/v2/organization/organizations/relationships/{cforgunitid}/` | pública | — | Get or create the relationship between organizations. |
| GET | `/api/v2/organization/productions/{id}/enterprises/` | JWT | — | Return the enterprises list of an organization. |
| GET | `/api/v2/organization/productions/{id}/laws/` | JWT | — | Return the laws list of an organization. |
| GET | `/api/v2/organization/productions/{id}/patents/` | JWT | — | Return the patents list of an organization. |
| GET | `/api/v2/organization/productions/{id}/products/` | JWT | — | Return the products list of an organization. |
| GET | `/api/v2/organization/productions/{id}/publications/` | JWT | — | Return the publications list of an organization. |
| POST | `/api/v2/organization/projects/` | JWT | — | — |
| GET | `/api/v2/organization/projects/{macro_type}/{id}/project-list/` | JWT | — | Return the project list to end-user projects view, based on macro types params |
| GET | `/api/v2/organization/search-faceted-v2/` | pública | — | Endpoint principal de búsqueda con facetas |
| GET | `/api/v2/organization/search-faceted-v2/{id}/recommendations/` | pública | — | Devuelve organizaciones similares basadas en el contenido del documento actual. |
| GET | `/api/v2/organization/search-faceted/` | pública | — | — |
| POST | `/api/v2/organization/send-filiation-request/{model_name}/` | JWT | — | Send filiation request to person. |

### Patentes

- Patentes nacionales y extranjeras — 28 operaciones

**`api/v2/patent`** (28 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/patent/` | JWT | — | Marca cada fila con `in_collection` respecto de `?collection_id=<id>`. |
| GET | `/api/v2/patent/match-detail/{id}/` | JWT | — | — |
| GET | `/api/v2/patent/patent-badges-index/` | JWT | — | — |
| GET | `/api/v2/patent/patent-identifiers-index/` | JWT | — | — |
| GET | `/api/v2/patent/patent-status-index/` | JWT | — | — |
| GET | `/api/v2/patent/patent-types-index/` | JWT | — | — |
| POST | `/api/v2/patent/person-link-to-patent/link/` | JWT | — | Viewset to link persons to patents. |
| POST | `/api/v2/patent/person-link-to-patent/unlink/` | JWT | — | Viewset to link persons to patents. |
| GET | `/api/v2/patent/person-patents/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/patent/person-patents/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/patent/person-patents/{cfpersid}/patents/` | pública | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| DELETE | `/api/v2/patent/person-patents/{cfrespatid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/patent/person-patents/{cfrespatid}/` | pública | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| PATCH | `/api/v2/patent/person-patents/{cfrespatid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| PUT | `/api/v2/patent/person-patents/{cfrespatid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/patent/person-patents/{cfrespatid}/ns4-access/` | JWT | — | — |
| POST | `/api/v2/patent/person-patents/{cfrespatid}/ns4-access/` | JWT | — | — |
| DELETE | `/api/v2/patent/person-patents/{cfrespatid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/patent/person-patents/{cfrespatid}/ns4-access/{id}/` | JWT | — | — |
| PATCH | `/api/v2/patent/person-patents/{cfrespatid}/ns4-access/{id}/` | JWT | — | — |
| PUT | `/api/v2/patent/person-patents/{cfrespatid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/patent/person-patents/{cfrespatid}/publication-years/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/patent/person-patents/{cfrespatid}/restore/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/patent/person-patents/{cfrespatid}/submit-for-evaluation/` | JWT | — | Submit a production for committee evaluation. |
| GET | `/api/v2/patent/search-faceted-v2/` | pública | — | Endpoint principal de búsqueda con facetas |
| GET | `/api/v2/patent/search-faceted-v2/{id}/recommendations/` | pública | — | Devuelve publicaciones similares basadas en el contenido del documento actual. |
| GET | `/api/v2/patent/search-faceted/` | pública | — | — |
| GET | `/api/v2/patent/{id}/details/` | JWT | — | Return a patent details to end-user profile view. |

### Expertos e investigadores

- Directorio de personas, afiliación, roles y productividad — 74 operaciones
- Fichas de experto y trazabilidad de perfil (about-of) — 3 operaciones

**`api/v2/person`** (74 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/person/` | JWT | — | — |
| GET | `/api/v2/person/about-of/academic-formation/` | pública | — | — |
| GET | `/api/v2/person/about-of/academic-formation/{id}/` | pública | — | — |
| GET | `/api/v2/person/about-of/capacities/{id}/` | pública | — | — |
| GET | `/api/v2/person/about-of/general/{id}/` | pública | — | — |
| GET | `/api/v2/person/about-of/{id}/` | JWT | — | — |
| PATCH | `/api/v2/person/about-of/{id}/` | JWT | — | — |
| PUT | `/api/v2/person/about-of/{id}/` | JWT | — | — |
| GET | `/api/v2/person/analytics/my-dashboard/` | JWT | — | — |
| GET | `/api/v2/person/analytics/{id}/ods/` | pública | — | — |
| GET | `/api/v2/person/analytics/{id}/production/` | pública | — | — |
| GET | `/api/v2/person/analytics/{id}/production_test/` | pública | — | — |
| GET | `/api/v2/person/analytics/{id}/project/` | pública | — | — |
| GET | `/api/v2/person/analytics/{id}/scholar/` | pública | — | — |
| GET | `/api/v2/person/badges/` | JWT | — | — |
| POST | `/api/v2/person/badges/` | JWT | — | — |
| GET | `/api/v2/person/badges/{cfpersid}/badges/` | pública | — | — |
| DELETE | `/api/v2/person/badges/{id}/` | JWT | — | — |
| GET | `/api/v2/person/badges/{id}/` | pública | — | — |
| PATCH | `/api/v2/person/badges/{id}/` | JWT | — | — |
| PUT | `/api/v2/person/badges/{id}/` | JWT | — | — |
| GET | `/api/v2/person/capacities/{id}/` | JWT | — | — |
| PATCH | `/api/v2/person/capacities/{id}/` | JWT | — | — |
| PUT | `/api/v2/person/capacities/{id}/` | JWT | — | — |
| GET | `/api/v2/person/cocreators/{id}/` | pública | — | — |
| GET | `/api/v2/person/connections/requests/` | JWT | — | Return a requests list of connections sent by an organization. |
| PATCH | `/api/v2/person/connections/requests/{id}/` | JWT | — | Return a requests list of connections sent by an organization. |
| PUT | `/api/v2/person/connections/requests/{id}/` | JWT | — | Return a requests list of connections sent by an organization. |
| GET | `/api/v2/person/contact-info/{id}/` | JWT | — | — |
| PATCH | `/api/v2/person/contact-info/{id}/` | JWT | — | — |
| PUT | `/api/v2/person/contact-info/{id}/` | JWT | — | — |
| GET | `/api/v2/person/digital-identity/{id}/` | JWT | — | — |
| PATCH | `/api/v2/person/digital-identity/{id}/` | JWT | — | — |
| PUT | `/api/v2/person/digital-identity/{id}/` | JWT | — | — |
| GET | `/api/v2/person/experience-academic/{id}/` | pública | — | — |
| PATCH | `/api/v2/person/experience-academic/{id}/` | JWT | — | — |
| PUT | `/api/v2/person/experience-academic/{id}/` | JWT | — | — |
| GET | `/api/v2/person/experience-industry/{id}/` | pública | — | — |
| PATCH | `/api/v2/person/experience-industry/{id}/` | JWT | — | — |
| PUT | `/api/v2/person/experience-industry/{id}/` | JWT | — | — |
| GET | `/api/v2/person/experience-investigation/{id}/` | pública | — | — |
| PATCH | `/api/v2/person/experience-investigation/{id}/` | JWT | — | — |
| PUT | `/api/v2/person/experience-investigation/{id}/` | JWT | — | — |
| POST | `/api/v2/person/external/` | JWT | — | — |
| POST | `/api/v2/person/groups/` | JWT | — | — |
| GET | `/api/v2/person/groups/{id}/` | pública | — | — |
| PATCH | `/api/v2/person/groups/{id}/` | JWT | — | — |
| PUT | `/api/v2/person/groups/{id}/` | JWT | — | — |
| POST | `/api/v2/person/hotbeds/` | JWT | — | — |
| GET | `/api/v2/person/hotbeds/{id}/` | pública | — | — |
| PATCH | `/api/v2/person/hotbeds/{id}/` | JWT | — | — |
| PUT | `/api/v2/person/hotbeds/{id}/` | JWT | — | — |
| GET | `/api/v2/person/me/` | JWT | — | — |
| PATCH | `/api/v2/person/me/` | JWT | — | Marks the Dashboard welcome tour as completed for the authenticated person. |
| GET | `/api/v2/person/notifications/products/{model_name}/` | JWT | — | — |
| POST | `/api/v2/person/notifications/products/{model_name}/` | JWT | — | — |
| GET | `/api/v2/person/person-badges-index/` | JWT | — | — |
| GET | `/api/v2/person/person-identifiers-index/` | JWT | — | — |
| GET | `/api/v2/person/person-roles-index/` | JWT | — | — |
| GET | `/api/v2/person/person-types-index/` | pública | — | — |
| GET | `/api/v2/person/personal-info/{id}/` | JWT | — | — |
| PATCH | `/api/v2/person/personal-info/{id}/` | JWT | — | — |
| PUT | `/api/v2/person/personal-info/{id}/` | JWT | — | — |
| GET | `/api/v2/person/scores/` | JWT | — | — |
| POST | `/api/v2/person/scores/` | JWT | — | — |
| GET | `/api/v2/person/scores/{cfpersid}/scores/` | pública | — | — |
| DELETE | `/api/v2/person/scores/{id}/` | JWT | — | — |
| GET | `/api/v2/person/scores/{id}/` | pública | — | — |
| PATCH | `/api/v2/person/scores/{id}/` | JWT | — | — |
| PUT | `/api/v2/person/scores/{id}/` | JWT | — | — |
| GET | `/api/v2/person/search-experts/` | JWT | — | — |
| GET | `/api/v2/person/search-faceted-v2/` | pública | — | Endpoint principal de búsqueda con facetas |
| GET | `/api/v2/person/search-faceted-v2/{id}/recommendations/` | pública | — | Devuelve organizaciones similares basadas en el contenido del documento actual. |
| GET | `/api/v2/person/search-faceted/` | pública | — | — |

**`api/v3/person`** (3 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v3/person/about-of/{id}/` | JWT | — | — |
| PATCH | `/api/v3/person/about-of/{id}/` | JWT | — | — |
| PUT | `/api/v3/person/about-of/{id}/` | JWT | — | — |

### Productos de investigación

- Software, datasets, prototipos e instrumentos — 33 operaciones

**`api/v2/product`** (33 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/product/` | JWT | — | Marca cada fila con `in_collection` respecto de `?collection_id=<id>`. |
| GET | `/api/v2/product/feed/` | JWT | — | Return an list of dictionaries, where each dict is a representation of an specific instance of an investigation products, also filtered by `created_at |
| GET | `/api/v2/product/match-detail/{id}/` | JWT | — | — |
| POST | `/api/v2/product/person-link-to-product/link/` | JWT | — | Viewset to link persons to products. |
| POST | `/api/v2/product/person-link-to-product/unlink/` | JWT | — | Viewset to link persons to products. |
| GET | `/api/v2/product/person-products/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/product/person-products/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/product/person-products/me/draft-products/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/product/person-products/{cfpersid}/on-review/` | JWT | — | Return an list of dictionaries, where each dict is a representation of an specific instance of an investigation products, also filtered if `ies_check  |
| GET | `/api/v2/product/person-products/{cfpersid}/products/` | pública | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| DELETE | `/api/v2/product/person-products/{cfresprodid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/product/person-products/{cfresprodid}/` | pública | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| PATCH | `/api/v2/product/person-products/{cfresprodid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| PUT | `/api/v2/product/person-products/{cfresprodid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/product/person-products/{cfresprodid}/ns4-access/` | JWT | — | — |
| POST | `/api/v2/product/person-products/{cfresprodid}/ns4-access/` | JWT | — | — |
| DELETE | `/api/v2/product/person-products/{cfresprodid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/product/person-products/{cfresprodid}/ns4-access/{id}/` | JWT | — | — |
| PATCH | `/api/v2/product/person-products/{cfresprodid}/ns4-access/{id}/` | JWT | — | — |
| PUT | `/api/v2/product/person-products/{cfresprodid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/product/person-products/{cfresprodid}/publication-years/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/product/person-products/{cfresprodid}/restore/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/product/person-products/{cfresprodid}/submit-for-evaluation/` | JWT | — | Submit a production for committee evaluation. |
| GET | `/api/v2/product/product-badges-index/` | JWT | — | — |
| GET | `/api/v2/product/product-identifiers-index/` | JWT | — | — |
| GET | `/api/v2/product/product-status-index/` | JWT | — | — |
| GET | `/api/v2/product/product-types-index/` | JWT | — | — |
| GET | `/api/v2/product/products-by/{model_type}/` | JWT | — | Return resources based on specific `model_type`. |
| GET | `/api/v2/product/search-faceted-v2/` | pública | — | Endpoint principal de búsqueda con facetas |
| GET | `/api/v2/product/search-faceted-v2/{id}/recommendations/` | pública | — | Devuelve publicaciones similares basadas en el contenido del documento actual. |
| GET | `/api/v2/product/search-faceted/` | pública | — | — |
| GET | `/api/v2/product/types/{model_type}/options/` | JWT | — | Return macro types based on a `model_type`. |
| GET | `/api/v2/product/{id}/details/` | JWT | — | Return a project details to end-user profile view. |

### Proyectos de investigación

- Proyectos, hitos y responsables — 63 operaciones

**`api/v2/project`** (28 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/project/` | JWT | — | Marca cada fila con `in_collection` respecto de `?collection_id=<id>`. |
| GET | `/api/v2/project/match-detail/{id}/` | JWT | — | — |
| POST | `/api/v2/project/person-link-to-project/link/` | JWT | — | Viewset to link persons to projects. |
| POST | `/api/v2/project/person-link-to-project/unlink/` | JWT | — | Viewset to link persons to projects. |
| GET | `/api/v2/project/person-projects/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/project/person-projects/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/project/person-projects/{cfpersid}/projects/` | pública | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| DELETE | `/api/v2/project/person-projects/{cfprojid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/project/person-projects/{cfprojid}/` | pública | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| PATCH | `/api/v2/project/person-projects/{cfprojid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| PUT | `/api/v2/project/person-projects/{cfprojid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/project/person-projects/{cfprojid}/ns4-access/` | JWT | — | — |
| POST | `/api/v2/project/person-projects/{cfprojid}/ns4-access/` | JWT | — | — |
| DELETE | `/api/v2/project/person-projects/{cfprojid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/project/person-projects/{cfprojid}/ns4-access/{id}/` | JWT | — | — |
| PATCH | `/api/v2/project/person-projects/{cfprojid}/ns4-access/{id}/` | JWT | — | — |
| PUT | `/api/v2/project/person-projects/{cfprojid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/project/person-projects/{cfprojid}/publication-years/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/project/person-projects/{cfprojid}/restore/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/project/person-projects/{cfprojid}/submit-for-evaluation/` | JWT | — | Submit a production for committee evaluation. |
| GET | `/api/v2/project/project-identifiers-index/` | JWT | — | — |
| GET | `/api/v2/project/project-macro-types-index/` | JWT | — | — |
| GET | `/api/v2/project/project-status-index/` | JWT | — | — |
| GET | `/api/v2/project/project-types-index/` | JWT | — | — |
| GET | `/api/v2/project/search-faceted-v2/` | pública | — | Endpoint principal de búsqueda con facetas |
| GET | `/api/v2/project/search-faceted-v2/{id}/recommendations/` | pública | — | Devuelve publicaciones similares basadas en el contenido del documento actual. |
| GET | `/api/v2/project/search-faceted/` | pública | — | — |
| GET | `/api/v2/project/{id}/details/` | JWT | — | Return a project details to end-user profile view. |

**`api/v2/project-manager`** (35 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/project-manager/` | JWT | — | — |
| GET | `/api/v2/project-manager/backlog/` | JWT | — | ViewSet para gestionar el Backlog de un proyecto. |
| GET | `/api/v2/project-manager/backlog/project/{cffundpropid}/` | JWT | — | GET /backlog/project/{cffundpropid} Lista todas las tareas del backlog de un proyecto. |
| POST | `/api/v2/project-manager/backlog/project/{cffundpropid}/move-to-epic/` | JWT | — | POST /backlog/project/{cffundpropid}/move-to-epic Mueve una tarea del backlog a un Epic. |
| POST | `/api/v2/project-manager/backlog/project/{cffundpropid}/move-to-sprint/` | JWT | — | POST /backlog/project/{cffundpropid}/move-to-sprint Mueve una tarea del backlog a un Sprint. |
| DELETE | `/api/v2/project-manager/backlog/project/{cffundpropid}/task/{task_id}/` | JWT | — | DELETE /backlog/project/{cffundpropid}/task/{task_id} Elimina una tarea del backlog (soft delete). |
| GET | `/api/v2/project-manager/backlog/task-detail/project/{cffundpropid}/task/{task_id}/` | JWT | — | GET /backlog/project/{cffundpropid}/task/{task_id} Obtiene una tarea específica del backlog. |
| POST | `/api/v2/project-manager/epic/` | JWT | — | — |
| DELETE | `/api/v2/project-manager/epic/{epic_id}/` | JWT | — | — |
| GET | `/api/v2/project-manager/epic/{epic_id}/` | JWT | — | — |
| PATCH | `/api/v2/project-manager/epic/{epic_id}/` | JWT | — | — |
| GET | `/api/v2/project-manager/is-scrum-master/{cffundpropid}/` | JWT | — | GET /is-crum-master - Verify if the user is scrum master of the project. |
| GET | `/api/v2/project-manager/my-projects/` | JWT | — | — |
| POST | `/api/v2/project-manager/project/{cffundpropid}/start-management/` | JWT | — | POST /project/{cffundpropid}/start-management - Inicia la gestión del proyecto |
| POST | `/api/v2/project-manager/resources/assign/` | JWT | — | POST /api/funding-proposals/assign/ Asigna un recurso a una tarea. |
| DELETE | `/api/v2/project-manager/resources/task-resource/{task_resource_id}/` | JWT | — | PATCH /api/funding-proposals/task-resource/<task_resource_id>/ DELETE /api/funding-proposals/task-resource/<task_resource_id>/ Actualiza o elimina una |
| PATCH | `/api/v2/project-manager/resources/task-resource/{task_resource_id}/` | JWT | — | PATCH /api/funding-proposals/task-resource/<task_resource_id>/ DELETE /api/funding-proposals/task-resource/<task_resource_id>/ Actualiza o elimina una |
| GET | `/api/v2/project-manager/resources/task/{task_id}/resources/` | JWT | — | GET /api/funding-proposals/task/<task_id>/resources/ Retorna todos los recursos asignados a una tarea específica. |
| GET | `/api/v2/project-manager/resources/{cffundpropid}/availability/` | JWT | — | GET /api/funding-proposals/<cffundpropid>/resources/ Retorna todos los recursos disponibles para una FundingProposal específica. |
| GET | `/api/v2/project-manager/resources/{cffundpropid}/available-types/` | JWT | — | Los rubros con partidas en este proyecto: `{"available_types": [...]}`. |
| POST | `/api/v2/project-manager/task/` | JWT | — | — |
| GET | `/api/v2/project-manager/task/{task_id}/detail/` | JWT | — | GET /tasks/{task_id}/detail - Obtiene el detalle completo de un Task Retorna toda la información del Task sin incluir relaciones. |
| DELETE | `/api/v2/project-manager/tasks/{task_id}/` | JWT | — | PUT/PATCH → Actualiza una Task DELETE → Soft delete de la Task |
| PATCH | `/api/v2/project-manager/tasks/{task_id}/` | JWT | — | PUT/PATCH → Actualiza una Task DELETE → Soft delete de la Task |
| PUT | `/api/v2/project-manager/tasks/{task_id}/` | JWT | — | PUT/PATCH → Actualiza una Task DELETE → Soft delete de la Task |
| GET | `/api/v2/project-manager/tasks/{task_id}/ns4-files/` | JWT | — | GET /tasks/{task_id}/ns4-files - Lista archivos POST /tasks/{task_id}/ns4-files - Crea archivo |
| POST | `/api/v2/project-manager/tasks/{task_id}/ns4-files/` | JWT | — | GET /tasks/{task_id}/ns4-files - Lista archivos POST /tasks/{task_id}/ns4-files - Crea archivo |
| DELETE | `/api/v2/project-manager/tasks/{task_id}/ns4-files/{file_id}/` | JWT | — | PATCH /tasks/{task_id}/ns4-files/{file_id} - Actualiza archivo DELETE /tasks/{task_id}/ns4-files/{file_id} - Elimina archivo |
| PATCH | `/api/v2/project-manager/tasks/{task_id}/ns4-files/{file_id}/` | JWT | — | PATCH /tasks/{task_id}/ns4-files/{file_id} - Actualiza archivo DELETE /tasks/{task_id}/ns4-files/{file_id} - Elimina archivo |
| GET | `/api/v2/project-manager/tasks/{task_id}/responsibles/` | JWT | — | GET /tasks/{task_id}/responsibles - Lista responsables POST /tasks/{task_id}/responsibles - Crea responsable |
| POST | `/api/v2/project-manager/tasks/{task_id}/responsibles/` | JWT | — | GET /tasks/{task_id}/responsibles - Lista responsables POST /tasks/{task_id}/responsibles - Crea responsable |
| DELETE | `/api/v2/project-manager/tasks/{task_id}/responsibles/{assignment_id}/` | JWT | — | PATCH /tasks/{task_id}/responsibles/{assignment_id} - Actualiza responsable DELETE /tasks/{task_id}/responsibles/{assignment_id} - Elimina responsable |
| PATCH | `/api/v2/project-manager/tasks/{task_id}/responsibles/{assignment_id}/` | JWT | — | PATCH /tasks/{task_id}/responsibles/{assignment_id} - Actualiza responsable DELETE /tasks/{task_id}/responsibles/{assignment_id} - Elimina responsable |
| GET | `/api/v2/project-manager/{cffundpropid}/detail/` | JWT | — | — |
| GET | `/api/v2/project-manager/{cffundpropid}/schedules/` | JWT | — | — |

### Publicaciones

- Artículos, libros, capítulos y conference papers — 31 operaciones

**`api/v2/publication`** (31 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/publication/` | JWT | — | Marca cada fila con `in_collection` respecto de `?collection_id=<id>`. |
| GET | `/api/v2/publication/match-detail/{id}/` | JWT | — | — |
| POST | `/api/v2/publication/parent-catalog-books/` | JWT | — | Crea libros padre de catálogo (origin=parent_catalog): sin autores e inmutables vía API. |
| POST | `/api/v2/publication/person-link-to-publication/link/` | JWT | — | Viewset to link persons to publications. |
| POST | `/api/v2/publication/person-link-to-publication/unlink/` | JWT | — | Viewset to link persons to publications. |
| GET | `/api/v2/publication/person-publications/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/publication/person-publications/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/publication/person-publications/{cfpersid}/publications/` | pública | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| DELETE | `/api/v2/publication/person-publications/{cfrespublid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/publication/person-publications/{cfrespublid}/` | pública | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| PATCH | `/api/v2/publication/person-publications/{cfrespublid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| PUT | `/api/v2/publication/person-publications/{cfrespublid}/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| GET | `/api/v2/publication/person-publications/{cfrespublid}/ns4-access/` | JWT | — | — |
| POST | `/api/v2/publication/person-publications/{cfrespublid}/ns4-access/` | JWT | — | — |
| DELETE | `/api/v2/publication/person-publications/{cfrespublid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/publication/person-publications/{cfrespublid}/ns4-access/{id}/` | JWT | — | — |
| PATCH | `/api/v2/publication/person-publications/{cfrespublid}/ns4-access/{id}/` | JWT | — | — |
| PUT | `/api/v2/publication/person-publications/{cfrespublid}/ns4-access/{id}/` | JWT | — | — |
| GET | `/api/v2/publication/person-publications/{cfrespublid}/publication-years/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/publication/person-publications/{cfrespublid}/restore/` | JWT | — | A mixin to be used with production ViewSets to allow submitting them for committee evaluation. |
| POST | `/api/v2/publication/person-publications/{cfrespublid}/submit-for-evaluation/` | JWT | — | Submit a production for committee evaluation. |
| GET | `/api/v2/publication/publication-badges-index/` | JWT | — | — |
| GET | `/api/v2/publication/publication-identifiers-index/` | JWT | — | — |
| GET | `/api/v2/publication/publication-journals/` | JWT | — | Return a list of journals to be link with a publication, on relationship parent-child. |
| POST | `/api/v2/publication/publication-journals/` | JWT | — | Return a list of journals to be link with a publication, on relationship parent-child. |
| GET | `/api/v2/publication/publication-status-index/` | JWT | — | — |
| GET | `/api/v2/publication/publication-types-index/` | JWT | — | — |
| GET | `/api/v2/publication/search-faceted-v2/` | pública | — | Endpoint principal de búsqueda con facetas |
| GET | `/api/v2/publication/search-faceted-v2/{id}/recommendations/` | pública | — | Devuelve publicaciones similares basadas en el contenido del documento actual. |
| GET | `/api/v2/publication/search-faceted/` | pública | — | — |
| GET | `/api/v2/publication/{id}/details/` | JWT | — | Return a publication details to end-user profile view. |

### Biblioteca

- Recursos bibliográficos de la institución — 14 operaciones

**`api/v2/library`** (14 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/library/collections/` | JWT | — | — |
| POST | `/api/v2/library/collections/` | JWT | — | Create a collection. |
| GET | `/api/v2/library/collections/my-collections/` | JWT | — | Return "my collections". |
| GET | `/api/v2/library/collections/shared-to-me/` | JWT | — | Return a list of collection shared to me. |
| POST | `/api/v2/library/collections/unlink/` | JWT | — | Unlink from a shared collection |
| GET | `/api/v2/library/collections/{collection_id}/shared-with/` | JWT | — | Return a list of person who collection was shared. |
| DELETE | `/api/v2/library/collections/{id}/` | JWT | — | — |
| GET | `/api/v2/library/collections/{id}/` | JWT | — | — |
| PATCH | `/api/v2/library/collections/{id}/` | JWT | — | — |
| PUT | `/api/v2/library/collections/{id}/` | JWT | — | Update collection content. |
| POST | `/api/v2/library/collections/{id}/clone/` | JWT | — | Clone a shared collection and make it owned by the current user. |
| DELETE | `/api/v2/library/collections/{id}/remove-items/` | JWT | — | Elimina items de los campos M2M de una colección. |
| DELETE | `/api/v2/library/collections/{id}/revoke-share/` | JWT | — | The collection owner revoke person links. |
| PATCH | `/api/v2/library/collections/{id}/share/` | JWT | — | Share (or link) a collection with other persons. |

### Interacciones

- Networking entre investigadores y Flujos de colaboración — 2 operaciones

**`api/v2/interaction`** (2 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/api/v2/interaction/` | JWT | — | — |
| GET | `/api/v2/interaction/my-likes/` | JWT | — | — |

### Metadatos externos

- Enriquecimiento desde fuentes externas — 21 operaciones

**`api/v2/external-metadata`** (21 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/external-metadata/get/` | pública | — | Returns metadata based on the source and source_id provided. |
| GET | `/api/v2/external-metadata/hints/` | JWT | — | Retorna hints para todos los proveedores. |
| GET | `/api/v2/external-metadata/metadata-enrichment/` | JWT | — | ViewSet para manejar la reconciliación y enriquecimiento de metadatos. |
| POST | `/api/v2/external-metadata/metadata-enrichment/` | JWT | — | ViewSet para manejar la reconciliación y enriquecimiento de metadatos. |
| GET | `/api/v2/external-metadata/metadata-enrichment/active-session/` | JWT | — | ViewSet para manejar la reconciliación y enriquecimiento de metadatos. |
| POST | `/api/v2/external-metadata/metadata-enrichment/fetch/` | JWT | — | ViewSet para manejar la reconciliación y enriquecimiento de metadatos. |
| DELETE | `/api/v2/external-metadata/metadata-enrichment/{id}/` | JWT | — | ViewSet para manejar la reconciliación y enriquecimiento de metadatos. |
| GET | `/api/v2/external-metadata/metadata-enrichment/{id}/` | JWT | — | ViewSet para manejar la reconciliación y enriquecimiento de metadatos. |
| PATCH | `/api/v2/external-metadata/metadata-enrichment/{id}/` | JWT | — | ViewSet para manejar la reconciliación y enriquecimiento de metadatos. |
| PUT | `/api/v2/external-metadata/metadata-enrichment/{id}/` | JWT | — | ViewSet para manejar la reconciliación y enriquecimiento de metadatos. |
| POST | `/api/v2/external-metadata/metadata-enrichment/{id}/apply/` | JWT | — | ViewSet para manejar la reconciliación y enriquecimiento de metadatos. |
| POST | `/api/v2/external-metadata/metadata-enrichment/{id}/cancel/` | JWT | — | ViewSet para manejar la reconciliación y enriquecimiento de metadatos. |
| GET | `/api/v2/external-metadata/metadata-enrichment/{id}/candidates/` | JWT | — | ViewSet para manejar la reconciliación y enriquecimiento de metadatos. |
| POST | `/api/v2/external-metadata/metadata-enrichment/{id}/resolve-authors/` | JWT | — | ViewSet para manejar la reconciliación y enriquecimiento de metadatos. |
| GET | `/api/v2/external-metadata/orcid/` | JWT | — | Return a redirect url to ORCID login page if the user does not have an orcid access token. |
| POST | `/api/v2/external-metadata/orcid/` | JWT | — | Return a redirect url to ORCID login page if the user does not have an orcid access token. |
| POST | `/api/v2/external-metadata/push/` | JWT | — | Returns metadata based on the source and source_id provided. |
| PUT | `/api/v2/external-metadata/put/` | JWT | — | Returns metadata based on the source and source_id provided. |
| POST | `/api/v2/external-metadata/search/identifier/` | JWT | — | Viewset to search publication by identifier. |
| GET | `/api/v2/external-metadata/zenodo/` | JWT | — | Return a redirect url to ZENODO login page if the user does not have an orcid access token. |
| POST | `/api/v2/external-metadata/zenodo/` | JWT | — | Return a redirect url to ZENODO login page if the user does not have an orcid access token. |

### Landing pages institucionales

- Páginas de presentación por institución — 8 operaciones

**`api/v2/landing-page`** (8 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/landing-page/ctele/` | pública | — | — |
| GET | `/api/v2/landing-page/fundings/` | pública | — | — |
| GET | `/api/v2/landing-page/layout/` | pública | requiere admin | JSON del page-builder del landing: GET público, PUT (upsert) para Administrator/Manager. |
| PUT | `/api/v2/landing-page/layout/` | JWT | requiere admin | JSON del page-builder del landing: GET público, PUT (upsert) para Administrator/Manager. |
| GET | `/api/v2/landing-page/notable-experts/` | pública | — | — |
| GET | `/api/v2/landing-page/ods/` | pública | — | — |
| GET | `/api/v2/landing-page/org-by-ctele/` | pública | — | — |
| GET | `/api/v2/landing-page/researchers-catalog/` | pública | — | — |

### Banco de recursos

- Recursos y materiales compartidos — 1 operaciones

**`api/v2/resource-bank`** (1 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/resource-bank/images/` | JWT | — | — |

### Gestor de proyectos (Scrum)

- Epics, sprints, backlog, tareas, responsables, recursos — 35 operaciones

**`api/v3/project-manager`** (35 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v3/project-manager/` | JWT | documenta permisos | La misma maquinaria, con la forma limpia y los dos origenes. |
| GET | `/api/v3/project-manager/backlog/` | JWT | — | ViewSet para gestionar el Backlog de un proyecto. |
| GET | `/api/v3/project-manager/backlog/project/{cffundpropid}/` | JWT | — | GET /backlog/project/{cffundpropid} Lista todas las tareas del backlog de un proyecto. |
| POST | `/api/v3/project-manager/backlog/project/{cffundpropid}/move-to-epic/` | JWT | — | POST /backlog/project/{cffundpropid}/move-to-epic Mueve una tarea del backlog a un Epic. |
| POST | `/api/v3/project-manager/backlog/project/{cffundpropid}/move-to-sprint/` | JWT | — | POST /backlog/project/{cffundpropid}/move-to-sprint Mueve una tarea del backlog a un Sprint. |
| DELETE | `/api/v3/project-manager/backlog/project/{cffundpropid}/task/{task_id}/` | JWT | — | DELETE /backlog/project/{cffundpropid}/task/{task_id} Elimina una tarea del backlog (soft delete). |
| GET | `/api/v3/project-manager/backlog/task-detail/project/{cffundpropid}/task/{task_id}/` | JWT | — | GET /backlog/project/{cffundpropid}/task/{task_id} Obtiene una tarea específica del backlog. |
| POST | `/api/v3/project-manager/epic/` | JWT | documenta permisos | La misma maquinaria, con la forma limpia y los dos origenes. |
| DELETE | `/api/v3/project-manager/epic/{epic_id}/` | JWT | documenta permisos | La misma maquinaria, con la forma limpia y los dos origenes. |
| GET | `/api/v3/project-manager/epic/{epic_id}/` | JWT | documenta permisos | La misma maquinaria, con la forma limpia y los dos origenes. |
| PATCH | `/api/v3/project-manager/epic/{epic_id}/` | JWT | documenta permisos | La misma maquinaria, con la forma limpia y los dos origenes. |
| GET | `/api/v3/project-manager/is-scrum-master/{cffundpropid}/` | JWT | — | GET /is-crum-master - Verify if the user is scrum master of the project. |
| GET | `/api/v3/project-manager/my-projects/` | JWT | documenta permisos | La misma maquinaria, con la forma limpia y los dos origenes. |
| POST | `/api/v3/project-manager/project/{cffundpropid}/start-management/` | JWT | — | POST /project/{cffundpropid}/start-management - Inicia la gestión del proyecto |
| POST | `/api/v3/project-manager/resources/assign/` | JWT | — | POST /api/funding-proposals/assign/ Asigna un recurso a una tarea. |
| DELETE | `/api/v3/project-manager/resources/task-resource/{task_resource_id}/` | JWT | — | PATCH /api/funding-proposals/task-resource/<task_resource_id>/ DELETE /api/funding-proposals/task-resource/<task_resource_id>/ Actualiza o elimina una |
| PATCH | `/api/v3/project-manager/resources/task-resource/{task_resource_id}/` | JWT | — | PATCH /api/funding-proposals/task-resource/<task_resource_id>/ DELETE /api/funding-proposals/task-resource/<task_resource_id>/ Actualiza o elimina una |
| GET | `/api/v3/project-manager/resources/task/{task_id}/resources/` | JWT | — | GET /api/funding-proposals/task/<task_id>/resources/ Retorna todos los recursos asignados a una tarea específica. |
| GET | `/api/v3/project-manager/resources/{cffundpropid}/availability/` | JWT | — | GET /api/funding-proposals/<cffundpropid>/resources/ Retorna todos los recursos disponibles para una FundingProposal específica. |
| GET | `/api/v3/project-manager/resources/{cffundpropid}/available-types/` | JWT | — | Los rubros con partidas en este proyecto: `{"available_types": [...]}`. |
| POST | `/api/v3/project-manager/task/` | JWT | documenta permisos | La misma maquinaria, con la forma limpia y los dos origenes. |
| GET | `/api/v3/project-manager/task/{task_id}/detail/` | JWT | — | GET /tasks/{task_id}/detail - Obtiene el detalle completo de un Task Retorna toda la información del Task sin incluir relaciones. |
| DELETE | `/api/v3/project-manager/tasks/{task_id}/` | JWT | — | PUT/PATCH → Actualiza una Task DELETE → Soft delete de la Task |
| PATCH | `/api/v3/project-manager/tasks/{task_id}/` | JWT | — | PUT/PATCH → Actualiza una Task DELETE → Soft delete de la Task |
| PUT | `/api/v3/project-manager/tasks/{task_id}/` | JWT | — | PUT/PATCH → Actualiza una Task DELETE → Soft delete de la Task |
| GET | `/api/v3/project-manager/tasks/{task_id}/ns4-files/` | JWT | — | GET /tasks/{task_id}/ns4-files - Lista archivos POST /tasks/{task_id}/ns4-files - Crea archivo |
| POST | `/api/v3/project-manager/tasks/{task_id}/ns4-files/` | JWT | — | GET /tasks/{task_id}/ns4-files - Lista archivos POST /tasks/{task_id}/ns4-files - Crea archivo |
| DELETE | `/api/v3/project-manager/tasks/{task_id}/ns4-files/{file_id}/` | JWT | — | PATCH /tasks/{task_id}/ns4-files/{file_id} - Actualiza archivo DELETE /tasks/{task_id}/ns4-files/{file_id} - Elimina archivo |
| PATCH | `/api/v3/project-manager/tasks/{task_id}/ns4-files/{file_id}/` | JWT | — | PATCH /tasks/{task_id}/ns4-files/{file_id} - Actualiza archivo DELETE /tasks/{task_id}/ns4-files/{file_id} - Elimina archivo |
| GET | `/api/v3/project-manager/tasks/{task_id}/responsibles/` | JWT | — | GET /tasks/{task_id}/responsibles - Lista responsables POST /tasks/{task_id}/responsibles - Crea responsable |
| POST | `/api/v3/project-manager/tasks/{task_id}/responsibles/` | JWT | — | GET /tasks/{task_id}/responsibles - Lista responsables POST /tasks/{task_id}/responsibles - Crea responsable |
| DELETE | `/api/v3/project-manager/tasks/{task_id}/responsibles/{assignment_id}/` | JWT | — | PATCH /tasks/{task_id}/responsibles/{assignment_id} - Actualiza responsable DELETE /tasks/{task_id}/responsibles/{assignment_id} - Elimina responsable |
| PATCH | `/api/v3/project-manager/tasks/{task_id}/responsibles/{assignment_id}/` | JWT | — | PATCH /tasks/{task_id}/responsibles/{assignment_id} - Actualiza responsable DELETE /tasks/{task_id}/responsibles/{assignment_id} - Elimina responsable |
| GET | `/api/v3/project-manager/{cffundpropid}/detail/` | JWT | documenta permisos | La misma maquinaria, con la forma limpia y los dos origenes. |
| GET | `/api/v3/project-manager/{cffundpropid}/schedules/` | JWT | documenta permisos | La misma maquinaria, con la forma limpia y los dos origenes. |

### Búsqueda global

- Búsqueda transversal del ecosistema — 3 operaciones

**`api/v2/search`** (3 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v2/search/autocomplete/` | pública | — | Autocompletado mientras el usuario escribe. |
| GET | `/api/v2/search/matches/search/` | pública | — | Búsqueda de coincidencias por título o identificador. |
| GET | `/api/v2/search/random/` | pública | — | Resultados aleatorios serializados según tipo. |

### Derechos del titular

- Consentimiento, marketing, supresión y estado (data-rights) — 6 operaciones

**`api/v3/person`** (6 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/api/v3/person/me/consent/accept/` | JWT | consentimiento Ley 1581 | Re-accept both active documents, recording immutable consent evidence for each. |
| GET | `/api/v3/person/me/consent/status/` | JWT | — | Bootstrap the combined re-acceptance gate with both documents and the user's history. |
| POST | `/api/v3/person/me/data-rights/deletion/` | JWT | — | Irreversible suppression: Layer A + Layer B anonymization of the requesting user. |
| PATCH | `/api/v3/person/me/data-rights/marketing/` | JWT | — | Trivial, non-destructive marketing opt-in/out toggle. |
| POST | `/api/v3/person/me/data-rights/revoke-consent/` | JWT | aislado por tenant; consentimiento Ley 1581 | Withdraw consent: a side-effect-free redirect signal to the deletion flow. |
| GET | `/api/v3/person/me/data-rights/status/` | JWT | — | Bootstrap the danger zone with the user's current flags and the confirmation phrase. |

### Producción científica (v3)

- Fichas unificadas de producción con progreso y visibilidade — 65 operaciones

**`api/v3/production`** (65 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| POST | `/api/v3/production/committee-evaluation-requests/accept/` | JWT | — | Accept one or more evaluation requests. |
| POST | `/api/v3/production/committee-evaluation-requests/download-csv/` | JWT | — | Downloads a CSV of the selected (or all filtered) requests. |
| POST | `/api/v3/production/committee-evaluation-requests/reject/` | JWT | — | Reject one or more evaluation requests. |
| GET | `/api/v3/production/enterprise/{resenterid}/progress/` | JWT | — | Vista base para el endpoint de progreso. |
| GET | `/api/v3/production/form-configs/` | JWT | — | Endpoint para obtener configuraciones de campos de formularios. |
| GET | `/api/v3/production/form-configs/form-conf/{production_type}/` | JWT | — | Obtiene la configuración para un tipo de producción específico. |
| GET | `/api/v3/production/form-configs/{id}/` | JWT | — | Endpoint para obtener configuraciones de campos de formularios. |
| GET | `/api/v3/production/law/{reslawid}/progress/` | JWT | — | Vista base para el endpoint de progreso. |
| GET | `/api/v3/production/patent/{cfrespatid}/progress/` | JWT | — | Vista base para el endpoint de progreso. |
| GET | `/api/v3/production/product/{cfresprodid}/progress/` | JWT | — | Vista base para el endpoint de progreso. |
| GET | `/api/v3/production/project/{cfprojid}/progress/` | JWT | — | Vista base para el endpoint de progreso. |
| GET | `/api/v3/production/publication/{cfrespublid}/progress/` | JWT | — | Vista base para el endpoint de progreso. |
| POST | `/api/v3/production/{production_type}/` | JWT | — | — |
| GET | `/api/v3/production/{production_type}/delegated-productions/` | JWT | requiere admin | Producciones creadas por el usuario autenticado (solo Admin/Manager). |
| PATCH | `/api/v3/production/{production_type}/{id}/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/abstract/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/abstract/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/areas/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/areas/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/available-in/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/available-in/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/collaborators/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/collaborators/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/editors/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/editors/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/enterprise-linked/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/enterprise-linked/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/events/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/events/` | JWT | — | — |
| GET | `/api/v3/production/{production_type}/{id}/history/` | JWT | — | Retorna el historial de cambios para una producción específica. |
| POST | `/api/v3/production/{production_type}/{id}/identifiers/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/identifiers/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/keywords/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/keywords/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/law-linked/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/law-linked/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/lines/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/lines/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/ns4-accesses/` | JWT | — | — |
| DELETE | `/api/v3/production/{production_type}/{id}/ns4-accesses/{ns4_id}/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/ns4-accesses/{ns4_id}/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/ods/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/ods/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/organization-links/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/organization-links/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/parent/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/parent/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/partof/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/partof/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/patent-linked/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/patent-linked/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/person-visibility/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/product-linked/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/product-linked/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/project-linked/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/project-linked/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/publication-linked/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/publication-linked/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/publish/` | JWT | — | — |
| PATCH | `/api/v3/production/{production_type}/{id}/section/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/section/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/thesis/` | JWT | — | — |
| PUT | `/api/v3/production/{production_type}/{id}/thesis/` | JWT | — | — |
| POST | `/api/v3/production/{production_type}/{id}/visibility/` | JWT | — | — |

### Índices v3

- Búsqueda rápida y dependencias de tipos — 3 operaciones

**`api/v3/index`** (3 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v3/index/type-dependency/{production_type}/cfdctypes/` | JWT | — | Retorna todos los cfdctype pertenecientes a un macro_type. |
| GET | `/api/v3/index/type-dependency/{production_type}/macros/` | JWT | — | Retorna los macro_type únicos para un production_type. |
| GET | `/api/v3/index/type-fast-search/{production_type}/` | JWT | — | — |

### Convocatorias

- Ciclo de vida de convocatorias (fases, presupuesto, cronograma) — 102 operaciones

**`api/v3/convocations`** (102 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v3/convocations/` | pública | — | Gestión completa de convocatorias (CRUD + transiciones de estado). |
| POST | `/api/v3/convocations/` | JWT | — | Gestión completa de convocatorias (CRUD + transiciones de estado). |
| GET | `/api/v3/convocations/areas/` | pública | — | Lista de áreas temáticas del catálogo institucional. |
| GET | `/api/v3/convocations/areas/{area_id}/` | pública | — | Lista de áreas temáticas del catálogo institucional. |
| GET | `/api/v3/convocations/budget-item-types/` | pública | — | Lista de tipos de rubro presupuestal activos con jerarquía y ruta completa. |
| GET | `/api/v3/convocations/budget-item-types/{id}/` | pública | — | Lista de tipos de rubro presupuestal activos con jerarquía y ruta completa. |
| GET | `/api/v3/convocations/currencies/` | pública | solo lectura | Lista de monedas activas para denominar el presupuesto de la convocatoria. |
| GET | `/api/v3/convocations/currencies/{id}/` | pública | solo lectura | Lista de monedas activas para denominar el presupuesto de la convocatoria. |
| GET | `/api/v3/convocations/financing-types/` | pública | solo lectura | Lista de tipos de financiación disponibles con su macro-tipo. |
| GET | `/api/v3/convocations/financing-types/{id}/` | pública | solo lectura | Lista de tipos de financiación disponibles con su macro-tipo. |
| GET | `/api/v3/convocations/keywords/` | pública | — | Lista de palabras clave del catálogo institucional. |
| GET | `/api/v3/convocations/keywords/{cfkeyw_id}/` | pública | — | Lista de palabras clave del catálogo institucional. |
| GET | `/api/v3/convocations/lines/` | pública | — | Lista de líneas de investigación del catálogo institucional. |
| GET | `/api/v3/convocations/lines/{line_id}/` | pública | — | Lista de líneas de investigación del catálogo institucional. |
| GET | `/api/v3/convocations/ods/` | pública | solo lectura | Lista de Objetivos de Desarrollo Sostenible (ODS) disponibles. |
| GET | `/api/v3/convocations/ods/{id}/` | pública | solo lectura | Lista de Objetivos de Desarrollo Sostenible (ODS) disponibles. |
| GET | `/api/v3/convocations/organization-types/` | pública | solo lectura | Lista de tipos de organización (ej. |
| GET | `/api/v3/convocations/organization-types/{id}/` | pública | solo lectura | Lista de tipos de organización (ej. |
| GET | `/api/v3/convocations/phase-types/` | pública | solo lectura | Catálogo GLOBAL de tipos de fase del sistema (apertura, recepción, resultados y plantillas). |
| GET | `/api/v3/convocations/phase-types/{id}/` | pública | solo lectura | Catálogo GLOBAL de tipos de fase del sistema (apertura, recepción, resultados y plantillas). |
| GET | `/api/v3/convocations/platforms/` | pública | solo lectura | Lista de plataformas digitales del catálogo (ej. |
| GET | `/api/v3/convocations/platforms/{id}/` | pública | solo lectura | Lista de plataformas digitales del catálogo (ej. |
| GET | `/api/v3/convocations/social-networks/` | pública | solo lectura | Lista de redes sociales del catálogo institucional. |
| GET | `/api/v3/convocations/social-networks/{id}/` | pública | solo lectura | Lista de redes sociales del catálogo institucional. |
| GET | `/api/v3/convocations/statuses/` | pública | solo lectura | Lista de estados posibles de una convocatoria (draft, scheduled, published, closed, etc.). |
| GET | `/api/v3/convocations/statuses/{id}/` | pública | solo lectura | Lista de estados posibles de una convocatoria (draft, scheduled, published, closed, etc.). |
| GET | `/api/v3/convocations/types/` | pública | solo lectura | Lista de tipos de convocatoria disponibles (ej. |
| GET | `/api/v3/convocations/types/{id}/` | pública | solo lectura | Lista de tipos de convocatoria disponibles (ej. |
| DELETE | `/api/v3/convocations/{id}/` | JWT | — | Gestión completa de convocatorias (CRUD + transiciones de estado). |
| GET | `/api/v3/convocations/{id}/` | pública | — | Retorna la convocatoria con todas sus relaciones anidadas: fases, presupuesto, documentos, responsables (con `user_image_url`), patrocinadores (con `o |
| PATCH | `/api/v3/convocations/{id}/` | JWT | — | Gestión completa de convocatorias (CRUD + transiciones de estado). |
| PUT | `/api/v3/convocations/{id}/` | JWT | — | PATCH/PUT: escribe con el input serializer pero responde con el detalle (incidencia 008). |
| GET | `/api/v3/convocations/{id}/address-to/` | JWT | — | Lista (GET) o vincula (POST) un tipo de organización destinataria. |
| POST | `/api/v3/convocations/{id}/address-to/` | JWT | — | Lista (GET) o vincula (POST) un tipo de organización destinataria. |
| DELETE | `/api/v3/convocations/{id}/address-to/{item_id}/` | JWT | — | Edita (PATCH) o desvincula (DELETE) un tipo de organización destinataria de la convocatoria. |
| PATCH | `/api/v3/convocations/{id}/address-to/{item_id}/` | JWT | — | Edita (PATCH) o desvincula (DELETE) un tipo de organización destinataria de la convocatoria. |
| GET | `/api/v3/convocations/{id}/areas/` | JWT | — | Lista (GET) o vincula (POST) un área temática a la convocatoria. |
| POST | `/api/v3/convocations/{id}/areas/` | JWT | — | Lista (GET) o vincula (POST) un área temática a la convocatoria. |
| DELETE | `/api/v3/convocations/{id}/areas/{item_id}/` | JWT | — | Edita (PATCH) o desvincula (DELETE) un área temática de la convocatoria. |
| PATCH | `/api/v3/convocations/{id}/areas/{item_id}/` | JWT | — | Edita (PATCH) o desvincula (DELETE) un área temática de la convocatoria. |
| GET | `/api/v3/convocations/{id}/budget-matrix/` | pública | — | Retorna la matriz presupuestal completa: rubros (filas), contrapartidas/organizaciones (columnas), celdas con montos en especie y efectivo, participac |
| PUT | `/api/v3/convocations/{id}/budget-matrix/` | JWT | — | Sincronización completa de la matriz: elimina rubros y contrapartidas no incluidos en el payload y upserta los que sí vienen. |
| POST | `/api/v3/convocations/{id}/budget-summary-preview/` | JWT | — | Cálculo en seco para la vista previa del formulario: recibe ítems que no existen en ninguna propuesta y devuelve **el mismo resumen** que `GET /propos |
| POST | `/api/v3/convocations/{id}/cancel/` | JWT | — | Transiciona de `scheduled`/`published` → `cancelled`. |
| GET | `/api/v3/convocations/{id}/current-phase/` | JWT | — | Retorna las fases en curso, la próxima fase pendiente, el estado general de la convocatoria y si el período de recepción de propuestas está abierto (` |
| GET | `/api/v3/convocations/{id}/deletion-preview/` | JWT | — | Lo que impide eliminarla (`blocking`) y lo que se borraría con ella (`cascade`), para que el gestor lo vea ANTES de confirmar. |
| GET | `/api/v3/convocations/{id}/documents/` | JWT | — | Lista (GET) o adjunta (POST) un documento oficial a la convocatoria (bases, formatos, anexos). |
| POST | `/api/v3/convocations/{id}/documents/` | JWT | — | Lista (GET) o adjunta (POST) un documento oficial a la convocatoria (bases, formatos, anexos). |
| DELETE | `/api/v3/convocations/{id}/documents/{doc_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un documento adjunto a la convocatoria. |
| PATCH | `/api/v3/convocations/{id}/documents/{doc_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un documento adjunto a la convocatoria. |
| GET | `/api/v3/convocations/{id}/keywords/` | JWT | — | Lista (GET) o vincula (POST) una palabra clave a la convocatoria. |
| POST | `/api/v3/convocations/{id}/keywords/` | JWT | — | Lista (GET) o vincula (POST) una palabra clave a la convocatoria. |
| DELETE | `/api/v3/convocations/{id}/keywords/{item_id}/` | JWT | — | Edita (PATCH) o desvincula (DELETE) una palabra clave de la convocatoria. |
| PATCH | `/api/v3/convocations/{id}/keywords/{item_id}/` | JWT | — | Edita (PATCH) o desvincula (DELETE) una palabra clave de la convocatoria. |
| GET | `/api/v3/convocations/{id}/layout/` | pública | — | Lee (GET) o reemplaza (PUT) el layout del formulario dinámico de la convocatoria. |
| PUT | `/api/v3/convocations/{id}/layout/` | JWT | — | Lee (GET) o reemplaza (PUT) el layout del formulario dinámico de la convocatoria. |
| GET | `/api/v3/convocations/{id}/lines/` | JWT | — | Lista (GET) o vincula (POST) una línea de investigación a la convocatoria. |
| POST | `/api/v3/convocations/{id}/lines/` | JWT | — | Lista (GET) o vincula (POST) una línea de investigación a la convocatoria. |
| DELETE | `/api/v3/convocations/{id}/lines/{item_id}/` | JWT | — | Edita (PATCH) o desvincula (DELETE) una línea de investigación de la convocatoria. |
| PATCH | `/api/v3/convocations/{id}/lines/{item_id}/` | JWT | — | Edita (PATCH) o desvincula (DELETE) una línea de investigación de la convocatoria. |
| GET | `/api/v3/convocations/{id}/ods/` | JWT | — | Lista (GET) o vincula (POST) un ODS a la convocatoria. |
| POST | `/api/v3/convocations/{id}/ods/` | JWT | — | Lista (GET) o vincula (POST) un ODS a la convocatoria. |
| DELETE | `/api/v3/convocations/{id}/ods/{item_id}/` | JWT | — | Edita (PATCH) o desvincula (DELETE) un ODS de la convocatoria. |
| PATCH | `/api/v3/convocations/{id}/ods/{item_id}/` | JWT | — | Edita (PATCH) o desvincula (DELETE) un ODS de la convocatoria. |
| GET | `/api/v3/convocations/{id}/phase-types/` | JWT | solo lectura | GET: devuelve los tipos de fase globales del sistema **más** los propios de esta convocatoria, como lista plana sin paginar. |
| POST | `/api/v3/convocations/{id}/phase-types/` | JWT | solo lectura | GET: devuelve los tipos de fase globales del sistema **más** los propios de esta convocatoria, como lista plana sin paginar. |
| DELETE | `/api/v3/convocations/{id}/phase-types/{type_id}/` | JWT | — | Solo opera sobre los tipos que pertenecen a esta convocatoria: los globales del sistema responden 404 por esta ruta. |
| PATCH | `/api/v3/convocations/{id}/phase-types/{type_id}/` | JWT | — | Solo opera sobre los tipos que pertenecen a esta convocatoria: los globales del sistema responden 404 por esta ruta. |
| GET | `/api/v3/convocations/{id}/phases/` | JWT | — | Lista (GET) o agrega (POST) una fase al cronograma de la convocatoria. |
| POST | `/api/v3/convocations/{id}/phases/` | JWT | — | Lista (GET) o agrega (POST) una fase al cronograma de la convocatoria. |
| DELETE | `/api/v3/convocations/{id}/phases/{phase_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) una fase específica del cronograma. |
| PATCH | `/api/v3/convocations/{id}/phases/{phase_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) una fase específica del cronograma. |
| GET | `/api/v3/convocations/{id}/platforms/` | JWT | — | Lista (GET) o vincula (POST) una plataforma de publicación. |
| POST | `/api/v3/convocations/{id}/platforms/` | JWT | — | Lista (GET) o vincula (POST) una plataforma de publicación. |
| DELETE | `/api/v3/convocations/{id}/platforms/{item_id}/` | JWT | — | Edita la URL (PATCH) o desvincula (DELETE) una plataforma de la convocatoria. |
| PATCH | `/api/v3/convocations/{id}/platforms/{item_id}/` | JWT | — | Edita la URL (PATCH) o desvincula (DELETE) una plataforma de la convocatoria. |
| GET | `/api/v3/convocations/{id}/proposal-layout/` | JWT | — | Retorna el layout del formulario que rellena el postulante, organizado en pestañas. |
| PUT | `/api/v3/convocations/{id}/proposal-layout/` | JWT | — | Reemplaza el layout completo e incrementa el número de versión. |
| POST | `/api/v3/convocations/{id}/proposal-layout/confirm/` | JWT | — | Registra la constancia de que el gestor revisó el formulario y acepta que es el que verán los postulantes. |
| GET | `/api/v3/convocations/{id}/proposal-layout/confirmations/` | JWT | — | Lista plana, sin paginar, de las confirmaciones registradas, de la más reciente a la antigua. |
| GET | `/api/v3/convocations/{id}/proposal-layout/field-usage/` | JWT | — | Devuelve cuántas propuestas de la convocatoria tienen respuesta no vacía para `field_key`. |
| GET | `/api/v3/convocations/{id}/publish-readiness/` | JWT | — | Las mismas comprobaciones de `POST /publish/` y `POST /schedule/`, sin transicionar. |
| POST | `/api/v3/convocations/{id}/publish/` | JWT | proceso de evaluación | Transiciona a `published` y activa `is_active=true`. |
| POST | `/api/v3/convocations/{id}/reschedule/` | JWT | solo lectura | Reemplaza las fechas de TODAS las fases en una sola operación. |
| GET | `/api/v3/convocations/{id}/responsible/` | JWT | — | Lista (GET) o asigna (POST) un responsable a la convocatoria. |
| POST | `/api/v3/convocations/{id}/responsible/` | JWT | — | Lista (GET) o asigna (POST) un responsable a la convocatoria. |
| DELETE | `/api/v3/convocations/{id}/responsible/{item_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un responsable de la convocatoria. |
| PATCH | `/api/v3/convocations/{id}/responsible/{item_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un responsable de la convocatoria. |
| DELETE | `/api/v3/convocations/{id}/results-document/` | JWT | — | `PUT {key}` registra el PDF que carga la universidad; `DELETE` lo quita. |
| PUT | `/api/v3/convocations/{id}/results-document/` | JWT | — | `PUT {key}` registra el PDF que carga la universidad; `DELETE` lo quita. |
| GET | `/api/v3/convocations/{id}/results/` | pública | consentimiento Ley 1581 | Propuestas aprobadas por radicado, sin puntajes. |
| POST | `/api/v3/convocations/{id}/schedule/` | JWT | proceso de evaluación | Transiciona de `draft` → `scheduled`. |
| GET | `/api/v3/convocations/{id}/social-networks/` | JWT | — | Lista (GET) o vincula (POST) una red social. |
| POST | `/api/v3/convocations/{id}/social-networks/` | JWT | — | Lista (GET) o vincula (POST) una red social. |
| DELETE | `/api/v3/convocations/{id}/social-networks/{item_id}/` | JWT | — | Edita la URL (PATCH) o desvincula (DELETE) una red social de la convocatoria. |
| PATCH | `/api/v3/convocations/{id}/social-networks/{item_id}/` | JWT | — | Edita la URL (PATCH) o desvincula (DELETE) una red social de la convocatoria. |
| GET | `/api/v3/convocations/{id}/sponsors/` | JWT | — | Lista (GET) o vincula (POST) una organización patrocinadora. |
| POST | `/api/v3/convocations/{id}/sponsors/` | JWT | — | Lista (GET) o vincula (POST) una organización patrocinadora. |
| DELETE | `/api/v3/convocations/{id}/sponsors/{item_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) una organización patrocinadora de la convocatoria. |
| PATCH | `/api/v3/convocations/{id}/sponsors/{item_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) una organización patrocinadora de la convocatoria. |
| GET | `/api/v3/convocations/{id}/transitions/` | JWT | — | Auditoría de todos los cambios de estado y fase en orden cronológico, con usuario, origen y destino de cada transición. |
| POST | `/api/v3/convocations/{id}/unpublish/` | JWT | proceso de evaluación | Transiciona de `scheduled`/`published` → `draft` y devuelve la rúbrica congelada a borrador, para que el gestor pueda seguir configurando. |

### Postulaciones a convocatorias

- Propuestas, expertos aliados, ítems de presupuesto, documentos — 71 operaciones

**`api/v3/proposals`** (71 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v3/proposals/` | JWT | — | Gestión completa de propuestas de investigación (CRUD + acciones de flujo). |
| POST | `/api/v3/proposals/` | JWT | — | POST: responde con el detalle, no con el serializer de escritura (incidencia 008). |
| GET | `/api/v3/proposals/beneficiary-groups/` | pública | solo lectura | Lista de grupos beneficiarios disponibles para la propuesta (ej. |
| GET | `/api/v3/proposals/beneficiary-groups/{id}/` | pública | solo lectura | Lista de grupos beneficiarios disponibles para la propuesta (ej. |
| GET | `/api/v3/proposals/expected-result-types/` | pública | solo lectura | Lista de tipos de resultado esperado para la sección de impactos de la propuesta. |
| GET | `/api/v3/proposals/expected-result-types/{id}/` | pública | solo lectura | Lista de tipos de resultado esperado para la sección de impactos de la propuesta. |
| GET | `/api/v3/proposals/form-catalogs/` | pública | — | Registro de los catálogos que puede consumir un campo de selección del formulario. |
| GET | `/api/v3/proposals/impact-period-types/` | pública | solo lectura | Lista de periodos de impacto (corto, mediano y largo plazo). |
| GET | `/api/v3/proposals/impact-period-types/{id}/` | pública | solo lectura | Lista de periodos de impacto (corto, mediano y largo plazo). |
| GET | `/api/v3/proposals/impact-types/` | pública | solo lectura | Lista de tipos de impacto disponibles para la sección de impactos de la propuesta. |
| GET | `/api/v3/proposals/impact-types/{id}/` | pública | solo lectura | Lista de tipos de impacto disponibles para la sección de impactos de la propuesta. |
| GET | `/api/v3/proposals/innovation-types/` | pública | solo lectura | Lista de tipos de innovación disponibles para clasificar una propuesta. |
| GET | `/api/v3/proposals/innovation-types/{id}/` | pública | solo lectura | Lista de tipos de innovación disponibles para clasificar una propuesta. |
| GET | `/api/v3/proposals/interest-subtopics/` | pública | — | Lista de sub-temas de interés filtrable por tema padre (`?topic=<id>`). |
| GET | `/api/v3/proposals/interest-subtopics/{id}/` | pública | — | Lista de sub-temas de interés filtrable por tema padre (`?topic=<id>`). |
| GET | `/api/v3/proposals/interest-topics/` | pública | — | Lista de temas de interés con sus sub-temas anidados. |
| GET | `/api/v3/proposals/interest-topics/{id}/` | pública | — | Lista de temas de interés con sus sub-temas anidados. |
| GET | `/api/v3/proposals/person-roles/` | pública | solo lectura; documenta permisos | Catálogo de roles de una persona dentro de un proyecto (Investigador Principal, Asesor, Orientador de Semillero...). |
| GET | `/api/v3/proposals/person-roles/{id}/` | pública | solo lectura; documenta permisos | Catálogo de roles de una persona dentro de un proyecto (Investigador Principal, Asesor, Orientador de Semillero...). |
| GET | `/api/v3/proposals/project-types/` | pública | — | Lista de tipos de proyecto disponibles para clasificar una propuesta. |
| GET | `/api/v3/proposals/project-types/{id}/` | pública | — | Lista de tipos de proyecto disponibles para clasificar una propuesta. |
| GET | `/api/v3/proposals/statuses/` | pública | — | Lista de estados posibles de una propuesta (draft, submitted, returned, approved, rejected, etc.). |
| GET | `/api/v3/proposals/statuses/{id}/` | pública | — | Lista de estados posibles de una propuesta (draft, submitted, returned, approved, rejected, etc.). |
| GET | `/api/v3/proposals/submission-declarations/` | pública | — | Las cinco declaraciones que el postulante hace al enviar su propuesta (055). |
| GET | `/api/v3/proposals/thematic-areas/` | pública | — | Lista de áreas temáticas con sus sub-áreas anidadas. |
| GET | `/api/v3/proposals/thematic-areas/{id}/` | pública | — | Lista de áreas temáticas con sus sub-áreas anidadas. |
| GET | `/api/v3/proposals/thematic-subareas/` | pública | — | Lista de sub-áreas temáticas filtrable por área padre (`?area=<id>`). |
| GET | `/api/v3/proposals/thematic-subareas/{id}/` | pública | — | Lista de sub-áreas temáticas filtrable por área padre (`?area=<id>`). |
| DELETE | `/api/v3/proposals/{id}/` | JWT | — | Gestión completa de propuestas de investigación (CRUD + acciones de flujo). |
| GET | `/api/v3/proposals/{id}/` | JWT | — | Gestión completa de propuestas de investigación (CRUD + acciones de flujo). |
| PATCH | `/api/v3/proposals/{id}/` | JWT | — | Gestión completa de propuestas de investigación (CRUD + acciones de flujo). |
| PUT | `/api/v3/proposals/{id}/` | JWT | — | PATCH/PUT: responde con el detalle (incidencia 008). |
| GET | `/api/v3/proposals/{id}/allied-experts/` | JWT | documenta permisos | Lista (GET) o agrega (POST) un experto aliado a la propuesta. |
| POST | `/api/v3/proposals/{id}/allied-experts/` | JWT | documenta permisos | La persona va en un solo campo, `person`: la clave de una persona del sistema (`PER-ADG-…`) o la de una persona externa (`PERS-EXT-…`). |
| DELETE | `/api/v3/proposals/{id}/allied-experts/{allied_expert_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un experto aliado de la propuesta. |
| PATCH | `/api/v3/proposals/{id}/allied-experts/{allied_expert_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un experto aliado de la propuesta. |
| GET | `/api/v3/proposals/{id}/budget-items/` | JWT | — | Lista (GET) o agrega (POST) un rubro al presupuesto de la propuesta. |
| POST | `/api/v3/proposals/{id}/budget-items/` | JWT | — | Requiere el tipo de rubro (`budget_item_type_id`) y la descripción. |
| DELETE | `/api/v3/proposals/{id}/budget-items/{budget_item_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un rubro del presupuesto de la propuesta. |
| PATCH | `/api/v3/proposals/{id}/budget-items/{budget_item_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un rubro del presupuesto de la propuesta. |
| GET | `/api/v3/proposals/{id}/budget-summary/` | JWT | — | Agregados por rubro y por entidad aportante, más los totales. |
| GET | `/api/v3/proposals/{id}/documents/` | JWT | documenta permisos | Lista (GET) o registra (POST) un documento adjunto a la propuesta. |
| POST | `/api/v3/proposals/{id}/documents/` | JWT | — | Acepta nombre, referencia del archivo y descripción opcional. |
| DELETE | `/api/v3/proposals/{id}/documents/{document_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un documento adjunto de la propuesta. |
| PATCH | `/api/v3/proposals/{id}/documents/{document_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un documento adjunto de la propuesta. |
| GET | `/api/v3/proposals/{id}/dynamic-data/` | JWT | — | Retorna todos los campos dinámicos guardados para esta propuesta. |
| PUT | `/api/v3/proposals/{id}/dynamic-data/` | JWT | — | Acepta una lista de objetos `[{ "field_key": "...", "value": ... |
| GET | `/api/v3/proposals/{id}/experts/` | JWT | documenta permisos | Lista (GET) o agrega (POST) un experto interno (usuario del sistema) a la propuesta. |
| POST | `/api/v3/proposals/{id}/experts/` | JWT | documenta permisos | Requiere el ID del usuario, su rol y porcentaje de dedicación. |
| DELETE | `/api/v3/proposals/{id}/experts/{expert_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un experto de la propuesta. |
| PATCH | `/api/v3/proposals/{id}/experts/{expert_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un experto de la propuesta. |
| GET | `/api/v3/proposals/{id}/external-organizations/` | JWT | — | Organizaciones aliadas, tomadas del catálogo del sistema. |
| POST | `/api/v3/proposals/{id}/external-organizations/` | JWT | — | Requiere el id de la organización (`ORG-ADG-…`, string). |
| DELETE | `/api/v3/proposals/{id}/external-organizations/{external_org_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) una organización externa de la propuesta. |
| PATCH | `/api/v3/proposals/{id}/external-organizations/{external_org_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) una organización externa de la propuesta. |
| GET | `/api/v3/proposals/{id}/impacts/` | JWT | — | Lista (GET) o agrega (POST) un impacto esperado a la propuesta. |
| POST | `/api/v3/proposals/{id}/impacts/` | JWT | — | Incluye tipo de impacto, tipo de resultado esperado, descripción, indicador y valor meta. |
| DELETE | `/api/v3/proposals/{id}/impacts/{impact_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un impacto esperado de la propuesta. |
| PATCH | `/api/v3/proposals/{id}/impacts/{impact_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) un impacto esperado de la propuesta. |
| GET | `/api/v3/proposals/{id}/pdf/` | JWT | proceso de evaluación | 063 — Arma el documento desde el esquema del formulario: respuestas, relaciones, presupuesto, cronograma, impacto y lista de documentos. |
| PATCH | `/api/v3/proposals/{id}/public-listing/` | JWT | consentimiento Ley 1581 | Solo el gestor. |
| GET | `/api/v3/proposals/{id}/result/` | JWT | proceso de evaluación | Lo que el autor y sus coautores ven al abrir «Ver resultado». |
| GET | `/api/v3/proposals/{id}/schedule/` | JWT | — | Lista (GET) o agrega (POST) una actividad al cronograma de la propuesta. |
| POST | `/api/v3/proposals/{id}/schedule/` | JWT | — | Incluye título, descripción, responsable y rango de meses (`start_month` ≤ `end_month`). |
| DELETE | `/api/v3/proposals/{id}/schedule/{schedule_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) una actividad del cronograma de la propuesta. |
| PATCH | `/api/v3/proposals/{id}/schedule/{schedule_id}/` | JWT | — | Edita (PATCH) o elimina (DELETE) una actividad del cronograma de la propuesta. |
| POST | `/api/v3/proposals/{id}/submit/` | JWT | — | Transiciona de `draft` o `returned` → `submitted`. |
| GET | `/api/v3/proposals/{id}/supporting-organizations/` | JWT | — | Organizaciones aliadas registradas en el sistema. |
| POST | `/api/v3/proposals/{id}/supporting-organizations/` | JWT | — | Requiere el id de la organización (`ORG-ADG-…`, string) y opcionalmente su rol. |
| DELETE | `/api/v3/proposals/{id}/supporting-organizations/{supporting_org_id}/` | JWT | — | Edita (PATCH) o desvincula (DELETE) una organización de apoyo de la propuesta. |
| PATCH | `/api/v3/proposals/{id}/supporting-organizations/{supporting_org_id}/` | JWT | — | Edita (PATCH) o desvincula (DELETE) una organización de apoyo de la propuesta. |

### Evaluación de propuestas

- Rúbricas, conflicto de interés, expertos externos, sesiones — 51 operaciones

**`api/v3/evaluations`** (51 operaciones)

| Método | Ruta | Acceso | Permisos documentados | Descripción |
|---|---|---|---|---|
| GET | `/api/v3/evaluations/branding/` | JWT | — | Textos con los que se pinta la cabecera del formato (institución, proceso, título del documento, código, versión y fecha). |
| GET | `/api/v3/evaluations/conflict-questions/` | JWT | proceso de evaluación | CRUD de preguntas de conflicto de interés por convocatoria (solo gestores). |
| POST | `/api/v3/evaluations/conflict-questions/` | JWT | proceso de evaluación | CRUD de preguntas de conflicto de interés por convocatoria (solo gestores). |
| DELETE | `/api/v3/evaluations/conflict-questions/{id}/` | JWT | proceso de evaluación | CRUD de preguntas de conflicto de interés por convocatoria (solo gestores). |
| GET | `/api/v3/evaluations/conflict-questions/{id}/` | JWT | proceso de evaluación | CRUD de preguntas de conflicto de interés por convocatoria (solo gestores). |
| PATCH | `/api/v3/evaluations/conflict-questions/{id}/` | JWT | proceso de evaluación | CRUD de preguntas de conflicto de interés por convocatoria (solo gestores). |
| PUT | `/api/v3/evaluations/conflict-questions/{id}/` | JWT | proceso de evaluación | CRUD de preguntas de conflicto de interés por convocatoria (solo gestores). |
| GET | `/api/v3/evaluations/convocations/{id}/conflict-questions/` | JWT | proceso de evaluación | Rúbrica y preguntas de conflicto de interés de una convocatoria (solo gestores). |
| PUT | `/api/v3/evaluations/convocations/{id}/conflict-questions/` | JWT | — | Body: `{questions: [{id?, text, order?, is_required?}]}`. |
| GET | `/api/v3/evaluations/convocations/{id}/rubric-documents/` | JWT | proceso de evaluación | Rúbrica y preguntas de conflicto de interés de una convocatoria (solo gestores). |
| POST | `/api/v3/evaluations/convocations/{id}/rubric-documents/` | JWT | proceso de evaluación | El archivo se sube antes a S3 con URL prefirmada; aquí solo llega su key, que debe estar bajo `private/convocations/{id}/`. |
| DELETE | `/api/v3/evaluations/convocations/{id}/rubric-documents/{doc_id}/` | JWT | proceso de evaluación | Rúbrica y preguntas de conflicto de interés de una convocatoria (solo gestores). |
| PATCH | `/api/v3/evaluations/convocations/{id}/rubric-documents/{doc_id}/` | JWT | proceso de evaluación | Rúbrica y preguntas de conflicto de interés de una convocatoria (solo gestores). |
| GET | `/api/v3/evaluations/convocations/{id}/rubric/` | JWT | proceso de evaluación | 200 con cuerpo vacío si la convocatoria todavía no tiene rúbrica; 404 solo si no existe la convocatoria. |
| PUT | `/api/v3/evaluations/convocations/{id}/rubric/` | JWT | proceso de evaluación | Body: `{name?, description?, structure}`. |
| POST | `/api/v3/evaluations/external-evaluators/` | JWT | documenta permisos | Body: `{first_names, family_names, org_email, document_number}`. |
| POST | `/api/v3/evaluations/link/session/` | pública | — | Body: `{token, document_number}`. |
| GET | `/api/v3/evaluations/my-evaluations/` | JWT | proceso de evaluación | Evaluaciones asignadas al evaluador autenticado. |
| GET | `/api/v3/evaluations/my-evaluations/{id}/` | JWT | proceso de evaluación | Evaluaciones asignadas al evaluador autenticado. |
| POST | `/api/v3/evaluations/my-evaluations/{id}/accept-terms/` | JWT | — | Registra `terms_accepted_at`. |
| GET | `/api/v3/evaluations/my-evaluations/{id}/conflict-check/` | JWT | proceso de evaluación | Retorna las preguntas COI de la convocatoria y las respuestas previas del evaluador. |
| POST | `/api/v3/evaluations/my-evaluations/{id}/conflict-check/` | JWT | — | Body: `{answers: [{question, has_conflict, notes}]}`. |
| GET | `/api/v3/evaluations/my-evaluations/{id}/pdf/` | JWT | — | Formato FO-IN-003 con mis respuestas, puntaje, concepto final y firma. |
| GET | `/api/v3/evaluations/my-evaluations/{id}/responses/` | JWT | proceso de evaluación | Listar o guardar respuestas del evaluador a los criterios de la rúbrica. |
| POST | `/api/v3/evaluations/my-evaluations/{id}/responses/` | JWT | proceso de evaluación | Listar o guardar respuestas del evaluador a los criterios de la rúbrica. |
| GET | `/api/v3/evaluations/my-evaluations/{id}/rubric/` | JWT | proceso de evaluación | Devuelve la versión inmutable de la rúbrica asociada a la asignación. |
| POST | `/api/v3/evaluations/my-evaluations/{id}/submit/` | JWT | proceso de evaluación | Enviar la evaluación como completada. |
| GET | `/api/v3/evaluations/proposal-evaluations/` | JWT | documenta permisos; proceso de evaluación | Gestión de evaluaciones de propuestas (solo gestores). |
| POST | `/api/v3/evaluations/proposal-evaluations/` | JWT | — | Escribe con el `InputSerializer`, responde con el detalle (con `id` y snapshot). |
| POST | `/api/v3/evaluations/proposal-evaluations/assign-to-proposal/` | JWT | proceso de evaluación | Body: `{proposal: <id>, evaluator_ids: [pk, ...]}`. |
| GET | `/api/v3/evaluations/proposal-evaluations/candidates/` | JWT | — | Líderes activos que pasan las reglas de asignación. |
| GET | `/api/v3/evaluations/proposal-evaluations/{id}/` | JWT | documenta permisos; proceso de evaluación | Gestión de evaluaciones de propuestas (solo gestores). |
| POST | `/api/v3/evaluations/proposal-evaluations/{id}/assign/` | JWT | proceso de evaluación | Agrega uno o más evaluadores. |
| GET | `/api/v3/evaluations/proposal-evaluations/{id}/assignments/` | JWT | proceso de evaluación | Listar todos los assignments de esta evaluación con su estado actual. |
| GET | `/api/v3/evaluations/proposal-evaluations/{id}/assignments/{assignment_id}/pdf/` | JWT | — | Formato FO-IN-003 del assignment indicado. |
| POST | `/api/v3/evaluations/proposal-evaluations/{id}/cancel/` | JWT | proceso de evaluación | Pasa la evaluación a `cancelled`; si la propuesta no tiene otra viva, vuelve a `submitted`. |
| POST | `/api/v3/evaluations/proposal-evaluations/{id}/finalize/` | JWT | proceso de evaluación | Marca la evaluación como `completed`. |
| POST | `/api/v3/evaluations/proposal-evaluations/{id}/remove-evaluator/` | JWT | proceso de evaluación | Body: `{evaluator_id: pk}`. |
| POST | `/api/v3/evaluations/proposal-evaluations/{id}/reopen/` | JWT | proceso de evaluación | Body: `{evaluator_id: pk}`. |
| POST | `/api/v3/evaluations/proposal-evaluations/{id}/resolve/` | JWT | proceso de evaluación | Body opcional `{decision: "approved" \| "rejected", note}`; sin `decision` usa la agregada (`summary.is_approved`). |
| POST | `/api/v3/evaluations/proposal-evaluations/{id}/send-invitations/` | JWT | proceso de evaluación | Sin body: invita a todos los evaluadores en estado `assigned`, y solo si «Revisión de propuestas» está en curso. |
| GET | `/api/v3/evaluations/rubric-templates/` | JWT | requiere admin; proceso de evaluación | CRUD de plantillas de rúbricas (solo gestores). |
| POST | `/api/v3/evaluations/rubric-templates/` | JWT | requiere admin; proceso de evaluación | CRUD de plantillas de rúbricas (solo gestores). |
| DELETE | `/api/v3/evaluations/rubric-templates/{id}/` | JWT | requiere admin; proceso de evaluación | CRUD de plantillas de rúbricas (solo gestores). |
| GET | `/api/v3/evaluations/rubric-templates/{id}/` | JWT | requiere admin; proceso de evaluación | CRUD de plantillas de rúbricas (solo gestores). |
| PATCH | `/api/v3/evaluations/rubric-templates/{id}/` | JWT | requiere admin; proceso de evaluación | CRUD de plantillas de rúbricas (solo gestores). |
| PUT | `/api/v3/evaluations/rubric-templates/{id}/` | JWT | requiere admin; proceso de evaluación | CRUD de plantillas de rúbricas (solo gestores). |
| POST | `/api/v3/evaluations/rubric-templates/{id}/archive/` | JWT | proceso de evaluación | Mueve la rúbrica a estado `archived`. |
| POST | `/api/v3/evaluations/rubric-templates/{id}/clone/` | JWT | proceso de evaluación | Crea una copia editable de la rúbrica. |
| POST | `/api/v3/evaluations/rubric-templates/{id}/publish/` | JWT | proceso de evaluación | Valida la estructura, copia al `published_snapshot`, incrementa la versión y pone `status=published`. |
| GET | `/api/v3/evaluations/rubric-templates/{id}/structure/` | JWT | proceso de evaluación | Para rúbricas en `draft`: retorna la estructura editable. |

## 4. Endpoints públicos (responden sin JWT)

Total: **161** operaciones. Reparto por capacidad:

| Capacidad | Operaciones públicas |
|---|---|
| Convocatorias | 31 |
| Postulaciones a convocatorias | 26 |
| Expertos e investigadores | 23 |
| Catálogos de dominio | 20 |
| Identidad y acceso | 12 |
| Landing pages institucionales | 7 |
| Empresas y prototipos | 5 |
| Producción jurídica | 5 |
| Patentes | 5 |
| Productos de investigación | 5 |
| Proyectos de investigación | 5 |
| Publicaciones | 5 |
| Instituciones | 4 |
| Búsqueda global | 3 |
| Financiamiento | 2 |
| Eventos | 1 |
| Metadatos externos | 1 |
| Evaluación de propuestas | 1 |

Endpoints públicos completos:

- `GET /api/v2/search/autocomplete/` — Autocompletado mientras el usuario escribe.
- `GET /api/v2/search/matches/search/` — Búsqueda de coincidencias por título o identificador.
- `GET /api/v2/search/random/` — Resultados aleatorios serializados según tipo.
- `GET /api/v2/index/age-ranges/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/areas/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/cities/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/countries/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/currencies/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/education-programs/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/education-types/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/file-types/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/fraction-types/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/industry-types/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/interesting-topics/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/languages/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/lines/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/media-types/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/ns4-access/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/ods/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/platforms/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/right-types/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/skills/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v2/index/social-networks/` — Indic* reference catalogs are public to read; writes require auth.
- `GET /api/v3/convocations/` — Gestión completa de convocatorias (CRUD + transiciones de estado).
- `GET /api/v3/convocations/areas/` — Lista de áreas temáticas del catálogo institucional.
- `GET /api/v3/convocations/areas/{area_id}/` — Lista de áreas temáticas del catálogo institucional.
- `GET /api/v3/convocations/budget-item-types/` — Lista de tipos de rubro presupuestal activos con jerarquía y ruta completa.
- `GET /api/v3/convocations/budget-item-types/{id}/` — Lista de tipos de rubro presupuestal activos con jerarquía y ruta completa.
- `GET /api/v3/convocations/currencies/` — Lista de monedas activas para denominar el presupuesto de la convocatoria.
- `GET /api/v3/convocations/currencies/{id}/` — Lista de monedas activas para denominar el presupuesto de la convocatoria.
- `GET /api/v3/convocations/financing-types/` — Lista de tipos de financiación disponibles con su macro-tipo.
- `GET /api/v3/convocations/financing-types/{id}/` — Lista de tipos de financiación disponibles con su macro-tipo.
- `GET /api/v3/convocations/keywords/` — Lista de palabras clave del catálogo institucional.
- `GET /api/v3/convocations/keywords/{cfkeyw_id}/` — Lista de palabras clave del catálogo institucional.
- `GET /api/v3/convocations/lines/` — Lista de líneas de investigación del catálogo institucional.
- `GET /api/v3/convocations/lines/{line_id}/` — Lista de líneas de investigación del catálogo institucional.
- `GET /api/v3/convocations/ods/` — Lista de Objetivos de Desarrollo Sostenible (ODS) disponibles.
- `GET /api/v3/convocations/ods/{id}/` — Lista de Objetivos de Desarrollo Sostenible (ODS) disponibles.
- `GET /api/v3/convocations/organization-types/` — Lista de tipos de organización (ej.
- `GET /api/v3/convocations/organization-types/{id}/` — Lista de tipos de organización (ej.
- `GET /api/v3/convocations/phase-types/` — Catálogo GLOBAL de tipos de fase del sistema (apertura, recepción, resultados y plantillas).
- `GET /api/v3/convocations/phase-types/{id}/` — Catálogo GLOBAL de tipos de fase del sistema (apertura, recepción, resultados y plantillas).
- `GET /api/v3/convocations/platforms/` — Lista de plataformas digitales del catálogo (ej.
- `GET /api/v3/convocations/platforms/{id}/` — Lista de plataformas digitales del catálogo (ej.
- `GET /api/v3/convocations/social-networks/` — Lista de redes sociales del catálogo institucional.
- `GET /api/v3/convocations/social-networks/{id}/` — Lista de redes sociales del catálogo institucional.
- `GET /api/v3/convocations/statuses/` — Lista de estados posibles de una convocatoria (draft, scheduled, published, closed, etc.).
- `GET /api/v3/convocations/statuses/{id}/` — Lista de estados posibles de una convocatoria (draft, scheduled, published, closed, etc.).
- `GET /api/v3/convocations/types/` — Lista de tipos de convocatoria disponibles (ej.
- `GET /api/v3/convocations/types/{id}/` — Lista de tipos de convocatoria disponibles (ej.
- `GET /api/v3/convocations/{id}/` — Retorna la convocatoria con todas sus relaciones anidadas: fases, presupuesto, documentos, responsables (con `user_image
- `GET /api/v3/convocations/{id}/budget-matrix/` — Retorna la matriz presupuestal completa: rubros (filas), contrapartidas/organizaciones (columnas), celdas con montos en 
- `GET /api/v3/convocations/{id}/layout/` — Lee (GET) o reemplaza (PUT) el layout del formulario dinámico de la convocatoria.
- `GET /api/v3/convocations/{id}/results/` — Propuestas aprobadas por radicado, sin puntajes.
- `GET /api/v2/enterprise/person-enterprises/{cfpersid}/enterprises/` — A mixin to be used with production ViewSets to allow submitting them for committee evaluation.
- `GET /api/v2/enterprise/person-enterprises/{resenterid}/` — A mixin to be used with production ViewSets to allow submitting them for committee evaluation.
- `GET /api/v2/enterprise/search-faceted-v2/` — Endpoint principal de búsqueda con facetas
- `GET /api/v2/enterprise/search-faceted-v2/{id}/recommendations/` — Devuelve publicaciones similares basadas en el contenido del documento actual.
- `GET /api/v2/enterprise/search-faceted/` — 
- `POST /api/v3/evaluations/link/session/` — Body: `{token, document_number}`.
- `GET /api/v2/event/search-faceted/` — 
- `GET /api/v2/person/about-of/academic-formation/` — 
- `GET /api/v2/person/about-of/academic-formation/{id}/` — 
- `GET /api/v2/person/about-of/capacities/{id}/` — 
- `GET /api/v2/person/about-of/general/{id}/` — 
- `GET /api/v2/person/analytics/{id}/ods/` — 
- `GET /api/v2/person/analytics/{id}/production/` — 
- `GET /api/v2/person/analytics/{id}/production_test/` — 
- `GET /api/v2/person/analytics/{id}/project/` — 
- `GET /api/v2/person/analytics/{id}/scholar/` — 
- `GET /api/v2/person/badges/{cfpersid}/badges/` — 
- `GET /api/v2/person/badges/{id}/` — 
- `GET /api/v2/person/cocreators/{id}/` — 
- `GET /api/v2/person/experience-academic/{id}/` — 
- `GET /api/v2/person/experience-industry/{id}/` — 
- `GET /api/v2/person/experience-investigation/{id}/` — 
- `GET /api/v2/person/groups/{id}/` — 
- `GET /api/v2/person/hotbeds/{id}/` — 
- `GET /api/v2/person/person-types-index/` — 
- `GET /api/v2/person/scores/{cfpersid}/scores/` — 
- `GET /api/v2/person/scores/{id}/` — 
- `GET /api/v2/person/search-faceted-v2/` — Endpoint principal de búsqueda con facetas
- `GET /api/v2/person/search-faceted-v2/{id}/recommendations/` — Devuelve organizaciones similares basadas en el contenido del documento actual.
- `GET /api/v2/person/search-faceted/` — 
- `GET /api/v2/funding/search-faceted/` — 
- `GET /api/v2/funding/{cffundid}/general/` — GET: /api/v2/funding/{cffundid}/general/
- `POST /auth/v2/account-confirm-email/` — 
- `POST /auth/v2/account-confirm-email/{key}/` — 
- `GET /auth/v2/consent/active-documents/` — Return both active legal documents (privacy policy + tenant terms) for public onboarding.
- `GET /auth/v2/consent/active-policy/` — Return the currently active data-processing policy for public onboarding.
- `GET /auth/v2/entra-id/login/complete/` — Callback view for Entra ID Login flow.
- `POST /auth/v2/entra-id/login/complete/` — Complete (or claim) a profile for the identity proven by the GET.
- `POST /auth/v2/forgot-password/` — 
- `POST /auth/v2/login/` — Check the credentials and return the REST Token if the credentials are valid and authenticated.
- `POST /auth/v2/reset-password/` — 
- `POST /auth/v2/sign-up/` — 
- `POST /auth/v2/verify-email/` — 
- `POST /auth/v2/verify-token-reset-password/` — 
- `GET /api/v2/organization/organizations/relationships/{cforgunitid}/` — Get or create the relationship between organizations.
- `GET /api/v2/organization/search-faceted-v2/` — Endpoint principal de búsqueda con facetas
- `GET /api/v2/organization/search-faceted-v2/{id}/recommendations/` — Devuelve organizaciones similares basadas en el contenido del documento actual.
- `GET /api/v2/organization/search-faceted/` — 
- `GET /api/v2/landing-page/ctele/` — 
- `GET /api/v2/landing-page/fundings/` — 
- `GET /api/v2/landing-page/layout/` — JSON del page-builder del landing: GET público, PUT (upsert) para Administrator/Manager.
- `GET /api/v2/landing-page/notable-experts/` — 
- `GET /api/v2/landing-page/ods/` — 
- `GET /api/v2/landing-page/org-by-ctele/` — 
- `GET /api/v2/landing-page/researchers-catalog/` — 
- `GET /api/v2/external-metadata/get/` — Returns metadata based on the source and source_id provided.
- `GET /api/v2/patent/person-patents/{cfpersid}/patents/` — A mixin to be used with production ViewSets to allow submitting them for committee evaluation.
- `GET /api/v2/patent/person-patents/{cfrespatid}/` — A mixin to be used with production ViewSets to allow submitting them for committee evaluation.
- `GET /api/v2/patent/search-faceted-v2/` — Endpoint principal de búsqueda con facetas
- `GET /api/v2/patent/search-faceted-v2/{id}/recommendations/` — Devuelve publicaciones similares basadas en el contenido del documento actual.
- `GET /api/v2/patent/search-faceted/` — 
- `GET /api/v3/proposals/beneficiary-groups/` — Lista de grupos beneficiarios disponibles para la propuesta (ej.
- `GET /api/v3/proposals/beneficiary-groups/{id}/` — Lista de grupos beneficiarios disponibles para la propuesta (ej.
- `GET /api/v3/proposals/expected-result-types/` — Lista de tipos de resultado esperado para la sección de impactos de la propuesta.
- `GET /api/v3/proposals/expected-result-types/{id}/` — Lista de tipos de resultado esperado para la sección de impactos de la propuesta.
- `GET /api/v3/proposals/form-catalogs/` — Registro de los catálogos que puede consumir un campo de selección del formulario.
- `GET /api/v3/proposals/impact-period-types/` — Lista de periodos de impacto (corto, mediano y largo plazo).
- `GET /api/v3/proposals/impact-period-types/{id}/` — Lista de periodos de impacto (corto, mediano y largo plazo).
- `GET /api/v3/proposals/impact-types/` — Lista de tipos de impacto disponibles para la sección de impactos de la propuesta.
- `GET /api/v3/proposals/impact-types/{id}/` — Lista de tipos de impacto disponibles para la sección de impactos de la propuesta.
- `GET /api/v3/proposals/innovation-types/` — Lista de tipos de innovación disponibles para clasificar una propuesta.
- `GET /api/v3/proposals/innovation-types/{id}/` — Lista de tipos de innovación disponibles para clasificar una propuesta.
- `GET /api/v3/proposals/interest-subtopics/` — Lista de sub-temas de interés filtrable por tema padre (`?topic=<id>`).
- `GET /api/v3/proposals/interest-subtopics/{id}/` — Lista de sub-temas de interés filtrable por tema padre (`?topic=<id>`).
- `GET /api/v3/proposals/interest-topics/` — Lista de temas de interés con sus sub-temas anidados.
- `GET /api/v3/proposals/interest-topics/{id}/` — Lista de temas de interés con sus sub-temas anidados.
- `GET /api/v3/proposals/person-roles/` — Catálogo de roles de una persona dentro de un proyecto (Investigador Principal, Asesor, Orientador de Semillero...).
- `GET /api/v3/proposals/person-roles/{id}/` — Catálogo de roles de una persona dentro de un proyecto (Investigador Principal, Asesor, Orientador de Semillero...).
- `GET /api/v3/proposals/project-types/` — Lista de tipos de proyecto disponibles para clasificar una propuesta.
- `GET /api/v3/proposals/project-types/{id}/` — Lista de tipos de proyecto disponibles para clasificar una propuesta.
- `GET /api/v3/proposals/statuses/` — Lista de estados posibles de una propuesta (draft, submitted, returned, approved, rejected, etc.).
- `GET /api/v3/proposals/statuses/{id}/` — Lista de estados posibles de una propuesta (draft, submitted, returned, approved, rejected, etc.).
- `GET /api/v3/proposals/submission-declarations/` — Las cinco declaraciones que el postulante hace al enviar su propuesta (055).
- `GET /api/v3/proposals/thematic-areas/` — Lista de áreas temáticas con sus sub-áreas anidadas.
- `GET /api/v3/proposals/thematic-areas/{id}/` — Lista de áreas temáticas con sus sub-áreas anidadas.
- `GET /api/v3/proposals/thematic-subareas/` — Lista de sub-áreas temáticas filtrable por área padre (`?area=<id>`).
- `GET /api/v3/proposals/thematic-subareas/{id}/` — Lista de sub-áreas temáticas filtrable por área padre (`?area=<id>`).
- `GET /api/v2/law/person-laws/{cfpersid}/laws/` — A mixin to be used with production ViewSets to allow submitting them for committee evaluation.
- `GET /api/v2/law/person-laws/{reslawid}/` — A mixin to be used with production ViewSets to allow submitting them for committee evaluation.
- `GET /api/v2/law/search-faceted-v2/` — Endpoint principal de búsqueda con facetas
- `GET /api/v2/law/search-faceted-v2/{id}/recommendations/` — Devuelve publicaciones similares basadas en el contenido del documento actual.
- `GET /api/v2/law/search-faceted/` — 
- `GET /api/v2/product/person-products/{cfpersid}/products/` — A mixin to be used with production ViewSets to allow submitting them for committee evaluation.
- `GET /api/v2/product/person-products/{cfresprodid}/` — A mixin to be used with production ViewSets to allow submitting them for committee evaluation.
- `GET /api/v2/product/search-faceted-v2/` — Endpoint principal de búsqueda con facetas
- `GET /api/v2/product/search-faceted-v2/{id}/recommendations/` — Devuelve publicaciones similares basadas en el contenido del documento actual.
- `GET /api/v2/product/search-faceted/` — 
- `GET /api/v2/project/person-projects/{cfpersid}/projects/` — A mixin to be used with production ViewSets to allow submitting them for committee evaluation.
- `GET /api/v2/project/person-projects/{cfprojid}/` — A mixin to be used with production ViewSets to allow submitting them for committee evaluation.
- `GET /api/v2/project/search-faceted-v2/` — Endpoint principal de búsqueda con facetas
- `GET /api/v2/project/search-faceted-v2/{id}/recommendations/` — Devuelve publicaciones similares basadas en el contenido del documento actual.
- `GET /api/v2/project/search-faceted/` — 
- `GET /api/v2/publication/person-publications/{cfpersid}/publications/` — A mixin to be used with production ViewSets to allow submitting them for committee evaluation.
- `GET /api/v2/publication/person-publications/{cfrespublid}/` — A mixin to be used with production ViewSets to allow submitting them for committee evaluation.
- `GET /api/v2/publication/search-faceted-v2/` — Endpoint principal de búsqueda con facetas
- `GET /api/v2/publication/search-faceted-v2/{id}/recommendations/` — Devuelve publicaciones similares basadas en el contenido del documento actual.
- `GET /api/v2/publication/search-faceted/` — 

## 5. Endpoints sin descripción

338 de 908 operaciones no tienen `description` (37%). Este sí es un punto ciego del atacante: para esas rutas hay que deducir el contrato probando.

| Ruta | Método |
|---|---|
| `/auth/v2/logout/` | POST |
| `/auth/v2/sign-up/` | POST |
| `/auth/v2/verify-email/` | POST |
| `/auth/v2/account-confirm-email/` | POST |
| `/auth/v2/account-confirm-email/{key}/` | POST |
| `/auth/v2/forgot-password/` | POST |
| `/auth/v2/verify-token-reset-password/` | POST |
| `/auth/v2/reset-password/` | POST |
| `/api/v2/bulk-operation/{model_name}/` | GET |
| `/api/v2/bulk-operation/{model_name}/` | POST |
| `/api/v2/bulk-operation/{model_name}/` | PUT |
| `/api/v2/bulk-operation/{model_name}/` | DELETE |
| `/api/v2/enterprise/search-faceted/` | GET |
| `/api/v2/enterprise/match-detail/{id}/` | GET |
| `/api/v2/enterprise/person-enterprises/{resenterid}/ns4-access/` | POST |
| `/api/v2/enterprise/person-enterprises/{resenterid}/ns4-access/` | GET |
| `/api/v2/enterprise/person-enterprises/{resenterid}/ns4-access/{id}/` | PUT |
| `/api/v2/enterprise/person-enterprises/{resenterid}/ns4-access/{id}/` | DELETE |
| `/api/v2/enterprise/person-enterprises/{resenterid}/ns4-access/{id}/` | PATCH |
| `/api/v2/enterprise/person-enterprises/{resenterid}/ns4-access/{id}/` | GET |
| `/api/v2/enterprise/enterprise-types-index/` | GET |
| `/api/v2/enterprise/enterprise-status-index/` | GET |
| `/api/v2/enterprise/enterprise-identifiers-index/` | GET |
| `/api/v2/enterprise/enterprise-badges-index/` | GET |
| `/api/v2/event/` | GET |
| `/api/v2/event/search-faceted/` | GET |
| `/api/v2/funding/` | GET |
| `/api/v2/funding/about-of/` | POST |
| `/api/v2/funding/financial-items/` | POST |
| `/api/v2/funding/financial-orgs/` | POST |
| `/api/v2/funding/general-info/` | POST |
| `/api/v2/funding/ns4/` | POST |
| `/api/v2/funding/{fundingitemsid}/remove/financial-items/` | DELETE |
| `/api/v2/funding/{cforgunitfundid}/remove/financial-orgs/` | DELETE |
| `/api/v2/funding/{ns4id}/remove/ns4/` | DELETE |
| `/api/v2/funding/{cffundid}/financial-items/types/` | GET |
| `/api/v2/funding/publish/` | POST |
| `/api/v2/funding/{fundingitemsid}/financial-items/` | PATCH |
| `/api/v2/funding/{cforgunitfundid}/financial-orgs/` | PATCH |
| `/api/v2/funding/{ns4id}/ns4/` | PATCH |
| `/api/v2/funding/search-faceted/` | GET |
| `/api/v2/funding/funding-call-type-index/` | GET |
| `/api/v2/funding/funding-type-index/` | GET |
| `/api/v2/funding/funding-item-type-index/` | GET |
| `/api/v2/funding-proposal/` | GET |
| `/api/v2/funding-proposal/add-areas/` | POST |
| `/api/v2/funding-proposal/add-beneficiary-groups/` | POST |
| `/api/v2/funding-proposal/add-focus-topics/` | POST |
| `/api/v2/funding-proposal/add-ods/` | POST |
| `/api/v2/funding-proposal/{cffundpropid}/allie-participants/list/` | GET |
| `/api/v2/funding-proposal/allie-org/` | POST |
| `/api/v2/funding-proposal/allie-participant/` | POST |
| `/api/v2/funding-proposal/basic-info/` | POST |
| `/api/v2/funding-proposal/narrative/` | POST |
| `/api/v2/funding-proposal/participant/` | POST |
| `/api/v2/funding-proposal/{cffundpersid}/remove/allie-participant/` | DELETE |
| `/api/v2/funding-proposal/{cffundpersid}/remove/participant/` | DELETE |
| `/api/v2/funding-proposal/send/` | POST |
| `/api/v2/funding-proposal/update/allie-org/` | PATCH |
| `/api/v2/funding-proposal/managment/assign-evaluation/` | POST |

_(… y 278 más; lista completa en `docs/adagio-superficie.csv`.)_

## 6. Comparación de superficie: Adaggio vs Khemia

| Métrica | Adaggio | Khemia |
|---|---|---|
| Rutas/módulos | 39 | 8 routers |
| Operaciones | 908 | 87 |
| Operaciones públicas sin token | 161 | todas (no hay auth) |
| Documentadas con descripción | 63% | ~0% (OpenAPI vacío de texto) |
| Control de acceso | JWT + cookie + header, por tenant | ninguno en el backend Python |
| Esquema OpenAPI público | 1,5 MB con 666 rutas | no publicado (protegido por entorno) |

Detalle de nuestros routers:

| Router | Endpoints |
|---|---|
| __init__.py | 0 |
| analytics.py | 2 |
| groups.py | 29 |
| imports.py | 13 |
| plans.py | 3 |
| products.py | 11 |
| projects.py | 7 |
| researchers.py | 10 |
| system.py | 12 |

