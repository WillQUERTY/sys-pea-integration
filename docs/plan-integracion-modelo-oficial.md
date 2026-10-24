# Plan de integración del modelo oficial Minciencias 2024 — arquitectura principal

> Alcance: **core_cpp (C++) + backend FastAPI (Python) + frontend React** del
> sistema PEA-i. **Quedan fuera** los entregables del Parcial 2 (`Taller2.*`,
> ya auditados en `docs/deuda_cumplimiento_parcial2.md`) y el backend Java,
> que es otro repositorio y otra línea de trabajo.
>
> Documento complementario de `docs/indicador-oficial-2024.md` (que describe
> **cómo está implementado** el modelo). Este describe **qué falta para que
> la arquitectura principal esté integrada de punta a punta** y en qué orden
> atacarlo.
>
> Corte: **2026-10-23**, con las **Fases 1, 2, 3 y 4 aplicadas y verificadas**
> (build, vitest, pytest, ctest, eslint y contrato real de la API). Verificado
> leyendo el código y ejecutando el CLI, el script de paridad (clásico y
> `--golden`), el modelo sobre `pea_data.json` y las suites de `backend`,
> `core_cpp` y `frontend`.
>
> ⚠️ Este documento **no está versionado todavía** (`?? docs/plan-integracion-modelo-oficial.md`).

---

## 1. Veredicto

**En la arquitectura principal, el indicador de GRUPO ya está integrado de punta
a punta: C++ → Python → API → React.** Lo que falta ya no es "que el número
llegue a la pantalla" — eso está hecho y auditado: la tarjeta muestra el
oficial como titular, el legacy rotulado como referencia, y hay un panel con
el desglose completo de §3.10 que hace el número auditable término a término.

Lo que queda abierto es otro orden de cosas:

- la **deprecación explícita** del legacy (B5),
- la **decisión de modelo** para el investigador (B3),
- la **calidad de los datos** que no activa las clases TOP/A/B (B8).

Lo que **ya no** queda abierto (Fases 3 y 4, aplicadas el 2026-10-23):

- el **contrato verificable** entre las tres implementaciones (B7): hay un
  contrato único declarado del que se derivan el golden, el tipo TS y el
  fixture del frontend;
- el **test unitario** del modelo oficial en C++ (B6): 8 casos y 151
  aserciones sobre el caso sintético, ejecutados por `ctest`.

Lo que se corrigió en esta línea: la tarjeta rotulaba como "Minciencias 2024"
un indicador legacy de conteos crudos (491,704 en AITICE) que el modelo no
define, mientras el oficial (0,854) quedaba invisible detrás de él.

| Capa | Estado oficial | Nota |
|---|---|---|
| Core C++ (`official_indicator.cpp`) | ✅ Completo | §2.2.9 → §3.10, catálogo generado desde el backend |
| CLI C++ (`indicator group`) | ✅ Completo | Imprime **solo** el oficial (Fase 6: el legacy ya no se calcula en el CLI) |
| Backend Python | ✅ Completo (grupo) | `official_indicator.py` + `official_population.py` |
| API (`/groups/{id}/minciencias-diagnosis`) | ✅ Expone el bloque | Clave aditiva `modelo_oficial_2024`, sin romper lo legacy |
| **Frontend React** | **✅ Integrado (Fases 1–3)** | Titular oficial + panel de desglose; el legacy queda como referencia rotulada; el tipo y el fixture del panel son **generados** desde el contrato |
| **Contrato único (B7)** | **✅ Implementado (Fase 3)** | `CONTRATO` declarado en `backend/app/evaluator/contrato_oficial.py`: de ahí salen el golden, el tipo TS y el fixture del panel |
| **Test C++ del modelo (B6)** | **✅ Implementado (Fase 4)** | `core_cpp/tests/test_official_indicator.cpp`, registrado en `ctest` como `indicador_oficial` |
| **Contrato HTTP (Fase 6)** | **✅ Implementado** | `backend/tests/test_indicador_oficial_http.py`: el payload que sale por HTTP cumple el golden del contrato |
| Nivel investigador | ⚠️ Rótulo honesto (provisional) | `I_Investigador` legacy, rotulado "adaptación §10.6 sobre conteos (no oficial)"; falta decidir el modelo (D5) |
| Datos que alimentan §3.7/§3.8 | ⚠️ Parcial | GrupLAC no trae calidad A1–D → `Nc.Top/A/B = 0` siempre (ahora **visible** en el panel) |

### Estado de las fases

| Fase | Alcance | Estado |
|---|---|---|
| **Fase 1** | Rotulación honesta (B1, B4 parcial, D2) | ✅ **Implementada y verificada** (2026-10-23) |
| **Fase 2** | Lectura oficial en la UI + desglose auditable (B2, B8-visibilidad) | ✅ **Implementada y verificada** (2026-10-23) |
| **Fase 3** | Contrato único / golden JSON (B7) | ✅ **Implementada y verificada** (2026-10-23) |
| **Fase 4** | Test unitario del modelo oficial en C++ (B6) | ✅ **Implementada y verificada** (2026-10-23) |
| **Fase 5** | Investigador (B3, D5) | ⏸️ En espera de la decisión D5 (aplicado solo el rótulo interino de la Fase 1) |
| **Fase 6** | Deprecación del legacy (B5) | ✅ **Implementada y verificada** (2026-10-23) |

---

## 2. La cadena de la fórmula y dónde vive

| Sección | Qué hace | Python | C++ |
|---|---|---|---|
| §2.2.9 | λ_subtipo = ln(n/periodo + 1) | `official_indicator.lambda_subtipo` | `official::lambda_subtipo` |
| §3.6 | PesoGlobal = ancla × peso relativo | `official_indicator.construir_catalogo` | `catalog_2024_generated.h` (**generado**, no reimplementado) |
| §3.7 | Clases TOP/A/B/ASC/DPC/FRH-A/FRH-B | `official_indicator.CLASES` | `official::` equivalente |
| §3.8.1 | Ind_Clase = Σ λ × PesoGlobal | `official_indicator.recopilar_produccion` | idem |
| §2.2.10.1 | Cohe = (Σ autores grupo / productos GNC+DTI) − 1 | idem | idem |
| §2.2.10.2 | Coop = (Σ grupos relacionados / productos) − 1 | idem | idem |
| §3.9 | índice = valor / máximo en la **población** de grupos | `official_indicator.evaluar_poblacion` | `official::evaluar_poblacion` |
| §3.10 | Ind.Grupo = Σ coef × índice | idem | idem |

