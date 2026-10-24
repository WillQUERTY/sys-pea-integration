import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type {
  MincienciasGroupDiagnosis,
  MincienciasOfficialModel2024,
} from '@/lib/api'
import { MODELO_OFICIAL_CASO } from './__fixtures__/modelo-oficial-2024.generated'
import { OfficialIndicatorPanel } from './official-indicator-panel'

/**
 * Fija las Fases 2 y 3 (docs/plan-integracion-modelo-oficial.md) y los dos
 * P0 del panel (docs/p0-panel-indicador-oficial.md):
 *
 * - el panel deja auditable el cálculo oficial (§3.10) sin recalcularlo ni
 *   contradecir al backend — la suma de los 9 términos ponderados ES el
 *   Ind.Grupo;
 * - P0‑2: la tabla de subtipos muestra la cadena de §3.6 — peso relativo
 *   (Anexo 1) × ancla (Tabla 6) = peso global — y un subtipo sin ancla se
 *   imprime `—` (nunca 0, que diría "no aporta");
 * - P0‑1: el catálogo de variables de entrada y salida del modelo está
 *   visible y separa explícitamente el conteo crudo del valor en puntos;
 * - el fixture es el GOLDEN del contrato único: el mismo payload que evalúa
 *   el backend y que valida el CLI C++, así que el test de la UI y el de la
 *   API comparten la fuente de verdad.
 */
const AITICE = MODELO_OFICIAL_CASO['10']

function modelo(indGrupo?: number): MincienciasOfficialModel2024 {
  return indGrupo === undefined ? AITICE : { ...AITICE, ind_grupo: indGrupo }
}

/** Un subtipo sin ancla en Tabla 6: el C++ lo excluye de la medición. */
function modeloSinAncla(): MincienciasOfficialModel2024 {
  return {
    ...AITICE,
    subtipos: AITICE.subtipos.map((sub) =>
      sub.codigo === 'LIB_DIV' ? { ...sub, ancla_subtipo: null } : sub
    ),
  }
}

const RESUMEN: MincienciasGroupDiagnosis['summary'] = {
  years_active: 8,
  total_members: 12,
  phd_count: 1,
  masters_count: 3,
  total_products: 30,
  products_in_window: 9,
  gnc_count: 5,
  dti_count: 4,
  frh_count: 3,
  asc_count: 2,
  dpc_count: 7,
  projects_count: 1,
  top_count: 3,
  type_a_count: 4,
  type_b_count: 2,
  frh_a_count: 1,
  frh_b_count: 2,
}

describe('OfficialIndicatorPanel — desglose oficial', () => {
  it('verifica que los 9 términos de §3.10 reconstruyen el Ind.Grupo', async () => {
    const { getByTestId } = await render(
      <OfficialIndicatorPanel modelo={modelo()} />
    )

    await expect
      .element(getByTestId('suma-terminos'))
      .toHaveTextContent('suma verificada')
    await expect
      .element(getByTestId('suma-terminos'))
      .toHaveTextContent('0,815')
  })

  it('deriva el coeficiente §3.10 de los propios datos', async () => {
    const { getByTestId } = await render(
      <OfficialIndicatorPanel modelo={modelo()} />
    )

    // Cohe: término 0,1 ÷ índice 1,0 = 0,1
    await expect.element(getByTestId('termino-Cohe')).toHaveTextContent('×0,1')
    // DPC: 0,44966 ÷ 0,89932 = 0,5
    await expect.element(getByTestId('termino-DPC')).toHaveTextContent('×0,5')
  })

  it('muestra el valor de clase frente al máximo de la población (§3.9)', async () => {
    const { getByTestId } = await render(
      <OfficialIndicatorPanel modelo={modelo()} />
    )

    // DPC del grupo 10 = 364,64 sobre un máximo de población de 405,47
    await expect.element(getByTestId('clase-DPC')).toHaveTextContent('364,64')
    await expect.element(getByTestId('clase-DPC')).toHaveTextContent('405,47')
    // FRH-B = 82,04 (maximo de la poblacion: 141,91)
    await expect.element(getByTestId('clase-FRH-B')).toHaveTextContent('82,04')
  })

  it('detecta cuando la suma de términos no cuadra con el Ind.Grupo del backend', async () => {
    const { getByTestId } = await render(
      <OfficialIndicatorPanel modelo={modelo(0.9)} />
    )

    await expect
      .element(getByTestId('suma-terminos'))
      .toHaveTextContent('discrepancia')
  })

  it('explica las exclusiones de la medición y los subtipos que aportan', async () => {
    const { getByTestId } = await render(
      <OfficialIndicatorPanel modelo={modelo()} />
    )

    // Las exclusiones se ordenan por cantidad: "artículo sin calidad oficial" (2).
    await expect
      .element(getByTestId('exclusion-0'))
      .toHaveTextContent('artículo sin calidad oficial')
    await expect.element(getByTestId('exclusion-0')).toHaveTextContent('2')
    await expect
      .element(getByTestId('subtipo-LIB_DIV'))
      .toHaveTextContent('LIB_DIV')
  })

  it('marca el grupo actual dentro del ranking de la población', async () => {
    const { getByTestId } = await render(
      <OfficialIndicatorPanel modelo={modelo()} />
    )

    await expect
      .element(getByTestId('poblacion-grupo-actual'))
      .toHaveTextContent('AITICE (#10)')
    await expect
      .element(getByTestId('poblacion-grupo-actual'))
      .toHaveTextContent('este grupo')
  })

  it('sin modelo oficial no renderiza nada', async () => {
    const { container } = await render(<OfficialIndicatorPanel />)

    expect(container.innerHTML).toBe('')
  })
})

