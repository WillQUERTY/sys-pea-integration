import { useState, useMemo } from 'react'
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
import { cn } from '@/lib/utils'

// ─── Stat pill ────────────────────────────────────────────────────────────────
function HeroStat({ label, value, loading }: { label: string; value?: number | string; loading: boolean }) {
  return (
    <div className='flex flex-col items-center text-center'>
      {loading ? (
        <Skeleton className='h-8 w-16 mb-1' />
      ) : (
        <span className='text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums'>
          {typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}
        </span>
      )}
      <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1 whitespace-nowrap'>{label}</span>
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
      <div className='relative overflow-hidden min-h-[520px] sm:min-h-[580px] flex flex-col justify-center'>
        {/* Dark emerald background */}
        <div className='absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950' />

        {/* Animated knowledge graph */}
        <div className='absolute inset-0'>
          <KnowledgeGraph className='h-full w-full opacity-70' />
        </div>

        {/* Fade to page body — 5-stop eased gradient */}
        <div
          className='absolute inset-x-0 bottom-0 h-56 pointer-events-none'
          style={{
            background:
              'linear-gradient(to top, var(--background) 0%, color-mix(in oklch, var(--background) 92%, transparent) 18%, color-mix(in oklch, var(--background) 70%, transparent) 38%, color-mix(in oklch, var(--background) 35%, transparent) 58%, color-mix(in oklch, var(--background) 10%, transparent) 78%, transparent 100%)',
          }}
        />

        {/* ── Hero content ── */}
        <div className='relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20'>
          <div className='max-w-3xl'>
            {/* Pill */}
            <div className='inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-medium text-amber-300 mb-6 backdrop-blur-sm shadow-sm'>
              <span className='h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse' />
              Portal Abierto · Universidad Popular del Cesar
            </div>

            <h1 className='text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-4'>
              Ecosistema Científico<br />
              <span className='text-amber-400'>Institucional UPC</span>
            </h1>

            <p className='text-base sm:text-lg text-emerald-100/75 leading-relaxed mb-8 max-w-2xl'>
              Explora con total transparencia la producción académica, la red de investigadores
              y la categorización oficial de Minciencias de la Universidad Popular del Cesar.
            </p>

            {/* Search */}
            <form onSubmit={handleHeroSearch} className='flex flex-col sm:flex-row gap-2.5 max-w-2xl mb-8'>
              <div className='relative flex-1'>
                <SearchIcon className='absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground pointer-events-none' />
                <Input
                  type='text'
                  placeholder='Buscar grupos, investigadores, publicaciones…'
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
                className='h-12 px-7 rounded-full font-semibold bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-lg shadow-amber-500/30 border-0 transition-all duration-200'
              >
                <Compass className='mr-2 h-4 w-4' /> Explorar
              </Button>
            </form>

            {/* Quick links */}
            <div className='flex flex-wrap items-center gap-2'>
              {[
                { label: 'Grupos', to: '/groups', icon: Users },
                { label: 'Investigadores', to: '/researchers', icon: UserRound },
                { label: 'Publicaciones', to: '/products', icon: FlaskConical },
                { label: 'Proyectos I+D', to: '/projects', icon: Lightbulb },
              ].map(({ label, to, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className='inline-flex items-center gap-1.5 rounded-full bg-white/95 hover:bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-950 shadow-md hover:shadow-lg transition-all duration-200'
                >
                  <Icon className='h-3.5 w-3.5 text-emerald-600' />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STAT RIBBON — números clave flotando entre hero y cuerpo
      ══════════════════════════════════════════════════════════════════ */}
      <div className='relative -mt-8 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 z-10 mb-12'>
        <div className='rounded-2xl bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl border border-border p-6'>
          <div className='grid grid-cols-2 gap-6 sm:grid-cols-4 divide-x-0 sm:divide-x divide-border'>
            <HeroStat label='Grupos de Investigación' value={totalGroups} loading={statsQuery.isLoading} />
            <HeroStat label='Investigadores Registrados' value={totalResearchers} loading={statsQuery.isLoading} />
            <HeroStat label='Productos Científicos' value={totalProducts} loading={statsQuery.isLoading} />
            <HeroStat label='Producción Verificada' value={`${validationRate}%`} loading={statsQuery.isLoading} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          BODY — Cards + Charts + Showcase
      ══════════════════════════════════════════════════════════════════ */}
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 space-y-10'>

        {/* Discovery cards */}
        <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-4'>
          <DiscoveryCard
            title='Grupos de Investigación'
            count={totalGroups}
            description='Unidades acreditadas con líneas activas de investigación y categorización oficial.'
            icon={<Users className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />}
            iconBg='bg-emerald-500/10'
            to='/groups'
            label='Explorar grupos'
            badge={
              normalizedClassifications.find((c) => c.info.code === 'A1')
                ? `${normalizedClassifications.find((c) => c.info.code === 'A1')?.count} en Cat. A1`
                : totalGroups > 0 ? `${totalGroups} registrados` : undefined
            }
            loading={statsQuery.isLoading}
          />
          <DiscoveryCard
            title='Talento Investigador'
            count={totalResearchers}
            description='Comunidad académica, líderes de grupo, directores de proyecto y autores vinculados.'
            icon={<UserRound className='h-5 w-5 text-violet-600 dark:text-violet-400' />}
            iconBg='bg-violet-500/10'
            to='/researchers'
            label='Conocer investigadores'
            badge={
              stats?.modelo_2024
                ? `${stats.modelo_2024.researchers_with_orcid}/${totalResearchers} con ORCID`
                : undefined
            }
            loading={statsQuery.isLoading}
          />
          <DiscoveryCard
            title='Producción Científica'
            count={totalProducts}
            description='Artículos en revistas indexadas, libros, capítulos, desarrollos de software y patentes.'
            icon={<FlaskConical className='h-5 w-5 text-blue-600 dark:text-blue-400' />}
            iconBg='bg-blue-500/10'
            to='/products'
            label='Ver catálogo'
            badge={`${validationRate}% verificada`}
            loading={statsQuery.isLoading}
          />
          <DiscoveryCard
            title='Proyectos & Líneas I+D'
            count={stats?.modelo_2024?.total_projects}
            description='Iniciativas científicas en ejecución, planes de trabajo y transferencia de conocimiento.'
            icon={<Lightbulb className='h-5 w-5 text-amber-600 dark:text-amber-400' />}
            iconBg='bg-amber-500/10'
            to='/projects'
            label='Consultar proyectos'
            loading={statsQuery.isLoading}
          />
        </div>

        {/* Analytics */}
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
          {/* Histogram */}
          <Card className='col-span-1 lg:col-span-4 border-border/60 shadow-xs'>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='flex items-center gap-2'>
                    <TrendingUp className='h-4 w-4 text-primary' />
                    <CardTitle className='text-base font-semibold'>Dinámica Temporal de Producción</CardTitle>
                    <Badge variant='secondary' className='text-[11px] font-normal'>Crecimiento Histórico</Badge>
                  </div>
                  <CardDescription className='text-xs mt-1'>
                    Distribución de publicaciones según el año de obtención declarado.
                  </CardDescription>
                </div>
                <div className='flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md'>
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
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-bold tracking-tight text-foreground'>
                Vitrina de Grupos de Investigación
              </h3>
              <p className='text-xs text-muted-foreground'>
                Acceso directo e interactivo a las fichas públicas de los grupos institucionales.
              </p>
            </div>
            <Button variant='ghost' size='sm' asChild className='text-xs text-primary hover:text-primary'>
              <Link to='/groups'>
                Ver todos <ChevronRight className='ml-1 h-3.5 w-3.5' />
              </Link>
            </Button>
          </div>

          {featuredGroupsQuery.isLoading ? (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-40 w-full rounded-xl' />
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
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              {featuredGroupsQuery.data?.items.map((group) => {
                const initials = group.name
                  ? group.name.split(' ').filter((w) => w.length > 2).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
                  : 'GP'
                const classInfo = group.classification ? parseMincienciasClassification(group.classification) : null
                return (
                  <Card
                    key={group.id ?? group.external_code}
                    className='group flex flex-col justify-between border-border/70 hover:border-primary/40 hover:shadow-md transition-all duration-200'
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
                          <span className='text-[11px] font-mono font-medium text-muted-foreground block mt-0.5'>
                            [{group.acronym}]
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className='pt-0 pb-3 flex-1 flex flex-col justify-end'>
                      <div className='space-y-1 text-xs text-muted-foreground'>
                        {group.institution && (
                          <p className='truncate flex items-center gap-1.5'>
                            <Building2 className='h-3.5 w-3.5 shrink-0 opacity-70' />
                            <span className='truncate'>{group.institution}</span>
                          </p>
                        )}
                        {group.knowledge_area && (
                          <p className='truncate flex items-center gap-1.5'>
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
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-8 w-8 p-0 shrink-0'
                            title='Descargar Reporte PDF'
                            onClick={() => window.open(groupReportPdfUrl(group.id!), '_blank')}
                          >
                            <FileDown className='h-3.5 w-3.5 text-muted-foreground' />
                          </Button>
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
          <div className='relative px-6 sm:px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6'>
            <div className='space-y-2 max-w-xl'>
              <div className='flex items-center gap-2'>
                <ShieldCheck className='h-5 w-5 text-amber-400' />
                <h4 className='text-lg font-bold text-white'>Gestión y Validación Institucional</h4>
              </div>
              <p className='text-sm text-emerald-200/75 leading-relaxed'>
                Área técnica para evaluadores y administradores: ingesta de GrupLAC/CvLAC, cola FIFO de validación,
                reclasificación de tipologías y consola de mantenimiento.
              </p>
            </div>
            <Button
              asChild
              className='shrink-0 bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold rounded-full px-7 shadow-lg shadow-amber-500/30 border-0'
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
function DiscoveryCard({
  title, count, description, icon, iconBg, to, label, badge, loading,
}: {
  title: string; count?: number; description: string; icon: React.ReactNode
  iconBg: string; to: string; label: string; badge?: string; loading: boolean
}) {
  return (
    <Card className='group flex flex-col justify-between border-border/70 hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-card'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <div className={`rounded-xl p-2.5 ${iconBg}`}>{icon}</div>
          {badge && (
            <Badge variant='secondary' className='text-[10px] font-medium'>{badge}</Badge>
          )}
        </div>
        <div className='mt-3'>
          <p className='text-xs font-medium text-muted-foreground'>{title}</p>
          {loading ? (
            <Skeleton className='h-8 w-20 mt-1' />
          ) : count !== undefined ? (
            <p className='text-2xl font-bold tracking-tight text-foreground mt-0.5'>
              {count.toLocaleString()}
            </p>
          ) : (
            <p className='text-lg font-bold tracking-tight text-foreground mt-0.5'>Explorar</p>
          )}
        </div>
      </CardHeader>
      <CardContent className='pt-0 pb-4'>
        <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed'>{description}</p>
        <div className='mt-4 pt-3 border-t'>
          <Link to={to} className='inline-flex items-center text-xs font-semibold text-primary group-hover:underline'>
            {label} <ArrowRight className='ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1' />
          </Link>
        </div>
      </CardContent>
    </Card>
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
