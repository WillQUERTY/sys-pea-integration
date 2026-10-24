import { useState } from 'react'
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  GraduationCap,
  Layers,
  FileCode,
  FolderGit2,
  Network,
  Flame,
  Users,
  BookOpen,
  Info,
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

/**
 * §3.9 normaliza cada indicador contra el MÁXIMO de la población de grupos.
 * Con menos de este número de grupos cargados, la normalización y el
 * percentil no son comparables con los del modelo real (área OCDE): la UI lo
 * advierte en vez de dejar leer un ranking engañoso.
 */
const POBLACION_MINIMA_NORMALIZACION = 10

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

  const cohesionValue =
    data.summary.cohesion_index !== undefined
      ? data.summary.cohesion_index >= 0
        ? `+${data.summary.cohesion_index.toFixed(3)}`
        : data.summary.cohesion_index.toFixed(3)
      : '0.000'

  // Lectura OFICIAL del modelo de medición Minciencias 2024 (§2.2.9 → §3.10):
  // es la única cifra que esta tarjeta muestra. El indicador legacy (suma
  // ponderada de conteos crudos) se eliminó del payload de la API el
  // 2026-10-24: solo queda el cálculo oficial del modelo 2024. La interfaz
  // muestra exclusivamente la lectura oficial y la distingue de los conteos
  // crudos en el panel de desglose ("Entradas" vs "Salidas").
  // Ver docs/plan-integracion-modelo-oficial.md (brechas B1 y B5).
  const oficial = data.modelo_oficial_2024
  const tamanoPoblacion = oficial?.posicion_poblacion.de ?? oficial?.poblacion.length ?? 0
  const poblacionReducida =
    tamanoPoblacion > 0 && tamanoPoblacion < POBLACION_MINIMA_NORMALIZACION

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
                  Modelo Convocatoria 2024
                </Badge>
              </div>
              <CardDescription className='text-xs mt-0.5'>
                Auditoría algorítmica de requisitos de tipología (TOP/A/B), formación doctoral, ventanas diferenciadas (5/7/10 años) y cohesión.
              </CardDescription>
            </div>
          </div>

          <div className='flex items-center gap-2 self-start sm:self-auto shrink-0'>
            <div className='text-left sm:text-right'>
              <div className='text-[10px] text-muted-foreground uppercase font-medium'>Clasificación Oficial</div>
              <div className='text-xs font-bold font-mono text-foreground'>
                Categoría {data.current_classification}
              </div>
              {oficial && (
                <div className='mt-1 space-y-0.5'>
                  <div className='text-[10px] text-muted-foreground uppercase font-medium'>
                    Ind.Grupo — modelo oficial 2024
                  </div>
                  <div className='text-sm font-bold font-mono text-foreground' data-testid='ind-grupo-oficial'>
                    {oficial.ind_grupo.toLocaleString('es-CO', {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}
                    <span className='text-[10px] font-normal text-muted-foreground ml-1'>
                      / {oficial.rango_teorico.toLocaleString('es-CO', { maximumFractionDigits: 0 })} rango teórico
                    </span>
                  </div>
                  <div className='text-[10px] text-muted-foreground' data-testid='posicion-poblacion'>
                    Puesto {oficial.posicion_poblacion.puesto} de {oficial.posicion_poblacion.de} · cierre{' '}
                    {oficial.anio_cierre}
                  </div>
                  {poblacionReducida && (
                    <div
                      className='flex items-start gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400'
                      data-testid='aviso-poblacion'
                    >
                      <AlertCircle className='h-3 w-3 shrink-0 mt-px' />
                      <span>
                        Población medida: {tamanoPoblacion} grupos — la normalización §3.9 es débil
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!oficial && (
                <div className='mt-1 text-[10px] text-muted-foreground' data-testid='oficial-no-disponible'>
                  Lectura oficial no disponible para este grupo
                </div>
              )}
            </div>
            <Badge
              variant='outline'
              className={cn(
                'text-xs px-2.5 py-1 font-bold shadow-xs',
                data.max_qualified_tier === 'A1'
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : data.max_qualified_tier === 'A'
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : data.max_qualified_tier === 'B'
                  ? 'border-blue-500/50 bg-blue-500/15 text-blue-700 dark:text-blue-300'
                  : data.max_qualified_tier === 'C'
                  ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
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

        {/* Pilares Normativos Clave - Modelo 2024 */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
            <span>Requisitos Críticos de Categorización</span>
            <span className='text-[11px] font-normal text-muted-foreground lowercase'>
              criterios eliminatorios de corte
            </span>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
            {/* 1. Cohesión Interna */}
            <div className='rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2 relative overflow-hidden'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5 text-xs font-semibold text-foreground'>
                  <Network className='h-4 w-4 text-primary' />
                  <span>Índice de Cohesión (I<sub>C</sub>)</span>
                </div>
                {data.summary.cohesion_met ? (
                  <Badge variant='outline' className='text-[10px] font-mono border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'>
                    I<sub>C</sub> &gt; 0 ✓
                  </Badge>
                ) : (
                  <Badge variant='outline' className='text-[10px] font-mono border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'>
                    I<sub>C</sub> ≤ 0 ✗
                  </Badge>
                )}
              </div>
              <div className='flex items-baseline gap-2'>
                <div className='text-2xl font-bold font-mono tracking-tight text-foreground'>
                  {cohesionValue}
                </div>
                <span className='text-[11px] text-muted-foreground'>
                  {data.summary.coauthored_products_count ?? 0} prods. coautoría
                </span>
              </div>
              <p className='text-[11px] text-muted-foreground leading-snug'>
                Colaboración interna verificada entre integrantes del grupo. Requisito obligatorio &gt; 0.
              </p>
            </div>

            {/* 2. Productos TOP */}
            <div className='rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2 relative overflow-hidden'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5 text-xs font-semibold text-foreground'>
                  <Flame className='h-4 w-4 text-amber-500' />
                  <span>Productos TOP</span>
                </div>
                {(data.summary.top_count ?? 0) > 0 ? (
                  <Badge variant='outline' className='text-[10px] font-mono border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'>
                    Cumple A1 (≥1)
                  </Badge>
                ) : (
                  <Badge variant='outline' className='text-[10px] font-mono border-muted-foreground/30 text-muted-foreground'>
                    0 para A1
                  </Badge>
                )}
              </div>
              <div className='flex items-baseline gap-2'>
                <div className='text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400'>
                  {data.summary.top_count ?? 0}
                </div>
                <span className='text-[11px] text-muted-foreground'>
                  en ventana 7-10 años
                </span>
              </div>
              <p className='text-[11px] text-muted-foreground leading-snug'>
                Patentes, variedades o artículos A1. Indispensable para alcanzar la Categoría A1.
              </p>
            </div>

            {/* 3. Formación Doctoral (FRH Tipo A) */}
            <div className='rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2 relative overflow-hidden'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5 text-xs font-semibold text-foreground'>
                  <GraduationCap className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />
                  <span>FRH Tipo A (Doctoral)</span>
                </div>
                {(data.summary.frh_a_count ?? 0) > 0 ? (
                  <Badge variant='outline' className='text-[10px] font-mono border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'>
                    A1 / A Apto
                  </Badge>
                ) : (
                  <Badge variant='outline' className='text-[10px] font-mono border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'>
                    Bloquea A1 y A
                  </Badge>
                )}
              </div>
              <div className='flex items-baseline gap-2'>
                <div className='text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400'>
                  {data.summary.frh_a_count ?? 0}
                </div>
                <span className='text-[11px] text-muted-foreground'>
                  tesis doctorales
                </span>
              </div>
              <p className='text-[11px] text-muted-foreground leading-snug'>
                Tesis de doctorado concluidas. Requisito estricto para categorías A y A1.
              </p>
            </div>

            {/* 4. Capital Humano y Trayectoria */}
            <div className='rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2 relative overflow-hidden'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5 text-xs font-semibold text-foreground'>
                  <Users className='h-4 w-4 text-primary' />
                  <span>Talento y Trayectoria</span>
                </div>
                <Badge variant='outline' className='text-[10px] font-mono border-primary/30 text-primary'>
                  {data.summary.years_active} años
                </Badge>
              </div>
              <div className='flex items-baseline gap-2'>
                <div className='text-2xl font-bold font-mono tracking-tight text-foreground'>
                  {data.summary.phd_count} <span className='text-sm font-normal text-muted-foreground'>Dr.</span> / {data.summary.masters_count} <span className='text-sm font-normal text-muted-foreground'>Ms.</span>
                </div>
              </div>
              <p className='text-[11px] text-muted-foreground leading-snug'>
                {data.summary.total_members} integrantes totales. Fundado en {data.summary.creation_year || '—'}.
              </p>
            </div>
          </div>
        </div>

        {/* Producción por Ventana Normativa Diferenciada */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
            <span>Producción en Ventanas Diferenciadas (5, 7 y 10 años)</span>
            <span className='text-[11px] font-normal text-muted-foreground lowercase'>
              {data.summary.products_in_window} de {data.summary.total_products} históricas
            </span>
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
            <div className='rounded-lg border border-border/50 bg-muted/20 p-2.5 text-center'>
              <div className='flex items-center justify-center gap-1 text-[11px] text-muted-foreground'>
                <Layers className='h-3 w-3' /> Total Ventana
              </div>
              <div className='text-base font-bold font-mono mt-1'>{data.summary.products_in_window}</div>
              <div className='text-[10px] text-muted-foreground mt-0.5'>5, 7 y 10 años</div>
            </div>

            <div className='rounded-lg border border-border/50 bg-muted/20 p-2.5 text-center'>
              <div className='flex items-center justify-center gap-1 text-[11px] text-muted-foreground'>
                <BookOpen className='h-3 w-3' /> Tipo A (Calidad)
              </div>
              <div className='text-base font-bold font-mono mt-1 text-primary'>
                {data.summary.type_a_count ?? 0}
              </div>
              <div className='text-[10px] text-muted-foreground mt-0.5'>Art. A1-B / Libros</div>
            </div>

            <div className='rounded-lg border border-border/50 bg-muted/20 p-2.5 text-center'>
              <div className='flex items-center justify-center gap-1 text-[11px] text-muted-foreground'>
                <Layers className='h-3 w-3' /> Tipo B
              </div>
              <div className='text-base font-bold font-mono mt-1'>
                {data.summary.type_b_count ?? 0}
              </div>
              <div className='text-[10px] text-muted-foreground mt-0.5'>Art. C-D / Capítulos</div>
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
              <div className='text-[10px] text-muted-foreground mt-0.5'>
                {data.summary.frh_a_count ?? 0} Dr. + {data.summary.frh_b_count ?? 0} Ms.
              </div>
            </div>

            <div className='rounded-lg border border-border/50 bg-muted/20 p-2.5 text-center'>
              <div className='flex items-center justify-center gap-1 text-[11px] text-muted-foreground'>
                <FolderGit2 className='h-3 w-3' /> Proyectos
              </div>
              <div className='text-base font-bold font-mono mt-1'>{data.summary.projects_count}</div>
              <div className='text-[10px] text-muted-foreground mt-0.5'>I+D en curso</div>
            </div>
          </div>
        </div>

        {/* Selector de Nivel a Inspeccionar */}
        <div className='space-y-3'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-1'>
            <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Checklist de Requisitos por Nivel:
            </span>
            <span className='text-xs text-muted-foreground'>
              Seleccione una categoría para auditar
            </span>
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2'>
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
                    'h-10 justify-between px-3 text-xs font-semibold rounded-lg last:col-span-2 sm:last:col-span-1 lg:last:col-span-1',
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
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3'>
              <div>
                <div className='flex items-center gap-2 flex-wrap'>
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
                <Badge variant='secondary' className='text-[10px] self-start sm:self-auto shrink-0 font-medium'>
                  Nivel Alcanzado
                </Badge>
              )}
            </div>

            {/* Lista de Requisitos */}
            <div className='divide-y divide-border/40'>
              {activeTier.requirements.map((req) => (
                <div
                  key={req.id}
                  className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 py-3 text-xs'
                >
                  <div className='flex items-start sm:items-center gap-2.5 min-w-0'>
                    {req.met ? (
                      <CheckCircle2 className='h-4 w-4 text-emerald-500 shrink-0 mt-0.5 sm:mt-0' />
                    ) : (
                      <AlertCircle className='h-4 w-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0' />
                    )}
                    <div className='min-w-0'>
                      <div className='font-semibold text-foreground leading-tight'>{req.label}</div>
                      <div className='text-[11px] text-muted-foreground line-clamp-2 sm:truncate mt-0.5 sm:mt-0'>
                        {req.description}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center justify-between sm:justify-end gap-2.5 pl-6 sm:pl-0 shrink-0'>
                    <div className='text-[11px]'>
                      <span className='text-muted-foreground'>Requerido: </span>
                      <span className='font-mono font-medium'>{req.target} {req.unit}</span>
                    </div>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-[10px] font-mono font-bold px-2 py-0.5 shrink-0',
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

        {/* Nota Metodológica Minciencias 2024 */}
        <div className='rounded-lg border border-border/40 bg-muted/10 p-3 text-xs text-muted-foreground space-y-1.5'>
          <div className='flex items-center gap-1.5 font-semibold text-foreground text-[11px]'>
            <Info className='h-3.5 w-3.5 text-primary' />
            <span>Reglas del Modelo de Medición Minciencias 2024 (Anexo 1):</span>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] leading-relaxed'>
            <div>
              <strong>• Ventanas diferenciadas:</strong> 10 años para patentes, variedades vegetales y creación; 7 años para artículos en revistas indexadas (A1-C) y libros de investigación; 5 años para software, prototipos, FRH, ASC y DPC.
            </div>
            <div>
              <strong>• Cohesión y Tipologías:</strong> El Índice de Cohesión (I<sub>C</sub> = Autores/Productos - 1) exige colaboración interna efectiva (I<sub>C</sub> &gt; 0). Las categorías A y A1 exigen obligatoriamente dirección de tesis doctoral (FRH Tipo A), y A1 requiere al menos 1 producto TOP.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
