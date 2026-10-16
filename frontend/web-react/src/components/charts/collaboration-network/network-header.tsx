import { Share2, Users, GitFork, Activity, Award, Filter, Search } from 'lucide-react'
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { NetworkMetrics } from '@/lib/api'

interface NetworkHeaderProps {
  title: string
  description: string
  groupName?: string
  metrics: NetworkMetrics
  minWeightFilter: number
  onMinWeightChange: (weight: number) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

const kpi = 'flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border/60 shadow-2xs'

export function NetworkHeader({
  title,
  description,
  groupName,
  metrics,
  minWeightFilter,
  onMinWeightChange,
  searchQuery,
  onSearchChange,
}: NetworkHeaderProps) {
  return (
    <CardHeader className='pb-3 border-b border-border/40 bg-muted/15'>
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 shadow-2xs'>
            <Share2 className='h-4 w-4' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <CardTitle className='text-sm sm:text-base font-bold tracking-tight'>
                {title}
              </CardTitle>
              <Badge
                variant='outline'
                className='text-[10px] py-0 px-1.5 font-normal border-primary/30 text-primary bg-primary/5'
              >
                Fase 3
              </Badge>
            </div>
            <CardDescription className='text-xs mt-0.5 line-clamp-1'>
              {description} {groupName ? `— ${groupName}` : ''}
            </CardDescription>
          </div>
        </div>

        <div className='grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full sm:w-auto'>
          <div className={cn(kpi, 'justify-center sm:justify-start')}>
            <Users className='h-3.5 w-3.5 text-blue-500' />
            <span className='text-muted-foreground'>Nodos:</span>
            <span className='font-bold tabular-nums'>{metrics.total_nodes}</span>
          </div>
          <div className={cn(kpi, 'justify-center sm:justify-start')}>
            <GitFork className='h-3.5 w-3.5 text-emerald-500' />
            <span className='text-muted-foreground'>Lazos:</span>
            <span className='font-bold tabular-nums'>{metrics.total_edges}</span>
          </div>
          <div className={cn(kpi, 'justify-center sm:justify-start')}>
            <Activity className='h-3.5 w-3.5 text-indigo-500' />
            <span className='text-muted-foreground'>Cohesión:</span>
            <span className='font-bold tabular-nums'>{metrics.cohesion_index}%</span>
          </div>
          <div className={cn(kpi, 'justify-center sm:justify-start')}>
            <Award className='h-3.5 w-3.5 text-amber-500' />
            <span className='text-muted-foreground'>Máx. Coautoría:</span>
            <span className='font-bold tabular-nums'>{metrics.max_weight} docs</span>
          </div>
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-2 pt-2 text-xs'>
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='text-[11px] text-muted-foreground flex items-center gap-1 mr-1'>
            <Filter className='h-3 w-3' /> Filtrar lazos:
          </span>
          {[
            { label: 'Todos', value: 1 },
            { label: '≥ 2 art.', value: 2 },
            { label: '≥ 5 art.', value: 5 },
            { label: '≥ 10 art.', value: 10 },
          ].map((f) => (
            <Button
              key={f.value}
              variant={minWeightFilter === f.value ? 'default' : 'outline'}
              size='sm'
              className='h-6 text-[10px] px-2 py-0'
              onClick={() => onMinWeightChange(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className='relative w-full sm:w-48'>
          <Search className='absolute left-2 top-1.5 h-3 w-3 text-muted-foreground' />
          <Input
            placeholder='Buscar integrante...'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='h-6 text-[11px] pl-6 py-0'
          />
        </div>
      </div>
    </CardHeader>
  )
}
