# Indicador oficial de grupo — Minciencias 2024 (§2.2.9 → §3.10)

Implementación **completa** del modelo de medición del modelo oficial
(`docs/modelo-medicion-2024.md`, Anexo 1 M601PR04G01 v02) para la evaluación
de grupos de investigación.

> La entrega del Parcial 2 ya tenía un indicador (`i_grupo`) que sums **conteos
> crudos** con los pesos oficiales: `3,7·Top + 2,3·A + 0,4·B + 1,5·AP + 0,5·DPC +
> 1,0·Fr.A + 0,2·Fr.B + 0,1·Cohe + 0,3·Coop`. Eso **no** es el indicador del
> modelo: el modelo normaliza cada indicador contra el máximo de la población
> (§3.9) y aplica λ (§2.2.9) y pesos globales (§3.6) por subtipo. Con los datos
> reales, el indicador legacy da **491,7** (sin escala) y el oficial da **0,85**
> sobre un rango teórico de 10. Ambos conviven en el mismo endpoint.

## Dónde vive

| Pieza | Ruta | Qué hace |
|---|---|---|
| Modelo puro | `backend/app/evaluator/official_indicator.py` | Aplica §2.2.9, §3.6, §3.7, §3.8.1, §2.2.10, §3.9 y §3.10 sobre estructuras `GrupoOficial`/`ProductoOficial`. Sin BD, sin FastAPI: se golden-testea con una población sintética. |
| Adaptador RAM | `backend/app/evaluator/official_population.py` | Traduce el repositorio en RAM (grupos, productos, membresías, autores) a esas estructuras y construye la **población completa** (§3.9). |
| Reporte | `scripts/pea_indicador_oficial.py` | Corre el modelo sobre `pea_data.json` e imprime el desglose de las tres etapas. |
| **Núcleo C++** | `core_cpp/src/services/official_indicator.cpp` (+ `core_cpp/include/services/official_indicator.h`) | **El mismo modelo en C++**: λ §2.2.9, pesos §3.6, clases §3.7, Ind_Clase §3.8.1, Cohe/Coop §2.2.10, normalización §3.9 y fórmula §3.10, sobre la RAM de grupos/productos. |
| Catálogo para C++ | `scripts/gen_catalogo_cpp.py` → `core_cpp/include/services/catalog_2024_generated.h` | Genera la tabla del catálogo (ancla §3.6, peso relativo, ventana §2.2.5) **con el mismo código Python del backend**, para que C++ no pueda divergir. `--check` detecta drift. |
| CLI | `pea_cli indicator group <id> --data <repo.json> [--year <año>] [--json]` | Imprime el modelo oficial (encabezado) y, debajo, el `I_Grupo` legacy rotulado como referencia. `--json` emite el mismo contrato que la API. |
| **Contrato único** | `backend/app/evaluator/contrato_oficial.py` | Declara la forma del bloque oficial **una sola vez** (`CONTRATO`: 20 claves raíz con sus tipos) y de ahí se derivan el golden, el tipo TS y el fixture del frontend. Trae además el comparador (`comparar_indicadores`), el validador (`validar_contra_contrato`) y el adaptador que replica el mapeo del cargador JSON de C++. |
| Golden | `backend/tests/fixtures/indicador_oficial_golden.json` (+ `indicador_oficial_caso.json`) | El caso sintético de entrada y el resultado esperado, versionados. `scripts/gen_contrato_oficial.py --regenerar` los escribe y `--check` falla si hay drift. |
| Verificador de paridad | `scripts/pea_paridad_indicador.py` | Compara **campo por campo** el JSON del CLI contra el del evaluador Python sobre el mismo repositorio. Con `--golden` compara **los tres** (CLI C++, backend Python y contrato versionado) contra el golden. |
| **Tests del modelo en C++** | `core_cpp/tests/test_official_indicator.cpp` (target `pea_tests_indicador`, `ctest -C Release`) | 8 casos / 151 aserciones sobre el caso sintético del contrato: piezas puras (λ, categoría, familia, año), evaluación completa, normalización §3.9, fórmula §3.10 y las 20 claves del contrato JSON. |
| Tests | `backend/tests/test_official_indicator.py` (27, golden a mano), `backend/tests/test_official_population.py` (9, sobre los grupos reales), `backend/tests/test_catalogo_cpp.py` (drift del catálogo C++) y `backend/tests/test_indicador_oficial_contrato.py` (12, contrato único). | |
| API | `backend/app/repositories/analytics.py` → `get_group_minciencias_diagnosis` | Agrega la clave **aditiva** `modelo_oficial_2024` al diagnóstico. |
| Frontend | `frontend/web-react/src/lib/api/contrato-oficial-2024.generated.ts` (**generado**) + `analytics.ts` | Tipo `MincienciasOfficialModel2024` **generado desde el contrato** (no escrito a mano) y re-exportado por `analytics.ts`. |
| UI | `frontend/web-react/src/components/charts/minciencias-diagnosis-card.tsx` + `official-indicator-panel.tsx` | La tarjeta muestra el oficial como titular (el legacy, rotulado como referencia); el panel desglosa los 9 términos de §3.10, las clases frente al máximo de la población, los subtipos que aportan, las exclusiones y el ranking. |

