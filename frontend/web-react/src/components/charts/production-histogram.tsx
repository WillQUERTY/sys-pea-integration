import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface ProductionHistogramProps {
  data: Array<{ year: string; count: number }>
  totalProducts?: number
  initialWindow?: '5y' | '10y' | 'all'
  title?: string
  description?: string
  height?: number
  showTotalBadge?: boolean
  className?: string
}

export function ProductionHistogram({
  data,
  totalProducts,
  initialWindow = '5y',
  title = 'Dinámica Temporal de Producción Científica',
  description,
  height = 270,
  showTotalBadge = true,
  className,
}: ProductionHistogramProps) {
  const [timeWindow, setTimeWindow] = useState<'5y' | '10y' | 'all'>(initialWindow)

  const filteredData = useMemo(() => {
    if (!data?.length) return []
    const allYears = [...data].filter((y) => Number(y.count) > 0)
    if (timeWindow === 'all') return allYears

    const numericYears = allYears.map((item) => Number(item.year)).filter((n) => !isNaN(n))
    const maxYear = numericYears.length > 0 ? Math.max(...numericYears) : 2026
    const minYear = timeWindow === '5y' ? maxYear - 5 : maxYear - 10

    return allYears.filter((item) => {
      const y = Number(item.year)
      return !isNaN(y) && y >= minYear && y <= maxYear
    })
  }, [data, timeWindow])

  const peakYear = useMemo(() => {
    if (!filteredData.length) return null
    return [...filteredData].sort((a, b) => b.count - a.count)[0]
  }, [filteredData])

  const totalInPeriod = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + curr.count, 0)
  }, [filteredData])

  const resolvedDescription =
    description ??
    (timeWindow === '5y'
      ? 'Ventana Minciencias: producción en la ventana evaluable de la convocatoria vigente.'
      : timeWindow === '10y'
        ? 'Consolidación institucional en la última década.'
        : 'Histórico acumulado de obras registradas en la institución.')

  return (
    <Card className={cn('border-border/60 shadow-xs flex flex-col justify-between', className)}>
      <CardHeader className='pb-2.5'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <div>
            <div className='flex items-center gap-2'>
              <BookOpen className='h-4 w-4 text-primary' />
              <CardTitle className='text-sm sm:text-base font-bold'>{title}</CardTitle>
            </div>
            <CardDescription className='text-xs mt-0.5'>{resolvedDescription}</CardDescription>
          </div>

          <div className='flex items-center gap-2 shrink-0 self-start sm:self-center'>
            <div className='flex items-center rounded-lg bg-muted p-0.5 text-xs'>
              <button
                type='button'
                onClick={() => setTimeWindow('5y')}
                className={`px-2 py-1 rounded-md font-medium text-[11px] transition-all ${
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
                className={`px-2 py-1 rounded-md font-medium text-[11px] transition-all ${
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
                className={`px-2 py-1 rounded-md font-medium text-[11px] transition-all ${
                  timeWindow === 'all'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Histórico
              </button>
            </div>

            {showTotalBadge && totalProducts !== undefined && (
              <div className='hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md'>
                <span className='font-semibold text-foreground'>{totalProducts.toLocaleString()}</span> obras
              </div>
            )}
          </div>
        </div>

        <div className='flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40 mt-2'>
          <span>
            Total en periodo: <strong className='text-foreground'>{totalInPeriod.toLocaleString('es-CO')}</strong> obras
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
        {filteredData.length === 0 ? (
          <div className='flex h-[260px] items-center justify-center text-xs text-muted-foreground'>
            Sin registros de producción para el rango seleccionado
          </div>
        ) : (
          <ResponsiveContainer width='100%' height={height}>
            <BarChart data={filteredData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
              <Bar dataKey='count' name='Obras científicas' fill='var(--primary)' radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
