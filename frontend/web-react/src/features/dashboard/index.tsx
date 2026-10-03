import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  ChevronRight,
  Globe,
  Cpu,
  History,
  ShieldCheck,
  BadgeCheck,
  Fingerprint,
  ClipboardList,
  Upload,
  ClipboardCheck,
} from 'lucide-react'
import { getDashboardStats, listValidationQueue } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { KhemiaLogo } from '@/assets/khemia-logo'

export function Dashboard() {
  const statsQuery = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats })
  const queue = useQuery({
    queryKey: ['validation-queue', 'summary'],
    queryFn: () => listValidationQueue({ status: 'pending', limit: 1 }),
  })

  const stats = statsQuery.data
  const pendingInQueue = queue.data?.pending_count ?? queue.data?.total ?? 0
  const validCount = stats?.validation?.['valid'] ?? 0
  const rejectedCount = stats?.validation?.['rejected'] ?? 0
  const totalProducts = stats?.total_products ?? 0
  const pendingCount = stats?.validation?.['pending'] ?? 0
  const totalResearchers = stats?.total_researchers ?? 0

  const validationRate = totalProducts > 0 ? ((validCount / totalProducts) * 100).toFixed(1) : '0'

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
        {/* Encabezado del Panel de Gestión */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4'>
          <div className='flex items-center gap-3.5'>
            <div className='flex aspect-square size-12 items-center justify-center rounded-2xl bg-emerald-950/15 border border-primary/20 shadow-xs shrink-0'>
              <KhemiaLogo className='h-9 w-auto drop-shadow-xs' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-2xl font-bold tracking-tight sm:text-3xl text-foreground'>
                  Panel de Gestión Institucional
                </h1>
                <Badge variant='outline' className='text-xs font-normal border-primary/30 text-primary'>
                  Khemia v2.1
                </Badge>
              </div>
              <p className='mt-1 text-sm text-muted-foreground'>
                Monitoreo y administración del ciclo de vida de producción científica, validación técnica y persistencia.
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2.5'>
            <Button variant='outline' size='sm' asChild className='text-xs'>
              <Link to='/'>
                <Globe className='mr-1.5 h-3.5 w-3.5 text-primary' /> Ver Portal Público
              </Link>
            </Button>
            <Button variant='default' size='sm' asChild className='text-xs'>
              <Link to='/admin/system'>
                <Cpu className='mr-1.5 h-3.5 w-3.5' /> Consola del Núcleo
              </Link>
            </Button>
          </div>
        </div>

        {/* METRICS OVERVIEW: KPIs de Validación & Estado */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card className='border-border/60 shadow-xs'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                Obras Validadas
              </CardTitle>
              <div className='rounded-lg bg-emerald-500/10 p-2 text-emerald-600'>
                <CheckCircle2 className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-foreground'>
                {validCount.toLocaleString()}
              </div>
              <p className='text-[11px] text-muted-foreground mt-1'>
                {validationRate}% de la producción total
              </p>
            </CardContent>
          </Card>

          <Card className='border-border/60 shadow-xs'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                Cola FIFO Activa
              </CardTitle>
              <div className='rounded-lg bg-amber-500/10 p-2 text-amber-600'>
                <Clock className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='flex items-center justify-between'>
                <div className='text-2xl font-bold text-foreground'>
                  {pendingInQueue}
                </div>
                <Badge variant='outline' className='text-[10px]'>
                  <Link to='/admin/validation-queue'>Revisar →</Link>
                </Badge>
              </div>
              <p className='text-[11px] text-muted-foreground mt-1'>
                Ítems pendientes en cola FIFO
              </p>
            </CardContent>
          </Card>

          <Card className='border-border/60 shadow-xs'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                En Verificación
              </CardTitle>
              <div className='rounded-lg bg-blue-500/10 p-2 text-blue-600'>
                <ClipboardCheck className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-foreground'>
                {pendingCount.toLocaleString()}
              </div>
              <p className='text-[11px] text-muted-foreground mt-1'>
                Productos en estado pendiente
              </p>
            </CardContent>
          </Card>

          <Card className='border-border/60 shadow-xs'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                Productos Rechazados
              </CardTitle>
              <div className='rounded-lg bg-rose-500/10 p-2 text-rose-600'>
                <XCircle className='h-4 w-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-foreground'>
                {rejectedCount.toLocaleString()}
              </div>
              <p className='text-[11px] text-muted-foreground mt-1'>
                Requieren revisión o subsanación
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ACCIONES Y HERRAMIENTAS DE GESTIÓN */}
        <div className='space-y-3'>
          <h3 className='text-sm font-bold uppercase tracking-wider text-muted-foreground'>
            Módulos de Gestión
          </h3>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <Link
              to='/admin/import'
              className='group flex flex-col justify-between p-5 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200'
            >
              <div>
                <div className='flex items-center justify-between'>
                  <div className='rounded-xl bg-primary/10 p-3 text-primary group-hover:scale-105 transition-transform'>
                    <Upload className='h-5 w-5' />
                  </div>
                  <ChevronRight className='h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform' />
                </div>
                <h4 className='font-bold text-foreground mt-4 text-base'>Importar GrupLAC / CvLAC</h4>
                <p className='text-xs text-muted-foreground mt-1 leading-relaxed'>
                  Ingesta automática mediante web scraping con visualización previa y confirmación.
                </p>
              </div>
              <span className='text-xs font-semibold text-primary mt-4 inline-flex items-center'>
                Abrir importador →
              </span>
            </Link>

            <Link
              to='/admin/validation-queue'
              className='group flex flex-col justify-between p-5 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200'
            >
              <div>
                <div className='flex items-center justify-between'>
                  <div className='rounded-xl bg-amber-500/10 p-3 text-amber-600 group-hover:scale-105 transition-transform'>
                    <Clock className='h-5 w-5' />
                  </div>
                  <ChevronRight className='h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform' />
                </div>
                <h4 className='font-bold text-foreground mt-4 text-base'>Cola FIFO de Validación</h4>
                <p className='text-xs text-muted-foreground mt-1 leading-relaxed'>
                  Evaluación técnica por orden estricto de llegada con asignación de categorías de calidad.
                </p>
              </div>
              <span className='text-xs font-semibold text-primary mt-4 inline-flex items-center'>
                Gestionar cola →
              </span>
            </Link>

            <Link
              to='/admin/system'
              className='group flex flex-col justify-between p-5 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200'
            >
              <div>
                <div className='flex items-center justify-between'>
                  <div className='rounded-xl bg-secondary/15 p-3 text-secondary group-hover:scale-105 transition-transform'>
                    <Cpu className='h-5 w-5' />
                  </div>
                  <ChevronRight className='h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform' />
                </div>
                <h4 className='font-bold text-foreground mt-4 text-base'>Consola del Núcleo & ODBC</h4>
                <p className='text-xs text-muted-foreground mt-1 leading-relaxed'>
                  Estado en memoria del motor C++, persistencia en SQL Server y respaldos JSON.
                </p>
              </div>
              <span className='text-xs font-semibold text-primary mt-4 inline-flex items-center'>
                Consola técnica →
              </span>
            </Link>

            <Link
              to='/admin/undo'
              className='group flex flex-col justify-between p-5 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200'
            >
              <div>
                <div className='flex items-center justify-between'>
                  <div className='rounded-xl bg-blue-500/10 p-3 text-blue-600 group-hover:scale-105 transition-transform'>
                    <History className='h-5 w-5' />
                  </div>
                  <ChevronRight className='h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform' />
                </div>
                <h4 className='font-bold text-foreground mt-4 text-base'>Historial & Deshacer</h4>
                <p className='text-xs text-muted-foreground mt-1 leading-relaxed'>
                  Pila LIFO de operaciones con capacidad de revertir modificaciones y bajas lógicas.
                </p>
              </div>
              <span className='text-xs font-semibold text-primary mt-4 inline-flex items-center'>
                Ver historial →
              </span>
            </Link>
          </div>
        </div>

        {/* Modelo de Medición 2024: estado real de tipologías, calidad y aval */}
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <Award className='h-4 w-4 text-primary' />
            <h3 className='text-sm font-bold text-foreground'>Alineación con el Modelo de Medición 2024</h3>
            <Badge variant='outline' className='text-[10px] font-normal'>
              Minciencias
            </Badge>
          </div>
          {statsQuery.isLoading ? (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-[76px] w-full rounded-xl' />
              ))}
            </div>
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Metric2024Card
                title='Sin tipología'
                value={stats?.modelo_2024?.products_without_subtype}
                hint='Pendientes de reclasificación'
                icon={<ClipboardList className='h-5 w-5 text-amber-600' />}
                iconBg='bg-amber-500/10'
                to='/products'
              />
              <Metric2024Card
                title='Con categoría de calidad'
                value={stats?.modelo_2024?.products_with_quality}
                hint='Asignada por el validador humano'
                icon={<BadgeCheck className='h-5 w-5 text-emerald-600' />}
                iconBg='bg-emerald-500/10'
                to='/products'
              />
              <Metric2024Card
                title='Avalados ✓ Minciencias'
                value={stats?.modelo_2024?.endorsed_products}
                hint='Convocatoria Nacional previa'
                icon={<ShieldCheck className='h-5 w-5 text-emerald-600' />}
                iconBg='bg-emerald-500/10'
                to='/products'
              />
              <Metric2024Card
                title='Cobertura ORCID'
                value={
                  stats?.modelo_2024
                    ? `${stats.modelo_2024.researchers_with_orcid}/${totalResearchers}`
                    : undefined
                }
                hint='Investigadores con ORCID registrado'
                icon={<Fingerprint className='h-5 w-5 text-violet-600' />}
                iconBg='bg-violet-500/10'
                to='/researchers'
              />
            </div>
          )}
        </div>
      </Main>
    </>
  )
}

function Metric2024Card({
  title,
  value,
  hint,
  icon,
  iconBg,
  to,
}: {
  title: string
  value?: number | string
  hint: string
  icon: React.ReactNode
  iconBg: string
  to: string
}) {
  return (
    <Link
      to={to}
      className='flex items-center gap-3 rounded-xl border bg-card p-4 shadow-2xs transition-colors hover:bg-muted/40'
    >
      <div className={`rounded-lg p-2.5 ${iconBg}`}>{icon}</div>
      <div className='min-w-0'>
        <p className='text-xs text-muted-foreground'>{title}</p>
        <p className='text-xl font-bold text-foreground'>
          {value !== undefined ? (typeof value === 'number' ? value.toLocaleString() : value) : '—'}
        </p>
        <p className='text-[11px] text-muted-foreground truncate'>{hint}</p>
      </div>
    </Link>
  )
}