Lo que **NO** es el modelo oficial (y por eso no debe rotularse como tal):
`backend/app/evaluator/metrics_collector.py:177-193` (grupo) y `:356-369`
(investigador) suman **conteos crudos** con los mismos coeficientes: no hay λ,
no hay pesos globales, no hay normalización §3.9 y la calidad se deduce por
subcadenas de la descripción en vez de usar el catálogo oficial.

---

## 3. Estado verificado (con evidencia ejecutada)

### 3.1 Paridad C++ ↔ Python — confirmada hoy

```
$ python -X utf8 scripts/pea_paridad_indicador.py
[OK] grupo 10: paridad exacta (Ind.Grupo = 0.8541030927835052, puesto 1/2)
[OK] grupo 35: paridad exacta (Ind.Grupo = 0.5479201551398108, puesto 2/2)
PARIDAD CONFIRMADA: CLI C++ = backend Python (mismo Ind.Grupo).
```

### 3.2 Los dos números conviven para el mismo grupo

Grupo AITICE (#10) sobre `pea_data.json` (2 grupos, 166 investigadores,
1.778 productos). Lectura contra la API real (`GET /api/v1/groups/10/minciencias-diagnosis`
con `USE_DATABASE=false`, 2026-10-23):

| Lectura | Valor | Escala | Dónde |
|---|---|---|---|
| **Oficial** | **0,8541030927835052** | Rango teórico 0–10, normalizado contra la población | `modelo_oficial_2024.ind_grupo` (API) / `official::evaluar_modelo_oficial` (CLI) |
| Legacy (API) | 491,704 | Sin escala (conteos crudos) | `i_grupo_legacy` del diagnóstico → **lo que veía el usuario en React** |

⚠ **Antes de la Fase 6 había DOS legacies distintos**: el CLI calculaba
36,00 y la API 491,704 para el mismo grupo, porque el CLI aproximaba la
calidad por `quality_category_id` y el backend la deduce del texto de la
descripción con ventanas propias. Dos "referencias legacy" para la misma cifra
es la brecha B5 (tres implementaciones del cálculo) hecha visible.
**Resuelto en la Fase 6:** el CLI ya **no** calcula el legacy (solo el oficial)
y la API lo expone como `i_grupo_legacy`, rotulado como aproximación. Hoy hay
**una sola** implementación legacy, la que alimenta el semáforo.

Además, **el número depende del dataset y de la población cargados**: con la
BD real completa el legacy da 491,7 y con `pea_data.json` (2 grupos) el
percentil no es interpretable. Solo el oficial tiene escala; la comparación
entre grupos solo es válida con la misma población y el mismo año de cierre.

### 3.3 Lo que la API entrega y la UI ya consume

> **Actualizado tras la Fase 2 (2026-10-23).** El párrafo que decía "cero
> componentes lo leen" describe el estado **anterior**; se conserva como
> registro de la brecha que cerró la Fase 2.

