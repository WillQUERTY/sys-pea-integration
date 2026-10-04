import { useState, useMemo, type ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search as SearchIcon,
  SlidersHorizontal,
  X as XIcon,
  SearchX,
  Inbox,
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

// ─── Column definition ─────────────────────────────────────────────────────────
export interface DataColumn<T> {
  key: string
  header: string
  /** Render cell content. Receives the row item. */
  cell: (item: T) => ReactNode
  /** Optional class for the <TableCell> */
  className?: string
  /** If provided, this column's text value is included in the search index */
  searchable?: (item: T) => string
}

// ─── Filter definition ─────────────────────────────────────────────────────────
export interface DataFilter {
  key: string
  label: string
  options: { value: string; label: string }[]
  /** Default value — normally 'all' */
  defaultValue?: string
}

// ─── Server mode ────────────────────────────────────────────────────────────────
// Si `server` está presente, la tabla es 100% controlada por la vista: los datos
// llegan pre-filtrados/paginados del backend y la tabla solo emite cambios
// (búsqueda cruda, filtros, página). El debounce y el reset de página viven en la vista.
export interface DataTableServerProps {
  /** Total de filas del servidor para los filtros actuales (no de la página). */
  total: number
  /** Página actual controlada (0-based). */
  pageIndex: number
  /** Tamaño de página controlado. */
  pageSize: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  /** Valor controlado del input de búsqueda (crudo; el debounce vive en la vista). */
  searchValue: string
  onSearchChange: (search: string) => void
  /** Valores de filtro controlados (claves = DataFilter.key). */
  filterValues?: Record<string, string>
  onFilterChange?: (filterValues: Record<string, string>) => void
  /** Refetch en background (placeholderData) — atenúa la tabla sin skeletons. */
  isFetching?: boolean
}

// ─── Props ──────────────────────────────────────────────────────────────────────
interface DataTableProps<T> {
  columns: DataColumn<T>[]
  data: T[]
  loading?: boolean
  /** Unique key extractor per row */
  rowKey: (item: T) => string | number
  /** Optional search placeholder */
  searchPlaceholder?: string
  /** External filter definitions */
  filters?: DataFilter[]
  /** Contenido extra dentro del panel de filtros (p.ej. inputs de ventana personalizada) */
  filterExtra?: ReactNode
  /** Callback opcional al limpiar filtros (para resetear estados adicionales como custom date ranges) */
  onClearFilters?: () => void
  /** Apply external filters to each row. Gets current filter values map. */
  filterFn?: (item: T, filterValues: Record<string, string>) => boolean
  /** Rows per page options */
  pageSizeOptions?: number[]
  /** Default page size */
  defaultPageSize?: number
  /** Message when no rows match */
  emptyMessage?: string
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number
  /** Optional actions rendered in the toolbar (right side) */
  toolbarActions?: ReactNode
  /** Modo server: búsqueda/filtros/paginación controlados por la vista (datos del backend). */
  server?: DataTableServerProps
  /** Hide search input */
  hideSearch?: boolean
  /** Hide internal filters trigger (useful when rendered externally) */
  hideFilters?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────────
export function DataTable<T>({
  columns,
  data,
  loading = false,
  rowKey,
  searchPlaceholder = 'Buscar…',
  filters = [],
  filterExtra,
  onClearFilters,
  filterFn,
  pageSizeOptions = [10, 20, 50, 100],
  defaultPageSize = 10,
  emptyMessage = 'No hay resultados.',
  skeletonRows = 8,
  toolbarActions,
  server,
  hideSearch = false,
  hideFilters = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of filters) init[f.key] = f.defaultValue ?? 'all'
    return init
  })

  const isServer = server !== undefined

  // Valores efectivos: en modo server manda lo controlado por la vista
  const activeSearchValue = isServer ? server.searchValue : search
  const activeFilterValues = isServer ? (server.filterValues ?? filterValues) : filterValues

  // searchable columns
  const searchableCols = columns.filter((c) => c.searchable)

  // filtered + searched data
  const filtered = useMemo(() => {
    let result = data

    // global search
    if (search && searchableCols.length > 0) {
      const q = search.toLowerCase()
      result = result.filter((item) =>
        searchableCols.some((col) => col.searchable!(item).toLowerCase().includes(q))
      )
    }

    // external filters
    if (filterFn) {
      result = result.filter((item) => filterFn(item, filterValues))
    }

    return result
  }, [data, search, filterValues, searchableCols, filterFn])

  // pagination math
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)) - 1)
  const paged = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)

  const totalRows = isServer ? server.total : filtered.length
  const activePage = isServer ? server.pageIndex : safePage
  const activePageSize = isServer ? server.pageSize : pageSize
  const totalPages = Math.max(1, Math.ceil(totalRows / activePageSize))
  const rows = isServer ? data : paged
  const from = totalRows === 0 ? 0 : activePage * activePageSize + 1
  const to = Math.min((activePage + 1) * activePageSize, totalRows)

  // reset page on search/filter change
  const updateSearch = (v: string) => { setSearch(v); setPage(0) }
  const updateFilter = (key: string, v: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: v }))
    setPage(0)
  }
  const updatePageSize = (v: string) => {
    setPageSize(Number(v))
    setPage(0)
  }

  // Count active filters (not default)
  const activeFiltersCount = filters.filter(
    (f) => activeFilterValues[f.key] && activeFilterValues[f.key] !== (f.defaultValue ?? 'all')
  ).length
  const isFiltered = Boolean(activeSearchValue?.trim()) || activeFiltersCount > 0

  const clearFilters = () => {
    const reset: Record<string, string> = {}
    for (const f of filters) reset[f.key] = f.defaultValue ?? 'all'
    if (isServer) {
      server.onFilterChange?.(reset)
      server.onPageChange(0)
    } else {
      setFilterValues(reset)
      setPage(0)
    }
    onClearFilters?.()
  }

  const clearAllFiltersAndSearch = () => {
    const reset: Record<string, string> = {}
    for (const f of filters) reset[f.key] = f.defaultValue ?? 'all'
    if (isServer) {
      server.onSearchChange('')
      server.onFilterChange?.(reset)
      server.onPageChange(0)
    } else {
      setSearch('')
      setFilterValues(reset)
      setPage(0)
    }
    onClearFilters?.()
  }

  return (
    <div className='space-y-3.5 w-full min-w-0 max-w-full'>
      {/* ── Toolbar ── */}
      <div className='flex flex-wrap items-center gap-2.5 sm:gap-3 w-full min-w-0'>
        {/* Search */}
        {!hideSearch && (
          <div className='relative max-w-sm sm:max-w-md flex-1 min-w-[180px]'>
            <SearchIcon className='pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors' />
            <Input
              placeholder={searchPlaceholder}
              value={activeSearchValue}
              onChange={(e) => {
                if (isServer) {
                  server.onSearchChange(e.target.value)
                  server.onPageChange(0)
                } else {
                  updateSearch(e.target.value)
                }
              }}
              className='h-10 sm:h-11 rounded-full pl-10 pr-9 text-sm bg-background border border-border/80 shadow-2xs hover:border-border focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all'
            />
            {activeSearchValue && activeSearchValue.length > 0 && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => {
                  if (isServer) {
                    server.onSearchChange('')
                    server.onPageChange(0)
                  } else {
                    updateSearch('')
                  }
                }}
                className='absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted'
                title='Borrar búsqueda'
              >
                <XIcon className='h-3.5 w-3.5' />
              </Button>
            )}
          </div>
        )}

        {/* Filters Drawer (Estilo público con SlidersHorizontal, chips y cards) */}
        {!hideFilters && filters.length > 0 && (
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
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
                    onClick={clearFilters}
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
                          onValueChange={(val) => {
                            if (isServer) {
                              server.onFilterChange?.({ ...activeFilterValues, [f.key]: val })
                              server.onPageChange(0)
                            } else {
                              updateFilter(f.key, val)
                            }
                          }}
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
                          onValueChange={(val) => {
                            if (isServer) {
                              server.onFilterChange?.({ ...activeFilterValues, [f.key]: val })
                              server.onPageChange(0)
                            } else {
                              updateFilter(f.key, val)
                            }
                          }}
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

                {/* Filtros personalizados (p. ej. rango de años en productos) */}
                {filterExtra && <div className='pt-1'>{filterExtra}</div>}
              </div>

              {/* Footer */}
              <div className='flex items-center gap-3 border-t border-border bg-background px-5 py-4'>
                <Button
                  variant='outline'
                  className='h-11 flex-1 rounded-xl'
                  onClick={clearFilters}
                  disabled={activeFiltersCount === 0}
                >
                  <RotateCcw className='mr-2 h-4 w-4' />
                  Restablecer
                </Button>
                <Button
                  className='h-11 flex-1 rounded-xl font-semibold'
                  onClick={() => setFilterSheetOpen(false)}
                >
                  Ver resultados
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Spacer + toolbar actions */}
        {toolbarActions && <div className='ms-auto flex items-center gap-2 shrink-0'>{toolbarActions}</div>}
      </div>

      {/* ── Active Filter Pills / Chips ── */}
      {(activeFiltersCount > 0 || (activeSearchValue && activeSearchValue.trim().length > 0)) && (
        <div className='flex flex-wrap items-center gap-2 pt-0.5'>
          <span className='text-xs font-medium text-muted-foreground'>Filtros activos:</span>

          {/* Search Chip */}
          {activeSearchValue && activeSearchValue.trim().length > 0 && (
            <Badge
              variant='secondary'
              className='inline-flex items-center gap-1.5 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium bg-muted/80 hover:bg-muted text-foreground transition-colors'
            >
              <span>
                Búsqueda: <strong className='font-semibold'>"{activeSearchValue}"</strong>
              </span>
              <button
                type='button'
                onClick={() => {
                  if (isServer) {
                    server.onSearchChange('')
                    server.onPageChange(0)
                  } else {
                    updateSearch('')
                  }
                }}
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
                  onClick={() => {
                    const nextVal = f.defaultValue ?? 'all'
                    if (isServer) {
                      server.onFilterChange?.({ ...activeFilterValues, [f.key]: nextVal })
                      server.onPageChange(0)
                    } else {
                      updateFilter(f.key, nextVal)
                    }
                  }}
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
            onClick={clearAllFiltersAndSearch}
            className='h-7 px-2 text-xs text-muted-foreground hover:text-destructive'
          >
            Limpiar todo
          </Button>
        </div>
      )}

      {/* ── Table ── */}
      <div
        className={`rounded-lg border overflow-hidden w-full min-w-0 max-w-full${isServer && server.isFetching && !loading ? ' opacity-60 pointer-events-none transition-opacity' : ''}`}
        aria-busy={isServer && server.isFetching}
      >
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Loading skeleton */}
            {loading &&
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className='h-5 w-full' />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {/* Data rows */}
            {!loading &&
              rows.map((item) => (
                <TableRow key={rowKey(item)} className='transition-colors'>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {/* Empty state */}
            {!loading && (isServer ? data.length === 0 : filtered.length === 0) && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='py-14 text-center'
                >
                  <div className='flex flex-col items-center justify-center p-4 text-center'>
                    {isFiltered ? (
                      <>
                        <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400'>
                          <SearchX className='h-6 w-6' />
                        </div>
                        <p className='text-sm font-semibold text-foreground'>
                          No se encontraron coincidencias
                        </p>
                        <p className='mt-1 max-w-sm text-xs text-muted-foreground'>
                          {activeSearchValue.trim()
                            ? `Ningún registro coincide con "${activeSearchValue.trim()}" o con los filtros seleccionados.`
                            : 'Ningún registro coincide con los filtros aplicados.'}
                        </p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-4 h-8 gap-1.5 rounded-lg text-xs font-medium'
                          onClick={clearAllFiltersAndSearch}
                        >
                          <RotateCcw className='h-3.5 w-3.5' />
                          Limpiar búsqueda y filtros
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground/80 ring-1 ring-border/50'>
                          <Inbox className='h-6 w-6' />
                        </div>
                        <p className='text-sm font-semibold text-foreground'>
                          {emptyMessage || 'No hay registros disponibles'}
                        </p>
                        <p className='mt-1 max-w-sm text-xs text-muted-foreground'>
                          Actualmente no existen elementos para mostrar en esta tabla.
                        </p>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {!loading && (isServer ? server.total > 0 : filtered.length > 0) && (
        <div className='flex flex-wrap items-center justify-between gap-3 text-sm'>
          {/* Info */}
          <p className='text-muted-foreground'>
            Mostrando <span className='font-medium text-foreground'>{from}–{to}</span> de{' '}
            <span className='font-medium text-foreground'>{totalRows}</span> resultados
          </p>

          <div className='flex items-center gap-3'>
            {/* Page size selector */}
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground text-xs'>Filas</span>
              <Select
                value={String(activePageSize)}
                onValueChange={(v) =>
                  isServer ? server.onPageSizeChange(Number(v)) : updatePageSize(v)
                }
              >
                <SelectTrigger className='h-8 w-[72px] text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page info */}
            <span className='text-muted-foreground text-xs'>
              Pág. {activePage + 1} de {totalPages}
            </span>

            {/* Navigation */}
            <div className='flex items-center gap-1'>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                disabled={activePage === 0}
                onClick={() => (isServer ? server.onPageChange(0) : setPage(0))}
              >
                <ChevronsLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                disabled={activePage === 0}
                onClick={() =>
                  isServer
                    ? server.onPageChange(Math.max(0, activePage - 1))
                    : setPage((p) => Math.max(0, p - 1))
                }
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                disabled={activePage >= totalPages - 1}
                onClick={() =>
                  isServer
                    ? server.onPageChange(Math.min(totalPages - 1, activePage + 1))
                    : setPage((p) => Math.min(totalPages - 1, p + 1))
                }
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                disabled={activePage >= totalPages - 1}
                onClick={() => (isServer ? server.onPageChange(totalPages - 1) : setPage(totalPages - 1))}
              >
                <ChevronsRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
