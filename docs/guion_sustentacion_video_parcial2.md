# Guion de sustentación — Video Parcial 2 EdD (Khemia Web + Backend + C++ Core)

**Asignatura:** Estructura de Datos  
**Docente:** Ing. Adith Pérez  
**Grupo:** WP - DN - EO — Universidad Popular del Cesar  
**Integrantes (los tres visibles en cámara todo el tiempo, NOTA 6.iii):**  
- William Andrés Peñaranda Oñate (WP)  
- Donaldo David Noriega Palomino (DN)  
- Edinson José Olivero Rojas (EO)  

**Programa:** PEA-i / Khemia — Programa Estadístico de Análisis de Investigación  
**Duración objetivo:** **10:00 – 11:00** (NOTA 6.i: "alrededor de 10 minutos")  

**Propósito de esta versión (v3):**  
Unificar la resolución rigurosa de **cada uno de los 12 ejercicios y los 2 cálculos del parcial** utilizando como vehículo principal la aplicación integral **Khemia (Frontend React + Backend FastAPI)**, demostrando en vivo la interoperabilidad con el **núcleo en C++ (estructuras de listas en RAM)** y la paridad numérica con los archivos entregables ([`Taller2_WP-DN-EO.py`](../Taller2_WP-DN-EO.py) y [`Taller2_WP-DN-EO.cpp`](../Taller2_WP-DN-EO.cpp)).

---

## 📁 Directorio de Enlaces Rápidos (Acceso Directo del Equipo)

Para facilitar la navegación y ensayo del equipo, a continuación se listan todos los accesos directos a los archivos citados en este guion:

| Módulo / Entregable | Enlace Directo al Archivo | Rol en la Sustentación |
|---|---|---|
| **Entregable Python** | [`Taller2_WP-DN-EO.py`](../Taller2_WP-DN-EO.py) | Script de respuestas, variables de entrada/salida y fórmulas ($12.667$ y $11.700$). |
| **Entregable C++** | [`Taller2_WP-DN-EO.cpp`](../Taller2_WP-DN-EO.cpp) | Fuente en C++ con estructuras y salida numérica idéntica. |
| **Persistencia Oficial** | [`pea_data.json`](../pea_data.json) | Base de datos serializada (8.898 registros en 12 colecciones estructuradas). |
| **Documento Word** | [`Parcial2_WP-DN-EO.docx`](./word/Parcial2_WP-DN-EO.docx) | Especificación técnica formal con diagramas UML de Casos de Uso y Secuencia. |
| **Especificación Integral** | [`PEA-i_Especificacion_Integral_Cumplimiento_Taller2.md`](./PEA-i_Especificacion_Integral_Cumplimiento_Taller2.md) | Documento maestro con la documentación técnica integral. |
| **Guía PDF de Ecuaciones** | [`Explicacion_Calificacion_Global_Compuesta.pdf`](./Explicacion_Calificacion_Global_Compuesta.pdf) | Resumen ejecutivo institucional en 2 páginas de las fórmulas y fundamentos normativos. |
| **Identificación Alumnos** | [`INTEGRANTES.txt`](../INTEGRANTES.txt) | Archivo formal de identificación de los tres estudiantes según NOTA 4. |
| **Borrador de Envío** | [`correo_entrega_parcial2.md`](./correo_entrega_parcial2.md) | Asunto exacto, destinatario (`adithperez@unicesar.edu.co`) y lista de adjuntos. |
| **Dashboard Python** | [`pea_dashboard.py`](../scripts/pea_dashboard.py) | Generador de histogramas descriptivos en PNG ([`docs/dashboard/`](./dashboard)). |
| **Frontend Web Grupos** | [`group-analytics-tab.tsx`](../frontend/web-react/src/features/groups/components/tabs/group-analytics-tab.tsx) | Pestaña de estadísticas de grupos con KPIs fijos y 4 sub-pestañas. |
| **Diagnóstico Minciencias** | [`minciencias-diagnosis-card.tsx`](../frontend/web-react/src/components/charts/minciencias-diagnosis-card.tsx) | Tarjeta con semáforo, checklist de requisitos y desglose oficial. |
| **Frontend Investigadores** | [`researcher-analytics-tab.tsx`](../frontend/web-react/src/features/researchers/components/tabs/researcher-analytics-tab.tsx) | Vista individual con KPIs fijos y adaptación rotulada. |
| **Catálogo Oficial 2024** | [`catalogo_oficial_pesos_minciencias_2024.md`](./catalogo_oficial_pesos_minciencias_2024.md) | Tabla canónica de pesos relativos, anclas y ventanas por subtipo. |
| **Núcleo RAM C++** | [`group_service.cpp`](../core_cpp/src/services/group_service.cpp) / [`group.h`](../core_cpp/include/entities/group.h) | Implementación de nodos y punteros `GroupNode → nextGroup` y multilistas. |
| **CLI C++** | [`pea_cli.cpp`](../core_cpp/src/pea_cli.cpp) | Comandos de consola `structures`, `summary`, `load`, `by-year`. |
| **Evaluador Oficial Backend** | [`official_indicator.py`](../backend/app/evaluator/official_indicator.py) | Pipeline formal Minciencias 2024 (§2.2.9 → §3.10) en Python. |

