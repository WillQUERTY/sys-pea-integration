from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import v1

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
    title="PEA‑i Backend Core API",
    version="1.0.0",
    description="""
**PEA-i (Proyecto Estratégico de Arquitectura)** 🚀

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
