import { useState, type ReactNode } from 'react'
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
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

type Tono = 'ok' | 'warn' | 'amber' | 'neutral' | 'primary'

const TONO_CHIP: Record<Tono, string> = {
  ok: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  neutral: 'border-muted-foreground/30 text-muted-foreground',
  primary: 'border-primary/30 text-primary',
}

/** Acento lateral de cada requisito según su estado: lectura inmediata sin leer el chip. */
const TONO_ACENTO: Record<Tono, string> = {
  ok: 'before:bg-emerald-500',
  warn: 'before:bg-amber-500',
  amber: 'before:bg-amber-500',
  neutral: 'before:bg-border',
  primary: 'before:bg-primary',
}

interface RequisitoTileProps {
  icon: ReactNode
  label: ReactNode
  chip: ReactNode
  tono: Tono
  value: ReactNode
  caption?: ReactNode
  description: ReactNode
}

/** Requisito crítico: etiqueta + estado, cifra grande y descripción corta. */
function RequisitoTile({ icon, label, chip, tono, value, caption, description }: RequisitoTileProps) {
  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-border/60 bg-muted/20 p-3.5 pl-4',
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
        TONO_ACENTO[tono]
      )}
    >
      <div className='flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5'>
        <div className='flex min-w-0 items-center gap-1.5 text-xs font-semibold text-foreground'>
          {icon}
          <span className='min-w-0'>{label}</span>
        </div>
        <Badge variant='outline' className={cn('text-[11px] font-mono', TONO_CHIP[tono])}>
          {chip}
        </Badge>
      </div>
      <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
        {value}
        {caption && <span className='text-xs text-muted-foreground'>{caption}</span>}
      </div>
      <p className='text-xs leading-snug text-muted-foreground'>{description}</p>
    </div>
  )
}

interface VentanaStatProps {
  icon: ReactNode
  label: string
  value: ReactNode
  caption: ReactNode
  valueClassName?: string
}

/** Cifra de una ventana normativa: etiqueta arriba, valor al centro, aclaración abajo. */
function VentanaStat({ icon, label, value, caption, valueClassName }: VentanaStatProps) {
  return (
    <div className='flex min-w-0 flex-col items-center gap-0.5 rounded-xl border border-border/50 bg-muted/20 px-2 py-3 text-center'>
      <div className='flex items-center justify-center gap-1 text-xs text-muted-foreground'>
        {icon}
        <span>{label}</span>
      </div>
      <div className={cn('font-mono text-xl font-bold leading-tight', valueClassName)}>{value}</div>
      <div className='text-[11px] leading-tight text-muted-foreground'>{caption}</div>
    </div>
  )
}

