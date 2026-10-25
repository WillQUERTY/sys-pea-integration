import { Layers } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TopSubtypeItem } from '@/lib/api'
import { EmptyState } from './analytics-kit'

export interface TopSubtypesRankingProps {
  data?: TopSubtypeItem[]
  title?: string
  description?: string
  limit?: number
}

export function TopSubtypesRanking({
  data = [],
  title = 'Top Tipologías de Producción Científica',
  description = 'Subtipos con mayor volumen de obras registradas y categorizadas.',
  limit = 6,
}: TopSubtypesRankingProps) {
  const displayedSubtypes = data.slice(0, limit)
  const maxCount = displayedSubtypes[0]?.count || 1

  return (
    <Card className='border-border/60 shadow-xs flex flex-col justify-between'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Layers className='h-4 w-4 text-primary' />
            <CardTitle className='text-sm sm:text-base font-bold'>{title}</CardTitle>
          </div>
          <Badge variant='outline' className='text-[11px] font-normal'>
            Ranking Institucional
          </Badge>
        </div>
        <CardDescription className='text-xs'>{description}</CardDescription>
      </CardHeader>

      <CardContent className='pb-4 pt-1'>
        {displayedSubtypes.length === 0 ? (
          <EmptyState icon={Layers}>No hay tipologías disponibles</EmptyState>
        ) : (
          <div className='space-y-3 pt-1'>
            {displayedSubtypes.map((sub, idx) => {
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
                        <Badge
                          variant='outline'
                          className='text-[11px] px-1.5 py-0 font-mono text-muted-foreground border-border/70 bg-muted/40'
                        >
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
  )
}
