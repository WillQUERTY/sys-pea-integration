import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Trophy,
  Sparkles,
  GraduationCap,
  FileDown,
  FileSpreadsheet,
  Scale,
  LayoutDashboard,
  ShieldCheck,
  Network,
  Download,
  ChevronDown,
} from 'lucide-react'
import { KpiCard, KpiGrid, AnalyticsSections, TwoColumn } from '@/components/charts/analytics-kit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ProductionHistogram,
  FamiliesDonut,
  EducationDonut,
  GroupTopResearchers,
  TopSubtypesRanking,
  MincienciasDiagnosisCard,
  OfficialIndicatorPanel,
  GroupCollaborationNetwork,
  GroupsRadarComparison,
} from '@/components/charts'
import {
  groupDossierPdfUrl,
  groupExportRankingCsvUrl,
  groupExportProductsCsvUrl,
  getGroupStats,
  getGroupMincienciasDiagnosis,
  getGroupCollaborationNetwork,
  type GroupStats,
  type MincienciasGroupDiagnosis,
  type GroupCollaborationNetworkData,
} from '@/lib/api'

export interface GroupAnalyticsTabProps {
  groupId: number
  groupName?: string
  stats?: GroupStats
  mincienciasDiagnosis?: MincienciasGroupDiagnosis
  collaborationNetwork?: GroupCollaborationNetworkData
  isLoadingNetwork?: boolean
  reportWindowParams?: Record<string, unknown>
  onOpenExport: () => void
  onOpenCompare?: () => void
}

