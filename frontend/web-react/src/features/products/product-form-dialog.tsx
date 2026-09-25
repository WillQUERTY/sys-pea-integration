import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createProduct, updateProduct } from '@/lib/api'
import type { Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
}

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const queryClient = useQueryClient()
  const isEditing = !!product

  const [formData, setFormData] = useState<Partial<Product>>({
    title: '',
    external_code: '',
    year: undefined,
    doi: '',
  })

  // Sync state when editing
  useEffect(() => {
    if (product && open) {
      setFormData({
        title: product.title,
        external_code: product.external_code,
        year: product.year ?? (Number(String(product.publication_date ?? '').slice(0, 4)) || undefined),
        doi: product.doi ?? '',
      })
    } else if (open) {
      setFormData({
        title: '',
        external_code: '',
        year: undefined,
        doi: '',
      })
    }
  }, [product, open])

  const mutation = useMutation({
    mutationFn: (data: Partial<Product>) =>
      isEditing ? updateProduct(product.id!, data) : createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
      toast.success(isEditing ? 'Producto actualizado' : 'Producto creado')
      onOpenChange(false)
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Error al guardar el producto')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.external_code) {
      toast.error('Título y Código son obligatorios')
      return
    }
    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
            <DialogDescription>
              Completa la información del producto científico.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='title'>Título del Producto *</Label>
              <Input
                id='title'
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='external_code'>Código *</Label>
                <Input
                  id='external_code'
                  value={formData.external_code}
                  onChange={(e) => setFormData({ ...formData, external_code: e.target.value })}
                  placeholder='Ej: ART-001'
                  required
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='year'>Año</Label>
                <Input
                  id='year'
                  type='number'
                  value={formData.year || ''}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='doi'>DOI</Label>
              <Input
                id='doi'
                value={formData.doi || ''}
                onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                placeholder='Ej: 10.1000/xyz123'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
