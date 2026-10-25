import { Award, Layers } from 'lucide-react'
import type { GroupComparisonGroupItem } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import {
  COMPARISON_GROUP_PALETTE,
  type SharedResearcher,
} from './types'

interface KeyTalentTabProps {
  visibleGroups: GroupComparisonGroupItem[]
  sharedResearchers: SharedResearcher[]
}

export function KeyTalentTab({
  visibleGroups,
  sharedResearchers,
}: KeyTalentTabProps) {
  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between bg-muted/20 p-3 rounded-xl border border-border/60'>
        <div className='flex items-center gap-2'>
          <Award className='h-4 w-4 text-amber-500' />
          <h4 className='text-sm font-bold text-foreground'>
            Puntales Científicos: Investigadores Más Productivos por Colectivo
          </h4>
        </div>
        <span className='text-xs text-muted-foreground'>
          Top autores según volumen de obras asociadas
        </span>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
        {visibleGroups
          .filter((g) => g.id > 0)
          .map((grp, index) => {
            const palette =
              COMPARISON_GROUP_PALETTE[index % COMPARISON_GROUP_PALETTE.length]
            const authors = grp.top_researchers || []

            return (
              <div
                key={grp.id}
                className='p-3.5 rounded-xl border border-border/60 bg-card shadow-2xs space-y-2.5'
              >
                <div className='flex items-center justify-between border-b border-border/50 pb-1.5'>
                  <div className='flex items-center gap-2'>
                    <span className={`h-2.5 w-2.5 rounded-full ${palette.dot}`} />
                    <span className='text-xs font-black text-foreground'>{grp.acronym}</span>
                  </div>
                  <Badge variant='outline' className='text-[10px] font-mono'>
                    {grp.total_members} integrantes
                  </Badge>
                </div>

                <div className='space-y-1.5'>
                  {authors.length > 0 ? (
                    authors.map((auth, aIdx) => (
                      <div
                        key={auth.id || aIdx}
                        className='flex items-center justify-between text-xs gap-2 p-1.5 rounded-lg hover:bg-muted/40 transition-colors'
                      >
                        <div className='min-w-0'>
                          <p className='font-semibold text-foreground truncate' title={auth.name}>
                            {auth.name}
                          </p>
                          <span className='text-[11px] text-muted-foreground'>
                            {(auth as { highest_education?: string }).highest_education || 'Investigador'}
                          </span>
                        </div>
                        <div className='text-right shrink-0'>
                          <span className='font-mono font-bold text-foreground'>
                            {auth.products_count} obras
                          </span>
                          <p className='text-[11px] text-muted-foreground'>
                            {auth.percentage_of_group}% del grupo
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className='text-xs text-muted-foreground text-center py-2'>
                      Sin registros de integrantes
                    </p>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      {sharedResearchers.length > 0 && (
        <div className='p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-2.5 text-xs'>
          <Layers className='h-4 w-4 text-primary shrink-0 mt-0.5' />
          <div>
            <span className='font-bold text-foreground'>Colaboración Cruzada Detectada:</span>{' '}
            <span className='text-muted-foreground'>
              {sharedResearchers.map((sr) => (
                <span key={sr.name} className='inline-block mr-2'>
                  «<strong className='text-foreground'>{sr.name}</strong>» ({sr.groups.join(' y ')})
                </span>
              ))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
