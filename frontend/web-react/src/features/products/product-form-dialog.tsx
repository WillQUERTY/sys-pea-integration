import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createProduct, updateProduct } from '@/lib/api'
import type { Product } from '@/lib/types'
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
}

// Entidad completa: todos los campos editables del producto (backend fusiona
// con el estado previo, pero el formulario siempre envía la ficha completa).
const EMPTY: Partial<Product> = {
  title: '',
  external_code: '',
  year: undefined,
  obtained_date: '',
  publication_date: '',
  doi: '',
  isbn: '',
  issn: '',
  url: '',
  language: '',
  country: '',
  family_id: undefined,
  subtype_id: undefined,
  quality_category_id: undefined,
  description: '',
  evidence: '',
  specialized_attributes: '',
}

function fromProduct(p: Product): Partial<Product> {
  return {
    title: p.title,
    external_code: p.external_code,
    year: p.year ?? (Number(String(p.publication_date ?? '').slice(0, 4)) || undefined),
    obtained_date: p.obtained_date ?? '',
    publication_date: p.publication_date ?? '',
    doi: p.doi ?? '',
    isbn: p.isbn ?? '',
    issn: p.issn ?? '',
    url: p.url ?? '',
    language: p.language ?? '',
    country: p.country ?? '',
    family_id: p.family_id ?? undefined,
    subtype_id: p.subtype_id ?? undefined,
    quality_category_id: p.quality_category_id ?? undefined,
    description: p.description ?? '',
    evidence: p.evidence ?? '',
    specialized_attributes: p.specialized_attributes ?? '',
  }
}

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const queryClient = useQueryClient()
  const isEditing = !!product

  const [formData, setFormData] = useState<Partial<Product>>(EMPTY)

  // Sync state when editing
  useEffect(() => {
    if (product && open) {
      setFormData(fromProduct(product))
    } else if (open) {
      setFormData(EMPTY)
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

  const set = (patch: Partial<Product>) => setFormData({ ...formData, ...patch })
  const numOrUndefined = (v: string) => (v ? Number(v) : undefined)

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
      <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
            <DialogDescription>
              Ficha completa del producto científico.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='title'>Título del Producto *</Label>
              <Input
                id='title'
                value={formData.title ?? ''}
                onChange={(e) => set({ title: e.target.value })}
                required
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='external_code'>Código *</Label>
                <Input
                  id='external_code'
                  value={formData.external_code ?? ''}
                  onChange={(e) => set({ external_code: e.target.value })}
                  placeholder='Ej: ART-001'
                  required
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='year'>Año</Label>
                <Input
                  id='year'
                  type='number'
                  value={formData.year ?? ''}
                  onChange={(e) => set({ year: numOrUndefined(e.target.value) })}
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='obtained_date'>Fecha de obtención</Label>
                <Input
                  id='obtained_date'
                  value={formData.obtained_date ?? ''}
                  onChange={(e) => set({ obtained_date: e.target.value })}
                  placeholder='Ej: 2024-05-10'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='publication_date'>Fecha de publicación</Label>
                <Input
                  id='publication_date'
                  value={formData.publication_date ?? ''}
                  onChange={(e) => set({ publication_date: e.target.value })}
                  placeholder='Ej: 2024-08-01'
                />
              </div>
            </div>

            <div className='grid grid-cols-3 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='doi'>DOI</Label>
                <Input
                  id='doi'
                  value={formData.doi ?? ''}
                  onChange={(e) => set({ doi: e.target.value })}
                  placeholder='10.1000/xyz123'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='isbn'>ISBN</Label>
                <Input
                  id='isbn'
                  value={formData.isbn ?? ''}
                  onChange={(e) => set({ isbn: e.target.value })}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='issn'>ISSN</Label>
                <Input
                  id='issn'
                  value={formData.issn ?? ''}
                  onChange={(e) => set({ issn: e.target.value })}
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='url'>URL</Label>
              <Input
                id='url'
                value={formData.url ?? ''}
                onChange={(e) => set({ url: e.target.value })}
                placeholder='https://...'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='language'>Idioma</Label>
                <Input
                  id='language'
                  value={formData.language ?? ''}
                  onChange={(e) => set({ language: e.target.value })}
                  placeholder='Ej: Español'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='country'>País</Label>
                <Input
                  id='country'
                  value={formData.country ?? ''}
                  onChange={(e) => set({ country: e.target.value })}
                  placeholder='Ej: Colombia'
                />
              </div>
            </div>

            <div className='grid grid-cols-3 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='family_id'>Familia (id)</Label>
                <Input
                  id='family_id'
                  type='number'
                  value={formData.family_id ?? ''}
                  onChange={(e) => set({ family_id: numOrUndefined(e.target.value) })}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='subtype_id'>Subtipo (id)</Label>
                <Input
                  id='subtype_id'
                  type='number'
                  value={formData.subtype_id ?? ''}
                  onChange={(e) => set({ subtype_id: numOrUndefined(e.target.value) })}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='quality_category_id'>Cat. calidad (id)</Label>
                <Input
                  id='quality_category_id'
                  type='number'
                  value={formData.quality_category_id ?? ''}
                  onChange={(e) => set({ quality_category_id: numOrUndefined(e.target.value) })}
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='description'>Descripción</Label>
              <Textarea
                id='description'
                value={formData.description ?? ''}
                onChange={(e) => set({ description: e.target.value })}
                rows={3}
                className='resize-none'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='evidence'>Evidencia</Label>
              <Textarea
                id='evidence'
                value={formData.evidence ?? ''}
                onChange={(e) => set({ evidence: e.target.value })}
                rows={2}
                className='resize-none'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='specialized_attributes'>Atributos especializados (JSON)</Label>
              <Textarea
                id='specialized_attributes'
                value={formData.specialized_attributes ?? ''}
                onChange={(e) => set({ specialized_attributes: e.target.value })}
                rows={2}
                className='resize-none font-mono text-xs'
                placeholder='{"volumen": "12", "paginas": "1-15"}'
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
