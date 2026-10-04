import { useState, useMemo, type ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search as SearchIcon,
  Filter as FilterIcon,
  X as XIcon,
  SearchX,
  Inbox,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  const activeFiltersCount = Object.keys(activeFilterValues).filter(k => activeFilterValues[k] !== 'all').length
  const isFiltered = Boolean(activeSearchValue?.trim()) || activeFiltersCount > 0

  const clearFilters = () => {
    const reset: Record<string, string> = {}
    for (const f of filters) reset[f.key] = f.defaultValue ?? 'all'
    if (isServer) {
      // El reset de página lo hace la vista en su handler
      server.onFilterChange?.(reset)
    } else {
      setFilterValues(reset)
      setPage(0)
    }
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
  }

  return (
    <div className='space-y-4'>
      {/* ── Toolbar ── */}
      <div className='flex flex-wrap items-center gap-3'>
        {/* Search */}
        {!hideSearch && (
          <div className='relative max-w-xs flex-1'>
            <SearchIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder={searchPlaceholder}
              value={activeSearchValue}
              onChange={(e) =>
                isServer ? server.onSearchChange(e.target.value) : updateSearch(e.target.value)
              }
              className='ps-9'
            />
          </div>
        )}

        {/* Filters Drawer */}
        {!hideFilters && filters.length > 0 && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant='outline' className='relative'>
                <FilterIcon className='mr-2 h-4 w-4' />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant='default' className='absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]'>
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className='flex flex-col border-l-0 shadow-2xl sm:max-w-sm'>
              <SheetHeader className='pb-4 border-b border-border/50'>
                <div className='flex items-center gap-2'>
                  <FilterIcon className='h-5 w-5 text-primary' />
                  <SheetTitle className='text-lg'>Filtros avanzados</SheetTitle>
                </div>
                <SheetDescription className='text-xs'>
                  Refina los resultados de la tabla.
                </SheetDescription>
              </SheetHeader>
              
              <ScrollArea className='flex-1 px-6 py-5'>
                <div className='space-y-6 pr-3'>
                  {filters.map((f) => (
                    <div key={f.key} className='space-y-1.5'>
                      <label className='text-sm font-semibold text-foreground/80'>{f.label}</label>
                      <Select
                        value={activeFilterValues[f.key]}
                        onValueChange={(v) =>
                          isServer
                            ? server.onFilterChange?.({ ...activeFilterValues, [f.key]: v })
                            : updateFilter(f.key, v)
                        }
                      >
                        <SelectTrigger className='w-full bg-muted/30 border-transparent hover:border-border transition-colors h-10 px-3.5 rounded-lg'>
                          <SelectValue placeholder={f.label} />
                        </SelectTrigger>
                        <SelectContent className='rounded-lg shadow-lg'>
                          {f.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className='rounded-md my-0.5 cursor-pointer'>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {filterExtra && <div className='space-y-3 border-t border-border/50 pt-5'>{filterExtra}</div>}
                </div>
              </ScrollArea>
              
              {activeFiltersCount > 0 && (
                <div className='p-6 border-t border-border/50'>
                  <Button variant='destructive' className='w-full rounded-xl h-11 font-semibold bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 hover:text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/30' onClick={clearFilters}>
                    <XIcon className='mr-2 h-4 w-4' />
                    Limpiar filtros ({activeFiltersCount})
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        )}

        {/* Spacer + toolbar actions */}
        {toolbarActions && <div className='ms-auto flex items-center gap-2'>{toolbarActions}</div>}
      </div>

      {/* ── Table ── */}
      <div
        className={`rounded-lg border${isServer && server.isFetching && !loading ? ' opacity-60 pointer-events-none transition-opacity' : ''}`}
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
