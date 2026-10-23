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
| Tests | `backend/tests/test_official_indicator.py` (27, golden a mano) y `backend/tests/test_official_population.py` (9, sobre los grupos reales). | |
| API | `backend/app/repositories/analytics.py` → `get_group_minciencias_diagnosis` | Agrega la clave **aditiva** `modelo_oficial_2024` al diagnóstico. |
| Frontend | `frontend/web-react/src/lib/api/analytics.ts` | Tipo `MincienciasOfficialModel2024` (opcional). La UI no cambia. |

## Cómo se ejecuta

```bash
# Reporte con el desglose completo (λ, Ind_Clase, índices, fórmula final)
python -X utf8 scripts/pea_indicador_oficial.py            # cierre 2026
python -X utf8 scripts/pea_indicador_oficial.py --edad 11  # forzar edad del grupo

# API (el diagnostico legacy llega igual, con la clave extra)
GET /api/v1/groups/{id}/minciencias-diagnosis
```

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
