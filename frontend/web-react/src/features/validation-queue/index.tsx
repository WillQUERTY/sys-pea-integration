import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { listValidationQueue, validateProduct, cancelValidationItem, listProducts } from '@/lib/api'
import type { Product, ValidationQueueItem } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DataTable, type DataColumn, type DataFilter } from '@/components/data-table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ValidateProductDialog } from '@/features/products/validate-product-dialog'

const statusFilters: DataFilter[] = [
  {
    key: 'status',
    label: 'Estado',
    defaultValue: 'pending',
    options: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'pending', label: 'Pendientes' },
      { value: 'processed', label: 'Procesados' },
      { value: 'cancelled', label: 'Cancelados' },
    ],
  },
]

export function ValidationQueue() {
  const queryClient = useQueryClient()
  const queue = useQuery({ queryKey: ['validation-queue'], queryFn: listValidationQueue })
  // mapa id→producto para la cola: necesita un catálogo amplio (core en RAM).
  // TODO: exponer el título desde el endpoint de la cola y eliminar este fetch.
  const products = useQuery({ queryKey: ['products', 'catalog'], queryFn: () => listProducts({ limit: 5000 }) })

  // id -> producto completo (el diálogo de validación necesita subtype_id)
  const productsById = useMemo(() => {
    const map = new Map<number, Product>()
    for (const p of products.data?.items ?? []) {
      if (p.id != null) map.set(p.id, p)
    }
    return map
  }, [products.data])

  // Producto en validación a través del diálogo 2024 (exige tipología+categoría)
  const [validatingProduct, setValidatingProduct] = useState<Product | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  // §3.6: un ítem solo se valida en el diálogo (tipología + categoría de
  // calidad), nunca en un clic. Sirve tanto para la fila como para el
  // «siguiente pendiente».
  const openValidation = (item: ValidationQueueItem) =>
    setValidatingProduct(
      productsById.get(item.product_id) ?? {
        id: item.product_id,
        external_code: '',
        title: `Producto #${item.product_id}`,
      }
    )

  const reject = useMutation({
    mutationFn: (id: number) =>
      validateProduct(id, 'rejected', 'Decisión desde la cola de validación'),
    onSuccess: () => {
      toast.success('Producto rechazado')
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al validar'),
  })

  const cancelItem = useMutation({
    mutationFn: (itemId: number) => cancelValidationItem(itemId),
    onSuccess: () => {
      toast.success('Ítem cancelado y retirado de la cola')
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al cancelar'),
  })

  const columns = useMemo<DataColumn<ValidationQueueItem>[]>(() => [
    {
      key: 'id',
      header: '#',
      className: 'w-16',
      cell: (item) => <span className='font-mono text-xs'>{item.id}</span>,
    },
    {
      key: 'product',
      header: 'Producto',
      className: 'max-w-[480px]',
      searchable: (item) => productsById.get(item.product_id)?.title ?? `producto ${item.product_id}`,
      cell: (item) => {
        const prod = productsById.get(item.product_id)
        const isEndorsed = Boolean(
          prod?.evidence?.toLowerCase().includes('avalado') ||
          prod?.evidence?.includes('✓') ||
          (prod?.specialized_attributes && prod.specialized_attributes.includes('"minciencias_endorsed": true'))
        )
        return (
          <div className='flex items-center gap-2'>
            <Link
              to='/products/$id'
              params={{ id: String(item.product_id) }}
              className='block truncate font-medium text-primary hover:underline'
            >
              {prod?.title ?? `Producto #${item.product_id}`}
            </Link>
            {isEndorsed && (
              <Badge
                variant='outline'
                className='shrink-0 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs'
                title='Avalado y validado en la convocatoria previa de Minciencias'
              >
                ✓ Avalado
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      key: 'enqueued_at',
      header: 'Encolado',
      cell: (item) => (
        <span className='text-sm'>
          {item.enqueued_at ? new Date(item.enqueued_at).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (item) =>
        item.status === 'pending' ? (
          <Badge variant='secondary'>Pendiente</Badge>
        ) : item.status === 'cancelled' ? (
          <Badge variant='destructive'>Cancelado</Badge>
        ) : (
          <Badge variant='outline'>{item.status ?? 'procesado'}</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      className: 'text-right',
      cell: (item) =>
        item.status === 'pending' ? (
          <div className='space-x-2 text-right'>
            <Button
              size='sm'
              variant='outline'
              disabled={reject.isPending}
              onClick={() => openValidation(item)}
            >
              Validar
            </Button>
            <Button
              size='sm'
              variant='destructive'
              disabled={reject.isPending}
              onClick={() => reject.mutate(item.product_id)}
            >
              Rechazar
            </Button>
            <Button
              size='sm'
              variant='ghost'
              disabled={cancelItem.isPending}
              onClick={() => cancelItem.mutate(item.id)}
              title='Retirar de la cola sin procesar'
            >
              Cancelar
            </Button>
          </div>
        ) : null,
    },
  ], [productsById, reject.isPending, cancelItem.isPending])

  const pending = (queue.data ?? []).filter((i) => i.status === 'pending')

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
            <h1 className='text-2xl font-bold tracking-tight'>Cola de validación técnica</h1>
            <p className='text-muted-foreground'>
              Estructura FIFO (Requerimiento 13): el primero en entrar es el primero en procesarse.
            </p>
          </div>
          <Button
            onClick={() => {
              const next = pending[0]
              if (next) openValidation(next)
            }}
            disabled={pending.length === 0}
            title='Abre el diálogo de validación del primer ítem pendiente (FIFO); nunca valida en un clic'
          >
            Abrir siguiente pendiente
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Ítems en cola <Badge variant='secondary'>{pending.length} pendientes</Badge>
            </CardTitle>
            <CardDescription>
              Los productos importados por scraping entran aquí con estado «pending».
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={queue.data ?? []}
              loading={queue.isLoading}
              rowKey={(item) => item.id}
              searchPlaceholder='Buscar por título de producto…'
              filters={statusFilters}
              filterFn={(item, f) => f.status === 'all' || (item.status ?? 'pending') === f.status}
              emptyMessage='La cola está vacía.'
              defaultPageSize={20}
            />
          </CardContent>
        </Card>
      </Main>

      <ValidateProductDialog
        open={validatingProduct !== null}
        onOpenChange={(o) => {
          if (!o) setValidatingProduct(null)
        }}
        product={validatingProduct}
      />
    </>
  )
}
