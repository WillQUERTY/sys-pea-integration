# PEA-i: Especificación integral, arquitectura, dominio y cumplimiento del Taller 2

> **Programa Estadístico de Análisis de Investigación**  
> Universidad Popular del Cesar  
> Asignatura: Estructura de Datos  
> Documento maestro de análisis, diseño y trazabilidad  
> Versión 2.0 - 24 de septiembre de 2026

---

## Estado del documento

Este archivo sustituye la versión anterior y consolida en un solo lugar:

- El contexto funcional de PEA-i.
- La arquitectura React, FastAPI, Python, pybind11, C++ y SQL Server.
- El dominio, las entidades y el modelo relacional.
- Las reglas de negocio.
- Las estructuras de datos obligatorias.
- Las variables de entrada y salida.
- La aproximación de hipercubo.
- Las dos soluciones ejecutables exigidas, una en C++ y otra en Python.
- La aplicación web integrada.
- La persistencia en SQL Server y en archivo JSON.
- Los entregables académicos y administrativos.
- La matriz de cumplimiento requisito por requisito.
- Las pruebas y evidencias necesarias para afirmar cumplimiento total.

> **Nota de alcance:** este documento distingue entre diseño, implementación y evidencia. Que una función esté diseñada no significa que ya esté implementada o probada.

---

## Tabla de contenido general

1. Contexto, dominio y especificación funcional
2. Correcciones de cobertura del Taller 2
3. Matriz de cumplimiento completa
4. Hipercubo de información
5. Variables de entrada y salida
6. CRUD y persistencia por estructura
7. Dos soluciones ejecutables e integración
8. Persistencia dual e inicialización
9. Dashboard Python y resumen C++
10. Entregables obligatorios
11. Diagramas y documentación pendientes
12. Matriz de trazabilidad y pruebas
13. Alcance obligatorio y complementario
14. Estructura final del repositorio
15. Lista de comprobación de entrega

---

# PARTE I. ESPECIFICACIÓN FUNCIONAL Y TÉCNICA CONSOLIDADA



---

# PARTE II. COBERTURA EXPLÍCITA DEL TALLER

## 26. Declaración de cumplimiento

La solución se diseñará para cumplir todos los requisitos obligatorios del Taller 2 y, de forma separada, varios complementos. El cumplimiento se evaluará en tres niveles:

```text
DISEÑADO      La función está especificada en este documento.
IMPLEMENTADO  La función existe y puede ejecutarse.
EVIDENCIADO   La función tiene prueba, captura, salida o demostración reproducible.
```

Solo podrá afirmarse cumplimiento total cuando cada requisito obligatorio esté **diseñado, implementado y evidenciado**.

## 27. Interpretación de las dos soluciones

El taller solicita una solución en C/C++ y otra en Python. Para cumplirlo sin duplicar toda la lógica, el proyecto tendrá tres modos de ejecución:

### 27.1 Solución C++ independiente

Punto de entrada:

```text
ABPOXX.cpp
```

Ejecutable:

```text
pea_cli
```

Responsabilidades:

- Cargar información desde SQL Server o archivo JSON.
- Iniciar sin datos cuando el usuario lo seleccione.
- Gestionar grupos, investigadores y productos.
- Ejecutar CRUD sobre las estructuras.
- Mostrar resúmenes, tablas y números.
- Recorrer listas y multilistas.
- Consultar la pila de operaciones.
- Consultar y procesar la cola de validación.
- Exportar el estado a archivo JSON.

### 27.2 Solución Python independiente

Punto de entrada:

```text
ABPOXX.py
```

Modos:

```bash
python ABPOXX.py api
python ABPOXX.py dashboard
python ABPOXX.py import --source archivo.csv
python ABPOXX.py summary
```

Responsabilidades:

- Ejecutar FastAPI.
- Importar URL, CSV y PDF.
- Generar estadísticas descriptivas.
- Generar histogramas y diagramas de barras.
- Producir un dashboard HTML o una vista analítica ejecutable.
- Consumir el núcleo C++ mediante pybind11 cuando esté disponible.

