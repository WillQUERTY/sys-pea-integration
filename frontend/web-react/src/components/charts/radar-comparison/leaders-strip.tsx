import { Trophy } from 'lucide-react'
import type { DimensionLeaderItem } from '@/lib/api'
import { DIMENSION_ICONS } from './types'

interface LeadersStripProps {
  leaders: DimensionLeaderItem[]
  hoveredGroupId: number | null
  onHoverGroup: (id: number | null) => void
}

export function LeadersStrip({
  leaders,
  hoveredGroupId,
  onHoverGroup,
}: LeadersStripProps) {
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2'>
      {leaders.map((leader) => {
        const IconComp = DIMENSION_ICONS[leader.dimension_key] || Trophy
        const isGroupHovered = hoveredGroupId === leader.leader_group_id

        return (
          <div
            key={leader.dimension_key}
            onMouseEnter={() => onHoverGroup(leader.leader_group_id)}
            onMouseLeave={() => onHoverGroup(null)}
            className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
              isGroupHovered
                ? 'border-primary ring-1 ring-primary/40 bg-card shadow-xs'
                : 'border-border/60 bg-card/50 hover:border-primary/40'
            }`}
          >
            <div className='p-1.5 rounded-lg bg-primary/10 shrink-0 text-primary'>
              <IconComp className='h-3 w-3' />
            </div>
            <div className='min-w-0'>
              <div className='text-[10px] font-bold text-muted-foreground uppercase truncate'>
                {leader.dimension_label.split('(')[1]?.replace(')', '') || leader.dimension_label}
              </div>
              <div className='flex items-baseline gap-1'>
                <span className='text-xs font-black text-foreground truncate'>
                  {leader.leader_acronym}
                </span>
                <span className='text-[10px] font-mono text-muted-foreground'>
                  ({leader.value} {leader.unit})
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
