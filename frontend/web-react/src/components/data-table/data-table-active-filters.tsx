import { X as XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DataFilter } from './types'

interface DataTableActiveFiltersProps {
  activeFiltersCount: number
  activeSearchValue: string
  onClearSearch: () => void
  filters: DataFilter[]
  activeFilterValues: Record<string, string>
  onRemoveFilter: (key: string, defaultValue: string) => void
  onClearAll: () => void
}

export function DataTableActiveFilters({
  activeFiltersCount,
  activeSearchValue,
  onClearSearch,
  filters,
  activeFilterValues,
  onRemoveFilter,
  onClearAll,
}: DataTableActiveFiltersProps) {
  const hasActiveSearch = Boolean(activeSearchValue && activeSearchValue.trim().length > 0)
  if (activeFiltersCount === 0 && !hasActiveSearch) {
    return null
  }

  return (
    <div className='flex flex-wrap items-center gap-2 pt-0.5'>
      <span className='text-xs font-medium text-muted-foreground'>Filtros activos:</span>

      {/* Search Chip */}
      {hasActiveSearch && (
        <Badge
          variant='secondary'
          className='inline-flex items-center gap-1.5 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium bg-muted/80 hover:bg-muted text-foreground transition-colors'
        >
          <span>
            Búsqueda: <strong className='font-semibold'>"{activeSearchValue}"</strong>
          </span>
          <button
            type='button'
            onClick={onClearSearch}
            className='rounded-full p-0.5 hover:bg-background/80 transition-colors'
            title='Quitar búsqueda'
          >
            <XIcon className='h-3 w-3 text-muted-foreground hover:text-foreground' />
          </button>
        </Badge>
      )}

      {/* Active Filter Chips */}
      {filters.map((f) => {
        const val = activeFilterValues[f.key]
        const defaultVal = f.defaultValue ?? 'all'
        if (!val || val === defaultVal) return null

        const opt = f.options.find((o) => o.value === val)
        const label = opt ? opt.label : val

        return (
          <Badge
            key={f.key}
            variant='secondary'
            className='inline-flex items-center gap-1.5 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium bg-muted/80 hover:bg-muted text-foreground transition-colors'
          >
            <span>
              <span className='text-muted-foreground'>{f.label}:</span>{' '}
              <strong className='font-semibold'>{label}</strong>
            </span>
            <button
              type='button'
              onClick={() => onRemoveFilter(f.key, defaultVal)}
              className='rounded-full p-0.5 hover:bg-background/80 transition-colors'
              title={`Quitar filtro ${f.label}`}
            >
              <XIcon className='h-3 w-3 text-muted-foreground hover:text-foreground' />
            </button>
          </Badge>
        )
      })}

      {/* Clear all text button */}
      <Button
        variant='ghost'
        size='sm'
        onClick={onClearAll}
        className='h-7 px-2 text-xs text-muted-foreground hover:text-destructive'
      >
        Limpiar todo
      </Button>
    </div>
  )
}
