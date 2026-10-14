import { Link } from '@tanstack/react-router'
import { Trophy, Award, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { GroupTopResearcherItem } from '@/lib/api'
import { EDUCATION_COLORS } from './chart-tokens'

export interface GroupTopResearchersProps {
  data?: GroupTopResearcherItem[]
  totalGroupProducts?: number
  className?: string
  title?: string
  description?: string
}

export function GroupTopResearchers({
  data = [],
  totalGroupProducts: _totalGroupProducts,
  className,
  title = 'Investigadores Pilares y Mayor Impacto',
  description = 'Liderazgo y distribución del aporte a la producción acumulada del colectivo.',
}: GroupTopResearchersProps) {
  if (!data?.length) {
    return (
      <Card className={cn('border-border/60 shadow-xs', className)}>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm sm:text-base font-bold'>{title}</CardTitle>
          <CardDescription className='text-xs'>{description}</CardDescription>
        </CardHeader>
        <CardContent className='flex h-[200px] items-center justify-center text-xs text-muted-foreground'>
          Sin registros de autoría de integrantes vinculados aún
        </CardContent>
      </Card>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.products_count), 1)
  const top3Contribution = data
    .slice(0, 3)
    .reduce((acc, curr) => acc + curr.percentage_of_group, 0)
    .toFixed(1)

  return (
    <Card className={cn('border-border/60 shadow-xs flex flex-col justify-between', className)}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2 min-w-0'>
            <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0'>
              <Trophy className='h-4 w-4' />
            </div>
            <div>
              <CardTitle className='text-sm sm:text-base font-bold tracking-tight'>{title}</CardTitle>
              <CardDescription className='text-xs mt-0.5'>{description}</CardDescription>
            </div>
          </div>
          <Badge variant='outline' className='text-[10px] font-normal shrink-0 hidden sm:inline-flex'>
            Top {data.length} Autores
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='space-y-3.5 pb-4 pt-1 flex-1'>
        {data.map((res, index) => {
          const rank = index + 1
          const relativeWidth = Math.max((res.products_count / maxCount) * 100, 4)
          const eduColor = EDUCATION_COLORS[res.highest_education] || '#64748b'

          return (
            <div
              key={res.id}
              className='group rounded-xl border border-border/40 bg-muted/20 p-2.5 sm:p-3 transition-all duration-200 hover:bg-muted/50 hover:border-border/80'
            >
              <div className='flex items-start justify-between gap-3'>
                {/* Ranking Medal & Name */}
                <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                  <div
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                      rank === 1
                        ? 'bg-amber-500 text-amber-950 shadow-xs'
                        : rank === 2
                          ? 'bg-slate-300 dark:bg-slate-700 text-foreground'
                          : rank === 3
                            ? 'bg-amber-700/30 text-amber-900 dark:text-amber-200'
                            : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {rank}
                  </div>

                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <Link
                        to='/researchers/$id'
                        params={{ id: String(res.id) }}
                        className='font-semibold text-xs sm:text-sm text-foreground hover:text-primary transition-colors truncate'
                      >
                        {res.name}
                      </Link>

                      {rank === 1 && (
                        <span className='inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-full shrink-0'>
                          <Sparkles className='h-2.5 w-2.5' /> Liderazgo
                        </span>
                      )}
                    </div>

                    <div className='flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap'>
                      <span className='inline-flex items-center gap-1 font-medium'>
                        <span className='size-1.5 rounded-full' style={{ backgroundColor: eduColor }} />
                        {res.highest_education}
                      </span>
                      <span>·</span>
                      <span className='capitalize'>{res.role}</span>
                      {res.orcid && (
                        <>
                          <span>·</span>
                          <span className='text-[10px] font-mono text-emerald-600 dark:text-emerald-400'>
                            ORCID ✓
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Number of products and percentage */}
                <div className='text-right shrink-0'>
                  <div className='text-xs sm:text-sm font-extrabold text-foreground tabular-nums'>
                    {res.products_count}{' '}
                    <span className='text-[10px] font-normal text-muted-foreground'>obras</span>
                  </div>
                  <div className='text-[10px] font-bold text-primary tabular-nums'>
                    {res.percentage_of_group}% del grupo
                  </div>
                </div>
              </div>

              {/* Relative Progress Bar */}
              <div className='mt-2.5 h-1.5 w-full rounded-full bg-muted/80 overflow-hidden'>
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    rank === 1 ? 'bg-amber-500' : 'bg-primary/80'
                  )}
                  style={{ width: `${relativeWidth}%` }}
                />
              </div>
            </div>
          )
        })}

        {/* Analytical Insight */}
        {Number(top3Contribution) > 0 && (
          <div className='flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/15 p-2.5 text-xs text-muted-foreground mt-3'>
            <Award className='h-4 w-4 text-primary shrink-0' />
            <span>
              <strong>Concentración científica:</strong> Los 3 investigadores principales aportan el{' '}
              <strong className='text-foreground'>{top3Contribution}%</strong> de las obras del grupo.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
