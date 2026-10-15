import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Users,
  CheckCircle2,
  Award,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ProductionHistogram,
  FamiliesDonut,
  TopSubtypesRanking,
  ResearcherGroupsContribution,
  ResearcherTopCoauthors,
} from '@/components/charts'
import { getResearcherStats, type ResearcherStats } from '@/lib/api'

interface ResearcherAnalyticsTabProps {
  researcherId: number
  isAdmin?: boolean
  stats?: ResearcherStats
  isLoadingStats?: boolean
}

export function ResearcherAnalyticsTab({
  researcherId,
  isAdmin = false,
  stats: propsStats,
  isLoadingStats: propsIsLoadingStats,
}: ResearcherAnalyticsTabProps) {
  const { data: fetchedStats, isLoading: isFetchingStats } = useQuery({
    queryKey: ['researcher-stats', researcherId],
    queryFn: () => getResearcherStats(researcherId),
    enabled: !propsStats,
  })

  const stats = propsStats ?? fetchedStats
  const isLoadingStats = propsIsLoadingStats ?? isFetchingStats

  if (isLoadingStats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[360px] w-full rounded-2xl" />
          <Skeleton className="h-[360px] w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Métricas y KPIs Estratégicos del Docente */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Producción Total</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {stats?.total_products ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">obras registradas</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Tasa de Aval</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats?.strategic_ratios?.endorsement_rate ?? 0}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({stats?.strategic_ratios?.endorsed_count ?? 0} avalados)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Red de Coautoría</span>
            <Users className="h-4 w-4 text-violet-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-violet-600 dark:text-violet-400">
              {stats?.strategic_ratios?.total_coauthors ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">pares coautores</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Grupos Vinculados</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
              {stats?.groups_contribution?.length ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">colectivos UPC</span>
          </div>
        </div>
      </div>

      {/* Grid 1: Histograma Temporal y Familias Minciencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductionHistogram
          data={stats?.by_year ?? []}
          totalProducts={stats?.total_products ?? 0}
          title="Evolución de Producción Científica"
          description="Trayectoria temporal de publicaciones y productos del investigador."
        />
        <FamiliesDonut
          data={stats?.families_distribution ?? []}
          title="Balance por Familias Minciencias"
          description="Distribución de su producción en GNC, DTI, ASC y FRH."
        />
      </div>

      {/* Grid 2: Aporte por Grupos y Red de Coautoría Frecuente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResearcherGroupsContribution
          data={stats?.groups_contribution ?? []}
          isAdmin={isAdmin}
        />
        <ResearcherTopCoauthors
          data={stats?.top_coauthors ?? []}
          isAdmin={isAdmin}
        />
      </div>

      {/* Grid 3: Top Tipologías Minciencias */}
      {stats?.top_subtypes && stats.top_subtypes.length > 0 && (
        <TopSubtypesRanking
          data={stats.top_subtypes}
          title="Top Tipologías Minciencias del Investigador"
          description="Subtipos con mayor número de productos registrados (artículos, libros, software, etc.)."
        />
      )}
    </div>
  )
}
