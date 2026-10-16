import { Download, Copy, Trophy } from 'lucide-react'
import type {
  ComparisonMatrixRow,
  GroupComparisonGroupItem,
} from '@/lib/api'
import { parseMincienciasClassification } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { COMPARISON_GROUP_PALETTE } from './types'

interface ComparisonMatrixTabProps {
  matrix: ComparisonMatrixRow[]
  groups: GroupComparisonGroupItem[]
  visibleGroups: GroupComparisonGroupItem[]
  hoveredGroupId: number | null
  onHoverGroup: (id: number | null) => void
  onExportCsv: () => void
  onCopySummary: () => void
}

export function ComparisonMatrixTab({
  matrix,
  groups,
  visibleGroups,
  hoveredGroupId,
  onHoverGroup,
  onExportCsv,
  onCopySummary,
}: ComparisonMatrixTabProps) {
  return (
    <div className='space-y-3'>
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
            onClick={onExportCsv}
            className='h-7 text-xs font-medium'
          >
            <Download className='mr-1.5 h-3 w-3 text-emerald-600' />
            Descargar CSV
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={onCopySummary}
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
                    onMouseEnter={() => onHoverGroup(grp.id)}
                    onMouseLeave={() => onHoverGroup(null)}
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
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
