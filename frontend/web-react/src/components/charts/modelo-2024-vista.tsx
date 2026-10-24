import { useState, type ReactNode } from 'react'
import {
  Ban,
  ChevronRight,
  Info,
  ListOrdered,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as GraficoTooltip,
} from 'recharts'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Barra,
  EntradasSalidasModelo,
  entero,
  MAX_EXCLUSIONES_DETALLADAS,
  numero,
  type VariableModelo,
} from './modelo-2024-comun'

/**
 * Vista compartida del desglose del modelo de medición Minciencias 2024.
 *
 * Los paneles de GRUPO y de INVESTIGADOR (adaptación) eran dos columnas casi
 * idénticas de ocho bloques apilados. Este componente conserva TODO el
 * contenido, pero lo organiza por la pregunta que se hace el usuario:
 *
 * - Resumen: ¿cuánto vale y dónde está mi fuerte y mi brecha?
 * - Cómo se calculó: el recorrido en tres pasos, sin tablas de ocho columnas.
 * - Comparación: ¿dónde quedo frente al resto de la población?
 * - Auditoría: el material de verificación (variables, pesos, exclusiones…).
 *
 * NO calcula el indicador: solo presenta lo que el adaptador le entrega, que
 * a su vez deriva todo del payload del backend (contrato único).
 */

/* ─────────────────────────── tipos de entrada ─────────────────────────── */

export interface FilaTermino {
  clave: string
  nombre: string
  indice: number
  ponderado: number
  coeficiente: number
}

export interface FilaMedida {
  clave: string
  nombre: string
  valor: number
  maximo: number
  detalle?: string
}

export interface FilaSubtipo {
  codigo: string
  clase: string
  n: number
  periodo: number
  lambda: number
  peso_relativo: number
  ancla_subtipo: number | null
  peso_global: number
  termino: number
}

export interface FilaPoblacion {
  clave: string
  etiqueta: string
  valor: number
  actual: boolean
}

export interface VistaModelo2024 {
  /** Color de acento: el grupo usa el primario, el investigador el ámbar. */
  acento: 'primary' | 'amber'
  icono: ReactNode
  titulo: string
  descripcion: ReactNode
  /** Rótulo «NO oficial» siempre visible (solo la adaptación individual). */
  rotuloNoOficial?: boolean
  /** Explicación de por qué la lectura no es oficial. */
  avisoNoOficial?: string
  etiquetaValor: string
  valor: number
  rangoTeorico: number
  posicion: { puesto: number; de: number; percentil: number }
  sumaTerminos: number
  terminos: FilaTermino[]
  clases: FilaMedida[]
  relacionales: FilaMedida[]
  subtipos: FilaSubtipo[]
  /** Texto del cálculo de λ (varía: el investigador usa su antigüedad). */
  notaLambda: string
  exclusiones: [string, number][]
  sinAnio: number
  fueraDePeriodo: number
  etiquetaFueraDePeriodo: string
  textoSinExclusiones: string
  poblacion: FilaPoblacion[]
  /** «grupos» | «investigadores». */
  poblacionDe: string
  /** «este grupo» | «este investigador». */
  etiquetaActual: string
  testidActual: string
  entradas: VariableModelo[]
  salidas: VariableModelo[]
  /** Las adaptaciones declaradas (solo la lectura individual). */
  adaptaciones?: string[]
  supuestos: string[]
}

/* ───────────────────────────── estilos y glosario ───────────────────────────── */

const ACENTOS = {
  primary: {
    barra: 'bg-primary',
    suave: 'bg-primary/10',
    texto: 'text-primary',
    borde: 'border-primary/30',
    fila: 'bg-primary/10',
    hex: '#00A76F',
  },
  amber: {
    barra: 'bg-amber-500',
    suave: 'bg-amber-500/10',
    texto: 'text-amber-600 dark:text-amber-400',
    borde: 'border-amber-500/40',
    fila: 'bg-amber-500/10',
    hex: '#d97706',
  },
} as const

type Acento = (typeof ACENTOS)[keyof typeof ACENTOS]

/**
 * La jerga del modelo (λ, ancla, peso global…) sale de los títulos y vive en
 * una ayuda contextual: quien necesite la definición la lee, quien no, no la
 * tiene delante todo el tiempo.
 */
