import { useMemo } from 'react'
import { Calculator } from 'lucide-react'
import type {
  MincienciasGroupDiagnosis,
  MincienciasOfficialModel2024,
} from '@/lib/api'
import {
  COEFICIENTES_310,
  CLASES_37,
  entero,
  numero,
  TERMINOS_310,
  type VariableModelo,
} from './modelo-2024-comun'
import { PanelModelo2024 } from './modelo-2024-vista'

export interface OfficialIndicatorPanelProps {
  modelo?: MincienciasOfficialModel2024
  /**
   * Conteos crudos de la clasificación previa (la misma del semáforo legacy).
   * Es OPCIONAL: sin él, la sección de entradas muestra `—` en los conteos
   * crudos (nunca un 0 inventado) y el resto del panel no cambia.
   */
  summary?: MincienciasGroupDiagnosis['summary']
  className?: string
}

/**
 * Fase 2 — desglose auditable de la lectura oficial del modelo de medición
 * Minciencias 2024 (§2.2.9 → §3.10), alimentado por
 * `modelo_oficial_2024` que ya llega en el payload del diagnóstico.
 *
 * Este panel NO calcula el indicador: solo muestra lo que el backend midió
 * (§3.10, §3.8.1, §3.9) y hace explícito el trayecto de los datos:
 * términos ponderados → índices por clase frente al máximo de la población →
 * subtipos que aportan → exclusiones → ranking de la población.
 *
 * La presentación (pestañas Resumen / Cómo se calculó / Comparación /
 * Auditoría) vive en `PanelModelo2024`, compartida con el panel de la
 * adaptación individual; este archivo solo adapta el payload del grupo.
 */
