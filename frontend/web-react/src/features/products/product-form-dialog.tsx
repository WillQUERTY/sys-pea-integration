import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createProduct, updateProduct, getProductCatalogs } from '@/lib/api'
import type { Product } from '@/lib/types'
import { LANGUAGES, COUNTRIES } from '@/lib/catalogs'
import { CatalogCombobox } from '@/components/catalog-field'
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

// Selector con búsqueda sobre un catálogo (familia / subtipo / categoría).
function CatalogPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ id: number; name: string }>
  value?: number
  onChange: (id: number | undefined) => void
}) {
  const [search, setSearch] = useState('')
  const selected = options.find((o) => o.id === value)
  const filtered = options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className='grid gap-2 min-w-0'>
      <Label>{label}</Label>
      {selected ? (
        <div className='flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm min-w-0'>
          <span className='min-w-0 flex-1 truncate font-medium text-foreground' title={selected.name}>
            {selected.name}
          </span>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-7 shrink-0 px-2 text-xs hover:bg-destructive/10 hover:text-destructive'
            onClick={() => onChange(undefined)}
          >
            Quitar
          </Button>
        </div>
      ) : (
        <div className='relative min-w-0'>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Buscar en el catálogo...'
            className='min-w-0'
          />
          {search && (
            <div className='absolute z-50 w-full mt-1 top-full max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border/50 bg-popover p-1 shadow-md'>
              {filtered.length === 0 ? (
                <p className='p-2 text-sm text-muted-foreground'>Sin resultados.</p>
              ) : (
                <>
                  {filtered.slice(0, 8).map((o) => (
                    <button
                      key={o.id}
                      type='button'
                      onClick={() => {
                        onChange(o.id)
                        setSearch('')
                      }}
                      className='w-full truncate rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60'
                      title={o.name}
                    >
                      {o.name}
                    </button>
                  ))}
                  {filtered.length > 8 && (
                    <p className='px-3 py-1.5 text-center text-xs italic text-muted-foreground'>
                      … y {filtered.length - 8} más coincidencias (escribe para filtrar)
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const queryClient = useQueryClient()
  const isEditing = !!product

  const [formData, setFormData] = useState<Partial<Product>>(EMPTY)

  // Catálogos desde SQL Server para los selectores (en vez de ids a ciegas).
  const { data: catalogs } = useQuery({
    queryKey: ['product-catalogs'],
    queryFn: getProductCatalogs,
    enabled: open,
  })
  const availableSubtypes = (catalogs?.subtypes ?? []).filter(
    (s) => !formData.family_id || s.family_id === formData.family_id
  )
  // Modelo 2024: la categoría pertenece a una tipología (par. 3.6). Sin
  // tipología seleccionada no hay categorías; en el fallback C++ (filas sin
  // subtype_id) se degrada mostrando todas.
  const catsHaveSubtype = (catalogs?.quality_categories ?? []).some((c) => c.subtype_id != null)
  const availableCategories = (catalogs?.quality_categories ?? []).filter((c) =>
    !catsHaveSubtype || c.subtype_id === formData.subtype_id
  )
  const withCode = (code: string | null | undefined, name: string) =>
    code ? `${code} — ${name}` : name

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
      <DialogContent className='sm:max-w-2xl max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] overflow-y-auto p-0 gap-0'>
        <form onSubmit={handleSubmit} className='flex flex-col'>
          <DialogHeader className='px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b shrink-0'>
            <DialogTitle>{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
            <DialogDescription>
              Ficha completa del producto científico.
            </DialogDescription>
          </DialogHeader>

          <div className='px-4 sm:px-6 py-4 space-y-4'>
            <div className='grid gap-2'>
              <Label htmlFor='title'>Título del Producto *</Label>
              <Input
                id='title'
                value={formData.title ?? ''}
                onChange={(e) => set({ title: e.target.value })}
                required
              />
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
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

            {/* Las fechas reales importadas de GrupLAC son solo el año
                (verificado en BD: len=4 en todos los registros), así que el
                control es de año, no de fecha completa. */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='obtained_date'>Año de obtención</Label>
                <Input
                  id='obtained_date'
                  type='number'
                  min={1900}
                  max={2100}
                  value={formData.obtained_date ?? ''}
                  onChange={(e) => set({ obtained_date: e.target.value })}
                  placeholder='Ej: 2024'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='publication_date'>Año de publicación</Label>
                <Input
                  id='publication_date'
                  type='number'
                  min={1900}
                  max={2100}
                  value={formData.publication_date ?? ''}
                  onChange={(e) => set({ publication_date: e.target.value })}
                  placeholder='Ej: 2024'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
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

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <CatalogCombobox
                label='Idioma'
                options={LANGUAGES}
                value={formData.language ?? ''}
                onChange={(v) => set({ language: v })}
                placeholder='Ej: Español'
              />
              <CatalogCombobox
                label='País'
                options={COUNTRIES}
                value={formData.country ?? ''}
                onChange={(v) => set({ country: v })}
                placeholder='Ej: Colombia'
              />
            </div>

            {/* Clasificación Minciencias 2024 */}
            <div className='space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4'>
              <div className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Clasificación Minciencias 2024
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <CatalogPicker
                  label='Familia'
                  options={(catalogs?.families ?? []).map((f) => ({
                    id: f.id,
                    name: withCode(f.code, f.name),
                  }))}
                  value={formData.family_id ?? undefined}
                  onChange={(id) =>
                    set({ family_id: id, subtype_id: undefined, quality_category_id: undefined })
                  }
                />
                <CatalogPicker
                  label='Tipología 2024'
                  options={availableSubtypes.map((s) => ({
                    id: s.id,
                    name: withCode(s.code, s.name),
                  }))}
                  value={formData.subtype_id ?? undefined}
                  onChange={(id) => set({ subtype_id: id, quality_category_id: undefined })}
                />
              </div>

              <div className='grid gap-2 min-w-0'>
                <CatalogPicker
                  label='Categoría de calidad'
                  options={availableCategories.map((c) => ({
                    id: c.id,
                    name: withCode(c.code, c.name),
                  }))}
                  value={formData.quality_category_id ?? undefined}
                  onChange={(id) => set({ quality_category_id: id })}
                />
                {!formData.subtype_id && catsHaveSubtype && (
                  <p className='text-xs text-muted-foreground'>
                    Selecciona primero la tipología: las categorías dependen de ella.
                  </p>
                )}
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

          <DialogFooter className='px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/20 shrink-0 flex flex-col-reverse sm:flex-row gap-2'>
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
