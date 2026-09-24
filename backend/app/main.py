from fastapi import FastAPI
from .api import v1

app = FastAPI(
    title="PEA‑i Backend",
    version="0.1.0",
    description="FastAPI API for the PEA‑i project (Taller 2).",
)

# Include routers
app.include_router(v1.router, prefix="/api/v1")
