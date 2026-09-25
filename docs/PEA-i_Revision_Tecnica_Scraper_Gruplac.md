# Revisión técnica de `scraper.py` para PEA-i

> **Proyecto:** Programa Estadístico de Análisis de Investigación, PEA-i  
> **Componente revisado:** Scraper público de GrupLAC  
> **Objetivo:** evaluar confiabilidad, integridad, seguridad, idempotencia y separación de responsabilidades  
> **Fecha:** 24 de septiembre de 2026

---

## 1. Veredicto general

El scraper tiene una buena intención arquitectónica y cubre numerosas secciones públicas de GrupLAC. El código ya intenta extraer:

- Datos básicos del grupo.
- Instituciones avaladoras.
- Plan estratégico.
- Líneas de investigación.
- Integrantes y periodos de vinculación.
- Identificador técnico `cod_rh`.
- Líder del grupo.
- Productos.
- DOI, ISSN, ISBN y año.
- Autores.
- Proyectos.
- Importaciones y auditoría.
- Relaciones con el repositorio y SQL Server.

Sin embargo, en su estado actual no debe considerarse confiable para persistir automáticamente información definitiva. El principal problema es que el parser aplana el contenido HTML y después intenta reconstruir su estructura mediante expresiones regulares. Esto puede mezclar autores, títulos y atributos de productos diferentes.

### 1.1 Evaluación resumida

```text
Cobertura funcional:             Buena
Extracción de grupo:             Buena
Extracción de integrantes:       Aceptable
Extracción de cod_rh:            Buena
Normalización de periodos:       Insuficiente
Detección de líder:              Aceptable, mejorable
Extracción de productos:         Riesgosa
Extracción de autores:           Incorrecta en algunos casos reales
Idempotencia:                    No garantizada
Integridad transaccional:        Insuficiente
Manejo de errores:               Insuficiente
Privacidad:                      Adecuada si usa solo datos públicos
Utilidad como prototipo:         Alta
Preparación para producción:     No
```

---

## 2. Fortalezas del scraper

### 2.1 Cobertura amplia

El scraper no se limita a los datos básicos del grupo. También intenta materializar relaciones importantes del dominio:

```text
Grupo -> integrantes
Grupo -> productos
Producto -> autores
Grupo -> proyectos
Grupo -> líneas
Grupo -> plan
```

Esto presenta una buena alineación con el modelo funcional de PEA-i.

### 2.2 Uso de `cod_rh`

La extracción del parámetro `cod_rh` desde el enlace público hacia CvLAC es una buena decisión. El valor funciona como identificador técnico público y resulta más apropiado que intentar obtener números de documento personal.

### 2.3 Auditoría e importación

El código intenta registrar:

- Fuente de la importación.
- Cantidad de registros procesados.
- Acción ejecutada.
- Resumen del proceso.

Esta intención es correcta y debe conservarse en la refactorización.

### 2.4 Integración con estructuras y SQL Server

El scraper ya considera tanto el repositorio usado por el núcleo como la persistencia en SQL Server. Esto ayuda a conectar el proceso de importación con la arquitectura general del proyecto.

---

## 3. Problema principal: extracción de productos

Actualmente se aplana la celda mediante:

```python
raw_text = normalize(
    cols[1].get_text(separator=" ", strip=True)
)
```

Después se intentan reconstruir los campos con expresiones regulares:

```python
doi_match = re.search(...)
issn_match = re.search(...)
authors_match = re.search(...)
title_match = re.search(...)
```

### 3.1 Por qué falla

`get_text(separator=" ")` elimina información estructural del HTML:

- Saltos de línea.
- Límites entre etiquetas.
- Separación producida por elementos `<br>`.
- Límites entre nombres de autores.
- Relación entre etiqueta y valor.
- Enlaces individuales.
- Delimitación entre secciones de una ficha.

La expresión de autores depende además de encontrar un salto de línea:

```python
re.search(r"Autores:\s*(.+?)(?:$|\n)", raw_text)
```

