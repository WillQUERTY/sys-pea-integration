import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  FlaskConical,
  UserRound,
  Users,
  ClipboardCheck,
  TrendingUp,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { getDashboardStats, listValidationQueue } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

// ─── Status color map ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  valid: 'hsl(142 71% 45%)',
  pending: 'hsl(38 92% 50%)',
  rejected: 'hsl(0 84% 60%)',
  none: 'hsl(215 16% 47%)',
}

// ─── Per-KPI config ────────────────────────────────────────────────────────────
interface StatConfig {
  title: string
  subtitle: string
  icon: React.ReactNode
  gradient: string
  iconBg: string
  iconColor: string
  textColor: string
}

const STAT_CONFIGS: StatConfig[] = [
  {
    title: 'Grupos',
    subtitle: 'Importados desde GrupLAC',
    icon: <Users className='h-5 w-5' />,
    gradient: 'from-blue-50 to-blue-100/60 dark:from-blue-950/60 dark:to-blue-900/30',
    iconBg: 'bg-blue-500/15 dark:bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  {
    title: 'Investigadores',
    subtitle: 'Registrados en el sistema',
    icon: <UserRound className='h-5 w-5' />,
    gradient: 'from-violet-50 to-violet-100/60 dark:from-violet-950/60 dark:to-violet-900/30',
    iconBg: 'bg-violet-500/15 dark:bg-violet-500/20',
    iconColor: 'text-violet-600 dark:text-violet-400',
    textColor: 'text-violet-700 dark:text-violet-300',
  },
  {
    title: 'Productos',
    subtitle: 'Producción científica total',
    icon: <FlaskConical className='h-5 w-5' />,
    gradient: 'from-emerald-50 to-emerald-100/60 dark:from-emerald-950/60 dark:to-emerald-900/30',
    iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    textColor: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    title: 'Pendientes',
    subtitle: 'En cola de validación',
    icon: <ClipboardCheck className='h-5 w-5' />,
    gradient: 'from-amber-50 to-amber-100/60 dark:from-amber-950/60 dark:to-amber-900/30',
    iconBg: 'bg-amber-500/15 dark:bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
]

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export function Dashboard() {
  const statsQuery = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats })
  const queue = useQuery({ queryKey: ['validation-queue'], queryFn: listValidationQueue })

  const stats = statsQuery.data
  const byYear = stats?.by_year ?? []
  
  const labels: Record<string, string> = {
    valid: 'Validados',
    pending: 'Pendientes',
    rejected: 'Rechazados',
    none: 'Sin estado',
  }
  const byStatus = Object.entries(stats?.validation ?? {}).map(([key, value]) => ({
    key,
    name: labels[key] ?? key,
    value,
  }))

  const byClassification = Object.entries(stats?.groups_by_classification ?? {}).sort((a, b) => b[1] - a[1])

  const pendingInQueue = (queue.data ?? []).filter((i) => i.status === 'pending').length
  const validCount = stats?.validation?.['valid'] ?? 0
  const rejectedCount = stats?.validation?.['rejected'] ?? 0
  const totalProducts = stats?.total_products ?? 0
  const pendingCount = stats?.validation?.['pending'] ?? 0
  
  const isLoading = statsQuery.isLoading || queue.isLoading

  const statValues = [
    stats?.total_groups,
    stats?.total_researchers,
    stats?.total_products,
    queue.isLoading ? undefined : pendingInQueue,
  ]

  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {/* Heading */}
        <div className='mb-6 flex items-start justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Dashboard PEA-i</h1>
            <p className='mt-1 text-muted-foreground'>
              Producción científica · grupos importados desde GrupLAC / Minciencias
            </p>
          </div>
          <div className='hidden items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground sm:flex'>
            <TrendingUp className='h-3.5 w-3.5' />
            <span>Datos en tiempo real</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {STAT_CONFIGS.map((cfg, i) => (
            <StatCard key={cfg.title} {...cfg} value={statValues[i]} loading={isLoading} />
          ))}
        </div>

        {/* Quick stats pills */}
        <div className='mt-4 grid gap-3 sm:grid-cols-3'>
          <QuickStat icon={<CheckCircle2 className='h-4 w-4 text-emerald-500' />} label='Validados' value={validCount} loading={statsQuery.isLoading} color='text-emerald-600' />
          <QuickStat icon={<Clock className='h-4 w-4 text-amber-500' />} label='Pendientes en cola' value={pendingInQueue} loading={queue.isLoading} color='text-amber-600' />
          <QuickStat icon={<XCircle className='h-4 w-4 text-rose-500' />} label='Rechazados' value={rejectedCount} loading={statsQuery.isLoading} color='text-rose-600' />
        </div>

        {/* Charts */}
        <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-7'>
          {/* Bar chart */}
          <Card className='col-span-1 lg:col-span-4'>
            <CardHeader className='pb-2'>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='text-base'>Producción por año</CardTitle>
                  <CardDescription className='text-xs'>
                    Histograma de publicaciones por año de obtención.
                  </CardDescription>
                </div>
                <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                  <BookOpen className='h-3.5 w-3.5' />
                  {totalProducts.toLocaleString()} total
                </div>
              </div>
            </CardHeader>
            <CardContent className='ps-2'>
              {statsQuery.isLoading ? (
                <Skeleton className='h-[300px] w-full' />
              ) : (
                <ResponsiveContainer width='100%' height={300}>
                  <BarChart data={byYear} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id='barGrad' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%' stopColor='hsl(221 83% 53%)' stopOpacity={0.9} />
                        <stop offset='95%' stopColor='hsl(221 83% 53%)' stopOpacity={0.55} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='hsl(var(--border))' />
                    <XAxis dataKey='year' tickLine={false} axisLine={false} fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
                      content={<CustomTooltip />}
                    />
                    <Bar dataKey='count' name='Productos' fill='url(#barGrad)' radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pie chart */}
          <Card className='col-span-1 lg:col-span-3'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base'>Estado de validación</CardTitle>
              <CardDescription className='text-xs'>
                Distribución del ciclo de validación técnica (Req. 9).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsQuery.isLoading ? (
                <Skeleton className='h-[300px] w-full' />
              ) : (
                <ResponsiveContainer width='100%' height={300}>
                  <PieChart>
                    <Pie data={byStatus} dataKey='value' nameKey='name' innerRadius={65} outerRadius={105} paddingAngle={3} strokeWidth={2} stroke='hsl(var(--card))'>
                      {byStatus.map((s) => (
                        <Cell key={s.key} fill={STATUS_COLORS[s.key] ?? STATUS_COLORS.none} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType='circle' iconSize={8} formatter={(v) => <span style={{ fontSize: '12px' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {/* Group Classification */}
          <Card>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='text-base'>Clasificación de Grupos</CardTitle>
                  <CardDescription className='text-xs'>Distribución de grupos por categoría Minciencias.</CardDescription>
                </div>
                <ArrowUpRight className='h-4 w-4 text-muted-foreground' />
              </div>
            </CardHeader>
            <Separator />
            <CardContent className='pt-3'>
              {statsQuery.isLoading ? (
                <div className='space-y-3'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className='h-9 w-full' />
                  ))}
                </div>
              ) : (
                <div className='space-y-4 pt-2'>
                  {byClassification.length === 0 ? (
                    <div className='text-sm text-muted-foreground text-center py-4'>Sin datos de grupos</div>
                  ) : (
                    byClassification.map(([classification, count]) => (
                      <ValidationBar 
                        key={classification} 
                        label={classification === 'Sin clasificar' ? 'No reconocidos' : `Categoría ${classification}`} 
                        count={count} 
                        total={stats?.total_groups ?? 1} 
                        color='bg-blue-500' 
                        lightColor='bg-blue-100 dark:bg-blue-950' 
                      />
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validation breakdown */}
          <Card>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='text-base'>Resumen de validación</CardTitle>
                  <CardDescription className='text-xs'>Ciclo FIFO — Requerimiento 13 del taller.</CardDescription>
                </div>
                <ArrowUpRight className='h-4 w-4 text-muted-foreground' />
              </div>
            </CardHeader>
            <Separator />
            <CardContent className='pt-4 space-y-4'>
              {statsQuery.isLoading ? (
                <Skeleton className='h-40 w-full' />
              ) : (
                <>
                  <ValidationBar label='Validados' count={validCount} total={totalProducts} color='bg-emerald-500' lightColor='bg-emerald-100 dark:bg-emerald-950' />
                  <ValidationBar label='Pendientes' count={pendingCount} total={totalProducts} color='bg-amber-500' lightColor='bg-amber-100 dark:bg-amber-950' />
                  <ValidationBar label='Rechazados' count={rejectedCount} total={totalProducts} color='bg-rose-500' lightColor='bg-rose-100 dark:bg-rose-950' />
                  <Separator />
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Cola de validación activa</span>
                    <Badge variant={pendingInQueue > 0 ? 'secondary' : 'outline'}>
                      {queue.isLoading ? '…' : `${pendingInQueue} ítems`}
                    </Badge>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Tasa de validación</span>
                    <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
                      {totalProducts > 0 ? `${((validCount / totalProducts) * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className='rounded-lg border bg-popover p-3 shadow-md text-popover-foreground'>
        {label && <p className='mb-2 text-xs font-medium text-muted-foreground'>{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className='flex items-center gap-2'>
            <div
              className='h-2.5 w-2.5 rounded-[2px]'
              style={{ backgroundColor: entry.color ?? entry.payload?.fill }}
            />
            <span className='text-sm font-semibold'>
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

function StatCard({ title, subtitle, icon, gradient, iconBg, iconColor, textColor, value, loading }: StatConfig & { value?: number; loading?: boolean }) {
  return (
    <Card className={`bg-gradient-to-br ${gradient} border-0 shadow-sm`}>
      <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-2'>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${textColor}`}>{title}</p>
          <p className='mt-0.5 text-[11px] text-muted-foreground'>{subtitle}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </CardHeader>
      <CardContent>
        {loading || value === undefined ? (
          <Skeleton className='h-9 w-20' />
        ) : (
          <div className='text-3xl font-bold tracking-tight'>{value.toLocaleString()}</div>
        )}
      </CardContent>
    </Card>
  )
}

function QuickStat({ icon, label, value, loading, color }: { icon: React.ReactNode; label: string; value: number; loading?: boolean; color: string }) {
  return (
    <div className='flex items-center gap-3 rounded-xl border bg-card px-4 py-3'>
      <div className='rounded-lg bg-muted p-2'>{icon}</div>
      <div className='flex-1 min-w-0'>
        <p className='text-xs text-muted-foreground truncate'>{label}</p>
        {loading ? (
          <Skeleton className='mt-0.5 h-5 w-12' />
        ) : (
          <p className={`text-lg font-bold ${color}`}>{value.toLocaleString()}</p>
        )}
      </div>
    </div>
  )
}



function ValidationBar({ label, count, total, color, lightColor }: { label: string; count: number; total: number; color: string; lightColor: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className='space-y-1.5'>
      <div className='flex items-center justify-between text-sm'>
        <span className='font-medium'>{label}</span>
        <span className='text-muted-foreground'>{count.toLocaleString()} <span className='text-xs'>({pct.toFixed(1)}%)</span></span>
      </div>
      <div className={`h-2 w-full rounded-full ${lightColor}`}>
        <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
