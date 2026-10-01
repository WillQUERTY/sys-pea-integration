# Catálogo de tipologías de productos — Modelo de Medición Minciencias 2024

Fuente: *Modelo de Medición de Grupos de Investigación, Desarrollo Tecnológico o de Innovación y de Reconocimiento de Investigadores del SNCTI, Año 2024* (doc. M601PR04G01, versión 02; copia local en `docs/modelo-medicion-2024.md`).

Generado automáticamente desde `database/catalog_2024.json` con `database/render_catalog_doc.py`. **No editar a mano.**

## Cómo se leen los pesos

- **Peso relativo** (Anexo 1, tablas I–XXI): valor de la categoría dentro de su tipología.
- **Peso global** (Tabla 6, §3.6): peso del producto de más alta calidad de la tipología (o el valor directo que la Tabla 6 asigna a esa categoría). `-` = no listado en Tabla 6.
- **Peso individual final** = peso global (Tabla 6) × peso relativo (Anexo 1). Ejemplos del propio documento: ART_A2 = 100 × 5,5 = 550; CAP_LIB_B = 60 × 8 = 480; PA1 = 500 × 10 = 5000.
- **Clase de medición** (§3.7): TOP, A, B (clases de visibilidad/impacto), ASC, DPC, FRH-A (formación doctoral) y FRH-B.

## Resumen

| Familia | Tipologías | Categorías |
|---|---|---|
| GNC — Generación de Nuevo Conocimiento | 10 | 57 |
| DTI — Desarrollo Tecnológico e Innovación | 26 | 34 |
| ASC — Apropiación Social del Conocimiento | 4 | 11 |
| DPC — Divulgación Pública de la Ciencia | 21 | 48 |
| FRH — Formación de Recurso Humano para la CTeI | 9 | 20 |
| **Total** | **70** | **170** |

## GNC — Generación de Nuevo Conocimiento

### Artículos de investigación (`ART`, 2.2.1.1)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `ART_OPEN_A1` | Calidad A1 - revista de acceso abierto | TOP | 10 | 100 |
| `ART_A1` | Calidad A1 | TOP | 9,5 | - |
| `ART_OPEN_A2` | Calidad A2 - revista de acceso abierto | TOP | 6 | - |
| `ART_A2` | Calidad A2 | TOP | 5,5 | - |
| `ART_OPEN_B` | Calidad B - revista de acceso abierto | A | 3,5 | - |
| `ART_B` | Calidad B | A | 3 | - |
| `ART_OPEN_C` | Calidad C - revista de acceso abierto | A | 2 | - |
| `ART_C` | Calidad C | A | 1,5 | - |
| `ART_OPEN_D` | Calidad D - revista de acceso abierto ⚠️ | B | 1 | 5 |
| `ART_D` | Calidad D ⚠️ | B | 0,9 | - |

### Notas científicas (`N`, 2.2.1.2)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `N_A1` | Calidad A1 | B | 10 | 4 |
| `N_A2` | Calidad A2 | B | 8,5 | - |
| `N_B` | Calidad B | B | 7 | - |
| `N_C` | Calidad C | B | 5,5 | - |
| `N_D` | Calidad D | B | 2 | - |

### Libros resultados de investigación (`LIB`, 2.2.1.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `LIB_A1` | Calidad A1 - primer cuartil de citaciones | TOP | 10 | 300 |
| `LIB_A` | Calidad A - segundo cuartil | TOP | 9 | - |
| `LIB_B` | Calidad B - tercer cuartil | A | 8 | - |
| `LIB_C` | Calidad C - cuarto cuartil o sin citaciones ⚠️ | B | 1 | 15 |

### Capítulos en libro resultado de investigación (`CAP_LIB`, 2.2.1.4)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `CAP_LIB_A1` | Calidad A1 - primer cuartil de citaciones | TOP | 10 | 60 |
| `CAP_LIB_A` | Calidad A - segundo cuartil | TOP | 9 | - |
| `CAP_LIB_B` | Calidad B - tercer cuartil | A | 8 | - |
| `CAP_LIB_C` | Calidad C - cuarto cuartil o sin citaciones ⚠️ | B | 1 | 3 |

