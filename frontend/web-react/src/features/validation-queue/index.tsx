import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { listValidationQueue, cancelValidationItem } from '@/lib/api'
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
import { isEndorsed, EndorsedBadge } from '@/features/products/endorsed'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ActionTooltip } from '@/components/action-tooltip'

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

  // Estado server-side: búsqueda debounced, página y filtros
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: 'pending',
  })

  const params = useMemo(
    () => ({
      skip: page * pageSize,
      limit: pageSize,
      status: filterValues.status !== 'all' ? filterValues.status : undefined,
      search: debouncedSearch.trim() || undefined,
    }),
    [page, pageSize, debouncedSearch, filterValues]
  )

  // Consulta paginada nativa y enriquecida desde el backend (sin sobrecarga en cliente)
  const queue = useQuery({
    queryKey: ['validation-queue', params],
    queryFn: () => listValidationQueue(params),
    placeholderData: keepPreviousData,
  })

  // Si un procesamiento o filtro deja la página fuera de rango, reajustar
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil((queue.data?.total ?? 0) / pageSize) - 1)
    if (page > maxPage) setPage(maxPage)
  }, [queue.data?.total, pageSize, page])

  // Producto en validación a través del diálogo 2024 (exige tipología+categoría)
  const [validatingProduct, setValidatingProduct] = useState<Product | null>(null)
  const [cancellingItem, setCancellingItem] = useState<ValidationQueueItem | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  // §3.6: un ítem solo se valida en el diálogo (tipología + categoría de
  // calidad), nunca en un clic. Sirve tanto para la fila como para el
  // «siguiente pendiente».
  const openValidation = (item: ValidationQueueItem) =>
    setValidatingProduct(
      item.product ?? {
        id: item.product_id,
        external_code: item.product_external_code ?? '',
        title: item.product_title ?? `Producto #${item.product_id}`,
      }
    )

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
      cell: (item) => {
        const prod = item.product
        const title = item.product_title ?? prod?.title ?? `Producto #${item.product_id}`
        return (
          <div className='flex items-center gap-2'>
            <Link
              to='/admin/products/$id'
              params={{ id: String(item.product_id) }}
              className='block truncate font-medium text-primary hover:underline'
            >
              {title}
            </Link>
            {isEndorsed(prod) && <EndorsedBadge />}
          </div>
        )
      },
    },
    {
      key: 'enqueued_at',
      header: 'Encolado',
      cell: (item) => (
        <span className='whitespace-nowrap text-sm'>
          {item.enqueued_at
            ? new Date(item.enqueued_at).toLocaleString('es-CO', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : '—'}
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
      className: 'w-[1%] whitespace-nowrap text-right',
      cell: (item) =>
        item.status === 'pending' ? (
          <div className='flex items-center justify-end gap-2'>
            <ActionTooltip label='Evaluar producto en el diálogo técnico (validar con tipología/categoría o rechazar con motivo)'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => openValidation(item)}
              >
                Evaluar
              </Button>
            </ActionTooltip>
            <ActionTooltip label='Retirar de la cola sin procesar'>
              <Button
                size='sm'
                variant='ghost'
                disabled={cancelItem.isPending}
                onClick={() => setCancellingItem(item)}
              >
                Retirar
              </Button>
            </ActionTooltip>
          </div>
        ) : null,
    },
  ], [cancelItem.isPending])

  const pendingCount = queue.data?.pending_count ?? 0
  const firstPending = (queue.data?.items ?? []).find((i) => i.status === 'pending')

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
              Estructura FIFO: el primero en entrar es el primero en procesarse.
            </p>
          </div>
          <ActionTooltip label='Abre el diálogo de validación del primer ítem pendiente (FIFO); nunca valida en un clic'>
            <Button
              onClick={() => {
                if (firstPending) openValidation(firstPending)
              }}
              disabled={pendingCount === 0 || !firstPending}
            >
              Abrir siguiente pendiente
            </Button>
          </ActionTooltip>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Ítems en cola <Badge variant='secondary'>{pendingCount} pendientes</Badge>
            </CardTitle>
            <CardDescription>
              Los productos importados por scraping entran aquí con estado «pending».
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={queue.data?.items ?? []}
              loading={queue.isLoading}
              rowKey={(item) => item.id}
              searchPlaceholder='Buscar por título o código de producto…'
              filters={statusFilters}
              emptyMessage='La cola está vacía.'
              pageSizeOptions={[10, 20, 50, 100]}
              server={{
                total: queue.data?.total ?? 0,
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
                isFetching: queue.isFetching,
              }}
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

      <ConfirmDialog
        open={!!cancellingItem}
        onOpenChange={(open) => {
          if (!open) setCancellingItem(null)
        }}
        title={`¿Retirar ítem #${cancellingItem?.id} de la cola?`}
        desc={`El producto «${cancellingItem?.product_title ?? cancellingItem?.product_id}» no será modificado ni evaluado; únicamente se retira de la cola de espera de validación.`}
        confirmText='Retirar de la cola'
        cancelBtnText='Cancelar'
        destructive
        isLoading={cancelItem.isPending}
        handleConfirm={() => {
          if (cancellingItem?.id != null) {
            cancelItem.mutate(cancellingItem.id)
            setCancellingItem(null)
          }
        }}
      />
    </>
  )
}
