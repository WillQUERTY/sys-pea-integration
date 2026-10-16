import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Building2,
  ChevronRight,
  FileDown,
  GraduationCap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ActionTooltip } from '@/components/action-tooltip'
import { groupReportPdfUrl } from '@/lib/api'
import type { Group } from '@/lib/types'
import { parseMincienciasClassification } from '@/lib/utils'

interface FeaturedGroupsShowcaseProps {
  loading: boolean
  groups?: Group[]
}

export function FeaturedGroupsShowcase({ loading, groups }: FeaturedGroupsShowcaseProps) {
  const items = groups ?? []

  return (
    <div className='space-y-4'>
      <div className='flex items-end justify-between gap-3'>
        <div className='min-w-0'>
          <h3 className='text-lg font-bold tracking-tight text-foreground'>
            Vitrina de Grupos de Investigación
          </h3>
          <p className='text-xs text-muted-foreground'>
            Acceso directo e interactivo a las fichas públicas de los grupos institucionales.
          </p>
        </div>
        <Button variant='ghost' size='sm' asChild className='shrink-0 text-xs text-primary hover:text-primary'>
          <Link to='/groups'>
            Ver todos <ChevronRight className='ml-1 h-3.5 w-3.5' />
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className='flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-40 w-[85vw] sm:w-auto shrink-0 snap-center rounded-xl' />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className='p-8 text-center border-dashed'>
          <Building2 className='mx-auto h-8 w-8 text-muted-foreground/60 mb-2' />
          <p className='text-sm font-medium text-foreground'>Aún no hay grupos registrados</p>
          <p className='text-xs text-muted-foreground mt-1'>
            La información institucional se sincroniza directamente desde GrupLAC / Minciencias.
          </p>
        </Card>
      ) : (
        <div className='flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0'>
          {items.map((group) => {
            const initials = group.name
              ? group.name
                  .split(' ')
                  .filter((w: string) => w.length > 2)
                  .slice(0, 2)
                  .map((w: string) => w[0].toUpperCase())
                  .join('')
              : 'GP'
            const classInfo = group.classification ? parseMincienciasClassification(group.classification) : null

            return (
              <Card
                key={group.id ?? group.external_code}
                className='group shrink-0 snap-center w-[85vw] sm:w-auto flex flex-col justify-between border-border/70 hover:border-primary/40 hover:shadow-md transition-all duration-200'
              >
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm'>
                      {initials}
                    </div>
                    {classInfo && (
                      <Badge
                        variant='outline'
                        className={`text-[10px] font-bold px-2 py-0.5 shrink-0 ${classInfo.badgeVariant}`}
                        title={group.classification ?? undefined}
                      >
                        {classInfo.badgeText}
                      </Badge>
                    )}
                  </div>
                  <div className='mt-2.5'>
                    <CardTitle className='text-sm font-bold line-clamp-2 leading-snug group-hover:text-primary transition-colors'>
                      {group.name}
                    </CardTitle>
                    {group.acronym && (
                      <span className='text-[11px] font-mono font-medium text-muted-foreground block truncate mt-0.5'>
                        [{group.acronym}]
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className='pt-0 pb-3 flex-1 flex flex-col justify-end'>
                  <div className='space-y-1 text-xs text-muted-foreground'>
                    {group.institution && (
                      <p className='flex items-center gap-1.5 min-w-0'>
                        <Building2 className='h-3.5 w-3.5 shrink-0 opacity-70' />
                        <span className='truncate'>{group.institution}</span>
                      </p>
                    )}
                    {group.knowledge_area && (
                      <p className='flex items-center gap-1.5 min-w-0'>
                        <GraduationCap className='h-3.5 w-3.5 shrink-0 opacity-70' />
                        <span className='truncate'>{group.knowledge_area}</span>
                      </p>
                    )}
                  </div>
                  <div className='mt-4 pt-3 border-t flex items-center justify-between gap-2'>
                    <Button variant='default' size='sm' className='h-8 text-xs flex-1' asChild>
                      <Link to='/groups/$id' params={{ id: String(group.id) }}>
                        Ver Ficha <ArrowRight className='ml-1 h-3.5 w-3.5' />
                      </Link>
                    </Button>
                    {group.id && (
                      <ActionTooltip label='Descargar Reporte PDF'>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-8 w-8 p-0 shrink-0'
                          onClick={() => window.open(groupReportPdfUrl(group.id!), '_blank')}
                        >
                          <FileDown className='h-3.5 w-3.5 text-muted-foreground' />
                        </Button>
                      </ActionTooltip>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
