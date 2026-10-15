import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  Trophy,
  Scale,
  Sparkles,
  BookOpen,
  Cpu,
  Globe,
  GraduationCap,
  Share2,
  TrendingUp,
  X,
  Info,
  CheckCircle2,
  BarChart3,
  Radar as RadarIcon,
  Download,
  Copy,
  Eye,
  EyeOff,
  Users,
  Award,
  Layers,
  Plus,
  ChevronDown,
} from 'lucide-react'
import {
  compareGroupsAnalytics,
  listGroups,
  type GroupsComparisonResponse,
} from '@/lib/api'
import { parseMincienciasClassification } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const COMPARISON_GROUP_PALETTE = [
  {
    stroke: '#059669', // Emerald
    fill: '#059669',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  },
  {
    stroke: '#2563eb', // Blue
    fill: '#2563eb',
    badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    dot: 'bg-blue-500',
    pill: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
  },
  {
    stroke: '#d97706', // Amber
    fill: '#d97706',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
    pill: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  },
  {
    stroke: '#7c3aed', // Violet
    fill: '#7c3aed',
    badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30',
    dot: 'bg-violet-500',
    pill: 'bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 border-violet-300 dark:border-violet-800',
  },
  {
    stroke: '#e11d48', // Rose
    fill: '#e11d48',
    badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
    dot: 'bg-rose-500',
    pill: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  },
  {
    stroke: '#0891b2', // Cyan
    fill: '#0891b2',
    badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
    dot: 'bg-cyan-500',
    pill: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
  },
]

export const BENCHMARK_OPTIONS = [
  {
    id: -1,
    acronym: 'Media UPC',
    name: 'Promedio Institucional UPC',
    description: 'Línea base institucional calculada',
    badgeText: 'Línea Base',
  },
  {
    id: -2,
    acronym: 'Meta A1',
    name: 'Estándar Minciencias (Cat. A1)',
    description: 'Meta normativa de investigación de excelencia',
    badgeText: 'Meta A1',
  },
]

const DIMENSION_ICONS: Record<string, React.ElementType> = {
  gnc: BookOpen,
  dti: Cpu,
  asc: Globe,
  frh: GraduationCap,
  cohesion: Share2,
  productivity: TrendingUp,
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey?: string
    payload: any
  }>
}

function RadarCustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className='rounded-xl border border-border/80 bg-popover/95 p-3.5 shadow-xl backdrop-blur-md text-xs min-w-[260px]'>
      <div className='border-b border-border/60 pb-1.5 mb-2'>
        <p className='font-bold text-sm text-foreground'>{row.dimension}</p>
        <p className='text-[11px] text-muted-foreground leading-tight'>{row.description}</p>
      </div>
      <div className='space-y-1.5'>
        {payload.map((item) => {
          const rawVal = item.dataKey ? row[`${item.dataKey}_raw`] : row[`${item.name}_raw`]
          return (
            <div key={item.name} className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-1.5 min-w-0'>
                <span
                  className='h-2.5 w-2.5 rounded-full shrink-0'
                  style={{ backgroundColor: item.color }}
                />
                <span className='font-medium text-foreground truncate'>{item.name}:</span>
              </div>
              <div className='text-right font-mono font-semibold text-foreground'>
                {rawVal !== undefined && rawVal !== null ? rawVal : ''} {row.unit}{' '}
                <span className='text-[10px] font-normal text-muted-foreground'>
                  ({item.value}%)
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export interface GroupsRadarComparisonProps {
  initialGroupIds?: number[]
  className?: string
  showGroupSelector?: boolean
}

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
  const sharedResearchers = useMemo(() => {
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
      <CardHeader className='pb-3.5 border-b border-border/40 bg-gradient-to-r from-card via-card to-primary/5'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div className='space-y-0.5'>
            <CardTitle className='text-lg font-bold tracking-tight text-foreground'>
              Benchmarking Inter-grupal
            </CardTitle>
            <CardDescription className='text-xs text-muted-foreground'>
              Comparativa multidimensional bajo el Modelo Minciencias 2024 e indicadores de red.
            </CardDescription>
          </div>

          <div className='flex items-center gap-2'>
            {/* Switcher de Vista: Radar vs Barras */}
            <div className='flex items-center bg-muted/70 rounded-xl p-0.5 border border-border/60'>
              <button
                type='button'
                onClick={() => setViewMode('radar')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'radar'
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title='Polígono de Radar'
              >
                <RadarIcon className='h-3.5 w-3.5' />
                <span>Radar</span>
              </button>
              <button
                type='button'
                onClick={() => setViewMode('bars')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'bars'
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title='Barras Agrupadas'
              >
                <BarChart3 className='h-3.5 w-3.5' />
                <span>Barras</span>
              </button>
            </div>

            {/* Menú compacto de Exportación y Opciones */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='h-8 text-xs font-medium'>
                  <Download className='mr-1.5 h-3.5 w-3.5 text-muted-foreground' />
                  Exportar
                  <ChevronDown className='ml-1 h-3 w-3 text-muted-foreground' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56'>
                <DropdownMenuItem onClick={handleExportCsv} className='text-xs cursor-pointer'>
                  <Download className='mr-2 h-3.5 w-3.5 text-emerald-600' />
                  Descargar Matriz (CSV / Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopySummary} className='text-xs cursor-pointer'>
                  <Copy className='mr-2 h-3.5 w-3.5 text-primary' />
                  Copiar Resumen para Informe
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleResetLeaders} className='text-xs cursor-pointer'>
                  <Sparkles className='mr-2 h-3.5 w-3.5 text-amber-500' />
                  Restablecer Selección Inicial
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Barra de Grupos Comparados y Selector Inline */}
        <div className='flex flex-wrap items-center justify-between gap-2 pt-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-xs font-semibold text-muted-foreground mr-1'>Comparando:</span>
            {groups.map((grp, index) => {
              const palette = COMPARISON_GROUP_PALETTE[index % COMPARISON_GROUP_PALETTE.length]
              const isHidden = hiddenGroupIds.includes(grp.id)
              const isHovered = hoveredGroupId === grp.id
              const isBenchmark = grp.id < 0

              return (
                <div
                  key={grp.id}
                  onMouseEnter={() => setHoveredGroupId(grp.id)}
                  onMouseLeave={() => setHoveredGroupId(null)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    isHidden
                      ? 'opacity-40 bg-muted/30 border-dashed border-border text-muted-foreground'
                      : isBenchmark
                        ? grp.id === -1
                          ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-dashed border-purple-500/40'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-dashed border-amber-500/40'
                        : isHovered
                          ? `${palette.badge} ring-2 ring-primary/40 shadow-xs scale-102`
                          : palette.badge
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isBenchmark
                        ? grp.id === -1
                          ? 'bg-purple-500'
                          : 'bg-amber-500'
                        : palette.dot
                    }`}
                  />
                  <span className='font-extrabold'>{grp.acronym}</span>
                  <span className='text-[10px] opacity-80 font-mono font-semibold'>
                    ({grp.id < 0 ? grp.classification : parseMincienciasClassification(grp.classification).badgeText || grp.classification})
                  </span>

                  {/* Botón de Visibilidad (Ojo) */}
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleHide(grp.id)
                    }}
                    className='ml-1 text-muted-foreground hover:text-foreground'
                    title={isHidden ? 'Mostrar en gráficos' : 'Ocultar temporalmente'}
                  >
                    {isHidden ? <EyeOff className='h-3 w-3' /> : <Eye className='h-3 w-3' />}
                  </button>

                  {/* Botón de Remover */}
                  {groups.length > 1 && (
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveGroup(grp.id)
                      }}
                      className='ml-0.5 text-muted-foreground hover:text-destructive'
                      title='Remover de la comparación'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  )}
                </div>
              )
            })}

            {/* Botón Inline Añadir Grupo / Referente */}
            {showGroupSelector && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 px-2.5 text-xs font-semibold rounded-lg border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors'
                  >
                    <Plus className='mr-1 h-3 w-3' />
                    Añadir a la comparación
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start' className='w-72 max-h-80 overflow-y-auto'>
                  {availableGroups.length > 0 && (
                    <>
                      <div className='px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                        Grupos Registrados
                      </div>
                      {availableGroups.map((g) => (
                        <DropdownMenuItem
                          key={g.id}
                          onClick={() => handleAddGroup(String(g.id))}
                          className='flex items-center justify-between text-xs cursor-pointer py-1.5'
                        >
                          <span className='font-semibold truncate mr-2'>{g.acronym || g.name}</span>
                          {g.classification && (
                            <Badge variant='outline' className='text-[10px] font-mono shrink-0'>
                              {parseMincienciasClassification(g.classification).badgeText || g.classification}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {availableBenchmarks.length > 0 && (
                    <>
                      {availableGroups.length > 0 && <DropdownMenuSeparator />}
                      <div className='px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                        Líneas Base y Benchmarks
                      </div>
                      {availableBenchmarks.map((b) => (
                        <DropdownMenuItem
                          key={b.id}
                          onClick={() => handleAddGroup(String(b.id))}
                          className='flex items-center justify-between text-xs cursor-pointer py-1.5'
                        >
                          <div className='flex items-center gap-2 min-w-0'>
                            <Sparkles className='h-3.5 w-3.5 text-amber-500 shrink-0' />
                            <div className='truncate'>
                              <p className='font-bold text-foreground'>{b.name}</p>
                              <p className='text-[10px] text-muted-foreground'>{b.description}</p>
                            </div>
                          </div>
                          <Badge variant='secondary' className='text-[10px] font-mono shrink-0 ml-2'>
                            {b.badgeText}
                          </Badge>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {availableGroups.length === 0 && availableBenchmarks.length === 0 && (
                    <div className='p-3 text-center text-xs text-muted-foreground'>
                      Todos los grupos y referentes disponibles ya están incluidos
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

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
            {/* Strip compacto de líderes por dimensión */}
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2'>
              {leaders.map((leader) => {
                const IconComp = DIMENSION_ICONS[leader.dimension_key] || Trophy
                const isGroupHovered = hoveredGroupId === leader.leader_group_id

                return (
                  <div
                    key={leader.dimension_key}
                    onMouseEnter={() => setHoveredGroupId(leader.leader_group_id)}
                    onMouseLeave={() => setHoveredGroupId(null)}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                      isGroupHovered
                        ? 'border-primary ring-1 ring-primary/40 bg-card shadow-xs'
                        : 'border-border/60 bg-card/50 hover:border-primary/40'
                    }`}
                  >
                    <div className='p-1.5 rounded-lg bg-primary/10 shrink-0 text-primary'>
                      <IconComp className='h-3 w-3' />
                    </div>
                    <div className='min-w-0'>
                      <div className='text-[10px] font-bold text-muted-foreground uppercase truncate'>
                        {leader.dimension_label.split('(')[1]?.replace(')', '') || leader.dimension_label}
                      </div>
                      <div className='flex items-baseline gap-1'>
                        <span className='text-xs font-black text-foreground truncate'>
                          {leader.leader_acronym}
                        </span>
                        <span className='text-[10px] font-mono text-muted-foreground'>
                          ({leader.value} {leader.unit})
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Gráfico Radar / Barras (8 cols) + Hallazgos Clave (4 cols) */}
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch'>
              <div className='lg:col-span-8 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between'>
                <div className='flex items-center justify-between mb-2'>
                  <div>
                    <h4 className='text-sm font-bold text-foreground'>
                      {viewMode === 'radar'
                        ? 'Polígono de Capacidades Comparadas (0 - 100%)'
                        : 'Distribución Comparativa por Dimensión (Puntuación Relativa %)'}
                    </h4>
                    <p className='text-[11px] text-muted-foreground'>
                      Puntuaciones normalizadas en relación al colectivo líder de cada categoría
                    </p>
                  </div>
                </div>

                <div className='h-[330px] sm:h-[390px] w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    {viewMode === 'radar' ? (
                      <RadarChart data={radarChartData} outerRadius='70%'>
                        <PolarGrid stroke='hsl(var(--border))' strokeDasharray='3 3' />
                        <PolarAngleAxis
                          dataKey='short_label'
                          tick={{
                            fill: 'hsl(var(--foreground))',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 100]}
                          stroke='hsl(var(--muted-foreground))'
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <Tooltip content={<RadarCustomTooltip />} />
                        <Legend
                          wrapperStyle={{ paddingTop: 16 }}
                          formatter={(value) => {
                            const grp = groups.find((g) => `group_${g.id}` === value)
                            return (
                              <span
                                onMouseEnter={() => grp && setHoveredGroupId(grp.id)}
                                onMouseLeave={() => setHoveredGroupId(null)}
                                className={`text-xs font-semibold cursor-pointer mr-3 ${
                                  hoveredGroupId && grp?.id === hoveredGroupId
                                    ? 'text-primary underline'
                                    : 'text-foreground'
                                }`}
                              >
                                {grp?.acronym ?? value}
                              </span>
                            )
                          }}
                        />
                        {visibleGroups.map((grp) => {
                          const origIndex = groups.findIndex((g) => g.id === grp.id)
                          const palette =
                            COMPARISON_GROUP_PALETTE[origIndex % COMPARISON_GROUP_PALETTE.length]
                          const isHovered = hoveredGroupId === grp.id
                          const isBenchmark = grp.id < 0

                          return (
                            <Radar
                              key={grp.id}
                              name={grp.acronym}
                              dataKey={`group_${grp.id}`}
                              stroke={isBenchmark ? (grp.id === -1 ? '#8b5cf6' : '#f59e0b') : palette.stroke}
                              fill={isBenchmark ? (grp.id === -1 ? '#8b5cf6' : '#f59e0b') : palette.fill}
                              fillOpacity={isHovered ? 0.45 : isBenchmark ? 0.08 : hoveredGroupId !== null ? 0.08 : 0.22}
                              strokeWidth={isHovered ? 3.5 : isBenchmark ? 2 : hoveredGroupId !== null ? 1.5 : 2.5}
                              strokeDasharray={grp.id === -1 ? '4 4' : grp.id === -2 ? '3 3' : undefined}
                              dot={{
                                r: isHovered ? 5 : 3.5,
                                fill: isBenchmark ? (grp.id === -1 ? '#8b5cf6' : '#f59e0b') : palette.stroke,
                              }}
                            />
                          )
                        })}
                      </RadarChart>
                    ) : (
                      <BarChart data={radarChartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))' opacity={0.6} />
                        <XAxis
                          dataKey='short_label'
                          tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          unit='%'
                        />
                        <Tooltip content={<RadarCustomTooltip />} />
                        <Legend
                          wrapperStyle={{ paddingTop: 12 }}
                          formatter={(value) => (
                            <span className='text-xs font-semibold text-foreground mr-3'>
                              {value}
                            </span>
                          )}
                        />
                        {visibleGroups.map((grp) => {
                          const origIndex = groups.findIndex((g) => g.id === grp.id)
                          const palette =
                            COMPARISON_GROUP_PALETTE[origIndex % COMPARISON_GROUP_PALETTE.length]
                          const isHovered = hoveredGroupId === grp.id
                          const isBenchmark = grp.id < 0

                          return (
                            <Bar
                              key={grp.id}
                              name={grp.acronym}
                              dataKey={`group_${grp.id}`}
                              fill={isBenchmark ? (grp.id === -1 ? '#8b5cf6' : '#f59e0b') : palette.fill}
                              opacity={isHovered ? 1 : hoveredGroupId !== null ? 0.35 : 0.85}
                              radius={[4, 4, 0, 0]}
                            />
                          )
                        })}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hallazgos Clave y Metodología */}
              <div className='lg:col-span-4 space-y-4 flex flex-col justify-between'>
                <div className='p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-3 flex-1'>
                  <div className='flex items-center gap-2'>
                    <Sparkles className='h-4 w-4 text-primary' />
                    <h4 className='text-sm font-bold text-foreground'>
                      Hallazgos Clave de Benchmarking
                    </h4>
                  </div>
                  <ul className='space-y-2.5 text-xs text-muted-foreground'>
                    {data.insights.slice(0, 5).map((insight, idx) => (
                      <li key={idx} className='flex items-start gap-2'>
                        <CheckCircle2 className='h-3.5 w-3.5 text-primary shrink-0 mt-0.5' />
                        <span className='leading-snug text-foreground/90'>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className='p-3.5 rounded-2xl border border-border/70 bg-card/40 space-y-1.5 text-xs'>
                  <div className='flex items-center gap-1.5 font-semibold text-foreground'>
                    <Info className='h-3.5 w-3.5 text-muted-foreground' />
                    <span>Metodología de Normalización</span>
                  </div>
                  <p className='text-muted-foreground leading-relaxed text-[11px]'>
                    El 100% representa el puntaje del colectivo o referente líder en cada categoría.
                    GNC, DTI, ASC y FRH corresponden a las 4 familias de Minciencias 2024.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* PESTAÑA 2: MATRIZ DETALLADA */}
          <TabsContent value='matrix' className='mt-0 space-y-3'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/20 p-3 rounded-xl border border-border/60'>
              <div>
                <h4 className='text-sm font-bold text-foreground'>
                  Matriz de Indicadores Clave Lado a Lado
                </h4>
                <p className='text-xs text-muted-foreground'>
                  Valores absolutos y porcentuales con identificación del colectivo o referente líder
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleExportCsv}
                  className='h-7 text-xs font-medium'
                >
                  <Download className='mr-1.5 h-3 w-3 text-emerald-600' />
                  Descargar CSV
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleCopySummary}
                  className='h-7 text-xs font-medium'
                >
                  <Copy className='mr-1.5 h-3 w-3 text-primary' />
                  Copiar Resumen
                </Button>
              </div>
            </div>

            <div className='overflow-x-auto rounded-xl border border-border/70 shadow-2xs'>
              <table className='w-full text-xs text-left border-collapse'>
                <thead>
                  <tr className='bg-muted/60 border-b border-border/80'>
                    <th className='p-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider min-w-[200px]'>
                      Indicador Clave
                    </th>
                    <th className='p-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider w-[120px]'>
                      Categoría
                    </th>
                    {visibleGroups.map((grp) => {
                      const origIndex = groups.findIndex((g) => g.id === grp.id)
                      const palette =
                        COMPARISON_GROUP_PALETTE[origIndex % COMPARISON_GROUP_PALETTE.length]
                      const isHovered = hoveredGroupId === grp.id
                      const isBenchmark = grp.id < 0

                      return (
                        <th
                          key={grp.id}
                          onMouseEnter={() => setHoveredGroupId(grp.id)}
                          onMouseLeave={() => setHoveredGroupId(null)}
                          className={`p-3 font-extrabold text-foreground min-w-[130px] border-l border-border/50 text-center transition-colors ${
                            isHovered ? 'bg-primary/10' : ''
                          }`}
                        >
                          <div className='flex items-center justify-center gap-1.5'>
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isBenchmark
                                  ? grp.id === -1
                                    ? 'bg-purple-500'
                                    : 'bg-amber-500'
                                  : palette.dot
                              }`}
                            />
                            <span>{grp.acronym}</span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/60'>
                  {matrix.map((row, idx) => (
                    <tr key={idx} className='hover:bg-muted/40 transition-colors even:bg-muted/10'>
                      <td className='p-3 font-medium text-foreground flex items-center justify-between gap-2'>
                        <span>{row.indicator}</span>
                        {row.unit && (
                          <span className='text-[10px] text-muted-foreground font-mono'>
                            ({row.unit})
                          </span>
                        )}
                      </td>
                      <td className='p-3 text-muted-foreground text-[11px]'>
                        <Badge variant='outline' className='text-[10px] font-normal py-0'>
                          {row.category}
                        </Badge>
                      </td>
                      {visibleGroups.map((grp) => {
                        const val = row.values[grp.id]
                        const isLeader = row.leader_id === grp.id
                        const isColHovered = hoveredGroupId === grp.id
                        const isPercentage = row.unit === '%' && typeof val === 'number'

                        return (
                          <td
                            key={grp.id}
                            className={`p-3 text-center font-mono font-medium border-l border-border/40 transition-colors ${
                              isLeader
                                ? 'bg-amber-500/15 font-bold text-foreground'
                                : isColHovered
                                  ? 'bg-primary/5 text-foreground'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            <div className='flex flex-col items-center justify-center gap-1'>
                              <div className='flex items-center gap-1'>
                                <span>
                                  {row.indicator === 'Clasificación Minciencias' && typeof val === 'string'
                                    ? parseMincienciasClassification(val).badgeText || val
                                    : val !== undefined && val !== null
                                      ? val
                                      : '—'}
                                </span>
                                {isLeader && <Trophy className='h-3 w-3 text-amber-500 shrink-0' />}
                              </div>
                              {isPercentage && val > 0 && (
                                <div className='w-16 h-1 rounded-full bg-muted overflow-hidden'>
                                  <div
                                    className='h-full bg-primary/70 rounded-full'
                                    style={{ width: `${Math.min(val, 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* PESTAÑA 3: AUTORES CLAVE */}
          <TabsContent value='talent' className='mt-0 space-y-4'>
            <div className='flex items-center justify-between bg-muted/20 p-3 rounded-xl border border-border/60'>
              <div className='flex items-center gap-2'>
                <Award className='h-4 w-4 text-amber-500' />
                <h4 className='text-sm font-bold text-foreground'>
                  Puntales Científicos: Investigadores Más Productivos por Colectivo
                </h4>
              </div>
              <span className='text-xs text-muted-foreground'>
                Top autores según volumen de obras asociadas
              </span>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
              {visibleGroups.filter((g) => g.id > 0).map((grp, index) => {
                const palette = COMPARISON_GROUP_PALETTE[index % COMPARISON_GROUP_PALETTE.length]
                const authors = grp.top_researchers || []

                return (
                  <div
                    key={grp.id}
                    className='p-3.5 rounded-xl border border-border/60 bg-card shadow-2xs space-y-2.5'
                  >
                    <div className='flex items-center justify-between border-b border-border/50 pb-1.5'>
                      <div className='flex items-center gap-2'>
                        <span className={`h-2.5 w-2.5 rounded-full ${palette.dot}`} />
                        <span className='text-xs font-black text-foreground'>{grp.acronym}</span>
                      </div>
                      <Badge variant='outline' className='text-[10px] font-mono'>
                        {grp.total_members} integrantes
                      </Badge>
                    </div>

                    <div className='space-y-1.5'>
                      {authors.length > 0 ? (
                        authors.map((auth, aIdx) => (
                          <div
                            key={auth.id || aIdx}
                            className='flex items-center justify-between text-xs gap-2 p-1.5 rounded-lg hover:bg-muted/40 transition-colors'
                          >
                            <div className='min-w-0'>
                              <p className='font-semibold text-foreground truncate' title={auth.name}>
                                {auth.name}
                              </p>
                              <span className='text-[10px] text-muted-foreground'>
                                {(auth as any).highest_education || 'Investigador'}
                              </span>
                            </div>
                            <div className='text-right shrink-0'>
                              <span className='font-mono font-bold text-foreground'>
                                {auth.products_count} obras
                              </span>
                              <p className='text-[10px] text-muted-foreground'>
                                {auth.percentage_of_group}% del grupo
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className='text-xs text-muted-foreground text-center py-2'>
                          Sin registros de integrantes
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {sharedResearchers.length > 0 && (
              <div className='p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-2.5 text-xs'>
                <Layers className='h-4 w-4 text-primary shrink-0 mt-0.5' />
                <div>
                  <span className='font-bold text-foreground'>Colaboración Cruzada Detectada:</span>{' '}
                  <span className='text-muted-foreground'>
                    {sharedResearchers.map((sr) => (
                      <span key={sr.name} className='inline-block mr-2'>
                        «<strong className='text-foreground'>{sr.name}</strong>» ({sr.groups.join(' y ')})
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

