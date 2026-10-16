import { Users, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { NetworkNode } from '@/lib/api'
import { getNodeColor, shortName } from './layout'

interface IsolatedNodesListProps {
  nodes: NetworkNode[]
  selectedNodeId: number | null
  onSelectNode: (id: number) => void
  isOpen: boolean
  onToggleOpen: () => void
  minWeightFilter: number
}

export function IsolatedNodesList({
  nodes,
  selectedNodeId,
  onSelectNode,
  isOpen,
  onToggleOpen,
  minWeightFilter,
}: IsolatedNodesListProps) {
  if (nodes.length === 0) return null

  return (
    <div className='border-t border-border/50 bg-muted/10'>
      <button
        type='button'
        onClick={onToggleOpen}
        className='flex w-full items-center justify-between px-4 py-2.5 text-left text-xs hover:bg-muted/30 transition-colors'
        aria-expanded={isOpen}
      >
        <span className='flex items-center gap-2 font-semibold text-foreground'>
          <Users className='h-3.5 w-3.5 text-muted-foreground' />
          Sin coautoría interna
          <Badge variant='secondary' className='text-[10px] py-0 px-1.5'>
            {nodes.length}
          </Badge>
          <span className='hidden sm:inline font-normal text-muted-foreground'>
            {minWeightFilter > 1
              ? `· sin lazos de ≥ ${minWeightFilter} artículos`
              : '· integrantes sin publicaciones conjuntas en el grupo'}
          </span>
        </span>
        {isOpen ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
      </button>
      {isOpen && (
        <div className='flex max-h-44 flex-wrap gap-1.5 overflow-y-auto px-4 pb-3'>
          {nodes.map((n) => {
            const active = selectedNodeId === n.id
            return (
              <button
                key={n.id}
                type='button'
                onClick={() => onSelectNode(n.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/60 bg-background hover:bg-muted/60'
                )}
              >
                <span
                  className='h-2 w-2 rounded-full shrink-0'
                  style={{ backgroundColor: getNodeColor(n.education) }}
                />
                <span className='font-medium'>{shortName(n.name)}</span>
                <span className='text-muted-foreground tabular-nums'>{n.products_count}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
