import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DataTable, type DataColumn } from '@/components/data-table'
import { EntityCombobox, type EntityItem } from '@/components/entity-combobox'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ActionTooltip } from '@/components/action-tooltip'
import { isEndorsed, EndorsedBadge } from '@/features/products/endorsed'
import {
  listProducts,
  linkProduct,
  unlinkProduct,
  getGroupProducts,
  getProductCatalogs,
  type ProductCatalogs,
  type CatalogSubtype,
} from '@/lib/api'
import type { Product } from '@/lib/types'

export function ValidationBadge({ status }: { status?: string | null }) {
  if (status === 'valid') {
    return (
      <Badge variant='outline' className='border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-xs'>
        Validado
      </Badge>
    )
  }
  if (status === 'rejected') {
    return (
      <Badge variant='outline' className='border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold text-xs'>
        Rechazado
      </Badge>
    )
  }
  return (
    <Badge variant='outline' className='border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold text-xs'>
      Pendiente
    </Badge>
  )
}

export interface GroupProductsTabProps {
  groupId: number
  isAdmin?: boolean
  products?: Product[]
  isLoadingProducts?: boolean
  catalogs?: ProductCatalogs
}

export function GroupProductsTab({
  groupId,
  isAdmin = false,
  products: propsProducts,
  isLoadingProducts: propsIsLoadingProducts,
  catalogs: propsCatalogs,
}: GroupProductsTabProps) {
  const queryClient = useQueryClient()

  const { data: fetchedProducts, isLoading: isFetchingProducts } = useQuery({
    queryKey: ['groups', groupId, 'products'],
    queryFn: () => getGroupProducts(groupId),
    enabled: !propsProducts,
  })

  const { data: fetchedCatalogs } = useQuery({
    queryKey: ['products', 'catalogs'],
    queryFn: () => getProductCatalogs(),
    enabled: !propsCatalogs,
  })

  const products = propsProducts ?? fetchedProducts ?? []
  const isLoadingProducts = propsIsLoadingProducts ?? isFetchingProducts
  const catalogs = propsCatalogs ?? fetchedCatalogs

  const subtypeById = useMemo(
    () => new Map<number, CatalogSubtype>((catalogs?.subtypes ?? []).map((s: CatalogSubtype) => [s.id, s])),
    [catalogs]
  )

  // Vinculación de productos
  const [productOpen, setProductOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [unlinkingProduct, setUnlinkingProduct] = useState<Product | null>(null)

  const { data: productResults, isFetching: isSearchingProducts } = useQuery({
    queryKey: ['products', 'picker', productSearch],
    queryFn: () => listProducts({ search: productSearch, limit: 8 }),
    enabled: productOpen,
  })

  const linkableProducts = (productResults?.items ?? []).filter(
    (p) => !(products ?? []).some((gp) => gp.id === p.id)
  )

  const productItems = useMemo<EntityItem[]>(() => {
    return linkableProducts.map((p) => ({
      id: p.id!,
      label: p.title,
      subLabel: `${p.external_code} · ${p.year ?? ''}`.trim(),
    }))
  }, [linkableProducts])

  const linkProdMutation = useMutation({
    mutationFn: () => linkProduct(groupId, selectedProductId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'products'] })
      toast.success('Producto vinculado correctamente')
      setProductOpen(false)
      setSelectedProductId(null)
      setProductSearch('')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al vincular'),
  })

  const unlinkProductMutation = useMutation({
    mutationFn: (productId: number) => unlinkProduct(groupId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'products'] })
      toast.success('Producto desvinculado correctamente')
      setUnlinkingProduct(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al desvincular'),
  })

  const columns: DataColumn<Product>[] = [
    {
      key: 'title',
      header: 'Título',
      cell: (p: Product) => (
        <div className='flex items-center gap-2 max-w-[400px]'>
          <Link
            to={isAdmin ? '/admin/products/$id' : '/products/$id'}
            params={{ id: String(p.id) }}
            className='font-medium text-foreground hover:underline truncate'
            title={p.title}
          >
            {p.title}
          </Link>
          {isEndorsed(p) && <EndorsedBadge />}
        </div>
      ),
    },
    {
      key: 'year',
      header: 'Año',
      cell: (p: Product) => (
        <span className='text-muted-foreground'>
          {p.year ?? (String(p.publication_date ?? '').slice(0, 4) || '-')}
        </span>
      ),
    },
    {
      key: 'subtype',
      header: 'Tipología 2024',
      cell: (p: Product) => {
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
      key: 'status',
      header: 'Estado',
      cell: (p: Product) => <ValidationBadge status={p.validation_status} />,
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            cell: (p: Product) => (
              <ActionTooltip label='Desvincular producto del grupo'>
                <Button variant='ghost' size='icon' onClick={() => setUnlinkingProduct(p)}>
                  <Trash2 className='w-4 h-4 text-red-500' />
                </Button>
              </ActionTooltip>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Productos del Grupo</h3>
        {isAdmin && (
          <Dialog open={productOpen} onOpenChange={setProductOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" /> Vincular Producto
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogTitle>Vincular Producto al Grupo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar Producto Existente</label>
                  <EntityCombobox
                    placeholder="Escribe título del producto..."
                    items={productItems}
                    value={selectedProductId}
                    onChange={setSelectedProductId}
                    onSearchChange={setProductSearch}
                    isLoading={isSearchingProducts}
                    emptyMessage="No se encontraron productos disponibles."
                  />
                </div>
                <Button
                  className="w-full mt-2"
                  disabled={!selectedProductId || linkProdMutation.isPending}
                  onClick={() => linkProdMutation.mutate()}
                >
                  {linkProdMutation.isPending ? 'Vinculando...' : 'Confirmar Vinculación'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <DataTable<Product>
        data={products}
        loading={isLoadingProducts}
        rowKey={(p) => p.id!}
        searchPlaceholder="Buscar producto por título..."
        columns={columns}
      />

      {/* Confirmación: desvincular producto */}
      <ConfirmDialog
        open={unlinkingProduct !== null}
        onOpenChange={(open) => !open && setUnlinkingProduct(null)}
        title="¿Desvincular producto?"
        desc={`¿Estás seguro de que deseas desvincular el producto «${unlinkingProduct?.title ?? ''}» de este grupo?`}
        confirmText="Desvincular"
        cancelBtnText="Cancelar"
        destructive
        isLoading={unlinkProductMutation.isPending}
        handleConfirm={() => {
          if (unlinkingProduct?.id != null) {
            unlinkProductMutation.mutate(unlinkingProduct.id, {
              onSettled: () => setUnlinkingProduct(null),
            })
          }
        }}
      />
    </div>
  )
}
