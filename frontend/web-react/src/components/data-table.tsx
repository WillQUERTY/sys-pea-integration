import { useState, useMemo, type ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search as SearchIcon,
  Filter as FilterIcon,
  X as XIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
}

// ─── Component ──────────────────────────────────────────────────────────────────
export function DataTable<T>({
  columns,
  data,
  loading = false,
  rowKey,
  searchPlaceholder = 'Buscar…',
  filters = [],
  filterFn,
  pageSizeOptions = [10, 20, 50, 100],
  defaultPageSize = 10,
  emptyMessage = 'No hay resultados.',
  skeletonRows = 8,
  toolbarActions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of filters) init[f.key] = f.defaultValue ?? 'all'
    return init
  })

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
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)
  const from = filtered.length === 0 ? 0 : safePage * pageSize + 1
  const to = Math.min((safePage + 1) * pageSize, filtered.length)

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
  const activeFiltersCount = Object.keys(filterValues).filter(k => filterValues[k] !== 'all').length

  const clearFilters = () => {
    const reset: Record<string, string> = {}
    for (const f of filters) reset[f.key] = f.defaultValue ?? 'all'
    setFilterValues(reset)
    setPage(0)
  }

  return (
    <div className='space-y-4'>
      {/* ── Toolbar ── */}
      <div className='flex flex-wrap items-center gap-3'>
        {/* Search */}
        <div className='relative max-w-xs flex-1'>
          <SearchIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            className='ps-9'
          />
        </div>

        {/* Filters Drawer */}
        {filters.length > 0 && (
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
              
              <div className='flex-1 overflow-y-auto px-6 py-5 space-y-6'>
                {filters.map((f) => (
                  <div key={f.key} className='space-y-1.5'>
                    <label className='text-sm font-semibold text-foreground/80'>{f.label}</label>
                    <Select
                      value={filterValues[f.key]}
                      onValueChange={(v) => updateFilter(f.key, v)}
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
              </div>
              
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
      <div className='rounded-lg border'>
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
              paged.map((item) => (
                <TableRow key={rowKey(item)} className='transition-colors'>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='py-10 text-center text-muted-foreground'
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {!loading && filtered.length > 0 && (
        <div className='flex flex-wrap items-center justify-between gap-3 text-sm'>
          {/* Info */}
          <p className='text-muted-foreground'>
            Mostrando <span className='font-medium text-foreground'>{from}–{to}</span> de{' '}
            <span className='font-medium text-foreground'>{filtered.length}</span> resultados
          </p>

          <div className='flex items-center gap-3'>
            {/* Page size selector */}
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground text-xs'>Filas</span>
              <Select value={String(pageSize)} onValueChange={updatePageSize}>
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
              Pág. {safePage + 1} de {totalPages}
            </span>

            {/* Navigation */}
            <div className='flex items-center gap-1'>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                disabled={safePage === 0}
                onClick={() => setPage(0)}
              >
                <ChevronsLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(totalPages - 1)}
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