### Patente de invención (`PAT_INV`, 2.2.1.5)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `PA1` | Obtenida vía PCT, con producto o contrato | TOP | 10 | 500 |
| `PA2` | Obtenida vía tradicional, con producto o contrato | TOP | 7 | - |
| `PA3` | Obtenida vía PCT, sin producto y sin contrato | A | 6 | - |
| `PA4` | Obtenida vía tradicional, sin producto y sin contrato | A | 5,5 | - |
| `PB1` | Solicitada vía PCT, concepto favorable (búsqueda, preliminar y fondo), con contrato de explotación | B | 5 | - |
| `PB2` | Solicitada vía PCT, concepto favorable parcial, con contrato o con examen de fondo favorable | B | 3,5 | - |
| `PB3` | Solicitada vía tradicional, concepto favorable de fondo y con contrato | B | 3 | - |
| `PB4` | Solicitada vía PCT, favorable en búsqueda y preliminar, sin contrato | B | 2,6 | - |
| `PB5` | Solicitada vía tradicional, favorable de fondo, sin contrato | B | 2,5 | - |
| `PC` | Solicitada, con contrato de explotación con empresa innovadora (DANE) | B | 1,8 | - |

### Modelo de utilidad (`MOD_UTIL`, 2.2.1.5)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `MA1` | Obtenido vía PCT, con producto o contrato | TOP | 6 | 500 |
| `MA2` | Obtenido vía tradicional, con producto o contrato | TOP | 4,2 | - |
| `MA3` | Obtenido vía PCT, sin producto y sin contrato | A | 3,6 | - |
| `MA4` | Obtenido vía tradicional, sin producto y sin contrato | A | 3,33 | - |
| `MB1` | Solicitado vía PCT, concepto favorable (búsqueda, preliminar y fondo), con contrato | B | 3 | - |
| `MB2` | Solicitado vía PCT, concepto favorable parcial, con contrato o examen de fondo favorable | B | 2,1 | - |
| `MB3` | Solicitado vía tradicional, concepto favorable de fondo y con contrato | B | 1,8 | - |
| `MB4` | Solicitado vía PCT, favorable en búsqueda y preliminar, sin contrato | B | 1,7 | - |
| `MB5` | Solicitado vía tradicional, favorable de fondo, sin contrato | B | 1,5 | - |
| `MC` | Solicitado, con contrato de explotación con empresa innovadora (DANE) | B | 1,1 | - |

### Variedades vegetales (`VV`, 2.2.1.6.1)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `VV_A1` | Ciclo largo obtenida, inscrita en registro nacional y con ventas (ICA) | TOP | 10 | 300 |
| `VV_A2` | Ciclo largo obtenida e inscrita en registro nacional | TOP | 8 | - |
| `VV_A3` | Ciclo largo obtenida | A | 5 | - |
| `VV_A4` | Ciclo largo en proceso de solicitud | A | 2,5 | - |
| `VV_B1` | Ciclo corto obtenida, inscrita y con ventas (ICA) | B | 5 | - |
| `VV_B2` | Ciclo corto obtenida e inscrita | B | 4 | - |
| `VV_B3` | Ciclo corto obtenida | B | 2,5 | - |
| `VV_B4` | Ciclo corto en proceso de solicitud | B | 1 | - |

### Nuevas razas animales (`NRA`, 2.2.1.6.2)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `VA_A` | Nueva raza obtenida (certificado de bioseguridad ICA) | TOP | 10 | 300 |

### Poblaciones mejoradas de razas pecuarias (`PMR`, 2.2.1.6.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `VA_B` | Población mejorada con registro del Ministerio de Agricultura | TOP | 5 | 300 |

### Productos resultados de la creación o investigación-creación (artes, arquitectura y diseño) (`AAD`, 2.2.1.7)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `AAD_A1` | Premio o distinción internacional, trayectoria del evento >10 años | TOP | 10 | 100 |
| `AAD_A` | Premio nacional (>8 años) o selección internacional (>8 años) | TOP | 8 | - |
| `AAD_B` | Premio local (>6 años) o selección nacional (>6 años) | A | 6 | - |
| `AAD_C` | Selección para presentación pública, impacto local | B | 4 | - |

## DTI — Desarrollo Tecnológico e Innovación

