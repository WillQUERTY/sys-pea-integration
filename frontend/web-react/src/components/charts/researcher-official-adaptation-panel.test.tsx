import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { MincienciasIndividualAdaptation2024 } from '@/lib/api'
import { MODELO_INDIVIDUAL_CASO } from './__fixtures__/modelo-individual-2024.generated'
import { ResearcherOfficialAdaptationPanel } from './researcher-official-adaptation-panel'

/**
 * Fija la Fase 5 (docs/plan-integracion-modelo-oficial.md, brecha B3):
 *
 * - el panel declara SIEMPRE que la lectura individual NO es oficial (el
 *   modelo 2024 define un único indicador y es de GRUPO, §3.10);
 * - las TRES adaptaciones que convierten el pipeline de grupo en lectura de
 *   investigador se muestran, no se esconden;
 * - el desglose es auditable: la suma de los 9 términos ponderados ES el
 *   Ind.Investigador, sin recalcularlo ni contradecir al backend;
 * - el fixture es el GOLDEN del contrato individual: la misma lectura que
 *   evalúa el backend, valida la API y comprueba el CLI C++.
 */
const ANA = MODELO_INDIVIDUAL_CASO['101']

function adaptacion(
  ind?: number
): MincienciasIndividualAdaptation2024 {
  return ind === undefined ? ANA : { ...ANA, ind_investigador: ind }
}

describe('ResearcherOfficialAdaptationPanel — adaptación individual', () => {
  it('se rotula como NO oficial', async () => {
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel adaptacion={adaptacion()} />
    )

    await expect.element(getByTestId('rotulo-no-oficial')).toHaveTextContent(
      'NO oficial'
    )
  })

  it('verifica que los 9 términos de §3.10 reconstruyen el Ind.Investigador', async () => {
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel adaptacion={adaptacion()} />
    )

    await expect
      .element(getByTestId('suma-terminos'))
      .toHaveTextContent('suma verificada')
    await expect
      .element(getByTestId('suma-terminos'))
      .toHaveTextContent('0,739')
  })

  it('deriva el coeficiente §3.10 de los propios datos', async () => {
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel adaptacion={adaptacion()} />
    )

    // Cohe: término 0,0889 ÷ índice 0,8889 = 0,1
    await expect.element(getByTestId('termino-Cohe')).toHaveTextContent('×0,1')
    // DPC: 0,44966 ÷ 0,89932 = 0,5
    await expect.element(getByTestId('termino-DPC')).toHaveTextContent('×0,5')
  })

  it('muestra el valor de clase frente al máximo de la población (§3.9)', async () => {
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel adaptacion={adaptacion()} />
    )

    await expect.element(getByTestId('clase-DPC')).toHaveTextContent('364,64')
    await expect.element(getByTestId('clase-DPC')).toHaveTextContent('405,47')
  })

  it('detecta cuando la suma de términos no cuadra con el backend', async () => {
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel adaptacion={adaptacion(0.9)} />
    )

    await expect
      .element(getByTestId('suma-terminos'))
      .toHaveTextContent('discrepancia')
  })

  it('expone las TRES adaptaciones declaradas', async () => {
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel adaptacion={adaptacion()} />
    )

    await expect.element(getByTestId('adaptacion-0')).toHaveTextContent(
      'Unidad de medición'
    )
    await expect.element(getByTestId('adaptacion-1')).toHaveTextContent(
      'Período de observación'
    )
    await expect.element(getByTestId('adaptacion-2')).toHaveTextContent('Cohe')
  })

  it('explica las exclusiones de la medición y los subtipos que aportan', async () => {
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel adaptacion={adaptacion()} />
    )

    await expect
      .element(getByTestId('exclusion-0'))
      .toHaveTextContent('artículo sin calidad oficial')
    await expect.element(getByTestId('exclusion-0')).toHaveTextContent('3')
    await expect
      .element(getByTestId('subtipo-LIB_DIV'))
      .toHaveTextContent('LIB_DIV')
  })

  it('marca el investigador actual dentro del ranking de la población', async () => {
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel adaptacion={adaptacion()} />
    )

    await expect
      .element(getByTestId('poblacion-investigador-actual'))
      .toHaveTextContent('Ana Perez (#101)')
    await expect
      .element(getByTestId('poblacion-investigador-actual'))
      .toHaveTextContent('este investigador')
  })

  it('muestra la posición en la población de normalización', async () => {
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel adaptacion={adaptacion()} />
    )

    await expect
      .element(getByTestId('cabecera-indicador'))
      .toHaveTextContent('puesto 2 de 3')
    await expect
      .element(getByTestId('cabecera-indicador'))
      .toHaveTextContent('percentil 66,7')
  })

  it('sin adaptación individual no renderiza nada', async () => {
    const { container } = await render(
      <ResearcherOfficialAdaptationPanel />
    )

    expect(container.innerHTML).toBe('')
  })
})

