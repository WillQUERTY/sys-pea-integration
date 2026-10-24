import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import type { MincienciasGroupDiagnosis } from '@/lib/api'
import { MincienciasDiagnosisCard } from './minciencias-diagnosis-card'

/**
 * Fija la regla de las brechas B1 y B5 (docs/plan-integracion-modelo-oficial.md):
 * la única cifra que puede rotularse como "modelo oficial" es
 * `modelo_oficial_2024.ind_grupo`; el `i_grupo_legacy` es una aproximación de
 * conteos crudos y debe aparecer SIEMPRE rotulada como no oficial.
 */
function diagnostico(
  oficial: boolean,
  tamanoPoblacion = 2
): MincienciasGroupDiagnosis {
  const base: MincienciasGroupDiagnosis = {
    group_id: 10,
    group_name: 'AITICE',
    i_grupo_legacy: 36,
    current_classification: 'B',
    raw_classification: 'B',
    max_qualified_tier: 'B',
    next_tier: null,
    next_tier_progress: 0,
    next_tier_gap: [],
    summary: {
      years_active: 54,
      creation_year: 2018,
      total_members: 179,
      phd_count: 40,
      masters_count: 90,
      total_products: 532,
      products_in_window: 532,
      gnc_count: 300,
      dti_count: 40,
      frh_count: 120,
      asc_count: 0,
      dpc_count: 70,
      projects_count: 12,
      cohesion_index: 0.268,
      cohesion_met: true,
      top_count: 0,
      type_a_count: 0,
      type_b_count: 0,
      frh_a_count: 40,
      frh_b_count: 80,
      asc_dpc_count: 70,
      coauthored_products_count: 120,
    },
    tiers: [],
  }

  if (!oficial) return base

  return {
    ...base,
    modelo_oficial_2024: {
      modelo: 'Minciencias 2024 — modelo de medición (§2.2.9 → §3.10)',
      anio_cierre: 2026,
      grupo: { id: 10, identificacion: 'AITICE (#10)', edad_anos: 54 },
      ind_grupo: 0.854103,
      rango_teorico: 10,
      posicion_poblacion: { puesto: 1, de: tamanoPoblacion, percentil: 100 },
      poblacion: Array.from({ length: tamanoPoblacion }, (_, i) => ({
        grupo: `Grupo #${i + 1}`,
        ind_grupo: 0.5,
      })),
      indices: { 'Nc.Top': 0, Cohe: 0.3967, Coop: 0.3814 },
      terminos_ponderados: { 'Nc.Top': 0, Cohe: 0.03967, Coop: 0.114433 },
      ind_clase: { TOP: 0, DPC: 824.921672 },
      maximos_poblacion: { TOP: 0, DPC: 824.921672 },
      maximo_cohe_poblacion: 0.6757,
      maximo_coop_poblacion: 0.6486,
      subtipos: [
        {
          codigo: 'LIB_DIV',
          clase: 'DPC',
          familia: 'DPC',
          n: 6,
          periodo: 5,
          lambda: 0.788457,
          ancla_subtipo: 1000,
          peso_relativo: 1,
          peso_global: 1000,
          termino: 788.45736,
        },
      ],
      cohe: { suma_autores: 123, productos: 97, valor: 0.268041 },
      coop: { suma_grupos: 121, productos: 97, valor: 0.247423 },
      excluidos: { '2': 11 },
      sin_ano: { '3': 1 },
      fuera_de_periodo: { '4': 7 },
      supuestos: [
        'Normalización §3.9: contra la población cargada en el repositorio.',
      ],
    },
  }
}

describe('MincienciasDiagnosisCard — lectura del indicador', () => {
  it('muestra el Ind.Grupo oficial cuando el backend entrega modelo_oficial_2024', async () => {
    const { getByTestId } = await render(
      <MincienciasDiagnosisCard data={diagnostico(true)} />
    )

    // El titular es el número oficial (0,854103 → 0,854 con 3 decimales).
    await expect
      .element(getByTestId('ind-grupo-oficial'))
      .toHaveTextContent('0,854')
    await expect
      .element(getByTestId('ind-grupo-oficial'))
      .toHaveTextContent('rango teórico')
    await expect
      .element(getByTestId('posicion-poblacion'))
      .toHaveTextContent('Puesto 1 de 2')
    await expect
      .element(getByTestId('posicion-poblacion'))
      .toHaveTextContent('cierre 2026')
  })

  it('deja el i_grupo_legacy como aproximación no oficial, nunca como titular', async () => {
    const { getByTestId } = await render(
      <MincienciasDiagnosisCard data={diagnostico(true)} />
    )

    await expect
      .element(getByTestId('ind-grupo-legacy-label'))
      .toHaveTextContent('I_Grupo (aproximación legacy, no oficial)')
    await expect
      .element(getByTestId('ind-grupo-legacy'))
      .toHaveTextContent('36,00')
  })

  it('advierte cuando la población de normalización §3.9 es pequeña', async () => {
    const { getByTestId } = await render(
      <MincienciasDiagnosisCard data={diagnostico(true, 2)} />
    )

    await expect
      .element(getByTestId('aviso-poblacion'))
      .toHaveTextContent('Población medida: 2 grupos')
  })

  it('no advierte cuando la población es suficiente', async () => {
    const { getByTestId } = await render(
      <MincienciasDiagnosisCard data={diagnostico(true, 12)} />
    )

    await expect.element(getByTestId('aviso-poblacion')).not.toBeInTheDocument()
  })

  it('sin modelo oficial no muestra ninguna cifra rotulada como oficial', async () => {
    const { getByTestId } = await render(
      <MincienciasDiagnosisCard data={diagnostico(false)} />
    )

    await expect
      .element(getByTestId('oficial-no-disponible'))
      .toHaveTextContent('Lectura oficial no disponible')
    await expect
      .element(getByTestId('ind-grupo-legacy-label'))
      .toHaveTextContent('aproximación legacy, no oficial')
    await expect
      .element(getByTestId('ind-grupo-oficial'))
      .not.toBeInTheDocument()
  })
})
