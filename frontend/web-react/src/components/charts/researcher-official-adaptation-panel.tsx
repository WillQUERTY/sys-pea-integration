import { useMemo } from 'react'
import { UserRound } from 'lucide-react'
import type {
  MincienciasIndividualAdaptation2024,
  ResearcherIndicatorSummary,
} from '@/lib/api'
import {
  CLASES_37,
  COEFICIENTES_310,
  entero,
  numero,
  TERMINOS_310,
  type VariableModelo,
} from './modelo-2024-comun'
import { PanelModelo2024 } from './modelo-2024-vista'

export interface ResearcherOfficialAdaptationPanelProps {
  adaptacion?: MincienciasIndividualAdaptation2024
  /**
   * Conteos crudos de la clasificación previa (la misma del semáforo legacy).
   * Es OPCIONAL: sin él, la sección de entradas muestra `—` en los conteos
   * crudos (nunca un 0 inventado) y el resto del panel no cambia.
   */
  summary?: ResearcherIndicatorSummary
  className?: string
}

/**
 * Fase 5 (brecha B3 / decisión D5) — desglose auditable de la ADAPTACIÓN
 * INDIVIDUAL del modelo de medición Minciencias 2024.
 *
 * QUÉ ES Y QUÉ NO ES
 * El archivo normativo (`docs/modelo-medicion-2024.md`, Anexo 1 M601PR04G01
 * v02) define UN solo indicador de producción y es DE GRUPO (§3.10): no
 * existe un indicador oficial por persona. Este panel muestra, por eso, una
 * ADAPTACIÓN DECLARADA: el mismo pipeline §2.2.9 → §3.10 con la unidad
 * "investigador", y el rótulo "NO oficial" viaja siempre visible.
 *
 * Este panel NO calcula el indicador: solo muestra lo que el backend midió
 * (§3.10, §3.8.1, §3.9) y hace explícito el trayecto de los datos:
 * términos ponderados → índices por clase frente al máximo de la población →
 * subtipos que aportan → exclusiones → ranking de la población de
 * investigadores y las TRES adaptaciones declaradas.
 *
 * La presentación (pestañas Resumen / Cómo se calculó / Comparación /
 * Auditoría) vive en `PanelModelo2024`, compartida con el panel de grupo; este
 * archivo solo adapta el payload individual.
 */