## Cómo se ejecuta

```bash
# Reporte con el desglose completo (λ, Ind_Clase, índices, fórmula final)
python -X utf8 scripts/pea_indicador_oficial.py            # cierre 2026
python -X utf8 scripts/pea_indicador_oficial.py --edad 11  # forzar edad del grupo

# API (el diagnostico legacy llega igual, con la clave extra)
GET /api/v1/groups/{id}/minciencias-diagnosis

# CLI C++ (cada invocación es un proceso nuevo: el dato se carga con --data)
core_cpp/build2/Release/pea_cli.exe indicator group 10 --data pea_data.json --year 2026
core_cpp/build2/Release/pea_cli.exe indicator group 10 --data pea_data.json --json

# Paridad C++ <-> Python (debe decir PARIDAD CONFIRMADA)
python -X utf8 scripts/pea_paridad_indicador.py

# Los tres lados contra el contrato versionado (debe decir CONTRATO CONFIRMADO)
python -X utf8 scripts/pea_paridad_indicador.py --golden

# El golden, el tipo TS y el fixture TS estan al dia (CONTRATO AL DIA)
python -X utf8 scripts/gen_contrato_oficial.py --check

# Test unitario del modelo en C++ (debe decir 151 OK, 0 fallas)
core_cpp/build2/Release/pea_tests_indicador.exe
```

## Paridad C++ ↔ Python

El CLI C++ y el backend calculan el **mismo** indicador sobre el **mismo**
repositorio: `scripts/pea_paridad_indicador.py` compara `ind_grupo`, los nueve
índices y términos ponderados, `ind_clase`, los máximos de la población,
Cohe/Coop, el desglose por subtipo, los histogramas de exclusión y el ranking.
Con `pea_data.json` y cierre 2026 da **exactamente** los mismos números en los
dos lados:

| Grupo | Python | C++ (CLI) |
|---|---|---|
| AITICE (#10) | 0,8541030927835052 | 0,8541030927835052 |
| GISICO (#35) | 0,5479201551398108 | 0,5479201551398108 |

Lo que hace posible esa paridad:

- El catálogo no se reimplementa en C++: se **genera** desde
  `database/catalog_2024.json` con el código del backend
  (`scripts/gen_catalogo_cpp.py`), y `backend/tests/test_catalogo_cpp.py`
  falla si el header generado queda viejo.
- La normalización de texto (mojibake de doble codificación, acentos,
  minúsculas) replica la del backend: `lower()` → corrección de mojibake →
  NFD sin marcas combinantes.
- La cascada de años replica `extraer_anio`: `year` → `obtained_date` →
  `publication_date` → primer año plausible de la descripción.

## El contrato único (golden)

La paridad C++↔Python demuestra que las dos implementaciones coinciden **entre
sí**. El contrato único demuestra que **las tres** coinciden con una forma
declarada una sola vez, en `backend/app/evaluator/contrato_oficial.py`:

```
CONTRATO (declarado en Python)
   ├─> backend/tests/fixtures/indicador_oficial_golden.json   (golden versionado)
   │       ├─> pytest test_indicador_oficial_contrato.py       (backend vs contrato)
   │       └─> scripts/pea_paridad_indicador.py --golden       (CLI C++ vs contrato)
   ├─> frontend/.../contrato-oficial-2024.generated.ts         (tipo TS)
   │       └─> frontend/.../__fixtures__/modelo-oficial-2024.generated.ts
   │               └─> official-indicator-panel.test.tsx        (UI vs contrato)
   └─> scripts/gen_contrato_oficial.py --check                  (detecta drift)
```

Sobre el caso sintético (`indicador_oficial_caso.json`: 2 grupos, 4 subtipos que
aportan, un producto sin año, uno fuera de la ventana y 4 excluidos con 3
motivos), los tres lados dan **exactamente** los mismos números:

| Grupo | Ind.Grupo | Puesto | Cohe | Coop |
|---|---|---|---|---|
| AITICE (#10) | 0,8152872176748235 | 2 de 2 | 1,0 | 0,5 |
| GISICO (#20) | 1,0 | 1 de 2 | 0,0 | 1,0 |

La forma del contrato son **20 claves raíz**: `modelo`, `anio_cierre`, `grupo`,
`ind_grupo`, `rango_teorico`, `posicion_poblacion`, `poblacion`, `indices`,
`terminos_ponderados`, `ind_clase`, `maximos_poblacion`,
`maximo_cohe_poblacion`, `maximo_coop_poblacion`, `subtipos`, `cohe`, `coop`,
`excluidos`, `sin_ano`, `fuera_de_periodo`, `supuestos`.

El caso sintético cubre a propósito las dos reglas que se confunden entre sí:
en el grupo 10 (edad 8) **manda la ventana** del subtipo (5 años), y en el
grupo 20 (edad 2) **manda la edad**.

## Qué implementa (y dónde está la evidencia)

| Sección del modelo | Qué hace | Dónde |
|---|---|---|
| §2.2.9 | λ_subtipo = ln(n_subtipo/período + 1), período = min(edad del grupo, ventana del subtipo, Tabla 5) | `official_indicator.lambda_subtipo`, `recopilar_produccion` |
| §3.6 | PesoGlobal = ancla del subtipo (Tabla 6) × peso relativo (Anexo 1). Verificado con los tres ejemplos del modelo: ART_A2 = 100×5,5 = 550; CAP_LIB_B = 60×8 = 480; PA1 = 500×10 = 5000 | `official_indicator.construir_catalogo` |
| §3.7 | Las seis clases de medición: TOP, A, B, ASC, DPC, FRH-A, FRH-B | `official_indicator.CLASES` |
| §3.8.1 | Ind_Clase = Σ λ_subtipo × PesoGlobal_subtipo | `official_indicator.recopilar_produccion` |
| §2.2.10.1 | Cohe = (Σ autores del grupo por producto GNC+DTI / productos) − 1 | idem |
| §2.2.10.2 | Coop = (Σ grupos relacionados por producto GNC+DTI / productos) − 1 | idem |
| §3.9 | índice = valor / máximo del indicador **en la población de grupos** | `official_indicator.evaluar_poblacion` |
| §3.10 | Ind.Grupo = 3,7·Nc.Top + 2,3·Nc.A + 0,4·Nc.B + 1,5·AP + 0,5·DPC + 1·Fr.A + 0,2·Fr.B + 0,1·Cohe + 0,3·Coop | idem |

El catálogo de referencia es `database/catalog_2024.json` (familias, subtipos,
categorías de calidad con su peso relativo y su peso global).

## Resultado con los datos reales (cierre 2026)

Población medida: los 2 grupos del repositorio (AITICE #10 y GISICO #35).

| Grupo | Edad | Ind.Grupo oficial | Cohe | Coop | Aporta |
|---|---|---|---|---|---|
| AITICE (#10) | 54 años | **0,854103** (puesto 1) | 123/97 − 1 = 0,2680 | 121/97 − 1 = 0,2474 | LIB_DIV (DPC), TM_B y TP_B (FRH-B), IFI (DPC) |
| GISICO (#35) | 30 años | **0,547920** (puesto 2) | 124/74 − 1 = 0,6757 | 122/74 − 1 = 0,6486 | TM_B y TP_B (FRH-B), IFI (DPC) |

Los índices Nc.Top, Nc.A, Nc.B, AP y Fr.A valen 0 porque **ningún producto del
dataset tiene calidad oficial verificable** (A1–A3, B, C de Publindex, cuartil
Q1–Q3 o categoría A de una dirección): la fuente GrupLAC no la trae. Los
términos que sobreviven son DPC, Fr.B y los relacionales Cohe/Coop.

Corolario: el `i_grupo` legacy **no es comparable con el oficial** ni con otras
convocatorias; el oficial sí tiene escala (0–10) y es el que §3.9 define.

## Supuestos documentados (lo que NO se inventa)

1. **Edad del grupo**: GrupLAC no publica fecha de fundación en el dataset; se
   usa la fecha declarada si el repositorio la trae y, si no, el primer año
   plausible de producción registrada.
2. **Calidad de las direcciones de trabajo (TP/TM)**: se asume **B** — la
   fuente no evidencia la "categoría A" de la dirección.
3. **Artículos en revista especializada**: quedan **fuera** de los indicadores de
   producción (su calidad A1–D depende de Publindex/Scimago). Pero §2.2.10 es
   **relacional**, no de calidad: esos productos sí cuentan para Cohe/Coop.
4. **Normalización §3.9**: contra la población cargada en el repositorio; el
   modelo oficial exigiría *todos* los grupos del área OCDE.
5. **Coop**: solo cuentan los firmantes con investigador vinculado en el
   repositorio; los autores externos no aportan grupos (no hay afiliación).
6. **Ventana de notas científicas**: el OCR de la Tabla 5 no la preserva (5 años).

Todo producto que no puede clasificarse se **excluye con motivo explícito**
(histograma `excluidos` en la respuesta y en el reporte), nunca con categoría
inventada.

## Límites conocidos

- El modelo oficial completo (catálogo de 70 subtipos, Tabla 5 de ventanas y
  Anexo 1 de pesos) está en `database/catalog_2024.json`; el dataset real solo
  alcanza para 4 subtipos con calidad verificable (LIB_DIV, IFI, TP_B, TM_B).
- El indicador a nivel de **investigador** (`I_Investigador`) sigue siendo el
  del evaluador legacy; el modelo oficial de grupo no lo define.
- La normalización depende de qué grupos estén cargados: con un subconjunto de
  la población, los índices §3.9 cambian.