### 27.3 Aplicación integrada

```text
React
   ↓ HTTP/JSON
FastAPI
   ↓ llamada nativa
pybind11
   ↓
Núcleo C++
   ↓
SQL Server
```

La aplicación integrada no sustituye los dos puntos de entrada independientes. Los reutiliza como parte de una solución unificada.

## 28. Matriz completa de requisitos del taller

| ID | Requisito | Componente | Evidencia esperada | Estado del diseño |
|---|---|---|---|---|
| T-01 | Solución en C/C++ | `pea_cli`, núcleo C++ | Ejecución en consola | Cubierto |
| T-02 | Solución en Python | `ABPOXX.py` | API, dashboard o reporte | Cubierto |
| T-03 | Gestionar grupos | C++ + API + React | CRUD funcional | Cubierto |
| T-04 | Gestionar investigadores | C++ + API + React | CRUD funcional | Cubierto |
| T-05 | Gestionar productos por grupo | Multilista + SQL | Consulta por grupo | Cubierto |
| T-06 | Gestionar productos por investigador | Autorías + multilista | Consulta por investigador | Cubierto |
| T-07 | Gestionar integrantes del grupo | `GroupMembership` | Periodos y CRUD | Cubierto |
| T-08 | Gestionar planes | `WorkPlan` | CRUD y asociación | Cubierto |
| T-09 | Gestionar información personal | `Researcher` | Formulario protegido | Cubierto |
| T-10 | Identificar entradas y salidas | Catálogo formal | Sección 31 | Cubierto |
| T-11 | Descargar desde URL | Importador Python | Prueba con URL | Cubierto |
| T-12 | Procesar PDF | Importador Python | Archivo y resultado | Cubierto |
| T-13 | Procesar CSV | Importador Python | Archivo y resultado | Cubierto |
| T-14 | Diseñar listas | C++ manual | Pruebas de nodos | Cubierto |
| T-15 | Usar multilistas | C++ manual | Recorridos multidimensionales | Cubierto |
| T-16 | Usar pilas | Historial deshacer | Push, pop y undo | Cubierto |
| T-17 | Usar colas | Validación FIFO | Enqueue, front y dequeue | Cubierto |
| T-18 | Crear e incluir | Servicios C++ | Pruebas CRUD | Cubierto |
| T-19 | Eliminar | Servicios C++ | Eliminación permitida | Cubierto |
| T-20 | Desactivar | Servicios C++ | Estado inactivo | Cubierto |
| T-21 | Consultar | CLI, API y UI | Búsquedas | Cubierto |
| T-22 | Modificar | Servicios C++ | Actualización | Cubierto |
| T-23 | Persistir | SQL Server + JSON | Reinicio y recarga | Cubierto |
| T-24 | Categoría de producto | Catálogos | Selector y validación | Cubierto |
| T-25 | Validar productos | Cola + validación | Flujo completo | Cubierto |
| T-26 | Filtrar por año | Ventanas | 2, 5 y personalizados | Cubierto |
| T-27 | Editar cualquier dato permitido | UI + servicios | Formularios y auditoría | Cubierto |
| T-28 | Resumen C++ en tablas y números | CLI | Salida de consola | Cubierto |
| T-29 | Dashboard Python | Python | Histograma y barras | Cubierto |
| T-30 | Vista por grupo | React/Python | Pantalla o reporte | Cubierto |
| T-31 | Vista por investigador | React/Python | Pantalla o reporte | Cubierto |
| T-32 | Vista por producto | React/Python | Pantalla o reporte | Cubierto |
| T-33 | Archivo de persistencia | JSON | `pea_data.json` | Cubierto |
| T-34 | Cargar archivo o iniciar vacío | Inicialización | Selector de arranque | Cubierto |
| T-35 | Word de especificación | Documentación | `.docx` final | Cubierto en plan |
| T-36 | Diagramas recomendados | Documentación | ER, casos, clases, secuencia | Cubierto en plan |
| T-37 | Historias de usuario y SPEC | Documentación | Catálogo trazable | Cubierto en plan |
| T-38 | Video aproximado de 10 minutos | Entrega | Enlace o carpeta | Cubierto en plan |
| T-39 | Integrantes visibles en video | Entrega | Video final | Cubierto en plan |
| T-40 | Identidad UPC en video | Entrega | Portada y elementos visuales | Cubierto en plan |
| T-41 | Archivo de identificación | Entrega | `INTEGRANTES.txt` | Cubierto en plan |
| T-42 | Archivos con iniciales | Entrega | `.cpp` y `.py` | Cubierto en plan |
| T-43 | Correo y asunto correctos | Entrega | Lista de envío | Cubierto en plan |
| C-01 | Git y GitHub | Repositorio | Historial de commits | Complemento |
| C-02 | Base de datos | SQL Server | Esquema y conexión | Complemento cubierto |
| C-03 | GUI creativa | React | Aplicación web | Complemento cubierto |
| C-04 | Interoperabilidad | pybind11 | Importación nativa | Complemento cubierto |
| C-05 | Documentación | `/docs` | Paquete documental | Complemento cubierto |
| C-06 | Rust | Ninguno | No requerido | Fuera de alcance |

