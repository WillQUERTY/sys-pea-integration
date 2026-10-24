# P0 — Panel del indicador oficial (vars. de entrada/salida + peso relativo)

> **Estado:** **IMPLEMENTADO el 2026-10-24** (Opción A: solo UI). Las dos
> secciones existen en los dos paneles, los 6 tests nuevos están en verde y los
> cuatro comandos de control (contrato + paridad Python↔C++) no cambian de
> salida: **cero diff** en golden, tipo TS y fixtures.
> **Alcance:** app React (panel oficial de grupo + panel de adaptación individual).
> **Relación con el entregable:** los dos P0 son requisitos **literales** del
> enunciado del Parcial 2, no adornos del panel.
> **Implementación y evidencia:** `docs/indicador-oficial-2024.md` § «El panel:
> la cadena de §3.6 y el catálogo de variables (P0‑1 / P0‑2)».

---

## 0. Por qué son P0 y no mejoras

El enunciado (`docs/Parcial 2 EdD (2026-10-19).md`) pide dos cosas que hoy
solo existen en el entregable `.py/.cpp`, no en la app:

| Punto del enunciado | Qué exige | Dónde está hoy |
|---|---|---|
| **6** | las **variables de entrada y salida** del modelo | solo en `Taller2_WP-DN-EO.py:439-441` / `:123-134` / `:475-477`; la app solo muestra "Supuestos del cálculo" (supuestos del **método**, no variables del modelo) |
| **2** | **valor en puntos y peso relativo por producto** | el dato viaja en la API pero la UI solo imprime `peso_global` (el **producto final**), ocultando la cadena `ancla × peso relativo` de §3.6 |

Veredicto de la revisión: **los dos son cambios de UI, no de contrato.** El
dato ya está en el payload de Python, en el JSON de C++, en el contrato único,
en el golden y en el tipo TS generado. Lo que falta es mostrarlo.

> Las secciones 1, 2 y 4 de este documento son el **plan tal como se redactó
> antes de implementar**; el estado final (qué quedó exactamente) está en
> §5 y en `docs/indicador-oficial-2024.md` § «El panel: la cadena de §3.6 y el
> catálogo de variables (P0‑1 / P0‑2)».

| | P0‑2 · peso relativo | P0‑1 · vars. entrada/salida |
|---|---|---|
| ¿Toca el contrato? | **No** | **No** (Opción A) |
| ¿Toca Python / C++? | No | No (Opción A) |
| ¿Regenera golden / tipo TS / fixture? | No | No (Opción A) |
| ¿Rebuild de `core_cpp`? | No | No (Opción A) |
| ¿Rompe la paridad Python↔C++? | No | No (Opción A) |
| Radio (GitNexus `impact` upstream) | LOW · 1 importador directo | LOW · 1 importador directo |
| Esfuerzo estimado | ~1 h | ~2 h |

**Orden de ejecución (propuesto):** 1) variables entrada/salida (P0‑1, la más
visible para la sustentación) o al revés si se tiene poco tiempo; 2) peso
relativo; 3) tests; 4) `docs/indicador-oficial-2024.md`.

---

## 1. P0‑2 — Peso relativo por producto (§3.6)

### 1.1 El dato ya existe en toda la cadena

| Capa | Ubicación | Qué emite |
|---|---|---|
| Python (fuente) | `backend/app/evaluator/official_indicator.py:115-119` | `peso_global()` = `ancla_subtipo × peso_relativo` (§3.6) |
| Python (payload) | `backend/app/evaluator/official_indicator.py:358-360` | `"ancla_subtipo"`, `"peso_relativo"`, `"peso_global"` por subtipo |
| Contrato único | `backend/app/evaluator/contrato_oficial.py:96-98` | `"ancla_subtipo": "number\|null"`, `"peso_relativo": "number"`, `"peso_global": "number"` |
| C++ (espejo) | `core_cpp/src/services/official_indicator.cpp:908-910` y `:1228-1230` | las mismas tres claves (JSON y CLI) → **paridad intacta** |
| Tipo TS generado | `frontend/web-react/src/lib/api/contrato-oficial-2024.generated.ts:38-40` | `ancla_subtipo: number \| null`, `peso_relativo: number`, `peso_global: number` |
| Contrato individual | `frontend/web-react/src/lib/api/contrato-individual-2024.generated.ts` | idénticas tres claves (mismo generador, misma forma) |