### Diseños industriales (`DI`, 2.2.2.1.1)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `DI_A` | Con contrato de fabricación, explotación o comercialización | A | 10 | 35 |
| `DI_B` | Sin contrato de fabricación, explotación o comercialización | B | 5 | - |

### Esquemas de circuito integrado (`ECI`, 2.2.2.1.2)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `ECI` | Con contrato de fabricación, explotación o comercialización | A | 4 | 35 |

### Softwares (`SF`, 2.2.2.1.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `SF` | Registrado ante la DNDA, con certificación de la entidad productora | B | 8 | 35 |

### Plantas piloto (`PP`, 2.2.2.1.4)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `PP` | Planta piloto registrada | A | 4 | 35 |

### Prototipos industriales (`PI`, 2.2.2.1.5)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `PI` | Prototipo industrial registrado | A | 4 | 35 |

### Signos distintivos (`SD`, 2.2.2.1.6)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `SD` | Registro ante la Superintendencia de Industria y Comercio | A | 4 | 35 |

### Productos nutracéuticos (`PN`, 2.2.2.1.7)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `PN` | Con registro INVIMA | B | 6 | 35 |

### Colecciones científicas (`CC`, 2.2.2.1.8)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `CC` | Colección con curaduría vigente certificada | B | 10 | 35 |

### Nuevos registros científicos (`NRC`, 2.2.2.1.9)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `NRC_A` | Publicado en artículo científico A1, A2, B, C o D | B | 8 | 35 |
| `NRC_B` | Otros nuevos registros científicos certificados | B | 5 | - |

### Secreto empresarial (`SE`, 2.2.2.2.1)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `SE` | Con contrato de licenciamiento y medidas de confidencialidad | A | 5 | 100 |

### Empresas de base tecnológica (`EBT`, 2.2.2.2.2)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `EBT_A` | Spin-off | A | 10 | 100 |
| `EBT_B` | Start-up | B | 8 | - |

### Empresas creativas y culturales (`ICC`, 2.2.2.2.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `ICC_A` | Con productos o servicios en el mercado | A | 10 | 100 |
| `ICC_B` | Sin productos o servicios en el mercado | B | 4 | - |

### Innovaciones generadas en la gestión empresarial (`IG`, 2.2.2.2.5)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `IG_A1` | Organizacional, en grandes empresas | A | 10 | 100 |
| `IG_A2` | Organizacional, en medianas y pequeñas empresas | A | 6 | - |
| `IG_B1` | En comercialización, en grandes empresas | B | 5 | - |
| `IG_B2` | En comercialización, en medianas y pequeñas empresas | B | 3 | - |

### Innovaciones en procedimientos (procesos) y servicios (`IPP`, 2.2.2.2.6)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `IPP` | Con certificado de implementación en empresa | B | 5 | 100 |

### Regulaciones, normas, reglamentos o legislaciones (`RNL`, 2.2.2.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `RNL_A` | Implementación a nivel internacional | TOP | 10 | 100 |
| `RNL_B` | Implementación a nivel nacional | A | 8 | - |

### Normatividad del espectro radioeléctrico (`RNR`, 2.2.2.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `RNR` | Con certificación de la Agencia Nacional del Espectro | A | 8 | - |

### Normas técnicas (`RNT`, 2.2.2.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `RNT` | Norma técnica | B | 7 | - |

### Guías de práctica clínica (`RNPC`, 2.2.2.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `RNPC` | Guía de práctica clínica publicada (ISBN) | B | 7 | 100 |

### Guías de manejo clínico forense (`GMCF`, 2.2.2.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `GMCF` | Guía de manejo clínico forense publicada | B | 7 | 100 |

### Manuales y modelos de atención diferencial a víctimas (`MADV`, 2.2.2.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `MADV` | Manual o modelo publicado | B | 7 | 100 |

### Protocolos de atención a usuarios/víctimas (pacientes) (`PAU`, 2.2.2.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `PAU` | Protocolo publicado | B | 7 | 100 |

### Protocolos de vigilancia epidemiológica (`PVE`, 2.2.2.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `PVE` | Protocolo publicado | B | 7 | 100 |

### Acuerdos de ley (`AL`, 2.2.2.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `AL` | Con certificación de la Secretaría del Senado | B | 8 | 100 |

### Proyectos de ley (`RNPL`, 2.2.2.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `RNPL` | Con certificación de la Secretaría del Senado | B | 6 | 100 |