> La columna “Estado del diseño” no sustituye las pruebas de implementación.

## 29. Hipercubo de información

El taller recomienda una aproximación basada en un hipercubo. PEA-i modelará la información como un espacio multidimensional de análisis, sin requerir un servidor OLAP.

### 29.1 Dimensiones

```text
D1  Grupo
D2  Investigador
D3  Producto
D4  Tiempo
D5  Familia de producto
D6  Subtipo de producto
D7  Categoría de calidad
D8  Proyecto
D9  Línea de investigación
D10 Institución
D11 Estado de validación
D12 Convocatoria
```

### 29.2 Medidas

```text
Cantidad de productos
Cantidad de investigadores
Cantidad de grupos
Cantidad de proyectos
Cantidad de productos validados
Cantidad de productos pendientes
Cantidad de productos por familia
Cantidad de productos por año
Cantidad de integrantes activos
Duración de vinculaciones
```

### 29.3 Operaciones analíticas

```text
Slice:
  Productos del año 2025.

Dice:
  Productos validados de la familia Nuevo Conocimiento,
  generados por un grupo en una ventana de cinco años.

Drill-down:
  Familia -> subtipo -> producto.

Roll-up:
  Producto -> subtipo -> familia -> total institucional.

Pivot:
  Comparar grupos en filas y años en columnas.
```

### 29.4 Consultas del hipercubo

- Productos por grupo y año.
- Producción por investigador y familia.
- Productos validados por grupo y ventana.
- Proyectos por línea y estado.
- Investigadores por grupo y clasificación.
- Producción institucional por convocatoria.

### 29.5 Implementación propuesta

```text
SQL Server:
  tablas normalizadas, vistas y consultas agregadas.

Python:
  DataFrames y cálculos descriptivos.

React:
  filtros, tablas dinámicas y gráficos.

C++:
  recorridos de multilista y resúmenes numéricos.
```

## 30. Modelo de multilista formal

La multilista no se reemplazará por consultas SQL. Se implementará manualmente en C++.

```cpp
struct GroupNode {
    Group data;
    GroupNode* nextGroup;
    MembershipNode* firstMember;
    GroupProductNode* firstProduct;
    GroupProjectNode* firstProject;
    PlanNode* firstPlan;
};

struct MembershipNode {
    int membershipId;
    int researcherId;
    MembershipNode* nextInGroup;
    MembershipNode* nextForResearcher;
};

struct GroupProductNode {
    int linkId;
    int productId;
    GroupProductNode* nextInGroup;
    GroupProductNode* nextForProduct;
};
```

Recorridos mínimos:

```text
Grupo -> integrantes
Grupo -> productos
Grupo -> proyectos
Grupo -> planes
Investigador -> grupos
Investigador -> productos
Producto -> autores
Producto -> grupos
```

## 31. Variables de entrada y salida

### 31.1 Grupo de investigación

