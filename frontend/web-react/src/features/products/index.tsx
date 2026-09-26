import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, Trash2, ClipboardCheck } from 'lucide-react'
import { listProducts, deleteProduct, enqueueValidation } from '@/lib/api'
import type { Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
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
    key: 'window',
    label: 'Ventana de observación',
    defaultValue: 'all',
    options: [
      { value: 'all', label: 'Todos los años' },
      { value: '2', label: 'Últimos 2 años' },
      { value: '3', label: 'Últimos 3 años' },
      { value: '5', label: 'Últimos 5 años' },
      { value: '10', label: 'Últimos 10 años' },
    ],
  },
]

function productFilterFn(p: Product, filters: Record<string, string>): boolean {
  // Status filter
  if (filters.status && filters.status !== 'all') {
    const st = p.validation_status ?? 'pending'
    if (st !== filters.status) return false
  }

  // Observation window filter
  if (filters.window && filters.window !== 'all') {
    const windowYears = Number(filters.window)
    const currentYear = new Date().getFullYear()
    const year = p.year ?? (Number(String(p.publication_date ?? '').slice(0, 4)) || 0)
    if (year < currentYear - windowYears) return false
  }

  return true
}

export function Products() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const products = useQuery({
    queryKey: ['products'],
    queryFn: () => listProducts({ limit: 2000 }),
  })

  const delMutation = useMutation({
    mutationFn: (id: number) => deleteProduct(id, true),
    onSuccess: () => {
      toast.success('Producto eliminado (baja lógica)')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
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
      cell: (p) => <span className='block truncate font-medium'>{p.title}</span>,
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
            <DropdownMenuItem
              className='text-destructive focus:text-destructive'
              onClick={() => handleDelete(p.id!)}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [delMutation, enqueueMutation])

  // Filters to exclude inactive products
  const activeProducts = (products.data ?? []).filter(p => p.status !== 'inactive')

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
          data={activeProducts}
          loading={products.isLoading}
          rowKey={(p) => p.id ?? p.external_code}
          searchPlaceholder='Buscar por título o DOI…'
          filters={productFilters}
          filterFn={productFilterFn}
          emptyMessage='Sin productos para los filtros seleccionados o activos.'
          defaultPageSize={20}
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
