from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import v1

@asynccontextmanager
async def lifespan(app: FastAPI):
    db_conn = "Driver={ODBC Driver 18 for SQL Server};Server=127.0.0.1;Database=peai;UID=sa;PWD=TuSuperClav3123!;TrustServerCertificate=yes;"
    try:
        from . import repository
        ok = repository.initialize(repository.InitMode.Database, db_conn)
        repository._active_connection_string = db_conn
        if ok:
            print("[Khemia Startup] Memoria C++ reconstruida exitosamente desde SQL Server.")
        else:
            print("[Khemia Startup] repository.initialize retorno False.")
    except Exception as e:
        print(f"[Khemia Startup] Aviso: No se pudo auto-inicializar BD ({e}).")
    yield

tags_metadata = [
    {
        "name": "System",
        "description": "System initialization and DB persistence endpoints.",
    },
    {
        "name": "Groups",
        "description": "CRUD operations for Research Groups. Data resides in C++ RAM.",
    },
    {
        "name": "Researchers",
        "description": "CRUD operations for Researchers. Write-through to DB enabled.",
    },
    {
        "name": "Products",
        "description": "CRUD operations for Products. Backed by C++ Multilistas.",
    },
]

app = FastAPI(
    lifespan=lifespan,
    title="Khemia Backend Core API",
    version="1.0.0",
    description="""
**Khemia (Proyecto Estratégico de Arquitectura)** 🚀

Esta API sirve de puente interactivo con un núcleo de alto rendimiento escrito en **C++**. 
Utiliza `Pybind11` para conectar directamente Python con estructuras de datos en memoria (Multilistas).

### Características
* **Latencia Ultra-Baja**: Consultas a la velocidad de la RAM.
* **Write-Through Caching**: La memoria actúa como caché de lectura; las modificaciones se escriben inmediatamente en SQL Server.
* **Arquitectura de Taller 2**: Listas enlazadas (punteros manuales) manejadas directamente por el motor C++.
""",
    openapi_tags=tags_metadata,
    contact={
        "name": "Arquitectura Híbrida C++ / Python",
    }
)

# Configuración estricta de CORS para permitir solicitudes del futuro Frontend en React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Se puede restringir a ["http://localhost:5173"] luego
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(v1.router, prefix="/api/v1")