/** Progreso numérico de un requisito (solo cuando actual y meta son numéricos). */
function progresoRequisito(current: number | string, target: number | string): number | null {
  const c = typeof current === 'number' ? current : Number(current)
  const t = typeof target === 'number' ? target : Number(target)
  if (!Number.isFinite(c) || !Number.isFinite(t) || t <= 0) return null
  return Math.max(0, Math.min(100, (c / t) * 100))
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
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='flex min-w-0 items-start gap-3'>
            <div className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <ShieldCheck className='h-5 w-5' />
            </div>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <CardTitle className='text-base sm:text-lg font-bold tracking-tight'>
                  Diagnóstico y Semáforo de Categorización Minciencias
                </CardTitle>
                <Badge variant='outline' className='text-[11px] uppercase font-semibold border-primary/30 text-primary'>
                  Modelo Convocatoria 2024
                </Badge>
              </div>
              <CardDescription className='mt-1 text-xs leading-relaxed'>
                Auditoría algorítmica de requisitos de tipología (TOP/A/B), formación doctoral, ventanas diferenciadas (5/7/10 años) y cohesión.
              </CardDescription>
            </div>
          </div>

          {/* Ficha de lectura: clasificación vigente, lo que califica hoy y el indicador oficial */}
          <div className='w-full shrink-0 rounded-xl border border-border/60 bg-card p-3 shadow-xs lg:w-auto lg:min-w-[270px]'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <div className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                  Clasificación Oficial
                </div>
                <div className='font-mono text-sm font-bold text-foreground'>
                  Categoría {data.current_classification}
                </div>
              </div>
              <Badge
                variant='outline'
                className={cn(
                  'shrink-0 px-2.5 py-1 text-xs font-bold shadow-xs',
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

            {oficial && (
              <div className='mt-2.5 space-y-1 border-t border-border/50 pt-2.5'>
                <div className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                  Ind.Grupo — modelo oficial 2024
                </div>
                <div className='font-mono text-lg font-bold leading-none text-foreground' data-testid='ind-grupo-oficial'>
                  {oficial.ind_grupo.toLocaleString('es-CO', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}
                  <span className='ml-1.5 text-[11px] font-normal text-muted-foreground'>
                    / {oficial.rango_teorico.toLocaleString('es-CO', { maximumFractionDigits: 0 })} rango teórico
                  </span>
                </div>
                <div className='text-xs text-muted-foreground' data-testid='posicion-poblacion'>
                  Puesto {oficial.posicion_poblacion.puesto} de {oficial.posicion_poblacion.de} · cierre{' '}
                  {oficial.anio_cierre}
                </div>
                {poblacionReducida && (
                  <div
                    className='flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300'
                    data-testid='aviso-poblacion'
                  >
                    <AlertCircle className='mt-px h-3.5 w-3.5 shrink-0' />
                    <span>
                      Población medida: {tamanoPoblacion} grupos — la normalización §3.9 es débil
                    </span>
                  </div>
                )}
              </div>
            )}

            {!oficial && (
              <div className='mt-2 text-xs text-muted-foreground' data-testid='oficial-no-disponible'>
                Lectura oficial no disponible para este grupo
              </div>
            )}
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
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <TrendingUp className='h-4 w-4 text-amber-600 dark:text-amber-400' />
                <span className='text-sm font-bold text-foreground'>
                  Objetivo Inmediato: Ascenso a Categoría {data.next_tier}
                </span>
              </div>
              <Badge variant='outline' className='text-xs border-amber-500/40 text-amber-600 font-mono'>
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
              <div className='space-y-1.5'>
                <div className='font-semibold text-muted-foreground text-xs uppercase tracking-wider'>
                  Brecha por cerrar
                </div>
                <div className='flex flex-wrap gap-1.5'>
                  {data.next_tier_gap.map((gap, i) => (
                    <Badge
                      key={i}
                      variant='outline'
                      className='h-auto whitespace-normal text-left text-xs font-normal border-amber-500/30 bg-background/80 text-foreground'
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
        <section className='space-y-2.5'>
          <div className='flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between'>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Requisitos Críticos de Categorización
            </h4>
            <span className='text-xs text-muted-foreground'>criterios eliminatorios de corte</span>
          </div>

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            {/* 1. Cohesión Interna */}
            <RequisitoTile
              icon={<Network className='h-4 w-4 shrink-0 text-primary' />}
              label={<>Índice de Cohesión (I<sub>C</sub>)</>}
              tono={data.summary.cohesion_met ? 'ok' : 'warn'}
              chip={data.summary.cohesion_met ? <>I<sub>C</sub> &gt; 0 ✓</> : <>I<sub>C</sub> ≤ 0 ✗</>}
              value={
                <span className='font-mono text-2xl font-bold tracking-tight text-foreground'>
                  {cohesionValue}
                </span>
              }
              caption={`${data.summary.coauthored_products_count ?? 0} prods. coautoría`}
              description={
                <>Colaboración interna verificada entre integrantes del grupo. Requisito obligatorio &gt; 0.</>
              }
            />

            {/* 2. Productos TOP */}
            <RequisitoTile
              icon={<Flame className='h-4 w-4 shrink-0 text-amber-500' />}
              label='Productos TOP'
              tono={(data.summary.top_count ?? 0) > 0 ? 'amber' : 'neutral'}
              chip={(data.summary.top_count ?? 0) > 0 ? 'Cumple A1 (≥1)' : '0 para A1'}
              value={
                <span className='font-mono text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400'>
                  {data.summary.top_count ?? 0}
                </span>
              }
              caption='en ventana 7-10 años'
              description='Patentes, variedades o artículos A1. Indispensable para alcanzar la Categoría A1.'
            />

            {/* 3. Formación Doctoral (FRH Tipo A) */}
            <RequisitoTile
              icon={<GraduationCap className='h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400' />}
              label='FRH Tipo A (Doctoral)'
              tono={(data.summary.frh_a_count ?? 0) > 0 ? 'ok' : 'warn'}
              chip={(data.summary.frh_a_count ?? 0) > 0 ? 'A1 / A Apto' : 'Bloquea A1 y A'}
              value={
                <span className='font-mono text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400'>
                  {data.summary.frh_a_count ?? 0}
                </span>
              }
              caption='tesis doctorales'
              description='Tesis de doctorado concluidas. Requisito estricto para categorías A y A1.'
            />

            {/* 4. Capital Humano y Trayectoria */}
            <RequisitoTile
              icon={<Users className='h-4 w-4 shrink-0 text-primary' />}
              label='Talento y Trayectoria'
              tono='primary'
              chip={`${data.summary.years_active} años`}
              value={
                <span className='font-mono text-2xl font-bold tracking-tight text-foreground'>
                  {data.summary.phd_count} <span className='text-sm font-normal text-muted-foreground'>Dr.</span> /{' '}
                  {data.summary.masters_count} <span className='text-sm font-normal text-muted-foreground'>Ms.</span>
                </span>
              }
              description={
                <>
                  {data.summary.total_members} integrantes totales. Fundado en {data.summary.creation_year || '—'}.
                </>
              }
            />
          </div>
        </section>

        {/* Producción por Ventana Normativa Diferenciada */}
        <section className='space-y-2.5'>
          <div className='flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between'>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Producción en Ventanas Diferenciadas (5, 7 y 10 años)
            </h4>
            <span className='text-xs text-muted-foreground'>
              {data.summary.products_in_window} de {data.summary.total_products} históricas
            </span>
          </div>

          <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6'>
            <VentanaStat
              icon={<Layers className='h-3.5 w-3.5' />}
              label='Total Ventana'
              value={data.summary.products_in_window}
              caption='5, 7 y 10 años'
            />
            <VentanaStat
              icon={<BookOpen className='h-3.5 w-3.5' />}
              label='Tipo A (Calidad)'
              value={data.summary.type_a_count ?? 0}
              valueClassName='text-primary'
              caption='Art. A1-B / Libros'
            />
            <VentanaStat
              icon={<Layers className='h-3.5 w-3.5' />}
              label='Tipo B'
              value={data.summary.type_b_count ?? 0}
              caption='Art. C-D / Capítulos'
            />
            <VentanaStat
              icon={<FileCode className='h-3.5 w-3.5' />}
              label='DTI (Tecnología)'
              value={data.summary.dti_count}
              valueClassName='text-primary'
              caption='Software / Patentes'
            />
            <VentanaStat
              icon={<Award className='h-3.5 w-3.5' />}
              label='FRH (Formación)'
              value={data.summary.frh_count}
              valueClassName='text-violet-600 dark:text-violet-400'
              caption={`${data.summary.frh_a_count ?? 0} Dr. + ${data.summary.frh_b_count ?? 0} Ms.`}
            />
            <VentanaStat
              icon={<FolderGit2 className='h-3.5 w-3.5' />}
              label='Proyectos'
              value={data.summary.projects_count}
              caption='I+D en curso'
            />
          </div>
        </section>

        {/* Selector de Nivel a Inspeccionar */}
        <section className='space-y-3'>
          <div className='flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between'>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Checklist de Requisitos por Nivel
            </h4>
            <span className='text-xs text-muted-foreground'>Seleccione una categoría para auditar</span>
          </div>

          {/* En móvil se desplaza horizontalmente; desde sm reparte el ancho en partes iguales */}
          <div className='-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            <div className='flex min-w-max gap-2 sm:min-w-0'>
              {data.tiers.map((tier) => {
                const isSelected = tier.tier === activeTier?.tier

                return (
                  <button
                    key={tier.tier}
                    type='button'
                    aria-pressed={isSelected}
                    onClick={() => setSelectedTier(tier.tier)}
                    className={cn(
                      'flex min-h-12 min-w-[5.5rem] flex-1 flex-col justify-center gap-1.5 rounded-xl border px-3 py-2 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : tier.qualifies
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-border/70 bg-card text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <span className='flex items-center justify-between gap-2 text-xs font-semibold'>
                      <span>{tier.tier}</span>
                      {tier.qualifies ? (
                        <CheckCircle2
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            isSelected ? 'text-primary-foreground' : 'text-emerald-500'
                          )}
                        />
                      ) : (
                        <span className='font-mono text-[11px] opacity-80'>{tier.completion_percentage}%</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'h-1 w-full overflow-hidden rounded-full',
                        isSelected ? 'bg-primary-foreground/25' : 'bg-muted'
                      )}
                    >
                      <span
                        className={cn(
                          'block h-full rounded-full',
                          isSelected
                            ? 'bg-primary-foreground'
                            : tier.qualifies
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        )}
                        style={{ width: `${Math.max(0, Math.min(100, tier.completion_percentage))}%` }}
                      />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Detalle del Nivel Activo */}
        {activeTier && (
          <div className='rounded-xl border border-border/60 bg-card p-4 space-y-3'>
            <div className='flex flex-col gap-2 border-b border-border/40 pb-3 sm:flex-row sm:items-start sm:justify-between'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-bold text-sm text-foreground'>{activeTier.title}</span>
                  {activeTier.qualifies ? (
                    <Badge variant='outline' className='text-[11px] border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'>
                      Cumple al 100%
                    </Badge>
                  ) : (
                    <Badge variant='outline' className='text-[11px] border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'>
                      {activeTier.completion_percentage}% cumplido
                    </Badge>
                  )}
                </div>
                <p className='mt-0.5 text-xs text-muted-foreground'>{activeTier.description}</p>
              </div>

              {isCurrentMax && (
                <Badge variant='secondary' className='shrink-0 self-start text-[11px] font-medium'>
                  Nivel Alcanzado
                </Badge>
              )}
            </div>

            {/* Lista de Requisitos */}
            <ul className='divide-y divide-border/40'>
              {activeTier.requirements.map((req) => {
                const progreso = progresoRequisito(req.current, req.target)
                return (
                  <li key={req.id} className='space-y-2 py-3 text-xs'>
                    <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                      <div className='flex min-w-0 items-start gap-2.5'>
                        {req.met ? (
                          <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-emerald-500' />
                        ) : (
                          <AlertCircle className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' />
                        )}
                        <div className='min-w-0'>
                          <div className='font-semibold leading-tight text-foreground'>{req.label}</div>
                          <div className='mt-0.5 text-xs leading-snug text-muted-foreground'>{req.description}</div>
                        </div>
                      </div>

                      <div className='flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 pl-6 sm:justify-end sm:pl-0'>
                        <div>
                          <span className='text-muted-foreground'>Requerido: </span>
                          <span className='font-mono font-medium'>
                            {req.target} {req.unit}
                          </span>
                        </div>
                        <Badge
                          variant='outline'
                          className={cn(
                            'shrink-0 px-2 py-0.5 text-[11px] font-mono font-bold',
                            req.met
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          )}
                        >
                          Actual: {req.current} {req.unit}
                        </Badge>
                      </div>
                    </div>

                    {progreso !== null && (
                      <div className='ml-6 h-1 overflow-hidden rounded-full bg-muted'>
                        <div
                          className={cn('h-full rounded-full', req.met ? 'bg-emerald-500' : 'bg-amber-500')}
                          style={{ width: `${progreso}%` }}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Nota Metodológica Minciencias 2024: plegada por defecto para no competir con el diagnóstico */}
        <details className='group rounded-xl border border-border/40 bg-muted/10 text-xs text-muted-foreground'>
          <summary className='flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-semibold text-foreground [&::-webkit-details-marker]:hidden'>
            <span className='flex items-center gap-1.5'>
              <Info className='h-3.5 w-3.5 text-primary' />
              Reglas del Modelo de Medición Minciencias 2024 (Anexo 1)
            </span>
            <ChevronDown className='h-4 w-4 shrink-0 transition-transform group-open:rotate-180' />
          </summary>
          <div className='grid grid-cols-1 gap-3 border-t border-border/40 p-3 leading-relaxed md:grid-cols-2'>
            <div>
              <strong>• Ventanas diferenciadas:</strong> 10 años para patentes, variedades vegetales y creación; 7 años para artículos en revistas indexadas (A1-C) y libros de investigación; 5 años para software, prototipos, FRH, ASC y DPC.
            </div>
            <div>
              <strong>• Cohesión y Tipologías:</strong> El Índice de Cohesión (I<sub>C</sub> = Autores/Productos - 1) exige colaboración interna efectiva (I<sub>C</sub> &gt; 0). Las categorías A y A1 exigen obligatoriamente dirección de tesis doctoral (FRH Tipo A), y A1 requiere al menos 1 producto TOP.
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