Valores reales (golden del grupo 10):

```
LIB_DIV  peso rel. 10,0  ×  ancla 100  =  peso global 1000  →  término 182,32
TM_B     peso rel.  5,0  ×  ancla  70  =  peso global  350  →  término  63,81
```

### 1.2 Qué muestra la UI hoy

`frontend/web-react/src/components/charts/official-indicator-panel.tsx:464-536`
— tabla "Subtipos que aportan (§2.2.9 → §3.8.1)":

```
Subtipo | N | Ventana | λ | Peso | Término
```

- `Peso` → `entero(sub.peso_global)` (línea **516**) — solo el resultado.
- pie de tabla (líneas 532-535): *"λ = ln(productos / ventana + 1) (§2.2.9);
  término = λ × peso global (§3.6)."*

El panel individual tiene la **misma tabla** en
`researcher-official-adaptation-panel.tsx:511` (columna `Peso` en la línea 530)
→ el cambio va en los dos paneles o en ninguno.

### 1.3 Diseño propuesto

Reemplazar la columna única `Peso` por la **cadena de §3.6 explícita**:

| Columna | Origen | Formato |
|---|---|---|
| `Peso rel.` (Anexo 1) | `sub.peso_relativo` | `numero(valor, 1)` → `10,0` · `9,5` · `3,5` |
| `Ancla` (Tabla 6) | `sub.ancla_subtipo` | `entero(valor)` o **`—`** si es `null` |
| `Peso global` (§3.6) | `sub.peso_global` | `entero(valor)` (o `—` si `ancla` es `null`) |
| `Término` (§3.10) | `sub.termino` | `numero(valor, 2)` (ya existe) |

Pie de tabla actualizado:

> λ = ln(productos / ventana + 1) (§2.2.9) · **Peso global = peso relativo
> (Anexo 1) × ancla del subtipo (Tabla 6)** (§3.6) · término = λ × peso global.

Alternativa de una sola columna (si la tabla queda muy ancha en móvil):
`Peso (rel. × ancla)` mostrando `10,0 × 100 = 1000` en una celda.

### 1.4 ⚠️ Trampas (no saltarse)