const GLOSARIO: Record<string, string> = {
  λ: 'Intensidad de producción de un subtipo: ln(productos ÷ ventana + 1). Más productos en menos tiempo dan un λ mayor.',
  'Peso rel.':
    'Peso relativo: importancia del subtipo dentro de su clase (Anexo 1 del modelo).',
  Ancla:
    'Valor de referencia del subtipo en la Tabla 6. Un subtipo sin ancla no se puede ponderar y se excluye de la medición.',
  'Peso global':
    'Peso relativo × ancla (§3.6). Es el factor que multiplica a λ.',
  Término: 'Aporte del subtipo a su clase: λ × peso global.',
  Ventana:
    'Años hacia atrás que cuentan para este subtipo; los productos más antiguos quedan fuera.',
  Percentil: 'Porcentaje de la población que queda por debajo.',
  máximo:
    'Cada clase se divide por el valor más alto de la población (§3.9): quien lidera una clase vale 100 %.',
  Cohe: 'Coautoría interna: cuántos autores coinciden dentro de los productos.',
  Coop: 'Cooperación entre grupos: afiliaciones relacionadas por producto.',
}

function Ayuda({ termino, children }: { termino: string; children?: ReactNode }) {
  const texto = GLOSARIO[termino]
  if (!texto) return <>{children ?? termino}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          className='cursor-help underline decoration-dotted underline-offset-2'
        >
          {children ?? termino}
        </button>
      </TooltipTrigger>
      <TooltipContent className='max-w-xs'>{texto}</TooltipContent>
    </Tooltip>
  )
}

const CLASE_TRIGGER =
  'h-full rounded-none border-b-2 border-transparent px-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none'

/* ───────────────────────────── piezas pequeñas ───────────────────────────── */

function Desplegable({
  titulo,
  nota,
  icono,
  children,
  abierto,
}: {
  titulo: string
  nota?: string
  icono: ReactNode
  children: ReactNode
  abierto?: boolean
}) {
  // <details> nativo: accesible por teclado y el contenido sigue en el DOM.
  return (
    <details
      open={abierto}
      className='group rounded-xl border border-border/60 bg-card'
    >
      <summary className='flex cursor-pointer list-none items-center gap-3 px-4 py-3 select-none [&::-webkit-details-marker]:hidden'>
        <ChevronRight className='h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90' />
        <span className='text-muted-foreground'>{icono}</span>
        <span className='text-sm font-semibold text-foreground'>{titulo}</span>
        {nota && (
          <span className='ml-auto text-xs text-muted-foreground'>{nota}</span>
        )}
      </summary>
      <div className='space-y-3 border-t border-border/50 px-4 py-4'>
        {children}
      </div>
    </details>
  )
}

function Dato({
  icono,
  etiqueta,
  titulo,
  detalle,
  acento,
}: {
  icono: ReactNode
  etiqueta: string
  titulo: string
  detalle: string
  acento: Acento
}) {
  return (
    <div className='rounded-xl border border-border/60 bg-muted/20 p-3.5'>
      <div className='flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase'>
        <span className={acento.texto}>{icono}</span>
        {etiqueta}
      </div>
      <div className='mt-1.5 text-lg font-bold tracking-tight text-foreground'>
        {titulo}
      </div>
      <p className='text-xs leading-snug text-muted-foreground'>{detalle}</p>
    </div>
  )
}

function Paso({
  n,
  titulo,
  descripcion,
  ultimo,
  acento,
  children,
}: {
  n: number
  titulo: string
  descripcion: ReactNode
  ultimo?: boolean
  acento: Acento
  children: ReactNode
}) {
  return (
    <li className='flex gap-4 pb-8 last:pb-0'>
      <div className='flex flex-col items-center'>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            acento.suave,
            acento.texto
          )}
        >
          {n}
        </span>
        {!ultimo && <span className='mt-2 w-px flex-1 bg-border' />}
      </div>
      <div className='min-w-0 flex-1 space-y-3'>
        <div>
          <h4 className='text-sm font-semibold text-foreground'>{titulo}</h4>
          <p className='text-xs leading-relaxed text-muted-foreground'>
            {descripcion}
          </p>
        </div>
        {children}
      </div>
    </li>
  )
}

function FilaBarra({
  clave,
  nombre,
  extra,
  valor,
  maximo,
  color,
  derecha,
  testid,
  title,
  insignia,
}: {
  clave: string
  nombre: string
  extra?: ReactNode
  valor: number
  maximo: number
  color: string
  derecha: ReactNode
  testid?: string
  title?: string
  insignia?: ReactNode
}) {
  return (
    <div
      className='grid grid-cols-[6rem_1fr_auto] items-center gap-x-3 py-1.5 sm:grid-cols-[minmax(0,12rem)_1fr_8rem]'
      data-testid={testid}
      title={title}
    >
      <div className='min-w-0'>
        <div className='flex items-baseline gap-1.5'>
          <span className='text-xs font-semibold text-foreground'>{clave}</span>
          {extra}
        </div>
        <span className='block truncate text-[11px] text-muted-foreground'>
          {nombre}
        </span>
      </div>
      <div className='flex items-center gap-2'>
        <Barra
          valor={valor}
          maximo={maximo}
          color={color}
          etiqueta={`${clave}: ${numero(valor)} de ${numero(maximo)}`}
        />
        {insignia}
      </div>
      <span className='text-right font-mono text-xs text-foreground tabular-nums'>
        {derecha}
      </span>
    </div>
  )
}