export function ResearcherOfficialAdaptationPanel({
  adaptacion,
  summary,
  className,
}: ResearcherOfficialAdaptationPanelProps) {
  const datos = useMemo(() => {
    if (!adaptacion) return null

    const indices = adaptacion.indices ?? {}
    const terminos = adaptacion.terminos_ponderados ?? {}

    const filasTerminos = TERMINOS_310.map((termino) => {
      const indice = indices[termino.clave] ?? 0
      const ponderado = terminos[termino.clave] ?? 0
      const coeficiente =
        indice > 0 ? ponderado / indice : (COEFICIENTES_310[termino.clave] ?? 0)
      return { ...termino, indice, ponderado, coeficiente }
    })

    const sumaTerminos = filasTerminos.reduce((acc, f) => acc + f.ponderado, 0)

    const clases = CLASES_37.map((clase) => {
      const valor = adaptacion.ind_clase?.[clase.clave] ?? 0
      const maximo = adaptacion.maximos_poblacion?.[clase.clave] ?? 0
      return { ...clase, valor, maximo }
    })

    const relacionales = [
      {
        clave: 'Cohe',
        nombre: 'Coautoría de la red',
        valor: adaptacion.cohe?.valor ?? 0,
        maximo: adaptacion.maximo_cohe_poblacion ?? 0,
        detalle: `${entero(adaptacion.cohe?.suma_autores ?? 0)} firmantes · ${entero(
          adaptacion.cohe?.productos ?? 0
        )} productos`,
      },
      {
        clave: 'Coop',
        nombre: 'Cooperación entre grupos',
        valor: adaptacion.coop?.valor ?? 0,
        maximo: adaptacion.maximo_coop_poblacion ?? 0,
        detalle: `${entero(adaptacion.coop?.suma_grupos ?? 0)} afiliaciones · ${entero(
          adaptacion.coop?.productos ?? 0
        )} productos`,
      },
    ]

    const exclusiones = Object.entries(adaptacion.excluidos ?? {}).sort(
      (a, b) => b[1] - a[1]
    )
    const totalExcluidos = exclusiones.reduce((acc, [, n]) => acc + n, 0)
    const sinAnio = Object.values(adaptacion.sin_ano ?? {}).reduce(
      (acc, n) => acc + n,
      0
    )
    const fueraDePeriodo = Object.values(adaptacion.fuera_de_periodo ?? {}).reduce(
      (acc, n) => acc + n,
      0
    )

    const poblacion = [...(adaptacion.poblacion ?? [])].sort(
      (a, b) => b.ind_investigador - a.ind_investigador
    )
    const idActual = adaptacion.investigador?.id

    // ── P0‑1: catálogo de variables de ENTRADA y de SALIDA del modelo ──
    // Gemelo del panel de grupo: la antigüedad del investigador ocupa el
    // lugar de la edad del grupo y la salida es el Ind.Investigador.
    const subtipos = adaptacion.subtipos ?? []
    const listaN = subtipos.map((s) => `${s.codigo} ${entero(s.n)}`).join(' · ')
    const listaVentana = subtipos
      .map((s) => `${s.codigo} ${entero(s.periodo)} a`)
      .join(' · ')
    const listaPesos = subtipos
      .map(
        (s) =>
          `${s.codigo} ${
            s.ancla_subtipo === null ? '—' : entero(s.ancla_subtipo)
          } × ${numero(s.peso_relativo, 1)}`
      )
      .join(' · ')

    const entradas: VariableModelo[] = [
      {
        clave: 'investigador',
        variable: 'Investigador (identificación)',
        valor: adaptacion.investigador?.identificacion ?? '—',
        origen: 'adaptacion.investigador',
      },
      {
        clave: 'antiguedad',
        variable: 'Antigüedad del investigador (años)',
        valor: entero(adaptacion.investigador?.antiguedad_anos ?? NaN),
        origen: 'adaptacion.investigador.antiguedad_anos',
      },
      {
        clave: 'anio-cierre',
        variable: 'Año de cierre',
        // Un año no es una cantidad: se imprime sin separador de miles.
        valor: String(adaptacion.anio_cierre),
        origen: 'adaptacion.anio_cierre',
      },
      {
        clave: 'poblacion',
        variable: 'Población de normalización',
        valor: `${entero(poblacion.length)} investigadores`,
        origen: 'adaptacion.poblacion',
      },
      {
        clave: 'subtipos-n',
        variable: 'Productos por subtipo (n)',
        valor: listaN || '—',
        origen: 'adaptacion.subtipos[].n',
      },
      {
        clave: 'subtipos-ventana',
        variable: 'Período de observación por subtipo (años)',
        valor: listaVentana || '—',
        origen: 'adaptacion.subtipos[].periodo',
      },
      {
        clave: 'subtipos-pesos',
        variable: 'Ancla (Tabla 6) × peso relativo (Anexo 1)',
        valor: listaPesos || '—',
        origen: 'adaptacion.subtipos[] (§3.6)',
      },
      {
        clave: 'cohe',
        variable: 'Cohe — autores coincidentes / productos',
        valor: `${entero(adaptacion.cohe?.suma_autores ?? 0)} autores / ${entero(
          adaptacion.cohe?.productos ?? 0
        )} productos`,
        origen: 'adaptacion.cohe',
      },
      {
        clave: 'coop',
        variable: 'Coop — grupos relacionados / productos',
        valor: `${entero(adaptacion.coop?.suma_grupos ?? 0)} afiliaciones / ${entero(
          adaptacion.coop?.productos ?? 0
        )} productos`,
        origen: 'adaptacion.coop',
      },
      {
        clave: 'contexto',
        variable: 'Productos totales · en ventana',
        valor: `${entero(summary?.total_products ?? NaN)} productos · ${entero(
          summary?.products_in_window ?? NaN
        )} en ventana`,
        origen: 'summary',
      },
      {
        clave: 'conteo-nc-top',
        variable: 'Nc.Top · Nuevos conocimientos TOP — conteo crudo',
        valor: entero(summary?.top_count ?? NaN),
        origen: 'summary.top_count',
      },
      {
        clave: 'conteo-nc-a',
        variable: 'Nc.A · Producción de calidad A — conteo crudo',
        valor: entero(summary?.type_a_count ?? NaN),
        origen: 'summary.type_a_count',
      },
      {
        clave: 'conteo-nc-b',
        variable: 'Nc.B · Producción de calidad B — conteo crudo',
        valor: entero(summary?.type_b_count ?? NaN),
        origen: 'summary.type_b_count',
      },
      {
        clave: 'conteo-ap',
        variable: 'AP · Apropiación social del conocimiento — conteo crudo',
        valor: entero(summary?.asc_count ?? NaN),
        origen: 'summary.asc_count',
      },
      {
        clave: 'conteo-dpc',
        variable: 'DPC · Divulgación pública de la ciencia — conteo crudo',
        valor: entero(summary?.dpc_count ?? NaN),
        origen: 'summary.dpc_count',
      },
      {
        clave: 'conteo-fr-a',
        variable: 'Fr.A · Formación de recurso humano A — conteo crudo',
        valor: entero(summary?.frh_a_count ?? NaN),
        origen: 'summary.frh_a_count',
      },
      {
        clave: 'conteo-fr-b',
        variable: 'Fr.B · Formación de recurso humano B — conteo crudo',
        valor: entero(summary?.frh_b_count ?? NaN),
        origen: 'summary.frh_b_count',
      },
    ]

    const salidas: VariableModelo[] = [
      ...filasTerminos.map((fila) => ({
        clave: `termino-${fila.clave.toLowerCase().replace(/[.\s]+/g, '-')}`,
        variable: `${fila.clave} — índice normalizado / término ponderado`,
        valor: `${numero(fila.indice)} / ${numero(fila.ponderado)}`,
        origen: 'adaptacion.indices · adaptacion.terminos_ponderados',
      })),
      ...clases.map((clase) => ({
        clave: `clase-${clase.clave.toLowerCase().replace(/[.\s]+/g, '-')}`,
        variable: `${clase.clave} — valor de clase / máximo de población`,
        valor: `${numero(clase.valor, 2)} / ${numero(clase.maximo, 2)}`,
        origen: 'adaptacion.ind_clase · adaptacion.maximos_poblacion',
      })),
      {
        clave: 'ind-investigador',
        variable: 'Ind.Investigador (adaptación, NO oficial) · rango teórico',
        valor: `${numero(adaptacion.ind_investigador)} (rango ${numero(
          adaptacion.rango_teorico
        )})`,
        origen: 'adaptacion.ind_investigador · adaptacion.rango_teorico',
      },
      {
        clave: 'puesto',
        variable: 'Puesto y percentil en la población',
        valor: `puesto ${entero(
          adaptacion.posicion_poblacion?.puesto ?? NaN
        )} de ${entero(
          adaptacion.posicion_poblacion?.de ?? NaN
        )} · percentil ${numero(
          adaptacion.posicion_poblacion?.percentil ?? NaN,
          1
        )}`,
        origen: 'adaptacion.posicion_poblacion',
      },
      {
        clave: 'exclusiones',
        variable: 'Exclusiones con motivo (§3.6)',
        valor: `${entero(totalExcluidos)} productos`,
        origen: 'adaptacion.excluidos',
      },
    ]

    return {
      filasTerminos,
      sumaTerminos,
      clases,
      relacionales,
      exclusiones,
      sinAnio,
      fueraDePeriodo,
      poblacion,
      idActual,
      entradas,
      salidas,
    }
  }, [adaptacion, summary])

  if (!adaptacion || !datos) return null

  return (
    <PanelModelo2024
      className={className}
      vista={{
        acento: 'amber',
        icono: <UserRound className='h-5 w-5' />,
        titulo: 'Adaptación individual del Modelo Minciencias 2024',
        descripcion: `Investigador: ${adaptacion.investigador?.identificacion ?? '—'} — antigüedad ${entero(
          adaptacion.investigador?.antiguedad_anos ?? 0
        )} años. Cierre ${adaptacion.anio_cierre}.`,
        rotuloNoOficial: true,
        avisoNoOficial:
          'El modelo 2024 define UN solo indicador de producción y es de GRUPO (§3.10): no hay indicador oficial por persona. Esta es la adaptación declarada del mismo cálculo a la unidad «investigador».',
        etiquetaValor: 'Ind.Investigador (adaptación)',
        valor: adaptacion.ind_investigador,
        rangoTeorico: adaptacion.rango_teorico,
        posicion: {
          puesto: adaptacion.posicion_poblacion?.puesto ?? 0,
          de: adaptacion.posicion_poblacion?.de ?? 0,
          percentil: adaptacion.posicion_poblacion?.percentil ?? 0,
        },
        sumaTerminos: datos.sumaTerminos,
        terminos: datos.filasTerminos,
        clases: datos.clases,
        relacionales: datos.relacionales,
        subtipos: adaptacion.subtipos ?? [],
        notaLambda:
          'λ = ln(productos / período + 1) (§2.2.9) — el período es min(antigüedad del investigador, ventana del subtipo)',
        exclusiones: datos.exclusiones,
        sinAnio: datos.sinAnio,
        fueraDePeriodo: datos.fueraDePeriodo,
        etiquetaFueraDePeriodo: 'Fuera del período',
        textoSinExclusiones: 'Ningún producto quedó fuera de la medición.',
        poblacion: datos.poblacion.map((fila, i) => ({
          clave: `${fila.id}-${i}`,
          etiqueta: fila.investigador,
          valor: fila.ind_investigador,
          actual: fila.id === datos.idActual,
        })),
        poblacionDe: 'investigadores',
        etiquetaActual: 'este investigador',
        testidActual: 'poblacion-investigador-actual',
        entradas: datos.entradas,
        salidas: datos.salidas,
        adaptaciones: adaptacion.adaptaciones ?? [],
        supuestos: adaptacion.supuestos ?? [],
      }}
    />
  )
}