1. **`ancla_subtipo` puede ser `null`.** El C++ lo emite como `null` cuando el
   subtipo no tiene ancla en Tabla 6 (`official_indicator.cpp:908`:
   `d.ancla_subtipo < 0 ? "null" : ...`). La UI debe pintar **`—`**, nunca `0`
   (pintar 0 diría "no aporta nada" cuando en realidad es "no se puede ponderar";
   en Python el caso equivalente es la exclusión *"subtipo '%s' sin ancla en
   Tabla 6: peso no calculable"*, `official_indicator.py:334-335`).
2. **`peso_relativo` tiene decimales**: usar `numero(v, 1)`, **nunca** `entero()`
   (el `entero()` redondearía 9,5 → 10 y 3,5 → 4, falseando el catálogo).
3. El `numero()`/`entero()` existentes (`official-indicator-panel.tsx:72-82`)
   ya hacen locale `es-CO` → coma decimal. Reutilizarlos, no reimplementar.
4. El panel individual reutiliza los mismos helpers (verificar si están
   duplicados o importables; si están duplicados, extraer a un módulo
   compartido en `frontend/web-react/src/components/charts/`).

### 1.5 Archivos a tocar

- `frontend/web-react/src/components/charts/official-indicator-panel.tsx`
- `frontend/web-react/src/components/charts/researcher-official-adaptation-panel.tsx`
- `frontend/web-react/src/components/charts/official-indicator-panel.test.tsx`
- `frontend/web-react/src/components/charts/researcher-official-adaptation-panel.test.tsx`
- `docs/indicador-oficial-2024.md` (sección del panel)

---

## 2. P0‑1 — Variables de entrada y salida del modelo

### 2.1 Qué hay hoy

`official-indicator-panel.tsx:637-654` → sección **"Supuestos del cálculo"**
(las strings `modelo.supuestos`, idénticas en Python y C++). Son **supuestos
del método**, no el catálogo de variables: el enunciado (punto 6) y el
entregable (`Taller2_WP-DN-EO.py:439-441` entradas, `:123-134` salidas,
`:475-477` entradas individuales) piden el catálogo.

### 2.2 Decisión de diseño: ¿dónde se declara?

| | **Opción A — en la UI (recomendada)** | Opción B — en el contrato |
|---|---|---|
| Qué | sección nueva en los dos paneles, derivando de `modelo` + `summary` opcional | el evaluador publica objetos `entradas` / `salidas` |
| Riesgo | **nulo** | alto: Python+C++ idénticos → golden → tipo TS → fixtures → **rebuild C++** → re-verificar paridad |
| Ganancia | el panel se autodocumenta | el modelo es autosuficiente (también lo llevaría el CLI `--json`) |
| Esfuerzo | bajo | medio-alto |
| Reversibilidad | total | requiere ciclo de deprecación del contrato |

**Se recomienda A**, y escribirla de modo que **B sea aditivo** más adelante:
la UI lee `modelo.entradas` si algún día existe y, si no, deriva localmente.

> Motivo de fondo: el lunes hay plazo de entrega y el contrato gemelo es
> justamente donde vive el riesgo (dos scripts de paridad + dos contratos
> + un rebuild de MSVC). No se toca.

### 2.3 Mapeo de ENTRADAS (grupo)

| Variable | Origen en el payload |
|---|---|
| Grupo (id, identificación, edad en años) | `modelo.grupo.id`, `.identificacion`, `.edad_anos` |
| Año de cierre | `modelo.anio_cierre` |
| Población de normalización | `modelo.poblacion.length` → `modelo.maximos_poblacion` |
| Productos por subtipo (n) y su ventana | `modelo.subtipos[].n`, `.periodo` |
| Ancla (Tabla 6) y peso relativo (Anexo 1) | `modelo.subtipos[].ancla_subtipo`, `.peso_relativo` |
| Cohe: suma de autores coincidentes / productos | `modelo.cohe.suma_autores`, `.productos` |
| Coop: suma de grupos relacionados / productos | `modelo.coop.suma_grupos`, `.productos` |
| Conteos crudos por clase (Nc.Top, Nc.A, Nc.B, AP, DPC, Fr.A, Fr.B) | `summary.top_count`, `type_a_count`, `type_b_count`, `asc_count`, `dpc_count`, `frh_a_count`, `frh_b_count` |
| Integrantes · productos totales · en ventana · antigüedad | `summary.total_members`, `total_products`, `products_in_window`, `years_active` |

### 2.4 Mapeo de SALIDAS (grupo)

| Salida | Origen en el payload |
|---|---|
| Índices normalizados por término (§3.9) | `modelo.indices` |
| Términos ponderados (§3.10) | `modelo.terminos_ponderados` |
| Ind_Clase por clase (§3.8.1) | `modelo.ind_clase` |
| Ind.Grupo + rango teórico | `modelo.ind_grupo`, `modelo.rango_teorico` |
| Puesto / percentil en la población | `modelo.posicion_poblacion.{puesto,de,percentil}` |
| Exclusiones con motivo (§3.6) | `modelo.excluidos`, `modelo.sin_ano`, `modelo.fuera_de_periodo` |

### 2.5 Investigador (gemelo)

Mismo esquema con `adaptacion_individual_2024`:
- `adaptacion.investigador.{id, identificacion, antiguedad_anos}` (la antigüedad
  ocupa el lugar de la edad del grupo);
- `adaptacion.subtipos[]`, `.indices`, `.terminos_ponderados`, `.ind_clase`,
  `.ind_investigador`, `.rango_teorico`, `.posicion_poblacion`, `.excluidos`,
  `.sin_ano`, `.fuera_de_periodo`;
- conteos crudos desde `summary` de `/researchers/{id}/indicator`
  (`backend/app/evaluator/__init__.py:96-113`: `total_products`,
  `products_in_window`, `top_count`, `type_a_count`, `type_b_count`,
  `asc_count`, `dpc_count`, `frh_a_count`, `frh_b_count`, …).

**Nota de tipos (workaround, no cambio de contrato) — HECHO:**
`ResearcherIndicator` (`frontend/web-react/src/lib/api/analytics.ts`)
**no declaraba `summary`**, aunque el backend sí lo envía. Se **añadió** el
campo a esa interfaz (es una interfaz escrita a mano, NO el tipo generado) y
se pasó `indicator?.summary` al panel
(`frontend/web-react/src/features/researchers/components/tabs/researcher-analytics-tab.tsx`).

### 2.6 ⚠️ Trampa de honestidad rotulable

El enunciado nombra las salidas con la terminología **legacy**
(`Nc.Top`, `Nc.A`, `Nc.B`, `AP`, `DPC`, `Fr.A`, `Fr.B`) y **el panel oficial usa
la del modelo** (§3.10: índices normalizados y términos ponderados). La sección
**no puede mezclar las dos cosas**:

> **Conteo crudo** = clasificación *no oficial* (heredada de la clasificación
> previa) — **valor en puntos** = índice normalizado §3.9 / término §3.10.

Los conteos crudos (legacy) y los valores en puntos (oficial) son magnitudes
incomparables: el legacy suma conteos crudos (AITICE = 491,7) y el oficial
normaliza contra el máximo de la población (AITICE = 0,815). Si se muestran en
la misma columna sin rótulo, el panel **miente**. Documentar esta diferencia
exactamente como ya se hace en el panel individual.

### 2.7 Archivos a tocar (Opción A)

- `frontend/web-react/src/components/charts/official-indicator-panel.tsx`
  (prop opcional `summary?: MincienciasGroupDiagnosis['summary']`)
- `frontend/web-react/src/features/groups/components/tabs/group-analytics-tab.tsx:217-219`
  (pasar `mincienciasDiagnosis.summary`)
- `frontend/web-react/src/components/charts/researcher-official-adaptation-panel.tsx`
  (prop opcional `summary`)
- `frontend/web-react/src/features/researchers/components/tabs/researcher-analytics-tab.tsx:164-166`
- `frontend/web-react/src/lib/api/analytics.ts:225-235` (declarar `summary` en
  `ResearcherIndicator`)
- tests de los dos paneles + `docs/indicador-oficial-2024.md`

---

## 3. Radio de impacto (GitNexus, `impact` upstream, 2026-10-24)

### 3.1 Lo que dijo el grafo antes de implementar

| Símbolo (target tipo **archivo**) | Riesgo | Impactados | Importadores directos | Episteme |
|---|---|---|---|---|
| `official-indicator-panel.tsx` | **LOW** | 18 | 1 (`group-analytics-tab.tsx`) | exact |
| `researcher-official-adaptation-panel.tsx` | **LOW** | 18 | 1 (`researcher-analytics-tab.tsx`) | exact |

Ningún cambio propuesto tocaba símbolos de riesgo HIGH/CRITICAL.

### 3.2 Lo que dice el grafo después del re-index (`analyze --index-only`)

Al refrescar el índice (7.362 nodos · 17.429 aristas · 419 flujos) la consulta
`impact` upstream de **símbolo** devuelve **CRITICAL** para los dos paneles — y
también para los **cuatro símbolos nuevos** de `modelo-2024-comun.tsx`
(`EntradasSalidasModelo`, `numero`, `entero`, `Seccion`): **67 impactados /
58 "directos" y una lista de "llamadores" idéntica byte a byte**, que incluye
`main.tsx`, todas las rutas (`401/403/404/500/503`, `_public/*`, `admin/*`),
`core_cpp/src/persistence/db/db_entity_sync.cpp`,
`scripts/gen_contrato_oficial.py` y `backend/app/scraping/cvlac/parser.py`.

Eso es físicamente imposible: un componente React de un panel de gráficos no
lo «llama» un `.cpp` de persistencia. **El veredicto es un artefacto del
resolutor**, y está diagnosticado:

| Comprobación | Resultado |
|---|---|
| 4 símbolos **nuevos y sin relación** entre sí → misma lista de llamadores | artefacto confirmado |
| `context` del símbolo nuevo: `outgoing.accesses: navGroups, id, title, summary` | el símbolo se resuelve a un *hub* de accesos a campos, no al componente real |
| El log del analizador: `name-fallback resolution: 1050 call sites … 0 refused as impossible (guessed/refused by language: cpp 1050/0)` | resolución **por nombre, sin filtrar por lenguaje** |
| Símbolo de control `get_group_minciencias_diagnosis` | `UNKNOWN` / 0 → el resolutor **no** devuelve siempre un hub (el control es válido) |
| Logs del analizador: `668 candidate entry point(s) never ranked in`, `1581 callee(s) skipped at maxBranching` | la cobertura de **procesos** está truncada: la lista de procesos afectados es un **piso**, no un techo |

### 3.3 Verdad de campo (búsqueda de texto en todo el repo)

| Símbolo | Consumidores JSX reales |
|---|---|
| `OfficialIndicatorPanel` | **1** → `features/groups/components/tabs/group-analytics-tab.tsx:218` (+ tests) |
| `ResearcherOfficialAdaptationPanel` | **1** → `features/researchers/components/tabs/researcher-analytics-tab.tsx:165` (+ tests) |
| `modelo-2024-comun` | **2** → los dos paneles (únicos importadores) |

**Cómo leer el riesgo en este repo:** el veredicto `CRITICAL` de `impact` sobre
símbolos React/TS de este proyecto **no es accionable** (contaminación por
resolución por nombre). La cifra buena es la de la búsqueda de texto, y la
verificación buena es la de comportamiento: `vitest` 26 verde, `tsc -b` limpio,
`pytest` 235 verde y los cuatro comandos de contrato con **cero diff**.

---

## 4. Plan de pruebas

### Panel oficial (`official-indicator-panel.test.tsx` — 7 casos previos, **12** tras P0)

1. La tabla de subtipos **muestra** `peso_relativo` y `ancla_subtipo` de un
   subtipo conocido (ej. `LIB_DIV` → `10,0` y `100`; `data-testid="subtipo-LIB_DIV"`).
2. Un subtipo con `ancla_subtipo: null` renderiza **`—`** en la columna Ancla
   (y no `0`).
3. Existe una sección **"Entradas y salidas del modelo"** con la tabla de
   entradas (grupo, año, n por subtipo, cohe/coop) y la de salidas
   (índices, términos, Ind.Grupo, puesto/percentil).
4. La sección rotula explícitamente la diferencia **conteo crudo vs valor en puntos**.

### Panel individual (`researcher-official-adaptation-panel.test.tsx` — 10 casos previos, **14** tras P0)

5. El panel muestra `peso_relativo` / `ancla_subtipo` en su tabla de subtipos.
6. La sección de entradas/salidas del investigador usa `antiguedad_anos` y
   `ind_investigador`, y **conserva** el rótulo "NO oficial" + "Adaptaciones
   declaradas".

### Comandos de control (los mismos del plan oficial)

```
cd frontend/web-react && npx vitest run src/components/charts/official-indicator-panel.test.tsx \
                                 src/components/charts/researcher-official-adaptation-panel.test.tsx
python -X utf8 -m pytest backend/tests -q          # debe quedar 235 passed / 19 skipped
python -X utf8 scripts/gen_contrato_oficial.py --check     # CONTRATO AL DIA (no debe cambiar)
python -X utf8 scripts/gen_contrato_individual.py --check  # CONTRATO INDIVIDUAL AL DIA (no debe cambiar)
python -X utf8 scripts/pea_paridad_indicador.py --golden   # CONTRATO CONFIRMADO
python -X utf8 scripts/pea_paridad_individual.py --golden  # CONTRATO CONFIRMADO
```

**Resultado de la ejecución (2026-10-24):** vitest **26 passed** · pytest
**235 passed, 19 skipped** · los cuatro comandos de Python **sin cambio de
salida** (cero diff).

> Si P0 se implementa **solo** en la UI, ninguno de los cuatro comandos de
> Python/C++ debe cambiar de salida. Eso es el criterio de aceptación del
> "no tocamos el contrato": **cero diff** en golden, tipo TS y fixtures.
>
> Recordar: 2 archivos de vitest fallan por el **toolchain del entorno**, no
> por el código (`src/hooks/use-table-url-state.test.ts` y
> `src/lib/handle-server-error.test.ts`).

> ⚠️ **Trampa de locale (es-CO) encontrada al implementar:** `entero(2026)`
> devuelve `"2.026"` (separador de miles) y `entero(1000)` devuelve
> `"1.000"`. El **año de cierre no es una cantidad**: se imprime con
> `String(modelo.anio_cierre)` → `"2026"`. El `Peso global` (1.000) sí es
> una cantidad y por eso se muestra con punto de miles; los tests lo
> verifican con `/1\.000|1000/`.

---

## 5. Checklist de ejecución (✅ los 11 puntos, 2026-10-24)

- [x] P0‑1 sección "Entradas y salidas del modelo" en el panel de **grupo**
      (`official-indicator-panel.tsx`, prop `summary`)
- [x] P0‑1 sección equivalente en el panel **individual** (con `antiguedad_anos`)
      (`researcher-official-adaptation-panel.tsx`, prop `summary`)
- [x] `analytics.ts`: declarar `summary` en `ResearcherIndicator`
      (+ interfaz **escrita a mano** `ResearcherIndicatorSummary`; el tipo
      generado del contrato no se toca)
- [x] P0‑2 columna `Peso rel.` + `Ancla` + `Peso global` en panel de grupo
      (`numero(v,1)` · `entero(v)`/«—» · `entero(v)`/«—»)
- [x] P0‑2 misma columna en panel individual (con `null` → `—`)
- [x] Pie de tabla con la cadena §3.6 explícita
      («Peso global = peso relativo (Anexo 1) × ancla del subtipo (Tabla 6) (§3.6)»)
- [x] Tests nuevos (los 6 del plan) en verde — **26 passed** en los dos paneles
      (12 de grupo + 14 de individuo)
- [x] `docs/indicador-oficial-2024.md` actualizado (sección del panel)
- [x] `python -X utf8 scripts/gen_contrato_oficial.py --check` →
      `gen_contrato_individual.py --check` → **cero diff**
      (`CONTRATO AL DIA` ×2) y paridad `CONTRATO CONFIRMADO` ×2
- [x] `pytest backend/tests -q` → **235 passed, 19 skipped** (sin cambios)
- [x] `gitnexus detect_changes({scope: "all"})` ejecutado y **triado** antes de
      commitear: 15 archivos · 113 símbolos · 416 flujos afectados · riesgo
      `critical`. Los 416 flujos apuntan a un **único** símbolo cambiado,
      `parse_markdown_and_build_doc` (`docs/word/build_word_doc.py`, cambio
      **previo**, del pipeline de Word), ninguno a los paneles. Ver §3.2 para
      el diagnóstico del veredicto y §3.3 para la verdad de campo.

### Piezas añadidas por la implementación

- `frontend/web-react/src/components/charts/modelo-2024-comun.tsx` — **fuente
  única compartida** por los dos paneles (constantes, `numero`/`entero`,
  `Barra`, `Seccion` y el componente `EntradasSalidasModelo`). Evita que la
  cadena §3.6 y el catálogo de entradas/salidas se desincronicen entre paneles.
  Trae `/* eslint-disable react-refresh/only-export-components */` con su
  justificación (misma convención que los `*-provider.tsx` del repo).
- `frontend/web-react/src/lib/api/analytics.ts` — `ResearcherIndicatorSummary`
  (manually written, **no** generado): el contrato único no cambia.
- Nota de honestidad en la UI: los conteos crudos (clasificación previa,
  **no oficial**) y los valores en puntos (§3.9/§3.10, **oficial**) viven en
  **bloques separados** (`Entradas` / `Salidas`) y la sección cierra con el
  aviso de magnitudes incomparables (`data-testid="nota-conteo-vs-puntos"`).

## 6. Fuera de alcance (deliberadamente)

- **No** tocar `backend/app/evaluator/contrato_oficial.py` ni
  `contrato_individual.py` (ni sus goldens, tipos TS o fixtures).
- **No** tocar `core_cpp/` (paridad ya intacta).
- **No** tocar `Taller2_WP-DN-EO.py` / `.cpp` (entregable del Parcial 2).
- **No** tocar `i_grupo_legacy` / `i_investigador_legacy` (deprecados pero
  vigentes; la deuda vive en `docs/plan-integracion-modelo-oficial.md`).
- **No** automatizar el cruce ISSN→Publindex (B8: pendiente de validación humana).