### Conceptos técnicos (`CT`, 2.2.2.4)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `CT` | Concepto técnico emitido con oficio remisorio | B | 10 | 15 |

### Registros de acuerdos de licencia para explotación de obras de I+C en artes, arquitectura y diseño (`MR`, 2.2.2.5)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `MR` | Obra licenciada con registro ante la DNDA | B | 10 | 14 |

## ASC — Apropiación Social del Conocimiento

### Procesos de apropiación social del conocimiento para el fortalecimiento o solución de asuntos de interés social (`FIS`, 2.2.3.3.1.1)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `FIS` | Proceso con certificación de la comunidad u organización que avala | ASC | 10 | 200 |

### Procesos de apropiación social del conocimiento para la generación de insumos de política pública y normatividad (`GPP`, 2.2.3.3.1.2)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `GPP_A` | Documento o acto normativo con aplicación nacional | ASC | 10 | 200 |
| `GPP_B` | Aplicación regional o sectorial | ASC | 7 | - |
| `GPP_C` | Aplicación local | ASC | 5 | - |

### Procesos de apropiación social del conocimiento para el fortalecimiento de cadenas productivas (`FCP`, 2.2.3.3.1.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `FCP_A` | Con pequeños productores, cooperativas y asociaciones campesinas | ASC | 10 | 200 |
| `FCP_B` | Con pymes y pequeñas empresas | ASC | 5 | - |
| `FCP_C` | Con empresas del sector productivo | ASC | 3 | - |

### Procesos de apropiación social del conocimiento resultado del trabajo conjunto entre un Centro de Ciencia y un grupo de investigación (`TCCG`, 2.2.3.3.1.4)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `TCCG_A` | Centro de Ciencia reconocido por 5 años | ASC | 10 | 200 |
| `TCCG_B` | Centro de Ciencia reconocido por 3 años | ASC | 7 | - |
| `TCCG_C` | Centro de Ciencia reconocido por 1 año | ASC | 4 | - |
| `TCCG_D` | Centro de Ciencia caracterizado por Minciencias | ASC | 1 | - |

## DPC — Divulgación Pública de la Ciencia

### Eventos científicos con componente de apropiación (`EC`, 2.2.3.4.1.1)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `EC_A` | Presentación de ponencia, póster o capítulo en memorias | DPC | 10 | 100 |
| `EC_B` | Organización del evento | DPC | 6 | - |

### Participaciones en redes de conocimiento (`RC`, 2.2.3.4.1.2)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `RC_A` | El grupo creó y lidera la red | DPC | 10 | 100 |
| `RC_B` | El grupo participa en la red | DPC | 6 | - |

### Talleres de creación (`TC`, 2.2.3.4.1.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `TC_A` | Evento internacional con selección y verificación de resultados | DPC | 10 | 100 |
| `TC_B` | Evento nacional con selección y verificación | DPC | 8 | - |
| `TC_C` | Evento local con selección | DPC | 6 | - |

### Eventos artísticos, de arquitectura o de diseño con componentes de apropiación (`ECA`, 2.2.3.4.1.4)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `ECA_A` | Participante | DPC | 8 | 100 |
| `ECA_B` | Organizador | DPC | 6 | - |

### Documentos de trabajo (working papers) (`WP`, 2.2.3.4.1.5)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `WP` | Documento publicado (página web o DOI) | DPC | 10 | 100 |

### Nuevas secuencias genéticas (`NSG`, 2.2.3.4.1.6)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `NSG` | Secuencia incluida en base de datos científica certificada | DPC | 10 | 100 |

### Ediciones de revista o libro de divulgación científica (`ERL`, 2.2.3.4.1.7)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `ERL` | Edición de revista o libro de divulgación (ISSN/ISBN) | DPC | 6 | 100 |

### Informes finales de investigación (`IFI`, 2.2.3.4.1.8)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `IFI` | Informe final de proyecto de investigación | DPC | 2 | 100 |

### Informes técnicos (`INF`, 2.2.3.4.1.9)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `INF` | Informe usado por una entidad para la toma de decisiones | DPC | 5 | 100 |

### Consultorías científico-tecnológicas (`CON_CT`, 2.2.3.4.1.10)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `CON_CT` | Consultoría con contrato y certificación de la entidad | DPC | 7,5 | 100 |

