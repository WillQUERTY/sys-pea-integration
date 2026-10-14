import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
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
} from 'lucide-react'
import {
  compareGroupsAnalytics,
  listGroups,
  type GroupsComparisonResponse,
  type GroupRadarChartRow,
} from '@/lib/api'
import { parseMincienciasClassification } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const COMPARISON_GROUP_PALETTE = [
  {
    stroke: '#059669', // Emerald
    fill: '#059669',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  {
    stroke: '#2563eb', // Blue
    fill: '#2563eb',
    badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    dot: 'bg-blue-500',
  },
  {
    stroke: '#d97706', // Amber
    fill: '#d97706',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  {
    stroke: '#7c3aed', // Violet
    fill: '#7c3aed',
    badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30',
    dot: 'bg-violet-500',
  },
  {
    stroke: '#e11d48', // Rose
    fill: '#e11d48',
    badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
    dot: 'bg-rose-500',
  },
  {
    stroke: '#0891b2', // Cyan
    fill: '#0891b2',
    badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
    dot: 'bg-cyan-500',
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
    payload: GroupRadarChartRow
  }>
}

function RadarCustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className='rounded-xl border border-border/80 bg-popover/95 p-3.5 shadow-xl backdrop-blur-md text-xs min-w-[240px]'>
      <div className='border-b border-border/60 pb-1.5 mb-2'>
        <p className='font-bold text-sm text-foreground'>{row.dimension}</p>
        <p className='text-[11px] text-muted-foreground leading-tight'>{row.description}</p>
      </div>
      <div className='space-y-1.5'>
        {payload.map((item) => {
          const rawVal = row[`${item.name}_raw`]
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
                {rawVal !== undefined ? rawVal : ''} {row.unit}{' '}
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
  const [candidateId, setCandidateId] = useState<string>('')

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

  const handleAddGroup = (idStr: string) => {
    const id = parseInt(idStr, 10)
    if (!isNaN(id) && !selectedIds.includes(id)) {
      if (selectedIds.length >= 6) {
        return // Máximo 6 para legibilidad del radar
      }
      setSelectedIds([...selectedIds, id])
      setCandidateId('')
    }
  }

  const handleRemoveGroup = (id: number) => {
    if (selectedIds.length <= 1) return
    setSelectedIds(selectedIds.filter((item) => item !== id))
  }

  const handleResetLeaders = () => {
    setSelectedIds([10, 35])
  }

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
  const radarChartData = data.radar_chart_data
  const leaders = data.dimension_leaders
  const matrix = data.comparison_matrix

  return (
    <Card className={`border-border/60 shadow-sm overflow-hidden ${className}`}>
      {/* Header & Acciones del Comparador */}
      <CardHeader className='pb-4 border-b border-border/40 bg-gradient-to-r from-card via-card to-primary/5'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <Badge className='bg-primary/20 text-primary border-primary/30 text-[10px] uppercase font-bold tracking-wider'>
                Fase 5 • Benchmarking
              </Badge>
              <CardTitle className='text-xl sm:text-2xl font-black tracking-tight'>
                Benchmarking Inter-grupal & Tablero de Rendimiento
              </CardTitle>
            </div>
            <CardDescription className='text-xs sm:text-sm text-muted-foreground'>
              Evaluación relativa multidimensional bajo el Modelo Minciencias 2024 e indicadores de
              red de coautoría.
            </CardDescription>
          </div>

          {showGroupSelector && (
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleResetLeaders}
                className='h-8 text-xs font-semibold'
                title='Comparar los colectivos insignia AITICE vs GISICO'
              >
                <Sparkles className='mr-1.5 h-3.5 w-3.5 text-amber-500' />
                Líderes UPC
              </Button>

              {selectedIds.length < 6 && (
                <div className='flex items-center gap-1.5'>
                  <Select value={candidateId} onValueChange={handleAddGroup}>
                    <SelectTrigger className='h-8 w-44 text-xs bg-background'>
                      <SelectValue placeholder='+ Añadir grupo…' />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGroups.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)} className='text-xs'>
                          {g.acronym || g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chips de Grupos Activos en la Comparación */}
        <div className='flex flex-wrap items-center gap-2 pt-2'>
          <span className='text-xs font-semibold text-muted-foreground mr-1'>Comparando:</span>
          {groups.map((grp, index) => {
            const palette = COMPARISON_GROUP_PALETTE[index % COMPARISON_GROUP_PALETTE.length]
            return (
              <Badge
                key={grp.id}
                variant='outline'
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border ${palette.badge}`}
              >
                <span className={`h-2 w-2 rounded-full ${palette.dot}`} />
                <span>{grp.acronym}</span>
                <span className='text-[10px] opacity-80 font-mono font-semibold'>
                  ({parseMincienciasClassification(grp.classification).badgeText || grp.classification})
                </span>
                {groups.length > 2 && (
                  <button
                    onClick={() => handleRemoveGroup(grp.id)}
                    className='ml-1 text-muted-foreground hover:text-foreground'
                    title='Remover grupo'
                  >
                    <X className='h-3 w-3' />
                  </button>
                )}
              </Badge>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className='pt-6 space-y-6'>
        {/* Píldoras de Liderazgo por Dimensión */}
        <div>
          <div className='flex items-center gap-1.5 mb-2.5'>
            <Trophy className='h-4 w-4 text-amber-500' />
            <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
              Liderazgo Institucional por Dimensión
            </h4>
          </div>
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5'>
            {leaders.map((leader) => {
              const IconComp = DIMENSION_ICONS[leader.dimension_key] || Trophy
              const groupIndex = groups.findIndex((g) => g.id === leader.leader_group_id)
              const palette =
                groupIndex >= 0
                  ? COMPARISON_GROUP_PALETTE[groupIndex % COMPARISON_GROUP_PALETTE.length]
                  : COMPARISON_GROUP_PALETTE[0]

              return (
                <div
                  key={leader.dimension_key}
                  className='flex flex-col justify-between p-3 rounded-xl border border-border/70 bg-card/60 shadow-2xs hover:border-primary/40 transition-colors'
                >
                  <div className='flex items-center justify-between text-muted-foreground mb-1.5'>
                    <span className='text-[11px] font-bold uppercase truncate' title={leader.dimension_label}>
                      {leader.dimension_label.split('(')[1]?.replace(')', '') || leader.dimension_label}
                    </span>
                    <IconComp className='h-3.5 w-3.5 text-primary opacity-80 shrink-0' />
                  </div>
                  <div className='space-y-0.5'>
                    <div className='flex items-center gap-1.5'>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${palette.dot}`} />
                      <span className='text-xs font-extrabold text-foreground truncate' title={leader.leader_group_name}>
                        {leader.leader_acronym}
                      </span>
                    </div>
                    <p className='text-sm font-black font-mono tracking-tight text-foreground'>
                      {leader.value}{' '}
                      <span className='text-[10px] font-normal text-muted-foreground'>
                        {leader.unit}
                      </span>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sección Central: Radar Chart Multidimensional */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-center'>
          {/* Radar Chart */}
          <div className='lg:col-span-8 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-6 shadow-2xs'>
            <div className='flex items-center justify-between mb-2'>
              <div>
                <h4 className='text-sm font-bold text-foreground'>
                  Polígono de Capacidades Comparadas (0 - 100%)
                </h4>
                <p className='text-[11px] text-muted-foreground'>
                  Puntuaciones normalizadas en relación al colectivo líder de cada categoría
                </p>
              </div>
            </div>

            <div className='h-[350px] sm:h-[400px] w-full'>
              <ResponsiveContainer width='100%' height='100%'>
                <RadarChart data={radarChartData} outerRadius='75%'>
                  <PolarGrid stroke='hsl(var(--border))' strokeDasharray='3 3' />
                  <PolarAngleAxis
                    dataKey='short_label'
                    tick={{
                      fill: 'hsl(var(--foreground))',
                      fontSize: 12,
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
                        <span className='text-xs font-semibold text-foreground mr-3'>
                          {grp?.acronym ?? value}
                        </span>
                      )
                    }}
                  />
                  {groups.map((grp, index) => {
                    const palette =
                      COMPARISON_GROUP_PALETTE[index % COMPARISON_GROUP_PALETTE.length]
                    return (
                      <Radar
                        key={grp.id}
                        name={`group_${grp.id}`}
                        dataKey={`group_${grp.id}`}
                        stroke={palette.stroke}
                        fill={palette.fill}
                        fillOpacity={0.25}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: palette.stroke }}
                      />
                    )
                  })}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hallazgos y Conclusiones Diagnósticas */}
          <div className='lg:col-span-4 space-y-4'>
            <div className='p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-3'>
              <div className='flex items-center gap-2'>
                <Sparkles className='h-4 w-4 text-primary' />
                <h4 className='text-sm font-bold text-foreground'>
                  Hallazgos Clave de Benchmarking
                </h4>
              </div>
              <ul className='space-y-2 text-xs text-muted-foreground'>
                {data.insights.slice(0, 5).map((insight, idx) => (
                  <li key={idx} className='flex items-start gap-2'>
                    <CheckCircle2 className='h-3.5 w-3.5 text-primary shrink-0 mt-0.5' />
                    <span className='leading-snug text-foreground/90'>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className='p-4 rounded-2xl border border-border/70 bg-card/40 space-y-2 text-xs'>
              <div className='flex items-center gap-1.5 font-semibold text-foreground'>
                <Info className='h-3.5 w-3.5 text-muted-foreground' />
                <span>Metodología de Normalización</span>
              </div>
              <p className='text-muted-foreground leading-relaxed text-[11px]'>
                El valor 100% corresponde al grupo con el desempeño más alto en el eje analizado.
                Las dimensiones GNC, DTI, ASC y FRH evalúan el volumen de producción categorizada;
                Cohesión evalúa la densidad de coautorías internas, y Productividad evalúa obras por
                investigador.
              </p>
            </div>
          </div>
        </div>

        {/* Matriz Comparativa Lado a Lado */}
        <div className='space-y-3 pt-2'>
          <div className='flex items-center justify-between'>
            <h4 className='text-sm font-bold tracking-tight text-foreground'>
              Matriz de Indicadores Clave Lado a Lado
            </h4>
            <span className='text-xs text-muted-foreground'>
              Valores absolutos y porcentuales por colectivo
            </span>
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
                  {groups.map((grp, index) => {
                    const palette =
                      COMPARISON_GROUP_PALETTE[index % COMPARISON_GROUP_PALETTE.length]
                    return (
                      <th
                        key={grp.id}
                        className='p-3 font-extrabold text-foreground min-w-[130px] border-l border-border/50 text-center'
                      >
                        <div className='flex items-center justify-center gap-1.5'>
                          <span className={`h-2 w-2 rounded-full ${palette.dot}`} />
                          <span>{grp.acronym}</span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className='divide-y divide-border/60'>
                {matrix.map((row, idx) => (
                  <tr
                    key={idx}
                    className='hover:bg-muted/40 transition-colors even:bg-muted/10'
                  >
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
                    {groups.map((grp) => {
                      const val = row.values[grp.id]
                      const isLeader = row.leader_id === grp.id
                      return (
                        <td
                          key={grp.id}
                          className={`p-3 text-center font-mono font-medium border-l border-border/40 ${
                            isLeader
                              ? 'bg-amber-500/10 font-bold text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <div className='flex items-center justify-center gap-1'>
                            <span>
                              {row.indicator === 'Clasificación Minciencias' && typeof val === 'string'
                                ? parseMincienciasClassification(val).badgeText || val
                                : val !== undefined && val !== null
                                  ? val
                                  : '—'}
                            </span>
                            {isLeader && (
                              <Trophy className='h-3 w-3 text-amber-500 shrink-0' />
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