---

## 0. Mapa de Trazabilidad (Escena por Requisito)

| Escena | Tiempo | Ejercicios del Enunciado | Qué se ve en Pantalla (Visual) | Presentador |
|---|---|---|---|---|
| **1** | 0:00 – 0:35 | Portada e Identidad Institucional | Portada institucional UPC con logo, título y nombres | WP |
| **2** | 0:35 – 1:50 | **Ej. 7** (Ingesta URL/PDF/CSV) y **Ej. 8** (Estructura de LISTAS) | **Split:** Modal de importación en Khemia Web + Terminal con `pea_cli structures groups` | DN |
| **3** | 1:50 – 3:10 | **Ej. 1, 2, 3 y 4** (Entidades, tipología, valor en puntos y pesos) | **Khemia Web:** Grupos, miembros, productos y tabla oficial del Catálogo 2024 (*Ancla × Peso Rel. = Peso Global*) | EO |
| **4** | 3:10 – 4:10 | **Ej. 6** (Variables de entrada y salida del modelo) | **Khemia Web:** Sección *«Entradas y Salidas del Modelo»* + Salida de `Taller2_WP-DN-EO.py` | WP |
| **5** | 4:10 – 5:30 | **Ej. 9, 10 y 11** (CRUD, desactivar, filtrar por año y modificar) | **Khemia Web:** Selector de ventana de tiempo (2 y 5 años), edición de producto y desactivación lógica | DN |
| **6** | 5:30 – 7:00 | **Ej. 12 (a y b)** (Estadísticas: a. Resumen C, b. Dashboard Python) | **Terminal:** `pea_cli summary` (C++) + **Khemia Web:** Dashboard interactivo con sub-pestañas | EO |
| **7** | 7:00 – 8:20 | **Ej. 5** (Modelo) y **PARCIAL 1** (Indicador del grupo) | **Terminal:** `python Taller2_WP-DN-EO.py` (**I_Grupo = 12.667**) + **Web:** Tarjeta Diagnóstico Minciencias | WP |
| **8** | 8:20 – 9:30 | **PARCIAL 2** (Indicador del investigador) | **Terminal:** Segunda función de `Taller2` (**I_Investigador = 11.700**) + **Web:** Panel individual adaptado | DN |
| **9** | 9:30 – 10:15 | **NOTA 9** (Persistencia) y **NOTA 10** (Cargar o modo vacío) | Archivo `pea_data.json` en editor + CLI con arranque `load` vs. modo vacío | EO |
| **10** | 10:15 – 10:45 | Cierre formal y verificación de entrega | Portada final con lista de los 5 archivos enviados por correo | Los 3 |