### Consultorías en arte, arquitectura y diseño (`CON_AAD`, 2.2.3.4.1.11)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `CON_AAD` | Consultoría con contrato y certificación de la IES | DPC | 7,5 | 100 |

### Publicaciones editoriales no especializadas (`PEE`, 2.2.3.4.2.1.1)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `PEE_A1` | Circulación nacional, con enfoque diferencial | DPC | 10 | 100 |
| `PEE_A2` | Circulación nacional, sin enfoque diferencial | DPC | 8 | - |
| `PEE_B1` | Circulación regional/departamental, con enfoque diferencial | DPC | 7 | - |
| `PEE_B2` | Circulación regional/departamental, sin enfoque diferencial | DPC | 5 | - |
| `PEE_C1` | Circulación ciudadana/comunitaria/local, con enfoque diferencial | DPC | 5 | - |
| `PEE_C2` | Circulación ciudadana/comunitaria/local, sin enfoque diferencial | DPC | 3 | - |

### Producciones de contenido digital (`PCD`, 2.2.3.4.2.1.2)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `PCD_A1` | Circulación nacional, con enfoque diferencial | DPC | 10 | 100 |
| `PCD_A2` | Circulación nacional, sin enfoque diferencial | DPC | 8 | - |
| `PCD_B1` | Circulación regional/departamental, con enfoque diferencial | DPC | 7 | - |
| `PCD_B2` | Circulación regional/departamental, sin enfoque diferencial | DPC | 5 | - |
| `PCD_C1` | Circulación ciudadana/comunitaria/local, con enfoque diferencial | DPC | 5 | - |
| `PCD_C2` | Circulación ciudadana/comunitaria/local, sin enfoque diferencial | DPC | 3 | - |

### Producción de estrategias y contenidos transmedia (`TRM`, 2.2.3.4.2.1.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `TRM_A1` | Circulación nacional, con enfoque diferencial | DPC | 10 | 100 |
| `TRM_A2` | Circulación nacional, sin enfoque diferencial | DPC | 8 | - |
| `TRM_B1` | Circulación regional/departamental, con enfoque diferencial | DPC | 7 | - |
| `TRM_B2` | Circulación regional/departamental, sin enfoque diferencial | DPC | 5 | - |
| `TRM_C1` | Circulación ciudadana/comunitaria/local, con enfoque diferencial | DPC | 5 | - |
| `TRM_C2` | Circulación ciudadana/comunitaria/local, sin enfoque diferencial | DPC | 3 | - |

### Desarrollos web (`DW`, 2.2.3.4.2.1.4)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `DW_A1` | Circulación nacional, con enfoque diferencial | DPC | 10 | 100 |
| `DW_A2` | Circulación nacional, sin enfoque diferencial | DPC | 8 | - |
| `DW_B1` | Circulación regional/departamental, con enfoque diferencial | DPC | 7 | - |
| `DW_B2` | Circulación regional/departamental, sin enfoque diferencial | DPC | 5 | - |
| `DW_C1` | Circulación ciudadana/comunitaria/local, con enfoque diferencial | DPC | 5 | - |
| `DW_C2` | Circulación ciudadana/comunitaria/local, sin enfoque diferencial | DPC | 3 | - |

### Libros de formación (`LIB_FOR`, 2.2.3.4.3.1)

> **Nota:** La categoría Q1 (LIB_FOR1) cuenta para la clase de medición B según la sección 3.7.3, aunque la tipología pertenece a DPC. Los pesos relativos de Q1 y Q2 aparecen ambos como 10 en la conversión: verificar contra el PDF original (con los pesos globales de la Tabla 6, 60 y 100, el peso final de Q2 quedaría por encima del de Q1).

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `LIB_FOR1` | Primer cuartil de citaciones (Q1) | B | 10 | 60 |
| `LIB_FOR2` | Segundo cuartil de citaciones (Q2) | DPC | 10 | 100 |
| `LIB_FOR3` | Tercer cuartil de citaciones (Q3) | DPC | 8 | - |

### Boletines divulgativos de resultado de investigación (`BOL`, 2.2.3.4.3.2)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `BOL` | Boletín publicado por una institución | DPC | 3 | 100 |

