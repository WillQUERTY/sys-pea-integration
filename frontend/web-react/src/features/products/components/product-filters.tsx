import { AlertTriangle } from 'lucide-react'
import type { DataFilter } from '@/components/data-table'
import type { ProductCatalogs } from '@/lib/api'
import type { Group } from '@/lib/types'
import { Input } from '@/components/ui/input'

export const PRODUCT_BASE_FILTERS: DataFilter[] = [
  {
    key: 'status',
    label: 'Estado de validación',
    defaultValue: 'all',
    options: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'pending', label: 'Pendientes' },
      { value: 'valid', label: 'Validados' },
      { value: 'rejected', label: 'Rechazados' },
    ],
  },
  {
    key: 'record_status',
    label: 'Estado del registro',
    defaultValue: 'active',
    options: [
      { value: 'all', label: 'Todos' },
      { value: 'active', label: 'Activos' },
      { value: 'inactive', label: 'Inactivos' },
    ],
  },
  {
    key: 'window',
    label: 'Ventana de observación',
    defaultValue: 'all',
    options: [
      { value: 'all', label: 'Todos los años' },
      { value: '2', label: 'Últimos 2 años' },
      { value: '3', label: 'Últimos 3 años' },
      { value: '5', label: 'Últimos 5 años' },
      { value: '10', label: 'Últimos 10 años' },
      { value: 'custom', label: 'Rango personalizado…' },
    ],
  },
  {
    key: 'classification',
    label: 'Clasificación 2024',
    defaultValue: 'all',
    options: [
      { value: 'all', label: 'Todas' },
      { value: 'unclassified', label: 'Sin clasificar' },
    ],
  },
]

export interface BuildProductFiltersOptions {
  catalogs?: ProductCatalogs
  groups?: { items?: Group[] }
  selectedFamily?: string
}

export function buildProductFilters({
  catalogs,
  groups,
  selectedFamily,
}: BuildProductFiltersOptions): DataFilter[] {
  return [
    ...PRODUCT_BASE_FILTERS,
    {
      key: 'group',
      label: 'Grupo de investigación',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'Todos los grupos' },
        ...(groups?.items ?? []).map((g) => ({
          value: String(g.id ?? ''),
          label: g.acronym ? `${g.acronym} — ${g.name}` : g.name,
        })),
      ],
    },
    {
      key: 'family',
      label: 'Familia 2024',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'Todas las familias' },
        ...(catalogs?.families ?? []).map((f) => ({
          value: String(f.id),
          label: f.code ? `${f.code} — ${f.name}` : f.name,
        })),
      ],
    },
    {
      key: 'subtype',
      label: 'Tipología / Subtipo 2024',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'Todos los subtipos' },
        ...(catalogs?.subtypes ?? [])
          .filter((s) => !selectedFamily || selectedFamily === 'all' || String(s.family_id) === selectedFamily)
          .map((s) => ({
            value: String(s.id),
            label: s.code ? `${s.code} — ${s.name}` : s.name,
          })),
      ],
    },
  ]
}

export interface ProductCustomWindowFilterProps {
  customStart: string
  customEnd: string
  onStartChange: (val: string) => void
  onEndChange: (val: string) => void
}

export function ProductCustomWindowFilter({
  customStart,
  customEnd,
  onStartChange,
  onEndChange,
}: ProductCustomWindowFilterProps) {
  return (
    <div className='space-y-2.5'>
      <h4 className='text-sm font-bold text-foreground'>
        Ventana personalizada (año desde – hasta)
      </h4>
      <div className='grid grid-cols-2 gap-3'>
        <Input
          type='number'
          inputMode='numeric'
          placeholder='Desde (ej. 2019)'
          className='h-11 rounded-xl border-border/60 bg-background shadow-2xs'
          value={customStart}
          onChange={(e) => onStartChange(e.target.value)}
        />
        <Input
          type='number'
          inputMode='numeric'
          placeholder='Hasta (ej. 2023)'
          className='h-11 rounded-xl border-border/60 bg-background shadow-2xs'
          value={customEnd}
          onChange={(e) => onEndChange(e.target.value)}
        />
      </div>
      {customStart && customEnd && Number(customStart) > Number(customEnd) && (
        <p className='flex items-center gap-1.5 text-xs font-medium text-destructive'>
          <AlertTriangle className='h-3.5 w-3.5 shrink-0' />
          El año inicial ({customStart}) no puede ser mayor que el año final ({customEnd}).
        </p>
      )}
      <p className='text-xs text-muted-foreground'>
        Filtra por año de obtención del producto.
      </p>
    </div>
  )
}