Como la extracción remplaza la estructura con espacios, el salto de línea normalmente deja de existir. El grupo capturado puede extenderse hasta el final de la cadena y consumir campos que no pertenecen a la lista de autores.

### 3.2 Consecuencia observada

Un producto puede terminar asociado con un autor perteneciente a otro producto o con contenido posterior de la misma celda. Esto produce atribuciones falsas en `ProductAuthor`.

### 3.3 Corrección inicial

Se debe preservar la estructura por líneas:

```python
raw_html_text = cols[1].get_text(
    separator="\n",
    strip=True,
)

lines = [
    normalize(line)
    for line in raw_html_text.splitlines()
    if normalize(line)
]
```

Función auxiliar:

```python
def extract_labeled_value(lines, label):
    normalized_label = normalize(label).lower()

    for index, line in enumerate(lines):
        normalized_line = normalize(line).lower()

        if normalized_line.startswith(normalized_label):
            value = line[len(label):].strip(" :")

            if value:
                return value

            if index + 1 < len(lines):
                return lines[index + 1].strip()

    return ""
```

### 3.4 Solución definitiva

La extracción de autores debe trabajar con nodos HTML, no con el texto completo de la fila. El parser debe encontrar la etiqueta `Autores:` y recorrer los elementos posteriores hasta alcanzar la siguiente etiqueta reconocida.

Principio:

> Los autores deben extraerse desde los nodos asociados a su etiqueta, no desde una expresión regular aplicada sobre toda la fila.

---

## 4. Separación de autores por coma

Actualmente se utiliza:

```python
authors = [
    author.strip()
    for author in authors_match.group(1).split(",")
    if author.strip()
]
```

Este método supone que cada coma separa personas. Puede fallar si GrupLAC presenta un nombre en formato:

```text
APELLIDOS, NOMBRES
```

El parser podría crear dos autores ficticios:

```text
APELLIDOS
NOMBRES
```

### Recomendación

Antes de definir el separador debe inspeccionarse la estructura HTML real. Los autores pueden estar separados mediante:

- Elementos `<br>`.
- Punto y coma.
- Enlaces individuales.
- Nodos hermanos consecutivos.
- Comas en secciones concretas.

El separador debe adaptarse a la estructura de cada sección, no asumirse globalmente.

---

## 5. Estado de validación contradictorio

El scraper crea productos con:

```python
validation_status="validated"
```

Después los encola:

```python
repository.vq_enqueue(
    product_result.id,
    assigned_to="Minciencias Automated Sync",
)
```

Esto deja el producto simultáneamente:

```text
Validado
Pendiente en la cola de validación
```

Además, aparecer en una página pública no demuestra que PEA-i haya validado:

- El subtipo.
- La categoría de calidad.
- Las evidencias.
- Los autores.
- La relación con el grupo.
- La ausencia de duplicados.

### Corrección

```python
validation_status="pending"
```

Luego:

```python
repository.vq_enqueue(
    product_result.id,
    assigned_to=None,
)
```

Separar:

```text
source_status = imported_from_public_source
validation_status = pending
```

---

## 6. Asociación automática producto-grupo

Actualmente se ejecuta:

```python
repository.link_product_to_group(
    group_result.id,
    product_result.id,
)
```

La relación se confirma antes de comprobar:

- Autoría válida.
- Vinculación del autor con el grupo.
- Compatibilidad entre periodo y fecha de obtención.
- Autorización.
- Duplicidad del producto.

### Corrección

Crear una propuesta pendiente:

```python
repository.propose_product_group_link(
    group_id=group_result.id,
    product_id=product_result.id,
    status="pending_validation",
    source="gruplac_public",
)
```

Proceso posterior:

```text
1. Consultar autores.
2. Consultar periodos de vinculación.
3. Comparar la fecha de obtención.
4. Verificar duplicados.
5. Aprobar, rechazar o mantener pendiente.
```

---

## 7. Matching inseguro de autores

Actualmente se usa:

```python
if member_name in author_name or author_name in member_name:
    matched_researcher_id = member_id
```

