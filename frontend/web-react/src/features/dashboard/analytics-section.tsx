import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  GraduationCap,
  ShieldCheck,
  Fingerprint,
  Layers,
  BookOpen,
  PieChart as PieIcon,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardStats } from '@/lib/api'

interface AnalyticsSectionProps {
  stats?: DashboardStats
  isLoading: boolean
}

// Paleta institucional Minciencias / Khemia
const FAMILY_COLORS: Record<string, string> = {
  GNC: '#059669', // Emerald 600 - Generación de Nuevo Conocimiento
  DPC: '#2563eb', // Blue 600 - Divulgación Pública de la Ciencia
  DTI: '#d97706', // Amber 600 - Desarrollo Tecnológico e Innovación
  FRH: '#7c3aed', // Violet 600 - Formación de Recurso Humano
  ASC: '#0891b2', // Cyan 600 - Apropiación Social del Conocimiento
}
const DEFAULT_COLOR = '#64748b'

const EDUCATION_COLORS: Record<string, string> = {
  Doctorado: '#059669', // Emerald
  Maestría: '#d97706', // Amber
  Especialización: '#2563eb', // Blue
  Pregrado: '#64748b', // Slate
}

export function AnalyticsSection({ stats, isLoading }: AnalyticsSectionProps) {
  const [timeWindow, setTimeWindow] = useState<'5y' | '10y' | 'all'>('5y')

  // Filtrado reactivo de producción por año según ventana temporal
  const filteredByYear = useMemo(() => {
    if (!stats?.by_year?.length) return []
    const allYears = [...stats.by_year].filter((y) => Number(y.count) > 0)
    if (timeWindow === 'all') return allYears

    // Determinar año máximo en la data (ej. 2026/2027)
    const numericYears = allYears.map((item) => Number(item.year)).filter((n) => !isNaN(n))
    const maxYear = numericYears.length > 0 ? Math.max(...numericYears) : 2026
    const minYear = timeWindow === '5y' ? maxYear - 5 : maxYear - 10

    return allYears.filter((item) => {
      const y = Number(item.year)
      return !isNaN(y) && y >= minYear && y <= maxYear
    })
  }, [stats?.by_year, timeWindow])

  // Año pico en el rango seleccionado
  const peakYear = useMemo(() => {
    if (!filteredByYear.length) return null
    return [...filteredByYear].sort((a, b) => b.count - a.count)[0]
  }, [filteredByYear])

  // Total de obras en el periodo seleccionado
  const totalInPeriod = useMemo(() => {
    return filteredByYear.reduce((acc, curr) => acc + curr.count, 0)
  }, [filteredByYear])

  // Familias con total calculado
  const families = stats?.families_distribution ?? []
  const totalClassified = useMemo(() => {
    return families.reduce((acc, curr) => acc + curr.count, 0)
  }, [families])

  // Investigadores por nivel
  const education = stats?.researchers_education ?? []
  const totalResearchers = stats?.total_researchers ?? 0

  // Top tipologías
  const topSubtypes = stats?.top_subtypes ?? []

  // Ratios estratégicos
  const ratios = stats?.strategic_ratios

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-8 w-64' />
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-24 w-full rounded-xl' />
          ))}
        </div>
        <div className='grid gap-4 lg:grid-cols-7'>
          <Skeleton className='h-80 col-span-4 rounded-xl' />
          <Skeleton className='h-80 col-span-3 rounded-xl' />
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6 pt-2'>
      {/* Encabezado de la Sección de Analítica */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3.5'>
        <div className='flex items-center gap-2.5'>
          <div className='p-2 rounded-xl bg-primary/10 text-primary'>
            <TrendingUp className='h-5 w-5' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-lg sm:text-xl font-bold tracking-tight text-foreground'>
                Analítica y Rendimiento Institucional
              </h2>
              <Badge variant='outline' className='text-[10px] font-medium border-primary/30 text-primary'>
                Minciencias 2024
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Indicadores estratégicos, balance tipológico y dinámica temporal de la investigación en UPC.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <Sparkles className='h-3.5 w-3.5 text-amber-500' />
          <span>Datos en tiempo real</span>
        </div>
      </div>

      {/* 1. SMART RATIOS / KPIs ESTRATÉGICOS */}
      <div className='grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4'>
        <Card className='border-border/60 shadow-xs relative overflow-hidden'>
          <div className='absolute top-0 inset-x-0 h-1 bg-emerald-500' />
          <CardHeader className='flex flex-row items-center justify-between pb-1.5 pt-4'>
            <CardTitle className='text-xs font-medium text-muted-foreground'>
              Tasa de Aval Institucional
            </CardTitle>
            <ShieldCheck className='h-4 w-4 text-emerald-600' />
          </CardHeader>
          <CardContent>
            <div className='flex items-baseline gap-2'>
              <div className='text-2xl font-extrabold text-foreground tracking-tight'>
                {ratios?.endorsement_rate ?? 50.8}%
              </div>
              <Badge variant='secondary' className='text-[10px] font-normal text-emerald-700 dark:text-emerald-400'>
                ✓ Minciencias
              </Badge>
            </div>
            <p className='text-[11px] text-muted-foreground mt-1'>
              {stats?.modelo_2024?.endorsed_products?.toLocaleString('es-CO') ?? 903} obras avaladas oficialmente
            </p>
          </CardContent>
        </Card>

        <Card className='border-border/60 shadow-xs relative overflow-hidden'>
          <div className='absolute top-0 inset-x-0 h-1 bg-amber-500' />
          <CardHeader className='flex flex-row items-center justify-between pb-1.5 pt-4'>
            <CardTitle className='text-xs font-medium text-muted-foreground'>
              Densidad de Posgrados
            </CardTitle>
            <GraduationCap className='h-4 w-4 text-amber-600' />
          </CardHeader>
          <CardContent>
            <div className='flex items-baseline gap-2'>
              <div className='text-2xl font-extrabold text-foreground tracking-tight'>
                {ratios?.postgraduate_rate ?? 66.9}%
              </div>
              <Badge variant='secondary' className='text-[10px] font-normal text-amber-700 dark:text-amber-400'>
                Masa Crítica
              </Badge>
            </div>
            <p className='text-[11px] text-muted-foreground mt-1'>
              Doc/Mag/Esp activos en grupos de investigación
            </p>
          </CardContent>
        </Card>

        <Card className='border-border/60 shadow-xs relative overflow-hidden'>
          <div className='absolute top-0 inset-x-0 h-1 bg-blue-500' />
          <CardHeader className='flex flex-row items-center justify-between pb-1.5 pt-4'>
            <CardTitle className='text-xs font-medium text-muted-foreground'>
              Productividad Media
            </CardTitle>
            <TrendingUp className='h-4 w-4 text-blue-600' />
          </CardHeader>
          <CardContent>
            <div className='flex items-baseline gap-2'>
              <div className='text-2xl font-extrabold text-foreground tracking-tight'>
                {ratios?.avg_products_per_researcher ?? 10.7}
              </div>
              <span className='text-xs text-muted-foreground'>obras / persona</span>
            </div>
            <p className='text-[11px] text-muted-foreground mt-1'>
              Promedio general en el claustro científico
            </p>
          </CardContent>
        </Card>

        <Card className='border-border/60 shadow-xs relative overflow-hidden'>
          <div className='absolute top-0 inset-x-0 h-1 bg-violet-500' />
          <CardHeader className='flex flex-row items-center justify-between pb-1.5 pt-4'>
            <CardTitle className='text-xs font-medium text-muted-foreground'>
              Cobertura ORCID
            </CardTitle>
            <Fingerprint className='h-4 w-4 text-violet-600' />
          </CardHeader>
          <CardContent>
            <div className='flex items-baseline gap-2'>
              <div className='text-2xl font-extrabold text-foreground tracking-tight'>
                {ratios?.orcid_coverage_rate ?? 13.9}%
              </div>
              <Badge variant='outline' className='text-[10px] font-normal border-violet-500/30 text-violet-600'>
                Visibilidad
              </Badge>
            </div>
            <p className='text-[11px] text-muted-foreground mt-1'>
              {stats?.modelo_2024?.researchers_with_orcid ?? 23} de {totalResearchers} investigadores normalizados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. FILA 1: HISTOGRAMA DINÁMICO & DONUT DE FAMILIAS MINCIENCIAS */}
      <div className='grid gap-4 grid-cols-1 lg:grid-cols-7'>
        {/* Histograma interactivo con selector de ventana temporal */}
        <Card className='col-span-1 lg:col-span-4 border-border/60 shadow-xs flex flex-col justify-between'>
          <CardHeader className='pb-2'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <div>
                <div className='flex items-center gap-2'>
                  <BookOpen className='h-4 w-4 text-primary' />
                  <CardTitle className='text-sm sm:text-base font-bold'>
                    Dinámica Temporal de Producción Científica
                  </CardTitle>
                </div>
                <CardDescription className='text-xs mt-0.5'>
                  {timeWindow === '5y'
                    ? 'Ventana Minciencias: producción en la ventana evaluable vigente.'
                    : timeWindow === '10y'
                      ? 'Consolidación institucional en la última década.'
                      : 'Histórico acumulado de obras registradas en la institución.'}
                </CardDescription>
              </div>

              {/* Selector de rango de tiempo */}
              <div className='flex items-center rounded-lg bg-muted p-1 text-xs shrink-0 self-start sm:self-center'>
                <button
                  type='button'
                  onClick={() => setTimeWindow('5y')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    timeWindow === '5y'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  5 Años (Minciencias)
                </button>
                <button
                  type='button'
                  onClick={() => setTimeWindow('10y')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    timeWindow === '10y'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  10 Años
                </button>
                <button
                  type='button'
                  onClick={() => setTimeWindow('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    timeWindow === 'all'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Histórico
                </button>
              </div>
            </div>

            {/* Sub-barra de resumen del periodo */}
            <div className='flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40 mt-2'>
              <span>
                Total en periodo:{' '}
                <strong className='text-foreground'>{totalInPeriod.toLocaleString('es-CO')}</strong> obras
              </span>
              {peakYear && (
                <span className='flex items-center gap-1.5'>
                  Pico de producción:{' '}
                  <Badge variant='secondary' className='text-[10px] font-semibold py-0'>
                    {peakYear.year} ({peakYear.count} obras)
                  </Badge>
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className='ps-0 pe-2 pb-3'>
            {filteredByYear.length === 0 ? (
              <div className='flex h-[260px] items-center justify-center text-xs text-muted-foreground'>
                Sin registros para el rango temporal seleccionado
              </div>
            ) : (
              <ResponsiveContainer width='100%' height={260}>
                <BarChart data={filteredByYear} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='var(--border)' opacity={0.5} />
                  <XAxis
                    dataKey='year'
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tick={{ fill: 'var(--muted-foreground)' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    allowDecimals={false}
                    tick={{ fill: 'var(--muted-foreground)' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const val = Number(payload[0].value)
                      const pct = totalInPeriod > 0 ? ((val / totalInPeriod) * 100).toFixed(1) : '0'
                      return (
                        <div className='rounded-xl border border-border/80 bg-popover/95 p-3 shadow-lg backdrop-blur-md text-xs space-y-1.5 min-w-[150px]'>
                          <div className='font-bold text-foreground flex items-center justify-between'>
                            <span>Año {label}</span>
                            <span className='text-[10px] text-muted-foreground font-normal'>UPC</span>
                          </div>
                          <div className='flex items-center justify-between text-primary font-medium'>
                            <span>Obras científicas:</span>
                            <span className='font-bold tabular-nums text-foreground'>{val.toLocaleString()}</span>
                          </div>
                          <div className='text-[11px] text-muted-foreground pt-1 border-t border-border/50'>
                            Representa el {pct}% del periodo
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey='count'
                    name='Obras científicas'
                    fill='var(--primary)'
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Donut de Familias Minciencias 2024 */}
        <Card className='col-span-1 lg:col-span-3 border-border/60 shadow-xs flex flex-col justify-between'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <PieIcon className='h-4 w-4 text-emerald-600' />
                <CardTitle className='text-sm sm:text-base font-bold'>
                  Distribución por Familias 2024
                </CardTitle>
              </div>
              <Badge variant='outline' className='text-[10px] font-normal'>
                {totalClassified.toLocaleString('es-CO')} clasificadas
              </Badge>
            </div>
            <CardDescription className='text-xs'>
              Balance tipológico exigido para categorías A1 y A de Minciencias.
            </CardDescription>
          </CardHeader>

          <CardContent className='pb-4 pt-1'>
            {families.length === 0 ? (
              <div className='flex h-[240px] items-center justify-center text-xs text-muted-foreground'>
                No hay familias catalogadas
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='relative h-[170px] w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={families}
                        dataKey='count'
                        nameKey='name'
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {families.map((entry) => (
                          <Cell
                            key={entry.code}
                            fill={FAMILY_COLORS[entry.code] || DEFAULT_COLOR}
                            stroke='var(--card)'
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const item = payload[0].payload
                          return (
                            <div className='rounded-xl border border-border/80 bg-popover/95 p-2.5 shadow-lg backdrop-blur-md text-xs space-y-1 min-w-[160px]'>
                              <div className='font-bold text-foreground'>{item.name}</div>
                              <div className='flex items-center justify-between text-muted-foreground'>
                                <span>Código: <strong>{item.code}</strong></span>
                                <span className='font-bold text-foreground'>{item.count} obras</span>
                              </div>
                              <div className='text-[11px] text-primary font-semibold pt-1 border-t border-border/50'>
                                {item.percentage}% del total clasificado
                              </div>
                            </div>
                          )
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Centro de la dona */}
                  <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
                    <span className='text-xl font-extrabold text-foreground tracking-tight'>
                      {totalClassified.toLocaleString()}
                    </span>
                    <span className='text-[10px] text-muted-foreground uppercase font-medium'>
                      Catalogadas
                    </span>
                  </div>
                </div>

                {/* Leyenda interactiva personalizada */}
                <div className='grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50'>
                  {families.map((f) => (
                    <div key={f.code} className='flex items-center justify-between gap-1.5 p-1 rounded-md hover:bg-muted/40'>
                      <div className='flex items-center gap-1.5 min-w-0'>
                        <span
                          className='size-2.5 rounded-full shrink-0'
                          style={{ backgroundColor: FAMILY_COLORS[f.code] || DEFAULT_COLOR }}
                        />
                        <span className='truncate text-[11px] font-medium text-foreground' title={f.name}>
                          {f.code}
                        </span>
                      </div>
                      <span className='text-[11px] font-bold text-muted-foreground tabular-nums shrink-0'>
                        {f.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. FILA 2: COMPOSICIÓN DEL TALENTO HUMANO & TOP TIPOLOGÍAS */}
      <div className='grid gap-4 grid-cols-1 lg:grid-cols-7'>
        {/* Donut de Nivel de Formación Académica */}
        <Card className='col-span-1 lg:col-span-3 border-border/60 shadow-xs flex flex-col justify-between'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <GraduationCap className='h-4 w-4 text-amber-500' />
                <CardTitle className='text-sm sm:text-base font-bold'>
                  Nivel de Formación Académica
                </CardTitle>
              </div>
              <Badge variant='outline' className='text-[10px] font-normal'>
                {totalResearchers} Investigadores
              </Badge>
            </div>
            <CardDescription className='text-xs'>
              Masa crítica según máximo título académico obtenido.
            </CardDescription>
          </CardHeader>

          <CardContent className='pb-4 pt-1'>
            {education.length === 0 ? (
              <div className='flex h-[240px] items-center justify-center text-xs text-muted-foreground'>
                No hay datos de formación registrados
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='relative h-[170px] w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={education}
                        dataKey='count'
                        nameKey='level'
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {education.map((entry) => (
                          <Cell
                            key={entry.level}
                            fill={EDUCATION_COLORS[entry.level] || DEFAULT_COLOR}
                            stroke='var(--card)'
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const item = payload[0].payload
                          return (
                            <div className='rounded-xl border border-border/80 bg-popover/95 p-2.5 shadow-lg backdrop-blur-md text-xs space-y-1 min-w-[160px]'>
                              <div className='font-bold text-foreground'>{item.level}</div>
                              <div className='flex items-center justify-between text-muted-foreground'>
                                <span>Investigadores:</span>
                                <span className='font-bold text-foreground'>{item.count}</span>
                              </div>
                              <div className='text-[11px] text-amber-600 dark:text-amber-400 font-semibold pt-1 border-t border-border/50'>
                                {item.percentage}% de la comunidad
                              </div>
                            </div>
                          )
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Centro de la dona */}
                  <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
                    <span className='text-xl font-extrabold text-foreground tracking-tight'>
                      {totalResearchers}
                    </span>
                    <span className='text-[10px] text-muted-foreground uppercase font-medium'>
                      Investigadores
                    </span>
                  </div>
                </div>

                {/* Leyenda interactiva */}
                <div className='grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50'>
                  {education.map((e) => (
                    <div key={e.level} className='flex items-center justify-between gap-1.5 p-1 rounded-md hover:bg-muted/40'>
                      <div className='flex items-center gap-1.5 min-w-0'>
                        <span
                          className='size-2.5 rounded-full shrink-0'
                          style={{ backgroundColor: EDUCATION_COLORS[e.level] || DEFAULT_COLOR }}
                        />
                        <span className='truncate text-[11px] font-medium text-foreground' title={e.level}>
                          {e.level}
                        </span>
                      </div>
                      <span className='text-[11px] font-bold text-muted-foreground tabular-nums shrink-0'>
                        {e.count} ({e.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 6 Tipologías de Mayor Impacto */}
        <Card className='col-span-1 lg:col-span-4 border-border/60 shadow-xs flex flex-col justify-between'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Layers className='h-4 w-4 text-primary' />
                <CardTitle className='text-sm sm:text-base font-bold'>
                  Top Tipologías de Producción Científica
                </CardTitle>
              </div>
              <Badge variant='outline' className='text-[10px] font-normal'>
                Ranking Institucional
              </Badge>
            </div>
            <CardDescription className='text-xs'>
              Subtipos con mayor volumen de obras registradas y categorizadas.
            </CardDescription>
          </CardHeader>

          <CardContent className='pb-4 pt-1'>
            {topSubtypes.length === 0 ? (
              <div className='flex h-[240px] items-center justify-center text-xs text-muted-foreground'>
                No hay tipologías disponibles
              </div>
            ) : (
              <div className='space-y-3 pt-1'>
                {topSubtypes.slice(0, 6).map((sub, idx) => {
                  const maxCount = topSubtypes[0]?.count || 1
                  const pct = Math.round((sub.count / maxCount) * 100)
                  return (
                    <div key={sub.subtype_id} className='space-y-1'>
                      <div className='flex items-center justify-between text-xs gap-2'>
                        <div className='flex items-center gap-2 min-w-0'>
                          <span className='text-[11px] font-bold text-muted-foreground/80 w-3.5 text-right'>
                            {idx + 1}.
                          </span>
                          <span className='font-medium text-foreground truncate text-[11px] sm:text-xs' title={sub.name}>
                            {sub.name}
                          </span>
                          {sub.code && (
                            <Badge variant='secondary' className='text-[9px] px-1 py-0 font-mono text-muted-foreground'>
                              {sub.code}
                            </Badge>
                          )}
                        </div>
                        <span className='font-bold text-foreground tabular-nums text-xs shrink-0'>
                          {sub.count.toLocaleString('es-CO')} obras
                        </span>
                      </div>
                      <div className='h-2 w-full rounded-full bg-muted overflow-hidden'>
                        <div
                          className='h-full rounded-full bg-primary/80 transition-all duration-500'
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
