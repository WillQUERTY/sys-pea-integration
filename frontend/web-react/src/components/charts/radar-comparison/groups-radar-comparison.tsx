import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Scale,
  Radar as RadarIcon,
  Users,
} from 'lucide-react'
import {
  compareGroupsAnalytics,
  listGroups,
  type GroupsComparisonResponse,
} from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BENCHMARK_OPTIONS,
  type GroupsRadarComparisonProps,
  type SharedResearcher,
} from './types'
import { ComparisonHeader } from './comparison-header'
import { LeadersStrip } from './leaders-strip'
import { RadarVisualizer } from './radar-visualizer'
import { InsightsPanel } from './insights-panel'
import { ComparisonMatrixTab } from './comparison-matrix-tab'
import { KeyTalentTab } from './key-talent-tab'

export function GroupsRadarComparison({
  initialGroupIds = [10, 35],
  className = '',
  showGroupSelector = true,
}: GroupsRadarComparisonProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>(initialGroupIds)
  const [hoveredGroupId, setHoveredGroupId] = useState<number | null>(null)
  const [hiddenGroupIds, setHiddenGroupIds] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<'radar' | 'bars'>('radar')

  // 1. Cargar datos comparativos
  const { data, isLoading, isError, refetch } = useQuery<GroupsComparisonResponse>({
    queryKey: ['analytics', 'compare-groups', selectedIds],
    queryFn: () => compareGroupsAnalytics(selectedIds),
    enabled: selectedIds.length > 0,
  })

  // 2. Cargar lista general de grupos para el selector
  const groupsListQuery = useQuery({
    queryKey: ['groups', 'simple-list'],
    queryFn: () => listGroups({ limit: 100, status: 'active' }),
    staleTime: 5 * 60 * 1000,
  })

  const availableGroups = useMemo(() => {
    const all = groupsListQuery.data?.items ?? []
    return all.filter((g) => g.id && !selectedIds.includes(g.id))
  }, [groupsListQuery.data, selectedIds])

  const availableBenchmarks = useMemo(() => {
    return BENCHMARK_OPTIONS.filter((b) => !selectedIds.includes(b.id))
  }, [selectedIds])

  const handleAddGroup = (idStr: string) => {
    const id = parseInt(idStr, 10)
    if (!isNaN(id) && !selectedIds.includes(id)) {
      if (selectedIds.length >= 6) {
        toast.info('Máximo 6 grupos o referentes simultáneos')
        return
      }
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleRemoveGroup = (id: number) => {
    if (selectedIds.length <= 1) {
      toast.info('Debe haber al menos un grupo o referente en la comparación')
      return
    }
    setSelectedIds(selectedIds.filter((item) => item !== id))
    setHiddenGroupIds(hiddenGroupIds.filter((item) => item !== id))
  }

  const handleToggleHide = (id: number) => {
    if (hiddenGroupIds.includes(id)) {
      setHiddenGroupIds(hiddenGroupIds.filter((item) => item !== id))
    } else {
      if (selectedIds.length - hiddenGroupIds.length <= 1) {
        toast.info('Debe mantenerse al menos un grupo visible')
        return
      }
      setHiddenGroupIds([...hiddenGroupIds, id])
    }
  }

  const handleResetLeaders = () => {
    setSelectedIds([10, 35])
    setHiddenGroupIds([])
  }

  // Exportar Matriz a CSV con UTF-8 BOM
  const handleExportCsv = () => {
    if (!data || !data.comparison_matrix.length) return

    const visibleGroups = data.groups.filter((g) => !hiddenGroupIds.includes(g.id))
    const headers = ['Indicador', 'Categoría', 'Unidad', ...visibleGroups.map((g) => g.acronym)]

    const rows = data.comparison_matrix.map((row) => {
      const line = [
        `"${row.indicator.replace(/"/g, '""')}"`,
        `"${row.category}"`,
        `"${row.unit}"`,
        ...visibleGroups.map((g) => {
          const val = row.values[g.id]
          return val !== undefined && val !== null ? `"${val}"` : '""'
        }),
      ]
      return line.join(';')
    })

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `benchmarking_grupos_khemia_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Matriz comparativa exportada en formato Excel / CSV')
  }

  // Copiar Resumen Ejecutivo a Portapapeles
  const handleCopySummary = async () => {
    if (!data) return

    const visibleGroups = data.groups.filter((g) => !hiddenGroupIds.includes(g.id))
    const groupNames = visibleGroups.map((g) => `${g.acronym} (${g.classification})`).join(' vs ')

    let text = `📊 BENCHMARKING INTER-GRUPAL KHEMIA (UPC)\n`
    text += `Comparativa: ${groupNames}\n`
    text += `Fecha: ${new Date().toLocaleDateString('es-CO')}\n\n`
    text += `🏆 LIDERAZGO INSTITUCIONAL:\n`
    data.dimension_leaders.forEach((dl) => {
      text += `• ${dl.dimension_label}: ${dl.leader_acronym} (${dl.value} ${dl.unit})\n`
    })
    text += `\n🔍 HALLAZGOS CLAVE:\n`
    data.insights.forEach((ins) => {
      text += `• ${ins}\n`
    })

    try {
      await navigator.clipboard.writeText(text)
      toast.success('Resumen ejecutivo copiado al portapapeles')
    } catch {
      toast.error('No se pudo acceder al portapapeles')
    }
  }

  // Detección de investigadores compartidos entre grupos comparados
  const sharedResearchers: SharedResearcher[] = useMemo(() => {
    if (!data || data.groups.length < 2) return []
    const authorMap = new Map<number, { name: string; education: string; groups: string[] }>()

    data.groups.forEach((g) => {
      g.top_researchers?.forEach((r) => {
        const existing = authorMap.get(r.id)
        if (existing) {
          if (!existing.groups.includes(g.acronym)) {
            existing.groups.push(g.acronym)
          }
        } else {
          authorMap.set(r.id, {
            name: r.name,
            education: (r as any).highest_education || 'Investigador',
            groups: [g.acronym],
          })
        }
      })
    })

    return Array.from(authorMap.values()).filter((item) => item.groups.length > 1)
  }, [data])

  if (isLoading) {
    return (
      <Card className={`border-border/60 shadow-sm ${className}`}>
        <CardHeader>
          <Skeleton className='h-7 w-64' />
          <Skeleton className='h-4 w-96' />
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3'>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className='h-20 rounded-xl' />
            ))}
          </div>
          <Skeleton className='h-80 w-full rounded-2xl' />
        </CardContent>
      </Card>
    )
  }

  if (isError || !data || !data.groups.length) {
    return (
      <Card className={`border-border/60 shadow-sm p-6 text-center ${className}`}>
        <Scale className='h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-60' />
        <h3 className='font-bold text-base text-foreground'>Sin datos comparativos</h3>
        <p className='text-xs text-muted-foreground mb-4'>
          No se pudieron contrastar los grupos seleccionados o no hay suficientes registros.
        </p>
        <Button size='sm' variant='outline' onClick={() => refetch()}>
          Reintentar consulta
        </Button>
      </Card>
    )
  }

  const groups = data.groups
  const visibleGroups = groups.filter((g) => !hiddenGroupIds.includes(g.id))
  const radarChartData = data.radar_chart_data
  const leaders = data.dimension_leaders
  const matrix = data.comparison_matrix

  return (
    <Card className={`border-border/60 shadow-sm overflow-hidden ${className}`}>
      {/* Header & Acciones del Comparador */}
      <ComparisonHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExportCsv={handleExportCsv}
        onCopySummary={handleCopySummary}
        onResetLeaders={handleResetLeaders}
        groups={groups}
        hiddenGroupIds={hiddenGroupIds}
        hoveredGroupId={hoveredGroupId}
        onHoverGroup={setHoveredGroupId}
        onToggleHide={handleToggleHide}
        onRemoveGroup={handleRemoveGroup}
        showGroupSelector={showGroupSelector}
        availableGroups={availableGroups}
        availableBenchmarks={availableBenchmarks}
        onAddGroup={handleAddGroup}
      />

      <CardContent className='pt-5 space-y-5'>
        {/* Sistema de Pestañas: Radar, Matriz Detallada, Autores Clave */}
        <Tabs defaultValue='radar' className='w-full space-y-4'>
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3'>
            <TabsList className='bg-muted/60 p-1 rounded-xl h-9 w-full sm:w-auto grid grid-cols-3 sm:flex'>
              <TabsTrigger
                value='radar'
                className='text-xs font-semibold px-2 sm:px-3 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs'
              >
                <RadarIcon className='h-3.5 w-3.5 text-primary shrink-0' />
                <span>Radar<span className='hidden sm:inline'> y Diagnóstico</span></span>
              </TabsTrigger>
              <TabsTrigger
                value='matrix'
                className='text-xs font-semibold px-2 sm:px-3 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs'
              >
                <Scale className='h-3.5 w-3.5 text-amber-500 shrink-0' />
                <span>Matriz<span className='hidden sm:inline'> de Indicadores</span></span>
              </TabsTrigger>
              <TabsTrigger
                value='talent'
                className='text-xs font-semibold px-2 sm:px-3 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs'
              >
                <Users className='h-3.5 w-3.5 text-blue-500 shrink-0' />
                <span>Autores<span className='hidden sm:inline'> Clave</span> ({groups.filter((g) => g.id > 0).length})</span>
              </TabsTrigger>
            </TabsList>

            <span className='text-[11px] text-muted-foreground hidden sm:inline'>
              {visibleGroups.length} serie{visibleGroups.length !== 1 ? 's' : ''} activa{visibleGroups.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* PESTAÑA 1: RADAR Y DIAGNOSTICO */}
          <TabsContent value='radar' className='mt-0 space-y-4'>
            <LeadersStrip
              leaders={leaders}
              hoveredGroupId={hoveredGroupId}
              onHoverGroup={setHoveredGroupId}
            />

            <div className='grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch'>
              <RadarVisualizer
                viewMode={viewMode}
                radarChartData={radarChartData}
                groups={groups}
                visibleGroups={visibleGroups}
                hoveredGroupId={hoveredGroupId}
                onHoverGroup={setHoveredGroupId}
              />
              <InsightsPanel insights={data.insights} />
            </div>
          </TabsContent>

          {/* PESTAÑA 2: MATRIZ DETALLADA */}
          <TabsContent value='matrix' className='mt-0 space-y-3'>
            <ComparisonMatrixTab
              matrix={matrix}
              groups={groups}
              visibleGroups={visibleGroups}
              hoveredGroupId={hoveredGroupId}
              onHoverGroup={setHoveredGroupId}
              onExportCsv={handleExportCsv}
              onCopySummary={handleCopySummary}
            />
          </TabsContent>

          {/* PESTAÑA 3: AUTORES CLAVE */}
          <TabsContent value='talent' className='mt-0 space-y-4'>
            <KeyTalentTab
              visibleGroups={visibleGroups}
              sharedResearchers={sharedResearchers}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