Esto genera falsos positivos con:

- Nombres parciales.
- Iniciales.
- Apellidos compuestos.
- Orden diferente.
- Homónimos.

### Estrategia recomendada

Prioridad de coincidencia:

```text
1. cod_rh exacto.
2. ORCID exacto.
3. Identificador externo exacto.
4. Nombre normalizado exacto.
5. Nombre aproximado como candidato para revisión.
```

Resultado sugerido:

```python
{
    "match_type": "probable",
    "candidate_researcher_id": 18,
    "confidence": 0.82,
    "requires_review": True,
}
```

Una coincidencia parcial nunca debe crear una relación definitiva sin revisión.

---

## 8. Creación de colaboradores externos

Actualmente se genera:

```python
external_code = (
    f"COL_{normalized_author.replace(' ', '_')[:20]}"
)
```

### Problemas

- Colisiones por truncamiento.
- Homónimos.
- Confusión con códigos de grupos que comienzan por `COL`.
- Conversión automática de una cadena textual en investigador completo.

### Alternativa

Generar un identificador técnico estable:

```python
import hashlib


def external_author_code(name):
    normalized = normalize(name).upper()
    digest = hashlib.sha256(
        normalized.encode("utf-8")
    ).hexdigest()[:16]

    return f"EXT_AUTHOR_{digest}"
```

Pero el uso de hash no resuelve los homónimos. El modelo preferible es:

```text
ProductAuthor
- external_author_name
- external_author_identifier nullable
- researcher_id nullable
- match_status = unverified
```

No debe crearse automáticamente un `Researcher` definitivo por cada nombre importado.

---

## 9. Confusión entre rol y formación académica

Actualmente:

```python
highest_education_level=vinculacion
```

El campo `vinculacion` puede contener valores como:

```text
Integrante
Investigador
Estudiante
```

Esto no equivale a:

```text
Pregrado
Especialización
Maestría
Doctorado
```

### Corrección

```python
researcher = Researcher(
    external_code=cod_rh,
    display_name=name,
    highest_education_level=None,
    status="active",
)
```

La relación conserva el rol:

```python
repository.add_member_to_group(
    group_id=group_result.id,
    researcher_id=researcher_result.id,
    role=vinculacion,
    start_date=start_date,
    end_date=end_date,
)
```

---

## 10. Nombres y apellidos

Actualmente todo el nombre se guarda en:

```python
first_names=nombre
last_names=""
```

Esto afecta:

- Búsquedas por apellido.
- Presentación.
- Detección de duplicados.
- Reportes.

Si la fuente no separa nombres y apellidos, no se deben adivinar.

### Modelo recomendado

```text
display_name = nombre completo
first_names = null
last_names = null
name_parse_status = unparsed
```

La separación puede completarse posteriormente desde una fuente estructurada o mediante revisión manual.

---

## 11. Detección del líder

Actualmente:

```python
if leader_name.upper() in name.upper() \
   or name.upper() in leader_name.upper():
```

Este criterio puede identificar como líder a una persona con nombre parcial parecido.

### Corrección

```python
def normalized_name_key(value):
    value = normalize(value).upper()
    value = re.sub(r"[^A-Z0-9 ]", " ", value)
    return " ".join(value.split())


if normalized_name_key(leader_name) == normalized_name_key(name):
    leader_found_id = researcher_result.id
```

Si no existe coincidencia exacta, se debe crear una advertencia para revisión.

Además, la vinculación puede conservar el rol `leader`, no solo `group.leader_id`.

---

## 12. Periodos de vinculación

Actualmente:

```python
parts = [part.strip() for part in periodo.split("-")]
```

Puede fallar con:

- Periodos incompletos.
- Valores con `Actual`.
- Solo año.
- Año y mes.
- Guiones dentro de otros valores.

No debe almacenarse `Actual` como fecha final.

### Parser recomendado

