import React from 'react'
import {
  Fingerprint,
  CalendarDays,
  FileText,
  Globe,
} from 'lucide-react'
import type { Product } from '@/lib/types'
import type { ProductCatalogs } from '@/lib/api'

function Field({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className='space-y-1'>
      <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  )
}

interface ProductInfoCardsProps {
  product: Product
  catalogs?: ProductCatalogs
}

export function ProductInfoCards({ product, catalogs }: ProductInfoCardsProps) {
  const year =
    product.year ??
    (String(product.publication_date ?? product.obtained_date ?? '').slice(0, 4) || null)

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
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        {/* Identificación */}
        <div className='rounded-2xl border border-border/50 bg-card p-6 shadow-sm'>
          <div className='mb-5 flex items-center gap-2'>
            <div className='rounded-lg bg-blue-500/10 p-2'>
              <Fingerprint className='h-4 w-4 text-blue-500' />
            </div>
            <h3 className='text-lg font-semibold'>Identificación</h3>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <Field label='DOI' value={product.doi} mono />
            <Field label='ISBN' value={product.isbn} mono />
            <Field label='ISSN' value={product.issn} mono />
            <Field label='Idioma' value={product.language} />
            <Field label='País' value={product.country} />
            <Field
              label='URL'
              value={
                product.url ? (
                  <a
                    href={product.url}
                    target='_blank'
                    rel='noreferrer'
                    className='text-primary hover:underline'
                  >
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
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
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

        {/* Descripción y Evidencia */}
        <div className='rounded-2xl border border-border/50 bg-card p-6 shadow-sm lg:col-span-2'>
          <div className='mb-5 flex items-center gap-2'>
            <div className='rounded-lg bg-amber-500/10 p-2'>
              <FileText className='h-4 w-4 text-amber-500' />
            </div>
            <h3 className='text-lg font-semibold'>Descripción y Evidencia</h3>
          </div>
          <div className='space-y-4'>
            <div>
              <p className='mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                Descripción
              </p>
              <p className='whitespace-pre-wrap text-sm text-muted-foreground'>
                {product.description || 'Sin descripción registrada.'}
              </p>
            </div>
            {product.evidence && (
              <div>
                <p className='mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                  Evidencia
                </p>
                <p className='whitespace-pre-wrap text-sm text-muted-foreground'>
                  {product.evidence}
                </p>
              </div>
            )}
            {product.specialized_attributes && (
              <div>
                <p className='mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                  Atributos especializados
                </p>
                <pre className='overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs'>
                  {product.specialized_attributes}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {product.url && (
        <div className='mt-6 flex items-center gap-2 text-sm text-muted-foreground'>
          <Globe className='h-4 w-4' />
          <a
            href={product.url}
            target='_blank'
            rel='noreferrer'
            className='truncate text-primary hover:underline'
          >
            {product.url}
          </a>
        </div>
      )}
    </>
  )
}
