import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Users,
  CheckCircle2,
  Award,
  TrendingUp,
  LayoutDashboard,
  ShieldCheck,
  Network,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { KpiCard, KpiGrid, AnalyticsSections, TwoColumn } from '@/components/charts/analytics-kit'
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
   * Fase 5 (brecha B3): el modelo de mediciÃ³n 2024 NO define un indicador de
   * producciÃ³n por persona â€” su Ãºnico indicador (Â§3.10) es de GRUPO. Por eso
   * lo que se muestra como titular es la ADAPTACIÃ“N INDIVIDUAL declarada
   * (`adaptacion_individual_2024`), siempre rotulada como NO oficial. El
   * conteo ponderado legacy ya NO se muestra en la interfaz: desde el
   * 2026-10-24 se eliminÃ³ del payload de la API; los conteos crudos que
   * sÃ­ interesan aparecen como ENTRADAS del modelo dentro del panel de
   * desglose.
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
    <div className="space-y-4 sm:space-y-6">
      {/* MÃ©tricas y KPIs EstratÃ©gicos del Docente: siempre visibles */}
      <KpiGrid desktop={5}>
        <KpiCard
          label="ProducciÃ³n Total"
          icon={BookOpen}
          value={stats?.total_products ?? 0}
          hint="obras registradas"
        />
        <KpiCard
          label="Tasa de Aval"
          icon={CheckCircle2}
          iconClassName="text-emerald-500"
          valueClassName="text-emerald-600 dark:text-emerald-400"
          value={`${stats?.strategic_ratios?.endorsement_rate ?? 0}%`}
          hint={`${stats?.strategic_ratios?.endorsed_count ?? 0} avalados`}
        />
        <KpiCard
          label="Red de CoautorÃ­a"
          icon={Users}
          iconClassName="text-violet-500"
          valueClassName="text-violet-600 dark:text-violet-400"
          value={stats?.strategic_ratios?.total_coauthors ?? 0}
          hint="pares coautores"
        />
        <KpiCard
          label="Grupos Vinculados"
          icon={Award}
          iconClassName="text-amber-500"
          valueClassName="text-amber-600 dark:text-amber-400"
          value={stats?.groups_contribution?.length ?? 0}
          hint="colectivos UPC"
        />
        <KpiCard
          className="col-span-2 md:col-span-1"
          label="Ind. Investigador"
          icon={TrendingUp}
          iconClassName="text-amber-500"
          badge={
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-[10px] font-semibold text-amber-700 dark:text-amber-300 px-1.5 py-0 uppercase shrink-0"
            >
              No oficial
            </Badge>
          }
          value={
            valorTitular !== undefined
              ? valorTitular.toLocaleString('es-CO', {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })
              : 'â€”'
          }
          valueSuffix={
            adaptacion?.rango_teorico != null
              ? `/ ${adaptacion.rango_teorico.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
              : undefined
          }
          hintTitle={
            posPoblacion
              ? `Puesto ${posPoblacion.puesto} de ${posPoblacion.de} (percentil ${posPoblacion.percentil?.toFixed(1)}%)`
              : undefined
          }
          hint={
            posPoblacion
              ? `Puesto ${posPoblacion.puesto} de ${posPoblacion.de} Â· pctl ${posPoblacion.percentil?.toFixed(1)}%`
              : adaptacion
                ? 'AdaptaciÃ³n Minciencias 2024'
                : 'No disponible'
          }
        />
      </KpiGrid>

      <AnalyticsSections
        sections={[
          {
            value: 'resumen',
            label: 'Resumen',
            icon: LayoutDashboard,
            content: (
              <>
                <TwoColumn>
                  <ProductionHistogram
                    data={stats?.by_year ?? []}
                    totalProducts={stats?.total_products ?? 0}
                    title="EvoluciÃ³n de ProducciÃ³n CientÃ­fica"
                    description="Trayectoria temporal de publicaciones y productos del investigador."
                  />
                  <FamiliesDonut
                    data={stats?.families_distribution ?? []}
                    title="Balance por Familias Minciencias"
                    description="DistribuciÃ³n de su producciÃ³n en GNC, DTI, ASC y FRH."
                  />
                </TwoColumn>
                {stats?.top_subtypes && stats.top_subtypes.length > 0 && (
                  <TopSubtypesRanking
                    data={stats.top_subtypes}
                    title="Top TipologÃ­as Minciencias del Investigador"
                    description="Subtipos con mayor nÃºmero de productos registrados (artÃ­culos, libros, software, etc.)."
                  />
                )}
              </>
            ),
          },
          ...(adaptacion
            ? [
                {
                  value: 'indicador',
                  label: 'Indicador',
                  icon: ShieldCheck,
                  content: (
                    /* Desglose auditable de la adaptaciÃ³n individual (Â§2.2.9 â†’ Â§3.10) */
                    <ResearcherOfficialAdaptationPanel
                      adaptacion={adaptacion}
                      summary={indicator?.summary}
                    />
                  ),
                },
              ]
            : []),
          {
            value: 'red',
            label: 'Grupos y red',
            icon: Network,
            content: (
              <TwoColumn>
                <ResearcherGroupsContribution
                  data={stats?.groups_contribution ?? []}
                  isAdmin={isAdmin}
                />
                <ResearcherTopCoauthors
                  data={stats?.top_coauthors ?? []}
                  isAdmin={isAdmin}
                />
              </TwoColumn>
            ),
          },
        ]}
      />
    </div>
  )
}