```python
def parse_membership_period(value):
    value = normalize(value).strip()

    match = re.match(
        r"^(\d{4})(?:/(\d{1,2}))?"
        r"\s*-\s*"
        r"(Actual|\d{4}(?:/\d{1,2})?)$",
        value,
        re.IGNORECASE,
    )

    if not match:
        return {
            "start_date": None,
            "end_date": None,
            "is_current": False,
            "raw_value": value,
            "valid": False,
        }

    start = match.group(1)
    if match.group(2):
        start += f"-{int(match.group(2)):02d}-01"
    else:
        start += "-01-01"

    end_raw = match.group(3)

    if end_raw.lower() == "actual":
        end = None
        is_current = True
    else:
        parts = end_raw.split("/")
        end = (
            f"{parts[0]}-{int(parts[1]):02d}-01"
            if len(parts) == 2
            else f"{parts[0]}-01-01"
        )
        is_current = False

    return {
        "start_date": start,
        "end_date": end,
        "is_current": is_current,
        "raw_value": value,
        "valid": True,
    }
```

También debe conservarse precisión:

```text
YEAR
YEAR_MONTH
FULL_DATE
```

---

## 13. Extracción de años

Actualmente se limita el año a 2030:

```python
if 1970 <= year <= 2030:
```

Este límite quedará obsoleto y puede descartar producción histórica.

### Corrección

```python
from datetime import datetime

MIN_YEAR = 1800
MAX_YEAR = datetime.now().year + 1


def extract_year(text):
    match = re.search(r"\b(18\d{2}|19\d{2}|20\d{2}|21\d{2})\b", text)

    if not match:
        return None

    year = int(match.group(1))
    return year if MIN_YEAR <= year <= MAX_YEAR else None
```

---

## 14. Solicitud HTTP

Actualmente:

```python
response = requests.get(url, timeout=30)
response.encoding = "ISO-8859-1"
```

Falta:

- Verificar código HTTP.
- Validar dominio.
- Utilizar HTTPS.
- Definir User-Agent.
- Diferenciar tiempo de conexión y lectura.
- Detectar codificación de respuesta.

### Propuesta

```python
from urllib.parse import urlparse

ALLOWED_HOSTS = {
    "scienti.minciencias.gov.co",
    "minciencias.gov.co",
    "www.minciencias.gov.co",
}


def validate_source_url(url):
    parsed = urlparse(url)

    if parsed.scheme != "https":
        raise ValueError("La fuente debe utilizar HTTPS")

    if parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("Dominio no permitido")


def fetch_html(url):
    validate_source_url(url)

    headers = {
        "User-Agent": (
            "PEA-i Academic Research Importer/1.0 "
            "Universidad Popular del Cesar"
        )
    }

    response = requests.get(
        url,
        timeout=(10, 30),
        headers=headers,
    )

    response.raise_for_status()
    response.encoding = (
        response.apparent_encoding
        or response.encoding
        or "ISO-8859-1"
    )

    return response.text
```

La validación de dominio también reduce el riesgo de que un endpoint de importación se utilice para solicitar direcciones arbitrarias.

---

## 15. Cadena de conexión

La cadena está fija en el código:

```python
conn_str = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=localhost;"
    "Database=peai;"
    "Trusted_Connection=yes;"
)
```

### Corrección

```python
import os

conn_str = os.environ["PEAI_SQLSERVER_CONNECTION"]
```

No deben incluirse usuarios o contraseñas directamente en el repositorio.

---

## 16. Transacciones y conexiones

El scraper realiza persistencia mediante varias rutas:

- Repositorio.
- Conexión adicional para líder.
- Conexión adicional para proyectos.
- Conexión adicional para plan, líneas, importación y auditoría.

Esto puede producir un estado parcial:

```text
Grupo creado
Integrantes creados
Productos creados
Proyectos fallidos
Auditoría fallida
```

Aun así, el código imprime un mensaje general de éxito.

### Diseño recomendado

El scraper debe producir un resultado intermedio sin guardar directamente:

```python
ScrapedGroupData(
    group=...,
    institutions=...,
    members=...,
    products=...,
    projects=...,
    lines=...,
    plan=...,
    warnings=...,
)
```

Flujo:

```text
1. Descargar.
2. Parsear.
3. Normalizar.
4. Validar.
5. Mostrar vista previa.
6. Confirmar.
7. Persistir en una transacción.
8. Actualizar estructuras.
```

---

## 17. Excepciones ocultas

Existen bloques equivalentes a:

```python
except Exception:
    pass
```

Esto oculta:

- Fallos SQL.
- Problemas de conexión.
- Violaciones de integridad.
- Errores de esquema.
- Fallos al asignar líder.
- Duplicados.

### Corrección

```python
except pyodbc.Error as exc:
    logger.exception(
        "No fue posible actualizar el líder del grupo",
        extra={
            "group_code": code,
            "leader_id": leader_found_id,
        },
    )

    warnings.append({
        "code": "LEADER_PERSISTENCE_FAILED",
        "message": str(exc),
    })
```

Los errores críticos deben producir rollback y marcar el trabajo como `failed`.

---

## 18. Ciclo de vida de ImportJob

Actualmente el trabajo se registra al final como completado:

```sql
INSERT INTO ImportJob (...)
VALUES ('url', ?, 'completed', ...)
```

### Flujo correcto

```text
created
extracting
normalizing
validating
awaiting_review
committing
completed
```

Estados alternos:

```text
completed_with_warnings
failed
cancelled
```

El trabajo debe crearse antes de descargar para conservar también fallos tempranos.

---

## 19. Identificador de producto

Actualmente:

```python
external_code=f"PR_{group_code}_{product_count}"
```

El identificador cambia si cambia el orden de la página. El mismo producto puede duplicarse en una importación posterior.

### Prioridad de identidad

```text
1. DOI normalizado.
2. Número de patente.
3. Número de registro de software.
4. ISBN + título.
5. Hash de título + autores + año.
```

### Ejemplo

```python
def product_external_code(title, year, doi=""):
    if doi:
        canonical = f"DOI:{normalize_doi(doi)}"
    else:
        canonical = (
            f"{normalize(title).upper()}|"
            f"{year or ''}"
        )

    digest = hashlib.sha256(
        canonical.encode("utf-8")
    ).hexdigest()[:20]

    return f"PRD_{digest}"
```

El código no debería depender del grupo porque un mismo producto puede asociarse con múltiples grupos.

---

## 20. Números mágicos para categorías

Actualmente:

```python
family_id = 1
subtype_id = 1
```

Si cambian los datos semilla, el scraper asociará categorías equivocadas.

### Corrección

```python
PRODUCT_SECTION_MAP = {
    "articulos publicados": {
        "family_code": "NEW_KNOWLEDGE",
        "subtype_code": "RESEARCH_ARTICLE",
    },
    "software": {
        "family_code": "TECH_INNOVATION",
        "subtype_code": "SOFTWARE",
    },
}
```

El repositorio resuelve los identificadores:

```python
family_id = repository.get_family_id_by_code(
    mapping["family_code"]
)
```

---

## 21. Identificación de tablas

Actualmente se usan condiciones frágiles:

```python
if "Datos b" in title and "sicos" in title
if "L" in title and "neas de investigaci" in title
if "Art" in title and "culos" in title
```

### Corrección

```python
normalized_title = normalize(title).lower()
normalized_title = " ".join(normalized_title.split())

if normalized_title == "datos basicos":
    ...

if normalized_title.startswith("lineas de investigacion"):
    ...
```

La normalización debe realizarse una sola vez por encabezado.

---

## 22. Extracción de proyectos

Actualmente se guarda casi todo el texto de la fila como título y resumen:

```python
clean_project = text.split(".-")[-1].strip()
```

El primer año encontrado se usa como fecha inicial, aunque puede corresponder a otro atributo.

### Recomendación

Conservar inicialmente:

```text
raw_text
source_url
source_section
```

Solo llenar campos estructurados cuando la etiqueta sea inequívoca.