### Libros de divulgación de investigación y/o compilación de divulgación (`LIB_DIV`, 2.2.3.4.3.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `LIB_DIV` | Libro de divulgación validado por certificación institucional | DPC | 10 | 100 |

### Generación de contenidos (a partir de artículos, notas científicas o capítulos) (`GC`, 2.2.3.4.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `GC` | Contenido generado a partir de productos 2.2.1.1, 2.2.1.2 o 2.2.1.4 | DPC | 4 | 100 |

### Manuales y guías especializadas (`MAN_GUI`, 2.2.3.4.3.4)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `MAN_GUI` | Manual o guía derivada de proyecto de investigación, validada institucionalmente | DPC | 2 | 100 |

### Libros de creación (tipología piloto) (`LIB_CRE`, 2.2.3.4.3.5)

> **Nota:** Tipología piloto en el modelo 2024: el Anexo 1 indica 'No aplica' para categoría y peso. Se registra sin categorías de calidad.

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `LIB_CRE` | Libro resultado de creación (piloto - sin peso en la medición 2024) | - | - | - |

## FRH — Formación de Recurso Humano para la CTeI

### Direcciones de tesis de doctorado (`TD`, 2.2.4.1)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `TD_A` | Tesis con distinción (laureada, meritoria) | FRH-A | 10 | 160 |
| `TD_B` | Tesis aprobada | FRH-A | 5 | - |

### Direcciones de trabajo de grado de maestría (`TM`, 2.2.4.2)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `TM_A` | Trabajo de grado con distinción (laureado, meritorio) | FRH-B | 10 | 70 |
| `TM_B` | Trabajo de grado aprobado | FRH-B | 5 | - |

### Direcciones de trabajo de pregrado (`TP`, 2.2.4.3)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `TP_A` | Trabajo de grado con distinción | FRH-B | 10 | 20 |
| `TP_B` | Trabajo de grado aprobado | FRH-B | 5 | - |

### Proyectos de investigación y desarrollo (`PID`, 2.2.4.4)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `PID_A` | Financiación externa internacional | FRH-B | 10 | 50 |
| `PID_B` | Financiación externa nacional | FRH-B | 6 | - |
| `PID_C` | Financiación interna de la(s) institución(es) que avala(n) | FRH-B | 2 | - |

### Proyectos de investigación-creación (`PIC`, 2.2.4.4)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `PIC_A` | Financiación externa internacional | FRH-B | 10 | 50 |
| `PIC_B` | Financiación externa nacional | FRH-B | 6 | - |
| `PIC_C` | Financiación interna de la(s) institución(es) que avala(n) | FRH-B | 2 | - |

### Proyectos de investigación, desarrollo e innovación (ID+I) con formación (`PF`, 2.2.4.4)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `PF_A` | Proyecto ejecutado con investigadores en empresas | FRH-B | 10 | 50 |
| `PF_B` | Proyecto ejecutado con jóvenes investigadores en empresas | FRH-B | 8 | - |

### Proyectos de extensión y de responsabilidad social en CTeI (`PE`, 2.2.4.5)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `PE` | Proyecto de extensión financiado o solidario | FRH-B | 10 | 100 |

### Apoyos a la creación de programas y cursos de formación de investigadores (`AP`, 2.2.4.6)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `AP_A` | Apoyo a la creación de programas de doctorado | FRH-A | 10 | 100 |
| `AP_B` | Apoyo a la creación de programas de maestría | FRH-B | 8 | - |
| `AP_C` | Apoyo a la creación de cursos de programa de doctorado | FRH-A | 5 | 100 |
| `AP_D` | Apoyo a la creación de cursos de programa de maestría | FRH-B | 3 | - |

### Acompañamientos y asesorías de línea temática del Programa Ondas (`APO`, 2.2.4.7)

| Código | Categoría | Clase | Peso relativo | Peso global (Tabla 6) |
|---|---|---|---|---|
| `APO` | Iniciativa reconocida en la comunidad de pares del Programa Ondas | FRH-B | 10 | 30 |

## ⚠️ Valores pendientes de verificación contra el PDF original

La conversión del PDF a markdown perdió comas decimales en algunas tablas. Estos valores se infirieron por consistencia de las series y **deben confirmarse contra el PDF oficial**:

- `ART_OPEN_D` (Artículos de investigación): sembrado como **1**. La conversión del PDF muestra 10; se infiere 1,0 para mantener la serie decreciente (10/9,5/6/5,5/3,5/3/2/1,5/1,0). Verificar contra el PDF original.
- `ART_D` (Artículos de investigación): sembrado como **0,9**. La conversión del PDF muestra 9; se infiere 0,9 por consistencia con la serie. Verificar contra el PDF original.
- `LIB_C` (Libros resultados de investigación): sembrado como **1**. La conversión del PDF muestra 10; se infiere 1,0 (la serie 10/9/8/1,0 deja los pesos finales monótonos: 3000/2700/2400/300). Verificar contra el PDF original.
- `CAP_LIB_C` (Capítulos en libro resultado de investigación): sembrado como **1**. La conversión del PDF muestra 10; se infiere 1,0 (consistencia con la serie y con LIB_C). Verificar contra el PDF original.

Para corregir un peso: editar `database/catalog_2024.json` y volver a correr `python database/seed_catalog_2024.py` (upsert idempotente) y este generador.

## Mapeo GrupLAC → catálogo 2024

Patrones de encabezado normalizados (sin tildes, minúsculas) tal como los usa
`SECTION_MAP` en `backend/app/scraper.py`. Destinos:

- **Directo**: la sección GrupLAC corresponde a una tipología 2024. El producto
  importa con `subtype_id` de esa tipología y `quality_category_id = NULL`
  (la calidad se asigna manualmente en la cola de validación).
- **Refinar por fila**: la sección mezcla tipologías; el subtipo se decide con
  datos de la fila (como ya hace "Trabajos dirigidos").
- **Sin clasificar**: la sección no tiene equivalente 2024 o es ambigua →
  `subtype_id = NULL` + `ImportRecord` con `action_taken='unclassified_subtype'`
  para reclasificación manual desde el detalle del producto.
- **Tentativo**: el encabezado exacto debe confirmarse contra un GrupLAC real
  en la Fase 6 (el patrón puede requerir ajuste).