#### Entradas

```text
external_code
name
acronym
description
mission
vision
declared_creation_date
knowledge_area
knowledge_subarea
city
department
website
email
leader_id
institution_aval_ids
research_line_ids
work_plan
status
```

#### Salidas

```text
id
current_classification
classification_history
active_member_count
product_count
products_by_family
products_by_year
active_project_count
research_lines
current_plan
recognition_readiness
validation_warnings
```

### 31.2 Investigador

#### Entradas

```text
external_code
identification_type
identification_number
first_names
last_names
nationality
country_of_residence
institutional_email
orcid
highest_education_level
education_records
memberships
classification_records
status
```

#### Salidas

```text
id
display_name
groups
membership_periods
products
products_by_year
products_by_family
projects
classification_history
total_production
validation_warnings
```

### 31.3 Producto

#### Entradas

```text
external_code
title
description
family_id
subtype_id
quality_category_id
obtained_date
publication_date
language
country
doi
isbn
issn
url
authors
project_ids
evidence
specialized_attributes
```

#### Salidas

```text
id
validation_status
group_links
project_links
author_list
observation_windows
quality_result
duplicate_candidates
validation_findings
source_trace
```

### 31.4 Proyecto

#### Entradas

```text
title
summary
project_type
start_date
end_date
status
funding_type
budget
principal_investigator_id
group_ids
research_line_ids
```

#### Salidas

```text
id
participating_groups
participating_researchers
related_products
duration
execution_status
validation_warnings
```

### 31.5 Importación

#### Entradas

```text
source_type
source_url
file
mapping_configuration
duplicate_policy
```

#### Salidas

```text
job_id
status
new_records
exact_matches
probable_duplicates
warnings
errors
ignored_records
commit_result
```

## 32. CRUD y persistencia por estructura

| Estructura | Crear/Incluir | Consultar | Modificar | Desactivar | Eliminar/Extraer | Persistencia |
|---|---|---|---|---|---|---|
| Lista de grupos | insertar nodo | buscar/recorrer | actualizar dato | marcar nodo | remover nodo | `ResearchGroup` |
| Lista de investigadores | insertar nodo | buscar/recorrer | actualizar dato | marcar nodo | remover nodo | `Researcher` |
| Lista de productos | insertar nodo | buscar/recorrer | actualizar dato | marcar nodo | remover nodo | `Product` |
| Multilista | crear enlace | recorrer dimensión | actualizar enlace | desactivar enlace | desasociar | tablas intermedias |
| Pila | `push` | `top`/listar | marcar operación | no aplica | `pop`/undo | `UndoOperation` |
| Cola | `enqueue` | `front`/listar | estado/intentos | cancelar | `dequeue` | `ValidationQueueItem` |

### 32.1 Persistencia de la lista

Las entidades se guardan en tablas principales. Al iniciar el núcleo, las tablas se recorren para reconstruir nodos y enlaces.

### 32.2 Persistencia de la multilista

Las relaciones se guardan en:

```text
GroupMembership
GroupProductLink
GroupProject
ResearcherProject
ProjectProduct
```

### 32.3 Persistencia de la pila

Solo se persisten operaciones reversibles. Una operación deshecha conserva su registro y la fecha de reversión.

### 32.4 Persistencia de la cola

Los elementos pendientes conservan orden de llegada, estado, intentos y asignación.

## 33. Persistencia dual

### 33.1 Persistencia principal

```text
SQL Server
```

Responsabilidades:

- Fuente definitiva de verdad.
- Integridad referencial.
- Transacciones.
- Recuperación después de reiniciar.
- Consultas analíticas.

### 33.2 Archivo de persistencia para entrega

```text
persistence/pea_data.json
```

Contenido mínimo:

```json
{
  "schemaVersion": "1.0",
  "exportedAt": "2026-09-24T00:00:00Z",
  "groups": [],
  "researchers": [],
  "memberships": [],
  "products": [],
  "authors": [],
  "groupProductLinks": [],
  "workPlans": [],
  "projects": [],
  "validationQueue": [],
  "undoOperations": []
}
```