/* ───────────────────────────── radar ───────────────────────────── */

interface EjeRadar {
  clave: string
  nombre: string
  pct: number
  valor: number
  maximo: number
}

function RadarTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: EjeRadar }>
}) {
  const eje = payload?.[0]?.payload
  if (!active || !eje) return null
  return (
    <div className='rounded-xl border border-border/80 bg-popover p-3 text-xs shadow-xl'>
      <p className='text-sm font-bold text-foreground'>{eje.clave}</p>
      <p className='text-[11px] text-muted-foreground'>{eje.nombre}</p>
      <p className='mt-1.5 font-mono font-semibold text-foreground'>
        {numero(eje.valor, 2)} / {numero(eje.maximo, 2)}{' '}
        <span className='font-normal text-muted-foreground'>
          ({numero(eje.pct, 0)} % del máximo)
        </span>
      </p>
    </div>
  )
}

function RadarClases({ ejes, acento }: { ejes: EjeRadar[]; acento: Acento }) {
  return (
    <div
      className='h-[300px] w-full text-muted-foreground sm:h-[340px]'
      role='img'
      aria-label={`Radar de ${ejes.length} dimensiones frente al máximo de la población: ${ejes
        .map((e) => `${e.clave} ${numero(e.pct, 0)} %`)
        .join(', ')}`}
    >
      <ResponsiveContainer width='100%' height='100%'>
        <RadarChart data={ejes} outerRadius='72%'>
          <PolarGrid stroke='currentColor' strokeOpacity={0.25} />
          <PolarAngleAxis
            dataKey='clave'
            tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tickCount={5}
            tick={{ fill: 'currentColor', fontSize: 9 }}
            axisLine={false}
          />
          <GraficoTooltip content={<RadarTooltip />} />
          <Radar
            name='Valor frente al máximo (%)'
            dataKey='pct'
            stroke={acento.hex}
            fill={acento.hex}
            fillOpacity={0.28}
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: acento.hex }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ───────────────────────────── ranking ───────────────────────────── */

const FILAS_RANKING_VISIBLES = 10

function RankingPoblacion({
  poblacion,
  acento,
  etiquetaActual,
  testidActual,
}: {
  poblacion: FilaPoblacion[]
  acento: Acento
  etiquetaActual: string
  testidActual: string
}) {
  const [todos, setTodos] = useState(false)
  const maximo = poblacion[0]?.valor ?? 0
  const idxActual = poblacion.findIndex((p) => p.actual)

  const filas = poblacion.map((fila, i) => ({ ...fila, puesto: i + 1 }))
  const principales = todos ? filas : filas.slice(0, FILAS_RANKING_VISIBLES)
  const actualFuera =
    !todos && idxActual >= FILAS_RANKING_VISIBLES ? filas[idxActual] : null

  const renderFila = (fila: (typeof filas)[number]) => (
    <div
      key={`${fila.clave}-${fila.puesto}`}
      className={cn(
        'grid grid-cols-[2rem_1fr_auto] items-center gap-x-3 rounded-lg px-2 py-1.5 sm:grid-cols-[2rem_minmax(0,16rem)_1fr_5rem]',
        fila.actual && acento.fila
      )}
      data-testid={fila.actual ? testidActual : undefined}
    >
      <span className='font-mono text-xs text-muted-foreground tabular-nums'>
        {fila.puesto}
      </span>
      <span className='flex min-w-0 items-center gap-2 text-xs text-foreground'>
        <span className='truncate' title={fila.etiqueta}>
          {fila.etiqueta}
        </span>
        {fila.actual && (
          <Badge
            variant='outline'
            className={cn('shrink-0 text-[10px]', acento.borde, acento.texto)}
          >
            {etiquetaActual}
          </Badge>
        )}
      </span>
      <div className='hidden sm:block'>
        <Barra
          valor={fila.valor}
          maximo={maximo}
          color={fila.actual ? acento.barra : 'bg-muted-foreground/40'}
          etiqueta={`${fila.etiqueta}: ${numero(fila.valor)}`}
        />
      </div>
      <span className='text-right font-mono text-xs font-bold text-foreground tabular-nums'>
        {numero(fila.valor)}
      </span>
    </div>
  )

  if (!poblacion.length) {
    return (
      <p className='text-xs text-muted-foreground'>
        No hay población de normalización disponible.
      </p>
    )
  }

  return (
    <div className='space-y-1'>
      <div className={cn(todos && 'max-h-96 overflow-y-auto pr-1')}>
        {principales.map(renderFila)}
        {actualFuera && (
          <>
            <div className='px-2 py-0.5 text-center text-xs text-muted-foreground'>
              ⋯
            </div>
            {renderFila(actualFuera)}
          </>
        )}
      </div>
      {poblacion.length > FILAS_RANKING_VISIBLES && (
        <button
          type='button'
          onClick={() => setTodos((v) => !v)}
          className={cn(
            'mt-2 text-xs font-medium underline-offset-2 hover:underline',
            acento.texto
          )}
        >
          {todos
            ? 'Mostrar solo el Top 10'
            : `Ver los ${entero(poblacion.length)} completos`}
        </button>
      )}
    </div>
  )
}

/* ───────────────────────────── panel ───────────────────────────── */

export function PanelModelo2024({
  vista,
  className,
}: {
  vista: VistaModelo2024
  className?: string
}) {
  const [pestana, setPestana] = useState('resumen')
  const acento = ACENTOS[vista.acento]

  const {
    terminos,
    clases,
    relacionales,
    subtipos,
    exclusiones,
    sumaTerminos,
    valor,
    posicion,
  } = vista

  const coincideConElBackend = Math.abs(sumaTerminos - valor) < 1e-6
  const maxTermino = terminos.reduce((max, f) => Math.max(max, f.ponderado), 0)
  const maxTerminoSubtipo = subtipos.reduce(
    (max, s) => Math.max(max, s.termino),
    0
  )
  const totalExcluidos = exclusiones.reduce((acc, [, n]) => acc + n, 0)
  const exclusionesDetalladas = exclusiones.slice(0, MAX_EXCLUSIONES_DETALLADAS)
  const exclusionesResto = exclusiones.slice(MAX_EXCLUSIONES_DETALLADAS)
  const totalExclusionesResto = exclusionesResto.reduce(
    (acc, [, n]) => acc + n,
    0
  )

  // Las 9 dimensiones del modelo (§3.9): 7 clases + Cohe + Coop, cada una
  // frente al máximo de la población.
  const ejes: EjeRadar[] = [...clases, ...relacionales].map((e) => ({
    clave: e.clave,
    nombre: e.nombre,
    valor: e.valor,
    maximo: e.maximo,
    pct:
      e.maximo > 0
        ? Math.min(100, Math.max(0, (e.valor / e.maximo) * 100))
        : 0,
  }))
  const ejesConMaximo = ejes.filter((e) => e.maximo > 0)
  const masFuerte = ejesConMaximo.reduce<EjeRadar | null>(
    (mejor, e) => (!mejor || e.pct > mejor.pct ? e : mejor),
    null
  )
  const mayorBrecha = ejesConMaximo.reduce<EjeRadar | null>(
    (peor, e) => (!peor || e.pct < peor.pct ? e : peor),
    null
  )
  const mayorAporte = terminos.reduce<FilaTermino | null>(
    (mejor, t) => (!mejor || t.ponderado > mejor.ponderado ? t : mejor),
    null
  )
  const hayAporte = !!mayorAporte && mayorAporte.ponderado > 0

  return (
    <Card className={cn('border-border/60 shadow-xs', className)}>
      <CardHeader className='border-b border-border/40 bg-muted/20 pb-4'>
        <div className='flex items-start gap-3'>
          <div
            className={cn(
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              acento.suave,
              acento.texto
            )}
          >
            {vista.icono}
          </div>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <CardTitle className='text-base font-bold tracking-tight sm:text-lg'>
                {vista.titulo}
              </CardTitle>
              {vista.rotuloNoOficial && (
                <Badge
                  variant='outline'
                  className='border-amber-500/40 bg-amber-500/10 text-[10px] font-semibold text-amber-700 uppercase dark:text-amber-300'
                  data-testid='rotulo-no-oficial'
                >
                  NO oficial
                </Badge>
              )}
              <Badge
                variant='outline'
                className='border-primary/30 text-[10px] font-semibold text-primary uppercase'
              >
                §2.2.9 → §3.10
              </Badge>
            </div>
            <CardDescription className='mt-0.5 text-xs'>
              {vista.descripcion}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-5 pt-5'>
        {/* Resultado: lo primero que se lee */}
        <div
          className='grid gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'
          data-testid='cabecera-indicador'
        >
          <div className='min-w-0 space-y-2'>
            <div className='text-[11px] font-semibold tracking-wider text-muted-foreground uppercase'>
              {vista.etiquetaValor}
            </div>
            <div className='flex flex-wrap items-baseline gap-x-2'>
              <span className='text-3xl font-extrabold tracking-tight text-foreground tabular-nums'>
                {numero(valor)}
              </span>
              <span className='text-sm text-muted-foreground'>
                de {numero(vista.rangoTeorico)} · rango teórico
              </span>
            </div>
            <Barra
              valor={valor}
              maximo={vista.rangoTeorico}
              color={acento.barra}
              etiqueta={`${vista.etiquetaValor}: ${numero(valor)} de ${numero(vista.rangoTeorico)}`}
            />
          </div>

          <div className='flex flex-wrap items-center gap-2 sm:flex-col sm:items-end'>
            <Badge
              variant='outline'
              className={cn('text-xs font-semibold', acento.borde, acento.texto)}
            >
              {`puesto ${entero(posicion.puesto)} de ${entero(posicion.de)}`}
            </Badge>
            <Badge variant='outline' className='text-xs font-medium'>
              <Ayuda termino='Percentil'>
                {`percentil ${numero(posicion.percentil, 1)}`}
              </Ayuda>
            </Badge>
            <div
              className='flex items-center gap-2'
              data-testid='suma-terminos'
              title='Valor = Σ (coeficiente × índice normalizado) sobre los 9 términos de §3.10'
            >
              <span className='font-mono text-[11px] text-muted-foreground'>
                Σ 9 términos {numero(sumaTerminos)} = {numero(valor)}
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
        </div>

        <Tabs value={pestana} onValueChange={setPestana} className='gap-0'>
          <TabsList className='h-11 w-full justify-start overflow-x-auto rounded-none border-b border-border/50 bg-transparent p-0'>
            <TabsTrigger value='resumen' className={CLASE_TRIGGER}>
              Resumen
            </TabsTrigger>
            <TabsTrigger value='calculo' className={CLASE_TRIGGER}>
              Cómo se calculó
            </TabsTrigger>
            <TabsTrigger value='comparacion' className={CLASE_TRIGGER}>
              Comparación
            </TabsTrigger>
            <TabsTrigger value='auditoria' className={CLASE_TRIGGER}>
              Auditoría
            </TabsTrigger>
          </TabsList>

          {/* Todas las pestañas permanecen montadas (forceMount): el contenido
              sigue en el DOM —buscable, imprimible y verificable— y solo se
              oculta la que no está activa. */}

          {/* ── Resumen ── */}
          <TabsContent
            value='resumen'
            forceMount
            className='space-y-4 pt-5 data-[state=inactive]:hidden'
          >
            <div className='grid gap-4 lg:grid-cols-5'>
              <div className='rounded-2xl border border-border/60 p-3 lg:col-span-3'>
                <div className='px-2 pt-1'>
                  <h4 className='text-sm font-semibold text-foreground'>
                    Perfil frente al máximo de la población
                  </h4>
                  <p className='text-xs text-muted-foreground'>
                    Cada eje es una dimensión del modelo; el borde exterior es el{' '}
                    <Ayuda termino='máximo'>máximo</Ayuda> (100 %).
                  </p>
                </div>
                <RadarClases ejes={ejes} acento={acento} />
              </div>

              <div className='grid content-start gap-3 lg:col-span-2'>
                <Dato
                  acento={acento}
                  icono={<Sparkles className='h-3.5 w-3.5' />}
                  etiqueta='Mayor aporte al indicador'
                  titulo={hayAporte ? mayorAporte.clave : '—'}
                  detalle={
                    hayAporte
                      ? `${mayorAporte.nombre}: ${numero(mayorAporte.ponderado)} (${numero(
                          sumaTerminos > 0
                            ? (mayorAporte.ponderado / sumaTerminos) * 100
                            : 0,
                          0
                        )} % del total)`
                      : 'Ningún término aporta todavía.'
                  }
                />
                <Dato
                  acento={acento}
                  icono={<TrendingUp className='h-3.5 w-3.5' />}
                  etiqueta='Más cerca del máximo'
                  titulo={masFuerte ? masFuerte.clave : '—'}
                  detalle={
                    masFuerte
                      ? `${masFuerte.nombre}: ${numero(masFuerte.pct, 0)} % del máximo de la población.`
                      : 'Sin máximos de población para comparar.'
                  }
                />
                <Dato
                  acento={acento}
                  icono={<TrendingDown className='h-3.5 w-3.5' />}
                  etiqueta='Mayor margen de mejora'
                  titulo={mayorBrecha ? mayorBrecha.clave : '—'}
                  detalle={
                    mayorBrecha
                      ? `${mayorBrecha.nombre}: solo ${numero(mayorBrecha.pct, 0)} % del máximo.`
                      : 'Sin máximos de población para comparar.'
                  }
                />
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground'>
              <span className='flex items-center gap-1.5'>
                <Ban className='h-3.5 w-3.5' />
                {entero(totalExcluidos)} productos quedaron fuera de la medición.
              </span>
              <button
                type='button'
                onClick={() => setPestana('auditoria')}
                className={cn(
                  'font-medium underline-offset-2 hover:underline',
                  acento.texto
                )}
              >
                Ver el detalle en Auditoría
              </button>
            </div>

            {vista.avisoNoOficial && (
              <div className='flex gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200'>
                <Info className='mt-0.5 h-4 w-4 shrink-0' />
                <p>
                  {vista.avisoNoOficial}{' '}
                  <button
                    type='button'
                    onClick={() => setPestana('auditoria')}
                    className='font-semibold underline underline-offset-2'
                  >
                    Ver las adaptaciones declaradas
                  </button>
                </p>
              </div>
            )}
          </TabsContent>

          {/* ── Cómo se calculó ── */}
          <TabsContent
            value='calculo'
            forceMount
            className='pt-5 data-[state=inactive]:hidden'
          >
            <ol>
              <Paso
                n={1}
                acento={acento}
                titulo='Qué productos cuentan'
                descripcion={
                  <>
                    Solo entran los productos de subtipos oficiales dentro de su{' '}
                    <Ayuda termino='Ventana'>ventana</Ayuda> de años. Cada
                    subtipo aporta según cuántos productos tiene y qué tan
                    ponderado está.
                  </>
                }
              >
                {subtipos.length ? (
                  <div className='space-y-1'>
                    {subtipos.map((sub) => (
                      <FilaBarra
                        key={sub.codigo}
                        clave={sub.codigo}
                        nombre={`clase ${sub.clase} · ${entero(sub.n)} ${sub.n === 1 ? 'producto' : 'productos'} · ventana ${entero(sub.periodo)} a`}
                        valor={sub.termino}
                        maximo={maxTerminoSubtipo}
                        color={acento.barra}
                        derecha={numero(sub.termino, 2)}
                        title={`${sub.codigo}: término ${numero(sub.termino, 2)}`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className='text-xs text-muted-foreground'>
                    Ningún subtipo del catálogo oficial entra a la medición en
                    la ventana vigente.
                  </p>
                )}
                <p className='text-[11px] text-muted-foreground'>
                  La cadena completa de pesos (λ, ancla, peso global) está en
                  la pestaña Auditoría.
                </p>
              </Paso>

              <Paso
                n={2}
                acento={acento}
                titulo='Se compara con el máximo de la población'
                descripcion={
                  <>
                    Cada clase se divide por el{' '}
                    <Ayuda termino='máximo'>valor más alto</Ayuda> de la
                    población (§3.9). Una barra llena significa que lidera esa
                    clase.
                  </>
                }
              >
                <div className='space-y-0.5'>
                  {clases.map((clase) => (
                    <FilaBarra
                      key={clase.clave}
                      clave={clase.clave}
                      nombre={clase.nombre}
                      valor={clase.valor}
                      maximo={clase.maximo}
                      color='bg-secondary'
                      derecha={
                        <>
                          {numero(clase.valor, 2)}
                          <span className='text-muted-foreground'>
                            {' '}
                            / {numero(clase.maximo, 2)}
                          </span>
                        </>
                      }
                      testid={`clase-${clase.clave}`}
                      title={`${clase.clave}: ${numero(clase.valor)} sobre un máximo de población de ${numero(clase.maximo)}`}
                      insignia={
                        clase.maximo > 0 && clase.valor >= clase.maximo ? (
                          <Badge
                            variant='outline'
                            className='shrink-0 border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300'
                          >
                            tope
                          </Badge>
                        ) : undefined
                      }
                    />
                  ))}
                  <div className='my-1 border-t border-border/40' />
                  {relacionales.map((rel) => (
                    <FilaBarra
                      key={rel.clave}
                      clave={rel.clave}
                      nombre={rel.nombre}
                      extra={
                        GLOSARIO[rel.clave] ? (
                          <span className='text-[10px] text-muted-foreground'>
                            <Ayuda termino={rel.clave}>¿qué es?</Ayuda>
                          </span>
                        ) : undefined
                      }
                      valor={rel.valor}
                      maximo={rel.maximo}
                      color='bg-secondary'
                      derecha={
                        <>
                          {numero(rel.valor, 3)}
                          <span className='text-muted-foreground'>
                            {' '}
                            / {numero(rel.maximo, 3)}
                          </span>
                        </>
                      }
                      testid={`relacional-${rel.clave}`}
                      title={`${rel.nombre}: ${numero(rel.valor)} sobre un máximo de población de ${numero(rel.maximo)}${rel.detalle ? ` — ${rel.detalle}` : ''}`}
                    />
                  ))}
                </div>
              </Paso>

              <Paso
                n={3}
                ultimo
                acento={acento}
                titulo='Se pondera y se suma'
                descripcion={
                  <>
                    Cada índice se multiplica por su coeficiente (§3.10) y los 9
                    términos se suman: el resultado es el {vista.etiquetaValor}.
                  </>
                }
              >
                <div className='space-y-0.5'>
                  {terminos.map((fila) => (
                    <FilaBarra
                      key={fila.clave}
                      clave={fila.clave}
                      nombre={fila.nombre}
                      extra={
                        <span className='font-mono text-[11px] text-muted-foreground'>
                          ×{numero(fila.coeficiente, 1)}
                        </span>
                      }
                      valor={fila.ponderado}
                      maximo={maxTermino}
                      color={acento.barra}
                      derecha={numero(fila.ponderado)}
                      testid={`termino-${fila.clave}`}
                      title={`${fila.nombre} — §3.10: ${numero(fila.coeficiente, 1)} × ${numero(fila.indice)} = ${numero(fila.ponderado)}`}
                    />
                  ))}
                </div>
                <div className='flex items-baseline justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5'>
                  <span className='text-xs font-semibold text-foreground'>
                    Total = {vista.etiquetaValor}
                  </span>
                  <span className='font-mono text-sm font-bold text-foreground tabular-nums'>
                    {numero(sumaTerminos)}
                  </span>
                </div>
              </Paso>
            </ol>
          </TabsContent>

          {/* ── Comparación ── */}
          <TabsContent
            value='comparacion'
            forceMount
            className='space-y-4 pt-5 data-[state=inactive]:hidden'
          >
            <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
              <Target className='h-4 w-4' />
              <span>
                {`Puesto ${entero(posicion.puesto)} de ${entero(posicion.de)} ${vista.poblacionDe} · `}
                <Ayuda termino='Percentil'>
                  {`percentil ${numero(posicion.percentil, 1)}`}
                </Ayuda>
                . La población fija el máximo contra el que se normaliza cada
                clase.
              </span>
            </div>
            <RankingPoblacion
              poblacion={vista.poblacion}
              acento={acento}
              etiquetaActual={vista.etiquetaActual}
              testidActual={vista.testidActual}
            />
          </TabsContent>

          {/* ── Auditoría ── */}
          <TabsContent
            value='auditoria'
            forceMount
            className='space-y-3 pt-5 data-[state=inactive]:hidden'
          >
            <p className='text-xs text-muted-foreground'>
              Material de verificación: cada bloque se abre solo si lo necesitas.
            </p>

            <Desplegable
              titulo='Variables de entrada y de salida'
              icono={<ListOrdered className='h-4 w-4' />}
              nota={`${entero(vista.entradas.length)} entradas · ${entero(vista.salidas.length)} salidas`}
            >
              <EntradasSalidasModelo
                entradas={vista.entradas}
                salidas={vista.salidas}
                nota='derivado del payload del contrato único (sin recálculo)'
              />
            </Desplegable>

            <Desplegable
              titulo='Cadena de pesos por subtipo (§3.6)'
              icono={<ChevronRight className='h-4 w-4' />}
              nota={`${entero(subtipos.length)} subtipos`}
            >
              {subtipos.length ? (
                <div className='overflow-x-auto rounded-lg border border-border/60'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-xs'>Subtipo</TableHead>
                        <TableHead className='text-right text-xs'>N</TableHead>
                        <TableHead className='text-right text-xs'>
                          <Ayuda termino='Ventana' />
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          <Ayuda termino='λ' />
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          <Ayuda termino='Peso rel.' />
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          <Ayuda termino='Ancla' />
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          <Ayuda termino='Peso global' />
                        </TableHead>
                        <TableHead className='text-right text-xs'>
                          <Ayuda termino='Término' />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subtipos.map((sub) => (
                        <TableRow
                          key={sub.codigo}
                          data-testid={`subtipo-${sub.codigo}`}
                        >
                          <TableCell className='text-xs font-medium text-foreground'>
                            {sub.codigo}
                            <span className='ml-1 text-[11px] text-muted-foreground'>
                              {sub.clase}
                            </span>
                          </TableCell>
                          <TableCell className='text-right font-mono text-xs tabular-nums'>
                            {entero(sub.n)}
                          </TableCell>
                          <TableCell className='text-right font-mono text-xs text-muted-foreground tabular-nums'>
                            {sub.periodo} a
                          </TableCell>
                          <TableCell className='text-right font-mono text-xs tabular-nums'>
                            {numero(sub.lambda)}
                          </TableCell>
                          {/* §3.6 — la cadena del peso, celda por celda.
                              `peso_relativo` es decimal (Anexo 1): NUNCA con
                              `entero()`, que redondearía 9,5 → 10. */}
                          <TableCell
                            className='text-right font-mono text-xs text-muted-foreground tabular-nums'
                            data-testid={`subtipo-${sub.codigo}-peso-relativo`}
                          >
                            {numero(sub.peso_relativo, 1)}
                          </TableCell>
                          {/* Sin ancla en Tabla 6 el peso NO es calculable: se
                              imprime `—` (nunca 0, que diría "no aporta"). */}
                          <TableCell
                            className='text-right font-mono text-xs text-muted-foreground tabular-nums'
                            data-testid={`subtipo-${sub.codigo}-ancla`}
                          >
                            {sub.ancla_subtipo === null
                              ? '—'
                              : entero(sub.ancla_subtipo)}
                          </TableCell>
                          <TableCell
                            className='text-right font-mono text-xs text-muted-foreground tabular-nums'
                            data-testid={`subtipo-${sub.codigo}-peso-global`}
                          >
                            {sub.ancla_subtipo === null
                              ? '—'
                              : entero(sub.peso_global)}
                          </TableCell>
                          <TableCell className='text-right font-mono text-xs font-bold text-foreground tabular-nums'>
                            {numero(sub.termino, 2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className='text-xs text-muted-foreground'>
                  Ningún subtipo del catálogo oficial entra a la medición en la
                  ventana vigente.
                </p>
              )}
              <p className='text-[11px] leading-relaxed text-muted-foreground'>
                {vista.notaLambda} ·{' '}
                <span className='font-semibold text-foreground'>
                  Peso global = peso relativo (Anexo 1) × ancla del subtipo
                  (Tabla 6)
                </span>{' '}
                (§3.6) · término = λ × peso global. Un subtipo sin ancla en Tabla
                6 no admite ponderación: se excluye de la medición.
              </p>
            </Desplegable>

            <Desplegable
              titulo='Exclusiones de la medición'
              icono={<Ban className='h-4 w-4' />}
              nota={`${entero(totalExcluidos)} productos excluidos`}
            >
              {exclusionesDetalladas.length ? (
                <div className='space-y-1'>
                  {exclusionesDetalladas.map(([motivo, cantidad], i) => (
                    <div
                      key={motivo}
                      className='flex items-baseline justify-between gap-3 py-0.5'
                      title={`${motivo}: ${entero(cantidad)} productos`}
                      data-testid={`exclusion-${i}`}
                    >
                      <span className='text-xs leading-snug text-muted-foreground'>
                        {motivo}
                      </span>
                      <span className='font-mono text-xs text-foreground tabular-nums'>
                        {entero(cantidad)}
                      </span>
                    </div>
                  ))}
                  {exclusionesResto.length > 0 && (
                    <div className='flex items-baseline justify-between gap-3 border-t border-border/40 pt-1'>
                      <span className='text-[11px] text-muted-foreground'>
                        + {exclusionesResto.length} razones menos frecuentes
                      </span>
                      <span className='font-mono text-xs text-foreground tabular-nums'>
                        {entero(totalExclusionesResto)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className='text-xs text-muted-foreground'>
                  {vista.textoSinExclusiones}
                </p>
              )}
              <div className='flex flex-wrap gap-x-4 gap-y-1 border-t border-border/40 pt-2 text-[11px] text-muted-foreground'>
                <span>Sin año verificable: {entero(vista.sinAnio)}</span>
                <span>
                  {vista.etiquetaFueraDePeriodo}: {entero(vista.fueraDePeriodo)}
                </span>
              </div>
            </Desplegable>

            {vista.adaptaciones && vista.adaptaciones.length > 0 && (
              <Desplegable
                titulo='Adaptaciones declaradas (por qué esta lectura NO es oficial)'
                icono={<Info className='h-4 w-4' />}
                nota={`${vista.adaptaciones.length} adaptaciones`}
              >
                <ul className='list-disc space-y-1.5 pl-4'>
                  {vista.adaptaciones.map((texto, i) => (
                    <li
                      key={i}
                      className='text-xs leading-snug text-muted-foreground'
                      data-testid={`adaptacion-${i}`}
                    >
                      {texto}
                    </li>
                  ))}
                </ul>
              </Desplegable>
            )}

            {vista.supuestos.length > 0 && (
              <Desplegable
                titulo='Supuestos del cálculo'
                icono={<Info className='h-4 w-4' />}
                nota={`${vista.supuestos.length} supuestos`}
              >
                <ul className='list-disc space-y-1.5 pl-4'>
                  {vista.supuestos.map((supuesto, i) => (
                    <li
                      key={i}
                      className='text-xs leading-snug text-muted-foreground'
                    >
                      {supuesto}
                    </li>
                  ))}
                </ul>
              </Desplegable>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
