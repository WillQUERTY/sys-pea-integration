from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import v1

@asynccontextmanager
async def lifespan(app: FastAPI):
    from .config import settings
    from . import repository

    # En produccion la persistencia no es opcional: arrancar en modo memoria
    # (USE_DATABASE=false) o degradar a JSON tras un fallo de BD significaria
    # perder silenciosamente todo lo escrito. Se aborta el arranque en cambio.
    if settings.is_production and not settings.USE_DATABASE:
        raise RuntimeError(
            "[Khemia Startup] APP_ENV=production requiere USE_DATABASE=true "
            "(revisar backend/.env en el servidor). Abortando."
        )

    if settings.USE_DATABASE:
        db_conn = settings.connection_string
        print(f"[Khemia Startup] Intentando conectar a SQL Server ({settings.DB_SERVER}/{settings.DB_NAME})...")
        ok = False
        try:
            ok = repository.initialize(repository.InitMode.Database, db_conn)
        except Exception as e:
            print(f"[Khemia Startup] Aviso: Error al inicializar BD ({e}).")

        if ok:
            print("[Khemia Startup] Memoria C++ reconstruida exitosamente desde SQL Server.")
        elif settings.is_production:
            raise RuntimeError(
                "[Khemia Startup] No se pudo inicializar desde SQL Server con "
                "APP_ENV=production: el fallback a pea_data.json esta deshabilitado "
                "en produccion para no arriesgar los datos. Abortando. "
                "(Verificar contenedor SQL Server y credenciales en backend/.env)"
            )
        else:
            print("[Khemia Startup] Aviso: No se pudo auto-inicializar desde SQL Server.")
            _init_from_local_json(repository, settings)
    else:
        print("[Khemia Startup] Modo Local / Desarrollo activo (USE_DATABASE=false).")
        _init_from_local_json(repository, settings)

    yield


def _init_from_local_json(repository, settings):
    """Fallback de desarrollo: carga pea_data.json en memoria (nunca en produccion)."""
    if settings.DATA_JSON_PATH.exists():
        print(f"[Khemia Startup] Fallback automatico: Cargando datos desde {settings.DATA_JSON_PATH.name}...")
        ok = repository.initialize(repository.InitMode.File, str(settings.DATA_JSON_PATH))
        if ok:
            print(f"[Khemia Startup] Memoria C++ cargada con {len(repository.list_groups())} grupos locales.")
        else:
            print(f"[Khemia Startup] Aviso: Error leyendo archivo {settings.DATA_JSON_PATH.name}.")
    else:
        print(f"[Khemia Startup] Aviso: No se encontro {settings.DATA_JSON_PATH.name}, iniciando memoria vacia.")
        repository.initialize(repository.InitMode.Empty, "")

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
