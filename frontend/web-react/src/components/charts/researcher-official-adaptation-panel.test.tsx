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