| Encabezado GrupLAC (patrón) | Destino 2024 | Notas |
|---|---|---|
| `articulos` | ART (GNC) | Directo |
| `notas cientificas` | N (GNC) | Directo |
| `libros publicados` | LIB (GNC) | Directo |
| `capitulos` | CAP_LIB (GNC) | Directo |
| `patente` | PAT_INV (GNC) | Refinar por fila: tipo "modelo de utilidad" → MOD_UTIL |
| `nuevas variedades` | VV (GNC) | Directo |
| `nuevas razas` | NRA (GNC) | Tentativo |
| `poblaciones mejoradas` | PMR (GNC) | Tentativo |
| `obras o productos`, `produccion en arte` | AAD (GNC) | Las obras de creación van a GNC en 2024 (antes familia "arte") |
| `software` | SF (DTI) | Directo. **Software es DTI en 2024, no GNC** |
| `prototipo` | PI (DTI) | Directo |
| `planta piloto` | PP (DTI) | Separado de prototipos |
| `disenos industriales` | DI (DTI) | Directo |
| `esquemas de trazados` | ECI (DTI) | Directo |
| `productos nutraceuticos` | PN (DTI) | Directo |
| `signos distintivos` | SD (DTI) | Directo |
| `colecciones cientificas` | CC (DTI) | Tentativo |
| `nuevos registros` | NRC (DTI) | Tentativo |
| `secreto empresarial` | SE (DTI) | Tentativo (sección ausente del mapa viejo) |
| `empresas de base tecnologica` | EBT (DTI) | Directo |
| `empresas creativas` | ICC (DTI) | Tentativo |
| `innovaciones generadas` | IG (DTI) | Directo |
| `innovaciones en procesos` | IPP (DTI) | Directo |
| `regulaciones y normas` | RNL (DTI) | Directo |
| `protocolos de vigilancia epidemiologica` | PVE (DTI) | Nombre exacto del Anexo 1; confirmado contra la página real (Fase 6) |
| `reglamentos tecnicos` | RNL (DTI) | Los reglamentos amparan en RNL (2.2.2.3); confirmado Fase 6 |
| `guias de practica clinica` | RNPC (DTI) | Tentativo |
| `proyectos de ley` | RNPL (DTI) | Tentativo |
| `conceptos tecnicos` | CT (DTI) | Tentativo |
| `centro de ciencia` | TCCG (ASC) | Trabajo conjunto entre centros de ciencia y grupos de investigación (2.2.3.3.1.4); confirmado Fase 6 |
| `proceso de apropiacion social` | Sin clasificar | Ambiguo: 2024 lo divide en FIS/GPP/FCP/TCCG según el propósito |
| `consultorias` | CON_CT (DPC) | **2024 ubica las consultorías en DPC**, no en ASC |
| `informes de investigacion`, `informe final` | IFI (DPC) | Directo |
| `informes tecnicos` | INF (DPC) | Directo |
| `eventos` (científicos) | EC (DPC) | Directo |
| `redes de conocimiento` | RC (DPC) | Tentativo |
| `talleres de creacion` | TC (DPC) | Directo |
| `eventos artisticos` | ECA (DPC) | Los eventos artísticos van a DPC en 2024 (antes familia "arte") |
| `documentos de trabajo` | WP (DPC) | Directo |
| `secuencias geneticas` | NSG (DPC) | Tentativo |
| `ediciones` | ERL (DPC) | Directo |
| `contenido impreso` | PEE (DPC) | Directo |
| `publicaciones editoriales no especializadas` | PEE (DPC) | Nombre exacto del Anexo 1; confirmado contra la página real (Fase 6) |
| `contenido multimedia`, `contenido de audio`, `audiovisual`, `recursos graficos`, `contenido virtual`, `contenido digital` | PCD (DPC) | 2024 unifica estos formatos en "Producciones de contenido digital"; `contenido digital` cubre la sección "…- Sonoro" (confirmada Fase 6) |
| `estrategias de comunicacion`, `produccion de estrategias`, `estrategias y contenidos` | TRM (DPC) | Directo |
| `desarrollo web` | DW (DPC) | Directo |
| `libros de formacion` | LIB_FOR (DPC) | Directo |
| `boletines` | BOL (DPC) | Tentativo |
| `libros de divulgacion` | LIB_DIV (DPC) | Directo |
| `generacion de contenido` | GC (DPC) | Tentativo |
| `manuales y guias` | MAN_GUI (DPC) | Directo |
| `trabajos dirigidos`, `tesis` | TD / TM / TP (FRH) | Refinar por fila: doctorado → TD, maestría → TM, pregrado → TP |
| `asesorias al programa ondas` | APO (FRH) | Directo |
| `otros articulos` | Sin clasificar | Catch-all dudoso |
| `demas trabajos` | Sin clasificar | Catch-all dudoso |
| `otros libros` | Sin clasificar | Catch-all dudoso |
| `otra publicacion divulgativa` | Sin clasificar | Catch-all dudoso |
| `otros productos tecnologicos` | Sin clasificar | Catch-all dudoso |
| `curso de corta duracion`, `curso de doctorado`, `curso de maestria`, `curso especializado de extension` | Sin clasificar | Dictar cursos no es producto 2024 (AP cubre *crear* programas/cursos, no dictarlos) |
| `programa academico`, `otro programa academico` | Sin clasificar | Formación del investigador, no producto del grupo |
| `jurado`, `comites` | Sin clasificar | Actividades de evaluador: no son productos en el modelo 2024 |
| `actividades como evaluador` | Sin clasificar | Actividad del evaluador; confirmada Fase 6 |
| `comitas` | Sin clasificar | Mojibake de "comités" en el HTML de Scienti (doble encoding); confirmado Fase 6 |
| `participacion ciudadana` | Sin clasificar | "Espacios de participación ciudadana" no existe en el Anexo 1 de 2024 |
| `estrategias pedagogicas` | Sin clasificar | Sin equivalente 2024 como producto |
| `cartas mapas o similares` | Sin clasificar | Sin equivalente 2024 |
| `traducciones` | Sin clasificar | Sin equivalente 2024 |
| `monografias` (refinamiento de trabajos dirigidos) | Sin clasificar | Sin equivalente 2024 |
| `trabajos dirigidos de otro tipo` | Sin clasificar | Sin equivalente 2024 |
| Cualquier sección no listada | Sin clasificar | Se registra en `ImportJob.details` (fin del silencio); los banners de sección de GrupLAC no traen productos y no se reportan |
