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
import type {
  GroupComparisonGroupItem,
  GroupRadarChartRow,
} from '@/lib/api'
import { COMPARISON_GROUP_PALETTE } from './types'
import { RadarCustomTooltip } from './radar-tooltip'

interface RadarVisualizerProps {
  viewMode: 'radar' | 'bars'
  radarChartData: GroupRadarChartRow[]
  groups: GroupComparisonGroupItem[]
  visibleGroups: GroupComparisonGroupItem[]
  hoveredGroupId: number | null
  onHoverGroup: (id: number | null) => void
}

export function RadarVisualizer({
  viewMode,
  radarChartData,
  groups,
  visibleGroups,
  hoveredGroupId,
  onHoverGroup,
}: RadarVisualizerProps) {
  return (
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
              <Tooltip
                content={<RadarCustomTooltip />}
                wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: 16 }}
                formatter={(value) => {
                  const grp = groups.find((g) => `group_${g.id}` === value)
                  return (
                    <span
                      onMouseEnter={() => grp && onHoverGroup(grp.id)}
                      onMouseLeave={() => onHoverGroup(null)}
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
              <Tooltip
                content={<RadarCustomTooltip />}
                wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
              />
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
  )
}
