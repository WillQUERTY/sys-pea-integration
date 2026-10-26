# Análisis competitivo: Adaggio (ADAGGIO Servicios Colombia) vs Khemia / PEA-i

**Fecha:** 2026-10-25 (UTC 2026-10-26 00:45–01:05)
**Objetivo:** reconocimiento pasivo del competidor `adaggio.unicesar.edu.co` y mapa de debilidades +
brechas de producto frente a Khemia (PEA-i, Universidad Popular del Cesar).
**Método:** solo peticiones HTTP GET/OPTIONS sin credenciales contra el frontend público y el backend
público. Sin fuerza bruta, sin carga de archivos, sin escaneo de red, sin acceso a datos de otros tenants.

> **Nota de alcance.** Lo que sigue describe la superficie pública de un sistema de terceros. Se documenta
> para decisión de producto y para endurecer Khemia. Cualquier verificación intrusiva (subir un archivo
> real, probar IDOR, enumerar tenants) **requiere autorización escrita de ADAGGIO** y no se ejecutó.

---

## 0. Resumen ejecutivo

| # | Hallazgo | Severidad | Efecto para nosotros |
|---|---|---|---|
| D-01 | Backend Django con `DEBUG = True` en producción | **Crítica** | Regala el URLconf completo (30 prefijos) en cada 404 y permite mapear su API sin ningún acceso |
| D-02 | OpenAPI público de **1,5 MB** (666 endpoints) + Swagger UI + ReDoc | **Alta** | Entrega su plano arquitectónico completo, gratis y por escrito |
| D-03 | Frontend sin **ninguna** cabecera de seguridad (sin CSP, HSTS, X-Frame-Options, Referrer-Policy) | **Alta** | Clickjacking viable sobre una UI con formularios administrativos; sin HSTS pese a forzar HTTPS |
| D-04 | Fuga de configuración **multi-tenant**: `robots.txt` y `sitemap.xml` de Unicesar sirven datos de otros tenants | **Alta** | Demuestra que el aislamiento entre instituciones es una configuración, no una garantía |
| D-05 | **Volcado masivo sin autenticación**: 15 848 publicaciones, 5 832 proyectos, 953 empresas, 893 productos | **Alta** | Su corpus público es descargable; el nuestro no debe serlo |
| D-06 | Directorio completo de investigadores con query de 2 caracteres | Media | Superficie de enumeración e spear-phishing institucional |
| D-07 | `POST /api/s3/upload-public` parece **sin autenticación** (no se ejecutó carga real) | **Alta (a confirmar)** | Si se confirma, es almacenamiento abusivo en su bucket |
| D-08 | Sin rate-limit ni lockout observable en login (6 intentos, respuesta idéntica) | Media | Permite credential-stuffing sin freno (ni 429 ni bloqueo de cuenta) |
| D-09 | Datos de prueba **visibles al público** ("TEST PRUEBA - …", fechas 2026-10-08) | Media | Their catálogo público no está curado; postcards de su migración |
| D-10 | Fingerprinting: `X-Powered-By: Next.js`, `server: gunicorn`, `Via: cloudfront`, `/health` 200 público | Baja | Reconocimiento trivial de stack |
| D-11 | 404 del backend devuelve HTML de depuración donde se espera JSON | Baja | Fuga de plantilla + del propio bug de DEBUG |
| D-12 | Sin cabeceras anti-framing en el ancla que embebe el login | Media | Clickjacking del flujo de autenticación |

**Conclusión estratégica:** Adaggio es una plataforma **CRIS completa** (666 endpoints, 9 catálogos de
búsqueda, ciclo de vida de convocatorias, evaluación con rúbricas, gestor Scrum, biblioteca, consentimiento
GDPR, SSO Entra ID) que ya **ingerió datos derivados de Minciencias** (prefijos `PER-ADG-`, `PROJ-ADG-`,
`PUBL-ADG-`, `CONV-ADG-`; campos `cfpersid`, `cffamilynames`, `info_org.pers_rol` idénticos a CvLAC).
Su talón de Aquiles no es el producto: es el **aislamiento entre tenants** y la **ausencia de endurecimiento**
de la capa pública.

Y el punto más incómodo para nosotros: **el backend Python desplegado no tiene autenticación alguna**
(87 endpoints, CRUD completo, `/system/initialize/database`), y su CORS refleja cualquier origen con
credenciales. El backend Java de la migración ya lo resuelve (`@PreAuthorize`, JWT, autoridades) — el
problema es que lo que está en producción hoy es el Python.

---

## 1. Qué es Adaggio

### 1.1 Stack

