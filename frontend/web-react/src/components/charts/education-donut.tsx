import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { GraduationCap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ResearcherEducationItem } from '@/lib/api'
import { cn } from '@/lib/utils'
import { EDUCATION_COLORS, DEFAULT_CHART_COLOR } from './chart-tokens'
import { EmptyState } from './analytics-kit'

export interface EducationDonutProps {
  data?: ResearcherEducationItem[]
  totalResearchers?: number
  title?: string
  description?: string
  height?: number
  className?: string
}

export function EducationDonut({
  data = [],
  totalResearchers = 0,
  title = 'Nivel de Formación Académica',
  description = 'Masa crítica según máximo título académico obtenido.',
  height = 180,
  className,
}: EducationDonutProps) {
  const [isHovered, setIsHovered] = useState(false)
  const displayTotal = totalResearchers || data.reduce((acc, curr) => acc + curr.count, 0)

  return (
    <Card className={cn('border-border/60 shadow-xs flex flex-col justify-between', className)}>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <GraduationCap className='h-4 w-4 text-amber-500' />
            <CardTitle className='text-sm sm:text-base font-bold'>{title}</CardTitle>
          </div>
          <Badge variant='outline' className='text-[11px] font-normal'>
            {displayTotal} Investigadores
          </Badge>
        </div>
        <CardDescription className='text-xs'>{description}</CardDescription>
      </CardHeader>

      <CardContent className='pb-4 pt-1'>
        {data.length === 0 ? (
          <EmptyState icon={GraduationCap}>No hay datos de formación registrados</EmptyState>
        ) : (
          <div className='space-y-4'>
            <div className='relative w-full' style={{ height: `${height}px` }}>
              {/* Centro del donut: capa z-0 que se desvanece suavemente al pasar el cursor para evitar superposición con el tooltip */}
              <div
                className={cn(
                  'absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 transition-opacity duration-200',
                  isHovered ? 'opacity-0' : 'opacity-100'
                )}
              >
                <span className='text-xl font-extrabold text-foreground tracking-tight'>
                  {displayTotal}
                </span>
                <span className='text-[11px] text-muted-foreground uppercase font-medium'>
                  Investigadores
                </span>
              </div>

              <ResponsiveContainer width='100%' height='100%' className='relative z-10'>
                <PieChart onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                  <Pie
                    data={data}
                    dataKey='count'
                    nameKey='level'
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {data.map((entry) => (
                      <Cell
                        key={entry.level}
                        fill={EDUCATION_COLORS[entry.level] || DEFAULT_CHART_COLOR}
                        stroke='var(--card)'
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const item = payload[0].payload as ResearcherEducationItem
                      return (
                        <div className='rounded-xl border border-border/80 bg-popover p-2.5 shadow-xl text-xs space-y-1 min-w-[160px]'>
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
            </div>

            <div className='grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-2 border-t border-border/50 pt-3'>
              {data.map((e) => (
                <div
                  key={e.level}
                  className='flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 transition-colors hover:bg-muted/50'
                >
                  <div className='flex min-w-0 items-center gap-2'>
                    <span
                      className='size-2.5 shrink-0 rounded-full'
                      style={{ backgroundColor: EDUCATION_COLORS[e.level] || DEFAULT_CHART_COLOR }}
                    />
                    <span className='line-clamp-2 text-xs font-semibold leading-tight text-foreground' title={e.level}>
                      {e.level}
                    </span>
                  </div>
                  <span className='shrink-0 text-xs font-bold tabular-nums text-muted-foreground'>
                    {e.count} ({e.percentage}%)
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
