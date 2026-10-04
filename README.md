# Khemia — Plataforma de Producción Científica

Sistema de gestión de producción académica de grupos de investigación (Universidad Popular del Cesar — Taller 2, Estructura de Datos, Grupo 5).

Arquitectura híbrida: **núcleo C++** con estructuras de datos manuales en memoria (listas, multilistas, pila LIFO de deshacer, cola FIFO de validación), puente **pybind11**, API **FastAPI**, frontend **React** (shadcn + TanStack) y persistencia en **SQL Server**.

## 🏗️ Arquitectura: "Memoria como Caché Activa + Write-Through"

1. **Core C++** (`core_cpp/`): las entidades viven en RAM como nodos enlazados a mano; las consultas y relaciones se resuelven recorriendo punteros. **Todo el SQL vive aquí** (`src/persistence/db_persistence.cpp`, ODBC nativo): CRUD por `MERGE` sobre `external_code`, enlaces, cola de validación, pila de deshacer, auditoría y agregados del dashboard.
2. **pybind11** (`core_cpp/pybind/`): expone el core a Python como `abpoxx_pybind`.
3. **FastAPI** (`backend/`): orquesta la RAM y delega todo el SQL al core (`app/repository.py` no usa pyodbc).
4. **React** (`frontend/web-react/`): SPA de gestión.
5. **SQL Server**: persistencia; al arrancar el backend se carga a RAM y cada escritura se replica al instante (write-through).

> **Clave del write-through:** el match con BD es por `external_code` (no por id). Las entidades creadas por API sin código reciben uno auto-generado (`API-GRP-<id>`, etc.) para que el `MERGE` sea idempotente.

> **Excepción documentada — ingesta masiva:** solo `GruplacCommitService` (`backend/app/scraper.py`) y `CvCommitService` (`backend/app/cvlac_scraper.py`) escriben directo a SQL Server con pyodbc (transacción atómica + conciliación/dedupe canónico). Tras cada commit, la API recarga la RAM desde la BD. Las importaciones no participan de la pila de deshacer (se revierten borrando el grupo).

---

## ✅ Requisitos previos

| Herramienta | Versión / notas |
|---|---|
| Windows | 10/11 |
| Visual Studio | 2022/2026 con workload **C++** (trae CMake y MSVC). Ruta típica de cmake: `C:\Program Files\Microsoft Visual Studio\18\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe` |
| SQL Server | Cualquier edición local (Express sirve) + **ODBC Driver 17 for SQL Server** |
| sqlcmd | Client SDK 170/180 (incluido con SQL Server). Con driver 18 usar flags `-C -I` (ver abajo) |
| Python | 3.12 (el `.pyd` compilado es para cp312) |
| Node.js | 20+ (para el frontend; `npm` incluido) |

---

## 🚀 Instalación desde cero

### 1. Base de datos

Desde `database/`, con el servidor de backend **detenido** (libera conexiones ODBC):

```powershell
cd database
sqlcmd -S localhost -E -C -b -i recreate_database.sql      # DROP + CREATE peai
sqlcmd -S localhost -E -C -I -b -d peai -i init_schema.sql # tablas + semillas Minciencias
```

- `-E`: autenticación Windows. `-C`: confiar en el certificado del servidor (driver 18 lo exige). `-I`: `QUOTED_IDENTIFIER ON` (requerido por los índices filtrados de `ProductAuthor`).
- Esto deja **5 familias y 56 subtipos Minciencias** sembrados y las tablas de datos vacías.
- Si la BD ya existe y solo faltan los subtipos nuevos (no quieres borrar): `../backend/venv/Scripts/python.exe seed_new_subtypes.py`.

### 2. Core C++ (compilar el puente pybind11)

```powershell
cd core_cpp
$cmake = "C:\Program Files\Microsoft Visual Studio\18\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"
& $cmake -S . -B build2
& $cmake --build build2 --config Release --target abpoxx_pybind
& $cmake\..\ctest.exe --test-dir build2 -C Release --output-on-failure   # tests del core
```

Copiar el módulo al backend (ver nota "pyd ocupado" en Solución de problemas):

```powershell
copy build2\Release\abpoxx_pybind.cp312-win_amd64.pyd ..\backend\app\abpoxx_pybind.pyd
```

### 3. Backend (FastAPI)

```powershell
cd backend
python -m venv venv                    # solo la primera vez
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt        # fastapi, uvicorn, pyodbc, reportlab, ...
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Al arrancar, la RAM se carga desde la BD automáticamente. Si necesitas recargarla a mano (p. ej. tras una ingesta por script):

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/system/initialize/database `
  -H "Content-Type: application/json" `
  -d '{"connection_string": "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"}'
```

API y Swagger UI: **http://127.0.0.1:8000/docs**

### 4. Frontend (React)

```powershell
cd frontend\web-react
npm install                            # solo la primera vez
npm run dev                            # http://localhost:5173
```

