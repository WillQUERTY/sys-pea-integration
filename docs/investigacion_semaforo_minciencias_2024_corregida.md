# Investigación y especificación funcional del semáforo de categorización de grupos de investigación según el Modelo Minciencias 2024

## Documento técnico para la evolución de Khemia

**Proyecto:** Khemia  
**Institución de referencia:** Universidad Popular del Cesar  
**Marco normativo:** Convocatoria Nacional 957 de 2024  
**Documento oficial principal:** *Modelo de medición de grupos de investigación, desarrollo tecnológico o de innovación y de reconocimiento de investigadores del SNCTI, año 2024*  
**Código:** M601PR04G01  
**Versión:** 02  
**Fecha de elaboración de esta versión:** octubre de 2026

---

## 1. Resumen ejecutivo

El semáforo actual de Khemia constituye una primera aproximación para diagnosticar grupos de investigación a partir de conteos de productos, integrantes, títulos académicos y producción reciente. Sin embargo, el Modelo de Medición de Minciencias 2024 no clasifica los grupos mediante umbrales absolutos uniformes ni mediante una suma simple de productos.

El modelo oficial separa dos procesos:

1. **Reconocimiento del grupo:** comprobación de ocho requisitos mínimos acumulativos.
2. **Clasificación del grupo:** asignación de una categoría C, B, A o A1 mediante indicadores de producción, calidad, apropiación social, formación de recurso humano, composición del grupo, cohesión, estabilidad, permanencia y trayectoria.

Además, la medición utiliza ventanas de observación diferenciadas de cinco, siete y diez años, según el tipo de producto. La clasificación también depende de la posición relativa del grupo dentro de su gran área de conocimiento. Por consiguiente, un simulador institucional puede realizar un diagnóstico sólido y explicable, pero no debe prometer reproducir de manera exacta el resultado oficial cuando no dispone de la totalidad de los datos validados y de las distribuciones nacionales utilizadas por Minciencias.

La recomendación central es sustituir el semáforo plano por un **motor de diagnóstico normativo por capas**, capaz de diferenciar entre:

- requisitos verificados;
- requisitos incumplidos;
- requisitos que no pueden verificarse con los datos disponibles;
- indicadores calculables institucionalmente;
- indicadores que requieren valores nacionales de referencia;
- categoría estimada, nunca presentada como decisión oficial.

---

## 2. Objetivo del documento

Definir una especificación normativa, funcional y técnica para que Khemia evalúe grupos de investigación de manera consistente con el Modelo Minciencias 2024, identifique brechas de información y genere recomendaciones accionables para los grupos de la Universidad Popular del Cesar.

### 2.1 Objetivos específicos

- Describir los requisitos oficiales para el reconocimiento de un grupo.
- Consolidar las condiciones generales de clasificación en C, B, A y A1.
- Documentar las ventanas de observación aplicables a cada tipología.
- Diferenciar títulos académicos, tipologías de integrantes y categorías de investigador.
- Establecer qué información debe almacenar Khemia.
- Proponer una arquitectura de evaluación auditable.
- Evitar falsos positivos causados por conteos planos, datos incompletos o equivalencias no autorizadas.
- Definir una salida comprensible para investigadores, líderes de grupo y administradores institucionales.

---

## 3. Fuentes y alcance

### 3.1 Fuentes principales

1. Minciencias. *Modelo de medición de grupos de investigación, desarrollo tecnológico o de innovación y de reconocimiento de investigadores del SNCTI, año 2024*, código M601PR04G01, versión 02.
2. Minciencias. *Convocatoria Nacional 957 de 2024*.
3. Tablas de tipologías, requisitos de existencia, calidad, clasificación y pesos contenidas en el Anexo 1 del modelo.

### 3.2 Enlaces oficiales