Principio:

> Es preferible conservar un dato sin estructurar que inventar una estructura incorrecta.

---

## 23. Privacidad

El scraper utiliza datos públicos como:

- `cod_rh`.
- Nombre visible.
- Rol.
- Horas.
- Periodos.
- Productos.

Este enfoque es adecuado si se aplican las siguientes reglas:

- No intentar convertir `cod_rh` en cédula.
- No buscar documentos personales en otras fuentes.
- No recolectar correos personales.
- No completar fechas de nacimiento mediante cruces externos.
- Registrar URL y fecha de obtención.
- Identificar el dato como proveniente de fuente pública.
- No considerar automáticamente validado lo importado.
- Permitir corrección y revisión institucional.

---

## 24. Acoplamiento de responsabilidades

La función principal hace simultáneamente:

- Descarga.
- Parsing.
- Normalización.
- Matching.
- Creación de entidades.
- Persistencia.
- Vinculación.
- Auditoría.
- Manejo de cola.
- Impresión de resultados.

Esto dificulta las pruebas y los rollbacks.

### Separación recomendada

```text
GruplacHttpClient
    ↓
GruplacHtmlParser
    ↓
GruplacNormalizer
    ↓
DuplicateDetector
    ↓
ImportValidator
    ↓
ImportPreviewService
    ↓
ImportCommitService
```

### Interfaces sugeridas

```python
class GruplacHttpClient:
    def fetch(self, url: str) -> str:
        ...


class GruplacHtmlParser:
    def parse(self, html: str) -> ScrapedGroupData:
        ...


class ImportValidator:
    def validate(
        self,
        data: ScrapedGroupData,
    ) -> ValidationResult:
        ...


class ImportCommitService:
    def commit(
        self,
        job_id: int,
        data: ScrapedGroupData,
    ) -> CommitResult:
        ...
```

---

## 25. Arquitectura objetivo del importador

```text
URL pública de GrupLAC
          ↓
Validación de dominio
          ↓
Cliente HTTP
          ↓
HTML original conservado
          ↓
Parser estructural
          ↓
DTO de extracción
          ↓
Normalización
          ↓
Detección de duplicados
          ↓
Validación preliminar
          ↓
Vista previa
          ↓
Confirmación del usuario
          ↓
Servicio C++ de dominio
          ↓
Transacción SQL Server
          ↓
Actualización de listas y multilistas
```

---

## 26. Modelo intermedio recomendado

```python
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ScrapedMember:
    display_name: str
    cod_rh: Optional[str]
    role: Optional[str]
    hours: Optional[int]
    period_raw: str
    start_date: Optional[str]
    end_date: Optional[str]
    is_current: bool
    is_leader_candidate: bool
    warnings: list[str] = field(default_factory=list)


@dataclass
class ScrapedAuthor:
    display_name: str
    cod_rh: Optional[str] = None
    matched_researcher_id: Optional[int] = None
    match_status: str = "unverified"


@dataclass
class ScrapedProduct:
    title: str
    raw_text: str
    section: str
    doi: Optional[str]
    issn: Optional[str]
    isbn: Optional[str]
    year: Optional[int]
    authors: list[ScrapedAuthor]
    source_url: str
    warnings: list[str] = field(default_factory=list)


@dataclass
class ScrapedGroupData:
    group: dict
    institutions: list[str]
    members: list[ScrapedMember]
    products: list[ScrapedProduct]
    projects: list[dict]
    research_lines: list[str]
    work_plan_text: str
    warnings: list[str] = field(default_factory=list)
```

Este DTO permite revisar la extracción antes de crear entidades definitivas.

---

## 27. Pruebas necesarias

### 27.1 Fixtures HTML

Guardar muestras controladas:

```text
tests/fixtures/gruplac_group_basic.html
tests/fixtures/gruplac_articles.html
tests/fixtures/gruplac_books.html
tests/fixtures/gruplac_projects.html
tests/fixtures/gruplac_missing_fields.html
```

Las pruebas no deben depender siempre del sitio en vivo.