### 33.3 Inicio de la aplicación

Opciones:

```text
1. Usar datos existentes de SQL Server.
2. Importar un archivo pea_data.json.
3. Iniciar sin datos.
```

Endpoints sugeridos:

```http
POST /api/system/initialize/database
POST /api/system/initialize/file
POST /api/system/initialize/empty
GET  /api/system/export
```

La opción “iniciar sin datos” no elimina automáticamente la base de datos existente. Debe crear una sesión o entorno vacío controlado, o requerir una confirmación administrativa explícita para limpiar datos de desarrollo.

## 34. Estadísticas de la solución C++

La CLI C++ debe presentar tablas y números, sin requerir GUI.

Comandos mínimos:

```bash
pea_cli groups list
pea_cli researchers list
pea_cli products list
pea_cli summary
pea_cli products by-year 2022 2026
pea_cli structures groups
pea_cli structures multilist --group 1
pea_cli queue list
pea_cli queue process
pea_cli history top
pea_cli history undo
pea_cli export persistence/pea_data.json
```

Resumen esperado:

```text
+--------------------------------+-------+
| Indicador                      | Total |
+--------------------------------+-------+
| Grupos activos                 |    12 |
| Investigadores activos         |    84 |
| Productos registrados          |   240 |
| Productos validados            |   213 |
| Productos pendientes           |    27 |
+--------------------------------+-------+
```

Los valores anteriores son únicamente un ejemplo de presentación, no datos reales del proyecto.

## 35. Dashboard de la solución Python

Python debe poder demostrar el componente analítico sin depender obligatoriamente de React.

### 35.1 Salidas mínimas

```text
dashboard_report.html
products_by_year.png
products_by_family.png
researcher_productivity_histogram.png
```

### 35.2 Vistas obligatorias

- Por grupo.
- Por investigador.
- Por producto.

### 35.3 Visualizaciones mínimas

- Histograma de cantidad de productos por investigador.
- Gráfico de barras de productos por familia.
- Gráfico de barras de productos por año.
- Resumen numérico general.

React podrá mostrar los mismos datos dentro de la aplicación integrada, pero la generación estadística se conservará en Python.

## 36. Edición de datos y permisos

El requisito de editar cualquier dato se interpretará así:

- Todos los datos funcionales cuentan con una operación de modificación.
- La modificación requiere permisos adecuados.
- Los identificadores internos no se editan manualmente.
- Los campos calculados se recalculan, no se sobrescriben.
- Los cambios sensibles generan auditoría.
- Una modificación que afecte una validación obliga a revalidar.

## 37. Entregables obligatorios

### 37.1 Código

```text
ABPOXX.cpp
ABPOXX.py
```

Los nombres exactos deben reemplazarse por las iniciales reales del equipo.

Además se entregará el proyecto modular completo.

### 37.2 Documento Word

Debe contener:

- Contexto.
- Requerimientos.
- Arquitectura.
- Estructuras de datos.
- Modelo relacional.
- Reglas de negocio.
- Entradas y salidas.
- Hipercubo.
- Casos de uso.
- Historias de usuario.
- Diagramas.
- Estrategia de pruebas.
- Instrucciones de ejecución.

### 37.3 Archivo de persistencia

```text
pea_data.json
```

### 37.4 Archivo de identificación

```text
INTEGRANTES.txt
```

Plantilla:

```text
Grupo: XX

Integrante 1
Nombre completo:
Código estudiantil:
Correo institucional:
Programa:

Integrante 2
...
```

### 37.5 Video

Duración aproximada solicitada: 10 minutos.

Guion recomendado:

```text
00:00 Presentación e identidad institucional
00:40 Problema y requisitos
01:30 Arquitectura
02:20 Modelo relacional e hipercubo
03:10 Lista
04:00 Multilista
04:50 Pila
05:30 Cola
06:10 Solución C++
07:00 Solución Python y dashboard
08:00 Importación URL/PDF/CSV
09:00 Aplicación integrada y persistencia
09:40 Conclusiones
```

