import { Link } from '@tanstack/react-router'
import { Network, Users, ArrowUpRight, GraduationCap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ResearcherGroupContributionItem, ResearcherTopCoauthorItem } from '@/lib/api'
import { EDUCATION_COLORS } from './chart-tokens'

export interface ResearcherGroupsContributionProps {
  data?: ResearcherGroupContributionItem[]
  isAdmin?: boolean
  className?: string
  title?: string
  description?: string
}

export function ResearcherGroupsContribution({
  data = [],
  isAdmin = false,
  className,
  title = 'Aporte por Grupo de Investigación',
  description = 'Distribución de la producción científica tributada a cada colectivo UPC.',
}: ResearcherGroupsContributionProps) {
  if (!data?.length) {
    return (
      <Card className={cn('border-border/60 shadow-xs', className)}>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm sm:text-base font-bold'>{title}</CardTitle>
          <CardDescription className='text-xs'>{description}</CardDescription>
        </CardHeader>
        <CardContent className='flex h-[180px] items-center justify-center text-xs text-muted-foreground'>
          No se registran grupos vinculados para este investigador.
        </CardContent>
      </Card>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.products_count), 1)

  return (
    <Card className={cn('border-border/60 shadow-xs flex flex-col justify-between', className)}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2 min-w-0'>
            <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0'>
              <Network className='h-4 w-4' />
            </div>
            <div>
              <CardTitle className='text-sm sm:text-base font-bold tracking-tight'>{title}</CardTitle>
              <CardDescription className='text-xs mt-0.5'>{description}</CardDescription>
            </div>
          </div>
          <Badge variant='outline' className='text-[10px] font-normal shrink-0'>
            {data.length} {data.length === 1 ? 'Grupo' : 'Grupos'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='pt-1'>
        <div className='space-y-3.5'>
          {data.map((g) => {
            const groupUrl = isAdmin ? `/admin/groups/${g.id}` : `/groups/${g.id}`
            const widthPct = Math.max(Math.round((g.products_count / maxCount) * 100), 6)

            return (
              <div key={g.id} className='group space-y-1.5 rounded-lg p-2.5 transition-colors hover:bg-muted/40'>
                <div className='flex items-center justify-between gap-2 text-xs'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <Link
                      to={groupUrl}
                      className='font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 truncate'
                    >
                      <span className='truncate'>{g.name}</span>
                      <ArrowUpRight className='h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0' />
                    </Link>
                    {g.acronym && (
                      <Badge variant='outline' className='text-[9px] px-1.5 py-0 h-4 shrink-0 font-medium'>
                        {g.acronym}
                      </Badge>
                    )}
                  </div>
                  <div className='flex items-center gap-2 shrink-0'>
                    <span className='font-mono font-semibold text-foreground'>{g.products_count} prod.</span>
                    <Badge variant='secondary' className='text-[10px] font-mono px-1.5 py-0 h-4'>
                      {g.percentage}%
                    </Badge>
                  </div>
                </div>

                {/* Barra de progreso visual con degradado */}
                <div className='h-2 w-full overflow-hidden rounded-full bg-muted/60'>
                  <div
                    className='h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out group-hover:brightness-110'
                    style={{ width: `${widthPct}%` }}
                  />
                </div>

                <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
                  <span>Rol: <span className='font-medium text-foreground/80'>{g.role || 'Integrante'}</span></span>
                  <span>{g.percentage}% de su producción total</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export interface ResearcherTopCoauthorsProps {
  data?: ResearcherTopCoauthorItem[]
  isAdmin?: boolean
  className?: string
  title?: string
  description?: string
}

export function ResearcherTopCoauthors({
  data = [],
  isAdmin = false,
  className,
  title = 'Red de Coautoría Frecuente',
  description = 'Principales pares y colaboradores científicos en obras conjuntas.',
}: ResearcherTopCoauthorsProps) {
  if (!data?.length) {
    return (
      <Card className={cn('border-border/60 shadow-xs', className)}>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm sm:text-base font-bold'>{title}</CardTitle>
          <CardDescription className='text-xs'>{description}</CardDescription>
        </CardHeader>
        <CardContent className='flex h-[180px] items-center justify-center text-xs text-muted-foreground'>
          No se registran coautorías con otros docentes registrados.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-border/60 shadow-xs flex flex-col justify-between', className)}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2 min-w-0'>
            <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0'>
              <Users className='h-4 w-4' />
            </div>
            <div>
              <CardTitle className='text-sm sm:text-base font-bold tracking-tight'>{title}</CardTitle>
              <CardDescription className='text-xs mt-0.5'>{description}</CardDescription>
            </div>
          </div>
          <Badge variant='outline' className='text-[10px] font-normal shrink-0'>
            Top {data.length} Pares
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='pt-1'>
        <div className='divide-y divide-border/40'>
          {data.map((author, idx) => {
            const authorUrl = isAdmin ? `/admin/researchers/${author.id}` : `/researchers/${author.id}`
            const eduColor =
              EDUCATION_COLORS[author.highest_education ?? ''] ??
              'border-border/70 text-muted-foreground bg-muted/30'

            return (
              <div
                key={author.id}
                className='group flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-muted/30 px-2 rounded-lg'
              >
                <div className='flex items-center gap-2.5 min-w-0'>
                  <span className='flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0'>
                    {idx + 1}
                  </span>
                  <div className='min-w-0'>
                    <Link
                      to={authorUrl}
                      className='text-xs font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1 truncate'
                    >
                      <span className='truncate'>{author.name}</span>
                      <ArrowUpRight className='h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0' />
                    </Link>
                    <div className='flex items-center gap-1.5 mt-0.5'>
                      <GraduationCap className='h-3 w-3 text-muted-foreground shrink-0' />
                      <Badge variant='outline' className={cn('text-[9px] px-1 py-0 h-4 font-normal', eduColor)}>
                        {author.highest_education || 'Pregrado'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className='text-right shrink-0'>
                  <div className='text-xs font-mono font-bold text-primary'>
                    {author.shared_products}
                  </div>
                  <div className='text-[10px] text-muted-foreground'>
                    {author.shared_products === 1 ? 'obra conjunta' : 'obras conjuntas'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