export function OfficialIndicatorPanel({
  modelo,
  summary,
  className,
}: OfficialIndicatorPanelProps) {
  const datos = useMemo(() => {
    if (!modelo) return null

    const indices = modelo.indices ?? {}
    const terminos = modelo.terminos_ponderados ?? {}

    const filasTerminos = TERMINOS_310.map((termino) => {
      const indice = indices[termino.clave] ?? 0
      const ponderado = terminos[termino.clave] ?? 0
      const coeficiente =
        indice > 0 ? ponderado / indice : (COEFICIENTES_310[termino.clave] ?? 0)
      return { ...termino, indice, ponderado, coeficiente }
    })

    const sumaTerminos = filasTerminos.reduce((acc, f) => acc + f.ponderado, 0)

    const clases = CLASES_37.map((clase) => {
      const valor = modelo.ind_clase?.[clase.clave] ?? 0
      const maximo = modelo.maximos_poblacion?.[clase.clave] ?? 0
      return { ...clase, valor, maximo }
    })

    const relacionales = [
      {
        clave: 'Cohe',
        nombre: 'Coautoría interna',
        valor: modelo.cohe?.valor ?? 0,
        maximo: modelo.maximo_cohe_poblacion ?? 0,
        detalle: `${entero(modelo.cohe?.suma_autores ?? 0)} autores · ${entero(
          modelo.cohe?.productos ?? 0
        )} productos`,
      },
      {
        clave: 'Coop',
        nombre: 'Cooperación entre grupos',
        valor: modelo.coop?.valor ?? 0,
        maximo: modelo.maximo_coop_poblacion ?? 0,
        detalle: `${entero(modelo.coop?.suma_grupos ?? 0)} afiliaciones · ${entero(
          modelo.coop?.productos ?? 0
        )} productos`,
      },
    ]

    const exclusiones = Object.entries(modelo.excluidos ?? {}).sort(
      (a, b) => b[1] - a[1]
    )
    const totalExcluidos = exclusiones.reduce((acc, [, n]) => acc + n, 0)
    const sinAnio = Object.values(modelo.sin_ano ?? {}).reduce(
      (acc, n) => acc + n,
      0
    )
    const fueraDePeriodo = Object.values(modelo.fuera_de_periodo ?? {}).reduce(
      (acc, n) => acc + n,
      0
    )

    const poblacion = [...(modelo.poblacion ?? [])].sort(
      (a, b) => b.ind_grupo - a.ind_grupo
    )
    const identificacion = modelo.grupo?.identificacion ?? ''
    const idGrupo = modelo.grupo?.id
    const esGrupoActual = (nombre: string) =>
      identificacion.length > 0
        ? nombre === identificacion ||
          (idGrupo != null && nombre.includes(`#${idGrupo}`))
        : false

    // ── P0‑1: catálogo de variables de ENTRADA y de SALIDA del modelo ──
    // Todo lo de aquí se DERIVA de lo que ya viaja en el payload (contrato
    // único): la UI no calcula el indicador ni inventa datos.
    const subtipos = modelo.subtipos ?? []
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
        clave: 'grupo',
        variable: 'Grupo (identificación)',
        valor: identificacion || '—',
        origen: 'modelo.grupo',
      },
      {
        clave: 'edad',
        variable: 'Edad del grupo (años)',
        valor: entero(modelo.grupo?.edad_anos ?? NaN),
        origen: 'modelo.grupo.edad_anos',
      },
      {
        clave: 'anio-cierre',
        variable: 'Año de cierre',
        // Un año no es una cantidad: se imprime sin separador de miles.
        valor: String(modelo.anio_cierre),
        origen: 'modelo.anio_cierre',
      },
      {
        clave: 'poblacion',
        variable: 'Población de normalización',
        valor: `${entero(poblacion.length)} grupos`,
        origen: 'modelo.poblacion',
      },
      {
        clave: 'subtipos-n',
        variable: 'Productos por subtipo (n)',
        valor: listaN || '—',
        origen: 'modelo.subtipos[].n',
      },
      {
        clave: 'subtipos-ventana',
        variable: 'Ventana por subtipo (años)',
        valor: listaVentana || '—',
        origen: 'modelo.subtipos[].periodo',
      },
      {
        clave: 'subtipos-pesos',
        variable: 'Ancla (Tabla 6) × peso relativo (Anexo 1)',
        valor: listaPesos || '—',
        origen: 'modelo.subtipos[] (§3.6)',
      },
      {
        clave: 'cohe',
        variable: 'Cohe — autores coincidentes / productos',
        valor: `${entero(modelo.cohe?.suma_autores ?? 0)} autores / ${entero(
          modelo.cohe?.productos ?? 0
        )} productos`,
        origen: 'modelo.cohe',
      },
      {
        clave: 'coop',
        variable: 'Coop — grupos relacionados / productos',
        valor: `${entero(modelo.coop?.suma_grupos ?? 0)} afiliaciones / ${entero(
          modelo.coop?.productos ?? 0
        )} productos`,
        origen: 'modelo.coop',
      },
      {
        clave: 'contexto',
        variable: 'Integrantes · productos · en ventana · antigüedad',
        valor: `${entero(summary?.total_members ?? NaN)} integrantes · ${entero(
          summary?.total_products ?? NaN
        )} productos · ${entero(
          summary?.products_in_window ?? NaN
        )} en ventana · ${entero(summary?.years_active ?? NaN)} años`,
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
        origen: 'modelo.indices · modelo.terminos_ponderados',
      })),
      ...clases.map((clase) => ({
        clave: `clase-${clase.clave.toLowerCase().replace(/[.\s]+/g, '-')}`,
        variable: `${clase.clave} — valor de clase / máximo de población`,
        valor: `${numero(clase.valor, 2)} / ${numero(clase.maximo, 2)}`,
        origen: 'modelo.ind_clase · modelo.maximos_poblacion',
      })),
      {
        clave: 'ind-grupo',
        variable: 'Ind.Grupo (rango teórico)',
        valor: `${numero(modelo.ind_grupo)} (rango ${numero(modelo.rango_teorico)})`,
        origen: 'modelo.ind_grupo · modelo.rango_teorico',
      },
      {
        clave: 'puesto',
        variable: 'Puesto y percentil en la población',
        valor: `puesto ${entero(
          modelo.posicion_poblacion?.puesto ?? NaN
        )} de ${entero(modelo.posicion_poblacion?.de ?? NaN)} · percentil ${numero(
          modelo.posicion_poblacion?.percentil ?? NaN,
          1
        )}`,
        origen: 'modelo.posicion_poblacion',
      },
      {
        clave: 'exclusiones',
        variable: 'Exclusiones con motivo (§3.6)',
        valor: `${entero(totalExcluidos)} productos`,
        origen: 'modelo.excluidos',
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
      esGrupoActual,
      entradas,
      salidas,
    }
  }, [modelo, summary])

  if (!modelo || !datos) return null

  return (
    <PanelModelo2024
      className={className}
      vista={{
        acento: 'primary',
        icono: <Calculator className='h-5 w-5' />,
        titulo: 'Desglose del Indicador Oficial Minciencias 2024',
        descripcion: `Cómo se construye el Ind.Grupo a partir de los productos del grupo. Cierre ${modelo.anio_cierre}.`,
        etiquetaValor: 'Ind.Grupo — modelo oficial 2024',
        valor: modelo.ind_grupo,
        rangoTeorico: modelo.rango_teorico,
        posicion: {
          puesto: modelo.posicion_poblacion?.puesto ?? 0,
          de: modelo.posicion_poblacion?.de ?? 0,
          percentil: modelo.posicion_poblacion?.percentil ?? 0,
        },
        sumaTerminos: datos.sumaTerminos,
        terminos: datos.filasTerminos,
        clases: datos.clases,
        relacionales: datos.relacionales,
        subtipos: modelo.subtipos ?? [],
        notaLambda: 'λ = ln(productos / ventana + 1) (§2.2.9)',
        exclusiones: datos.exclusiones,
        sinAnio: datos.sinAnio,
        fueraDePeriodo: datos.fueraDePeriodo,
        etiquetaFueraDePeriodo: 'Fuera de la ventana',
        textoSinExclusiones:
          'Ningún producto quedó fuera de la medición oficial.',
        poblacion: datos.poblacion.map((fila, i) => ({
          clave: `${fila.grupo}-${i}`,
          etiqueta: fila.grupo,
          valor: fila.ind_grupo,
          actual: datos.esGrupoActual(fila.grupo),
        })),
        poblacionDe: 'grupos',
        etiquetaActual: 'este grupo',
        testidActual: 'poblacion-grupo-actual',
        entradas: datos.entradas,
        salidas: datos.salidas,
        supuestos: modelo.supuestos ?? [],
      }}
    />
  )
}
