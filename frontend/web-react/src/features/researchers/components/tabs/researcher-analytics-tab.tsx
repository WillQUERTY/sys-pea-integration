import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Users,
  CheckCircle2,
  Award,
  TrendingUp,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  ProductionHistogram,
  FamiliesDonut,
  TopSubtypesRanking,
  ResearcherGroupsContribution,
  ResearcherTopCoauthors,
  ResearcherOfficialAdaptationPanel,
} from '@/components/charts'
import { getResearcherStats, getResearcherIndicator, type ResearcherStats } from '@/lib/api'

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

  const { data: fetchedIndicator, isLoading: isFetchingIndicator } = useQuery({
    queryKey: ['researcher-indicator', researcherId],
    queryFn: () => getResearcherIndicator(researcherId),
    enabled: researcherId > 0,
  })

  const stats = propsStats ?? fetchedStats
  const indicator = fetchedIndicator
  const isLoadingStats = propsIsLoadingStats ?? isFetchingStats
  const isLoadingIndicator = isFetchingIndicator

  /**
   * Fase 5 (brecha B3): el modelo de medición 2024 NO define un indicador de
   * producción por persona — su único indicador (§3.10) es de GRUPO. Por eso
   * lo que se muestra como titular es la ADAPTACIÓN INDIVIDUAL declarada
   * (`adaptacion_individual_2024`), siempre rotulada como NO oficial. El
   * conteo ponderado legacy (`i_investigador_legacy`) ya NO se muestra en la
   * interfaz: desde el 2026-10-24 vive solo en el payload de la API, para
   * trazabilidad; los conteos crudos que sí interesan aparecen como ENTRADAS
   * del modelo dentro del panel de desglose.
   */
  const adaptacion = indicator?.adaptacion_individual_2024
  const valorTitular = adaptacion?.ind_investigador

  if (isLoadingStats || isLoadingIndicator) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
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

  const posPoblacion = adaptacion?.posicion_poblacion

  return (
    <div className="space-y-6">
      {/* Métricas y KPIs Estratégicos del Docente */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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

        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-1 text-muted-foreground">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-medium uppercase tracking-wider truncate">
                Ind. Investigador
              </span>
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-[9px] font-semibold text-amber-700 dark:text-amber-300 px-1 py-0 uppercase shrink-0"
              >
                No oficial
              </Badge>
            </div>
            <TrendingUp className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <div className="mt-2 flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {valorTitular !== undefined
                  ? valorTitular.toLocaleString('es-CO', {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })
                  : '—'}
              </span>
              {adaptacion?.rango_teorico != null && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  / {adaptacion.rango_teorico.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
            <span
              className="text-xs text-muted-foreground truncate"
              title={
                posPoblacion
                  ? `Puesto ${posPoblacion.puesto} de ${posPoblacion.de} (percentil ${posPoblacion.percentil?.toFixed(1)}%)`
                  : undefined
              }
            >
              {posPoblacion
                ? `Puesto ${posPoblacion.puesto} de ${posPoblacion.de} · pctl ${posPoblacion.percentil?.toFixed(1)}%`
                : adaptacion
                  ? 'Adaptación Minciencias 2024'
                  : 'No disponible'}
            </span>
          </div>
        </div>
      </div>

      {/* Desglose auditable de la adaptación individual (§2.2.9 → §3.10) */}
      {adaptacion && (
        <ResearcherOfficialAdaptationPanel
          adaptacion={adaptacion}
          summary={indicator?.summary}
        />
      )}

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