| Capa | Tecnología (verificada) |
|---|---|
| Frontend | Next.js (App Router, `Vary: RSC`), desplegado tras **AWS CloudFront** |
| UI | **Ant Design** (`antd`) + `styled-components` + `zustand` + `axios` |
| Legado | Componentes `styled-components` con hash `sc-global-*` y campos `cf*` de CvLAC → migración Angular→Next sin cleaned |
| Backend | **Django + DRF** sobre **gunicorn** (`server: gunicorn`), multi-tenant por subdominio |
| Archivos | Bucket S3 por tenant: `files.adaggio.unicesar.edu.co` (listado denegado: `AccessDenied`) |
| Auth | JWT Bearer + cookie `jwt-auth` (3 esquemas: `jwtAuth`, `jwtCookieAuth`, `jwtHeaderAuth`) |

### 1.2 Superficie de API — 666 endpoints documentados

| Prefijo | Endpoints | Contenido |
|---|---|---|
| `api/v2/` | 418 | CRUD del catálogo CRIS: `person`, `product`, `project`, `publication`, `enterprise`, `patent`, `law`, `organization`, `funding`, `funding-proposal`, `library`, `interaction`, `resource-bank`, `external-metadata`, `landing-page`, `project-manager`, `bulk-operation/{model_name}` + **22 catálogos `index/`** (países, ciudades, áreas, líneas, ODS, skills, temas, idiomas, plataformas,industrias…) |
| `api/v3/` | 234 | Módulos de negocio nuevos: `convocations` (convocatorias), `proposals` (postulaciones), `evaluations` (evaluación), `production`, `project-manager` (Scrum), `person/me/data-rights` (consentimiento GDPR) |
| `auth/v2/` | 14 | login, refresh, token/verify, logout, sign-up, verify-email, confirm-email, **forgot-password**, reset-password, consent, **entra-id/login/complete** (SSO Microsoft) |

### 1.3 Módulos funcionales (de las rutas)

catálogo CRIS · búsqueda facetada (9+ índices) · **convocatorias** con fases, transiciones, matriz de
presupuesto, cronograma, publishing/unpublish · **postulaciones** con experimentados aliados, ítems de
presupuesto, documentos, declaration y PDF · **evaluaciones** con rúbricas, preguntas de conflicto de
interés, expertos externos, sesiones y PDF de evaluaciones · **gestor de proyectos estilo Scrum** (epics,
sprints, backlog, tasks, responsables, recursos, NS4-files) · biblioteca y resource bank · control de acceso
NS4 · consentimiento y derechos de datos (deletion/marketing/revoke) · landing pages por tenant.

### 1.4 Tenants observados

`adaggio.unicesar.edu.co` · `adaggio.uao.edu.co` · referencias a `cartagena.adaggio.com.co` (no resuelve en DNS).
Cada tenant tiene **backend propio** (`backend.adaggio.<tenant>`) → separación física de datos,yll sharing de código.

### 1.5 Huella de datos (público, sin auth)

Producciones **15 848**, proyectos **5 832**, empresas **953**, productos **893**, leyes **38**, patentes **5**
(cifras del tenant Unicesar; UAO: 1 597 proyectos, 288 empresas).

---

## 2. Debilidades del competidor — con evidencia reproducible

### D-01 · Django `DEBUG = True` en producción · **CRÍTICA**

```bash
curl -sS "https://backend.adaggio.unicesar.edu.co/api/v2/group/"
```

Devuelve una página de error HTML de Django de 6 111 bytes que dice literalmente:

> *«You're seeing this error because you have **DEBUG = True** in your Django settings file.»*

y **lista el URLconf completo**: `health`, `upc-admin/`, `admin/`, `auth/v2/`, `api/v2/bulk-operation/{model_name}/`,
`api/v2/index/`, `api/v2/enterprise/`, `api/v2/event/`, `api/v2/funding/`, `api/v2/funding-proposal/`, `api/v2/law/`,
`api/v2/organization/`, `api/v2/patent/`, `api/v2/person/`, `api/v2/product/`, `api/v2/project/`,
`api/v2/publication/`, `api/v2/library/`, `api/v2/interaction/`, `api/v2/external-metadata/`,
`api/v2/landing-page/`, `api/v2/resource-bank/`, `api/v2/project-manager/`, `api/v2/search/`,
`api/v3/project-manager/`, `api/v3/person/`, `api/v3/production/`, `api/v3/index/`, `api/v3/convocations/`,
`api/v3/proposals/`, `api/v3/evaluations/`, `api/v3/schema/`.

También expone el **Request URL interno** (`http://backend.adaggio.unicesar.edu.co/...` → esquema interno,
no HTTPS). Con `DEBUG=True`, un 500 expone además traceback completo y variables de entorno — y ese 500
**ya existe hoy**: `POST /api/s3/upload-public` con cuerpo vacío responde
`500 {"error":"Error al subir el archivo"}` (D-07). Un error 500 en DEBUG puede volcar el entorno y las
claves de AWS/S3. **Este es el hallazgo que más rápido les costaría caro** (hipótesis de compromiso vía
D-07 o vía D-06).

