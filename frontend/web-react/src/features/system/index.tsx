import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  ChevronRight,
  FileDown,
  History,
  ShieldCheck,
  BadgeCheck,
  Fingerprint,
  ClipboardList,
  Cpu,
  Database,
  ArrowLeft,
} from 'lucide-react'
import { getDashboardStats, listValidationQueue } from '@/lib/api'
import { SystemCard } from '@/features/dashboard/system-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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

export function SystemConsole() {
  const statsQuery = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats })
  const queue = useQuery({
    queryKey: ['validation-queue', 'summary'],
    queryFn: () => listValidationQueue({ status: 'pending', limit: 1 }),
  })

  const stats = statsQuery.data
  const pendingInQueue = queue.data?.pending_count ?? queue.data?.total ?? 0
  const validCount = stats?.validation?.['valid'] ?? 0
  const rejectedCount = stats?.validation?.['rejected'] ?? 0
  const totalResearchers = stats?.total_researchers ?? 0

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
        {/* Encabezado de la Consola */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4'>
          <div>
            <div className='flex items-center gap-2'>
              <div className='rounded-lg bg-secondary/10 p-2 text-secondary'>
                <Cpu className='h-5 w-5' />
              </div>
              <h1 className='text-2xl font-bold tracking-tight sm:text-3xl text-foreground'>
                Consola del Núcleo & Persistencia
              </h1>
              <Badge variant='outline' className='text-xs font-normal border-primary/30 text-primary'>
                Núcleo C++
              </Badge>
            </div>
            <p className='mt-1 text-sm text-muted-foreground'>
              Mantenimiento de estructuras en memoria RAM (multilistas, cola FIFO, pila Undo) y persistencia en SQL Server.
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' asChild className='text-xs'>
              <Link to='/admin'>
                <ArrowLeft className='mr-1.5 h-3.5 w-3.5' /> Dashboard de Gestión
              </Link>
            </Button>
            <Button variant='ghost' size='sm' asChild className='text-xs text-muted-foreground'>
              <Link to='/'>Ver Portal Abierto →</Link>
            </Button>
          </div>
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
                  <Link to='/admin/validation-queue'>Ver Cola →</Link>
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

        {/* Modelo de Medición 2024: estado real de tipologías, calidad y aval */}
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <Award className='h-4 w-4 text-primary' />
            <h3 className='text-sm font-bold text-foreground'>Modelo de Medición 2024</h3>
            <Badge variant='outline' className='text-[10px] font-normal'>
              validación humana por tipología y categoría
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

        {/* SystemCard Component for RAM / SQL Persistence */}
        <SystemCard />

        {/* Technical Traceability Links */}
        <Card className='border-border/60'>
          <CardHeader className='pb-3'>
            <div className='flex items-center gap-2'>
              <Database className='h-4 w-4 text-primary' />
              <CardTitle className='text-base'>Estructuras y Procesos del Núcleo</CardTitle>
            </div>
            <CardDescription className='text-xs'>
              Accesos directos a los componentes de memoria y persistencia del núcleo C++.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 sm:grid-cols-3'>
            <Link
              to='/admin/validation-queue'
              className='flex items-center justify-between p-3.5 rounded-lg border hover:bg-muted/50 transition-colors'
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
              to='/admin/undo'
              className='flex items-center justify-between p-3.5 rounded-lg border hover:bg-muted/50 transition-colors'
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
              to='/admin/import'
              className='flex items-center justify-between p-3.5 rounded-lg border hover:bg-muted/50 transition-colors'
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
