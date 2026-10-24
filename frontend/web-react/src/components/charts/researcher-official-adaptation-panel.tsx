import { useMemo, type ReactNode } from 'react'
import {
  Calculator,
  Info,
  Layers,
  ListOrdered,
  Scale,
  Ban,
  UserRound,
} from 'lucide-react'
import type { MincienciasIndividualAdaptation2024 } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface ResearcherOfficialAdaptationPanelProps {
  adaptacion?: MincienciasIndividualAdaptation2024
  className?: string
}

/**
 * §3.10 — coeficientes normativos de la fórmula. Se usan SOLO como respaldo:
 * cuando el índice normalizado es > 0 el coeficiente se deriva de los propios
 * datos (`término ÷ índice`), de modo que la UI no puede contradecir al
 * backend aunque el modelo cambie.
 */
const COEFICIENTES_310: Record<string, number> = {
  'Nc.Top': 3.7,
  'Nc.A': 2.3,
  'Nc.B': 0.4,
  AP: 1.5,
  DPC: 0.5,
  'Fr.A': 1,
  'Fr.B': 0.2,
  Cohe: 0.1,
  Coop: 0.3,
}

/** Los nueve términos de la fórmula §3.10, en el orden normativo. */
const TERMINOS_310 = [
  { clave: 'Nc.Top', nombre: 'Nuevos conocimientos TOP' },
  { clave: 'Nc.A', nombre: 'Producción de calidad A' },
  { clave: 'Nc.B', nombre: 'Producción de calidad B' },
  { clave: 'AP', nombre: 'Apropiación social del conocimiento' },
  { clave: 'DPC', nombre: 'Divulgación pública de la ciencia' },
  { clave: 'Fr.A', nombre: 'Formación de recurso humano A' },
  { clave: 'Fr.B', nombre: 'Formación de recurso humano B' },
  { clave: 'Cohe', nombre: 'Coautoría interna' },
  { clave: 'Coop', nombre: 'Cooperación entre grupos' },
]

/** Clases de medición §3.7 y su lectura en el panel. */
const CLASES_37 = [
  { clave: 'TOP', nombre: 'TOP' },
  { clave: 'A', nombre: 'Tipo A' },
  { clave: 'B', nombre: 'Tipo B' },
  { clave: 'ASC', nombre: 'Apropiación social' },
  { clave: 'DPC', nombre: 'Divulgación pública' },
  { clave: 'FRH-A', nombre: 'Formación RH A' },
  { clave: 'FRH-B', nombre: 'Formación RH B' },
]

/** Cuántas razones de exclusión se detallan antes de resumir el resto. */
const MAX_EXCLUSIONES_DETALLADAS = 8