export function GroupAnalyticsTab({
  groupId,
  groupName,
  stats: propsStats,
  mincienciasDiagnosis: propsDiagnosis,
  collaborationNetwork: propsNetwork,
  isLoadingNetwork: propsIsLoadingNetwork = false,
  reportWindowParams,
  onOpenExport,
  onOpenCompare,
}: GroupAnalyticsTabProps) {
  const { data: fetchedStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['groups', groupId, 'stats'],
    queryFn: () => getGroupStats(groupId),
    enabled: !propsStats,
  })

  const { data: fetchedDiagnosis } = useQuery({
    queryKey: ['groups', groupId, 'minciencias-diagnosis'],
    queryFn: () => getGroupMincienciasDiagnosis(groupId),
    enabled: !propsDiagnosis,
  })

  const { data: fetchedNetwork, isLoading: isLoadingNet } = useQuery({
    queryKey: ['groups', groupId, 'collaboration-network'],
    queryFn: () => getGroupCollaborationNetwork(groupId),
    enabled: !propsNetwork,
  })

  const stats = propsStats ?? fetchedStats
  const mincienciasDiagnosis = propsDiagnosis ?? fetchedDiagnosis
  const collaborationNetwork = propsNetwork ?? fetchedNetwork
  const isLoadingNetwork = propsIsLoadingNetwork || isLoadingNet
  const showKpiSkeleton = !stats && isLoadingStats

  return (
    <div className='space-y-6'>
      {/* Banner de Acciones Ejecutivas: Dossier Oficial & Exportaciones */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-xs'>
        <div className='space-y-0.5'>
          <div className='flex items-center gap-2'>
            <Badge className='bg-primary/20 text-primary border-primary/30 text-[11px] uppercase font-bold tracking-wider'>
              Dossier Ejecutivo
            </Badge>
            <h3 className='text-sm font-bold tracking-tight text-foreground'>
              Reportes Oficiales de Gestión & Exportación
            </h3>
          </div>
          <p className='text-xs text-muted-foreground'>
            Descarga el dossier ejecutivo para Decanatura/Vicerrectoría o exporta las matrices analíticas en formato Excel/CSV.
          </p>
        </div>
        <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap'>
          <Button
            size='sm'
            variant='default'
            onClick={() => window.open(groupDossierPdfUrl(groupId, reportWindowParams), '_blank')}
            className='h-10 flex-1 rounded-xl text-xs font-semibold shadow-xs sm:h-8 sm:flex-none'
          >
            <FileDown className='mr-1.5 h-3.5 w-3.5' />
            Dossier (PDF)
          </Button>
          {onOpenCompare && (
            <Button
              size='sm'
              variant='outline'
              onClick={onOpenCompare}
              className='h-10 flex-1 rounded-xl border-primary/30 text-xs font-semibold text-primary hover:bg-primary/5 sm:h-8 sm:flex-none'
            >
              <Scale className='mr-1.5 h-3.5 w-3.5 text-primary' />
              Benchmarking
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='h-10 w-full rounded-xl border-border/80 bg-background/80 text-xs font-medium hover:bg-background sm:h-8 sm:w-auto'
              >
                <Download className='mr-1.5 h-3.5 w-3.5' />
                Exportar
                <ChevronDown className='ml-1.5 h-3.5 w-3.5 text-muted-foreground' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuItem onSelect={() => window.open(groupExportRankingCsvUrl(groupId), '_blank')}>
                <FileSpreadsheet className='h-4 w-4 text-emerald-600' />
                Ranking (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => window.open(groupExportProductsCsvUrl(groupId, reportWindowParams), '_blank')}
              >
                <FileSpreadsheet className='h-4 w-4 text-blue-600' />
                Productos (CSV)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onOpenExport}>Más opciones…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs del grupo: siempre visibles sobre las sub-pestañas */}
      {showKpiSkeleton ? (
        <KpiGrid>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className='h-[116px] w-full rounded-xl' />
          ))}
        </KpiGrid>
      ) : (
      <KpiGrid>
        <KpiCard
          label='Total Producción'
          icon={BookOpen}
          value={stats?.total_products?.toLocaleString('es-CO') ?? 0}
          hint='Obras científicas del grupo'
        />
        <KpiCard
          label='Pilar Científico'
          icon={Trophy}
          iconClassName='text-amber-500'
          compactValue
          value={stats?.top_researchers?.[0]?.name ?? 'N/A'}
          hint={
            stats?.top_researchers?.[0]
              ? `${stats.top_researchers[0].products_count} obras (${stats.top_researchers[0].percentage_of_group}% del grupo)`
              : 'Sin registros de autoría'
          }
        />
        <KpiCard
          label='Productividad Media'
          icon={Sparkles}
          iconClassName='text-violet-500'
          value={stats?.strategic_ratios?.avg_products_per_member ?? 0}
          hint='Obras por integrante activo'
        />
        <KpiCard
          label='Masa Posgrado'
          icon={GraduationCap}
          iconClassName='text-emerald-600'
          value={`${stats?.strategic_ratios?.postgraduate_rate ?? 0}%`}
          hint={`${stats?.strategic_ratios?.postgraduate_count ?? 0} investigadores con posgrado`}
        />
      </KpiGrid>
      )}

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
                    totalProducts={stats?.total_products}
                    height={270}
                    title='Dinámica Temporal del Grupo'
                    description='Evolución anual de obtención de productos científicos en este colectivo.'
                  />
                  <FamiliesDonut
                    data={stats?.families_distribution}
                    title='Familias Minciencias del Grupo'
                    description='Balance tipológico entre GNC, DTI, ASC y FRH en el grupo.'
                  />
                </TwoColumn>
                {stats?.top_subtypes && stats.top_subtypes.length > 0 && (
                  <TopSubtypesRanking
                    data={stats.top_subtypes}
                    title='Top Tipologías en el Grupo'
                    description='Formatos y subtipos con mayor volumen en este grupo.'
                  />
                )}
              </>
            ),
          },
          {
            value: 'diagnostico',
            label: 'Diagnóstico',
            icon: ShieldCheck,
            content: (
              <>
                {/* Diagnóstico y Semáforo de Categorización Minciencias 2024 */}
                {mincienciasDiagnosis && <MincienciasDiagnosisCard data={mincienciasDiagnosis} />}
                {/* Lectura oficial 2024: desglose auditable del cálculo (§2.2.9 → §3.10) */}
                {mincienciasDiagnosis?.modelo_oficial_2024 && (
                  <OfficialIndicatorPanel
                    modelo={mincienciasDiagnosis.modelo_oficial_2024}
                    summary={mincienciasDiagnosis.summary}
                  />
                )}
              </>
            ),
          },
          {
            value: 'equipo',
            label: 'Equipo y red',
            icon: Network,
            content: (
              <>
                <TwoColumn>
                  <GroupTopResearchers
                    data={stats?.top_researchers}
                    totalGroupProducts={stats?.total_products}
                  />
                  <EducationDonut
                    data={stats?.researchers_education}
                    totalResearchers={stats?.total_members}
                    title='Formación del Talento Humano'
                    description='Composición del equipo según su máximo título académico.'
                  />
                </TwoColumn>
                {/* Red de Colaboración y Grafo de Coautorías Interactivas */}
                <GroupCollaborationNetwork
                  data={collaborationNetwork}
                  groupName={groupName}
                  isLoading={isLoadingNetwork}
                />
              </>
            ),
          },
          {
            value: 'comparativa',
            label: 'Comparativa',
            icon: Scale,
            content: (
              /* Benchmarking Inter-grupal & Tablero Multidimensional */
              <GroupsRadarComparison
                initialGroupIds={[groupId, ...(groupId === 10 ? [35] : [10])]}
                showGroupSelector={true}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
