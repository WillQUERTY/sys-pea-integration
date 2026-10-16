import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FlaskConical } from 'lucide-react'
import {
  listProducts,
  deleteProduct,
  enqueueValidation,
  restoreProduct,
  getProductCatalogs,
  listGroups,
} from '@/lib/api'
import type { Product } from '@/lib/types'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { DataTable } from '@/components/data-table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PublicHero } from '@/components/layout/public-hero'
import { PublicFilterSheet } from '@/components/layout/public-filter-sheet'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ProductFormDialog } from './product-form-dialog'
import {
  buildProductFilters,
  ProductCustomWindowFilter,
  useProductColumns,
  ProductAdminHeader,
} from './components'

export function Products({ isAdmin = false }: { isAdmin?: boolean }) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  // Estado server-side: búsqueda (debounced), página y filtros
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: 'all',
    record_status: 'active',
    window: 'all',
    family: 'all',
    subtype: 'all',
    group: 'all',
    classification: 'all',
  })
  // Ventana personalizada (Req. 10): rango explícito desde–hasta
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Catálogo 2024: columnas Tipología/Calidad y opciones del filtro de familia y subtipo.
  const { data: catalogs } = useQuery({
    queryKey: ['product-catalogs'],
    queryFn: getProductCatalogs,
  })
  // Grupos para el filtro de grupo de investigación
  const { data: groups } = useQuery({
    queryKey: ['groups-for-products-filter'],
    queryFn: () => listGroups({ limit: 200 }),
  })

  const subtypeById = useMemo(
    () => new Map((catalogs?.subtypes ?? []).map((s) => [s.id, s])),
    [catalogs]
  )
  const qualityCategoryById = useMemo(
    () => new Map((catalogs?.quality_categories ?? []).map((c) => [c.id, c])),
    [catalogs]
  )

  const productFilters2024 = useMemo(
    () =>
      buildProductFilters({
        catalogs,
        groups,
        selectedFamily: filterValues.family,
      }),
    [catalogs, groups, filterValues.family]
  )

  const params = useMemo(
    () => ({
      skip: page * pageSize,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      validation_status: filterValues.status !== 'all' ? filterValues.status : undefined,
      status: filterValues.record_status !== 'all' ? filterValues.record_status : undefined,
      family_id: filterValues.family !== 'all' ? Number(filterValues.family) : undefined,
      subtype_id: filterValues.subtype !== 'all' ? Number(filterValues.subtype) : undefined,
      group_id: filterValues.group !== 'all' ? Number(filterValues.group) : undefined,
      unclassified: filterValues.classification === 'unclassified' || undefined,
      window_years:
        filterValues.window !== 'all' && filterValues.window !== 'custom'
          ? Number(filterValues.window)
          : undefined,
      start_year:
        filterValues.window === 'custom' ? Number(customStart) || undefined : undefined,
      end_year: filterValues.window === 'custom' ? Number(customEnd) || undefined : undefined,
    }),
    [page, pageSize, debouncedSearch, filterValues, customStart, customEnd]
  )

  const products = useQuery({
    queryKey: ['products', 'list', params],
    queryFn: () => listProducts(params),
    placeholderData: keepPreviousData,
  })

  // Si un delete/restauración deja la última página vacía, volver a una página válida
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil((products.data?.total ?? 0) / pageSize) - 1)
    if (page > maxPage) setPage(maxPage)
  }, [products.data?.total, pageSize, page])

  const delMutation = useMutation({
    mutationFn: (id: number) => deleteProduct(id, true),
    onSuccess: () => {
      toast.success('Producto eliminado (baja lógica)')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreProduct(id),
    onSuccess: () => {
      toast.success('Producto restaurado')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al restaurar'),
  })

  const enqueueMutation = useMutation({
    mutationFn: (id: number) => enqueueValidation(id),
    onSuccess: (data) => {
      toast.success(`Producto encolado para validación (cola: ${data.queue_size})`)
      queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al encolar'),
  })

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormOpen(true)
  }

  const columns = useProductColumns({
    isAdmin,
    subtypeById,
    qualityCategoryById,
    onEdit: handleEdit,
    onDelete: setDeletingProduct,
    onRestore: (id) => restoreMutation.mutate(id),
    onEnqueue: (id) => enqueueMutation.mutate(id),
    isEnqueuePending: enqueueMutation.isPending,
  })

  const filterExtraContent =
    filterValues.window === 'custom' ? (
      <ProductCustomWindowFilter
        customStart={customStart}
        customEnd={customEnd}
        onStartChange={(val) => {
          setCustomStart(val)
          setPage(0)
        }}
        onEndChange={(val) => {
          setCustomEnd(val)
          setPage(0)
        }}
      />
    ) : undefined

  return (
    <>
      {isAdmin && (
        <Header>
          <Search />
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>
      )}

      {!isAdmin && (
        <PublicHero
          title='Producción Científica'
          subtitle='Explora los productos científicos publicados.'
          icon={FlaskConical}
          searchPlaceholder='Buscar por título o código…'
          searchValue={search}
          onSearchChange={setSearch}
          filterSlot={
            <PublicFilterSheet
              filters={productFilters2024}
              filterValues={filterValues}
              onChange={(key, val) => {
                setFilterValues((p) => ({ ...p, [key]: val }))
                setPage(0)
              }}
              filterExtra={filterExtraContent}
            />
          }
        />
      )}

      <Main publicWidth={!isAdmin}>
        {isAdmin && (
          <ProductAdminHeader
            onAddProduct={() => {
              setEditingProduct(null)
              setFormOpen(true)
            }}
          />
        )}

        <DataTable
          columns={columns}
          hideSearch={!isAdmin}
          hideFilters={!isAdmin}
          data={products.data?.items ?? []}
          loading={products.isLoading}
          rowKey={(p) => p.id ?? p.external_code}
          searchPlaceholder='Buscar por título o DOI…'
          filters={productFilters2024}
          filterExtra={filterExtraContent}
          onClearFilters={() => {
            setCustomStart('')
            setCustomEnd('')
          }}
          emptyMessage='Sin productos para los filtros seleccionados o activos.'
          server={{
            total: products.data?.total ?? 0,
            pageIndex: page,
            pageSize,
            onPageChange: setPage,
            onPageSizeChange: (ps) => {
              setPageSize(ps)
              setPage(0)
            },
            searchValue: search,
            onSearchChange: (v) => {
              setSearch(v)
              setPage(0)
            },
            filterValues,
            onFilterChange: (v) => {
              setFilterValues(v)
              setPage(0)
            },
            isFetching: products.isFetching,
          }}
        />
      </Main>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
      />

      <ConfirmDialog
        open={!!deletingProduct}
        onOpenChange={(open) => {
          if (!open) setDeletingProduct(null)
        }}
        title={`¿Eliminar producto «${deletingProduct?.title}»?`}
        desc='Se desactiva el registro del producto (baja lógica). Sus vínculos con grupos e investigadores NO se eliminan; los registros asociados quedan preservados en el sistema.'
        confirmText='Eliminar producto'
        cancelBtnText='Cancelar'
        destructive
        isLoading={delMutation.isPending}
        handleConfirm={() => {
          if (deletingProduct?.id != null) {
            delMutation.mutate(deletingProduct.id)
            setDeletingProduct(null)
          }
        }}
      />
    </>
  )
}
