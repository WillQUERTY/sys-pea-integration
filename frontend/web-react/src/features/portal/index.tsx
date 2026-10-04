import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  FlaskConical,
  UserRound,
  Users,
  Lightbulb,
  ArrowRight,
  BookOpen,
  Search as SearchIcon,
  Award,
  ChevronRight,
  Compass,
  FileDown,
  Building2,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { getDashboardStats, listGroups, groupReportPdfUrl } from '@/lib/api'
import { parseMincienciasClassification } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { KnowledgeGraph } from '@/components/layout/knowledge-graph'
import { ActionTooltip } from '@/components/action-tooltip'
import { cn } from '@/lib/utils'

// ─── Animated counter ─────────────────────────────────────────────────────────
function CountUp({ value, duration = 1100 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{display.toLocaleString()}</>
}

// ─── Hero stat (sits directly on the emerald, no box) ─────────────────────────
function HeroStat({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <div className='flex flex-col lg:flex-row lg:items-baseline lg:gap-5 lg:py-4 lg:border-b lg:border-white/10 lg:last:border-0'>
      {loading ? (
        <Skeleton className='h-10 w-20 bg-white/15' />
      ) : (
        <span className='text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tabular-nums tracking-tight lg:min-w-[5.5rem]'>
          <CountUp value={value ?? 0} />
        </span>
      )}
      <span className='text-xs sm:text-sm text-emerald-100/70 leading-snug mt-1 lg:mt-0'>{label}</span>
    </div>
  )
}

export function PublicPortal() {
  const navigate = useNavigate()
  const [heroSearch, setHeroSearch] = useState('')

  const statsQuery = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats })
  const featuredGroupsQuery = useQuery({
    queryKey: ['featured-groups'],
    queryFn: () => listGroups({ limit: 4 }),
  })

  const stats = statsQuery.data
  const byYear = stats?.by_year ?? []

  const normalizedClassifications = useMemo(() => {
    const map = new Map<string, { info: ReturnType<typeof parseMincienciasClassification>; count: number }>()
    for (const [rawKey, count] of Object.entries(stats?.groups_by_classification ?? {})) {
      const info = parseMincienciasClassification(rawKey)
      const existing = map.get(info.code)
      if (existing) {
        existing.count += count
      } else {
        map.set(info.code, { info, count })
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => a.info.priority - b.info.priority || b.count - a.count
    )
  }, [stats?.groups_by_classification])

  const validCount = stats?.validation?.['valid'] ?? 0
  const totalProducts = stats?.total_products ?? 0
  const totalGroups = stats?.total_groups ?? 0
  const totalResearchers = stats?.total_researchers ?? 0
  const validationRate = totalProducts > 0 ? ((validCount / totalProducts) * 100).toFixed(1) : '0'

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!heroSearch.trim()) return
    navigate({
      to: '/groups',
      search: { search: heroSearch.trim() } as any,
    })
  }

  return (
    <div className='animate-in fade-in-50 duration-300'>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — Full-width emerald + knowledge graph
      ══════════════════════════════════════════════════════════════════ */}
      <div className='relative overflow-hidden lg:min-h-[580px] flex flex-col justify-center'>
        {/* Dark emerald background */}
        <div className='absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950' />

        {/* Animated knowledge graph */}
        <div className='absolute inset-0'>
          <KnowledgeGraph className='h-full w-full opacity-70' />
        </div>

        {/* Fade to page body — 5-stop eased gradient */}
        <div
          className='absolute inset-x-0 bottom-0 h-20 sm:h-36 lg:h-56 pointer-events-none'
          style={{
            background:
              'linear-gradient(to top, var(--background) 0%, color-mix(in oklch, var(--background) 92%, transparent) 18%, color-mix(in oklch, var(--background) 70%, transparent) 38%, color-mix(in oklch, var(--background) 35%, transparent) 58%, color-mix(in oklch, var(--background) 10%, transparent) 78%, transparent 100%)',
          }}
        />

        {/* ── Hero content ── */}
        <div className='relative mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 pt-10 pb-24 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32'>
          <div className='grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16 lg:items-center'>

            {/* Left: voice + search */}
            <div className='min-w-0'>
              <p className='flex items-center gap-3 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] sm:tracking-[0.22em] text-amber-300/90 mb-5 sm:mb-6'>
                <span className='h-px w-6 sm:w-8 shrink-0 bg-amber-300/70' />
                <span>Khemia · Universidad Popular del Cesar</span>
              </p>

              <h1 className='text-[2.15rem] sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] sm:leading-[1.08] mb-4 sm:mb-5 text-balance'>
                Lo que investiga la UPC,{' '}
                <span className='text-amber-400'>al alcance de todos.</span>
              </h1>

              <p className='text-[15px] sm:text-lg text-emerald-100/75 leading-relaxed mb-7 sm:mb-9 max-w-xl'>
                Conoce a los grupos, las personas y los trabajos que hacen ciencia en la universidad,
                con la categorización oficial de Minciencias a un clic.
              </p>

              {/* Search */}
              <form onSubmit={handleHeroSearch} className='flex flex-col sm:flex-row gap-2.5 max-w-xl mb-6'>
                <div className='relative flex-1'>
                  <SearchIcon className='absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground pointer-events-none' />
                  <Input
                    type='text'
                    placeholder='Busca un grupo, una persona o un artículo…'
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    className={cn(
                      'pl-12 h-12 text-sm rounded-full shadow-lg',
                      'bg-white/95 border-0 ring-2 ring-transparent focus-visible:ring-amber-400/60',
                      'placeholder:text-muted-foreground text-foreground'
                    )}
                  />
                </div>
                <Button
                  type='submit'
                  className='h-12 w-full sm:w-auto px-7 rounded-full font-semibold bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-lg shadow-amber-500/30 border-0 transition-all duration-200'
                >
                  <Compass className='mr-2 h-4 w-4' /> Explorar
                </Button>
              </form>

              {/* Quick links — plain text, no pills */}
              <div className='flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 text-sm text-emerald-100/80'>
                <span className='w-full sm:w-auto text-emerald-100/50'>O entra directo a</span>
                {[
                  { label: 'Grupos', to: '/groups' },
                  { label: 'Investigadores', to: '/researchers' },
                  { label: 'Publicaciones', to: '/products' },
                  { label: 'Proyectos', to: '/projects' },
                ].map(({ label, to }) => (
                  <Link
                    key={to}
                    to={to}
                    className='font-medium text-white underline decoration-amber-400/50 underline-offset-4 hover:decoration-amber-400 hover:text-amber-300 transition-colors'
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: the numbers, living on the emerald itself */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-6 border-t border-white/15 pt-7 lg:grid-cols-1 lg:gap-0 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-12'>
              <HeroStat label='grupos de investigación' value={totalGroups} loading={statsQuery.isLoading} />
              <HeroStat label='investigadores' value={totalResearchers} loading={statsQuery.isLoading} />
              <HeroStat label='productos científicos' value={totalProducts} loading={statsQuery.isLoading} />
              <HeroStat label='proyectos de I+D' value={stats?.modelo_2024?.total_projects ?? 0} loading={statsQuery.isLoading} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          BODY — Cards + Charts + Showcase
      ══════════════════════════════════════════════════════════════════ */}
      <div className='mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 pb-12 sm:pb-16 space-y-10 sm:space-y-14'>

        {/* Explore — navigation tiles (numbers already live in the hero) */}
        <section className='space-y-5 sm:space-y-6'>
          <div className='max-w-xl'>
            <h2 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>¿Por dónde quieres empezar?</h2>
            <p className='text-sm text-muted-foreground mt-1.5'>
              Cada puerta lleva a una parte distinta de la ciencia que se hace en la UPC.
            </p>
          </div>
          <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:pb-6 lg:[&>*:nth-child(even)]:translate-y-6'>
            <DiscoveryCard
              title='Grupos de investigación'
              description='Las unidades que investigan en la universidad, con sus líneas de trabajo y su categoría Minciencias.'
              icon={<Users className='h-5 w-5' />}
              tint='emerald'
              to='/groups'
              label='Ver los grupos'
              note={
                normalizedClassifications.find((c) => c.info.code === 'A1')
                  ? `${normalizedClassifications.find((c) => c.info.code === 'A1')?.count} en categoría A1`
                  : undefined
              }
            />
            <DiscoveryCard
              title='Investigadores'
              description='Docentes, líderes de grupo y autores: quiénes son y en qué proyectos y publicaciones participan.'
              icon={<UserRound className='h-5 w-5' />}
              tint='violet'
              to='/researchers'
              label='Conocer a las personas'
              note={
                stats?.modelo_2024 && totalResearchers > 0
                  ? `${stats.modelo_2024.researchers_with_orcid} con ORCID`
                  : undefined
              }
            />
            <DiscoveryCard
              title='Producción científica'
              description='Artículos, libros, capítulos, software y patentes publicados por los grupos.'
              icon={<FlaskConical className='h-5 w-5' />}
              tint='blue'
              to='/products'
              label='Explorar el catálogo'
              note={validCount > 0 ? `${validationRate}% verificada` : undefined}
            />
            <DiscoveryCard
              title='Proyectos de I+D'
              description='Iniciativas en marcha, planes de trabajo y transferencia de conocimiento al territorio.'
              icon={<Lightbulb className='h-5 w-5' />}
              tint='amber'
              to='/projects'
              label='Ver los proyectos'
            />
          </div>
        </section>

        {/* Analytics */}
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
          {/* Histogram */}
          <Card className='col-span-1 lg:col-span-4 border-border/60 shadow-xs'>
            <CardHeader className='pb-3'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <TrendingUp className='h-4 w-4 text-primary' />
                    <CardTitle className='text-base font-semibold'>Dinámica Temporal de Producción</CardTitle>
                    <Badge variant='secondary' className='text-[11px] font-normal'>Crecimiento Histórico</Badge>
                  </div>
                  <CardDescription className='text-xs mt-1'>
                    Distribución de publicaciones según el año de obtención declarado.
                  </CardDescription>
                </div>
                <div className='flex w-fit shrink-0 items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md'>
                  <BookOpen className='h-3.5 w-3.5 text-primary' />
                  <span className='font-semibold text-foreground'>{totalProducts.toLocaleString()}</span> obras
                </div>
              </div>
            </CardHeader>
            <CardContent className='ps-2'>
              {statsQuery.isLoading ? (
                <Skeleton className='h-[290px] w-full rounded-xl' />
              ) : byYear.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-[290px] text-muted-foreground text-sm'>
                  <BookOpen className='h-8 w-8 mb-2 opacity-40' />
                  <span>Sin registros de producción por año aún</span>
                </div>
              ) : (
                <ResponsiveContainer width='100%' height={290}>
                  <BarChart data={byYear} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='var(--border)' opacity={0.6} />
                    <XAxis dataKey='year' tickLine={false} axisLine={false} fontSize={11} tick={{ fill: 'var(--muted-foreground)' }} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} tick={{ fill: 'var(--muted-foreground)' }} />
                    <Tooltip cursor={{ fill: 'var(--accent)' }} content={<CustomTooltip />} />
                    <Bar dataKey='count' name='Productos científicos' fill='var(--primary)' radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Classification */}
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
              {statsQuery.isLoading ? (
                <div className='space-y-3'>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className='h-10 w-full rounded-lg' />
                  ))}
                </div>
              ) : normalizedClassifications.length === 0 ? (
                <div className='text-sm text-muted-foreground text-center py-6'>
                  No se registran clasificaciones disponibles
                </div>
              ) : (
                <div className='space-y-3.5'>
                  {normalizedClassifications.map(({ info, count }) => {
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
                            <span className='font-medium text-foreground truncate text-xs sm:text-sm'>{info.tier}</span>
                          </div>
                          <span className='font-semibold text-foreground shrink-0 text-xs sm:text-sm'>
                            {count} <span className='text-xs font-normal text-muted-foreground'>({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className='h-2 w-full rounded-full bg-muted overflow-hidden'>
                          <div className={`h-full rounded-full transition-all duration-500 ${info.colorClass}`} style={{ width: `${pct}%` }} />
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
        </div>

        {/* Showcase: featured groups */}
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

          {featuredGroupsQuery.isLoading ? (
            <div className='flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-40 w-[85vw] sm:w-auto shrink-0 snap-center rounded-xl' />
              ))}
            </div>
          ) : (featuredGroupsQuery.data?.items ?? []).length === 0 ? (
            <Card className='p-8 text-center border-dashed'>
              <Building2 className='mx-auto h-8 w-8 text-muted-foreground/60 mb-2' />
              <p className='text-sm font-medium text-foreground'>Aún no hay grupos registrados</p>
              <p className='text-xs text-muted-foreground mt-1'>
                La información institucional se sincroniza directamente desde GrupLAC / Minciencias.
              </p>
            </Card>
          ) : (
            <div className='flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0'>
              {featuredGroupsQuery.data?.items.map((group) => {
                const initials = group.name
                  ? group.name.split(' ').filter((w) => w.length > 2).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
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

        {/* CTA — Portal de Gestión */}
        <div className='relative overflow-hidden rounded-2xl'>
          {/* Fondo esmeralda oscuro */}
          <div className='absolute inset-0 bg-gradient-to-r from-emerald-900 to-emerald-800' />
          {/* Mini grafo de fondo */}
          <div className='absolute inset-0 opacity-25'>
            <KnowledgeGraph className='h-full w-full' />
          </div>
          <div className='relative px-5 sm:px-10 py-7 sm:py-8 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6'>
            <div className='space-y-2 max-w-xl'>
              <div className='flex items-start sm:items-center gap-2'>
                <ShieldCheck className='h-5 w-5 shrink-0 text-amber-400 mt-0.5 sm:mt-0' />
                <h4 className='text-base sm:text-lg font-bold text-white'>Gestión y Validación Institucional</h4>
              </div>
              <p className='text-sm text-emerald-200/75 leading-relaxed'>
                Área técnica para evaluadores y administradores: ingesta de GrupLAC/CvLAC, cola FIFO de validación,
                reclasificación de tipologías y consola de mantenimiento.
              </p>
            </div>
            <Button
              asChild
              className='w-full md:w-auto shrink-0 bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold rounded-full px-7 shadow-lg shadow-amber-500/30 border-0'
            >
              <Link to='/admin'>
                <ShieldCheck className='mr-2 h-4 w-4' /> Ingresar a Gestión
              </Link>
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────
const TINTS = {
  emerald: { box: 'bg-emerald-500/[0.07] border-emerald-500/15 hover:border-emerald-500/40 hover:bg-emerald-500/[0.12]', icon: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  violet: { box: 'bg-violet-500/[0.07] border-violet-500/15 hover:border-violet-500/40 hover:bg-violet-500/[0.12]', icon: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  blue: { box: 'bg-sky-500/[0.07] border-sky-500/15 hover:border-sky-500/40 hover:bg-sky-500/[0.12]', icon: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  amber: { box: 'bg-amber-500/[0.08] border-amber-500/20 hover:border-amber-500/45 hover:bg-amber-500/[0.14]', icon: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
} as const

function DiscoveryCard({
  title, description, icon, tint, to, label, note,
}: {
  title: string; description: string; icon: React.ReactNode
  tint: keyof typeof TINTS; to: string; label: string; note?: string
}) {
  const t = TINTS[tint]
  return (
    <Link
      to={to}
      className={cn(
        'group flex flex-col rounded-2xl sm:rounded-3xl border p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1',
        t.box
      )}
    >
      <div className={cn('flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl', t.icon)}>{icon}</div>
      <h3 className='mt-3 sm:mt-5 text-[15px] sm:text-lg font-bold tracking-tight leading-snug text-foreground'>{title}</h3>
      <p className='hidden sm:block mt-2 text-sm text-muted-foreground leading-relaxed flex-1'>{description}</p>
      {note && <p className='mt-1.5 sm:mt-3 text-[11px] sm:text-xs font-medium text-foreground/70'>{note}</p>}
      <span className='mt-auto pt-3 sm:pt-5 inline-flex items-center text-xs sm:text-sm font-semibold text-foreground'>
        <span className='hidden sm:inline'>{label}</span>
        <span className='sm:hidden'>Entrar</span>
        <ArrowRight className='ml-1.5 sm:ml-2 h-4 w-4 transition-transform group-hover:translate-x-1.5' />
      </span>
    </Link>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className='rounded-xl border bg-popover/95 backdrop-blur-sm p-3 shadow-lg text-popover-foreground'>
        {label && <p className='mb-1.5 text-xs font-semibold text-muted-foreground'>Año {label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className='flex items-center gap-2'>
            <div
              className='h-2.5 w-2.5 rounded-full'
              style={{ backgroundColor: entry.color && !entry.color.startsWith('url') ? entry.color : 'var(--primary)' }}
            />
            <span className='text-xs font-medium text-muted-foreground'>{entry.name}:</span>
            <span className='text-sm font-bold text-foreground'>{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}
