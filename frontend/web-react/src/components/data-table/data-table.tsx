import { useState, useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DataTableProps } from './types'
import { DataTableToolbar } from './data-table-toolbar'
import { DataTableActiveFilters } from './data-table-active-filters'
import { DataTableEmpty } from './data-table-empty'
import { DataTablePaginationBar } from './data-table-pagination'

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
  const updateSearch = (v: string) => {
    setSearch(v)
    setPage(0)
  }
  const updateFilter = (key: string, v: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: v }))
    setPage(0)
  }
  const updatePageSize = (size: number) => {
    setPageSize(size)
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

  const handleSearchChange = (val: string) => {
    if (isServer) {
      server.onSearchChange(val)
      server.onPageChange(0)
    } else {
      updateSearch(val)
    }
  }

  const handleClearSearch = () => {
    if (isServer) {
      server.onSearchChange('')
      server.onPageChange(0)
    } else {
      updateSearch('')
    }
  }

  const handleFilterChange = (key: string, val: string) => {
    if (isServer) {
      server.onFilterChange?.({ ...activeFilterValues, [key]: val })
      server.onPageChange(0)
    } else {
      updateFilter(key, val)
    }
  }

  const handleRemoveFilter = (key: string, defaultVal: string) => {
    if (isServer) {
      server.onFilterChange?.({ ...activeFilterValues, [key]: defaultVal })
      server.onPageChange(0)
    } else {
      updateFilter(key, defaultVal)
    }
  }

  const handlePageSizeChange = (size: number) => {
    if (isServer) {
      server.onPageSizeChange(size)
    } else {
      updatePageSize(size)
    }
  }

  const handlePageChange = (p: number) => {
    if (isServer) {
      server.onPageChange(p)
    } else {
      setPage(p)
    }
  }

  return (
    <div className='space-y-3.5 w-full min-w-0 max-w-full'>
      {/* ── Toolbar ── */}
      <DataTableToolbar
        hideSearch={hideSearch}
        searchPlaceholder={searchPlaceholder}
        activeSearchValue={activeSearchValue}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        hideFilters={hideFilters}
        filters={filters}
        activeFilterValues={activeFilterValues}
        activeFiltersCount={activeFiltersCount}
        filterSheetOpen={filterSheetOpen}
        onFilterSheetOpenChange={setFilterSheetOpen}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        filterExtra={filterExtra}
        toolbarActions={toolbarActions}
      />

      {/* ── Active Filter Pills / Chips ── */}
      <DataTableActiveFilters
        activeFiltersCount={activeFiltersCount}
        activeSearchValue={activeSearchValue}
        onClearSearch={handleClearSearch}
        filters={filters}
        activeFilterValues={activeFilterValues}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={clearAllFiltersAndSearch}
      />

      {/* ── Table ── */}
      <div
        className={`rounded-lg border overflow-hidden w-full min-w-0 max-w-full${
          isServer && server.isFetching && !loading ? ' opacity-60 pointer-events-none transition-opacity' : ''
        }`}
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
                  <DataTableEmpty
                    isFiltered={isFiltered}
                    activeSearchValue={activeSearchValue}
                    emptyMessage={emptyMessage}
                    onClearAll={clearAllFiltersAndSearch}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {!loading && (isServer ? server.total > 0 : filtered.length > 0) && (
        <DataTablePaginationBar
          from={from}
          to={to}
          totalRows={totalRows}
          activePage={activePage}
          activePageSize={activePageSize}
          totalPages={totalPages}
          pageSizeOptions={pageSizeOptions}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}
