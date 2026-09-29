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
  CheckCircle2,
  Clock,
  XCircle,
  Search as SearchIcon,
  Sparkles,
  Award,
  Globe,
  Cpu,
  ChevronRight,
  Compass,
  FileDown,
  Building2,
  GraduationCap,
  History,
  ShieldCheck,
} from 'lucide-react'
import { getDashboardStats, listValidationQueue, listGroups, groupReportPdfUrl } from '@/lib/api'
import { parseMincienciasClassification } from '@/lib/utils'
import { SystemCard } from './system-card'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

export function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'portal' | 'system'>('portal')
  const [heroSearch, setHeroSearch] = useState('')

  const statsQuery = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats })
  const queue = useQuery({ queryKey: ['validation-queue'], queryFn: listValidationQueue })
  const featuredGroupsQuery = useQuery({
    queryKey: ['featured-groups'],
    queryFn: () => listGroups({ limit: 4 }),
  })

  const stats = statsQuery.data
  const byYear = stats?.by_year ?? []

  // Agrupar y normalizar clasificaciones para evitar textos desbordados de GrupLAC
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

  const pendingInQueue = (queue.data ?? []).filter((i) => i.status === 'pending').length
  const validCount = stats?.validation?.['valid'] ?? 0
  const rejectedCount = stats?.validation?.['rejected'] ?? 0
  const totalProducts = stats?.total_products ?? 0
  const pendingCount = stats?.validation?.['pending'] ?? 0
  const totalGroups = stats?.total_groups ?? 0
  const totalResearchers = stats?.total_researchers ?? 0

  const validationRate = totalProducts > 0 ? ((validCount / totalProducts) * 100).toFixed(1) : '100'

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!heroSearch.trim()) return
    navigate({
      to: '/groups',
      search: { search: heroSearch.trim() } as any,
    })
  }

  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-3'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6 pb-12'>
        {/* Navigation Selector: Open Portal vs System Engine */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4'>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-2xl font-bold tracking-tight sm:text-3xl text-foreground'>
                {activeTab === 'portal' ? 'Portal de Ciencia Abierta' : 'Consola de Sistema & Persistencia'}
              </h1>
              <Badge variant='outline' className='hidden sm:inline-flex text-xs font-normal border-primary/30 text-primary'>
                PEA-i v2.1
              </Badge>
            </div>
            <p className='mt-1 text-sm text-muted-foreground'>
              {activeTab === 'portal'
                ? 'Ecosistema de investigación, producción científica y categorización institucional GrupLAC / Minciencias.'
                : 'Mantenimiento del núcleo en memoria C++, sincronización SQL Server y ciclo de validación FIFO.'}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'portal' | 'system')} className='w-full sm:w-auto'>
            <TabsList className='grid w-full grid-cols-2 sm:w-auto'>
              <TabsTrigger value='portal' className='flex items-center gap-2 text-xs sm:text-sm'>
                <Globe className='h-4 w-4 text-primary' />
                <span>Portal Abierto</span>
              </TabsTrigger>
              <TabsTrigger value='system' className='flex items-center gap-2 text-xs sm:text-sm'>
                <Cpu className='h-4 w-4 text-secondary' />
                <span>Gestión & Sistema</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: PORTAL DE CIENCIA ABIERTA (App Abierta)
            ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'portal' && (
          <div className='space-y-8 animate-in fade-in-50 duration-300'>
            {/* HERO BANNER: Open Science & Exploration */}
            <div className='relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-6 sm:p-10 shadow-sm'>
              {/* Background ambient decorative shapes */}
              <div className='pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl' />
              <div className='pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-secondary/15 blur-3xl' />

              <div className='relative z-10 max-w-3xl space-y-4'>
                <div className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/80 px-3 py-1 text-xs font-medium text-primary shadow-xs backdrop-blur-sm'>
                  <Sparkles className='h-3.5 w-3.5' />
                  <span>Plataforma Abierta de Producción Científica</span>
                  <span className='h-1.5 w-1.5 rounded-full bg-primary animate-pulse' />
                </div>

                <h2 className='text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground'>
                  Descubre el Ecosistema Científico e Investigativo
                </h2>

                <p className='text-sm sm:text-base text-muted-foreground leading-relaxed'>
                  Explora con total transparencia los grupos de investigación, la producción académica
                  obtenida, la red de investigadores y la categorización oficial de Minciencias.
                </p>

                {/* Open Search Bar */}
                <form onSubmit={handleHeroSearch} className='pt-2 flex flex-col sm:flex-row gap-2.5 max-w-2xl'>
                  <div className='relative flex-1'>
                    <SearchIcon className='absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                      type='text'
                      placeholder='Buscar grupos por nombre, acrónimo o área de conocimiento...'
                      value={heroSearch}
                      onChange={(e) => setHeroSearch(e.target.value)}
                      className='pl-10 h-11 bg-background/90 backdrop-blur-sm border-border/80 focus-visible:ring-primary shadow-xs text-sm'
                    />
                  </div>
                  <Button type='submit' className='h-11 px-6 font-semibold shadow-sm'>
                    <Compass className='mr-2 h-4 w-4' /> Explorar
                  </Button>
                </form>

                {/* Quick Discovery Tags */}
                <div className='flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground'>
                  <span className='font-medium text-foreground/80'>Accesos rápidos:</span>
                  <Link
                    to='/groups'
                    className='rounded-full border bg-background/60 hover:bg-background px-3 py-1 text-xs transition-colors hover:text-primary shadow-2xs'
                  >
                    🏛️ Grupos Minciencias
                  </Link>
                  <Link
                    to='/researchers'
                    className='rounded-full border bg-background/60 hover:bg-background px-3 py-1 text-xs transition-colors hover:text-primary shadow-2xs'
                  >
                    🔬 Red de Investigadores
                  </Link>
                  <Link
                    to='/products'
                    className='rounded-full border bg-background/60 hover:bg-background px-3 py-1 text-xs transition-colors hover:text-primary shadow-2xs'
                  >
                    📚 Publicaciones & Software
                  </Link>
                  <Link
                    to='/projects'
                    className='rounded-full border bg-background/60 hover:bg-background px-3 py-1 text-xs transition-colors hover:text-primary shadow-2xs'
                  >
                    💡 Proyectos I+D
                  </Link>
                </div>
              </div>
            </div>

            {/* OPEN DISCOVERY CARDS: 4 Entradas al Conocimiento */}
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <DiscoveryCard
                title='Grupos de Investigación'
                count={totalGroups}
                description='Unidades acreditadas con líneas activas de investigación y categorización oficial.'
                icon={<Users className='h-5 w-5 text-blue-600 dark:text-blue-400' />}
                iconBg='bg-blue-500/10'
                to='/groups'
                label='Explorar grupos'
                badge={
                  normalizedClassifications.find((c) => c.info.code === 'A1')
                    ? `${normalizedClassifications.find((c) => c.info.code === 'A1')?.count} en Cat. A1`
                    : totalGroups > 0
                    ? `${totalGroups} registrados`
                    : undefined
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
                badge='CvLAC Vinculado'
                loading={statsQuery.isLoading}
              />
              <DiscoveryCard
                title='Producción Científica'
                count={totalProducts}
                description='Artículos en revistas indexadas, libros, capítulos, desarrollos de software y patentes.'
                icon={<FlaskConical className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />}
                iconBg='bg-emerald-500/10'
                to='/products'
                label='Ver catálogo'
                badge={`${validationRate}% verificada`}
                loading={statsQuery.isLoading}
              />
              <DiscoveryCard
                title='Proyectos & Líneas I+D'
                count={undefined}
                description='Iniciativas científicas en ejecución, planes de trabajo y transferencia de conocimiento.'
                icon={<Lightbulb className='h-5 w-5 text-amber-600 dark:text-amber-400' />}
                iconBg='bg-amber-500/10'
                to='/projects'
                label='Consultar proyectos'
                badge='Impacto Regional'
                loading={false}
              />
            </div>

            {/* MAIN ANALYTICS: Visualizaciones de Ciencia y Tendencias */}
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
              {/* HISTOGRAMA DE PRODUCCIÓN */}
              <Card className='col-span-1 lg:col-span-4 border-border/60 shadow-xs'>
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <CardTitle className='text-base font-semibold'>Dinámica Temporal de Producción</CardTitle>
                        <Badge variant='secondary' className='text-[11px] font-normal'>
                          Crecimiento Histórico
                        </Badge>
                      </div>
                      <CardDescription className='text-xs mt-1'>
                        Distribución de publicaciones y productos según el año de obtención declarado.
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
                        <defs>
                          <linearGradient id='openBarGrad' x1='0' y1='0' x2='0' y2='1'>
                            <stop offset='0%' stopColor='var(--primary)' stopOpacity={0.95} />
                            <stop offset='100%' stopColor='var(--chart-3)' stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='var(--border)' opacity={0.6} />
                        <XAxis
                          dataKey='year'
                          tickLine={false}
                          axisLine={false}
                          fontSize={11}
                          tick={{ fill: 'var(--muted-foreground)' }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          fontSize={11}
                          allowDecimals={false}
                          tick={{ fill: 'var(--muted-foreground)' }}
                        />
                        <Tooltip
                          cursor={{ fill: 'var(--accent)' }}
                          content={<CustomTooltip />}
                        />
                        <Bar
                          dataKey='count'
                          name='Productos científicos'
                          fill='url(#openBarGrad)'
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* CATEGORIZACIÓN MINCIENCIAS & RECONOCIMIENTO */}
              <Card className='col-span-1 lg:col-span-3 border-border/60 shadow-xs flex flex-col justify-between'>
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-base font-semibold'>Categorización Minciencias</CardTitle>
                      <CardDescription className='text-xs mt-0.5'>
                        Distribución de grupos por categoría de excelencia científica.
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
            </div>

            {/* SHOWCASE: Grupos Destacados en Acceso Abierto */}
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
                    Ver todos los grupos <ChevronRight className='ml-1 h-3.5 w-3.5' />
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
                    Puedes importar grupos automáticamente desde GrupLAC en la pestaña de Importar.
                  </p>
                  <Button size='sm' variant='outline' className='mt-4' asChild>
                    <Link to='/import'>Importar GrupLAC</Link>
                  </Button>
                </Card>
              ) : (
                <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                  {featuredGroupsQuery.data?.items.map((group) => {
                    const initials = group.name
                      ? group.name
                          .split(' ')
                          .filter((w) => w.length > 2)
                          .slice(0, 2)
                          .map((w) => w[0].toUpperCase())
                          .join('')
                      : 'GP'

                    const classInfo = group.classification
                      ? parseMincienciasClassification(group.classification)
                      : null

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
                            <Button
                              variant='default'
                              size='sm'
                              className='h-8 text-xs flex-1'
                              asChild
                            >
                              <Link
                                to='/groups/$id'
                                params={{ id: String(group.id) }}
                              >
                                Ver Grupo <ArrowRight className='ml-1 h-3.5 w-3.5' />
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

            {/* SECCIÓN DE CALIDAD & CERTIFICACIÓN ACADÉMICA (Enmarcada como acreditación, no como cola de tickets) */}
            <Card className='border-border/60 bg-muted/20'>
              <CardContent className='p-6'>
                <div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
                  <div className='space-y-1.5 max-w-xl'>
                    <div className='flex items-center gap-2'>
                      <ShieldCheck className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
                      <h4 className='text-base font-bold text-foreground'>Acreditación y Verificación Científica</h4>
                    </div>
                    <p className='text-xs text-muted-foreground leading-relaxed'>
                      Todos los productos científicos registrados en la plataforma pasan por un proceso de
                      verificación técnica conforme a los lineamientos institucionales y la convocatoria Minciencias.
                    </p>
                  </div>

                  <div className='flex flex-wrap items-center gap-3 sm:gap-6'>
                    <div className='text-center px-3 py-1.5 rounded-lg bg-background border'>
                      <p className='text-xl font-bold text-emerald-600 dark:text-emerald-400'>{validCount}</p>
                      <p className='text-[11px] text-muted-foreground'>Obras Acreditadas</p>
                    </div>
                    <div className='text-center px-3 py-1.5 rounded-lg bg-background border'>
                      <p className='text-xl font-bold text-amber-600 dark:text-amber-400'>{pendingCount}</p>
                      <p className='text-[11px] text-muted-foreground'>En Verificación</p>
                    </div>
                    <div className='text-center px-3 py-1.5 rounded-lg bg-background border'>
                      <p className='text-xl font-bold text-foreground'>{validationRate}%</p>
                      <p className='text-[11px] text-muted-foreground'>Índice de Calidad</p>
                    </div>

                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setActiveTab('system')}
                      className='text-xs'
                    >
                      <Cpu className='mr-1.5 h-3.5 w-3.5 text-secondary' />
                      Consola C++ & Cola
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: GESTIÓN TÉCNICA, MEMORIA C++ Y COLA FIFO
            ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'system' && (
          <div className='space-y-6 animate-in fade-in-50 duration-300'>
            {/* Context Notice */}
            <div className='rounded-xl border bg-muted/40 p-4 text-xs text-muted-foreground flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <Cpu className='h-4 w-4 text-primary shrink-0' />
                <span>
                  <strong>Consola de Mantenimiento y Evaluación:</strong> Aquí se administran las estructuras
                  de datos en RAM de C++ (multilistas, cola FIFO, pila Undo) y la persistencia en SQL Server.
                </span>
              </div>
              <Button
                variant='ghost'
                size='sm'
                className='text-xs h-7'
                onClick={() => setActiveTab('portal')}
              >
                ← Volver al Portal Abierto
              </Button>
            </div>

            {/* Quick Metrics for the Evaluator */}
            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='flex items-center gap-3 rounded-xl border bg-card p-4 shadow-2xs'>
                <div className='rounded-lg bg-emerald-500/10 p-2.5'>
                  <CheckCircle2 className='h-5 w-5 text-emerald-600' />
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Productos Validados</p>
                  <p className='text-xl font-bold text-foreground'>{validCount.toLocaleString()}</p>
                </div>
              </div>

              <div className='flex items-center gap-3 rounded-xl border bg-card p-4 shadow-2xs'>
                <div className='rounded-lg bg-amber-500/10 p-2.5'>
                  <Clock className='h-5 w-5 text-amber-600' />
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Cola FIFO Activa (Pendientes)</p>
                  <div className='flex items-center gap-2'>
                    <p className='text-xl font-bold text-foreground'>{pendingInQueue}</p>
                    <Badge variant='outline' className='text-[10px]'>
                      <Link to='/validation-queue'>Ver Cola →</Link>
                    </Badge>
                  </div>
                </div>
              </div>

              <div className='flex items-center gap-3 rounded-xl border bg-card p-4 shadow-2xs'>
                <div className='rounded-lg bg-rose-500/10 p-2.5'>
                  <XCircle className='h-5 w-5 text-rose-600' />
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Productos Rechazados</p>
                  <p className='text-xl font-bold text-foreground'>{rejectedCount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* SystemCard Component for RAM / SQL Persistence */}
            <SystemCard />

            {/* Technical Traceability Links */}
            <Card className='border-border/60'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-base'>Estructuras y Procesos del Núcleo</CardTitle>
                <CardDescription className='text-xs'>
                  Accesos directos a los componentes requeridos por la especificación del Taller 2.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3 sm:grid-cols-3'>
                <Link
                  to='/validation-queue'
                  className='flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors'
                >
                  <div className='flex items-center gap-2.5'>
                    <Clock className='h-4 w-4 text-amber-500' />
                    <div>
                      <p className='text-xs font-semibold'>Cola FIFO</p>
                      <p className='text-[11px] text-muted-foreground'>Requisito 13: Validación técnica</p>
                    </div>
                  </div>
                  <ChevronRight className='h-4 w-4 text-muted-foreground' />
                </Link>

                <Link
                  to='/undo'
                  className='flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors'
                >
                  <div className='flex items-center gap-2.5'>
                    <History className='h-4 w-4 text-blue-500' />
                    <div>
                      <p className='text-xs font-semibold'>Pila LIFO de Undo</p>
                      <p className='text-[11px] text-muted-foreground'>Requisito 12: Deshacer operaciones</p>
                    </div>
                  </div>
                  <ChevronRight className='h-4 w-4 text-muted-foreground' />
                </Link>

                <Link
                  to='/import'
                  className='flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors'
                >
                  <div className='flex items-center gap-2.5'>
                    <FileDown className='h-4 w-4 text-emerald-500' />
                    <div>
                      <p className='text-xs font-semibold'>Ingesta GrupLAC / CvLAC</p>
                      <p className='text-[11px] text-muted-foreground'>Scraping y dos fases</p>
                    </div>
                  </div>
                  <ChevronRight className='h-4 w-4 text-muted-foreground' />
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </Main>
    </>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DiscoveryCard({
  title,
  count,
  description,
  icon,
  iconBg,
  to,
  label,
  badge,
  loading,
}: {
  title: string
  count?: number
  description: string
  icon: React.ReactNode
  iconBg: string
  to: string
  label: string
  badge?: string
  loading: boolean
}) {
  return (
    <Card className='group flex flex-col justify-between border-border/70 hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-card'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <div className={`rounded-xl p-2.5 ${iconBg}`}>{icon}</div>
          {badge && (
            <Badge variant='secondary' className='text-[10px] font-medium'>
              {badge}
            </Badge>
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
        <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed'>
          {description}
        </p>
        <div className='mt-4 pt-3 border-t'>
          <Link
            to={to}
            className='inline-flex items-center text-xs font-semibold text-primary group-hover:underline'
          >
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
