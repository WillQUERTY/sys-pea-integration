import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

import {
  getProduct,
  validateProduct,
  enqueueValidation,
  getProductAuthors,
  getProductCatalogs,
} from '@/lib/api'

import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ActionTooltip } from '@/components/action-tooltip'
import { ConfirmDialog } from '@/components/confirm-dialog'

import { ValidateProductDialog } from '@/features/products/validate-product-dialog'
import { ProductFormDialog } from '@/features/products/product-form-dialog'

import {
  ProductHeader,
  ProductInfoCards,
  ProductAuthorsCard,
} from './components'

export function ProductDetail({ isAdmin = false }: { isAdmin?: boolean }) {
  const { id } = useParams({ strict: false }) as any
  const queryClient = useQueryClient()
  const productId = Number(id)

  const { data: product, isLoading } = useQuery({
    queryKey: ['products', productId],
    queryFn: () => getProduct(productId),
  })

  const { data: authors } = useQuery({
    queryKey: ['products', productId, 'authors'],
    queryFn: () => getProductAuthors(productId),
  })

  const { data: catalogs } = useQuery({
    queryKey: ['product-catalogs'],
    queryFn: getProductCatalogs,
  })

  // Diálogos modales
  const [validateOpen, setValidateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  const rejectMutation = useMutation({
    mutationFn: () =>
      validateProduct(productId, 'rejected', 'Decisión desde la ficha del producto'),
    onSuccess: () => {
      toast.success('Producto rechazado')
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al validar'),
  })

  const enqueueMutation = useMutation({
    mutationFn: () => enqueueValidation(productId),
    onSuccess: (data) => {
      toast.success(`Producto encolado para validación (${data.queue_size} en cola)`)
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al encolar'),
  })

  if (isLoading) {
    return (
      <>
        {isAdmin && (
          <Header>
            <div className='ms-auto flex items-center space-x-4'>
              <ThemeSwitch />
              <ConfigDrawer />
              <ProfileDropdown />
            </div>
          </Header>
        )}
        <Main className={!isAdmin ? 'max-w-5xl mx-auto p-0 sm:p-6 w-full' : undefined}>
          <div className='space-y-6'>
            <Skeleton className='h-32 w-full rounded-xl' />
            <Skeleton className='h-[300px] w-full rounded-xl' />
          </div>
        </Main>
      </>
    )
  }

  if (!product) {
    return (
      <Main className={!isAdmin ? 'max-w-5xl mx-auto p-0 sm:p-6 w-full' : undefined}>
        <div className='py-20 text-center'>
          <h2 className='text-2xl font-bold'>Producto no encontrado</h2>
          <Button asChild className='mt-4'>
            <Link to={isAdmin ? '/admin/products' : '/products'}>Volver a Productos</Link>
          </Button>
        </div>
      </Main>
    )
  }

  return (
    <>
      {isAdmin && (
        <Header>
          <div className='flex items-center gap-4'>
            <ActionTooltip label='Volver a productos'>
              <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
                <Link to={isAdmin ? '/admin/products' : '/products'}>
                  <ArrowLeft className='h-4 w-4' />
                </Link>
              </Button>
            </ActionTooltip>
            <h1 className='text-sm font-medium'>Ficha del Producto</h1>
          </div>
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>
      )}

      <Main className={!isAdmin ? 'max-w-5xl mx-auto p-0 sm:p-6 w-full' : undefined}>
        {/* Encabezado con estado y acciones */}
        <ProductHeader
          product={product}
          isAdmin={isAdmin}
          onEdit={() => setEditOpen(true)}
          onValidate={() => setValidateOpen(true)}
          onReject={() => setConfirmRejectOpen(true)}
          onEnqueue={() => enqueueMutation.mutate()}
          isEnqueuing={enqueueMutation.isPending}
          isRejecting={rejectMutation.isPending}
        />

        {/* Ficha técnica y clasificación */}
        <ProductInfoCards product={product} catalogs={catalogs} />

        {/* Sección de autores */}
        <div className='mt-6'>
          <ProductAuthorsCard
            productId={productId}
            authors={authors}
            isAdmin={isAdmin}
          />
        </div>

        {/* Diálogo: validar con categoría de calidad 2024 (exige tipología) */}
        <ValidateProductDialog
          open={validateOpen}
          onOpenChange={setValidateOpen}
          product={product}
        />

        {/* Diálogo: editar ficha (reclasificación tipología/categoría) */}
        <ProductFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          product={product}
        />

        {/* Confirmación: rechazar producto */}
        <ConfirmDialog
          open={confirmRejectOpen}
          onOpenChange={setConfirmRejectOpen}
          title="¿Rechazar este producto?"
          desc="El estado de validación del producto cambiará a «Rechazado». Podrás reclasificarlo o volver a validarlo más adelante."
          confirmText="Rechazar producto"
          cancelBtnText="Cancelar"
          destructive
          isLoading={rejectMutation.isPending}
          handleConfirm={() => {
            rejectMutation.mutate(undefined, {
              onSettled: () => setConfirmRejectOpen(false),
            })
          }}
        />
      </Main>
    </>
  )
}
