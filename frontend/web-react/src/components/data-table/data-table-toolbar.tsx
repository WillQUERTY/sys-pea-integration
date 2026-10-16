import type { ReactNode } from 'react'
import {
  Search as SearchIcon,
  SlidersHorizontal,
  X as XIcon,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { DataFilter } from './types'

interface DataTableToolbarProps {
  hideSearch?: boolean
  searchPlaceholder?: string
  activeSearchValue: string
  onSearchChange: (value: string) => void
  onClearSearch: () => void
  hideFilters?: boolean
  filters: DataFilter[]
  activeFilterValues: Record<string, string>
  activeFiltersCount: number
  filterSheetOpen: boolean
  onFilterSheetOpenChange: (open: boolean) => void
  onFilterChange: (key: string, value: string) => void
  onClearFilters: () => void
  filterExtra?: ReactNode
  toolbarActions?: ReactNode
}

export function DataTableToolbar({
  hideSearch = false,
  searchPlaceholder = 'Buscar…',
  activeSearchValue,
  onSearchChange,
  onClearSearch,
  hideFilters = false,
  filters,
  activeFilterValues,
  activeFiltersCount,
  filterSheetOpen,
  onFilterSheetOpenChange,
  onFilterChange,
  onClearFilters,
  filterExtra,
  toolbarActions,
}: DataTableToolbarProps) {
  return (
    <div className='flex flex-wrap items-center gap-2.5 sm:gap-3 w-full min-w-0'>
      {/* Search Input */}
      {!hideSearch && (
        <div className='relative max-w-sm sm:max-w-md flex-1 min-w-[180px]'>
          <SearchIcon className='pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors' />
          <Input
            placeholder={searchPlaceholder}
            value={activeSearchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className='h-10 sm:h-11 rounded-full pl-10 pr-9 text-sm bg-background border border-border/80 shadow-2xs hover:border-border focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all'
          />
          {activeSearchValue && activeSearchValue.length > 0 && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={onClearSearch}
              className='absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted'
              title='Borrar búsqueda'
            >
              <XIcon className='h-3.5 w-3.5' />
            </Button>
          )}
        </div>
      )}

      {/* Filters Drawer */}
      {!hideFilters && filters.length > 0 && (
        <Sheet open={filterSheetOpen} onOpenChange={onFilterSheetOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant='outline'
              className='relative h-10 sm:h-11 rounded-full border border-border/80 bg-background hover:bg-muted/60 px-4 text-foreground shadow-2xs transition-all shrink-0 font-medium'
            >
              <SlidersHorizontal className='mr-2 h-4 w-4 text-muted-foreground' />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <Badge
                  variant='default'
                  className='absolute -right-1.5 -top-1.5 h-5 min-w-5 rounded-full px-1 flex items-center justify-center text-[10px] font-bold bg-amber-500 text-amber-950 dark:bg-amber-400 dark:text-amber-950 border-0 shadow-xs'
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className='flex flex-col gap-0 border-l bg-background p-0 shadow-2xl sm:max-w-sm [&>button]:inset-e-4 [&>button]:top-4 [&>button]:flex [&>button]:size-8 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:opacity-100 [&>button]:hover:bg-muted'>
            {/* Header */}
            <SheetHeader className='flex h-16 shrink-0 flex-row items-center justify-between border-b border-border bg-background py-0 ps-6 pe-14'>
              <div className='flex items-center gap-2.5'>
                <SlidersHorizontal className='h-4.5 w-4.5 text-primary' />
                <SheetTitle className='text-lg font-bold tracking-tight'>Filtros</SheetTitle>
                <SheetDescription className='sr-only'>Panel de filtros de la tabla</SheetDescription>
                {activeFiltersCount > 0 && (
                  <Badge variant='secondary' className='rounded-full text-[11px] font-semibold'>
                    {activeFiltersCount} {activeFiltersCount === 1 ? 'activo' : 'activos'}
                  </Badge>
                )}
              </div>
              {activeFiltersCount > 0 && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 rounded-full text-muted-foreground hover:text-foreground'
                  onClick={onClearFilters}
                  title='Restablecer filtros'
                >
                  <RotateCcw className='h-4 w-4' />
                </Button>
              )}
            </SheetHeader>

            {/* Body */}
            <div className='flex-1 space-y-6 overflow-y-auto bg-muted/40 dark:bg-muted/20 px-5 py-6'>
              {filters.map((f) => {
                const currentValue = activeFilterValues[f.key] ?? f.defaultValue ?? 'all'
                const useSelect = f.options.length > 4

                return (
                  <div key={f.key} className='space-y-2.5'>
                    <h4 className='text-sm font-bold text-foreground'>{f.label}</h4>

                    {useSelect ? (
                      <Select
                        value={currentValue}
                        onValueChange={(val) => onFilterChange(f.key, val)}
                      >
                        <SelectTrigger className='h-11 w-full rounded-xl border-border/60 bg-background px-4 text-sm shadow-2xs transition-colors hover:border-border data-[placeholder]:text-muted-foreground'>
                          <SelectValue placeholder={`Seleccionar ${f.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent className='rounded-xl shadow-lg'>
                          {f.options.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className='rounded-lg my-0.5 cursor-pointer'
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <RadioGroup
                        value={currentValue}
                        onValueChange={(val) => onFilterChange(f.key, val)}
                        className='space-y-1'
                      >
                        {f.options.map((opt) => {
                          const id = `table-filter-${f.key}-${opt.value}`
                          const selected = currentValue === opt.value
                          return (
                            <Label
                              key={opt.value}
                              htmlFor={id}
                              className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors',
                                selected
                                  ? 'border-primary/40 bg-background font-medium text-foreground shadow-2xs'
                                  : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground'
                              )}
                            >
                              <RadioGroupItem value={opt.value} id={id} />
                              <span className='leading-none'>{opt.label}</span>
                            </Label>
                          )
                        })}
                      </RadioGroup>
                    )}
                  </div>
                )
              })}

              {/* Filtros personalizados */}
              {filterExtra && <div className='pt-1'>{filterExtra}</div>}
            </div>

            {/* Footer */}
            <div className='flex items-center gap-3 border-t border-border bg-background px-5 py-4'>
              <Button
                variant='outline'
                className='h-11 flex-1 rounded-xl'
                onClick={onClearFilters}
                disabled={activeFiltersCount === 0}
              >
                <RotateCcw className='mr-2 h-4 w-4' />
                Restablecer
              </Button>
              <Button
                className='h-11 flex-1 rounded-xl font-semibold'
                onClick={() => onFilterSheetOpenChange(false)}
              >
                Ver resultados
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Spacer + toolbar actions */}
      {toolbarActions && (
        <div className='ms-auto flex items-center gap-2 shrink-0'>
          {toolbarActions}
        </div>
      )}
    </div>
  )
}
