import { Award } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { parseMincienciasClassification } from '@/lib/utils'

export interface ClassificationItem {
  info: ReturnType<typeof parseMincienciasClassification>
  count: number
}

interface MincienciasClassificationCardProps {
  loading: boolean
  totalGroups: number
  classifications: ClassificationItem[]
}

export function MincienciasClassificationCard({
  loading,
  totalGroups,
  classifications,
}: MincienciasClassificationCardProps) {
  return (
    <Card className='col-span-1 lg:col-span-3 border-border/60 shadow-xs flex flex-col justify-between'>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-base font-semibold'>Categorización Minciencias</CardTitle>
            <CardDescription className='text-xs mt-0.5'>
              Distribución de grupos por categoría de excelencia.
            </CardDescription>
          </div>
          <Award className='h-4 w-4 text-amber-500' />
        </div>
      </CardHeader>
      <CardContent className='pt-1 pb-4 flex-1 flex flex-col justify-center'>
        {loading ? (
          <div className='space-y-3'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className='h-10 w-full rounded-lg' />
            ))}
          </div>
        ) : classifications.length === 0 ? (
          <div className='text-sm text-muted-foreground text-center py-6'>
            No se registran clasificaciones disponibles
          </div>
        ) : (
          <div className='space-y-3.5'>
            {classifications.map(({ info, count }) => {
              const pct = totalGroups > 0 ? (count / totalGroups) * 100 : 0
              return (
                <div key={info.code} className='space-y-1.5'>
                  <div className='flex items-center justify-between text-xs sm:text-sm gap-2'>
                    <div className='flex items-center gap-2 min-w-0'>
                      <Badge
                        variant='outline'
                        className={`text-[11px] font-bold px-2 py-0.5 shrink-0 ${info.badgeVariant}`}
                        title={info.rawText}
                      >
                        {info.badgeText}
                      </Badge>
                      <span className='font-medium text-foreground truncate text-xs sm:text-sm'>
                        {info.tier}
                      </span>
                    </div>
                    <span className='font-semibold text-foreground shrink-0 text-xs sm:text-sm'>
                      {count} <span className='text-xs font-normal text-muted-foreground'>({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className='h-2 w-full rounded-full bg-muted overflow-hidden'>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${info.colorClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
      <div className='px-6 pb-4 pt-2 border-t text-xs text-muted-foreground flex items-center justify-between'>
        <span>Total grupos evaluados:</span>
        <span className='font-bold text-foreground'>{totalGroups}</span>
      </div>
    </Card>
  )
}
