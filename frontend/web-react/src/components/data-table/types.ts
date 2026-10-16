import type { ReactNode } from 'react'

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
export interface DataTableProps<T> {
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
