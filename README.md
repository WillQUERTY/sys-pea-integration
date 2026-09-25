# PEA-i (Proyecto Estratégico de Arquitectura) - Taller 2

Este repositorio contiene la implementación del proyecto PEA-i bajo una arquitectura híbrida de alto rendimiento. El sistema cumple estrictamente con el requerimiento de manejar **estructuras de datos en memoria (punteros, nodos y multilistas a mano)** mediante un núcleo de **C++**, mientras expone una interfaz profesional RESTful usando **Python (FastAPI)** y asegura la persistencia en **SQL Server**.

## 🏗️ Arquitectura del Sistema

El proyecto opera bajo un modelo de "Memoria como Caché Activa + Auto-Guardado (Write-Through)":

1. **Núcleo C++ (Core):** Aloja las multilistas de `ResearchGroup`, `Researcher` y `Product`. Las consultas y relaciones entre entidades se resuelven recorriendo punteros en memoria RAM a máxima velocidad.
2. **Pybind11 (Puente):** Traduce las estructuras de C++ a objetos de Python permitiendo ejecución nativa sin sobrecarga.
3. **FastAPI (Backend):** Expone las funcionalidades a través de Endpoints HTTP.
4. **SQL Server (Persistencia):** Guarda la información para que no se pierda al apagar el servidor. Al arrancar, los datos se cargan desde aquí a la memoria. Al hacer un POST/PUT, los datos se actualizan en memoria y en BD al instante.

> **Excepción documentada — ingesta masiva:** únicamente `GruplacCommitService` (`backend/app/scraper.py`) y `CvCommitService` (`backend/app/cvlac_scraper.py`) escriben directo a SQL Server con pyodbc, sin pasar por la RAM del núcleo. Razón: la importación masiva exige una transacción atómica con rollback y conciliación/dedupe canónico (por `external_code` y nombre normalizado) que el CRUD del núcleo no expone. Tras cada commit, la API recarga la RAM con `repository.load_from_db` y reporta `ram_reloaded` en la respuesta. **Toda otra escritura/lectura pasa por `repository.py`**; la conciliación y el dedupe son responsabilidad exclusiva de estos dos servicios (no duplicar esa lógica en el repositorio). Las importaciones no participan de la pila de deshacer (limitación conocida: se revierten borrando el grupo).

---

## 🛠️ Requisitos Previos

- **Sistema Operativo:** Windows 10/11
- **Compilador:** Visual Studio 2026 (MSVC) con extensiones de CMake.
- **Python:** 3.12 (con virtual environment configurado).
- **Base de Datos:** SQL Server (Instancia local `.` o `localhost`).

---

## 🚀 Guía de Instalación y Ejecución

### 1. Configuración de Base de Datos
Asegúrate de tener SQL Server corriendo e inicia sesión en SSMS (SQL Server Management Studio) o usa SQLCMD para crear la base de datos `peai`:
```sql
CREATE DATABASE peai;
```
*(No necesitas crear las tablas manualmente, el motor de C++ creará el esquema automáticamente la primera vez que se ejecute).*

### 2. Compilación del Núcleo C++
Debes compilar el motor C++ y generar el archivo binario (`.pyd`) que usará Python.
Abre PowerShell y ejecuta:

```powershell
cd c:\repos\sys_pea_integration\core_cpp\build
# Usar el CMake incluido en Visual Studio para compilar
$cmake = "C:\Program Files\Microsoft Visual Studio\18\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"
& $cmake --build . --config Release

# Copiar el puente de Pybind al entorno de Python
Copy-Item .\Release\abpoxx_pybind.cp312-win_amd64.pyd -Destination ..\..\backend\app\abpoxx_pybind.pyd -Force
```

### 3. Iniciar el Backend (FastAPI)
Una vez el archivo `.pyd` está en la carpeta de la API, encendemos el servidor.
Abre una nueva terminal en la raíz del backend:

```powershell
cd c:\repos\sys_pea_integration\backend
# Activar el entorno virtual (si no está activo)
.\venv\Scripts\Activate.ps1

# Iniciar Uvicorn
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 🔌 Uso de la API y Documentación

Una vez el servidor esté corriendo, abre tu navegador en:
👉 **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

Verás la interfaz de Swagger UI (OpenAPI) donde puedes probar todos los endpoints interactivos.

### Flujo de Trabajo (Importante)
Como el núcleo opera en memoria, antes de consultar datos debes cargar el contexto:

1. **Inicializar la Memoria:** Llama al endpoint `POST /api/v1/system/initialize/database` enviando el `connection_string` (ej. `"Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"`). Esto traerá todo de SQL a la RAM.
2. **Operar Libremente:** Usa los métodos `GET` y `POST` de Grupos, Investigadores y Productos de forma instantánea. El *Write-Through* actualizará automáticamente la base de datos de fondo.
3. **Guardado Manual (Opcional):** Si deseas forzar un volcado completo de la memoria hacia la base de datos, puedes llamar a `POST /api/v1/system/save/database`.
