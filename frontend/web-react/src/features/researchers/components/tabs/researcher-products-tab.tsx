import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type DataColumn, type DataFilter } from '@/components/data-table'
import { ActionTooltip } from '@/components/action-tooltip'
import { isEndorsed, EndorsedBadge } from '@/features/products/endorsed'
import { ValidationBadge } from '@/features/groups/detail'
import {
  getResearcherProducts,
  getProductCatalogs,
  type ProductCatalogs,
  type CatalogSubtype,
} from '@/lib/api'
import type { Product } from '@/lib/types'

const productStatusFilters: DataFilter[] = [
  {
    key: 'status',
    label: 'Estado de validación',
    defaultValue: 'all',
    options: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'valid', label: 'Validados' },
      { value: 'pending', label: 'Pendientes' },
      { value: 'rejected', label: 'Rechazados' },
    ],
  },
]

interface ResearcherProductsTabProps {
  researcherId: number
  isAdmin?: boolean
  products?: Product[]
  isLoadingProducts?: boolean
  catalogs?: ProductCatalogs
}

export function ResearcherProductsTab({
  researcherId,
  isAdmin = false,
  products: propsProducts,
  isLoadingProducts: propsIsLoadingProducts,
  catalogs: propsCatalogs,
}: ResearcherProductsTabProps) {
  const { data: fetchedProducts, isLoading: isFetchingProducts } = useQuery({
    queryKey: ['researcher-products', researcherId],
    queryFn: () => getResearcherProducts(researcherId),
    enabled: !propsProducts,
  })

  const { data: fetchedCatalogs } = useQuery({
    queryKey: ['product-catalogs'],
    queryFn: getProductCatalogs,
    enabled: !propsCatalogs,
  })

  const products = propsProducts ?? fetchedProducts ?? []
  const isLoadingProducts = propsIsLoadingProducts ?? isFetchingProducts
  const catalogs = propsCatalogs ?? fetchedCatalogs

  const subtypeById = useMemo(
    () => new Map<number, CatalogSubtype>((catalogs?.subtypes ?? []).map((s: CatalogSubtype) => [s.id, s])),
    [catalogs]
  )

  const columns: DataColumn<Product>[] = [
    {
      key: 'title',
      header: 'Título del Producto',
      searchable: (p: Product) => p.title,
      className: 'max-w-[420px]',
      cell: (p: Product) => (
        <div className='flex items-center gap-2'>
          <Link
            to={isAdmin ? '/admin/products/$id' : '/products/$id'}
            params={{ id: String(p.id) }}
            className='block truncate font-medium text-sm text-primary hover:underline'
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
        <span className='text-sm text-muted-foreground'>
          {p.year ?? (String(p.publication_date ?? '').slice(0, 4) || '—')}
        </span>
      ),
    },
    {
      key: 'subtype',
      header: 'Tipología 2024',
      searchable: (p: Product) => {
        const s = p.subtype_id ? subtypeById.get(p.subtype_id) : undefined
        return s ? `${s.code ?? ''} ${s.name}` : ''
      },
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
    {
      key: 'actions',
      header: '',
      cell: (p: Product) => (
        <div className='flex items-center justify-end'>
          <ActionTooltip label="Ver detalle del producto">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full">
              <Link
                to={isAdmin ? '/admin/products/$id' : '/products/$id'}
                params={{ id: String(p.id) }}
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Link>
            </Button>
          </ActionTooltip>
        </div>
      ),
    },
  ]

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
      <h3 className="font-semibold text-lg mb-4">Productos del Investigador</h3>
      <DataTable<Product>
        columns={columns}
        data={products}
        loading={isLoadingProducts}
        rowKey={(p: Product) => p.id!}
        emptyMessage="Este investigador no tiene productos asociados."
        searchPlaceholder="Buscar productos por título..."
        filters={productStatusFilters}
        filterFn={(p: Product, filterValues) => {
          if (filterValues.status && filterValues.status !== 'all') {
            if (p.validation_status !== filterValues.status) return false
          }
          return true
        }}
      />
    </div>
  )
}
