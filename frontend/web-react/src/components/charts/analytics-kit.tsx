import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

/**
 * Kit compartido de la seccion de estadisticas (grupos e investigadores):
 * mismas tarjetas KPI, misma grilla y mismas sub-pestanas en ambos perfiles.
 */

export interface KpiCardProps {
  label: string
  icon: LucideIcon
  /** Clase de color del icono y acento (p. ej. `text-primary`). */
  iconClassName?: string
  /** Valor principal (ya formateado). */
  value: ReactNode
  /** Sufijo pequeno junto al valor (p. ej. `/ 12`). */
  valueSuffix?: ReactNode
  /** Texto secundario bajo el valor. */
  hint?: ReactNode
  /** Insignia junto a la etiqueta (p. ej. `NO OFICIAL`). */
  badge?: ReactNode
  /** Tooltip nativo para el texto secundario cuando se trunca. */
  hintTitle?: string
  /** Texto compacto para valores largos (p. ej. nombres). */
  compactValue?: boolean
  valueClassName?: string
  className?: string
  testId?: string
}

export function KpiCard({
  label,
  icon: Icon,
  iconClassName = 'text-primary',
  value,
  valueSuffix,
  hint,
  badge,
  hintTitle,
  compactValue = false,
  valueClassName,
  className,
  testId,
}: KpiCardProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex min-w-0 flex-col justify-between gap-2 rounded-xl border border-border/60 bg-card p-3 shadow-xs sm:p-4',
        className
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1'>
          <span className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs'>
            {label}
          </span>
          {badge}
        </div>
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconClassName)} aria-hidden />
      </div>
      <div className='flex min-w-0 items-baseline gap-1.5'>
        <span
          className={cn(
            'min-w-0 font-bold tracking-tight text-foreground',
            compactValue
              ? 'truncate text-base sm:text-lg'
              : 'font-mono text-2xl sm:text-3xl',
            valueClassName
          )}
          title={compactValue && typeof value === 'string' ? value : undefined}
        >
          {value}
        </span>
        {valueSuffix != null && (
          <span className='shrink-0 font-mono text-xs text-muted-foreground'>{valueSuffix}</span>
        )}
      </div>
      {hint != null && (
        <p className='truncate text-xs text-muted-foreground' title={hintTitle}>
          {hint}
        </p>
      )}
    </div>
  )
}

/** Grilla de KPIs: 2 col en movil, 3 en tablet, `desktop` en pantallas grandes. */
export function KpiGrid({
  children,
  desktop = 4,
}: {
  children: ReactNode
  desktop?: 4 | 5
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2.5 sm:gap-3',
        desktop === 5 ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-4'
      )}
    >
      {children}
    </div>
  )
}

export interface AnalyticsSection {
  value: string
  label: string
  icon?: LucideIcon
  content: ReactNode
}

/**
 * Sub-pestanas de la seccion. En movil la lista hace scroll horizontal
 * (sin cortar etiquetas) y cada pestana mantiene un area tactil de 40 px.
 */
export function AnalyticsSections({
  sections,
  defaultValue,
}: {
  sections: AnalyticsSection[]
  defaultValue?: string
}) {
  return (
    <Tabs defaultValue={defaultValue ?? sections[0]?.value} className='gap-4'>
      <div className='-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        <TabsList className='h-auto w-max min-w-full justify-start gap-1 p-1 sm:w-full'>
          {sections.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className='min-h-10 flex-none px-3 text-xs sm:flex-1 sm:text-sm'
            >
              {Icon && <Icon className='h-4 w-4' aria-hidden />}
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {sections.map(({ value, content }) => (
        <TabsContent key={value} value={value} className='min-w-0 space-y-4 sm:space-y-6'>
          {content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

/** Fila de dos columnas que colapsa a una sola bajo `lg` (ancho real de contenido). */
export function TwoColumn({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-2 [&>*]:min-w-0',
        className
      )}
    >
      {children}
    </div>
  )
}

/** Estado vacio de graficas: icono + mensaje, con altura minima para no colapsar la tarjeta. */
export function EmptyState({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center',
        className
      )}
    >
      <div className='flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground'>
        <Icon className='h-4 w-4' aria-hidden />
      </div>
      <p className='max-w-[28ch] text-xs text-muted-foreground'>{children}</p>
    </div>
  )
}
