import { Building2, FileDown, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ActionTooltip } from '@/components/action-tooltip'
import { parseMincienciasClassification } from '@/lib/utils'
import type { Group } from '@/lib/types'

export interface GroupProfileHeaderProps {
  group: Group
  isAdmin?: boolean
  onOpenExport: () => void
  onSave?: () => void
  isSaving?: boolean
}

export function GroupProfileHeader({
  group,
  isAdmin = false,
  onOpenExport,
  onSave,
  isSaving = false,
}: GroupProfileHeaderProps) {
  const hue = ((group.name?.charCodeAt(0) ?? 0) * 45) % 360
  const initial = group.name?.[0]?.toUpperCase() ?? 'G'

  return (
    <div className='relative mb-8 rounded-b-none sm:rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm'>
      {/* Cover Banner */}
      <div className='h-32 bg-gradient-to-r from-primary/15 via-background to-secondary/15 relative'>
        <div className='absolute inset-0 bg-radial from-transparent to-card/50' />
      </div>

      <div className='px-6 pb-6 pt-0 relative'>
        <div className='flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12'>
          {/* Avatar */}
          <div
            className='h-24 w-24 rounded-2xl border-4 border-card flex items-center justify-center text-4xl font-bold text-white shadow-lg shrink-0'
            style={{ background: `hsl(${hue} 60% 50%)` }}
          >
            {initial}
          </div>

          {/* Group Info */}
          <div className='flex-1 pb-1'>
            <h1 className='text-2xl font-bold line-clamp-1'>{group.name}</h1>
            <div className='flex flex-wrap items-center gap-2 mt-2'>
              {group.classification && (() => {
                const classInfo = parseMincienciasClassification(group.classification)
                return (
                  <ActionTooltip label={group.classification}>
                    <Badge
                      variant='outline'
                      className={`text-xs font-bold px-2.5 py-0.5 cursor-default ${classInfo.badgeVariant}`}
                    >
                      {classInfo.badgeText} · {classInfo.tier}
                    </Badge>
                  </ActionTooltip>
                )
              })()}
              {group.institution && (
                <span className='text-sm text-muted-foreground font-medium flex items-center gap-1'>
                  <Building2 className='h-3 w-3' />
                  {group.institution}
                </span>
              )}
              <Badge variant='outline' className='text-xs font-mono text-muted-foreground ml-auto sm:ml-2'>
                {group.external_code}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='pb-1 w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5'>
            <ActionTooltip label='Descargar Dossier Ejecutivo PDF, Informe GrupLAC o matrices CSV/Excel'>
              <Button
                variant='outline'
                onClick={onOpenExport}
                className='w-full sm:w-auto rounded-xl shadow-sm border-primary/20 hover:border-primary/40 bg-card/60 backdrop-blur-sm'
              >
                <FileDown className='mr-2 h-4 w-4 text-primary' />
                Exportar Informes y Datos
              </Button>
            </ActionTooltip>
            {isAdmin && onSave && (
              <Button
                onClick={onSave}
                disabled={isSaving}
                className='w-full sm:w-auto rounded-xl shadow-md'
              >
                <Save className='mr-2 h-4 w-4' />
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
