import {
  Download,
  Copy,
  Sparkles,
  ChevronDown,
  BarChart3,
  Radar as RadarIcon,
  Plus,
  Eye,
  EyeOff,
  X,
} from 'lucide-react'
import type { Group } from '@/lib/types'
import type { GroupComparisonGroupItem } from '@/lib/api'
import { parseMincienciasClassification } from '@/lib/utils'
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  COMPARISON_GROUP_PALETTE,
  type BenchmarkOption,
} from './types'

interface ComparisonHeaderProps {
  viewMode: 'radar' | 'bars'
  onViewModeChange: (mode: 'radar' | 'bars') => void
  onExportCsv: () => void
  onCopySummary: () => void
  onResetLeaders: () => void
  groups: GroupComparisonGroupItem[]
  hiddenGroupIds: number[]
  hoveredGroupId: number | null
  onHoverGroup: (id: number | null) => void
  onToggleHide: (id: number) => void
  onRemoveGroup: (id: number) => void
  showGroupSelector?: boolean
  availableGroups: Group[]
  availableBenchmarks: BenchmarkOption[]
  onAddGroup: (idStr: string) => void
}

export function ComparisonHeader({
  viewMode,
  onViewModeChange,
  onExportCsv,
  onCopySummary,
  onResetLeaders,
  groups,
  hiddenGroupIds,
  hoveredGroupId,
  onHoverGroup,
  onToggleHide,
  onRemoveGroup,
  showGroupSelector = true,
  availableGroups,
  availableBenchmarks,
  onAddGroup,
}: ComparisonHeaderProps) {
  return (
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
              onClick={() => onViewModeChange('radar')}
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
              onClick={() => onViewModeChange('bars')}
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
              <DropdownMenuItem onClick={onExportCsv} className='text-xs cursor-pointer'>
                <Download className='mr-2 h-3.5 w-3.5 text-emerald-600' />
                Descargar Matriz (CSV / Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopySummary} className='text-xs cursor-pointer'>
                <Copy className='mr-2 h-3.5 w-3.5 text-primary' />
                Copiar Resumen para Informe
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onResetLeaders} className='text-xs cursor-pointer'>
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
                onMouseEnter={() => onHoverGroup(grp.id)}
                onMouseLeave={() => onHoverGroup(null)}
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
                    onToggleHide(grp.id)
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
                      onRemoveGroup(grp.id)
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
                        onClick={() => onAddGroup(String(g.id))}
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
                        onClick={() => onAddGroup(String(b.id))}
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
  )
}
