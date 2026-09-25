import asyncio
import httpx
import unicodedata
from pydantic import ValidationError
from . import repository
from .models import Group, Product, Researcher

def normalize(text):
    if not text:
        return text
    # Remove accents/diacritics
    text = ''.join(c for c in unicodedata.normalize('NFD', str(text)) if unicodedata.category(c) != 'Mn')
    # Replace any other weird chars with space or remove them
    return text.encode('ascii', 'ignore').decode('ascii')

# Socrata API Endpoints for Minciencias
GROUPS_API_URL = "https://www.datos.gov.co/resource/hrhc-c4wu.json"
PRODUCTS_API_URL = "https://www.datos.gov.co/resource/33dq-ab5a.json"

async def fetch_groups(client: httpx.AsyncClient):
    params = {
        "$limit": 500,
        "$where": "inst_aval like '%UNIVERSIDAD POPULAR DEL CESAR%'"
    }
    response = await client.get(GROUPS_API_URL, params=params)
    response.raise_for_status()
    return response.json()

async def ingest_groups():
    print("Iniciando Ingesta desde Minciencias (API Datos Abiertos)...")
    async with httpx.AsyncClient() as client:
        try:
            groups_data = await fetch_groups(client)
            print(f"Descargados {len(groups_data)} Grupos de Investigacion.")
            for gd in groups_data:
                g = Group(
                    external_code=normalize(gd.get("cod_grupo_gr", "UNK")),
                    name=normalize(gd.get("nme_grupo_gr", "Sin Nombre")),
                    institution=normalize(gd.get("inst_aval", "UNIVERSIDAD POPULAR DEL CESAR")),
                    classification=normalize(gd.get("clasprg", "Reconocido")),
                    city=normalize(gd.get("nme_municipio_gr", "")),
                    department=normalize(gd.get("nme_departamento_gr", "")),
                    declared_creation_date=normalize(gd.get("fcreacion_gr", "")),
                    knowledge_area=normalize(gd.get("nme_gran_area_gr", "")),
                    status="active"
                )
                repository.create_group(g)
            print("Grupos insertados en C++ RAM y SQL Server.")
        except Exception as e:
            print(f"Error ingiriendo grupos: {e}")

if __name__ == "__main__":
    conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"
    repository.load_from_db(conn_str)
    repository._active_connection_string = conn_str
    asyncio.run(ingest_groups())
