# Khemia — Plataforma de Producción Científica (PEA-i)

> **Universidad Popular del Cesar (UPC)** — Facultad de Ingenierías y Tecnológicas  
> **Asignatura:** Estructura de Datos | **Docente:** Ing. Adith Pérez  
> **Taller 2:** Programa Estadístico de Análisis de Investigación (PEA-i)  
> **Grupo Oficial:** **WP - DN - EO**  
> **Integrantes:** William Andrés Peñaranda Oñate · Donaldo David Noriega Palomino · Edinson José Olivero Rojas  

---

## 🚀 Enlaces de Evaluación Rápida (Sin Instalar Nada)

Para facilitar la calificación inmediata del Taller 2 sin requerir configuración local:

| Recurso | Enlace de Acceso Directo | Descripción |
|---|---|---|
| 🌐 **Despliegue Web en Vivo** | **[http://155.133.22.12/](http://155.133.22.12/)** | Aplicación completa en servidor de producción (React + FastAPI + SQL Server). |
| 🎥 **Video de Sustentación** | **[PRESENTACIÓN KHEMIA (YouTube)](https://www.youtube.com/watch?v=eezB3oZ3n2w&t=12s)** | Video demostrativo oficial de 10 minutos sustentando cada requisito. |
| 📄 **Documento Maestro Word** | [`docs/word/Parcial2_WP-DN-EO.docx`](file:///c:/repos/sys_pea_integration/docs/word/Parcial2_WP-DN-EO.docx) | Especificación técnica formal, diagramas retina y matrices de cumplimiento. |
| 💾 **Backup de Base de Datos** | [`docs/peai.bak`](file:///c:/repos/sys_pea_integration/docs/peai.bak) | Respaldo nativo de SQL Server con datos precargados para restauración en 1 clic. |

---

## 🏗️ Arquitectura del Sistema

El sistema implementa una arquitectura híbrida de alto rendimiento: **"Memoria RAM como Caché Activa + Write-Through sincrónico"**:

```text
       [Navegador Web / React SPA]               [Consola Terminal / pea_cli.exe]
                   │                                             │
                   ▼ HTTP / JSON                                 ▼ Llamada directa
     [Backend Python / FastAPI]                                  │
                   │                                             │
                   ▼ Puente nativo pybind11                      │
 ┌─────────────────┴─────────────────────────────────────────────┴─────────────────┐
 │                            MEMORIA RAM (C++ Puro)                               │
 │                                                                                 │
 │   [Lista Grupos] <===========> [Multilista Membresías] <====> [Investigadores]  │
 │         │                               │                              │        │
 │         ▼                               ▼                              ▼        │
 │   [Planes Trabajo]             [ProductAuthorNode]                [Proyectos]   │
 │         │                               │                                       │
 │         └────────────────────> [Multilista Productos]                           │
 │                                         │                                       │
 │                   ┌─────────────────────┴────────────────────┐                  │
 │                   ▼                                          ▼                  │
 │          [Cola FIFO Validación]                     [Pila LIFO Deshacer]        │
 └───────────────────┬──────────────────────────────────────────┬──────────────────┘
                     │ Write-Through sincrónico                 │ Reversión LIFO
                     ▼                                          ▼
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                              PERSISTENCIA FÍSICA                                │
 │       SQL Server (22 tablas normalizadas)     │    JSON (pea_data.json)         │
 └─────────────────────────────────────────────────────────────────────────────────┘
```

1. **Núcleo C++ (`core_cpp/`)**: Todo el grafo de entidades vive en RAM como nodos dinámicos enlazados con punteros directos (`GroupNode`, `ResearcherNode`, `MembershipNode`, etc.).
2. **Estructuras requeridas**: Listas enlazadas, Multilistas ortogonales, Pila LIFO de deshacer (`undo`) y Cola FIFO de validación técnica.
3. **Persistencia dual**:
   - **SQL Server**: Persistencia transaccional relacional (22 tablas físicas).
   - **JSON (`pea_data.json`)**: Exportación serializada completa para portabilidad offline.

---

## ⚡ Guía de Evaluación Paso a Paso ("A Prueba de Fallos")

### Vía 1: Evaluación Local Rápida (Backend + Frontend en 2 minutos)

> 💡 **Nota clave:** El puente C++ `backend/app/abpoxx_pybind.pyd` **ya se encuentra precompilado** para Python 3.12 en Windows x64. No necesitas instalar Visual Studio ni compilar C++ para probar la aplicación web localmente.

#### 1. Restaurar la Base de Datos SQL Server (Opción más rápida)
En **SQL Server Management Studio (SSMS)**:
- Clic derecho en *Databases* → *Restore Database...* → *Device* → Seleccionar el archivo `docs/peai.bak` → Clic en *OK*.

*O por comando PowerShell con `sqlcmd`:*
```powershell
sqlcmd -S localhost -E -Q "RESTORE DATABASE peai FROM DISK = '$(Get-Location)\docs\peai.bak' WITH REPLACE"
```

*(Alternativa sin archivo .bak: ver sección "Instalación desde DDL" más abajo).*

#### 2. Iniciar el Backend (FastAPI)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API REST interactiva (Swagger UI): **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**
- Al iniciar, la RAM de C++ se sincroniza automáticamente desde la BD.

#### 3. Iniciar el Frontend (React + Vite)
En una nueva terminal:
```powershell
cd frontend\web-react
npm install
npm run dev
```
- Interfaz gráfica en vivo: **[http://localhost:5173](http://localhost:5173)**

---

### Vía 2: Ejecución de la Solución A en C++ (`pea_cli.exe`)

El Taller 2 exige una solución ejecutable autónoma en consola C++. Esta se implementa a través de la CLI interactiva:

```powershell
# Ubicación del ejecutable compilado (o tras compilar core_cpp):
cd core_cpp\build\Release
.\pea_cli.exe summary
```

#### Comandos interactivos de la CLI C++:
| Comando | Descripción | Requisito Taller |
|---|---|---|
| `pea_cli summary` | Muestra resumen estadístico y conteo de nodos en memoria | Req. 12a |
| `pea_cli groups list` | Recorre la **lista simplemente enlazada** de grupos en RAM | Req. 3 / 8 |
| `pea_cli researchers list` | Recorre la lista enlazada de investigadores | Req. 4 / 8 |
| `pea_cli members list <id_grupo>` | Recorre la **multilista ortogonal** de integrantes del grupo | Req. 3 / 15 |
| `pea_cli products list <id_grupo>` | Recorre la **multilista** de productos asociados al grupo | Req. 2 / 15 |
| `pea_cli products by-year last 5` | Filtra productos por **ventana de observación** (últimos 5 años) | Req. 10 |
| `pea_cli queue list` | Muestra los productos en la **cola FIFO de validación** | Req. 17 |
| `pea_cli queue process` | Desencola y aprueba técnicamente el primer producto en orden de llegada | Req. 17 |
| `pea_cli history list` | Inspecciona el tope de la **pila LIFO de operaciones** | Req. 16 |
| `pea_cli history undo` | **Deshace** la última operación registrada en la pila (reversión simétrica) | Req. 16 |

---

### Vía 3: Compilación del Núcleo C++ desde Cero (Opcional)

Si deseas recompilar el núcleo `abpoxx.lib`, el ejecutable `pea_cli.exe` o el puente `abpoxx_pybind.pyd`:

#### Opción Automática (Recomendada):
Ejecuta el script bat en la raíz del proyecto:
```cmd
build_cpp.bat
```

#### Opción Manual con CMake:
```powershell
cd core_cpp
cmake -S . -B build
cmake --build build --config Release
copy /Y build\Release\abpoxx_pybind.cp312-win_amd64.pyd ..\backend\app\abpoxx_pybind.pyd
```

---

## 📥 Ingesta Masiva y Web Scraping Scienti

El sistema incluye scrapers idempotentes con deduplicación canónica para alimentar la base de datos y la memoria RAM:

### 1. Ingesta desde archivo HTML local de prueba (Sin conexión a internet):
```powershell
cd backend
python ..\database\reimport_aitice.py
```

### 2. Ingesta directa desde URL oficial de Scienti Minciencias:
```powershell
cd backend
# Vista previa en consola:
python -m app.scraper "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000002099" --preview

# Importación completa con enriquecimiento de CvLAC:
python -m app.scraper "https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000002099" --enrich-cvlac
```

---

## 📊 Matriz de Cobertura de Requisitos del Taller 2

| ID | Requisito del Taller | Implementación C++ | Implementación Python / Web | Estado |
|---|---|---|---|---|
| **T-01** | Solución en C/C++ autónoma | `core_cpp/src/pea_cli.cpp` (`pea_cli.exe`) | Ejecución nativa en terminal | ✓ Cumplido |
| **T-02** | Solución en Python | Integración vía `abpoxx_pybind` | Backend FastAPI (`backend/app/`) | ✓ Cumplido |
| **T-03** | Estructuras en memoria RAM | Punteros manuales y nodos enlazados | Lectura/escritura sincronizada | ✓ Cumplido |
| **T-04** | Gestión de Grupos | `GroupNode` (lista enlazada simple) | Endpoints `/api/v1/groups` + UI | ✓ Cumplido |
| **T-05** | Gestión de Investigadores | `ResearcherNode` (lista simple) | Endpoints `/api/v1/researchers` + UI | ✓ Cumplido |
| **T-06** | Multilista de Integrantes | `MembershipNode` (doble cadena ortogonal) | Módulo "Integrantes" + `/memberships` | ✓ Cumplido |
| **T-07** | Multilista de Productos | `GroupProductNode` (cadena grupo/producto) | Módulo "Productos" + filtros 2024 | ✓ Cumplido |
| **T-08** | Ingesta URL Scienti | Ingesta transaccional con deduplicación | Scrapers GrupLAC y CvLAC | ✓ Cumplido |
| **T-09** | Ingesta PDF y CSV | Parsers de PDF estructurado y CSV | Endpoints `/groups/import/pdf` y `/csv` | ✓ Cumplido |
| **T-10** | Cola FIFO de validación | `ValidationQueue` / `ValidationQueueItem` | Panel interactivo `/admin/validation-queue` | ✓ Cumplido |
| **T-11** | Pila LIFO de deshacer | `UndoStack` / `UndoOperation` | Historial interactivo `/admin/undo` | ✓ Cumplido |
| **T-12** | Ventana de observación | Filtrado dinámico por fechas y años | Selector en UI y reportes PDF | ✓ Cumplido |
| **T-13** | Persistencia SQL Server | ODBC nativo (`db_persistence.cpp`) | 22 tablas físicas + `docs/peai.bak` | ✓ Cumplido |
| **T-14** | Persistencia JSON | Serialización manual C++ | `pea_data.json` exportable | ✓ Cumplido |
| **T-15** | Dashboard estadístico | Agregados estadísticos de nodos | Métricas Recharts en `/admin` y `/portal` | ✓ Cumplido |

---

## 📁 Estructura del Repositorio

```text
sys_pea_integration/
├── backend/                        # Solución B: API REST FastAPI y servicios
│   ├── app/
│   │   ├── abpoxx_pybind.pyd       # Binario C++ precompilado para Python 3.12
│   │   ├── main.py                 # Punto de entrada de FastAPI
│   │   ├── repository.py           # Orquestador RAM <-> C++
│   │   ├── scraper.py              # Ingesta y conciliación de GrupLAC
│   │   └── cvlac_scraper.py        # Ingesta y conciliación de CvLAC
│   └── requirements.txt            # Dependencias Python
│
├── core_cpp/                       # Solución A: Núcleo algorítmico C++
│   ├── CMakeLists.txt              # Configuración de compilación CMake
│   ├── include/                    # Cabeceras y contratos
│   ├── pybind/                     # Enlace pybind11 hacia Python
│   └── src/                        # Implementación de nodos RAM, multilistas y CLI
│
├── database/                       # Persistencia física SQL Server
│   ├── init_schema.sql             # DDL oficial con las 22 tablas físicas
│   ├── recreate_database.sql       # Script DROP + CREATE de la base peai
│   ├── seed_catalog_2024.py        # Semilla del catálogo Minciencias (5 familias, 70 subtipos)
│   └── catalog_2024.json           # Definición canónica de tipologías 2024
│
├── docs/                           # Documentación oficial y artefactos de entrega
│   ├── peai.bak                    # Copia de seguridad física de la BD SQL Server
│   ├── PEA-i_Especificacion_...md  # Documento técnico maestro integral (2.600+ líneas)
│   ├── guion_sustentacion_video...# Guion técnico y minutero del video
│   ├── ANALISIS_COMPARATIVO_...md  # Análisis técnico comparativo
│   └── word/
│       ├── build_word_doc.py       # Generador del documento Word oficial
│       ├── doc_formatter.py        # Motor de estilos enriquecidos y tablas Word
│       └── Parcial2_WP-DN-EO.docx  # Documento oficial entregable en formato Word
│
├── frontend/web-react/             # Interfaz web de usuario (React + TypeScript)
│   ├── src/                        # Vistas, componentes shadcn y stores TanStack
│   └── package.json                # Dependencias npm
│
├── scripts/                        # Utilidades organizadas de mantenimiento y pruebas
│   ├── check_counts.py             # Verificación de conteo de registros en BD
│   └── recreate_database.py        # Recreación y siembra integral por script
│
├── INTEGRANTES.txt                 # Ficha formal de identificación del grupo
├── pea_data.json                   # Archivo de persistencia serializada del sistema
└── README.md                       # Esta guía técnica de evaluación
```

> Los adjuntos de la entrega (Word, fuentes `Taller2.cpp` / `Taller2.py`, `pea_data.json` e
> `INTEGRANTES.txt`) están listados en [`docs/correo_entrega_parcial2.md`](docs/correo_entrega_parcial2.md).

---

## 🩹 Solución de Problemas Frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `SSL Provider: The certificate chain was issued by an authority that is not trusted` | sqlcmd con ODBC Driver 18 | Agregar el parámetro `-C` para confiar en el certificado local. |
| `CREATE INDEX failed ... QUOTED_IDENTIFIER` | sqlcmd apaga QUOTED_IDENTIFIER por defecto | Usar el flag `-I` en sqlcmd. |
| `PermissionError: [Errno 13] ... Parcial2_WP-DN-EO.docx` | El archivo Word está abierto en Microsoft Word | Cerrar Microsoft Word antes de regenerar el documento, o revisar la copia automática de respaldo. |
| El puerto 8000 ya está en uso | Proceso uvicorn huérfano | Terminar el proceso con `Get-Process python \| Stop-Process` y reiniciar. |