- [Modelo de Medición de Grupos 2024](https://minciencias.gov.co/sites/default/files/upload/convocatoria/m601pr04g01_modelo_medicion_grupos_investigacion_tecnologica_o_innovacion_y_reconocimiento_investigadores_-_2024_1.pdf)
- [Página oficial de la Convocatoria 957](https://minciencias.gov.co/convocatorias/investigacion/convocatoria-nacional-actualizacion-y-transicion-para-el-reconocimiento)
- [Página de modelos de medición de grupos](https://minciencias.gov.co/sistemas-informacion/modelo-medicion-grupos)

### 3.3 Alcance de esta especificación

Este documento define la lógica funcional del diagnóstico. No reemplaza el resultado oficial de Minciencias, no certifica productos y no autoriza a Khemia a presentar una categoría estimada como categoría reconocida oficialmente.

---

## 4. Principios de diseño del evaluador

### 4.1 Trazabilidad

Toda regla debe indicar:

- fuente normativa;
- dato utilizado;
- fecha de corte;
- resultado;
- evidencia disponible;
- razón de incumplimiento o imposibilidad de verificación.

### 4.2 Separación de procesos

El motor debe separar claramente:

- reconocimiento;
- clasificación;
- perfil de producción;
- recomendaciones de mejoramiento.

Un grupo no debe avanzar a una categoría estimada si no supera primero los requisitos de reconocimiento, salvo que la interfaz muestre un escenario hipotético claramente rotulado.

### 4.3 No inferencia

Khemia no debe inferir automáticamente que:

- una afiliación a la UPC equivale a aval vigente en InstituLAC;
- un doctorado equivale a categoría Sénior o Asociado;
- cualquier proyecto se encuentra en ejecución;
- cualquier tesis registrada es una tesis finalizada y aprobada;
- cualquier producto registrado cumple los requisitos de existencia y calidad;
- cualquier coautoría equivale al indicador oficial de cohesión;
- fallar una categoría superior concede automáticamente una categoría inferior.

### 4.4 Estados de evaluación

Cada requisito debe retornar uno de estos estados:

- **CUMPLE:** existe evidencia suficiente y válida.
- **NO CUMPLE:** la evidencia disponible demuestra incumplimiento.
- **NO VERIFICABLE:** faltan datos o soportes necesarios.
- **NO APLICA:** la regla no corresponde al escenario evaluado.

El estado **NO VERIFICABLE** no debe transformarse en **CUMPLE**.

---

## 5. Fase I: reconocimiento del grupo

Minciencias reconoce un grupo cuando cumple simultáneamente ocho requisitos mínimos.

### 5.1 Matriz de reconocimiento

| N.º | Requisito | Condición | Evidencia mínima esperada en Khemia |
|---:|---|---|---|
| 1 | Registro | Estar registrado en GrupLAC | Identificador o enlace verificable del GrupLAC |
| 2 | Integrantes | Tener mínimo dos integrantes | Integrantes vinculados y aceptados en el grupo |
| 3 | Antigüedad | Tener uno o más años de existencia declarada | Fecha de formación o creación declarada |
| 4 | Aval institucional | Estar avalado por al menos una institución registrada en InstituLAC | Institución avaladora, estado del aval y evidencia |
| 5 | Proyecto activo | Tener al menos un proyecto de investigación, desarrollo tecnológico o innovación en ejecución | Tipo, estado, fecha y vinculación al grupo |
| 6 | Formación del líder | El líder debe tener pregrado universitario, maestría o doctorado | Rol de líder, título y fecha de obtención |
| 7 | Producción GNC/DTI | Producción en ventana equivalente a mínimo un producto por cada año declarado de existencia | Productos válidos de GNC o DTI dentro de su ventana |
| 8 | Producción ASC/DPC/FRH | Producción en ventana equivalente a mínimo un producto por cada año declarado de existencia | Productos válidos de ASC, DPC o FRH dentro de su ventana |

### 5.2 Reglas de implementación

#### 5.2.1 Registro en GrupLAC

No basta con que el nombre del grupo aparezca en una base institucional. Debe conservarse el identificador con el cual se asocia al registro de GrupLAC.

#### 5.2.2 Número de integrantes

El conteo debe excluir registros duplicados y personas cuya vinculación no esté aceptada o no corresponda al periodo evaluado.

#### 5.2.3 Edad del grupo

La edad debe calcularse con la fecha oficial de formación declarada y la fecha de cierre de la ventana aplicable a la convocatoria. La fecha de creación de un registro interno de Khemia no sustituye la fecha declarada en GrupLAC.

#### 5.2.4 Aval institucional

El aval debe almacenarse como un dato independiente de la afiliación. Si la fuente no permite comprobarlo, el resultado será **NO VERIFICABLE**.

#### 5.2.5 Proyecto en ejecución

El evaluador debe confirmar simultáneamente:

- que el registro corresponde a un proyecto admitido por el modelo;
- que está vinculado al grupo;
- que su estado es “en ejecución” en la fecha de corte.

Contar proyectos históricos, propuestas o proyectos terminados no satisface necesariamente este requisito.

#### 5.2.6 Formación del líder

La regla se aplica al líder del grupo, no al integrante con mayor nivel académico. Cuando el líder solo posea pregrado, debe validarse también la fecha exigida por el modelo.

#### 5.2.7 Pisos anualizados de producción

Se calculan dos bloques independientes:

```text
Bloque 1 = productos válidos de GNC + productos válidos de DTI
Bloque 2 = productos válidos de ASC + productos válidos de DPC + productos válidos de FRH
```

Cada bloque debe alcanzar como mínimo el número de años declarados de existencia del grupo, considerando únicamente productos que cumplan las reglas de existencia, vinculación y ventana.

#### 5.2.8 Ejemplo

Para un grupo con cuatro años declarados:

```text
Mínimo del bloque GNC/DTI: 4 productos válidos
Mínimo del bloque ASC/DPC/FRH: 4 productos válidos
```

Alcanzar ocho productos en un solo bloque no compensa el incumplimiento del otro.

---

## 6. Fase II: clasificación de grupos

Una vez reconocido, el grupo puede ser clasificado en C, B, A o A1. Las condiciones son acumulativas dentro de cada categoría: no basta con cumplir el indicador de grupo si se incumplen los demás requisitos.

### 6.1 Matriz consolidada de condiciones oficiales (Sección 3.14)

La siguiente tabla sintetiza los **requisitos habilitantes obligatorios** taxativos establecidos en el modelo oficial Minciencias 2024 (Código M601PR04G01 Versión 02, págs. 128-130):

| Criterio Obligatorio (Sección 3.14) | Categoría C | Categoría B | Categoría A | Categoría A1 |
|---|---|---|---|---|
| **Indicador de Grupo ($I_{Grupo}$)** | Mayor que cero ($I_{Grupo} > 0$) | Cuartil 3, 75 % superior ($I_{Grupo} \ge Q3$) | Cuartil 2, 50 % superior ($I_{Grupo} \ge Q2$) | Cuartil 1, 25 % superior ($I_{Grupo} \in Q1$) |
| **Calidad de Producción (GNC/DTI)** | Indicador TOP o Tipo A mayor que cero | Indicador TOP o Tipo A mayor que cero | Indicador TOP o Tipo A mayor que cero | **Indicador de productos Tipo TOP en Cuartil 1 ($I_{TOP} \in Q1$)**; no se sustituye por Tipo A |
| **Apropiación Social o Divulgación** | Indicador ASC > 0 **ó** DPC > 0 | Indicador ASC > 0 **ó** DPC > 0 | Indicador ASC > 0 **ó** DPC > 0 | Indicador ASC > 0 **ó** DPC > 0 |
| **Formación de Recurso Humano (FRH)** | Tipo A > 0 **ó** Tipo B > 0 | Tipo A > 0 **ó** Tipo B $\ge Q2$ (50 % superior) | **Tipo A mayor que cero ($I_{FRH\text{-}A} > 0$)** | **Tipo A mayor que cero ($I_{FRH\text{-}A} > 0$)** |
| **Tipología y Escalafón de Integrantes** | Sin exigencia de escalafón específico | Al menos un Investigador **Emérito, Sénior, Asociado, Junior** O integrante con **Doctorado** (con contrato SNCTI y residencia en Colombia) | Al menos un Investigador **Emérito, Sénior o Asociado** (con contrato SNCTI y residencia en Colombia) | Al menos un Investigador **Emérito, Sénior o Asociado** (con contrato SNCTI y residencia en Colombia) |
| **Indicador de Cohesión ($I_C$)** | No aplica | **Mayor que cero ($I_C > 0$)** (coautoría interna obligatoria) | **Mayor que cero ($I_C > 0$)** (coautoría interna obligatoria) | **Mayor que cero ($I_C > 0$)** (coautoría interna obligatoria) |
| **Existencia mínima (Edad del grupo)** | **Al menos 2 años** | **Al menos 3 años** | **Al menos 5 años** | **Al menos 5 años** |

> [!NOTE]
> **Homologación de FRH Tipo A (Nota al pie de las secciones 3.14.1 y 3.14.2):**  
> Para grupos que **no pertenezcan al sector universitario** (centros de desarrollo tecnológico independientes, empresas o institutos), Minciencias homologa el requisito de Formación Tipo A con: productos Tipo TOP, patente A (obtenida), variedad vegetal o animal, o cinco (5) artículos Tipo TOP en la ventana de 5 años.  
> **Para la Universidad Popular del Cesar (sector universitario), la dirección de tesis doctoral aprobada ($I_{FRH\text{-}A} > 0$) es ineludible y obligatoria** para clasificar en Categoría A o A1.

---

### 6.1.1 Indicadores complementarios del perfil del grupo (Informativos)

En el Modelo Minciencias 2024, los siguientes indicadores están catalogados explícitamente en el documento normativo como **INFORMATIVOS** (Secciones 3.11, 3.12 y 3.13) y se reflejan en el *Perfil de Trayectoria, Permanencia y Estabilidad* (Anexo 2, sección 5.1.3). **No constituyen puntos de corte eliminatorios para clasificar en las categorías 3.14**, pero sirven a la institución como métricas de madurez investigativa:

| Indicador Informativo | Definición Metodológica | Umbrales de Monitoreo / Referencia Histórica | Rol en Khemia |
|---|---|---|---|
| **Estabilidad de la producción ($I_{EProd}$)** | Máximo tiempo transcurrido en meses entre dos productos consecutivos de nuevo conocimiento en una ventana de 10 años: $I_{EProd} = \max(\Delta_i)$. | Referencia deseable: $\le 12$ meses (A1), $\le 18$ meses (A), $\le 24$ meses (B). | **Métrica de diagnóstico:** alerta sobre baches prolongados de inactividad investigativa. No descalifica automáticamente si el grupo cumple los 7 requisitos de la Sección 3.14. |
| **Permanencia de investigadores ($I_{PInv}$)** | Razón entre el tiempo total de permanencia acumulada en meses de los investigadores y el tiempo transcurrido desde su primera vinculación: $I_{PInv} = \frac{\sum TP_i}{\sum TT_i}$. | Referencia deseable: $\ge 0,5$. | **Métrica de gobernanza:** evalúa si el núcleo de investigadores del colectivo es estable o volátil en el tiempo. |
| **Trayectoria ($I_T$)** | Parámetro ordinal $\theta_i$ obtenido mediante modelo logístico sobre el comportamiento histórico del grupo en las últimas 5 convocatorias. | Referencia histórica: $\ge 1$ (A1), $\ge 0,7$ (A), $> 0$ (B), $\ge -0,7$ (C). | **Métrica de prospección:** predice la probabilidad de mantener o escalar categoría en convocatorias sucesivas. |

> **Nota de interpretación:** los cuartiles ($Q1, Q2, Q3$) son posiciones relativas calculadas **por Gran Área de Conocimiento OCDE**. No deben reemplazarse por umbrales absolutos idénticos para todas las disciplinas.

### 6.2 Evaluación descendente

Khemia debe evaluar desde la categoría más alta hacia la más baja:

```text
A1 -> A -> B -> C -> reconocido sin categoría
```

La categoría estimada será la primera para la cual se cumplan todas las condiciones verificables. Si una condición indispensable permanece en estado **NO VERIFICABLE**, el sistema no debe asegurar la categoría. Debe mostrarla como escenario condicionado.

### 6.3 Prohibición de “degradación automática”

El incumplimiento de A1 no concede A; el incumplimiento de A no concede B. Cada categoría tiene condiciones propias. Por ejemplo, un grupo sin formación de recurso humano Tipo A no puede clasificarse en A o A1, pero solo podrá quedar en B si cumple todos los requisitos de B (incluyendo antigüedad $\ge 3$ años e $I_{Grupo} \ge Q3$).

---

## 7. Ventanas de observación

Las ventanas se aplican por subtipo de producto, no mediante una regla única de cinco años.

### 7.1 Generación de nuevo conocimiento

| Subtipo | Ventana |
|---|---:|
| Artículos A1, A2, B y C | 7 años |
| Artículos D | 5 años |
| Notas científicas | 5 años |
| Libros resultado de investigación | 7 años |
| Capítulos en libro resultado de investigación | 5 años |
| Productos tecnológicos patentados o en solicitud | 10 años |
| Variedades vegetales, nuevas razas animales y poblaciones mejoradas | 10 años |
| Productos de creación o investigación-creación | 10 años |

### 7.2 Desarrollo tecnológico e innovación

| Subtipo | Ventana |
|---|---:|
| Productos tecnológicos certificados o validados | 5 años |
| Productos empresariales | 5 años |
| Regulaciones, normas, reglamentos o legislaciones | 5 años |
| Conceptos técnicos | 5 años |
| Acuerdos de licencia para obras de investigación-creación | 5 años |

### 7.3 Apropiación, divulgación y formación

| Familia o subtipo | Ventana |
|---|---:|
| Procesos de apropiación social del conocimiento | 5 años |
| Circulación de conocimiento especializado | 5 años |
| Divulgación pública de la CTeI | 5 años |
| Producción bibliográfica de divulgación | 5 años |
| Direcciones de tesis doctorales | 5 años |
| Direcciones de trabajos de maestría | 5 años |
| Direcciones de trabajos de pregrado | 5 años |
| Proyectos de investigación con formación | 5 años |
| Proyectos de extensión y responsabilidad social en CTeI | 5 años |
| Apoyo a programas y cursos de formación | 5 años |
| Acompañamientos y asesorías del Programa Ondas | 5 años |

### 7.4 Regla especial para investigación-creación

Para determinar la inclusión de una obra en la ventana debe utilizarse la fecha definida por el modelo para su presentación o validación en el espacio correspondiente, no asumir automáticamente que la fecha de creación del archivo u obra es la fecha válida.

### 7.5 Clasificación oficial de productos por Clases de Medición (Sección 3.7)

El modelo agrupa los productos de investigación e innovación en clases según su visibilidad, impacto y nivel de exigencia, de acuerdo con el catálogo canónico [database/catalog_2024.json](file:///c:/repos/sys_pea_integration/database/catalog_2024.json):

#### 7.5.1 Productos Tipo TOP (Sección 3.7.1)
Constituyen la producción científica y tecnológica de máxima distinción internacional y alto impacto:
- **Artículos de investigación científica Calidad A1 y A2:** tanto en revistas de acceso abierto (`ART_OPEN_A1`, `ART_OPEN_A2`) como de suscripción tradicional (`ART_A1`, `ART_A2`), indexadas en el cuartil 1 (Q1) y cuartil 2 (Q2) de JCR (WoS) o SJR (Scopus).
- **Libros resultado de investigación Calidad A1 y A:** en primer cuartil (`LIB_A1`) y segundo cuartil (`LIB_A`) de citaciones.
- **Capítulos en libro resultado de investigación Calidad A1 y A:** `CAP_LIB_A1` y `CAP_LIB_A`.
- **Patentes de invención concedidas de alta transferencia:** obtenidas vía PCT o vía tradicional, con producto en mercado o contrato de explotación (`PA1`, `PA2`).
- **Patentes de modelo de utilidad concedidas de alta transferencia:** obtenidas vía PCT o tradicional con producto o contrato (`MA1`, `MA2`).
- **Variedades vegetales y razas animales de punta:** `VV_A1`, `VV_A2` y nuevas razas animales `VA_A`.
- **Obras de investigación-creación con máxima distinción:** en artes, arquitectura y diseño con calidad A1 y A (`AAD_A1`, `AAD_A`).
- **Regulaciones, normas o leyes Calidad A:** `RNL_A`.

#### 7.5.2 Productos Tipo A (Sección 3.7.2)
- **Artículos de investigación científica Calidad B y C:** tanto de acceso abierto (`ART_OPEN_B`, `ART_OPEN_C`) como tradicional (`ART_B`, `ART_C`), correspondientes a cuartiles Q3 y Q4 de JCR/SJR o categorías B y C de Publindex.
- **Libros y capítulos de libro Calidad B:** `LIB_B` y `CAP_LIB_B`.
- **Patentes de invención concedidas sin explotación:** obtenidas vía PCT o tradicional sin producto ni contrato (`PA3`, `PA4`).
- **Patentes de modelo de utilidad concedidas sin explotación:** `MA3`, `MA4`.
- **Variedades vegetales y poblaciones pecuarias:** `VV_A3`, `VV_A4` y `VA_B`.
- **Obras de investigación-creación Calidad B:** `AAD_B`.
- **Propiedad industrial y desarrollos tecnológicos certificados:** diseños industriales (`DI_A`), esquemas de circuito integrado (`ECI`), software con registro de soporte lógico y certificación de uso (`SF`), plantas piloto (`PP`), prototipos industriales (`PI`), signos distintivos (`SD`), productos nutracéuticos (`PN`), colecciones científicas (`CC`), nuevos registros científicos (`NRC_A`), secretos empresariales (`SE`), empresas de base tecnológica (`EBT_A`), empresas culturales (`ICC_A`), innovaciones de gestión (`IG_A1`, `IG_A2`) y normatividades técnicas (`RNL_B`, `RNR`).

#### 7.5.3 Productos Tipo B (Sección 3.7.3)
- **Artículos de investigación Calidad D:** `ART_OPEN_D` y `ART_D`.
- **Notas científicas:** en todas sus calidades (`N_A1`, `N_A2`, `N_B`, `N_C`, `N_D`).
- **Libros y capítulos de libro Calidad C:** `LIB_C` y `CAP_LIB_C`.
- **Libros de formación en cuartil 1:** `LIB_FOR1`.
- **Patentes y modelos de utilidad solicitados con concepto favorable:** solicitudes en trámite con informes técnicos favorables (`PB1` a `PB5`, `PC`, `MB1` a `MB4`, `MC`).

#### 7.5.4 Formación de Recurso Humano Tipo A (FRH-A — Sección 3.7.6)
Productos orientados estrictamente al nivel de **Doctorado**:
- **Direcciones de tesis de doctorado:** aprobadas y finalizadas con calidad A o B (`TD_A`, `TD_B`).
- **Apoyos a la creación de programas y cursos doctorales:** `AP_A` y `AP_C`.

#### 7.5.5 Formación de Recurso Humano Tipo B (FRH-B — Sección 3.7.7)
Productos de formación en niveles de **Maestría y Pregrado**, así como proyectos con componente formativo:
- **Direcciones de trabajos de maestría:** aprobados (`TM_A`, `TM_B`).
- **Direcciones de trabajos de grado de pregrado:** aprobados (`TP_A`, `TP_B`).
- **Proyectos con talento humano en formación:** proyectos de investigación y desarrollo (`PID_A`, `PID_B`, `PID_C`), investigación-creación (`PIC_A`, `PIC_B`, `PIC_C`), y proyectos ID+I con formación (`PF_A`, `PF_B`).
- **Extensión, responsabilidad social y semilleros:** proyectos de extensión (`PE`), apoyo a programas de maestría (`AP_B`, `AP_D`) y asesorías de proyectos del Programa Ondas.

---

## 8. Validación de productos

Un producto no debe puntuarse solo porque aparece registrado. El proceso debe tener cuatro filtros:

1. **Existencia:** contiene los campos y soportes obligatorios.
2. **Vinculación:** está correctamente vinculado al integrante y al grupo.
3. **Ventana:** su fecha válida se encuentra dentro del periodo aplicable.
4. **Calidad:** satisface los criterios del subtipo y categoría declarados.

### 8.1 Resultado técnico sugerido

Cada producto debe producir un objeto de evaluación como este:

```json
{
  "product_id": "identificador",
  "family": "GNC",
  "subtype": "ART_A1",
  "existence_status": "CUMPLE",
  "linkage_status": "CUMPLE",
  "window_status": "CUMPLE",
  "quality_status": "NO_VERIFICABLE",
  "eligible_for_measurement": false,
  "evidence": [],
  "warnings": []
}
```

El campo `eligible_for_measurement` debe ser verdadero únicamente cuando se superen los filtros requeridos.

---

## 9. Integrantes y categorías de investigador

Khemia debe separar:

- nivel académico;
- tipo de integrante en el grupo;
- categoría de investigador reconocida por Minciencias;
- periodo de vinculación;
- vigencia de la categoría;
- relación contractual o institucional cuando la regla la exija.

### 9.1 Error que debe evitarse

La siguiente equivalencia es inválida:

```text
Tiene doctorado = Investigador Sénior
```

La categoría Sénior depende de condiciones adicionales de producción y formación. De igual manera, una persona con doctorado puede figurar como integrante vinculado con doctorado sin ser Sénior, Asociado o Junior.

### 9.2 Campos mínimos sugeridos

```text
person_id
full_name
academic_level
academic_degree_date
member_type
researcher_category
category_valid_from
category_valid_to
group_role
link_start_date
link_end_date
institutional_link
```

---

## 10. Formulación matemática de los indicadores del modelo

El Modelo Minciencias 2024 no evalúa volúmenes brutos. Aplica transformaciones matemáticas rigurosas (escala logarítmica, ponderación por pesos globales, razones de coautoría y normalización relativa por Gran Área OCDE) descritas en las Secciones 3.5 a 3.13 del documento oficial.

### 10.1 Eliminación de efectos de escala: Escala logarítmica $\lambda$ (Sección 3.5)

Para evitar que grupos masivos con decenas de integrantes superen injustificadamente a grupos compactos de alta productividad científica, cada subtipo de producto se normaliza mediante la tasa logarítmica anualizada:

$$\lambda_{Subtipo} \equiv \ln \left( \frac{\text{Número de productos válidos en el subtipo}}{\min(\text{Edad del Grupo}, \text{Ventana del Subtipo})} + 1 \right)$$

Donde:
- `Número de productos válidos en el subtipo`: obras que superaron simultáneamente los filtros de existencia, vinculación, ventana temporal diferenciada y calidad.
- `Edad del Grupo`: años transcurridos desde la fecha de fundación declarada hasta el corte de la convocatoria.
- `Ventana del Subtipo`: 10, 7 ó 5 años según la Tabla 5 del modelo (Sección 7 del presente documento).

### 10.2 Indicadores de producción por clase y pesos globales (Secciones 3.6 y 3.8.1)

Cada clase de producto ($TOP$, $A$, $B$, $AP$, $DPC$, $FRH\text{-}A$, $FRH\text{-}B$) suma la tasa logarítmica de sus subtipos componentes ponderada por el **Peso Global Oficial** (Tabla 6 del modelo):

$$Ind_{Clase} = \sum_{Subtipo \in Clase} \lambda_{Subtipo} \times PesoGlobal_{Subtipo}$$

#### Resumen de Pesos Globales de Referencia (Tabla 6):
* **Patentes concedidas con explotación (PA1, MA1):** $500$ puntos.
* **Libros de investigación A1 y Variedades vegetales A1 (LIB_A1, VV_A1):** $300$ puntos.
* **Artículos de investigación A1 Open Access (ART_OPEN_A1):** $100$ puntos ($95$ si no es de acceso abierto).
* **Obras de investigación-creación A1 (AAD_A1):** $100$ puntos.
* **Capítulos en libro de investigación A1 (CAP_LIB_A1):** $60$ puntos.
* **Software registrado y validado (SF), Diseños industriales (DI_A), Prototipos (PI):** $35$ puntos.
* **Libros de investigación Calidad C (LIB_C):** $15$ puntos.
* **Artículos de investigación Calidad D Open Access (ART_OPEN_D):** $5$ puntos ($9$ y $10$ puntos de peso relativo en su serie).

### 10.3 Indicador de Cohesión ($I_C$ — Secciones 2.2.10.1 y 3.8.2)

Permite evidenciar la colaboración a nivel interno de los integrantes del colectivo en obras de Nuevo Conocimiento y Desarrollo Tecnológico e Innovación:

$$I_C = \frac{\sum_{p \in \text{Obras GNC+DTI en ventana}} \text{Autores vinculados al grupo en el producto } p}{\text{Total de obras de GNC y DTI en ventana}} - 1$$

* **Interpretación:** un valor $I_C = 0$ significa que en promedio cada producto fue elaborado por solo 1 autor del grupo (trabajo aislado). Un valor $I_C = 0,5$ indica que, en promedio, cada producto involucra 1,5 integrantes del grupo.
* **Regla habilitante:** para clasificar en **Categorías B, A y A1**, el grupo **DEBE tener $I_C > 0$ obligatoriamente**. Si no hay coautoría interna demostrable, el grupo queda bloqueado en categorías superiores.

### 10.4 Indicador de Cooperación ($I_{Coop}$ — Secciones 2.2.10.2 y 3.8.3)

Mide la vinculación y coautoría del grupo con otros colectivos del SNCTI o internacionales:

$$I_{Coop} = \frac{\sum_{p \in \text{Obras GNC+DTI en ventana}} \text{Grupos relacionados en el producto } p}{\text{Total de obras de GNC y DTI en ventana}} - 1$$

Donde “Grupos relacionados” corresponde al número de grupos de investigación distintos donde están vinculados los autores firmantes del producto.

### 10.5 Índices relativos normalizados por Gran Área OCDE (Sección 3.9)

Cada indicador absoluto se convierte en un índice dimensional relativo dividiéndolo por el valor máximo alcanzado entre todos los grupos evaluados de la misma Gran Área del Conocimiento OCDE:

$$\text{Índice}_{Variable} = \frac{Ind_{Variable}}{\max(Ind_{Variable, \text{Gran Área OCDE}})}$$

Este escalamiento se efectúa para los 7 indicadores de producción ($Nc.Top, Nc.A, Nc.B, AP, DPC, Fr.A, Fr.B$), así como para Cohesión ($Cohe$) y Cooperación ($Coop$).

### 10.6 Ecuación Maestra: Indicador de Grupo ($I_{Grupo}$ — Sección 3.10)

El valor sintético global con el que se ordenan los grupos y se determinan los cuartiles $Q1, Q2, Q3$ es la combinación lineal oficial:

$$I_{Grupo} \equiv 3,7 \cdot Nc.Top + 2,3 \cdot Nc.A + 0,4 \cdot Nc.B + 1,5 \cdot AP + 0,5 \cdot DPC + 1,0 \cdot Fr.A + 0,2 \cdot Fr.B + 0,1 \cdot Cohe + 0,3 \cdot Coop$$

#### Factores de Ponderación Oficiales:
* **$Nc.Top$ (Índice Tipo TOP):** factor de ponderación **$3,7$** (máxima prioridad de la política científica nacional).
* **$Nc.A$ (Índice Tipo A):** factor **$2,3$**.
* **$AP$ (Índice Apropiación Social):** factor **$1,5$** (fuerte estímulo a la transferencia social).
* **$Fr.A$ (Índice Formación Doctoral):** factor **$1,0$**.
* **$DPC$ (Índice Divulgación Pública):** factor **$0,5$**.
* **$Nc.B$ (Índice Tipo B):** factor **$0,4$**.
* **$Coop$ (Índice Cooperación Intergrupos):** factor **$0,3$**.
* **$Fr.B$ (Índice Formación Maestría/Pregrado):** factor **$0,2$**.
* **$Cohe$ (Índice Cohesión Interna):** factor **$0,1$**.

### 10.7 Indicadores Informativos de Perfil (Secciones 3.11 a 3.13)

No alteran el cálculo del $I_{Grupo}$ ni constituyen umbrales de descalificación en la Sección 3.14, pero forman parte del perfil diagnóstico:

1. **Indicador de Trayectoria ($I_T$):**  
   Estimador $\theta_i$ obtenido mediante modelo logístico ordenado ordinal sobre el desempeño del grupo en las últimas 5 convocatorias nacionales:  
   $$\ln \left[ \frac{P_{ijk}}{P_{ij(k-1)}} \right] = \theta_i - \beta_{jk}$$
2. **Indicador de Permanencia de Investigadores ($I_{PInv}$):**  
   $$I_{PInv} = \frac{\sum TP_i}{\sum TT_i}$$  
   Donde $TP_i$ es el tiempo de permanencia en meses del investigador $i$, y $TT_i$ el tiempo transcurrido desde su primera vinculación al grupo.
3. **Indicador de Estabilidad de la Producción ($I_{EProd}$):**  
   $$I_{EProd} = \max(\Delta_i)$$  
   Donde $\Delta_i$ representa el intervalo en meses entre productos cronológicos sucesivos de GNC en los últimos 10 años. Identifica brechas temporales críticas de inactividad investigativa.

### 10.8 Manejo de cuartiles en Khemia: Distribución institucional vs nacional

Dado que Khemia opera sobre la base de datos de la Universidad Popular del Cesar y no dispone del censo total de los más de 6.000 grupos de Colombia:
- Khemia debe calcular el $I_{Grupo}$ numérico exacto aplicando las ponderaciones oficiales.
- Para estimar la posición del grupo, debe calcular un **percentil de referencia institucional** dentro de los grupos de la misma área OCDE de la UPC.
- La interfaz debe rotular claramente el cuartil como **"Percentil Institucional Estimado"** y advertir que el cuartil oficial definitivo depende de la distribución nacional que Minciencias consolide al cierre de la Convocatoria.

---

## 11. Diagnóstico del evaluador actual de Khemia

| Dimensión | Riesgo del enfoque simplificado | Corrección requerida |
|---|---|---|
| Reconocimiento | Un único producto puede marcar al grupo como apto | Aplicar los dos pisos anualizados independientes |
| Proyecto | Contar proyectos sin verificar estado | Exigir proyecto admisible en ejecución |
| Aval | Inferirlo por afiliación a la UPC | Verificar el aval o marcarlo como no verificable |
| Líder | Usar títulos de cualquier integrante | Identificar al líder y validar su formación y fecha |
| Ventanas | Aplicar cinco años a todo | Aplicar ventanas de 5, 7 y 10 años por subtipo |
| Calidad | Contar todos los productos por igual | Validar existencia, calidad y clase TOP/A/B |
| FRH | Sumar pregrado, maestría y doctorado sin distinción | Separar FRH Tipo A y Tipo B según catálogo oficial |
| Integrantes | Inferir categoría por título académico | Usar la categoría reconocida y su vigencia |
| Cohesión | Mostrarla solo en un grafo | Calcularla y usarla en B, A y A1 |
| Área | Aplicar umbrales absolutos | Comparar dentro de la gran área correspondiente |
| Resultado | Prometer categoría exacta | Entregar categoría estimada y nivel de confianza documental |

---

## 12. Arquitectura propuesta

### 12.1 Capa de ingesta

Responsable de obtener y versionar:

- información del grupo;
- integrantes;
- avales;
- proyectos;
- productos;
- soportes;
- categorías de investigadores;
- áreas de conocimiento.

### 12.2 Capa de normalización

Responsable de:

- eliminar duplicados técnicos;
- homologar fechas;
- mapear códigos de producto;
- separar familias y subtipos;
- identificar versiones de catálogo;
- conservar el dato original para auditoría.

### 12.3 Capa de validación

Incluye validadores independientes para:

- grupo;
- integrante;
- proyecto;
- producto;
- ventana;
- calidad;
- evidencia.

### 12.4 Capa de indicadores

Calcula:

- indicadores por tipología;
- cohesión;
- cooperación;
- estabilidad;
- permanencia;
- trayectoria;
- indicador de grupo;
- percentiles o cuartiles cuando existan referencias suficientes.

### 12.5 Capa de reglas

Evalúa:

1. reconocimiento;
2. A1;
3. A;
4. B;
5. C;
6. reconocido sin categoría;
7. no reconocido.

### 12.6 Capa de explicación

Debe producir mensajes como:

```text
Categoría A no demostrable.
Razón: no se encontró un producto de Formación de Recurso Humano Tipo A válido dentro de la ventana.
Dato requerido: dirección o codirección de tesis doctoral finalizada, con soporte y vinculación válida.
Impacto: la condición es obligatoria para A y A1.
```

---

## 13. Diseño del semáforo

### 13.1 Semáforo de reconocimiento

- **Verde:** los ocho requisitos están verificados.
- **Rojo:** al menos un requisito está incumplido.
- **Gris:** no hay datos suficientes para decidir.
- **Amarillo:** puede utilizarse como resumen cuando no hay incumplimientos confirmados, pero sí requisitos no verificables.

### 13.2 Semáforo por categoría

Cada categoría debe mostrar:

- condiciones cumplidas;
- condiciones incumplidas;
- condiciones no verificables;
- categoría máxima demostrable;
- categoría potencial condicionada;
- acciones prioritarias.

### 13.3 Ejemplo de salida

```text
Reconocimiento: CUMPLE 7 de 8; 1 NO VERIFICABLE
Categoría máxima demostrable: C
Categoría potencial: B
Bloqueo principal: indicador de cohesión no calculable por falta de autoría normalizada
Segundo bloqueo: categoría vigente de investigadores no disponible
```

---

## 14. Modelo de datos mínimo

### 14.1 Grupo

```text
group_id
gruplac_id
name
formation_date
declared_age
main_oecd_area
secondary_oecd_area
leader_person_id
recognition_status
official_category
category_validity
```

### 14.2 Aval

```text
endorsement_id
group_id
institution_id
institulac_id
status
valid_from
valid_to
evidence_source
```

### 14.3 Proyecto

```text
project_id
group_id
project_type
status
start_date
end_date
principal_investigator
support_reference
```

### 14.4 Producto

```text
product_id
official_code
family
subtype
measurement_class
quality_category
valid_date
observation_window_years
existence_valid
quality_valid
linkage_valid
support_reference
```

### 14.5 Autoría y vinculación

```text
product_id
person_id
group_id
author_role
linked_to_group
linkage_period_valid
```

### 14.6 Ejecución del diagnóstico

```text
evaluation_id
group_id
model_version
cutoff_date
data_snapshot_id
recognition_result
estimated_category
confidence_level
created_at
```

---

## 15. Algoritmo funcional

```text
1. Cargar una instantánea inmutable de los datos del grupo.
2. Validar identificadores, fechas y duplicados.
3. Verificar los ocho requisitos de reconocimiento.
4. Si existe incumplimiento, retornar “No reconocido” y explicar las brechas.
5. Si faltan datos, retornar “Reconocimiento no concluyente”.
6. Clasificar los productos por código, familia, calidad y clase de medición.
7. Aplicar la ventana correcta a cada subtipo.
8. Excluir productos que no superen existencia, vinculación, ventana o calidad.
9. Calcular indicadores de producción.
10. Calcular cohesión, cooperación, estabilidad, permanencia y trayectoria.
11. Calcular el indicador de grupo y su comparación de área cuando existan referencias.
12. Evaluar A1, A, B y C en orden descendente.
13. Separar categoría demostrable de categoría potencial.
14. Generar explicación, evidencias y recomendaciones.
15. Guardar versión del modelo, fecha de corte y trazabilidad del cálculo.
```

---

## 16. Reglas de negocio prioritarias

### RN-01. Reconocimiento acumulativo

Los ocho requisitos son obligatorios. No existe compensación mediante puntaje.

### RN-02. Doble piso productivo

Los bloques GNC/DTI y ASC/DPC/FRH se verifican separadamente.

### RN-03. Ventana por subtipo

Cada producto utiliza la ventana asignada en el modelo.

### RN-04. Evidencia antes de puntuación

Un producto no aporta al cálculo si no supera los filtros requeridos.

### RN-05. Categoría de investigador no inferida

La categoría Minciencias debe provenir de un dato explícito y vigente.

### RN-06. Cuartil condicionado al área

No se asigna Q1, Q2 o Q3 sin una distribución de referencia compatible con la gran área.

### RN-07. Evaluación independiente por categoría

El fallo en una categoría superior no otorga automáticamente la inmediatamente inferior.

### RN-08. Resultado orientativo

La interfaz debe usar expresiones como “diagnóstico”, “categoría estimada” o “escenario potencial”.

### RN-09. No verificable no significa cumple

La ausencia de datos debe permanecer visible.

### RN-10. Reproducibilidad

El mismo conjunto de datos, versión del modelo y fecha de corte debe generar el mismo resultado.

---

## 17. Plan de implementación

### Fase 1. Reconocimiento confiable

- Implementar los ocho requisitos.
- Agregar estados de evidencia.
- Validar líder, aval y proyecto activo.
- Separar los dos pisos anualizados.

### Fase 2. Catálogo y ventanas

- Incorporar códigos oficiales de producto.
- Implementar ventanas diferenciadas.
- Validar existencia, vinculación y calidad.
- Separar clases TOP, A y B.

### Fase 3. Indicadores relacionales y temporales

- Normalizar autorías.
- Calcular cohesión y cooperación.
- Implementar estabilidad, permanencia y trayectoria.

### Fase 4. Clasificación estimada

- Implementar la matriz C, B, A y A1.
- Incorporar referencias por gran área cuando estén disponibles.
- Diferenciar categoría demostrable y potencial.

### Fase 5. Auditoría y experiencia de usuario

- Generar explicaciones por regla.
- Agregar exportación del diagnóstico.
- Versionar el modelo y la fuente de datos.
- Incorporar pruebas automatizadas y casos límite.

---

## 18. Casos de prueba indispensables

### Caso 1. Grupo con muchos productos, pero sin reconocimiento

Un grupo con abundantes artículos, pero sin proyecto en ejecución, no cumple todos los requisitos de reconocimiento.

### Caso 2. Grupo antiguo con producción insuficiente

Un grupo con diez años declarados y dos productos recientes no supera los pisos anualizados, aunque los productos sean válidos.

### Caso 3. Aval no disponible

Si el grupo pertenece a la UPC, pero el aval de InstituLAC no está disponible, el estado será **NO VERIFICABLE**, no **CUMPLE**.

### Caso 4. Doctor sin categoría reconocida

Un integrante con doctorado no satisface por sí mismo la exigencia de Sénior o Asociado para A o A1.

### Caso 5. Producto fuera de ventana

Una patente dentro de diez años puede aportar; un artículo D con más de cinco años queda fuera de su ventana, salvo disposición aplicable que indique otra cosa.

### Caso 6. Falta de FRH Tipo A

El grupo no puede demostrar A o A1 si incumple la condición de formación Tipo A. Esto no implica que obtenga automáticamente B.

### Caso 7. Cohesión cero

Un grupo con producción individual sin colaboración interna no supera la condición de cohesión para B, A o A1.

### Caso 8. Cuartil no disponible

Si Khemia calcula un puntaje, pero no posee la distribución nacional del área, debe presentar el valor calculado y dejar el cuartil oficial como **NO VERIFICABLE**.

---

## 19. Riesgos y controles

| Riesgo | Consecuencia | Control |
|---|---|---|
| Datos incompletos de GrupLAC | Falsos incumplimientos o falsos positivos | Estado no verificable y evidencia requerida |
| Duplicados de productos | Inflación de indicadores | Identificación por código, DOI, título, autores y fecha |
| Fechas ambiguas | Ventanas incorrectas | Fecha normativa por subtipo y trazabilidad |
| Categorías desactualizadas | Clasificación incorrecta | Vigencia de categoría del investigador |
| Catálogo mal mapeado | Pesos y clases erróneos | Catálogo versionado y pruebas unitarias |
| Uso de percentiles institucionales como nacionales | Sobreestimación | Etiquetado explícito y separación de métricas |
| Cambios de modelo | Resultados irreproducibles | Versión del modelo en cada evaluación |
| Mensajes absolutos | Decisiones institucionales equivocadas | Lenguaje de diagnóstico y limitaciones visibles |

---

## 20. Recomendaciones estratégicas para la UPC

Khemia debe orientar a los grupos no solo a aumentar volumen, sino a fortalecer dimensiones específicas:

1. **Calidad verificable:** productos que satisfagan los requisitos de existencia y calidad.
2. **Formación avanzada:** dirección y finalización de productos de formación exigidos por las categorías superiores.
3. **Colaboración interna:** producción conjunta entre integrantes del grupo.
4. **Apropiación social:** procesos y productos vinculados a comunidades y contextos reales.
5. **Estabilidad:** producción distribuida en el tiempo, no concentrada en un único periodo.
6. **Trazabilidad documental:** soportes institucionales disponibles antes del cierre de la convocatoria.
7. **Vinculación correcta:** productos, proyectos e integrantes relacionados adecuadamente en las plataformas.

---

## 21. Conclusiones

El Modelo Minciencias 2024 no puede representarse fielmente mediante un contador plano de productos. El reconocimiento exige ocho condiciones acumulativas y la clasificación incorpora múltiples indicadores, ventanas diferenciadas, calidad de productos, tipologías de integrantes y comparación dentro de la gran área de conocimiento.

La evolución recomendada para Khemia es un motor normativo explicable, compuesto por validación de datos, evaluación de productos, cálculo de indicadores, reglas por categoría y una capa de explicación. Este enfoque reduce falsos positivos, hace visibles las brechas documentales y ofrece a los grupos de la Universidad Popular del Cesar un instrumento útil para la planeación.

El resultado debe presentarse como diagnóstico y estimación. La decisión oficial seguirá dependiendo de Minciencias, de la validación de la información registrada y de los valores de referencia aplicados en la convocatoria correspondiente.

---

## 22. Referencias

Ministerio de Ciencia, Tecnología e Innovación. (2024). *Modelo de medición de grupos de investigación, desarrollo tecnológico o de innovación y de reconocimiento de investigadores del Sistema Nacional de Ciencia, Tecnología e Innovación, año 2024*. Código M601PR04G01, versión 02.

Ministerio de Ciencia, Tecnología e Innovación. (2024). *Convocatoria Nacional 957 de 2024 para el reconocimiento y medición de grupos de investigación y el reconocimiento de investigadores del SNCTI*.

Universidad Autónoma del Caribe. *Requisitos para clasificación de grupos de investigación*. Material de apoyo consultado únicamente como tabla comparativa; en caso de diferencia prevalece el documento oficial de Minciencias.

---

## 23. Lista de verificación para aprobación interna

- [ ] Los ocho requisitos de reconocimiento están implementados individualmente.
- [ ] El aval no se infiere por afiliación.
- [ ] El proyecto activo se valida por tipo y estado.
- [ ] El líder se identifica de forma explícita.
- [ ] Los dos pisos anualizados se calculan por separado.
- [ ] Las ventanas de 5, 7 y 10 años se aplican por subtipo.
- [ ] Los productos pasan por existencia, vinculación, ventana y calidad.
- [ ] TOP, Tipo A y Tipo B se encuentran separados.
- [ ] FRH Tipo A y Tipo B no se mezclan.
- [ ] La categoría del investigador no se infiere desde su título.
- [ ] Cohesión, cooperación, estabilidad, permanencia y trayectoria son indicadores independientes.
- [ ] Los cuartiles oficiales solo se muestran con referencias suficientes por área.
- [ ] La evaluación se ejecuta de A1 hacia C.
- [ ] Cada categoría se evalúa con sus propias condiciones.
- [ ] “No verificable” permanece separado de “cumple”.
- [ ] La salida se denomina diagnóstico o categoría estimada.
- [ ] Cada resultado conserva versión del modelo, fecha de corte y evidencia.
