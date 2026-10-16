import { useQuery } from '@tanstack/react-query'
import { BookOpen, Trophy, Sparkles, GraduationCap, FileDown, FileSpreadsheet, Scale } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ProductionHistogram,
  FamiliesDonut,
  EducationDonut,
  GroupTopResearchers,
  TopSubtypesRanking,
  MincienciasDiagnosisCard,
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
} from '@/lib/api'
import type { GroupStats, MincienciasGroupDiagnosis, GroupCollaborationNetworkData } from '@/lib/api'

export interface GroupAnalyticsTabProps {
  groupId: number
  groupName?: string
  stats?: GroupStats
  mincienciasDiagnosis?: MincienciasGroupDiagnosis
  collaborationNetwork?: GroupCollaborationNetworkData
  isLoadingNetwork?: boolean
  reportWindowParams?: Record<string, any>
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
  const { data: fetchedStats } = useQuery({
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

  return (
    <div className='space-y-6'>
      {/* Banner de Acciones Ejecutivas: Dossier Oficial & Exportaciones */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-xs'>
        <div className='space-y-0.5'>
          <div className='flex items-center gap-2'>
            <Badge className='bg-primary/20 text-primary border-primary/30 text-[10px] uppercase font-bold tracking-wider'>
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
        <div className='grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto'>
          <Button
            size='sm'
            variant='default'
            onClick={() => window.open(groupDossierPdfUrl(groupId, reportWindowParams), '_blank')}
            className='rounded-xl shadow-xs text-xs font-semibold w-full sm:w-auto'
          >
            <FileDown className='mr-1.5 h-3.5 w-3.5' />
            Dossier Ejecutivo (PDF)
          </Button>
          {onOpenCompare && (
            <Button
              size='sm'
              variant='outline'
              onClick={onOpenCompare}
              className='rounded-xl border-primary/30 text-primary hover:bg-primary/5 text-xs font-semibold w-full sm:w-auto'
            >
              <Scale className='mr-1.5 h-3.5 w-3.5 text-primary' />
              Benchmarking (Radar)
            </Button>
          )}
          <Button
            size='sm'
            variant='outline'
            onClick={() => window.open(groupExportRankingCsvUrl(groupId), '_blank')}
            className='rounded-xl border-border/80 text-xs font-medium bg-background/80 hover:bg-background w-full sm:w-auto'
          >
            <FileSpreadsheet className='mr-1.5 h-3.5 w-3.5 text-emerald-600' />
            Ranking (CSV)
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => window.open(groupExportProductsCsvUrl(groupId, reportWindowParams), '_blank')}
            className='rounded-xl border-border/80 text-xs font-medium bg-background/80 hover:bg-background w-full sm:w-auto'
          >
            <FileSpreadsheet className='mr-1.5 h-3.5 w-3.5 text-blue-600' />
            Productos (CSV)
          </Button>
          <Button
            size='sm'
            variant='ghost'
            onClick={onOpenExport}
            className='col-span-2 sm:col-span-1 rounded-xl text-xs text-muted-foreground hover:text-foreground w-full sm:w-auto'
          >
            Más opciones…
          </Button>
        </div>
      </div>

      {/* Top KPI Cards del Grupo */}
      <div className='grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4'>
        <Card className='border-border/60 shadow-xs'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                Total Producción
              </span>
              <BookOpen className='h-4 w-4 text-primary' />
            </div>
            <CardTitle className='text-2xl sm:text-3xl font-extrabold tracking-tight'>
              {stats?.total_products?.toLocaleString('es-CO') ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0 text-xs text-muted-foreground'>
            Obras científicas registradas en este grupo
          </CardContent>
        </Card>

        <Card className='border-border/60 shadow-xs'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                Pilar Científico
              </span>
              <Trophy className='h-4 w-4 text-amber-500' />
            </div>
            <CardTitle className='text-sm sm:text-base font-bold tracking-tight truncate' title={stats?.top_researchers?.[0]?.name}>
              {stats?.top_researchers?.[0]?.name ?? 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0 text-xs text-muted-foreground'>
            {stats?.top_researchers?.[0]
              ? `${stats.top_researchers[0].products_count} obras (${stats.top_researchers[0].percentage_of_group}% del grupo)`
              : 'Sin registros de autoría'}
          </CardContent>
        </Card>

        <Card className='border-border/60 shadow-xs'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                Productividad Media
              </span>
              <Sparkles className='h-4 w-4 text-violet-500' />
            </div>
            <CardTitle className='text-2xl sm:text-3xl font-extrabold tracking-tight'>
              {stats?.strategic_ratios?.avg_products_per_member ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0 text-xs text-muted-foreground'>
            Promedio de obras por integrante activo
          </CardContent>
        </Card>

        <Card className='border-border/60 shadow-xs'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                Masa Posgrado
              </span>
              <GraduationCap className='h-4 w-4 text-emerald-600' />
            </div>
            <CardTitle className='text-2xl sm:text-3xl font-extrabold tracking-tight'>
              {stats?.strategic_ratios?.postgraduate_rate ?? 0}%
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0 text-xs text-muted-foreground'>
            {stats?.strategic_ratios?.postgraduate_count ?? 0} investigadores con posgrado
          </CardContent>
        </Card>
      </div>

      {/* Diagnóstico y Semáforo de Categorización Minciencias 2024 */}
      {mincienciasDiagnosis && <MincienciasDiagnosisCard data={mincienciasDiagnosis} />}

      {/* Red de Colaboración y Grafo de Coautorías Interactivas */}
      <GroupCollaborationNetwork
        data={collaborationNetwork}
        groupName={groupName}
        isLoading={isLoadingNetwork}
      />

      {/* Benchmarking Inter-grupal & Tablero Multidimensional */}
      <GroupsRadarComparison
        initialGroupIds={[groupId, ...(groupId === 10 ? [35] : [10])]}
        showGroupSelector={true}
      />

      {/* Dinámica Temporal + Familias */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
        <ProductionHistogram
          data={stats?.by_year ?? []}
          totalProducts={stats?.total_products}
          height={270}
          className='col-span-1 lg:col-span-4'
          title='Dinámica Temporal del Grupo'
          description='Evolución anual de obtención de productos científicos en este colectivo.'
        />
        <FamiliesDonut
          data={stats?.families_distribution}
          className='col-span-1 lg:col-span-3'
          title='Familias Minciencias del Grupo'
          description='Balance tipológico entre GNC, DTI, ASC y FRH en el grupo.'
        />
      </div>

      {/* Ranking de Autores de Mayor Impacto + Nivel Académico y Subtipos */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
        <GroupTopResearchers
          data={stats?.top_researchers}
          totalGroupProducts={stats?.total_products}
          className='col-span-1 lg:col-span-4'
        />
        <div className='col-span-1 lg:col-span-3 space-y-6'>
          <EducationDonut
            data={stats?.researchers_education}
            totalResearchers={stats?.total_members}
            title='Formación del Talento Humano'
            description='Composición del equipo según su máximo título académico.'
          />
          {stats?.top_subtypes && stats.top_subtypes.length > 0 && (
            <TopSubtypesRanking
              data={stats.top_subtypes}
              title='Top Tipologías en el Grupo'
              description='Formatos y subtipos con mayor volumen en este grupo.'
            />
          )}
        </div>
      </div>
    </div>
  )
}