---

## 1. Checklist Técnico Antes de Grabar

- [ ] **Servidor Backend activo:** `uvicorn app.main:app` (puerto 8000). Ver archivo principal [`backend/app/main.py`](../backend/app/main.py).
- [ ] **Frontend Web Khemia activo:** `npm run dev` en `http://localhost:5173`. Ver [`frontend/web-react/`](../frontend/web-react/).
- [ ] **Terminal 1 (Directorio raíz):** Lista para compilar/ejecutar `python -X utf8 Taller2_WP-DN-EO.py` y `Taller2_WP-DN-EO.exe` desde [`Taller2_WP-DN-EO.py`](../Taller2_WP-DN-EO.py).
- [ ] **Terminal 2 (Directorio CLI C++):** Lista para `pea_cli structures groups` y `pea_cli summary` desde [`core_cpp/src/pea_cli.cpp`](../core_cpp/src/pea_cli.cpp).
- [ ] **Pestañas del navegador listas:**
  1. Portal Khemia: Vista de Grupos (Grupo AITICE #10 abierto).
  2. Pestaña de Analítica de AITICE ([`group-analytics-tab.tsx`](../frontend/web-react/src/features/groups/components/tabs/group-analytics-tab.tsx)) con las 4 sub-pestañas (*Resumen, Diagnóstico, Equipo y red, Comparativa*).
  3. Modal de Ingesta desde URL/Archivo abierto para demostración.
- [ ] **Persistencia:** Archivo [`pea_data.json`](../pea_data.json) verificado en la raíz.
- [ ] **Grabación:** Resolución 1920×1080 a 30 fps, audio claro sin eco.
- [ ] **Rúbrica:** Los tres estudiantes visibles en cámara todo el tiempo (cámara web en una esquina o vista compartida).

---

## 2. Guion de Cámara Detallado (Paso a Paso)

### Escena 1 — Apertura e Identidad Institucional (0:00 – 0:35)
**Tiempo:** 35 segundos  
**Habla:** WP  
**Visual:** Portada institucional en pantalla completa: Logo oficial UPC, *"Facultad de Ingenierías y Tecnológicas — Ingeniería de Sistemas"*, *"Estructura de Datos — Parcial 2"*, *"Plataforma PEA-i / Khemia"*, nombres completos de los tres integrantes según [`INTEGRANTES.txt`](../INTEGRANTES.txt).

> *"Buenas tardes, profesor Adith Pérez. Somos el grupo WP-DN-EO de la Universidad Popular del Cesar, conformado por William Peñaranda, Donaldo Noriega y Edinson Olivero.*  
> *Para dar solución integral al taller y al segundo parcial de Estructura de Datos, desarrollamos **Khemia / PEA-i**, una plataforma construida sobre un núcleo de alto rendimiento en C++ con estructuras de listas dinámicas, un backend analítico en FastAPI y una interfaz web moderna en React. En los próximos diez minutos explicaremos de forma puntual la solución de cada uno de los doce ejercicios propuestos y los dos cálculos del parcial, ejecutando los programas en vivo."*

---

### Escena 2 — Ingesta de Datos y Estructura de LISTAS (0:35 – 1:50)
**Ejercicios:** 7 (URL / PDF / CSV) y 8 (Estructura de LISTAS)  
**Tiempo:** 1 minuto 15 segundos  
**Habla:** DN  
**Visual:** Pantalla compartida (Split Screen).  
- **Izquierda (Khemia Web):** Modal de importación de datos ([`backend/app/api/routers/imports.py`](../backend/app/api/routers/imports.py)) mostrando las opciones URL GrupLAC, CvLAC, PDF y CSV, con la **vista previa de registros extraídos en vivo**.  
- **Derecha (Terminal C++):** Ejecución de `pea_cli structures groups` implementado en [`core_cpp/src/services/group_service.cpp`](../core_cpp/src/services/group_service.cpp).

> **[Ejercicio 7 — Ingesta de Datos]:** *"El sistema está en capacidad de procesar información por cuatro vías: descarga web desde la URL de GrupLAC de SCIENTI, ingesta de currículos CvLAC de investigadores, y procesamiento de archivos locales en formatos PDF y CSV. En la pantalla web apreciamos el módulo de ingesta: al ingresar la URL de GrupLAC de la universidad, el sistema genera primero una **vista previa** con el conteo de grupos, integrantes y productos antes de confirmar su almacenamiento definitivo en el sistema."*
>
> **[Ejercicio 8 — Estructura de Datos en LISTAS]:** *"El núcleo del proyecto cumple estrictamente con el requerimiento de estructuras de datos en memoria RAM. En el core en C++ no utilizamos contenedores STL (`std::vector` ni `std::map`) para el grafo: modelamos **listas simplemente enlazadas y multilistas ortogonales basadas en nodos y punteros** (ver modelos en [`core_cpp/include/entities/group.h`](../core_cpp/include/entities/group.h) y [`membership.h`](../core_cpp/include/entities/membership.h)). En la terminal de la derecha ejecutamos `pea_cli structures groups`: se observa el recorrido puntero a puntero `GroupNode → nextGroup`, donde cada grupo apunta ortogonalmente a su lista de integrantes mediante `firstMembership` y a su lista de productos mediante `firstProductLink`, garantizando un enlace cruzado bidireccional."*

```bash
# Comando en terminal derecha:
pea_cli structures groups
```

---

### Escena 3 — Gestión de Entidades, Catálogo 2024 y Tipología (1:50 – 3:10)
**Ejercicios:** 1, 2, 3 y 4 (Grupos, Investigadores, Integrantes, Tipología y Ponderaciones)  
**Tiempo:** 1 minuto 20 segundos  
**Habla:** EO  
**Visual:** Khemia Web.  
1. Navegación por la lista de grupos e investigadores (**Ej. 1**).  
2. Detalle del grupo AITICE: pestaña de integrantes con roles/fechas y pestaña de productos asociados (**Ej. 3**).  
3. Sub-pestaña *«Diagnóstico»* ([`minciencias-diagnosis-card.tsx`](../frontend/web-react/src/components/charts/minciencias-diagnosis-card.tsx)) mostrando la **Tabla del Catálogo Oficial 2024** extraída de [`catalogo_oficial_pesos_minciencias_2024.md`](./catalogo_oficial_pesos_minciencias_2024.md) (**Ej. 2 y 4**).

> **[Ejercicio 1 y 3 — Grupos, Investigadores y Membresías]:** *"En Khemia gestionamos grupos e investigadores de la institución. Aquí observamos el grupo AITICE: la plataforma lista sus integrantes con sus fechas de vinculación y sus productos asociados. Como es una multilista, un mismo investigador puede pertenecer a varios grupos y un producto puede compartirse entre múltiples coautores."*
>
> **[Ejercicio 2 y 4 — Tipología, Valor en Puntos y Peso Relativo]:** *"Cada producto de investigación está tipificado bajo las cinco familias del modelo Minciencias: GNC, DTI, ASC, DPC y FRH. Para cumplir con el cálculo de puntajes, integramos la tabla oficial del Modelo 2024: aquí vemos la columna **Peso Relativo**, el **Ancla** de la Tabla 6 y el **Peso Global**, donde se evidencia la fórmula matemática:  
> $$\text{Peso Global} = \text{Ancla} \times \text{Peso Relativo}$$  
> Por ejemplo, un artículo de investigación con calidad validada `ART_A1` tiene peso relativo **9,5** y ancla **100**, generando **950 puntos globales**. En el perfil individual del investigador ([`researcher-analytics-tab.tsx`](../frontend/web-react/src/features/researchers/components/tabs/researcher-analytics-tab.tsx)) se aplica esta misma categorización sobre sus productos personales de CvLAC."*

---

### Escena 4 — Variables de Entrada y Salida del Modelo (3:10 – 4:10)
**Ejercicio:** 6 (Variables de Entrada y Salida)  
**Tiempo:** 1 minuto  
**Habla:** WP  
**Visual:** Khemia Web (componente [`modelo-2024-comun.tsx`](../frontend/web-react/src/components/charts/modelo-2024-comun.tsx), sección *"Entradas y Salidas del Modelo"*) + terminal ejecutando [`Taller2_WP-DN-EO.py`](../Taller2_WP-DN-EO.py) en la cabecera.

> **[Ejercicio 6 — Variables de Entrada y Salida]:** *"El ejercicio 6 exige identificar formalmente las variables que alimentan y produce el modelo de medición, tanto para el grupo como para el investigador. Tanto en la interfaz web como en el archivo fuente [`Taller2_WP-DN-EO.py`](../Taller2_WP-DN-EO.py) las declaramos e imprimimos explícitamente:*
> - ***Variables de Entrada:*** *La lista de productos registrados, el conjunto de integrantes vinculados, el año de corte o evaluación (2026) y las ventanas de observación aplicables (5, 7 o 10 años).*
> - ***Variables de Salida:*** *El total de productos vigentes en ventana, los conteos discriminados por clase de calidad ($Nc_{\text{Top}}, Nc_A, Nc_B, AP, DPC, Fr_A, Fr_B$), el índice de cohesión interna entre miembros, el índice de cooperación externa y el indicador final $I_{\text{Grupo}}$ e $I_{\text{Investigador}}$.*  
> *Para el investigador las variables son análogas, sustituyendo la edad del grupo por su antigüedad académica."*

```bash
# Comando en terminal:
python -X utf8 Taller2_WP-DN-EO.py
```

---

### Escena 5 — Operaciones CRUD, Filtro por Año y Edición (4:10 – 5:30)
**Ejercicios:** 9 (CRUD, categoría y validación), 10 (Filtro por año) y 11 (Edición de cualquier dato)  
**Tiempo:** 1 minuto 20 segundos  
**Habla:** DN  
**Visual:** Khemia Web.  
1. Selector de ventana de tiempo: alternar entre *"Últimos 5 años"* y *"Últimos 2 años"* (**Ej. 10**), procesado en el backend por [`product_filters.py`](../backend/app/repositories/product_filters.py).  
2. Modal de edición de un producto: modificar título, calidad asignada y cambiar estado a `inactive` (**Ej. 9 y 11**).  
3. Mostrar brevemente en terminal que la mutación se apila en la **Pila LIFO de Deshacer** ([`undo_stack.h`](../core_cpp/include/services/undo_stack.h)).

> **[Ejercicio 10 — Filtro por Año]:** *"En Khemia el usuario puede filtrar la producción por ventanas temporales con un solo clic. Al seleccionar los últimos 5 años (2021–2026), la plataforma filtra reactivamente los productos activos; si seleccionamos los últimos 2 años, la vista se recalcula al instante utilizando el año de obtención validado."*
>
> **[Ejercicios 9 y 11 — Operaciones CRUD y Modificación Total]:** *"La aplicación permite editar cualquier atributo de grupos, investigadores y productos. Al abrir la edición de un producto podemos actualizar su tipología, su categoría de calidad validada (`ART_A1`, `B`, etc.) y su estado. Para la **desactivación**, en lugar de borrar físicamente el registro, cambiamos su estado a `inactive`: el producto permanece en la base histórica pero deja de computar en los indicadores analíticos. Además, en el backend de C++, cada modificación se registra en una **Pila LIFO (`UndoStack`)**, permitiendo deshacer cualquier operación previa sin alterar la consistencia de memoria."*

---

### Escena 6 — Estadísticas y Dashboard Khemia (5:30 – 7:00)
**Ejercicio:** 12 (a. Resumen en C, b. Dashboard en Python y Web)  
**Tiempo:** 1 minuto 30 segundos  
**Habla:** EO  
**Visual:**  
1. **Terminal (15 seg):** Ejecutar `pea_cli summary` mostrando la tabla resumen en C++ (**Ej. 12.a**).  
2. **Khemia Web (1 min 15 seg):** Navegar por las sub-pestañas de la sección de Analítica ([`group-analytics-tab.tsx`](../frontend/web-react/src/features/groups/components/tabs/group-analytics-tab.tsx)) (**Ej. 12.b**):  
   - *Resumen:* Histogramas de producción anual ([`production-histogram.tsx`](../frontend/web-react/src/components/charts/production-histogram.tsx)) y donut de familias ([`families-donut.tsx`](../frontend/web-react/src/components/charts/families-donut.tsx)).  
   - *Equipo y red:* Top investigadores ([`group-top-researchers.tsx`](../frontend/web-react/src/components/charts/group-top-researchers.tsx)), formación académica y grafo de red de colaboración ([`group-collaboration-network.tsx`](../frontend/web-react/src/components/charts/collaboration-network/group-collaboration-network.tsx)).  
   - *Comparativa:* Radar multicriterio entre grupos ([`groups-radar-comparison.tsx`](../frontend/web-react/src/components/charts/radar-comparison/groups-radar-comparison.tsx)).

> **[Ejercicio 12.a — Resumen de Datos en C]:** *"Para cumplir el literal 12.a en C++, ejecutamos `pea_cli summary`: la terminal imprime el consolidado numérico con 2 grupos, 166 investigadores, 1.778 productos y su desglose por familias y años."*
>
> **[Ejercicio 12.b — Dashboard Analítico en Python y Web]:** *"Para el literal 12.b, el enunciado solicita un Dashboard con información estadística, histogramas y diagramas de barras inspirado en plataformas como Uniminuto. En Khemia construimos una solución integral:*
> - *En el backend contamos con el script en Python [`pea_dashboard.py`](../scripts/pea_dashboard.py) que genera los gráficos estadísticos.*
> - *Y en la plataforma web desplegamos este Dashboard interactivo de nivel ejecutivo: en la cabecera tenemos los KPIs principales ([`analytics-kit.tsx`](../frontend/web-react/src/components/charts/analytics-kit.tsx)); en la sub-pestaña **Resumen** encontramos el histograma interactivo de producción anual y la distribución por familias; en **Equipo y Red** exploramos el ranking de autores y el grafo interactivo de relaciones; y en **Comparativa** visualizamos el diagrama de radar inter-grupos para contrastar el desempeño de AITICE frente a otros grupos de la universidad."*

```bash
# Comando en terminal:
pea_cli summary
```

---

### Escena 7 — PARCIAL 1: Indicador de Producción del Grupo (7:00 – 8:20)
**Ejercicios:** 5 (Modelo) y PARCIAL 1 ($I_{\text{Grupo}}$)  
**Tiempo:** 1 minuto 20 segundos  
**Habla:** WP  
**Visual:** Terminal ejecutando [`Taller2_WP-DN-EO.py`](../Taller2_WP-DN-EO.py) (sección Grupo) y [`Taller2_WP-DN-EO.cpp`](../Taller2_WP-DN-EO.cpp)  
+ En el navegador: Tarjeta de *«Diagnóstico Minciencias»* ([`minciencias-diagnosis-card.tsx`](../frontend/web-react/src/components/charts/minciencias-diagnosis-card.tsx)) en Khemia Web, contrastando con el análisis formal en [`Explicacion_Calificacion_Global_Compuesta.pdf`](./Explicacion_Calificacion_Global_Compuesta.pdf).

> **[Ejercicio 5 y PARCIAL 1 — Indicador del Grupo de la URL]:** *"Para el primer punto del parcial, calculamos el indicador de producción del grupo de investigación asignado en la URL de GrupLAC utilizando la fórmula oficial de Minciencias 2024, sección 3.10:*
> $$I_{\text{Grupo}} = 3.7 \cdot Nc_{\text{Top}} + 2.3 \cdot Nc_A + 0.4 \cdot Nc_B + 1.5 \cdot AP + 0.5 \cdot DPC + 1.0 \cdot Fr_A + 0.2 \cdot Fr_B + 0.1 \cdot \text{Cohe} + 0.3 \cdot \text{Coop}$$
> *Al filtrar los productos vigentes del grupo del enunciado obtenemos:*
> - *2 productos TOP, 1 Tipo A, 2 Tipo B, 0 de apropiación, 1 de divulgación y 1 de formación avanzada.*
> - *Cohesión interna: $\frac{5}{3} - 1 = 0.667$.*
> - *Cooperación: 2 productos con coautoría.*
>
> *Sustituyendo los valores:*  
> $$3.7(2) + 2.3(1) + 0.4(2) + 1.5(0) + 0.5(1) + 1.0(1) + 0.2(0) + 0.1(0.667) + 0.3(2) = \mathbf{12.667}$$  
> *En pantalla verificamos que tanto el programa en Python como el ejecutable compilado en C++ (`Taller2_WP-DN-EO.exe`) arrojan con exactitud **12.667**, confirmando la paridad total entre ambos lenguajes. Además, en Khemia Web la tarjeta de diagnóstico presenta el análisis normativo completo."*

```bash
# Comandos en terminal:
python -X utf8 Taller2_WP-DN-EO.py
Taller2_WP-DN-EO.exe
```

---

### Escena 8 — PARCIAL 2: Indicador de Producción del Investigador (8:20 – 9:30)
**Ejercicio:** PARCIAL 2 ($I_{\text{Investigador}}$)  
**Tiempo:** 1 minuto 10 segundos  
**Habla:** DN  
**Visual:** Terminal (sección Investigador de [`Taller2_WP-DN-EO.py`](../Taller2_WP-DN-EO.py))  
+ En el navegador: Pestaña de Analítica del Investigador ([`researcher-analytics-tab.tsx`](../frontend/web-react/src/features/researchers/components/tabs/researcher-analytics-tab.tsx)) en Khemia Web mostrando el indicador individual adaptado según [`official_researcher.py`](../backend/app/evaluator/official_researcher.py).

> **[PARCIAL 2 — Indicador del Investigador de la URL]:** *"El segundo punto del parcial solicita calcular el indicador del investigador de la URL utilizando la misma fórmula sobre sus productos personales.  
> Como aclaración metodológica rigurosa, Minciencias en su modelo formal solo norma el indicador a nivel de grupo (§3.10) y a los investigadores los clasifica por categorías; por tanto, para resolver el parcial aplicamos una **adaptación declarada y auditable**: evaluamos el CvLAC personal del docente Juan Pérez, establecemos la cohesión interna en $0$ porque no aplica a una sola persona, y medimos la cooperación mediante los productos que tienen coautores externos.*
>
> *Para sus 4 productos en ventana:*
> - *2 productos TOP, 1 Tipo A, 1 Tipo B, 0 AP, 0 DPC, 1 Fr.A, 0 Fr.B, Cohe = 0 y 2 productos coautorizados.*
>
> *Al sustituir en la ecuación:*  
> $$3.7(2) + 2.3(1) + 0.4(1) + 1.5(0) + 0.5(0) + 1.0(1) + 0.2(0) + 0.1(0) + 0.3(2) = \mathbf{11.700}$$  
> *Nuevamente, la salida de Python y la de C++ coinciden de manera idéntica en **11.700**, y en la plataforma Khemia Web se encuentra integrado en la ficha técnica del investigador."*

---

### Escena 9 — Persistencia y Modos de Arranque (9:30 – 10:15)
**Ejercicios:** NOTA 9 (Persistencia) y NOTA 10 (Cargar datos o modo vacío)  
**Tiempo:** 45 segundos  
**Habla:** EO  
**Visual:** Archivo [`pea_data.json`](../pea_data.json) abierto en el editor de código mostrando su estructura de 12 colecciones  
+ Terminal interactiva ejecutando `load` vs. arranque en modo vacío implementado en [`json_persistence.h`](../core_cpp/include/persistence/json_persistence.h).

> **[NOTAS 9 y 10 — Persistencia y Arranque Dual]:** *"La persistencia completa del sistema se almacena en el archivo [`pea_data.json`](../pea_data.json), el cual consolida 8.898 registros en 12 colecciones estructuradas: grupos, investigadores, membresías, productos, autores, proyectos y planes de trabajo, con soporte write-through sincronizado hacia SQL Server.*  
> *Cumpliendo con la NOTA 10, el sistema permite dos modos de inicialización: al arrancar con carga de archivo (`load pea_data.json`), el sistema instancia en memoria RAM todo el histórico institucional; si se ejecuta en modo vacío (`empty`), el software inicia con los punteros en `NULL`, listo para registrar nuevas entidades desde cero sin dependencias previas."*

---

### Escena 10 — Cierre y Verificación de Entrega (10:15 – 10:45)
**Tiempo:** 30 segundos  
**Habla:** Los tres integrantes en cámara  
**Visual:** Portada final con la lista de los 5 archivos formales de entrega según el enunciado y el borrador de correo [`correo_entrega_parcial2.md`](./correo_entrega_parcial2.md).

> **[WP]:** *"Con esto demostramos el cumplimiento riguroso de cada uno de los doce ejercicios del taller, el indicador del grupo en 12.667 y el del investigador en 11.700."*  
> **[DN]:** *"Hacemos entrega formal de los archivos requeridos: [`Taller2_WP-DN-EO.py`](../Taller2_WP-DN-EO.py), [`Taller2_WP-DN-EO.cpp`](../Taller2_WP-DN-EO.cpp), el documento Word de especificación técnica con diagramas de casos de uso y de secuencia UML ([`Parcial2_WP-DN-EO.docx`](./word/Parcial2_WP-DN-EO.docx)), el archivo de persistencia [`pea_data.json`](../pea_data.json) y el documento de identificación de integrantes ([`INTEGRANTES.txt`](../INTEGRANTES.txt))."*  
> **[EO]:** *"Todo enviado al correo institucional `adithperez@unicesar.edu.co` con el asunto exacto requerido. Muchas gracias por su atención, profesor."*

---

## 3. Resumen de Tiempos y Ensayos

| Bloque | Escenas | Duración Acumulada | Estado |
|---|---|---|---|
| **Apertura e Ingesta con Listas C++** | Escenas 1 y 2 | 0:00 – 1:50 | Calibrado |
| **Khemia Web: Entidades, Catálogo y Variables** | Escenas 3 y 4 | 1:50 – 4:10 | Calibrado |
| **Khemia Web: CRUD, Filtros y Dashboard** | Escenas 5 y 6 | 4:10 – 7:00 | Calibrado |
| **Cálculos Parcial: I_Grupo (12.667) e I_Investigador (11.700)** | Escenas 7 y 8 | 7:00 – 9:30 | Calibrado |
| **Persistencia, Modo Vacío y Cierre Formal** | Escenas 9 y 10 | 9:30 – 10:45 | Calibrado |

**Duración Total Estimada:** **10 minutos con 45 segundos** (Cumple estrictamente con la NOTA 6.i: *"alrededor de 10 minutos"*).
