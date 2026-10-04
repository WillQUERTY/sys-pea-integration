import os
import pathlib
from typing import Optional
from dotenv import load_dotenv

BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent

# Load .env if present (checks backend/.env first, then root .env)
env_loaded = False
for env_candidate in [BACKEND_DIR / ".env", ROOT_DIR / ".env"]:
    if env_candidate.exists():
        load_dotenv(env_candidate, override=True)
        env_loaded = True
        break

if not env_loaded:
    # Still attempt standard dotenv find
    load_dotenv()


class Settings:
    # Entorno general: 'development' o 'production'
    APP_ENV: str = os.getenv("APP_ENV", "development").lower()
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")

    # Bandera para activar/desactivar conexión a SQL Server
    # En desarrollo local por defecto es False para no bloquear el servidor con timeouts
    USE_DATABASE: bool = os.getenv("USE_DATABASE", "false").lower() in ("true", "1", "yes")

    # Parámetros de SQL Server
    DB_SERVER: str = os.getenv("DB_SERVER", "127.0.0.1")
    DB_PORT: str = os.getenv("DB_PORT", "1433")
    DB_NAME: str = os.getenv("DB_NAME", "peai")
    DB_USER: str = os.getenv("DB_USER", "sa")
    # La clave va SOLO en backend/.env (gitignored), nunca en el codigo ni en
    # el historial de git. Sin clave el backend no conecta: fallar rapido es
    # mas seguro que intentarlo con una credencial horneada en el repo.
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_DRIVER: str = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")
    DB_TRUST_CERT: str = os.getenv("DB_TRUST_CERT", "yes")
    DB_TIMEOUT: int = int(os.getenv("DB_TIMEOUT", "3"))

    # Sobrescritura directa de connection string si se provee
    _DB_CONNECTION_STRING: Optional[str] = (
        os.getenv("DB_CONNECTION_STRING") or os.getenv("PEAI_SQLSERVER_CONNECTION")
    )

    # Rutas de datos locales / fallback
    DATA_JSON_PATH: pathlib.Path = pathlib.Path(
        os.getenv("DATA_JSON_PATH", str(ROOT_DIR / "pea_data.json"))
    )
    CATALOG_JSON_PATH: pathlib.Path = pathlib.Path(
        os.getenv("CATALOG_JSON_PATH", str(ROOT_DIR / "database" / "catalog_2024.json"))
    )

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def connection_string(self) -> str:
        if self._DB_CONNECTION_STRING:
            return self._DB_CONNECTION_STRING
        # ODBC expresa el puerto con coma ('Server=host,port'). Las instancias
        # nombradas (host\INSTANCIA) o hosts con puerto explicito no llevan sufijo.
        server = self.DB_SERVER
        if self.DB_PORT and "," not in server and "\\" not in server:
            server = f"{server},{self.DB_PORT}"
        return (
            f"Driver={{{self.DB_DRIVER}}};"
            f"Server={server};"
            f"Database={self.DB_NAME};"
            f"UID={self.DB_USER};"
            f"PWD={self.DB_PASSWORD};"
            f"TrustServerCertificate={self.DB_TRUST_CERT};"
            f"LoginTimeout={self.DB_TIMEOUT};"
        )


settings = Settings()