El endpoint [groups.py:183](backend/app/api/routers/groups.py#L183) devuelve, por
grupo, el bloque completo con: `ind_grupo`, `rango_teorico`,
`posicion_poblacion` (puesto, percentil), `poblacion` (ranking completo),
`indices` (los 9 de §3.10), `terminos_ponderados`, `ind_clase`,
`maximos_poblacion`, `cohe`, `coop`, el desglose por subtipo (con `lambda`,
`peso_global`, `ancla_subtipo`), los histogramas de **exclusiones** y los
**supuestos** del modelo.

**Antes de la Fase 2**, `modelo_oficial_2024` aparecía **solo** en
[analytics.ts:119-153 y :162](frontend/web-react/src/lib/api/analytics.ts#L119-L162)
como declaración de tipo. `grep -rn "modelo_oficial_2024" frontend/web-react/src`
→ 3 líneas, todas en el mismo archivo de tipos. **Cero componentes lo leían.**

**Ahora** el bloque lo consumen dos componentes de la pestaña de analítica del
grupo:

| Componente | Qué del bloque oficial muestra |
|---|---|
| [minciencias-diagnosis-card.tsx](frontend/web-react/src/components/charts/minciencias-diagnosis-card.tsx) | Titular `ind_grupo` (3 decimales) + "/ 10 rango teórico", puesto/percentil y cierre, aviso de población reducida; el legacy baja a línea secundaria rotulada |
| [official-indicator-panel.tsx](frontend/web-react/src/components/charts/official-indicator-panel.tsx) | El desglose auditable: los 9 términos de §3.10, índice por clase frente al máximo de la población, Cohe/Coop, subtipos que aportan, exclusiones, ranking de §3.9 y supuestos |

### 3.4 Dónde más aparece el número (o no)

| Superficie | ¿Muestra el indicador? |
|---|---|
| Tarjeta de diagnóstico (React) | **Sí — el oficial como titular**; el legacy como "aproximación legacy, no oficial" ([minciencias-diagnosis-card.tsx](frontend/web-react/src/components/charts/minciencias-diagnosis-card.tsx)) |
| Panel de desglose (React) | **Sí — el oficial, término a término** (§3.10 → §3.9 → §3.8.1 → §2.2.9) ([official-indicator-panel.tsx](frontend/web-react/src/components/charts/official-indicator-panel.tsx)) |
| Pestaña de investigador (React) | Sí — `i_investigador` legacy, rotulado "adaptación §10.6 sobre conteos (no oficial)" ([researcher-analytics-tab.tsx:130](frontend/web-react/src/features/researchers/components/tabs/researcher-analytics-tab.tsx#L130)) |
| KPI banners / radar de grupos | No usan el indicador (usan conteos y perfiles) |
| Dossier PDF (`/dossier/pdf`) | No numera el indicador; muestra categoría, meta de ascenso y brechas |
| Export CSV (`/export/ranking.csv`) | No incluye el indicador |
| PDF `/report/pdf` | No |

→ **La UI React es el único punto donde el número engaña.** Eso acota el
problema y también su arreglo.

---

## 4. Brechas

| # | Brecha | Impacto | Tamaño | Estado (2026-10-23) |
|---|---|---|---|---|
| **B1** | La tarjeta rotula el legacy como "I_Grupo (Minciencias 2024)" | **Alto**: es el número que ve el evaluador. 36,00 (legacy) vs 0,854 (oficial) conviven y el que se muestra es el que el modelo no define | Chico | ✅ **Cerrada** (Fase 1): titular = oficial; legacy = "referencia legacy, no oficial" |
| **B2** | La UI no tiene lectura del modelo oficial | Alto: se pierde el 100 % del payload oficial (ranking, percentil, 9 términos, subtipos λ/peso, exclusiones, supuestos) | Mediano | ✅ **Cerrada** (Fase 2): `OfficialIndicatorPanel` consume todo el bloque |
| **B3** | No hay modelo oficial a nivel de investigador | Medio-alto: el rótulo "Minciencias 2024, sección 10.6" sobre una fórmula de conteos crudos | Grande (requiere decisión de modelo) | ⚠️ **Mitigada**: rótulo honesto ("adaptación §10.6, no oficial"); el modelo oficial sigue pendiente de D5 |
| **B4** | La población de normalización no se expone | Alto: con 2 grupos el percentil no significa nada; el usuario no puede saber si el 0,854 es comparable | Chico-mediano | ✅ **Cerrada en la UI**: tarjeta muestra puesto/percentil, cierre, "N grupos" y avisa si < 10; el panel muestra el ranking completo de §3.9 |
| **B5** | Tres implementaciones del cálculo (oficial Python, oficial C++, legacy Python) + 2 copias en los entregables | Alto: ya se demostró una divergencia histórica (py 10,2 vs cpp 13,5) | Mediano (deprecación, no borrado) | ✅ **Cerrada** (Fase 6): `i_grupo` → `i_grupo_legacy` (una sola implementación legacy, la de la API, que alimenta el semáforo); el CLI ya no calcula un segundo legacy |
| **B6** | Cobertura de tests incompleta en el lado nuevo | Medio: el modelo oficial C++ no tiene test unitario (solo el script de paridad, que exige binario); el front no tiene test que verifique qué número ni qué rótulo se muestra | Mediano | ✅ **Cerrada** (Fases 2, 3 y 4): front cubierto (12 casos: 5 de la tarjeta + 7 del panel), contrato cubierto por 12 tests de Python y C++ cubierto por 8 casos / 151 aserciones (`pea_tests_indicador.exe`) |
| **B7** | El contrato JSON oficial está triplicado a mano (`resultado_a_json` C++, dict Python, tipo TS) | Medio: un campo nuevo se puede añadir en un lado y romperse en otro en silencio | Chico-mediano | ✅ **Cerrada** (Fase 3): un `CONTRATO` declarado del que se derivan el golden, el tipo TS y el fixture del panel |
| **B8** | Los datos no activan las clases TOP/A/B | Medio (contexto, no bug): la fuente GrupLAC no trae Publindex/Scimago, así que `Nc.Top = Nc.A = Nc.B = 0` y el indicador oficial solo mueve DPC, Fr.B, Cohe y Coop | Datos (+visibilidad) | ⚠️ **Visibilidad cerrada** (el panel muestra TOP/A/B en 0 y su máximo de población); **el dato no llega** y no depende del código |

### Detalle de las brechas que no son obvias

**B4 — la población ES parte del resultado.** §3.9 normaliza contra el máximo de
la **población de grupos del área OCDE**. El sistema normaliza contra los
grupos cargados en el repositorio. Con `pea_data.json` son 2; con la BD real
importada de GrupLAC son muchos más y **el mismo grupo da otro número**. Sin
exponer "población: N grupos / cierre: YYYY" en la UI, dos capturas de pantalla
de fechas distintas parecerán contradictorias (y lo serán).
→ **Ya resuelto en la UI** (Fases 1–2): la tarjeta muestra "Puesto X de N ·
cierre YYYY" y avisa cuando N < 10 ("la normalización §3.9 es débil"), y el
panel lista el ranking completo de la población. El riesgo que queda no es de
UI sino de proceso: publicar capturas y luego importar más grupos cambia el
número (§9).

**B5 — por qué deprecar y no borrar el legacy.** §3.9 y los tests actuales
dependen de su forma (`i_grupo_legacy`, `tiers`, semáforo), y el semáforo de
categorización es una funcionalidad aparte, valiosa y bien probada. Lo que se
debía **matar** era su adjetivo: "Minciencias 2024". La deprecación debía ser
explícita y visible (`i_grupo_legacy`, etiqueta "aproximación legacy, no
oficial"), no un borrado que rompiera el semáforo. Además había **dos legacies
distintos** (CLI 36,00 vs API 491,704 para el mismo grupo, ver §3.2).
→ **Resuelto en la Fase 6 (2026-10-23):** la clave se renombró
`i_grupo` → `i_grupo_legacy` en backend, frontend y tests; el rótulo de la UI
es "I_Grupo (aproximación legacy, no oficial)"; y el CLI **dejó de calcular su
propia versión** del legacy (que era la que divergía), de modo que hoy existe
una sola implementación legacy: la que alimenta el semáforo. Lo que quedó
intacto a propósito: el código del semáforo (`tier_rules.py`) y las dos copias
en los entregables (`Taller2_WP-DN-EO.*`), que son el entregable del parcial.

**B7 — un solo contrato.** Antes existía un verificador de paridad C++↔Python
(fuerte) pero no había contrato verificable contra la UI: el tipo TS era una
copia manual del dict Python. La forma barata de cerrarlo: un **golden JSON**
(versionado) que generen C++ y Python por separado, un test que compare ambos
contra el golden, y un tipo TS generado o, en su defecto, un test de contrato
que valide que el reporte de la API tiene las claves que el tipo declara.
→ **Resuelto en la Fase 3.** El test del panel (`official-indicator-panel.test.tsx`)
ya no usa un fixture escrito a mano: usa el **golden del contrato**, importado
como un `.ts` tipado contra la interfaz generada. El fixture inventado (un
`FRH-B` de 150,5 y un `ancla_subtipo` de 1000 que el dato real no tiene)
desapareció: los valores que la UI renderiza son los que el backend calcula
sobre el caso sintético.

---

## 5. Arquitectura objetivo (decisiones propuestas)

| # | Decisión | Estado |
|---|---|---|
| **D1** | **Regla de una sola fuente**: ningún número puede rotularse "Minciencias 2024" si no proviene de `modelo_oficial_2024` (o su equivalente C++) | ✅ **Cumplida** (Fases 1–2): el único número rotulado como oficial en la UI viene del bloque `modelo_oficial_2024` |
| **D2** | El legacy sobrevive como **"referencia (no oficial)"**, explícitamente rotulado, y nunca como titular del indicador | ✅ **Cumplida en la UI** (Fase 1); falta el renombrado de la clave y unificar los dos legacies (Fase 6) |
| **D3** | La UI oficial **muestra la población y el cierre** junto al número (puesto, percentil, "N grupos medidos") | ✅ **Cumplida** (Fases 1–2) |
| **D4** | **Contrato único**: golden JSON compartido por CLI C++ / API Python / tipado TS, validado por test | ✅ **Cumplida** (Fase 3): `CONTRATO` en `backend/app/evaluator/contrato_oficial.py` es la fuente; el golden, el tipo TS y el fixture del panel se derivan de él |
| **D5** | **Investigador**: (a) definir y documentar un I_Investigador oficial e implementarlo en py+cpp, o (b) bajar el rótulo a "adaptación §3.10 sobre conteos del grupo" y dejar el oficial solo en grupo | 🟡 **Provisionalmente (b)** en la Fase 1 (rótulo honesto + valor marcado como no oficial); falta la confirmación explícita del usuario |
| **D6** | El **catálogo** (`database/catalog_2024.json`) es la única fuente de subtipos/pesos/ventanas; el C++ lo genera, nunca lo reimplementa (ya cumplido con `gen_catalogo_cpp.py --check`) | ✅ Cumplido; falta el gate en CI |
| **D7** | El modelo oficial es **de grupo**; el de investigador es una adaptación declarada y separada | Pendiente de D5 |

---

## 6. Plan por fases (orden de ataque propuesto)

### Fase 1 — Rotulación honesta (B1, B4 parcial, D2)
Un día. **Empieza aquí**: es pequeño y elimina el riesgo de evaluación.

> **ESTADO: IMPLEMENTADA (2026-10-23).** Ver "Resultado de la Fase 1" al final
> de esta sección.

- `frontend/web-react/src/components/charts/minciencias-diagnosis-card.tsx`:
  - el bloque de la esquina pasa a titular **Ind.Grupo oficial** = `data.modelo_oficial_2024.ind_grupo` (con rango teórico y puesto/percentil),
  - el legacy baja a una línea secundaria rotulada **"I_Grupo (referencia legacy, no oficial)"**,
  - si `modelo_oficial_2024` **no** viene (el backend lo omite en `except`), la tarjeta debe mostrar el legacy con la etiqueta de referencia, nunca como oficial.
- `frontend/web-react/src/features/researchers/components/tabs/researcher-analytics-tab.tsx`:
  - rótulo según la decisión D5 (si es (b): "adaptación §3.10 — conteos del grupo").
- Mostrar **población y año de cierre** del bloque oficial.
- Verificación: `npm run build` + `npm run lint` + prueba manual sobre un grupo
  con y sin `modelo_oficial_2024`.

#### Resultado de la Fase 1 (2026-10-23)

| Cambio | Archivo |
|---|---|
| Titular = `modelo_oficial_2024.ind_grupo` (3 decimales) + "/ 10 rango teórico", línea de puesto/percentil y cierre, y aviso cuando la población < 10 grupos | `frontend/web-react/src/components/charts/minciencias-diagnosis-card.tsx` |
| El legacy pasa a línea secundaria rotulada **"I_Grupo (referencia legacy, no oficial)"**; si no llega la lectura oficial, se dice **"Lectura oficial no disponible para este grupo"** y no se muestra ninguna cifra rotulada como oficial | idem |
| Rótulo del investigador honesto: **"I_Investigador — adaptación §10.6 sobre conteos (no oficial)"** (interino, mientras se diseña el modelo oficial de investigador, decisión D5) | `frontend/web-react/src/features/researchers/components/tabs/researcher-analytics-tab.tsx` |
| Test nuevo que fija la regla (titular oficial, legacy como referencia, aviso de población, y que sin modelo oficial no hay cifra oficial) | `frontend/web-react/src/components/charts/minciencias-diagnosis-card.test.tsx` (5 casos) |
| Se quitó un import de tipo sin uso (`ResearcherIndicator`) que **ya rompía el build** (`TS6133`) en HEAD, verificado con la versión original del archivo | idem (investigador) |

Verificaciones: `npm run build` ✅ · `npm run test` → **10 archivos / 73 pruebas**
(antes 9/68) ✅ · `npx eslint` sobre los 3 archivos tocados → **0 problemas** ✅
(el lint global del repo sigue rojo por 46 errores **preexistentes** en
`src/features/validation-queue/index.tsx`, `src/lib/utils.ts` y otros: no los
introduce esta fase) · `detect_changes(scope=all)` limpio, sin `partial` ni
`truncated`; el `risk_level: high` del reporte viene de los símbolos del
entregable `Taller2_WP-DN-EO.cpp`, no del frontend (los dos componentes React
salen en **LOW**) · **smoke end-to-end contra la API real** (`USE_DATABASE=false`
+ `GET /api/v1/groups/10/minciencias-diagnosis`): el bloque `modelo_oficial_2024`
llega completo (ind_grupo, rango_teorico, posicion_poblacion, anio_cierre,
poblacion, indices, terminos_ponderados, ind_clase, cohe, coop, 4 subtipos,
14 exclusiones, 6 supuestos), o sea **el contrato que consume la tarjeta
existe y es el esperado**.

### Fase 2 — Lectura oficial en la UI (B2, B8)
Dos o tres días. La pieza visible que demuestra la integración.

> **ESTADO: IMPLEMENTADA (2026-10-23).** Ver "Resultado de la Fase 2" al final
> de esta sección.

- Nueva ficha/pestaña **"Indicador oficial 2024"** en la pestaña de analítica
  del grupo, alimentada por `data.modelo_oficial_2024` (ya está en el payload):
  - tarjeta principal: Ind.Grupo, rango teórico, puesto y percentil;
  - desglose de los 9 índices normalizados × coeficiente (§3.10) en barras;
  - Ind_Clase por clase con su máximo de población;
  - subtipos que aportan (λ, peso global, término) — **esto es lo que hace
    auditable el número**;
  - histogramas de **exclusiones** (por qué NO cuenta algo) y **supuestos** del
    modelo;
  - ranking de la población.
- Banner de contexto si la población es pequeña (< N grupos) → B4.
- Verificación: `npm run test` (vitest browser) + `npm run build`.

#### Resultado de la Fase 2 (2026-10-23)

**Decisión de alcance aplicada:** el desglose entró como una **tarjeta nueva
(`OfficialIndicatorPanel`) justo debajo de la tarjeta de diagnóstico**, dentro
de la pestaña de analítica del grupo — no como una pestaña más ni como un
desplegable dentro de la tarjeta existente. Motivo: la tarjeta ya tenía el
titular y el semáforo; el desglose es un bloque de lectura distinto (9
secciones) que merecía su propia superficie y su propio test.

| Cambio | Archivo |
|---|---|
| Nuevo panel con las 9 secciones del desglose: verificación de la suma de los 9 términos de §3.10 contra `ind_grupo` del backend, aporte de cada término con su coeficiente **derivado de los propios datos** (`término ÷ índice`, con la constante normativa como único respaldo), índice por clase frente al máximo de la población (§3.8.1 → §3.9) más Cohe/Coop, tabla de subtipos que aportan (λ, peso global, término), histogramas de exclusiones y supuestos del modelo, y ranking completo de la población con el grupo actual marcado | `frontend/web-react/src/components/charts/official-indicator-panel.tsx` (nuevo) |
| El panel se monta en la pestaña de analítica del grupo, debajo de la tarjeta de diagnóstico, solo si el backend entregó el bloque oficial | `frontend/web-react/src/features/groups/components/tabs/group-analytics-tab.tsx` |
| Export del panel en el barril de `components/charts` | `frontend/web-react/src/components/charts/index.ts` |
| 7 casos de test que fijan el comportamiento: la suma de términos reconstruye el Ind.Grupo ("suma verificada") y avisa cuando no cuadra ("discrepancia con el backend"), el coeficiente §3.10 se deriva de los datos, el valor de clase frente al máximo, exclusiones y subtipos, el grupo actual marcado en el ranking, y que sin modelo oficial no se renderiza nada | `frontend/web-react/src/components/charts/official-indicator-panel.test.tsx` (nuevo) |

Verificaciones: `npm run build` ✅ · `npm run test` → **11 archivos / 80
pruebas** (antes 10/73) ✅ · `npx eslint` sobre los 6 archivos tocados por las
Fases 1–2 → **0 errores nuevos** (quedan 2 preexistentes en
`group-analytics-tab.tsx`: `no-duplicate-imports` en la línea 25 y
`no-explicit-any` en la 34; ambos existen idénticos en HEAD) ·
`pytest backend/tests/test_official_indicator.py test_official_population.py
test_catalogo_cpp.py` → **39 passed** ✅ · el JSON real que produce el CLI
(`.tmp_paridad/cli_g10.json`, mismo contrato que la API) tiene **exactamente
las 20 claves** que el panel y el tipo TS leen, incluidos `ind_clase` con las 7
clases §3.7, `poblacion[]` con `{grupo, ind_grupo}` y `grupo.id` /
`grupo.identificacion` / `grupo.edad_anos` ✅

⚠ **Límite conocido de esta fase:** el fixture del test del panel está
**escrito a mano**, no generado desde el backend (inventa un `FRH-B` de 150,5 y
un `ancla_subtipo` de 1000 que el dato real no tiene). El panel está probado
como *componente*, pero el **contrato** sigue sin estar verificado: eso es
justamente la Fase 3.

### Fase 3 — Contrato único (B7) — ✅ Implementada
Dos días.

> **ESTADO: IMPLEMENTADA (2026-10-23).** Ver "Resultado de la Fase 3" al final
> de esta sección.

- Versionar un golden: `backend/tests/fixtures/indicador_oficial_golden.json`.
- Test Python que compare `evaluar_poblacion` contra el golden.
- Test de contrato de la API: que el JSON servido por
  `/groups/{id}/minciencias-diagnosis` tenga las claves que el tipo TS declara
  (o generando el tipo TS desde el golden).
- Extender `scripts/pea_paridad_indicador.py` para que también valide el golden
  (hoy compara C++↔Python, que es distinto de "ambos contra el contrato").
- **Extra**: reemplazar el fixture a mano del panel por el golden, para que el
  test de la UI y el de la API compartan la misma fuente de verdad.

#### Resultado de la Fase 3 (2026-10-23)

**Decisión de alcance aplicada:** el contrato no se triplica en tres archivos
sino que se **declara una vez** y de ahí se derivan los tres artefactos. Se
eligió un contrato declarativo (un `dict` que describe claves y tipos) en vez
de un `.json`/`.schema` externo porque así el validador Python, el generador
del tipo TS y el generador del fixture usan **el mismo código**: no hay dos
lectores del contrato que puedan discrepar.

El **caso sintético** (`backend/tests/fixtures/indicador_oficial_caso.json`) es
la entrada: 2 grupos, 4 subtipos que aportan, un producto sin año, uno fuera de
la ventana y 4 productos excluidos con **3 motivos** explícitos — los casos que
la UI y el C++ deben resolver igual.

| Cambio | Archivo |
|---|---|
| **Contrato único**: `CONTRATO` (20 claves raíz, con tipos), `AdaptadorJson` (replica el mapeo de `json_loader.cpp`), `comparar_indicadores` (recursivo, con tolerancia), `validar_contra_contrato` (detecta clave ausente y tipo equivocado), `contrato_a_ts`, `contenido_golden`, `contenido_fixture_ts`, `calcular_esperados` | `backend/app/evaluator/contrato_oficial.py` (nuevo) |
| Caso sintético de entrada (2 grupos, 178 productos, con los casos límite del modelo) | `backend/tests/fixtures/indicador_oficial_caso.json` (nuevo) |
| **Golden versionado**: contrato + expectativas calculadas sobre el caso sintético (cierre 2026) | `backend/tests/fixtures/indicador_oficial_golden.json` (nuevo, generado) |
| Generador/verificador de los tres artefactos: `--regenerar` los escribe, `--check` falla si hay drift | `scripts/gen_contrato_oficial.py` (nuevo) |
| Tipo `MincienciasOfficialModel2024` **generado** desde `CONTRATO` (20 miembros) | `frontend/web-react/src/lib/api/contrato-oficial-2024.generated.ts` (nuevo, generado) |
| Fixture **tipado** del panel: los dos payloads del golden, tipados contra la interfaz generada — así el `tsc -b` del frontend valida el contrato, no solo el test | `frontend/web-react/src/components/charts/__fixtures__/modelo-oficial-2024.generated.ts` (nuevo, generado) |
| La interfaz manual de 30 líneas en `analytics.ts` se reemplaza por un re-export del tipo generado | `frontend/web-react/src/lib/api/analytics.ts` |
| El test del panel pasa a usar el golden (`MODELO_OFICIAL_CASO['10']`) en vez de su fixture escrito a mano | `frontend/web-react/src/components/charts/official-indicator-panel.test.tsx` |
| 12 tests de contrato: el golden reproduce el modelo, el caso es determinista, el payload cumple el contrato, el validador detecta clave ausente y tipo equivocado, los tres artefactos generados están al día, el golden en disco es el que se usa, y el caso ejercita las cuatro situaciones del modelo | `backend/tests/test_indicador_oficial_contrato.py` (nuevo) |
| Modo `--golden`: el CLI C++ y el backend Python se comparan **contra el contrato**, no solo entre sí; el script ya no tiene su propio adaptador ni su propio comparador (los toma del contrato) | `scripts/pea_paridad_indicador.py` |

Verificaciones: `python -X utf8 scripts/gen_contrato_oficial.py --check` →
**CONTRATO AL DIA** ✅ · `pytest backend/tests/test_indicador_oficial_contrato.py`
→ **12 passed** ✅ · `pytest backend/tests` → **192 passed / 19 skipped** ✅ ·
`npm run test` → **11 archivos / 80 pruebas** ✅ · `npm run build` ✅ (el
fixture tipado hace que `tsc` valide los payloads del golden contra el tipo
generado) · `python -X utf8 scripts/pea_paridad_indicador.py --golden` →
**CONTRATO CONFIRMADO: CLI C++ = backend Python = golden del contrato** ✅

⚠ **Lo que el contrato todavía NO ata:** la respuesta real de la API. El
contrato se verifica contra el payload del **backend Python** (el que la API
serializa) y contra el **CLI C++**; sigue sin haber un test que pegue contra
`GET /groups/{id}/minciencias-diagnosis` en vivo. Es la brecha natural que
deja la Fase 6 (que puede renombrar claves y debe dejarse atada).

### Fase 4 — Test unitario del modelo oficial en C++ (B6) — ✅ Implementada
Uno o dos días.

> **ESTADO: IMPLEMENTADA (2026-10-23).** Ver "Resultado de la Fase 4" al final
> de esta sección.

- Fixture JSON de entrada + resultado esperado, y un caso en `pea_tests.exe`
  para `official::evaluar_modelo_oficial` (hoy el modelo C++ solo se ejercita
  a través del CLI dentro del script de paridad).
- Nota de implementación: el target `pea_tests` de `core_cpp/CMakeLists.txt:67`
  compila **solo** `tests/test_structures.cpp`; ahí hay que añadir el caso del
  modelo oficial (o un archivo nuevo al target).
- Verificación: build con `build_pea.bat` y `pea_tests.exe` (hoy 159 OK).

#### Resultado de la Fase 4 (2026-10-23)

**Decisión de alcance aplicada:** el modelo C++ se ejercita como un **target
propio** (`pea_tests_indicador`) y no como un caso más de `pea_tests`, porque
`test_structures.cpp` es la suite de estructuras (§41.1 del enunciado), otra
línea de trabajo. El caso reutiliza el **mismo fixture JSON** del contrato
(`indicador_oficial_caso.json`): el C++ no tiene su propio golden, tiene el
del contrato.

El framework es mínimo a propósito (`CHECK`, `CHECK_NEAR`, `RUN_TEST`), sin
dependencias externas: el repo no trae googletest y el objetivo es que la
suite se pueda compilar con el mismo `build_cpp.bat` que el resto del core.

La ruta del fixture se resuelve **en tiempo de ejecución** (subiendo directorios
hasta 8 niveles desde el ejecutable) en vez de por macro de CMake: el quoting
de MSVC sobre una ruta con `C:\` en el `add_definitions` es frágil, y el
archivo fuente queda limpio.

| Cambio | Archivo |
|---|---|
| Suite del modelo oficial en C++: piezas puras (λ, inferencia de categoría, familia relacional, extracción de año), evaluación del caso sintético, normalización §3.9 contra la población, fórmula §3.10 y rango, y cumplimiento del contrato JSON (20 claves raíz) | `core_cpp/tests/test_official_indicator.cpp` (nuevo) |
| Target `pea_tests_indicador` (enlazado a `abpoxx`) + `add_test(NAME indicador_oficial ...)` para que `ctest` lo ejecute | `core_cpp/CMakeLists.txt` |

Verificaciones: `cmd //c build_cpp.bat` ✅ ·
`pea_tests_indicador.exe` → **151 OK, 0 fallas** (8 tests) ✅ ·
`ctest -C Release` → **2/2 passed** (`estructuras` + `indicador_oficial`) ✅ ·
`scripts/pea_paridad_indicador.py --golden` → **CONTRATO CONFIRMADO** ✅

⚠ **Lo que la suite C++ NO cubre:** el catálogo (ya cubierto por
`backend/tests/test_catalogo_cpp.py`, que falla si el header generado queda
viejo) ni la persistencia ODBC (el modelo se ejercita sobre la RAM, igual que
en producción).

> El modelo C++ se lee sobre el **mismo contrato** que el backend: las
> aserciones numéricas del test C++ y las del golden son las mismas cifras
> (p. ej. `ind_grupo = 0,8152872176748235` con el pct. de población 50 y el
> máximo DPC 405,4651081081644).

### Fase 5 — Investigador (B3, D5) — ⏸️ En espera de decisión
Grande. Opciones:

- **(a) Modelo oficial de investigador**: extender `official_indicator.py` con
  una evaluación por investigador (Ind_Grupo individual con §3.9 normalizado
  contra la población de investigadores del área), espejo en C++, contrato en
  la API y vista en la UI. Implica decidir qué es "población de investigadores"
  y cómo se define clase/λ para un investigador (no hay grupo al que atribuir
  subtipos).
- **(b) Rótulo honesto y cierre**: se documenta que el modelo oficial del
  Parcial 2 es **de grupo**, se baja el rótulo del investigador y se deja el
  valor como apoyo descriptivo.
- **Estado**: la Fase 1 ya aplicó la parte urgente de (b) (el rótulo del
  investigador dejó de decir "Minciencias 2024"); falta que el usuario confirme
  si (b) es la decisión final o si entra (a).

### Fase 6 — Deprecación del legacy (B5) — ✅ Implementada y verificada
Media. **Desbloqueada**: las Fases 1–4 están verdes y verificadas (2026-10-23).
**Aplicada el 2026-10-23.**

Qué se hizo:

- `i_grupo` → `i_grupo_legacy` en backend (`metrics_collector.py`,
  `evaluator/__init__.py`), frontend (tipo TS, tarjeta y su test) y tests.
  **Sin alias**: no hay consumidores externos de la clave (se comprobó con
  barrido de todo el repo, incluido el módulo de datos abiertos), y el nombre
  viejo no debe volver: `i_grupo_legacy` es una aproximación, no un indicador.
- Rótulo "no oficial" en todos lados: la tarjeta pasó de "referencia legacy,
  no oficial" a **"I_Grupo (aproximación legacy, no oficial)"**, que describe
  qué es (conteos crudos) sin insinuar que sea un indicador del modelo.
- **Unificación de los dos legacies por eliminación**: el CLI **ya no calcula**
  el legacy (que era el que divergía: 36,00 vs 491,704). Ahora imprime solo el
  modelo oficial + el contexto del grupo (nombre, ID, clasificación, miembros)
  + una nota que remite a `i_grupo_legacy` de la API. Queda **una sola**
  implementación legacy: la del backend, que alimenta el semáforo.
- **No se tocó** el semáforo (`tier_rules.py`) ni las copias de los entregables
  (`Taller2_WP-DN-EO.*`), que son el entregable del parcial.
- **Extra de la auditoría**: se añadió el test de contrato **HTTP**
  (`backend/tests/test_indicador_oficial_http.py`), que faltaba: carga el caso
  sintético en la RAM, pide `GET /api/v1/groups/{id}/minciencias-diagnosis` con
  `TestClient` y comprueba que el bloque `modelo_oficial_2024` que sale por
  HTTP cumple el CONTRATO y **iguala el golden** versionado. Así el golden
  queda validado en las tres capas: evaluador = HTTP = CLI C++.

Verificaciones (2026-10-23): build C++ ✅ · `pea_tests_indicador.exe`
**151 OK / 0 fallas** ✅ · `ctest -C Release` **2/2** ✅ ·
`pea_paridad_indicador.py --golden` **CONTRATO CONFIRMADO** ✅ ·
`gen_contrato_oficial.py --check` **CONTRATO AL DIA** ✅ ·
`pytest backend/tests` **197 passed / 19 skipped** ✅ (los 19 skip son los que
requieren la BD) · vitest **11 archivos / 80 pruebas** ✅ · `npm run build` ✅.

---

## 7. Verificaciones (comandos de control)

```bash
# Paridad del oficial C++ ↔ Python (debe decir PARIDAD CONFIRMADA)
python -X utf8 scripts/pea_paridad_indicador.py

# Los tres lados contra el CONTRATO versionado (debe decir CONTRATO CONFIRMADO)
python -X utf8 scripts/pea_paridad_indicador.py --golden

# El golden, el tipo TS y el fixture TS están al día (debe decir CONTRATO AL DIA)
python -X utf8 scripts/gen_contrato_oficial.py --check

# Catálogo C++ sin drift respecto a database/catalog_2024.json
python -X utf8 scripts/gen_catalogo_cpp.py --check

# Tests del modelo oficial (backend)
python -m pytest backend/tests/test_official_indicator.py \
                 backend/tests/test_official_population.py \
                 backend/tests/test_catalogo_cpp.py \
                 backend/tests/test_indicador_oficial_contrato.py -q

# Reporte del modelo con desglose completo
python -X utf8 scripts/pea_indicador_oficial.py

# Build C++ + suite (el modelo oficial va en su propio target, con ctest)
cmd //c "C:\repos\sys_pea_integration\build_cpp.bat"
core_cpp/build2/Release/pea_tests.exe
core_cpp/build2/Release/pea_tests_indicador.exe
cd core_cpp/build2 && ctest -C Release --output-on-failure

# Frontend
cd frontend/web-react && npm run build && npm run test
```

> **Último resultado verificado (2026-10-23, Fases 1–6):** build C++ ✅ ·
> `pea_tests_indicador.exe` **151 OK / 0 fallas** ✅ · `ctest -C Release`
> **2/2 passed** ✅ · vitest **11 archivos / 80 pruebas** ✅ · `npm run build` ✅
> · `pytest backend/tests` **197 passed / 19 skipped** ✅ (los 19 skip son los
> que requieren la BD) · `gen_contrato_oficial.py --check` **CONTRATO AL DIA** ✅
> · `pea_paridad_indicador.py --golden` **CONTRATO CONFIRMADO** ✅ ·
> `npx eslint` **de los 6 archivos de las Fases 1–2** → 0 errores nuevos.
> El `npm run lint` **global** sigue rojo por errores **preexistentes** en
> archivos ajenos a esta línea (p. ej. `src/features/validation-queue/index.tsx`
> y `src/lib/utils.ts`): por eso la verificación de esta línea es el lint
> **por archivo tocado**, no el global.
>
> **Control nuevo de la Fase 6** (el payload de HTTP atado al golden):
> `python -X utf8 -m pytest backend/tests/test_indicador_oficial_http.py -q` → **5 passed**.

---

## 8. Decisiones que necesito antes de atacar

> **Actualizado (2026-10-23):** las preguntas 2–5 ya están resueltas y aplicadas
> (ver "Resultado de la Fase 1" y "Resultado de la Fase 2"). **Solo queda
> viva la 1.**

1. **D5 — investigador**: ¿modelo oficial nuevo o rótulo honesto? (define si
   la Fase 5 entra en este sprint o se documenta como deuda)
   → **Pendiente de tu confirmación.** La Fase 1 aplicó mientras tanto la
   opción (b) de forma interina ("I_Investigador — adaptación §10.6 sobre
   conteos (no oficial)"). Si confirmas (b), la Fase 5 se cierra como
   *documentada*; si eliges (a), arranca el diseño del modelo de investigador.
2. ~~**Fase 1 primero**~~ → **Resuelto: se hizo la Fase 1 primero** (chica,
   elimina el riesgo de evaluación y no toca el modelo).
3. ~~**Alcance de la Fase 2**~~ → **Resuelto: tarjeta nueva** (`OfficialIndicatorPanel`)
   debajo de la tarjeta de diagnóstico en la pestaña de analítica del grupo.
4. ~~**Población mínima**~~ → **Resuelto: `N = 10` grupos**
   (`POBLACION_MINIMA_NORMALIZACION` en `minciencias-diagnosis-card.tsx`).
5. ~~**Rótulo del legacy**~~ → **Resuelto: "I_Grupo (referencia legacy, no oficial)"**
   → **actualizado en la Fase 6** a "I_Grupo (aproximación legacy, no oficial)",
   con la clave `i_grupo_legacy`.

---

## 9. Riesgos

- **Los números citados en el video/Word del Parcial 2** (0,854 / 36,00) solo
  son reproducibles con `pea_data.json` como población y cierre 2026. Si el
  material vigente cita el legacy, y la UI pasa a mostrar el oficial, los dos
  documentos se contradicen: conviene fijar en el material qué dataset y qué
  cierre se usaron. **Ojo (Fase 6):** el 36,00 venía del legacy del CLI, que
  **ya no se calcula** (era una segunda fórmula con reglas distintas); ese 36,00
  solo es reproducible con el código de los entregables (`Taller2_WP-DN-EO.*`).
- **Rotular el oficial como titular** puede "bajar" el número (0,85 frente a
  36) y generar la percepción de regresión. Es exactamente lo que exige §3.9
  (escala 0–10); el material de sustentación debe explicarlo, y por eso la
  Fase 2 (desglose) importa tanto como la Fase 1.
- **Cargar más grupos cambia el indicador oficial** (es correcto por
  §3.9). Si el equipo importa GrupLAC completo después de publicar capturas,
  los números de la UI cambiarán: por eso B4 (población visible) no es
  cosmético.
- ~~**La Fase 2 sin la Fase 3 deja el contrato sin red.**~~ → **Resuelto en la
  Fase 3.** El panel lee 20 claves del bloque oficial y el tipo TS las declara,
  pero nada verificaba que el backend siguiera enviándolas: un campo renombrado
  o añadido en el backend no rompía el build (el tipo lo declara) ni los tests
  (el fixture del panel estaba escrito a mano) y se manifestaba como un `—`
  silencioso en la UI. Ahora el contrato vive una vez, el golden se compara
  contra el backend (pytest) y contra el CLI C++ (`--golden`), y **el fixture
  del panel ES el golden**, tipado contra el tipo generado: un campo que se
  desvíe del contrato rompe el build del frontend o el pytest, no la pantalla.
- ~~**Lo que la Fase 3 no ata es la API en vivo.**~~ → **Resuelto en la Fase 6.**
  El payload del backend Python y el del CLI C++ ya estaban verificados contra
  el contrato; faltaba la serialización HTTP de
  `/groups/{id}/minciencias-diagnosis`. `backend/tests/test_indicador_oficial_http.py`
  la ata: carga el caso sintético en la RAM, pide el endpoint con `TestClient` y
  comprueba que lo que sale por HTTP cumple el CONTRATO y **iguala el golden**
  versionado. Las tres capas (evaluador = HTTP = CLI C++) están contra el mismo
  golden.
- **Sin el gate en CI (D6)**, `gen_catalogo_cpp.py --check` puede dejar de
  correr y el catálogo C++ puede divergir del backend sin que nadie lo note.
  Hoy la paridad C++↔Python lo detecta en cada ejecución del script, pero
  solo si alguien lo ejecuta.