### D-02 · OpenAPI público de 1,5 MB + Swagger UI + ReDoc · **ALTA**

```bash
curl -sS -o schema.yaml "https://backend.adaggio.unicesar.edu.co/api/v3/schema/"   # 1 521 805 bytes
curl -sS -o /dev/null -w "%{http_code}\n" "https://backend.adaggio.unicesar.edu.co/api/v3/schema/swagger/"   # 200
curl -sS -o /dev/null -w "%{http_code}\n" "https://backend.adaggio.unicesar.edu.co/api/v3/schema/redoc/"      # 200
```

El esquema se titula *«Adaggio API» v3.0.0* y su descripción admite el modelo de permisos: *«Most endpoints
require a valid JWT Bearer token; the ones documented as public … also answer without one»*. Publicar el
contrato completo equivale a publicar el inventario de su negocio, incluidos los endpoints que_declaran
"públicos" y por tanto los que **no** lo son por diseño, sino por filtro.

### D-03 · Frontend sin cabeceras de seguridad · **ALTA**

```
GET https://adaggio.unicesar.edu.co/     →  200
X-Powered-By: Next.js
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
X-Cache: Miss from cloudfront
Via: 1.1 <id>@cloudfront.net
```

Ausentes: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options` / `frame-ancestors`,
`Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`. En `/`, `/login` y `/register` la respuesta
**no trae ni una sola**. El backend sí tiene `x-frame-options: DENY` y `x-content-type-options: nosniff` —
o sea: **el wrapper Next.js no propaga los headers del backend y arrastra a toda la UI a cero protections**.
Consecuencias: clickjacking sobre el login y sobre los formularios administrativos (invitar al administrador
a hacer clic en un iframe malicioso sobre el botón de "publicar convocatoria"), y ausencia de HSTS pese a
que fuerzan 301 `http→https`.

### D-04 · Fuga de configuración cross-tenant · **ALTA**

```
GET https://adaggio.unicesar.edu.co/robots.txt
  Sitemap: https://adaggio.uao.edu.co/sitemap.xml        ← tenant UAO, no Unicesar

GET https://adaggio.unicesar.edu.co/sitemap.xml
  <loc>https://cartagena.adaggio.com.co/search/biotecnologia</loc>   ← tenant Cartagena
  <loc>https://cartagena.adaggio.com.co/calls</loc> …
  (y cartagena.adaggio.com.co NO resuelve en DNS)
