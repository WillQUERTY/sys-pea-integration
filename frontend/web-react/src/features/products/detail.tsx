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
} from 'lucide-react'

import { getProduct, validateProduct, enqueueValidation } from '@/lib/api'

import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import { ValidationBadge } from '@/features/groups/detail'

function Field({ label, value, mono = false }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div className='space-y-1'>
      <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  )
}

export function ProductDetail() {
  const { id } = useParams({ from: '/_authenticated/products/$id' })
  const queryClient = useQueryClient()
  const productId = Number(id)

  const { data: product, isLoading } = useQuery({
    queryKey: ['products', productId],
    queryFn: () => getProduct(productId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  const validateMutation = useMutation({
    mutationFn: (status: 'valid' | 'rejected') =>
      validateProduct(productId, status, 'Decisión desde la ficha del producto'),
    onSuccess: (data) => {
      toast.success(`Producto ${data.validation_status === 'valid' ? 'validado' : 'rechazado'}`)
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
        <Header>
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>
        <Main>
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
      <Main>
        <div className='py-20 text-center'>
          <h2 className='text-2xl font-bold'>Producto no encontrado</h2>
          <Button asChild className='mt-4'>
            <Link to='/products'>Volver a Productos</Link>
          </Button>
        </div>
      </Main>
    )
  }

  const year = product.year ?? (String(product.publication_date ?? product.obtained_date ?? '').slice(0, 4) || null)
  const isValid = (product.validation_status ?? 'pending') === 'valid'

  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
            <Link to='/products'>
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

      <Main>
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
                  {product.status && <Badge variant='outline'>{product.status}</Badge>}
                  <Badge variant='outline' className='font-mono text-xs text-muted-foreground'>
                    {product.external_code}
                  </Badge>
                </div>
              </div>
            </div>
            <div className='flex shrink-0 flex-wrap gap-2'>
              {!isValid && (
                <>
                  <Button
                    size='sm'
                    onClick={() => validateMutation.mutate('valid')}
                    disabled={validateMutation.isPending}
                  >
                    <CheckCircle2 className='mr-2 h-4 w-4' /> Validar
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    onClick={() => validateMutation.mutate('rejected')}
                    disabled={validateMutation.isPending}
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
              <Field label='Familia (id)' value={product.family_id} />
              <Field label='Subtipo (id)' value={product.subtype_id} />
              <Field label='Categoría de calidad (id)' value={product.quality_category_id} />
            </div>
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
      </Main>
    </>
  )
}