### 37.6 Correo de entrega

```text
Destinatario: adithperez@unicesar.edu.co
Asunto: Estructura de datos Taller 2 Grupo XX 2026
```

Antes del envío debe comprobarse la fecha límite indicada en el documento original del taller.

## 38. Diagramas requeridos para cerrar la documentación

### 38.1 Diagrama de casos de uso

Actores:

```text
Administrador
Gestor de investigación
Líder de grupo
Investigador
Validador
Usuario de consulta
```

Casos centrales:

```text
Gestionar grupos
Gestionar investigadores
Gestionar productos
Gestionar vinculaciones
Importar datos
Validar productos
Consultar dashboard
Filtrar por ventana
Deshacer operación
Exportar persistencia
Inicializar datos
```

### 38.2 Diagrama entidad-relación

Debe incluir al menos:

```text
ResearchGroup
Researcher
GroupMembership
Product
ProductAuthor
GroupProductLink
WorkPlan
ResearchProject
Validation
Evidence
ImportJob
MeasurementCall
ObservationWindow
```

### 38.3 Diagrama de clases C++

```text
LinkedList<T>
ResearchMultilist
OperationStack
ValidationQueue
GroupService
ResearcherService
ProductService
MembershipService
Repository interfaces
```

### 38.4 Diagramas de secuencia

- Crear producto.
- Importar y confirmar lote.
- Asociar producto a grupo.
- Procesar validación.
- Deshacer operación.

### 38.5 Diagrama de despliegue

```text
Browser
React static application
FastAPI process
C++ native module
SQL Server
File storage
```

## 39. Historias de usuario mínimas

### HU-01 Gestionar grupo

```text
Como gestor de investigación
quiero crear y editar grupos
para mantener actualizada la información institucional.
```

Criterios:

- El nombre es obligatorio.
- El código externo no se duplica.
- La desactivación conserva el historial.

### HU-02 Vincular investigador

```text
Como líder de grupo
quiero proponer la vinculación de un investigador por un periodo
para representar correctamente la composición del grupo.
```

Criterios:

- Las fechas son válidas.
- No se solapan periodos.
- La propuesta conserva solicitante y autorización.

### HU-03 Registrar producto

```text
Como investigador
quiero registrar un producto y sus autores
para incorporarlo al análisis de producción.
```

Criterios:

- Tiene familia, subtipo, título y fecha de obtención.
- Tiene al menos un autor.
- Se detectan duplicados básicos.

### HU-04 Asociar producto a grupo

```text
Como líder de grupo
quiero solicitar la asociación de un producto
para incluirlo en la producción del grupo cuando cumpla las reglas.
```

Criterios:

- Existe un autor vinculado en la fecha de obtención.
- La asociación conserva estado y autorización.
- No se contabiliza dos veces en el mismo grupo.

### HU-05 Importar información

```text
Como gestor
quiero importar una URL, un CSV o un PDF
para reducir el registro manual.
```

Criterios:

- Se conserva el dato original.
- Se muestra vista previa.
- Los errores bloqueantes impiden confirmar.

### HU-06 Validar producto

```text
Como validador
quiero procesar productos en orden FIFO
para registrar decisiones trazables.
```

Criterios:

- El rechazo requiere motivo.
- Toda decisión registra fecha y responsable.

### HU-07 Consultar ventana

```text
Como usuario de consulta
quiero filtrar producción por una ventana de años
para analizar periodos comparables.
```

Criterios:

- El reporte muestra la ventana aplicada.
- Se utiliza la fecha de obtención.

### HU-08 Iniciar con o sin datos

```text
Como usuario de la demostración
quiero cargar un archivo o iniciar sin datos
para probar distintos escenarios.
```

## 40. Matriz de trazabilidad