describe('ResearcherOfficialAdaptationPanel — P0-2: cadena de §3.6', () => {
  it('muestra peso relativo, ancla y peso global de cada subtipo', async () => {
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel adaptacion={adaptacion()} />
    )

    // LIB_DIV: peso relativo 10,0 (Anexo 1) × ancla 100 (Tabla 6) = 1000
    await expect
      .element(getByTestId('subtipo-LIB_DIV-peso-relativo'))
      .toHaveTextContent('10,0')
    await expect
      .element(getByTestId('subtipo-LIB_DIV-ancla'))
      .toHaveTextContent('100')
    await expect
      .element(getByTestId('subtipo-LIB_DIV-peso-global'))
      .toHaveTextContent(/1\.000|1000/)
  })

  it('un subtipo sin ancla se imprime «—», nunca 0', async () => {
    const sinAncla: MincienciasIndividualAdaptation2024 = {
      ...ANA,
      subtipos: ANA.subtipos.map((sub) =>
        sub.codigo === 'LIB_DIV' ? { ...sub, ancla_subtipo: null } : sub
      ),
    }
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel adaptacion={sinAncla} />
    )

    await expect
      .element(getByTestId('subtipo-LIB_DIV-ancla'))
      .toHaveTextContent('—')
    await expect
      .element(getByTestId('subtipo-LIB_DIV-ancla'))
      .not.toHaveTextContent('0')
  })
})

describe('ResearcherOfficialAdaptationPanel — P0-1: entradas y salidas', () => {
  const RESUMEN = {
    total_products: 12,
    products_in_window: 5,
    gnc_count: 3,
    dti_count: 2,
    frh_count: 1,
    asc_count: 1,
    dpc_count: 4,
    top_count: 2,
    type_a_count: 3,
    type_b_count: 1,
    frh_a_count: 1,
    frh_b_count: 0,
  }

  it('cataloga las entradas y las salidas con antigüedad e Ind.Investigador', async () => {
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel
        adaptacion={adaptacion()}
        summary={RESUMEN}
      />
    )

    await expect
      .element(getByTestId('entradas-salidas-modelo'))
      .toHaveTextContent('Entradas y salidas del modelo')

    // ENTRADAS: la antigüedad ocupa el lugar de la edad del grupo
    await expect
      .element(getByTestId('dato-investigador'))
      .toHaveTextContent('Ana Perez (#101)')
    await expect.element(getByTestId('dato-antiguedad')).toHaveTextContent('8')
    await expect.element(getByTestId('dato-anio-cierre')).toHaveTextContent('2026')
    await expect.element(getByTestId('dato-conteo-nc-top')).toHaveTextContent('2')
    await expect
      .element(getByTestId('dato-contexto'))
      .toHaveTextContent('12 productos · 5 en ventana')

    // SALIDAS: el valor titular es el Ind.Investigador de la adaptación
    await expect
      .element(getByTestId('dato-ind-investigador'))
      .toHaveTextContent('0,739')
    await expect
      .element(getByTestId('dato-puesto'))
      .toHaveTextContent('puesto 2 de 3')

    // La sección NO oficial sobrevive al catálogo nuevo
    await expect
      .element(getByTestId('rotulo-no-oficial'))
      .toHaveTextContent('NO oficial')
    await expect
      .element(getByTestId('adaptacion-0'))
      .toHaveTextContent('Unidad de medición')
  })

  it('separa explícitamente el conteo crudo del valor en puntos', async () => {
    const { getByTestId } = await render(
      <ResearcherOfficialAdaptationPanel
        adaptacion={adaptacion()}
        summary={RESUMEN}
      />
    )

    await expect
      .element(getByTestId('nota-conteo-vs-puntos'))
      .toHaveTextContent('Conteo crudo')
    await expect
      .element(getByTestId('nota-conteo-vs-puntos'))
      .toHaveTextContent('Valor en puntos')
  })
})
