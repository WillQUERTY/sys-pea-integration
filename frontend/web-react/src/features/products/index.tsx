import { useState, useMemo, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, Trash2, ClipboardCheck, RotateCcw } from 'lucide-react'
import { listProducts, deleteProduct, enqueueValidation, restoreProduct, getProductCatalogs } from '@/lib/api'
import type { Product } from '@/lib/types'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable, type DataColumn, type DataFilter } from '@/components/data-table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ValidationBadge } from '@/features/groups/detail'
import { ProductFormDialog } from './product-form-dialog'

const productFilters: DataFilter[] = [
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
]

export function Products() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

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
  })
  // Ventana personalizada (Req. 10): rango explícito desde–hasta
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Catálogo 2024: columna Tipología y opciones del filtro de familia.
  const { data: catalogs } = useQuery({
    queryKey: ['product-catalogs'],
    queryFn: getProductCatalogs,
  })
  const subtypeById = useMemo(
    () => new Map((catalogs?.subtypes ?? []).map((s) => [s.id, s])),
    [catalogs]
  )
  const productFilters2024 = useMemo<DataFilter[]>(
    () => [
      ...productFilters,
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
    ],
    [catalogs]
  )

  const params = useMemo(
    () => ({
      skip: page * pageSize,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      validation_status: filterValues.status !== 'all' ? filterValues.status : undefined,
      status: filterValues.record_status !== 'all' ? filterValues.record_status : undefined,
      family_id: filterValues.family !== 'all' ? Number(filterValues.family) : undefined,
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

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      delMutation.mutate(id)
    }
  }

  const columns = useMemo<DataColumn<Product>[]>(() => [
    {
      key: 'title',
      header: 'Título',
      className: 'max-w-[520px]',
      searchable: (p) => p.title,
      cell: (p) => (
        <Link
          to='/products/$id'
          params={{ id: String(p.id) }}
          className='block truncate font-medium text-primary hover:underline'
        >
          {p.title}
        </Link>
      ),
    },
    {
      key: 'year',
      header: 'Año',
      cell: (p) => (
        <span className='text-sm'>
          {p.year ?? (String(p.publication_date ?? '').slice(0, 4) || '—')}
        </span>
      ),
    },
    {
      key: 'subtype',
      header: 'Tipología',
      searchable: (p) => {
        const s = p.subtype_id ? subtypeById.get(p.subtype_id) : undefined
        return s ? `${s.code ?? ''} ${s.name}` : ''
      },
      cell: (p) => {
        const s = p.subtype_id ? subtypeById.get(p.subtype_id) : undefined
        return s ? (
          <Badge variant='outline' className='font-mono text-xs' title={s.name}>
            {s.code ?? s.name}
          </Badge>
        ) : (
          <span className='text-xs text-muted-foreground'>sin clasificar</span>
        )
      },
    },
    {
      key: 'doi',
      header: 'DOI',
      searchable: (p) => p.doi ?? '',
      cell: (p) =>
        p.doi ? (
          <a
            href={`https://doi.org/${p.doi}`}
            target='_blank'
            rel='noreferrer'
            className='font-mono text-xs hover:underline'
          >
            {p.doi}
          </a>
        ) : (
          <span className='text-muted-foreground'>—</span>
        ),
    },
    {
      key: 'validation',
      header: 'Validación',
      cell: (p) => <ValidationBadge status={p.validation_status} />,
    },
    {
      key: 'actions',
      header: '',
      cell: (p) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='h-8 w-8 p-0'>
              <span className='sr-only'>Abrir menú</span>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => handleEdit(p)}>
              <Pencil className='mr-2 h-4 w-4' />
              Editar
            </DropdownMenuItem>
            {(p.validation_status ?? 'pending') !== 'valid' && (
              <DropdownMenuItem
                onClick={() => enqueueMutation.mutate(p.id!)}
                disabled={enqueueMutation.isPending}
              >
                <ClipboardCheck className='mr-2 h-4 w-4' />
                Encolar validación
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {p.status === 'inactive' ? (
              <DropdownMenuItem onClick={() => restoreMutation.mutate(p.id!)}>
                <RotateCcw className='mr-2 h-4 w-4' />
                Restaurar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => handleDelete(p.id!)}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [delMutation, restoreMutation, enqueueMutation, subtypeById])

  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Productos científicos</h1>
            <p className='text-muted-foreground'>
              Catálogo de productos con ventana de observación dinámica (Requerimiento 10).
            </p>
          </div>
          <Button onClick={() => { setEditingProduct(null); setFormOpen(true) }}>
            <Plus className='mr-2 h-4 w-4' /> Agregar Producto
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={products.data?.items ?? []}
          loading={products.isLoading}
          rowKey={(p) => p.id ?? p.external_code}
          searchPlaceholder='Buscar por título o DOI…'
          filters={productFilters2024}
          filterExtra={
            filterValues.window === 'custom' ? (
              <div className='space-y-1.5'>
                <label className='text-sm font-semibold text-foreground/80'>
                  Ventana personalizada (año desde – hasta)
                </label>
                <div className='grid grid-cols-2 gap-3'>
                  <Input
                    type='number'
                    inputMode='numeric'
                    placeholder='Desde (ej. 2019)'
                    value={customStart}
                    onChange={(e) => {
                      setCustomStart(e.target.value)
                      setPage(0)
                    }}
                  />
                  <Input
                    type='number'
                    inputMode='numeric'
                    placeholder='Hasta (ej. 2023)'
                    value={customEnd}
                    onChange={(e) => {
                      setCustomEnd(e.target.value)
                      setPage(0)
                    }}
                  />
                </div>
                {customStart && customEnd && Number(customStart) > Number(customEnd) && (
                  <p className='text-xs font-medium text-destructive'>
                    ⚠️ El año inicial ({customStart}) no puede ser mayor que el año final ({customEnd}).
                  </p>
                )}
                <p className='text-xs text-muted-foreground'>
                  Filtra por año de obtención del producto (Requerimiento 10).
                </p>
              </div>
            ) : undefined
          }
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
    </>
  )
}
