import { useState } from 'react'
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Clock,
  GraduationCap,
  Layers,
  FileCode,
  FolderGit2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MincienciasGroupDiagnosis } from '@/lib/api'

export interface MincienciasDiagnosisCardProps {
  data?: MincienciasGroupDiagnosis
  className?: string
}

export function MincienciasDiagnosisCard({ data, className }: MincienciasDiagnosisCardProps) {
  const [selectedTier, setSelectedTier] = useState<string>('A')

  if (!data) return null

  // Seleccionar por defecto la siguiente categoría o la máxima calificada
  const activeTier =
    data.tiers.find((t) => t.tier === selectedTier) ||
    data.tiers.find((t) => t.tier === (data.next_tier || data.max_qualified_tier)) ||
    data.tiers[0]

  const isCurrentMax = activeTier?.tier === data.max_qualified_tier
  const isAheadOfOfficial =
    data.max_qualified_tier !== 'Sin clasificar' &&
    data.current_classification !== 'Sin clasificar' &&
    data.max_qualified_tier !== data.current_classification

  return (
    <Card className={cn('border-border/60 shadow-xs overflow-hidden', className)}>
      <CardHeader className='pb-4 border-b border-border/40 bg-muted/20'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div className='flex items-start gap-3'>
            <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5'>
              <ShieldCheck className='h-5 w-5' />
            </div>
            <div>
              <div className='flex items-center gap-2 flex-wrap'>
                <CardTitle className='text-base sm:text-lg font-bold tracking-tight'>
                  Diagnóstico y Semáforo de Categorización Minciencias
                </CardTitle>
                <Badge variant='outline' className='text-[10px] uppercase font-semibold border-primary/30 text-primary'>
                  Modelo 2024
                </Badge>
              </div>
              <CardDescription className='text-xs mt-0.5'>
                Evaluación de requisitos de tipología, integrantes con posgrado y cálculo de brechas para ascenso.
              </CardDescription>
            </div>
          </div>

          <div className='flex items-center gap-2 self-start sm:self-auto shrink-0'>
            <div className='text-right'>
              <div className='text-[10px] text-muted-foreground uppercase font-medium'>Clasificación Oficial</div>
              <div className='text-xs font-bold font-mono text-foreground'>
                Categoría {data.current_classification}
              </div>
            </div>
            <Badge
              variant='outline'
              className={cn(
                'text-xs px-2.5 py-1 font-bold',
                data.max_qualified_tier === 'A1'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : data.max_qualified_tier === 'A'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-primary/40 bg-primary/10 text-primary'
              )}
            >
              Califica: {data.max_qualified_tier}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className='pt-5 space-y-6'>
        {/* Banner de Brecha y Estado Estratégico */}
        {isAheadOfOfficial ? (
          <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4'>
            <div className='flex items-start gap-3'>
              <Sparkles className='h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5' />
              <div className='space-y-1 text-xs'>
                <div className='font-bold text-emerald-800 dark:text-emerald-200 text-sm'>
                  ¡Colectivo apto para ascenso de categoría!
                </div>
                <p className='text-emerald-700 dark:text-emerald-300 leading-relaxed'>
                  El grupo está registrado oficialmente en <strong>Categoría {data.current_classification}</strong>, pero
                  actualmente supera todos los requisitos mínimos para ser categorizado como{' '}
                  <strong className='underline decoration-emerald-500'>Categoría {data.max_qualified_tier}</strong> en la
                  próxima convocatoria Minciencias.
                </p>
              </div>
            </div>
          </div>
        ) : data.next_tier ? (
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3'>
            <div className='flex items-start justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <TrendingUp className='h-4 w-4 text-amber-600 dark:text-amber-400' />
                <span className='text-xs font-bold text-foreground'>
                  Objetivo Inmediato: Ascenso a Categoría {data.next_tier}
                </span>
              </div>
              <Badge variant='outline' className='text-[10px] border-amber-500/40 text-amber-600 font-mono'>
                {data.next_tier_progress}% completado
              </Badge>
            </div>

            <div className='h-2 w-full overflow-hidden rounded-full bg-muted/60'>
              <div
                className='h-full rounded-full bg-amber-500 transition-all duration-500'
                style={{ width: `${data.next_tier_progress}%` }}
              />
            </div>

            {data.next_tier_gap && data.next_tier_gap.length > 0 && (
              <div className='space-y-1 text-xs'>
                <div className='font-semibold text-muted-foreground text-[11px] uppercase tracking-wider'>
                  Brecha por cerrar:
                </div>
                <div className='flex flex-wrap gap-1.5'>
                  {data.next_tier_gap.map((gap, i) => (
                    <Badge
                      key={i}
                      variant='outline'
                      className='text-[11px] font-normal border-amber-500/30 bg-background/80 text-foreground'
                    >
                      • {gap}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Resumen de Métricas Quinquenales Base */}
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
          <div className='rounded-lg border border-border/50 bg-muted/20 p-2.5 text-center'>
            <div className='flex items-center justify-center gap-1 text-[11px] text-muted-foreground'>
              <Clock className='h-3 w-3' /> Antigüedad
            </div>
            <div className='text-base font-bold font-mono mt-1'>{data.summary.years_active} años</div>
            <div className='text-[10px] text-muted-foreground mt-0.5'>Fundado {data.summary.creation_year || '—'}</div>
          </div>

          <div className='rounded-lg border border-border/50 bg-muted/20 p-2.5 text-center'>
            <div className='flex items-center justify-center gap-1 text-[11px] text-muted-foreground'>
              <GraduationCap className='h-3 w-3' /> Doctores
            </div>
            <div className='text-base font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400'>
              {data.summary.phd_count}
            </div>
            <div className='text-[10px] text-muted-foreground mt-0.5'>{data.summary.masters_count} con Maestría</div>
          </div>

          <div className='rounded-lg border border-border/50 bg-muted/20 p-2.5 text-center'>
            <div className='flex items-center justify-center gap-1 text-[11px] text-muted-foreground'>
              <Layers className='h-3 w-3' /> Obras Ventana
            </div>
            <div className='text-base font-bold font-mono mt-1'>{data.summary.products_in_window}</div>
            <div className='text-[10px] text-muted-foreground mt-0.5'>Últimos 5 años</div>
          </div>

          <div className='rounded-lg border border-border/50 bg-muted/20 p-2.5 text-center'>
            <div className='flex items-center justify-center gap-1 text-[11px] text-muted-foreground'>
              <FileCode className='h-3 w-3' /> DTI (Tecnología)
            </div>
            <div className='text-base font-bold font-mono mt-1 text-primary'>{data.summary.dti_count}</div>
            <div className='text-[10px] text-muted-foreground mt-0.5'>Software / Patentes</div>
          </div>

          <div className='rounded-lg border border-border/50 bg-muted/20 p-2.5 text-center'>
            <div className='flex items-center justify-center gap-1 text-[11px] text-muted-foreground'>
              <Award className='h-3 w-3' /> FRH (Formación)
            </div>
            <div className='text-base font-bold font-mono mt-1 text-violet-600 dark:text-violet-400'>
              {data.summary.frh_count}
            </div>
            <div className='text-[10px] text-muted-foreground mt-0.5'>Tesis dirigidas</div>
          </div>

          <div className='rounded-lg border border-border/50 bg-muted/20 p-2.5 text-center'>
            <div className='flex items-center justify-center gap-1 text-[11px] text-muted-foreground'>
              <FolderGit2 className='h-3 w-3' /> Proyectos
            </div>
            <div className='text-base font-bold font-mono mt-1'>{data.summary.projects_count}</div>
            <div className='text-[10px] text-muted-foreground mt-0.5'>I+D en curso</div>
          </div>
        </div>

        {/* Selector de Nivel a Inspeccionar */}
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Checklist de Requisitos por Nivel:
            </span>
            <span className='text-xs text-muted-foreground'>
              Seleccione una categoría para auditar
            </span>
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-5 gap-2'>
            {data.tiers.map((tier) => {
              const isSelected = tier.tier === activeTier?.tier

              return (
                <Button
                  key={tier.tier}
                  type='button'
                  variant={isSelected ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setSelectedTier(tier.tier)}
                  className={cn(
                    'h-10 justify-between px-3 text-xs font-semibold rounded-lg',
                    isSelected
                      ? 'shadow-xs'
                      : tier.qualifies
                      ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10'
                      : 'border-border/70 text-muted-foreground hover:bg-muted'
                  )}
                >
                  <span>{tier.tier}</span>
                  {tier.qualifies ? (
                    <CheckCircle2 className='h-3.5 w-3.5 text-emerald-500 shrink-0' />
                  ) : (
                    <span className='text-[10px] opacity-75 font-mono'>{tier.completion_percentage}%</span>
                  )}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Detalle del Nivel Activo */}
        {activeTier && (
          <div className='rounded-xl border border-border/60 bg-card p-4 space-y-4'>
            <div className='flex items-center justify-between gap-2 border-b border-border/40 pb-3'>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-sm text-foreground'>{activeTier.title}</span>
                  {activeTier.qualifies ? (
                    <Badge variant='outline' className='text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'>
                      Cumple al 100%
                    </Badge>
                  ) : (
                    <Badge variant='outline' className='text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'>
                      {activeTier.completion_percentage}% cumplido
                    </Badge>
                  )}
                </div>
                <p className='text-xs text-muted-foreground mt-0.5'>{activeTier.description}</p>
              </div>

              {isCurrentMax && (
                <Badge variant='secondary' className='text-[10px] shrink-0 font-medium'>
                  Nivel Alcanzado
                </Badge>
              )}
            </div>

            {/* Lista de Requisitos */}
            <div className='divide-y divide-border/40'>
              {activeTier.requirements.map((req) => (
                <div key={req.id} className='flex items-center justify-between gap-3 py-2.5 text-xs'>
                  <div className='flex items-center gap-2.5 min-w-0'>
                    {req.met ? (
                      <CheckCircle2 className='h-4 w-4 text-emerald-500 shrink-0' />
                    ) : (
                      <AlertCircle className='h-4 w-4 text-amber-500 shrink-0' />
                    )}
                    <div className='min-w-0'>
                      <div className='font-semibold text-foreground truncate'>{req.label}</div>
                      <div className='text-[11px] text-muted-foreground truncate'>{req.description}</div>
                    </div>
                  </div>

                  <div className='text-right shrink-0 flex items-center gap-3'>
                    <div className='text-[11px]'>
                      <span className='text-muted-foreground'>Requerido: </span>
                      <span className='font-mono font-medium'>{req.target} {req.unit}</span>
                    </div>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-[10px] font-mono font-bold px-2 py-0.5',
                        req.met
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      )}
                    >
                      Actual: {req.current} {req.unit}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
