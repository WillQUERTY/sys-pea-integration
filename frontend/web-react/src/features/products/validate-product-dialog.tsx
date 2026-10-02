import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { validateProduct, getProductCatalogs } from '@/lib/api'
import type { Product } from '@/lib/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isEndorsed } from '@/features/products/endorsed'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

/** Diálogo de validación con el modelo 2024: marcar como válido exige que el
 * producto tenga tipología y su categoría de calidad (par. 3.6: la categoría
 * determina el peso global). Las categorías se filtran por tipología. */
export function ValidateProductDialog({ open, onOpenChange, product }: Props) {
  const queryClient = useQueryClient()
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setCategoryId(product?.quality_category_id ?? undefined)
      setSearch('')
      setReason('')
      setConfirmRejectOpen(false)
    }
  }, [open, product])

  const { data: catalogs } = useQuery({
    queryKey: ['product-catalogs'],
    queryFn: getProductCatalogs,
    enabled: open,
  })

  const subtype = (catalogs?.subtypes ?? []).find((s) => s.id === product?.subtype_id)
  const family = (catalogs?.families ?? []).find((f) => f.id === subtype?.family_id)
  const categories = (catalogs?.quality_categories ?? []).filter(
    (c) => c.subtype_id === product?.subtype_id
  )
  const filtered = categories.filter((c) =>
    `${c.code ?? ''} ${c.name}`.toLowerCase().includes(search.toLowerCase())
  )
  const selected = categories.find((c) => c.id === categoryId)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  // Rechazar revierte una decisión de validación y deja registro en la
  // auditoría: exigir motivo escrito y confirmación explícita.
  const handleReject = () => {
    if (!reason.trim()) {
      toast.error('Escribe el motivo del rechazo: queda en la auditoría del producto.')
      return
    }
    setConfirmRejectOpen(true)
  }

  const mutation = useMutation({
    // El motivo es libre y queda en la auditoría. Al validar puede ir vacío
    // (se registra el motivo por defecto); al rechazar, handleReject ya
    // exigió texto y confirmación.
    mutationFn: (status: 'valid' | 'rejected') =>
      validateProduct(
        product!.id!,
        status,
        status === 'valid'
          ? reason.trim() || 'Validado con categoría de calidad del modelo 2024'
          : reason.trim(),
        status === 'valid' ? categoryId : undefined
      ),
    onSuccess: (data) => {
      toast.success(`Producto ${data.validation_status === 'valid' ? 'validado' : 'rechazado'}`)
      invalidate()
      onOpenChange(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al validar'),
  })

  if (!product) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Validar producto</DialogTitle>
          <DialogDescription className='line-clamp-2'>{product.title}</DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-2'>
          {isEndorsed(product) && product.evidence && (
            <div className='flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300'>
              <span className='font-semibold'>✓ Aval Minciencias:</span>
              <span className='line-clamp-2'>{product.evidence}</span>
            </div>
          )}

          {family && subtype ? (
            <div className='flex flex-wrap items-center gap-2 text-sm'>
              <span className='text-muted-foreground'>Tipología 2024:</span>
              <Badge variant='outline' className='font-mono text-xs'>
                {family.code ?? family.name}
              </Badge>
              <Badge variant='secondary' className='font-mono text-xs'>
                {subtype.code ?? subtype.name}
              </Badge>
              <span className='text-muted-foreground'>{subtype.name}</span>
            </div>
          ) : (
            <Alert variant='destructive'>
              <AlertTitle>Sin tipología 2024</AlertTitle>
              <AlertDescription>
                Este producto no tiene tipología asignada y no puede validarse. Edítalo y
                clasifícalo primero (Familia → Tipología).
              </AlertDescription>
            </Alert>
          )}

          {family && subtype && (
            <div className='grid gap-2'>
              <Label>Categoría de calidad del modelo 2024 *</Label>
              {selected ? (
                <div className='flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm'>
                  <span className='min-w-0 truncate'>
                    <span className='font-mono text-xs text-muted-foreground'>{selected.code}</span>{' '}
                    {selected.name}
                    {selected.weight != null && (
                      <span className='text-xs text-muted-foreground'> · peso {selected.weight}</span>
                    )}
                  </span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => setCategoryId(undefined)}
                  >
                    Quitar
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Buscar categoría (código o nombre)...'
                  />
                  {search && (
                    <div className='max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/50 p-1'>
                      {filtered.length === 0 ? (
                        <p className='p-2 text-sm text-muted-foreground'>Sin resultados.</p>
                      ) : (
                        filtered.map((c) => (
                          <button
                            key={c.id}
                            type='button'
                            onClick={() => {
                              setCategoryId(c.id)
                              setSearch('')
                            }}
                            className='w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60'
                          >
                            <span className='font-mono text-xs text-muted-foreground'>{c.code}</span>{' '}
                            {c.name}
                            {c.weight != null && (
                              <span className='text-xs text-muted-foreground'> · peso {c.weight}</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
              <p className='text-xs text-muted-foreground'>
                Solo se listan las categorías de la tipología {subtype.code ?? subtype.name} (la
                categoría determina el peso global del producto).
              </p>
            </div>
          )}

          <div className='grid gap-2'>
            <Label htmlFor='validation-reason'>Motivo</Label>
            <Textarea
              id='validation-reason'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='Ej.: producción verificable en CvLAC por todos los autores…'
              className='min-h-[70px]'
            />
            <p className='text-xs text-muted-foreground'>
              Obligatorio al rechazar. Queda en la auditoría del producto.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            type='button'
            variant='destructive'
            disabled={mutation.isPending}
            onClick={handleReject}
          >
            Rechazar
          </Button>
          <Button
            type='button'
            disabled={mutation.isPending || !subtype || !categoryId}
            onClick={() => mutation.mutate('valid')}
          >
            {mutation.isPending ? 'Validando...' : 'Validar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmRejectOpen}
      onOpenChange={setConfirmRejectOpen}
      title='¿Rechazar este producto?'
      desc={`El producto pasará a estado rechazado. Motivo registrado: "${reason.trim()}". Esta decisión quedará asentada en la auditoría del producto.`}
      confirmText='Confirmar rechazo'
      cancelBtnText='Cancelar'
      destructive
      isLoading={mutation.isPending}
      handleConfirm={() => {
        setConfirmRejectOpen(false)
        mutation.mutate('rejected')
      }}
    />
    </>
  )
}
