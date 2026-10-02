import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Globe,
  Fingerprint,
  CalendarDays,
  FileText,
  Users,
  UserPlus,
  Trash2,
  Pencil,
} from 'lucide-react'

import {
  getProduct,
  validateProduct,
  enqueueValidation,
  getProductAuthors,
  addProductAuthor,
  removeProductAuthor,
  listResearchers,
  getProductCatalogs,
} from '@/lib/api'

import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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

import { ValidationBadge } from '@/features/groups/detail'
import { ValidateProductDialog } from '@/features/products/validate-product-dialog'
import { ProductFormDialog } from '@/features/products/product-form-dialog'
import { isEndorsed, EndorsedBadge } from '@/features/products/endorsed'

function Field({ label, value, mono = false }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div className='space-y-1'>
      <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  )
}

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

  // Estado del diálogo "Vincular Autor"
  const [authorOpen, setAuthorOpen] = useState(false)
  const [authorSearch, setAuthorSearch] = useState('')
  const [selectedResearcherId, setSelectedResearcherId] = useState<number | null>(null)
  const [authorOrder, setAuthorOrder] = useState('1')
  const [extName, setExtName] = useState('')
  const [extIdentifier, setExtIdentifier] = useState('')
  // Estado del diálogo "Validar" (modelo 2024: exige tipología + categoría)
  const [validateOpen, setValidateOpen] = useState(false)
  // Estado del diálogo "Editar ficha" (reclasificación: tipología/categoría)
  const [editOpen, setEditOpen] = useState(false)

  // Catálogo 2024: resolver familia/tipología/categoría por id
  const { data: catalogs } = useQuery({
    queryKey: ['product-catalogs'],
    queryFn: getProductCatalogs,
  })

  const { data: pickerResults } = useQuery({
    queryKey: ['researchers', 'picker', authorSearch],
    queryFn: () => listResearchers({ search: authorSearch, limit: 8 }),
    enabled: authorOpen,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  const invalidateAuthors = () => {
    queryClient.invalidateQueries({ queryKey: ['products', productId, 'authors'] })
  }

  const linkableResearchers = (pickerResults?.items ?? []).filter(
    (r) => !(authors ?? []).some((a) => a.researcher_id === r.id)
  )
  const selectedResearcher = (pickerResults?.items ?? []).find((r) => r.id === selectedResearcherId)

  const addAuthorMutation = useMutation({
    mutationFn: () =>
      selectedResearcherId
        ? addProductAuthor(productId, {
            researcher_id: selectedResearcherId,
            author_order: Number(authorOrder) || 1,
          })
        : addProductAuthor(productId, {
            external_author_name: extName.trim(),
            external_author_identifier: extIdentifier.trim(),
            author_order: Number(authorOrder) || 1,
          }),
    onSuccess: () => {
      toast.success('Autor vinculado al producto')
      setAuthorOpen(false)
      setSelectedResearcherId(null)
      setAuthorSearch('')
      setExtName('')
      setExtIdentifier('')
      setAuthorOrder('1')
      invalidateAuthors()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al vincular autor'),
  })

  const removeAuthorMutation = useMutation({
    mutationFn: (params: { researcher_id?: number; external_author_name?: string }) =>
      removeProductAuthor(productId, params),
    onSuccess: () => {
      toast.success('Autor desvinculado')
      invalidateAuthors()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al desvincular autor'),
  })

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
            <Link to={isAdmin ? "/admin/products" : "/products"}>Volver a Productos</Link>
          </Button>
        </div>
      </Main>
    )
  }

  const year = product.year ?? (String(product.publication_date ?? product.obtained_date ?? '').slice(0, 4) || null)
  const isValid = (product.validation_status ?? 'pending') === 'valid'

  // Resolución de nombres del catálogo 2024 (los ids crudos no dicen nada)
  const subtype = (catalogs?.subtypes ?? []).find((s) => s.id === product.subtype_id)
  const family = (catalogs?.families ?? []).find(
    (f) => f.id === (product.family_id ?? subtype?.family_id)
  )
  const quality = (catalogs?.quality_categories ?? []).find(
    (c) => c.id === product.quality_category_id
  )
  const labeled = (code?: string | null, name?: string | null) =>
    code && name ? `${code} — ${name}` : (name ?? '—')

  return (
    <>
      {isAdmin && (
        <Header>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
              <Link to={isAdmin ? '/admin/products' : '/products'}>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
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
        {/* Encabezado */}
        <div className='mb-6 rounded-2xl border border-border/50 bg-card p-6 shadow-sm'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div className='flex items-start gap-4'>
              <div className='rounded-xl bg-emerald-500/10 p-3'>
                <BookOpen className='h-6 w-6 text-emerald-500' />
              </div>
              <div>
                <h1 className='text-xl font-bold leading-snug'>{product.title}</h1>
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  <ValidationBadge status={product.validation_status} />
                  {isEndorsed(product) && <EndorsedBadge />}
                  {product.status && <Badge variant='outline'>{product.status}</Badge>}
                  <Badge variant='outline' className='font-mono text-xs text-muted-foreground'>
                    {product.external_code}
                  </Badge>
                </div>
              </div>
            </div>
            <div className='flex shrink-0 flex-wrap gap-2'>
              {isAdmin && (
                <>
                  <Button size='sm' variant='outline' onClick={() => setEditOpen(true)}>
                    <Pencil className='mr-2 h-4 w-4' /> Editar ficha
                  </Button>
                  {!isValid && (
                <>
                  <Button
                    size='sm'
                    onClick={() => setValidateOpen(true)}
                  >
                    <CheckCircle2 className='mr-2 h-4 w-4' /> Validar
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    onClick={() => rejectMutation.mutate()}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className='mr-2 h-4 w-4' /> Rechazar
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => enqueueMutation.mutate()}
                    disabled={enqueueMutation.isPending}
                  >
                    <ClipboardCheck className='mr-2 h-4 w-4' /> Encolar validación
                  </Button>
                </>
              )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          {/* Identificación */}
          <div className='rounded-2xl border border-border/50 bg-card p-6 shadow-sm'>
            <div className='mb-5 flex items-center gap-2'>
              <div className='rounded-lg bg-blue-500/10 p-2'>
                <Fingerprint className='h-4 w-4 text-blue-500' />
              </div>
              <h3 className='text-lg font-semibold'>Identificación</h3>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <Field label='DOI' value={product.doi} mono />
              <Field label='ISBN' value={product.isbn} mono />
              <Field label='ISSN' value={product.issn} mono />
              <Field label='Idioma' value={product.language} />
              <Field label='País' value={product.country} />
              <Field
                label='URL'
                value={
                  product.url ? (
                    <a href={product.url} target='_blank' rel='noreferrer' className='text-primary hover:underline'>
                      Ver recurso
                    </a>
                  ) : null
                }
              />
            </div>
          </div>

          {/* Fechas y clasificación */}
          <div className='rounded-2xl border border-border/50 bg-card p-6 shadow-sm'>
            <div className='mb-5 flex items-center gap-2'>
              <div className='rounded-lg bg-violet-500/10 p-2'>
                <CalendarDays className='h-4 w-4 text-violet-500' />
              </div>
              <h3 className='text-lg font-semibold'>Fechas y Clasificación</h3>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <Field label='Año' value={year} />
              <Field label='Fecha de obtención' value={product.obtained_date} />
              <Field label='Fecha de publicación' value={product.publication_date} />
              <Field
                label='Familia'
                value={family ? labeled(family.code, family.name) : '—'}
              />
              <Field
                label='Tipología 2024'
                value={
                  subtype
                    ? labeled(subtype.code, subtype.name)
                    : 'Sin clasificar (usa «Editar ficha» para reclasificar)'
                }
              />
              <Field
                label='Categoría de calidad'
                value={
                  quality
                    ? `${labeled(quality.code, quality.name)}${
                        quality.weight != null ? ` · peso ${quality.weight}` : ''
                      }`
                    : '—'
                }
              />
            </div>
          </div>

          {/* Autores */}
          <div className='rounded-2xl border border-border/50 bg-card p-6 shadow-sm lg:col-span-2'>
            <div className='mb-5 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='rounded-lg bg-cyan-500/10 p-2'>
                  <Users className='h-4 w-4 text-cyan-500' />
                </div>
                <h3 className='text-lg font-semibold'>Autores</h3>
              </div>
              {isAdmin && (
                <Button size='sm' variant='outline' onClick={() => setAuthorOpen(true)}>
                  <UserPlus className='mr-2 h-4 w-4' /> Vincular Autor
                </Button>
              )}
            </div>
            {!authors || authors.length === 0 ? (
              <p className='text-sm text-muted-foreground'>Sin autores registrados.</p>
            ) : (
              <ul className='divide-y divide-border/50'>
                {authors.map((a) => (
                  <li key={a.id} className='flex items-center justify-between gap-3 py-2'>
                    <div className='flex min-w-0 items-center gap-3'>
                      <Badge variant='outline' className='shrink-0 font-mono text-xs'>
                        #{a.author_order}
                      </Badge>
                      <div className='min-w-0'>
                        {a.researcher_id ? (
                          <Link
                            to={isAdmin ? '/admin/researchers/$id' : '/researchers/$id'}
                            params={{ id: String(a.researcher_id) }}
                            className='truncate text-sm font-medium text-primary hover:underline'
                          >
                            {a.researcher_name.trim() || a.researcher_external_code}
                          </Link>
                        ) : (
                          <p className='truncate text-sm font-medium'>
                            {a.external_author_name}
                            <span className='ml-2 text-xs text-muted-foreground'>(externo)</span>
                          </p>
                        )}
                        <p className='text-xs text-muted-foreground'>
                          {a.researcher_id
                            ? a.researcher_external_code
                            : a.external_author_identifier || a.match_status}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        size='icon'
                        variant='ghost'
                        className='h-8 w-8 shrink-0 text-destructive'
                        disabled={removeAuthorMutation.isPending}
                        onClick={() =>
                          removeAuthorMutation.mutate(
                            a.researcher_id
                              ? { researcher_id: a.researcher_id }
                              : { external_author_name: a.external_author_name }
                          )
                        }
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Descripción */}
          <div className='rounded-2xl border border-border/50 bg-card p-6 shadow-sm lg:col-span-2'>
            <div className='mb-5 flex items-center gap-2'>
              <div className='rounded-lg bg-amber-500/10 p-2'>
                <FileText className='h-4 w-4 text-amber-500' />
              </div>
              <h3 className='text-lg font-semibold'>Descripción y Evidencia</h3>
            </div>
            <div className='space-y-4'>
              <div>
                <p className='mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground'>Descripción</p>
                <p className='whitespace-pre-wrap text-sm text-muted-foreground'>
                  {product.description || 'Sin descripción registrada.'}
                </p>
              </div>
              {product.evidence && (
                <div>
                  <p className='mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground'>Evidencia</p>
                  <p className='whitespace-pre-wrap text-sm text-muted-foreground'>{product.evidence}</p>
                </div>
              )}
              {product.specialized_attributes && (
                <div>
                  <p className='mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                    Atributos especializados
                  </p>
                  <pre className='overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs'>{product.specialized_attributes}</pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {product.url && (
          <div className='mt-6 flex items-center gap-2 text-sm text-muted-foreground'>
            <Globe className='h-4 w-4' />
            <a href={product.url} target='_blank' rel='noreferrer' className='truncate text-primary hover:underline'>
              {product.url}
            </a>
          </div>
        )}

        {/* Diálogo: vincular autor */}
        <Dialog open={authorOpen} onOpenChange={setAuthorOpen}>
          <DialogContent className='sm:max-w-lg'>
            <DialogHeader>
              <DialogTitle>Vincular Autor</DialogTitle>
              <DialogDescription>
                Busca un investigador del sistema o registra un autor externo.
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-2'>
              <div className='grid gap-2'>
                <Label>Investigador del sistema</Label>
                {selectedResearcher ? (
                  <div className='flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm'>
                    <span className='truncate font-medium'>
                      {selectedResearcher.first_names} {selectedResearcher.last_names}
                    </span>
                    <Button type='button' variant='ghost' size='sm' onClick={() => setSelectedResearcherId(null)}>
                      Quitar
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={authorSearch}
                      onChange={(e) => setAuthorSearch(e.target.value)}
                      placeholder='Buscar investigador...'
                    />
                    {authorSearch && (
                      <div className='max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border/50 p-1'>
                        {linkableResearchers.length === 0 ? (
                          <p className='p-2 text-sm text-muted-foreground'>Sin resultados.</p>
                        ) : (
                          linkableResearchers.map((r) => (
                            <button
                              key={r.id}
                              type='button'
                              onClick={() => setSelectedResearcherId(r.id ?? null)}
                              className='w-full truncate rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60'
                            >
                              {r.first_names} {r.last_names}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              {!selectedResearcher && (
                <div className='grid grid-cols-2 gap-4'>
                  <div className='grid gap-2'>
                    <Label>Autor externo (nombre)</Label>
                    <Input
                      value={extName}
                      onChange={(e) => setExtName(e.target.value)}
                      placeholder='Ej: JOHN DOE'
                    />
                  </div>
                  <div className='grid gap-2'>
                    <Label>Identificador externo</Label>
                    <Input
                      value={extIdentifier}
                      onChange={(e) => setExtIdentifier(e.target.value)}
                      placeholder='ORCID, documento...'
                    />
                  </div>
                </div>
              )}
              <div className='grid gap-2'>
                <Label>Orden de autoría</Label>
                <Input
                  type='number'
                  min={1}
                  value={authorOrder}
                  onChange={(e) => setAuthorOrder(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setAuthorOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => addAuthorMutation.mutate()}
                disabled={addAuthorMutation.isPending || (!selectedResearcherId && !extName.trim())}
              >
                {addAuthorMutation.isPending ? 'Vinculando...' : 'Vincular'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
      </Main>
    </>
  )
}