describe('OfficialIndicatorPanel — P0-2: cadena de §3.6 por subtipo', () => {
  it('muestra peso relativo, ancla y peso global de cada subtipo', async () => {
    const { getByTestId } = await render(
      <OfficialIndicatorPanel modelo={modelo()} />
    )

    // LIB_DIV: peso relativo 10,0 (Anexo 1) × ancla 100 (Tabla 6) = 1000
    await expect
      .element(getByTestId('subtipo-LIB_DIV-peso-relativo'))
      .toHaveTextContent('10,0')
    await expect.element(getByTestId('subtipo-LIB_DIV-ancla')).toHaveTextContent('100')
    await expect
      .element(getByTestId('subtipo-LIB_DIV-peso-global'))
      .toHaveTextContent(/1\.000|1000/)

    // TM_B: 5,0 × 70 = 350
    await expect
      .element(getByTestId('subtipo-TM_B-peso-relativo'))
      .toHaveTextContent('5,0')
    await expect.element(getByTestId('subtipo-TM_B-ancla')).toHaveTextContent('70')
    await expect
      .element(getByTestId('subtipo-TM_B-peso-global'))
      .toHaveTextContent('350')
  })

  it('un subtipo sin ancla se imprime «—», nunca 0', async () => {
    const { getByTestId } = await render(
      <OfficialIndicatorPanel modelo={modeloSinAncla()} />
    )

    await expect.element(getByTestId('subtipo-LIB_DIV-ancla')).toHaveTextContent('—')
    await expect
      .element(getByTestId('subtipo-LIB_DIV-ancla'))
      .not.toHaveTextContent('0')
    await expect
      .element(getByTestId('subtipo-LIB_DIV-peso-global'))
      .toHaveTextContent('—')
  })
})

describe('OfficialIndicatorPanel — P0-1: entradas y salidas del modelo', () => {
  it('cataloga las entradas y las salidas del modelo', async () => {
    const { getByTestId } = await render(
      <OfficialIndicatorPanel modelo={modelo()} summary={RESUMEN} />
    )

    await expect
      .element(getByTestId('entradas-salidas-modelo'))
      .toHaveTextContent('Entradas y salidas del modelo')

    // ENTRADAS
    await expect.element(getByTestId('dato-grupo')).toHaveTextContent('AITICE (#10)')
    await expect.element(getByTestId('dato-edad')).toHaveTextContent('8')
    await expect.element(getByTestId('dato-anio-cierre')).toHaveTextContent('2026')
    await expect
      .element(getByTestId('dato-subtipos-n'))
      .toHaveTextContent('LIB_DIV 1')
    await expect.element(getByTestId('dato-cohe')).toHaveTextContent('4 autores')
    await expect.element(getByTestId('dato-coop')).toHaveTextContent('3 afiliaciones')
    // Conteos crudos de la clasificación previa (entradas del modelo)
    await expect.element(getByTestId('dato-conteo-nc-top')).toHaveTextContent('3')
    await expect.element(getByTestId('dato-conteo-dpc')).toHaveTextContent('7')
    await expect
      .element(getByTestId('dato-contexto'))
      .toHaveTextContent('12 integrantes · 30 productos · 9 en ventana · 8 años')

    // SALIDAS
    await expect
      .element(getByTestId('dato-termino-dpc'))
      .toHaveTextContent('0,899 / 0,450')
    await expect.element(getByTestId('dato-ind-grupo')).toHaveTextContent('0,815')
    await expect
      .element(getByTestId('dato-puesto'))
      .toHaveTextContent('puesto 2 de 2')
  })

  it('separa explícitamente el conteo crudo del valor en puntos', async () => {
    const { getByTestId } = await render(
      <OfficialIndicatorPanel modelo={modelo()} summary={RESUMEN} />
    )

    await expect
      .element(getByTestId('nota-conteo-vs-puntos'))
      .toHaveTextContent('Conteo crudo')
    await expect
      .element(getByTestId('nota-conteo-vs-puntos'))
      .toHaveTextContent('Valor en puntos')
  })

  it('sin resumen, los conteos crudos se muestran como «—», nunca como 0', async () => {
    const { getByTestId } = await render(
      <OfficialIndicatorPanel modelo={modelo()} />
    )

    await expect
      .element(getByTestId('dato-conteo-nc-top'))
      .toHaveTextContent('—')
    await expect
      .element(getByTestId('dato-conteo-nc-top'))
      .not.toHaveTextContent('0')
  })
})