El dev server de Vite reenvía `/api/*` al backend local (`http://127.0.0.1:8000`, configurable en `vite.config.ts` → `server.proxy`); el build de producción usa URLs relativas contra la misma origen, igual que en el servidor. Para apuntar a otro host/puerto solo en local, crea `frontend/web-react/.env`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Build de producción: `npm run build` (tsc + vite, sale en `dist/`).

---

## 🧪 Verificación rápida (smoke test)

Con backend y frontend arriba:

1. `GET /api/v1/dashboard/stats` → responde con conteos (0 en BD limpia).
2. Crear un grupo desde la UI (o `POST /api/v1/groups`), editarlo, validarlo.
3. Perfil del grupo → botón **"Informe PDF"** → descarga el PDF estilo GrupLAC.
4. Importar un GrupLAC desde la UI, procesar la **cola de validación** (FIFO) y probar **deshacer** (pila LIFO) en Sistema.

---

## 📥 Cargar datos de ejemplo (grupo AITICE)

Dos vías idempotentes (concilian por `external_code` y dejan los productos en la cola como `pending`):

**A. Desde el HTML local** (`docs/AITICE-PAGE.html`, no depende de Scienti):

```powershell
cd backend
.\venv\Scripts\python.exe ..\database\reimport_aitice.py
```

**B. Desde la URL en vivo de Scienti** (como lo haría un usuario):

```powershell
cd backend
.\venv\Scripts\python.exe -m app.scraper "<URL_GRUPLAC>" --preview     # solo vista previa
.\venv\Scripts\python.exe -m app.scraper "<URL_GRUPLAC>" --enrich-cvlac # importa y enriquece integrantes
```

El scraper extrae del GrupLAC: datos del grupo, líneas, integrantes, proyectos y toda la producción clasificada por familia/subtipo Minciencias (artículos, libros, capítulos, software, eventos, tutorías —doctorado/maestría/pregrado/monografía—, apropiación social, jurados, etc.). Tras importar por script, recarga la RAM del backend (paso 3) si el servidor estaba corriendo.

---

## 🧹 Limpieza / reset total

1. Detener el backend (libera la BD y el `.pyd`).
2. Ejecutar de nuevo los dos comandos de **1. Base de datos** (`recreate_database.sql` + `init_schema.sql`).
3. Arrancar el backend: arranca con RAM vacía, consistente con la BD limpia.

---

## 🩹 Solución de problemas

| Síntoma | Causa | Solución |
|---|---|---|
| `SSL Provider: The certificate chain was issued by an authority that is not trusted` | sqlcmd con ODBC Driver 18 | Agregar flag `-C` (trust server certificate) |
| `CREATE INDEX failed ... QUOTED_IDENTIFIER` al correr `init_schema.sql` | sqlcmd apaga QUOTED_IDENTIFIER por defecto; los índices filtrados de `ProductAuthor` lo requieren | Agregar flag `-I` |
| `Device or resource busy` al copiar `abpoxx_pybind.pyd` | Un proceso python (uvicorn) lo tiene cargado | Detener el servidor, **o** renombrar primero (`ren abpoxx_pybind.pyd abpoxx_pybind.old.pyd`) y copiar encima; borrar el `.old` cuando el proceso viejo muera |
| `[Error de Codificación]` en un campo | (Corregido en `db_persistence.cpp`) el core devolvía cp1252 sin transcodificar a UTF-8 | Recompilar el core y actualizar el `.pyd` del backend; los datos en BD no se dañan |
| curl con tildes/ñ corrompe el JSON | Git Bash re-codifica `-d` | Escribir el JSON a un archivo y usar `--data-binary @archivo.json` |
| Puerto 8000 ocupado / cambios de Python no surten efecto | uvicorn sin `--reload` o proceso zombie | Matar el proceso del puerto y reiniciar (el `--reload` **no** recarga el `.pyd`: para cambios del core hay que reiniciar el servidor) |

---

## 📁 Estructura del repositorio

```
core_cpp/            Núcleo C++: entidades, servicios, persistencia ODBC, pybind11
  build2/            Build de CMake (Release -> abpoxx_pybind.cp312-win_amd64.pyd)
backend/
  app/main.py        FastAPI (arranque, carga RAM desde BD)
  app/repository.py  Orquestación RAM <-> core (sin SQL directo)
  app/scraper.py     Importador GrupLAC (excepción: pyodbc directo)
  app/reports.py     Informe PDF estilo GrupLAC (ReportLab)
  app/abpoxx_pybind.pyd   <- copia del módulo compilado (regenerar tras cada build del core)
frontend/web-react/  SPA React (shadcn + TanStack Query/Router)
database/
  init_schema.sql    Tablas + semillas Minciencias (56 subtipos, 5 familias)
  recreate_database.sql  DROP + CREATE de la BD peai
  seed_new_subtypes.py   Semillas idempotentes para BD existente
  reimport_aitice.py     Importación de ejemplo desde docs/AITICE-PAGE.html
docs/AITICE-PAGE.html    Página GrupLAC de ejemplo (fixture de pruebas del scraper)
```