### 27.2 Pruebas de integrantes

- Extraer nombre.
- Extraer `cod_rh`.
- Extraer horas.
- Parsear periodo vigente.
- Parsear periodo finalizado.
- Detectar líder exacto.
- No asignar líder por coincidencia parcial.

### 27.3 Pruebas de productos

- Extraer título sin mezclar campos.
- Extraer DOI.
- Extraer ISSN.
- Extraer ISBN.
- Extraer año.
- Extraer un autor.
- Extraer múltiples autores.
- Evitar contaminación entre productos consecutivos.
- Mantener autor externo sin crear investigador definitivo.

### 27.4 Pruebas de idempotencia

- Importar la misma página dos veces.
- No duplicar grupo.
- No duplicar investigadores por `cod_rh`.
- No duplicar productos por DOI o clave estable.
- No duplicar autorías.
- No duplicar relaciones producto-grupo.

### 27.5 Pruebas transaccionales

- Simular fallo al guardar productos.
- Comprobar rollback.
- Marcar `ImportJob` como fallido.
- Conservar advertencias y error técnico.

---

## 28. Orden recomendado de cambios

### 28.1 Bloqueantes

1. Corregir la extracción estructural de autores.
2. No marcar productos importados como validados.
3. No asociar definitivamente productos sin aplicar reglas.
4. Eliminar `except Exception: pass`.
5. Hacer transaccional la confirmación.
6. Sustituir códigos de producto basados en contador.
7. Evitar matching parcial como confirmación.
8. Garantizar idempotencia.

### 28.2 Alta prioridad

9. Separar scraping y persistencia.
10. Crear `ImportJob` antes de descargar.
11. Normalizar periodos.
12. Guardar `Actual` como `end_date = null`.
13. Incorporar `display_name`.
14. No guardar rol como nivel académico.
15. Resolver categorías mediante códigos.
16. Registrar asociaciones como pendientes.

### 28.3 Mejoras

17. Retries controlados.
18. Logging estructurado.
19. Fixtures HTML.
20. Métricas de importación.
21. Vista previa antes de confirmar.
22. Reporte de cambios detectados.

---

## 29. Criterios para aprobar el scraper

El scraper podrá considerarse confiable cuando:

- [ ] Los autores se extraigan desde estructura HTML.
- [ ] No exista contaminación entre productos.
- [ ] Las importaciones sean idempotentes.
- [ ] Los productos entren como pendientes de validación.
- [ ] Las relaciones producto-grupo se propongan antes de aprobarse.
- [ ] Los periodos se normalicen y conserven su precisión.
- [ ] No se oculten excepciones.
- [ ] La confirmación use una transacción.
- [ ] Exista vista previa.
- [ ] Los códigos de producto sean estables.
- [ ] Las categorías se resuelvan por código.
- [ ] La importación conserve el HTML o dato original.
- [ ] Existan pruebas con fixtures.
- [ ] Se registre el ciclo completo de `ImportJob`.
- [ ] Solo se recolecten datos públicos necesarios.

---

## 30. Conclusión

El scraper constituye un buen primer prototipo académico porque ya demuestra extracción de datos, integración con el dominio, relaciones, auditoría y persistencia. Sin embargo, el código confía demasiado en expresiones regulares aplicadas sobre texto HTML aplanado y realiza escrituras definitivas durante la extracción.

La mayor prioridad es impedir que autores, productos y asociaciones incorrectas lleguen a la base de datos. El flujo debe cambiar de:

```text
Descargar -> Parsear -> Persistir inmediatamente
```

A:

```text
Descargar
-> Parsear estructuralmente
-> Normalizar
-> Validar
-> Mostrar vista previa
-> Confirmar
-> Persistir en una transacción
```

El scraper puede seguir siendo la base del importador de PEA-i, pero debe convertirse en un componente de extracción puro. Las decisiones de dominio, la asociación definitiva de productos y la persistencia deben ejecutarse después de la revisión y mediante los servicios correspondientes.
