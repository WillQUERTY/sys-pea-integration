# Plan: Alivio visual de la sección Estadísticas y Benchmarking Inter-grupal

## Objetivo
Eliminar la fatiga visual de la pestaña "Estadísticas" del detalle de grupo reorganizándola en sub-pestañas (una visualización pesada visible a la vez) y aplicando progresión interna al componente de benchmarking. **Sin perder funcionalidad** y sin tocar backend.

## Pre-edición (obligatorio per AGENTS.md)
Ejecutar `node .gitnexus/run.cjs impact "GroupsRadarComparison" --direction upstream --repo .` y validar que los llamadores son solo los 3 puntos ya identificados. Antes de cualquier commit: `node .gitnexus/run.cjs detect-changes --scope all --repo .`.

## Cambio 1 — `frontend/web-react/src/features/groups/detail.tsx`
Reorganizar el TabsContent "estadisticas" (~líneas 1356-1552) en Tabs de segundo nivel (patrón ya existente en detail.tsx:624), `defaultValue="resumen"`:

- **Sub-pestaña "Resumen"**: descripción + botones de exportación (Dossier PDF, Ranking CSV, Productos CSV, Más opciones), 4 KPI cards, `MincienciasDiagnosisCard`, fila `ProductionHistogram` + `FamiliesDonut`, fila `GroupTopResearchers` + `EducationDonut` + `TopSubtypesRanking`.
- **Sub-pestaña "Red de Colaboración"**: `GroupCollaborationNetwork` (grafo de 1063 líneas con zoom/pan).
- **Sub-pestaña "Benchmarking"**: `GroupsRadarComparison` (el bloque embebido actual de la línea 1506 se mueve aquí).

Eliminar el acceso duplicado (decisión del usuario):
- Quitar botón "Benchmarking (Radar)" (líneas 1382-1390).
- Quitar estado `compareDialogOpen` (línea 131) y el Dialog duplicado (líneas 1889-1900).
- **Conservar intacto** el modal del listado de grupos (`features/groups/index.tsx:365-375`) y su botón de entrada.

Beneficio extra: Radix no monta TabsContent inactivos → la red y el benchmarking dejan de renderizarse/cargarse de golpe al entrar a Estadísticas.

## Cambio 2 — `frontend/web-react/src/components/charts/groups-radar-comparison.tsx`
Progresión interna (únicos alivios aprobados):

- **Matriz Comparativa** (líneas 831-950): envolver en `Collapsible` (`components/ui/collapsible.tsx` ya existe) **colapsada por defecto**, con trigger tipo botón con chevron "Matriz de Indicadores Lado a Lado". La exportación CSV no se afecta (lee de `data`, no del DOM).
- **Metodología de Normalización** (líneas 732-743): reemplazar el panel siempre-visible por un ícono `Info` junto al título del gráfico que abre un `Popover` (`components/ui/popover.tsx` existe) con el mismo texto.
- **Talento**: ya está plegado por defecto (`showTalent=false`, línea 179) — se mantiene; se reubica su trigger junto al nuevo trigger de la matriz para coherencia.
- **Se conserva expresamente** (decisión del usuario): el hover cruzado global, el tope de 6 grupos, y la decoración actual (gradientes, sombras, badges, mini-barras).

Vista por defecto resultante del componente: header con acciones/chips + 6 píldoras de liderazgo + gráfico + hallazgos clave. Matriz, metodología y talento quedan bajo demanda.

## Cambio 3 — extender `frontend/web-react/src/components/charts/groups-radar-comparison.test.tsx`
- Mantener los tests existentes (paleta, skeleton).
- Añadir test con `vi.mock('@/lib/api')` (fixture mínima de `compareGroupsAnalytics`) que verifique: el trigger de la matriz existe, la tabla NO está montada inicialmente, y se despliega al hacer clic (vitest-browser-react).

## Verificación (en orden)
1. GitNexus impact pre-edición y `detect-changes` pre-commit (arriba).
2. `cd frontend/web-react && npm run lint`
3. `npm run test` (vitest browser headless)
4. `npm run build` (tsc -b && vite build)
5. Chequeo visual en dev server: detalle → Estadísticas muestra 3 sub-pestañas; listado → modal de benchmarking con matriz plegada.

## Fuera de alcance
- Backend, endpoints y tipos de `@/lib/api`.
- Estilos/decoración del componente, interacciones hover, paleta de 6 colores.
- No se elimina ninguna funcionalidad (CSV, copiar resumen, talento, radar/barras siguen operativos).

## Archivos afectados
- `frontend/web-react/src/features/groups/detail.tsx`
- `frontend/web-react/src/components/charts/groups-radar-comparison.tsx`
- `frontend/web-react/src/components/charts/groups-radar-comparison.test.tsx`