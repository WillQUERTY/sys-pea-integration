import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FamilyDistributionItem } from '@/lib/api'
import { cn } from '@/lib/utils'
import { FAMILY_COLORS, DEFAULT_CHART_COLOR } from './chart-tokens'

export interface FamiliesDonutProps {
  data?: FamilyDistributionItem[]
  title?: string
  description?: string
  height?: number
  className?: string
}

export function FamiliesDonut({
  data = [],
  title = 'Distribución por Familias 2024',
  description = 'Balance tipológico exigido para categorías A1 y A de Minciencias.',
  height = 180,
  className,
}: FamiliesDonutProps) {
  const totalClassified = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.count, 0)
  }, [data])

  return (
    <Card className={cn('border-border/60 shadow-xs flex flex-col justify-between', className)}>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Award className='h-4 w-4 text-emerald-600' />
            <CardTitle className='text-sm sm:text-base font-bold'>{title}</CardTitle>
          </div>
          <Badge variant='outline' className='text-[10px] font-normal'>
            {totalClassified.toLocaleString('es-CO')} clasificadas
          </Badge>
        </div>
        <CardDescription className='text-xs'>{description}</CardDescription>
      </CardHeader>

      <CardContent className='pb-4 pt-1'>
        {data.length === 0 ? (
          <div className='flex h-[220px] items-center justify-center text-xs text-muted-foreground'>
            No hay familias catalogadas
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='relative w-full' style={{ height: `${height}px` }}>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey='count'
                    nameKey='name'
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {data.map((entry) => (
                      <Cell
                        key={entry.code}
                        fill={FAMILY_COLORS[entry.code] || DEFAULT_CHART_COLOR}
                        stroke='var(--card)'
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const item = payload[0].payload as FamilyDistributionItem
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
              <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
                <span className='text-xl font-extrabold text-foreground tracking-tight'>
                  {totalClassified.toLocaleString()}
                </span>
                <span className='text-[10px] text-muted-foreground uppercase font-medium'>
                  Catalogadas
                </span>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50'>
              {data.map((f) => (
                <div key={f.code} className='flex items-center justify-between gap-1.5 p-1 rounded-md hover:bg-muted/40'>
                  <div className='flex items-center gap-1.5 min-w-0'>
                    <span
                      className='size-2.5 rounded-full shrink-0'
                      style={{ backgroundColor: FAMILY_COLORS[f.code] || DEFAULT_CHART_COLOR }}
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
  )
}