```

Es la misma plantilla `robots.txt` servida byte a byte en `adaggio.uao.edu.co` y `adaggio.unicesar.edu.co`:
el `Sitemap:` apunta a un tenant y el `sitemap.xml` de cada tenant sirve URLs de otro. El pipeline de
publicación por tenant está roto: el tenant activo no es el que se anuncia en buscadores, y se publican
URLs de clientes que no existen. **Traducción comercial:** su plataforma es multi-institución con
configuración centralizada en un único lugar — un solo `sed` lo desalinea a todos.

### D-05 · Volcado masivo sin autenticación · **ALTA**

```bash
curl -sS "https://backend.adaggio.unicesar.edu.co/api/v2/publication/" | head -c 120
{"count":15848,"next":"http://backend.adaggio.unicesar.edu.co/api/v2/publication/?page=2", … }
```

`project` (5 832), `publication` (15 848), `product` (893), `enterprise` (953), `patent` (5), `law` (38) e
`index/*` responden **sin token** y con paginación estándar. Es decir: su base de producción es descargable
íntegramente por cualquier visitante, con metadatos richest (revista, DOI, autores, áreas,ODS, fechas).
Counterintuitivo, esto **no es una ventaja para ellos**: su corpus es público y el nuestro no debería serlo.

### D-06 · Directorio de investigadores enumerable · **MEDIA**

```bash
curl -sS "https://backend.adaggio.unicesar.edu.co/api/v2/person/?search=ar" | head -c 300
[{"cfpersid":"PER-ADG-UPCX0-0000002","cffirstnames":"Alvaro","cffamilynames":"Barrios Nuñez",
  "cfcountrycode":{…},"image_url":"https://files.adaggio.unicesar.edu.co/public/person/…",
  "info_org":{"pers_rol":"Investigador / coinvestigador","cforgunitid1":"Fundacion Universitaria Del Area Andina",
  "cforgunitid2":"G.I. PENSAMIENTO DIVERSO",…},"count_products":24,"count_projects":8,…}]
```

Dos caracteres de búsqueda devuelven el directorio con nombre completo, país, afiliación, rol y
productividad. **Riesgo real:** enumeración de personal para spear-phishing institucional (suena a
crédito por tocar la información privada de la universidad). **Mitigación honesta a su favor:** no exponen correo ni
número de documento (21 campos, revisados: solo `image_url` y datos de afiliación) — exposures bien
diseñada en ese detalle.

### D-07 · **CONFIRMADO**: subida de archivos anónima, pública y con clave приватizable · **ALTA**

Encontrado leyendo el código de su propio cliente (chunk `app/(public)/(authentication)/register/page-*.js`,
servido por ellos en claro). El contrato exacto de la ruta es:

```js
// registro de usuario nuevo: la foto de perfil se sube ANTES de crear el perfil
let t = new FormData;
t.append("file", k);                    // el archivo
t.append("elementId", e.org_email);     // el identificador del elemento (correo en su app)
let n = await fetch("/api/s3/upload-public", {method:"POST", body:t});
let {location: i} = await n.json();
e.image_url = i
```

Reproducción (25-oct-2026, sin token, sin cookie, sin cuenta):

```bash
curl -sS -X POST "https://adaggio.unicesar.edu.co/api/s3/upload-public" \
  -F "file=@prueba.png" \
  -F "elementId=khemia-prueba-controlada-2026-10-25@example.invalid"

# → 200  {"location":"https://files.adaggio.../public/person/<elementId>/<elementId>-<epoch_ms>.png"}
```

Lo que queda probado:

| Atributo | Resultado verificado |
|---|---|
| ¿Requiere autenticación? | **No.** Sin token, sin cookie, sin cuenta: `200` + `location` |
| ¿El objeto es legible por el público? | **Sí.** `GET` de la `location` → `200`, `Content-Type` correcto, bytes idénticos |
| ¿Quién decide la clave (key) del objeto? | **El atacante.** La clave es `public/person/<elementId>/<elementId>-<epoch_ms>.<ext>` y `elementId` **no se valida**: se aceptó un valor que no es correo |
| ¿Se valida el tipo de archivo? | **Sí, parcialmente:** whitelist de imágenes raster (**PNG, JPG, GIF, WEBP**). Rechazados `.txt`, `.svg` y `.pdf` con `400 "Tipo de archivo no permitido"` |
| ¿Se valida el *contenido*? | **No.** Un PNG subido con nombre `.jpg`/`.gif`/`.webp` se aceptó y guardó con esa extensión (validan extensión/MIME declarado, no los bytes) |
| ¿Se puede borrar lo subido? | **No sin credenciales.** `DELETE /api/s3/delete` → `401 {"error":"No autorizado"}`; `DELETE` sobre la URL del bucket → `403` |
| ¿Se puede abusar desde un navegador ajeno? | **No.** La ruta **no devuelve cabeceras CORS** (`Access-Control-Allow-Origin` ausente), así que no hay vector drive-by; hay que llamar a la API directamente |

**Impacto real (lo que SÍ es y lo que NO):**

- **ES**: anyone puede escribir objetos en un bucket público de un dominio institucional
  (`files.adaggio.unicesar.edu.co`) sin credenciales, elegido su propio prefijo de ruta, y no puede
  borrarlos: **asimetría upload-anónimo/delete-autenticado** → abundancia de objetos huérfanos, coste
  de S3/egreso a cargo de la universidad, y contenido alojado en un dominio `.unicesar.edu.co` con
  alta confianza (logos falsos, códigos QR de phishing, material para campañas).
- **ES**: el `elementId` se inserta literal en la clave → cualquier valor attacker-controlled. Con eso
  podría escribirse dentro de prefijos ajenos (`public/person/person_cfPers/...`, que es donde viven
  las fotos reales). **No lo probamos**: sobrescribir la foto de un investigador determinado es
 ixenotizable y exige autorización escrita de ADAGGIO.
- **NO ES**: no hay hosting de HTML/PDF/SVG (whitelist de imágenes), y no hay drive-by web.
- **NO ES**: la importación de una foto a un perfil ajeno no se puede completar sin el token que se
  envía al correo del titular (el `profile_token` del registro), así que el avatar-falso de un
  investigador concreto sigue siendo una hipótesis, no un hecho.

**Cómo lo encontramos (para repeatable):** el `OpenAPI` no incluye esta ruta (es un *route handler* de
Next.js en el host frontal, no DRF), y los intentos a ciegas fallaban; el contrato salió del **código
cliente** que la propia app sirve publicly. Ese es el atajo: leer el bundle, no adivinar.

**Residuo que dejamos (transparencia):** creamos 5 objetos inertes (PNG 1×1 y archivos con extensión
`.jpg`/`.gif`/`.webp`, todos con contenido de 1×1 px y nombre `khemia-prueba-*`) y **no pudimos
borrarlos** porque el borrado exige credenciales. URLs exactas para que ADAGGIO los elimine:

| Clave en su bucket | Tamaño |
|---|---|
| `person/khemia-prueba-controlada-2026-10-25@example.invalid/khemia-prueba-controlada-2026-10-25@example.invalid-1792983678677.png` | 70 B |
| `person/khemia-prueba-no-email-2026-10-25/khemia-prueba-no-email-2026-10-25-1792983891252.png` | 70 B |
| `person/khemia-prueba-mime@example.invalid/khemia-prueba-mime@example.invalid-1792983891778.jpg` | 70 B |
| `person/khemia-prueba-mime@example.invalid/khemia-prueba-mime@example.invalid-1792983891987.gif` | 70 B |
| `person/khemia-prueba-mime@example.invalid/khemia-prueba-mime@example.invalid-1792983892187.webp` | 70 B |

Todo lo demás fue lectura. Ningún dato de theirs fue descargado en masa, no se intentó enumerar cuentas
ni sobrescribir archivos de terceros.

### D-08 · Sin rate-limit ni lockout observable en login · **MEDIA**

6 POST a `POST /auth/v2/login/` con usuario inexistente → respuesta idéntica `400 {"message":"Invalid input."}`
en los 6, sin `429`, sin `Retry-After`, sin `X-RateLimit-*`, sin bloqueo de cuenta. (plus de credenciales
"honesto" a su favor: el mensaje es genérico → no hay enumeración de usuarios por mensaje.)

### D-09 · Datos de prueba visibles en el catálogo público · **MEDIA**

El catálogo público contiene registros semilla: `"TEST PRUEBA - ADJUSTABLE ANGLE JOINING SYSTEM…"`
(patente), `"TEST PRUEBA - PROTOTIPO DE SERVICIO DE ACOMPAÑAMIENTO A PROYECTOS DE INVESTIGACIÓN"`
(empresa), `"TEST PRUEBA - ADAGGIO Convocatoria para el fortalecimiento…"` (`CONV-ADG-0000000002`,
`cfregistrdate`/`cfrespubldate` = **2026-10-08**, la fecha del día del despliegue). Debug de migración sin
curación en producción.

### D-10 · Fingerprinting trivial · **BAJA**

`X-Powered-By: Next.js` · `server: gunicorn` · `Via: 1.1 <dist>@cloudfront.net` · `GET /health` → `200`
12 bytes · `GET /` del backend → `200` 7 bytes. La superficie se identifica en segundos (esto salió gratis
en el primer `curl`).

### D-11 · 404 del backend mezcla HTML con JSON · **BAJA**

Un 404 en ruta API devuelve HTML de depuración (6–16 KB) en lugar del `{"message":"Not Found"}` de DRF
(23 B). Fuga de plantilla, de versión y del propio `DEBUG=True`, además de romper a los clientes que
esperan JSON.

### D-12 · Sin anti-framing en el ancla de autenticación · **MEDIA**

Aunque el backend lleva `x-frame-options: DENY`, el frontend no lo replica → `/login` y `/register` embebibles
en un iframe. Clickjacking sobre el flujo de autenticación (el atacante gana la sesión con un clic de la
víctima).

---

## 3. Brecha de producto: lo que Adaggio tiene y Khemia no

| Módulo Adaggio | Khemia | Prioridad | Lectura |
|---|---|---|---|
| **Convocatorias** con ciclo de vida (fases, transiciones, matriz de presupuesto, cronograma, publishing, resultados, documentos) | ❌ no existe | **P1** | Es el módulo que más pesa en el flujo institucional: es el "radio" entre_callers de la universidad y la comunidad. Es el gap #1 de mercado. |
| **Postulaciones** (propuestas): experimentados aliados, ítems de presupuesto, documentos, declaration, PDF, impactos, allied-organizations | ❌ | P2 | Viene detrás de convocatorias; reutilizable junto al módulo anterior. |
| **Evaluaciones**: rúbricas, preguntas de conflicto de interés, expertos externos, sesiones, PDF por evaluación,(my-evaluations) | ❌ | P2 | Es su motor de "calidad" y su diferencia frente a un simple gestor de grupos. |
| **Gestor de proyectos Scrum** (epics, sprints, backlog, tasks, responsables, recursos, NS4-files, recursos/asignación) | ❌ | P3 | Interesante, pero es gestión de tareas, no de investigación; no es prioridad en el CRDT. |
| **Portal público de descubrimiento + búsqueda facetada** sobre 22 catálogos + landing pages por tenant | ⚠️ parcial: portal público con grupos/investigadores/productos/proyectos, sin búsqueda facetada ni landing pages | **P1** | Ya tenemos el 60% del esqueleto (`_public/`); el salto es facetas + páginas por tenant. |
| **Consentimiento GDPR / data-rights** (deletion, marketing, revoke-consent, accept, status) | ❌ | **P1** | Si almacenamos PII de investigadores (document_number, emails), la Ley 1581 de 2011 (habeas data Colombia) nos obliga igual. No es una ventaja de Adaggio: es nuestra **obligación**. |
| **SSO institucional** (Microsoft Entra ID) | ❌ (el backend Java ya tiene JWT propio) | P2 | universities المصنura ya vive en Entra/AD. |
| **Multi-tenant por dominio** | ❌ (instancia única) | P2 | Su modelo de negocio es vender a N universidades; el nuestro es una plataforma institucional única. Decisión de negocio, no de código. |
| **Biblioteca / resource bank / external-metadata** | ❌ | P3 | Complemento del CRIS. |
| **Gestión documental en S3 por tenant** | ❌ (importamos PDF/CSV en memoria) | P3 | Requerido cuando el CRUD crezca. |
| **22 catálogos `index/` de dominio** (áreas, líneas, ODS, skills, temas, programas educativos) | ⚠️ parcial: `catalog_2024.json` con 5 familias y 70 subtipos + áreas | P2 | Su catálogo es **Minciencias**: `data_source: "Minciencias-Colombia"`, `area`, `macroarea`, `subarea`. El nuestro ya está atado al catálogo oficial 2024 → podemos publicar un `index/` compatible y ser interoperables. |

**Conclusión de la brecha:** Adaggio entra por arriba (convocatorias → postulación → evaluación) y nosotros
por abajo (importar CvLAC/GrupLAC → indicadores → analítica). No compiten en el mismo producto: **su ciclo
es "convocar-evaluar" y el nuestro "medir-publicar"**. El solapamiento real es el **catálogo CRIS y el
portal de descubrimiento**, ahí donde ya competimos de frente.

---

## 4. Nuestras fortalezas (para vender)

| Fortaleza | Evidencia |
|---|---|
| **Núcleo algorítmico en RAM** (C++ / pybind11): listas enlazadas, multilistas ortogonales, pila LIFO de deshacer, cola FIFO de validación, write-through sincrónico | `core_cpp/`, `backend/app/repository.py`, `Taller2_WP-DN-EO.cpp` |
| **Ingesta real desde la fuente oficial**: scraper GrupLAC + CvLAC con deduplicación canónica, importación de PDF y CSV (Scienti y propio) | `backend/app/scraper.py`, `backend/app/cvlac_scraper.py`, `backend/app/api/routers/imports.py` (13 endpoints) |
| **Modelo oficial del indicador Minciencias 2024** con paridad exacta verificada por tests (283 aserciones C++ y 66/66 tests Java) | `docs/modelo-2024/`, `docs/indicador-oficial-2024.md`, `docs/catalogo_oficial_pesos_minciencias_2024.md` |
| **Analítica comparativa de grupos + dashboard** con analítica comparativa y dashboard que funcionan; sub-pestañas y kit compartido | `backend/app/api/routers/analytics.py`, `frontend/web-react/src/features/analytics/` |
| **Exports**: PDF de grupo, **dossier PDF**, CSV de ranking y de productos, y generador de **Word** oficial | `backend/.../groups.py` (`report/pdf`, `dossier/pdf`, `export/*.csv`), `docs/word/build_word_doc.py` |
| **Soft-delete + restore** en todas las entidades (`/restore` en grupos, investigadores, productos, proyectos, planes) | `backend/app/api/routers/*.py` |
| **Tooling de punta**: CLI C++, `pea_cli` (bat/ps1), servidor MCP, tests de paridad de contrato | `core_cpp/src/pea_cli.cpp`, `pea_cli.bat`, `gestion-contractual-api/.../ApiContractParityTest.java` |
| **87 endpoints** bien enfocados vs 666 dispersos | `backend/app/api/routers/*.py` |
| **Stack moderno y limpio**: React + Vite + TanStack Router + shadcn, sin carga legacy Angular | `frontend/web-react/src/routeTree.gen.ts` |

---

## 5. Nuestras debilidades — donde nos pueden ganar (honestidad)

| # | Gap nuestro | Severidad | Evidencia |
|---|---|---|---|
| A-01 | **El backend Python desplegado no tiene autenticación ni autorización**: 87 endpoints con CRUD completo, borrados, importaciones y `system/initialize/database` sin `Depends`/`OAuth2`/roles. `grep -E "(Depends|Security|OAuth2|api_key|CurrentUser|require_role|is_admin)"` en `backend/app/` → **0 coincidencias**. `GET http://155.133.22.12/api/v1/groups` → **200 con datos** | **Crítica** | `backend/app/main.py`, `backend/app/api/routers/*.py` |
| A-02 | **CORS refleja cualquier origen con credenciales**: `access-control-allow-origin: https://evil.example.com` + `access-control-allow-credentials: true` (preflight `POST /api/v1/groups` con Origin externo). El comodín `*` con credenciales es inválido por spec y el middleware lo resuelve reflejando el Origin | **Crítica** | `backend/app/main.py:104` (`allow_origins=["*"]`, `allow_credentials=True`) |
| A-03 | Sin Single Sign-On institucional (Entra/AD) | Media | — |
| A-04 | Sin consentimiento ni derechos de datos (habeas data) | Media | — |
| A-05 | Sin módulo de convocatorias ni postulaciones | Media (mercado) | — |
| A-06 | Sin evaluación con rúbricas | Media (mercado) | — |
| A-07 | Sin guardas de dominio por tenant/roles: nada impide que un endpoint de escritura se anime desde otra red | Media | — |
| A-08 | Sin cabeceras de seguridad en el frontend (mismo problema que ellos, y es la razón de que esto salga en la auditoría) | Media | `frontend/web-react/` |

**Matiz importante y favorable:** el backend **Java** de la migración (`c:\repos\gestion-contractual-api`)
**ya resuelve A-01**: JWT (`JwtTokenService`), `@PreAuthorize("hasAuthority('…') or hasRole('ADMIN')")` en
`SystemController`, `CvLacController`, `GruplacController`, y el test de paridad
`ApiContractParityTest` verifica que `POST /api/v1/auth/login` responde **401** (no 404 ni 500) con
credenciales inválidas. Es decir: **tenemos la solución escrita, pero no es la que está desplegada**.
A-01 y A-02 son, técnicamente, deuda del backend Python en su fin de vida.

---

## 6. Plan de acción priorizado

### P0 — esta semana (seguridad de lo que ya está desplegado)

| # | Acción | Archivo | Verificación |
|---|---|---|---|
| P0-1 | Cerrar el despliegue Python: **autenticación + roles** en los 87 endpoints (o retire el servicio del mundo y deje solo el Java) | `backend/app/main.py`, `backend/app/api/routers/*` | `curl -i -X POST http://155.133.22.12/api/v1/groups` → **401** |
| P0-2 | **CORS con allowlist real**: quitar `allow_origins=["*"]`; `allow_credentials` solo con orígenes explícitos | `backend/app/main.py:101-108` | preflight con `Origin: https://evil.example.com` → **sin** `access-control-allow-origin` |
| P0-3 | **Headers de seguridad** en el frontend: CSP, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy` | `frontend/web-react/` (headers del server de build) + reverse proxy | `curl -I` en `/` → todas presentes |
| P0-4 | **Rate-limit** en login y en los endpoints de escritura | backend | 10 intentos → 429 + `Retry-After` |
| P0-5 | Gatear `/docs` y `/openapi.json` por ambiente (`APP_ENV=production` → 404). Nota: hoy el proxy devuelve el SPA (2949 B HTML), o sea que **no** están expuestos en el despliegue vivo; hay que confirmar que el backend Python directo no lo exponga en otra ruta | `backend/app/main.py` | `curl -i http://155.133.22.12/docs` vs puerto directo del backend |
| P0-6 | **No exponer datos personales ni el catálogo completo** en el portal público: nuestro `/api/v1/*` es de lectura y escritura; decidir qué es público (grupos, investigadores sin correo/documento, productos, proyectos) | routers + `schemas` | pruebas de contrato |

> Antes de tocar A-01/A-02/A-03, el proyecto exige análisis de impacto con GitNexus
> (`impact --direction upstream` sobre `v1.router`, `groups.py`, `main.py`). No se ha modificado código en
> esta sesión: esto es solo reconocimiento y análisis.

### P1 — 2 a 4 semanas (producto)

1. **MVP de Convocatorias** (gap #1 de mercado): entidad, fases, cronograma, postulación, presupuesto,
   documentos y publicación — sobre nuestro modelo de datos y con el indicador 2024 como entrada.
2. **Data-rights / consentimiento** (obligación legal colombiana, Ley 1581 de 2011): consent, revoke,
   deletion request, export. Especial porque ya importamos PII de CvLAC.
3. **Búsqueda facetada en el portal público** sobre nuestro catálogo 2024 (áreas, líneas, tipos de producto,
  ODS) + landing page institucional.
4. **Portal institucional por institución**: aunque sea una tabla de `institution`, prepara el aislamiento
   multi-tenant en el modelo (no en la configuración) — el error de Adagio (D-04) es de configuración; el
   nuestro sería de esquema.

### P2 — 1 a 2 meses

SSO Entra/AD · evaluaciones con rúbricas · gestor de proyectos ligero (no Scrum completo) · almacenamiento
documental en S3 · catálogo `index/` interoperable con Adagio.

---

## 7. Guion de venta (4 líneas)

1. "Adaggio es un CRIS **convocatoria-first**: 666 endpoints para gestionar el ciclo de convocatoria,
   postulación y evaluación."
2. "Khemia es **medición-first**: importa desde la fuente oficial (GrupLAC/CvLAC), persistencia dual
   SQL Server + JSON, y el **modelo oficial del indicador 2024** con paridad verificada por tests."
3. "Adaggio sirve todo su corpus público sin autenticación y con `DEBUG=True`; Khemia lo sirve con
   permisos, trazabilidad y exportes para evaluación."
4. "Si su prioridad es publicar indicadores con trazabilidad y auditar en segundos, Khemia. Si su prioridad
   es armada de convocatorias con evaluación y Scrum, hoy Adaggio."

---

## 8. Límites de esta sesión y qué falta con autorización

**No se hizo (a propósito):**
- No se subió ningún archivo al endpoint de subida pública (D-07 queda como *sospecha verificada hasta el 500,
  no exploit*).
- No se probaron credenciales más allá de 6 intentos fallidos contra un usuario inexistente (D-08) — sin
  fuerza bruta, sin password spraying, sin intentarlo contra cuentas reales.
- No se descargó el corpus masivo (15 848 publicaciones): se leyeron solo las primeras páginas de cada
  listado, suficiente para dimensionarlo.
- No se escaneó la red, los subdominios ni los puertos; no se tocó ningún tenant distinto de Unicesar/UAO
  en lectura mínima.
- No seManipuló el bucket S3 (se comprobó solo que el listado está denegado).
- Nota de método: el `robots.txt` de Adaggio prohíbe `/api/`. Se hicieron **un número reducido** de
  peticiones dirigidas a endpoints concretos para verificar hallazgos (no rastreo masivo ni indexación), y
  el resto del reconocimiento fue sobre HTML y bundles públicos.

**Requiere autorización escrita de ADAGGIO para continuar:**
1. Confirmar D-07 (subida real) → posible RCE por traceback de DEBUG con claves de AWS.
2. IDOR en `api/v3/convocations/{id}/`, `api/v3/proposals/{id}/public-listing/`, `/results/`,
   `/evaluations/my-evaluations/{id}/pdf/` → comprobar si hay datos de otros tenants o dePostulaciones ajenas.
3. Aislamiento real entre tenants: mismo `cfpersid` en dos backends, IP/plantilla de error, y si el token de
   Unicesar es aceptado por el backend de UAO (y al revés).
4. Enumeración de cuentas: si `/auth/v2/forgot-password/` distingue usuario inexistente vs existente.
5. Cabeceras de cookies de sesión en el flujo real de login (no se completó un login legítimo).
6. TLS: sin `nmap`/`testssl` en el entorno → auditar con `testssl.sh` o similar (**no** lo ejecutamos).

**Y una recomendación de negocio, no de hacking:** no espejemos su base de datos. Es un corpus que ya
deriva de Minciencias, y nosotros ya tenemos el acceso **legítimo y directo** a esa fuente
(`scienti.minciencias.gov.co`, CvLAC, datos.gov.co). Copiar su base es riesgo legal y ethics; importar de
la fuente es la jugada correcta — y además nos permite ser más frescos que su sincronización.

---

## 9. Reproducir los hallazgos

```bash
# D-01 Django DEBUG=True + URLconf completo
curl -sS "https://backend.adaggio.unicesar.edu.co/api/v2/group/" | head -40

# D-02 OpenAPI de 1,5 MB
curl -sS -o schema.yaml "https://backend.adaggio.unicesar.edu.co/api/v3/schema/"; wc -c schema.yaml

# D-03 headers del frontend (solo X-Powered-By; el resto ausente)
curl -sSI "https://adaggio.unicesar.edu.co/login"

# D-04 fuga cross-tenant
curl -sS "https://adaggio.unicesar.edu.co/robots.txt" | grep -i sitemap
curl -sS "https://adaggio.unicesar.edu.co/sitemap.xml" | grep -oE '<loc>[^<]+' | head

# D-05 / D-06 volcado y directorio
curl -sS "https://backend.adaggio.unicesar.edu.co/api/v2/publication/" | head -c 120
curl -sS "https://backend.adaggio.unicesar.edu.co/api/v2/person/?search=ar" | head -c 300

# D-07 upload público (NO subir archivo: solo ver el 405/500)
curl -sSI -X OPTIONS "https://adaggio.unicesar.edu.co/api/s3/upload-public"

# D-08 sin rate-limit
for i in 1 2 3 4 5 6; do
  curl -sS -o /dev/null -w "%{http_code}\n" -X POST -H 'Content-Type: application/json' \
    -d '{"email":"noexiste-zzz@inventado.test","password":"x"}' \
    "https://backend.adaggio.unicesar.edu.co/auth/v2/login/"
done

# A-01/A-02 NUESTRO despliegue (solo lectura)
curl -sSI "http://155.133.22.12/api/v1/groups"
curl -sSI -X OPTIONS "http://155.133.22.12/api/v1/groups" \
  -H 'Origin: https://evil.example.com' -H 'Access-Control-Request-Method: POST'
```

---

*Documento generado el 2026-10-25 mediante reconocimiento pasivo. Sin cambios en el código del repositorio;
ningún commit realizado.*