| Requisito | Regla/Entidad | Endpoint/Comando | Prueba | Evidencia |
|---|---|---|---|---|
| Gestionar grupos | `ResearchGroup` | `/api/groups` | IT-GRP-001 | captura + respuesta |
| Gestionar investigadores | `Researcher` | `/api/researchers` | IT-RES-001 | captura + respuesta |
| Gestionar productos | `Product` | `/api/products` | IT-PRD-001 | captura + respuesta |
| Vinculación temporal | `RV-001`, `RV-002` | grupos/memberships | UT-MEM-002 | prueba automática |
| Producto-grupo | `RPG-001` | products/group-links | UT-LNK-001 | prueba automática |
| Lista | `LinkedList<T>` | CLI structures | UT-LST-001 | salida consola |
| Multilista | `ResearchMultilist` | CLI multilist | UT-MLT-001 | recorrido impreso |
| Pila | `OperationStack` | history/undo | UT-STK-001 | antes/después |
| Cola | `ValidationQueue` | queue process | UT-QUE-001 | orden FIFO |
| CSV | `ImportJob` | imports/csv | IT-CSV-001 | vista previa |
| PDF | `ImportJob` | imports/pdf | IT-PDF-001 | resultado extraído |
| URL | `ImportJob` | imports/url | IT-URL-001 | fuente + resultado |
| Ventana | `ObservationWindow` | dashboard | IT-WIN-001 | filtro 2/5 años |
| Persistencia | repositorios | export/import | IT-PER-001 | reinicio exitoso |
| Dashboard | estadísticas | dashboard | E2E-DASH-001 | gráficos |

## 41. Pruebas mínimas

### 41.1 C++ unitarias

- Insertar en lista vacía.
- Insertar al inicio y final.
- Buscar existente e inexistente.
- Modificar nodo.
- Desactivar nodo.
- Eliminar primero, intermedio y último.
- Recorrer hacia adelante y atrás.
- Crear enlaces de multilista.
- Recorrer grupo a integrantes.
- Recorrer investigador a grupos.
- Push, top y pop.
- Enqueue, front y dequeue.
- Mantener FIFO.

### 41.2 Reglas de dominio

- Rechazar periodo invertido.
- Rechazar periodos solapados.
- Aceptar reingreso no solapado.
- Rechazar producto sin autor.
- Rechazar asociación sin vínculo temporal.
- Aceptar asociación con vínculo válido.
- Invalidar validación después de cambio crítico.

### 41.3 Persistencia

- Guardar y recuperar grupos.
- Reconstruir estructuras al reiniciar.
- Exportar JSON.
- Importar JSON.
- Iniciar vacío.
- Evitar doble importación del mismo archivo.

### 41.4 API

- Códigos HTTP correctos.
- Validación de DTO.
- Paginación.
- Filtros.
- Mapeo de excepciones C++.
- Carga de archivos.

### 41.5 Analítica

- Filtro por año.
- Ventana de dos años.
- Ventana de cinco años.
- Conteos por familia.
- Histograma.
- Barras.
- Vistas por grupo, investigador y producto.

## 42. Alcance obligatorio, complementario y excluido

### 42.1 Obligatorio

```text
Grupos
Investigadores
Productos
Integrantes
Planes
Categoría y validación
Listas
Multilistas
Pilas
Colas
CRUD
Persistencia
URL
PDF
CSV
Filtro por año
Resumen C++
Dashboard Python
Tres vistas
Archivo de persistencia
Carga o inicio vacío
Documentación
Video
Archivos de entrega
```

### 42.2 Complementario prioritario

```text
Git y GitHub
SQL Server
React
pybind11
Pruebas automatizadas
Auditoría
Docker si es estable
```

### 42.3 Segunda fase

```text
Motor genérico de reglas
Clasificación simulada avanzada
Todos los subtipos oficiales
Duplicados probabilísticos
Múltiples fuentes de scraping
Prioridad avanzada de cola
Undo de lotes completos
```

### 42.4 Excluido

```text
Rust
Segunda API
Aplicación móvil
Microservicios adicionales
Replicar CvLAC completo
Reconocimiento oficial automático
Scraping universal
OLAP empresarial real
```

## 43. Estructura final del repositorio