function numero(valor: number, decimales = 3): string {
  if (!Number.isFinite(valor)) return '—'
  return valor.toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

function entero(valor: number): string {
  return valor.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}

/**
 * Barra de magnitud horizontal: extremo de dato redondeado (4px) y extremo de
 * línea base recto. La pista es el "resto" disponible (p. ej. el máximo de la
 * población); el relleno es el valor del investigador.
 */
function Barra({
  valor,
  maximo,
  color,
  etiqueta,
}: {
  valor: number
  maximo: number
  color: string
  etiqueta: string
}) {
  const pct =
    maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0
  return (
    <div
      className='h-2 w-full overflow-hidden rounded-r-[4px] bg-muted/70'
      title={etiqueta}
      role='img'
      aria-label={etiqueta}
    >
      <div
        className={cn('h-full rounded-r-[4px] transition-all duration-500', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function Seccion({
  icono,
  titulo,
  nota,
  children,
}: {
  icono: ReactNode
  titulo: string
  nota?: string
  children: ReactNode
}) {
  return (
    <section className='space-y-3'>
      <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border/40 pb-2'>
        <h4 className='flex items-center gap-2 text-xs font-bold tracking-wider text-foreground uppercase'>
          <span className='text-primary'>{icono}</span>
          {titulo}
        </h4>
        {nota && (
          <span className='text-[11px] text-muted-foreground'>{nota}</span>
        )}
      </div>
      {children}
    </section>
  )
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
 */
export function ResearcherOfficialAdaptationPanel({
  adaptacion,
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

    const maxTermino = filasTerminos.reduce(
      (max, f) => Math.max(max, f.ponderado),
      0
    )
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

    return {
      filasTerminos,
      maxTermino,
      sumaTerminos,
      clases,
      relacionales,
      exclusiones,
      totalExcluidos,
      sinAnio,
      fueraDePeriodo,
      poblacion,
      idActual,
    }
  }, [adaptacion])

  if (!adaptacion || !datos) return null

  const {
    filasTerminos,
    maxTermino,
    sumaTerminos,
    clases,
    relacionales,
    exclusiones,
    totalExcluidos,
    sinAnio,
    fueraDePeriodo,
    poblacion,
    idActual,
  } = datos

  const coincideConElBackend =
    Math.abs(sumaTerminos - adaptacion.ind_investigador) < 1e-6
  const exclusionesDetalladas = exclusiones.slice(0, MAX_EXCLUSIONES_DETALLADAS)
  const exclusionesResto = exclusiones.slice(MAX_EXCLUSIONES_DETALLADAS)
  const totalExclusionesResto = exclusionesResto.reduce(
    (acc, [, n]) => acc + n,
    0
  )

  return (
    <Card className={cn('border-border/60 shadow-xs', className)}>
      <CardHeader className='border-b border-border/40 bg-muted/20 pb-4'>
        <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
          <div className='flex items-start gap-3'>
            <div className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400'>
              <UserRound className='h-5 w-5' />
            </div>
            <div>
              <div className='flex flex-wrap items-center gap-2'>
                <CardTitle className='text-base font-bold tracking-tight sm:text-lg'>
                  Adaptación individual del Modelo Minciencias 2024
                </CardTitle>
                <Badge
                  variant='outline'
                  className='border-amber-500/40 bg-amber-500/10 text-[10px] font-semibold text-amber-700 uppercase dark:text-amber-300'
                  data-testid='rotulo-no-oficial'
                >
                  NO oficial
                </Badge>
                <Badge
                  variant='outline'
                  className='border-primary/30 text-[10px] font-semibold text-primary uppercase'
                >
                  §2.2.9 → §3.10
                </Badge>
              </div>
              <CardDescription className='mt-0.5 text-xs'>
                El modelo 2024 define UN solo indicador de producción y es de
                GRUPO (§3.10): no hay indicador oficial por persona. Esta es la
                adaptación declarada del mismo pipeline a la unidad
                &laquo;investigador&raquo;. Investigador:{' '}
                {adaptacion.investigador?.identificacion} — antigüedad{' '}
                {entero(adaptacion.investigador?.antiguedad_anos ?? 0)} años.
                Cierre {adaptacion.anio_cierre}.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-7 pt-5'>
        {/* Valor titular + posición en la población */}
        <div
          className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-border/60 bg-muted/20 px-4 py-3'
          data-testid='cabecera-indicador'
        >
          <div className='text-xs text-muted-foreground'>
            Ind.Investigador (adaptación) — puesto{' '}
            {entero(adaptacion.posicion_poblacion?.puesto ?? 0)} de{' '}
            {entero(adaptacion.posicion_poblacion?.de ?? 0)} · percentil{' '}
            {numero(adaptacion.posicion_poblacion?.percentil ?? 0, 1)}
          </div>
          <div className='flex items-baseline gap-2'>
            <span className='text-sm font-bold text-foreground'>
              {numero(adaptacion.ind_investigador)} de{' '}
              {numero(adaptacion.rango_teorico)}
            </span>
            <Badge
              variant='outline'
              className='border-border/60 text-[10px] font-medium text-muted-foreground'
            >
              rango teórico
            </Badge>
          </div>
        </div>

        {/* Verificación de la suma: los 9 términos deben reconstruir el valor */}
        <div
          className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-border/60 bg-muted/20 px-4 py-3'
          data-testid='suma-terminos'
        >
          <div className='text-xs text-muted-foreground'>
            Ind.Investigador = Σ (coeficiente × índice normalizado) sobre los 9
            términos de §3.10
          </div>
          <div className='flex items-baseline gap-2'>
            <span className='text-sm font-bold text-foreground'>
              {numero(sumaTerminos)} = {numero(adaptacion.ind_investigador)}
            </span>
            <Badge
              variant='outline'
              className={cn(
                'text-[10px] font-medium',
                coincideConElBackend
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              )}
            >
              {coincideConElBackend
                ? 'suma verificada'
                : 'discrepancia con el backend'}
            </Badge>
          </div>
        </div>

        {/* §3.10 — aporte de cada término */}
        <Seccion
          icono={<Layers className='h-3.5 w-3.5' />}
          titulo='Aporte de cada término al Ind.Investigador (§3.10)'
          nota={`máximo del conjunto: ${numero(maxTermino)}`}
        >
          <div className='space-y-1.5'>
            {filasTerminos.map((fila) => (
              <div
                key={fila.clave}
                className='grid grid-cols-1 items-center gap-x-3 gap-y-1 py-1 sm:grid-cols-[minmax(0,13rem)_1fr_5.5rem]'
                title={`${fila.nombre} — §3.10: ${numero(fila.coeficiente, 1)} × ${numero(
                  fila.indice
                )} = ${numero(fila.ponderado)}`}
                data-testid={`termino-${fila.clave}`}
              >
                <div className='flex min-w-0 items-baseline gap-1.5'>
                  <span className='text-[11px] font-bold text-foreground'>
                    {fila.clave}
                  </span>
                  <span className='font-mono text-[10px] text-muted-foreground'>
                    ×{numero(fila.coeficiente, 1)}
                  </span>
                  <span className='hidden truncate text-[10px] text-muted-foreground lg:inline'>
                    {fila.nombre}
                  </span>
                </div>
                <Barra
                  valor={fila.ponderado}
                  maximo={maxTermino}
                  color='bg-amber-500'
                  etiqueta={`${fila.clave}: ${numero(fila.ponderado)} de ${numero(maxTermino)}`}
                />
                <span className='text-right font-mono text-[11px] text-foreground tabular-nums'>
                  {numero(fila.ponderado)}
                </span>
              </div>
            ))}
          </div>
          <p className='text-[10px] text-muted-foreground'>
            El índice normalizado de cada término es su valor sobre el máximo de
            la población de investigadores (§3.9); ese detalle se ve en el bloque
            siguiente.
          </p>
        </Seccion>

        {/* §3.8.1 → §3.9 — índice por clase frente al máximo de la población */}
        <Seccion
          icono={<Scale className='h-3.5 w-3.5' />}
          titulo='Índice por clase frente al máximo de la población (§3.8.1 → §3.9)'
          nota='barra = valor del investigador / máximo de la población'
        >
          <div className='space-y-1.5'>
            {clases.map((clase) => (
              <div
                key={clase.clave}
                className='grid grid-cols-1 items-center gap-x-3 gap-y-1 py-1 sm:grid-cols-[minmax(0,13rem)_1fr_7rem]'
                title={`${clase.clave}: ${numero(clase.valor)} sobre un máximo de población de ${numero(
                  clase.maximo
                )}`}
                data-testid={`clase-${clase.clave}`}
              >
                <div className='flex min-w-0 items-baseline gap-1.5'>
                  <span className='text-[11px] font-bold text-foreground'>
                    {clase.clave}
                  </span>
                  <span className='hidden truncate text-[10px] text-muted-foreground lg:inline'>
                    {clase.nombre}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Barra
                    valor={clase.valor}
                    maximo={clase.maximo}
                    color='bg-secondary'
                    etiqueta={`${clase.clave}: ${numero(clase.valor)} / ${numero(clase.maximo)}`}
                  />
                  {clase.maximo > 0 && clase.valor >= clase.maximo && (
                    <Badge
                      variant='outline'
                      className='shrink-0 border-emerald-500/40 bg-emerald-500/10 text-[9px] text-emerald-700 dark:text-emerald-300'
                    >
                      tope
                    </Badge>
                  )}
                </div>
                <span className='text-right font-mono text-[11px] text-foreground tabular-nums'>
                  {numero(clase.valor, 2)}
                  <span className='text-muted-foreground'>
                    {' '}
                    / {numero(clase.maximo, 2)}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className='space-y-1.5 border-t border-border/40 pt-2'>
            {relacionales.map((rel) => (
              <div
                key={rel.clave}
                className='grid grid-cols-1 items-center gap-x-3 gap-y-1 py-1 sm:grid-cols-[minmax(0,13rem)_1fr_7rem]'
                title={`${rel.nombre}: ${numero(rel.valor)} sobre un máximo de población de ${numero(
                  rel.maximo
                )} — ${rel.detalle}`}
                data-testid={`relacional-${rel.clave}`}
              >
                <div className='flex min-w-0 items-baseline gap-1.5'>
                  <span className='text-[11px] font-bold text-foreground'>
                    {rel.clave}
                  </span>
                  <span className='hidden truncate text-[10px] text-muted-foreground lg:inline'>
                    {rel.nombre}
                  </span>
                </div>
                <Barra
                  valor={rel.valor}
                  maximo={rel.maximo}
                  color='bg-secondary'
                  etiqueta={`${rel.nombre}: ${numero(rel.valor)} / ${numero(rel.maximo)}`}
                />
                <span className='text-right font-mono text-[11px] text-foreground tabular-nums'>
                  {numero(rel.valor, 3)}
                  <span className='text-muted-foreground'>
                    {' '}
                    / {numero(rel.maximo, 3)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Seccion>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          {/* §2.2.9 + §3.6 + §3.8.1 — subtipos que aportan */}
          <Seccion
            icono={<Layers className='h-3.5 w-3.5' />}
            titulo='Subtipos que aportan (§2.2.9 → §3.8.1)'
            nota={`${adaptacion.subtipos?.length ?? 0} subtipos`}
          >
            {adaptacion.subtipos?.length ? (
              <div className='rounded-lg border border-border/60'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-[10px]'>Subtipo</TableHead>
                      <TableHead className='text-right text-[10px]'>
                        N
                      </TableHead>
                      <TableHead className='text-right text-[10px]'>
                        Período
                      </TableHead>
                      <TableHead className='text-right text-[10px]'>
                        λ
                      </TableHead>
                      <TableHead className='text-right text-[10px]'>
                        Peso
                      </TableHead>
                      <TableHead className='text-right text-[10px]'>
                        Término
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adaptacion.subtipos.map((sub) => (
                      <TableRow
                        key={sub.codigo}
                        data-testid={`subtipo-${sub.codigo}`}
                      >
                        <TableCell className='text-[11px] font-medium text-foreground'>
                          {sub.codigo}
                          <span className='ml-1 text-[10px] text-muted-foreground'>
                            {sub.clase}
                          </span>
                        </TableCell>
                        <TableCell className='text-right font-mono text-[11px] tabular-nums'>
                          {entero(sub.n)}
                        </TableCell>
                        <TableCell className='text-right font-mono text-[11px] text-muted-foreground tabular-nums'>
                          {sub.periodo} a
                        </TableCell>
                        <TableCell className='text-right font-mono text-[11px] tabular-nums'>
                          {numero(sub.lambda)}
                        </TableCell>
                        <TableCell className='text-right font-mono text-[11px] text-muted-foreground tabular-nums'>
                          {entero(sub.peso_global)}
                        </TableCell>
                        <TableCell className='text-right font-mono text-[11px] font-bold text-foreground tabular-nums'>
                          {numero(sub.termino, 2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className='text-[11px] text-muted-foreground'>
                Ningún subtipo del catálogo oficial entra a la medición en la
                ventana vigente.
              </p>
            )}
            <p className='text-[10px] text-muted-foreground'>
              λ = ln(productos / período + 1) (§2.2.9) — el período es
              min(antigüedad del investigador, ventana del subtipo); término = λ ×
              peso global (§3.6).
            </p>
          </Seccion>

          {/* Exclusiones: lo que NO entra a la medición */}
          <Seccion
            icono={<Ban className='h-3.5 w-3.5' />}
            titulo='Exclusiones de la medición'
            nota={`${entero(totalExcluidos)} productos excluidos`}
          >
            {exclusionesDetalladas.length ? (
              <div className='space-y-1.5'>
                {exclusionesDetalladas.map(([motivo, cantidad], i) => (
                  <div
                    key={motivo}
                    className='grid grid-cols-1 items-center gap-x-3 gap-y-1 py-0.5 sm:grid-cols-[minmax(0,1fr)_4rem]'
                    title={`${motivo}: ${entero(cantidad)} productos`}
                    data-testid={`exclusion-${i}`}
                  >
                    <span className='text-[11px] leading-snug text-muted-foreground'>
                      {motivo}
                    </span>
                    <span className='text-right font-mono text-[11px] text-foreground tabular-nums'>
                      {entero(cantidad)}
                    </span>
                  </div>
                ))}
                {exclusionesResto.length > 0 && (
                  <div className='flex items-baseline justify-between gap-3 border-t border-border/40 pt-1'>
                    <span className='text-[10px] text-muted-foreground'>
                      + {exclusionesResto.length} razones menos frecuentes
                    </span>
                    <span className='font-mono text-[11px] text-foreground tabular-nums'>
                      {entero(totalExclusionesResto)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className='text-[11px] text-muted-foreground'>
                Ningún producto quedó fuera de la medición.
              </p>
            )}
            <div className='flex flex-wrap gap-x-4 gap-y-1 border-t border-border/40 pt-2 text-[10px] text-muted-foreground'>
              <span>Sin año verificable: {entero(sinAnio)}</span>
              <span>Fuera del período: {entero(fueraDePeriodo)}</span>
            </div>
          </Seccion>
        </div>

        {/* §3.9 — ranking de la población de normalización */}
        <Seccion
          icono={<ListOrdered className='h-3.5 w-3.5' />}
          titulo='Población de normalización (§3.9)'
          nota={`${poblacion.length} investigadores · percentil ${numero(
            adaptacion.posicion_poblacion?.percentil ?? 0,
            1
          )}`}
        >
          <div className='rounded-lg border border-border/60'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-12 text-[10px]'>Puesto</TableHead>
                  <TableHead className='text-[10px]'>Investigador</TableHead>
                  <TableHead className='text-right text-[10px]'>
                    Ind.Investigador
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poblacion.map((fila, i) => {
                  const actual = fila.id === idActual
                  return (
                    <TableRow
                      key={`${fila.id}-${i}`}
                      className={cn(actual && 'bg-amber-500/10')}
                      data-testid={
                        actual ? 'poblacion-investigador-actual' : undefined
                      }
                    >
                      <TableCell className='font-mono text-[11px] text-muted-foreground tabular-nums'>
                        {i + 1}
                      </TableCell>
                      <TableCell className='text-[11px] text-foreground'>
                        {fila.investigador}
                        {actual && (
                          <Badge
                            variant='outline'
                            className='ml-2 border-amber-500/40 bg-amber-500/10 text-[9px] text-amber-700 dark:text-amber-300'
                          >
                            este investigador
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className='text-right font-mono text-[11px] font-bold text-foreground tabular-nums'>
                        {numero(fila.ind_investigador)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Seccion>

        {/* Las TRES adaptaciones declaradas: el por qué de que NO sea oficial */}
        {adaptacion.adaptaciones?.length > 0 && (
          <Seccion
            icono={<Calculator className='h-3.5 w-3.5' />}
            titulo='Adaptaciones declaradas (por qué esta lectura NO es oficial)'
          >
            <ul className='list-disc space-y-1.5 pl-4'>
              {adaptacion.adaptaciones.map((adaptacionTexto, i) => (
                <li
                  key={i}
                  className='text-[11px] leading-snug text-muted-foreground'
                  data-testid={`adaptacion-${i}`}
                >
                  {adaptacionTexto}
                </li>
              ))}
            </ul>
          </Seccion>
        )}

        {/* Supuestos documentados por el evaluador */}
        {adaptacion.supuestos?.length > 0 && (
          <Seccion
            icono={<Info className='h-3.5 w-3.5' />}
            titulo='Supuestos del cálculo'
          >
            <ul className='list-disc space-y-1.5 pl-4'>
              {adaptacion.supuestos.map((supuesto, i) => (
                <li
                  key={i}
                  className='text-[11px] leading-snug text-muted-foreground'
                >
                  {supuesto}
                </li>
              ))}
            </ul>
          </Seccion>
        )}
      </CardContent>
    </Card>
  )
}
