import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { MincienciasOfficialModel2024 } from '@/lib/api'
import { MODELO_OFICIAL_CASO } from './__fixtures__/modelo-oficial-2024.generated'
import { OfficialIndicatorPanel } from './official-indicator-panel'

/**
 * Fija las Fases 2 y 3 (docs/plan-integracion-modelo-oficial.md):
 *
 * - el panel deja auditable el cálculo oficial (§3.10) sin recalcularlo ni
 *   contradecir al backend — la suma de los 9 términos ponderados ES el
 *   Ind.Grupo;
 * - el fixture es el GOLDEN del contrato único: el mismo payload que evalúa
 *   el backend y que valida el CLI C++, así que el test de la UI y el de la
 *   API comparten la fuente de verdad.
 */
const AITICE = MODELO_OFICIAL_CASO['10']

function modelo(indGrupo?: number): MincienciasOfficialModel2024 {
  return indGrupo === undefined ? AITICE : { ...AITICE, ind_grupo: indGrupo }
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