```text
pea-i/
├── README.md
├── INTEGRANTES.txt
├── ABPOXX.cpp
├── ABPOXX.py
├── frontend/
│   └── web-react/
├── backend/
│   ├── api-python/
│   │   ├── app/
│   │   │   ├── routers/
│   │   │   ├── schemas/
│   │   │   ├── use_cases/
│   │   │   ├── importers/
│   │   │   ├── statistics/
│   │   │   └── main.py
│   │   └── tests/
│   └── core-cpp/
│       ├── include/
│       │   ├── domain/
│       │   ├── structures/
│       │   ├── services/
│       │   └── repositories/
│       ├── src/
│       ├── bindings/
│       ├── cli/
│       └── tests/
├── database/
│   ├── migrations/
│   ├── schema.sql
│   └── seed.sql
├── persistence/
│   ├── pea_data.json
│   └── samples/
├── reports/
│   ├── dashboard_report.html
│   └── charts/
├── contracts/
│   └── openapi/
├── docs/
│   ├── architecture/
│   ├── requirements/
│   ├── user-stories/
│   ├── diagrams/
│   ├── tests/
│   └── video-script/
└── deployment/
    ├── docker-compose.yml
    └── env.example
```

## 44. Lista de comprobación final

### Código

- [ ] `ABPOXX.cpp` compila y ejecuta.
- [ ] `ABPOXX.py` ejecuta.
- [ ] Lista implementada manualmente.
- [ ] Multilista implementada manualmente.
- [ ] Pila funcional.
- [ ] Cola FIFO funcional.
- [ ] CRUD completo.
- [ ] pybind11 funcional.
- [ ] FastAPI funcional.
- [ ] React funcional.

### Datos

- [ ] SQL Server creado.
- [ ] Migraciones incluidas.
- [ ] `pea_data.json` incluido.
- [ ] Carga desde archivo probada.
- [ ] Inicio sin datos probado.
- [ ] Reconstrucción desde SQL probada.

### Importación

- [ ] URL probada.
- [ ] CSV probado.
- [ ] PDF probado.
- [ ] Vista previa.
- [ ] Errores por fila.
- [ ] Confirmación idempotente.

### Analítica

- [ ] Filtro de dos años.
- [ ] Filtro de cinco años.
- [ ] Periodo personalizado.
- [ ] Vista por grupo.
- [ ] Vista por investigador.
- [ ] Vista por producto.
- [ ] Histograma.
- [ ] Barras.
- [ ] Resumen C++.

### Documentación

- [ ] Word final.
- [ ] Arquitectura.
- [ ] Modelo relacional.
- [ ] Hipercubo.
- [ ] Entradas y salidas.
- [ ] Casos de uso.
- [ ] Historias de usuario.
- [ ] Diagrama de clases.
- [ ] Diagramas de secuencia.
- [ ] Diccionario de datos.
- [ ] Matriz de trazabilidad.
- [ ] Manual de instalación.
- [ ] Manual de usuario.

### Entrega

- [ ] `INTEGRANTES.txt`.
- [ ] Archivos con iniciales correctas.
- [ ] Video aproximado de 10 minutos.
- [ ] Identidad institucional en video.
- [ ] Integrantes visibles en video.
- [ ] Repositorio o paquete final.
- [ ] Asunto de correo correcto.
- [ ] Destinatario correcto.
- [ ] Fecha límite verificada.

## 45. Veredicto de cobertura

Con las ampliaciones de esta versión, el diseño documental cubre explícitamente:

- Todos los requisitos funcionales identificados en el taller.
- Las cuatro estructuras exigidas.
- Las operaciones CRUD y persistencia por estructura.
- El modelo de hipercubo recomendado.
- Las variables de entrada y salida.
- Las dos soluciones independientes.
- La aplicación integrada.
- La persistencia en SQL Server y archivo.
- La elección de cargar datos o iniciar vacío.
- Los entregables de documentación, video e identificación.
- Los complementos de Git, base de datos, GUI e interoperabilidad.

La afirmación de cumplimiento total dependerá de completar la implementación y reunir las evidencias enumeradas en la matriz de trazabilidad y en la lista de comprobación.
