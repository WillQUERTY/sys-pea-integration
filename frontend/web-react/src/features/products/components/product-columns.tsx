import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { MoreHorizontal, Pencil, Trash2, ClipboardCheck, RotateCcw } from 'lucide-react'
import type { DataColumn } from '@/components/data-table'
import type { Product } from '@/lib/types'
import type { CatalogSubtype, CatalogQualityCategory } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ValidationBadge } from '@/features/groups/detail'
import { isEndorsed, EndorsedBadge } from '../endorsed'

export interface UseProductColumnsOptions {
  isAdmin?: boolean
  subtypeById: Map<number, CatalogSubtype>
  qualityCategoryById: Map<number, CatalogQualityCategory>
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  onRestore: (id: number) => void
  onEnqueue: (id: number) => void
  isEnqueuePending?: boolean
}

export function useProductColumns({
  isAdmin = false,
  subtypeById,
  qualityCategoryById,
  onEdit,
  onDelete,
  onRestore,
  onEnqueue,
  isEnqueuePending = false,
}: UseProductColumnsOptions): DataColumn<Product>[] {
  return useMemo(() => {
    const columns: DataColumn<Product>[] = [
      {
        key: 'title',
        header: 'Título',
        className: 'max-w-[520px]',
        searchable: (p) => p.title,
        cell: (p) => (
          <div className='flex min-w-0 items-center gap-2'>
            <Link
              to={isAdmin ? '/admin/products/$id' : '/products/$id'}
              params={{ id: String(p.id) }}
              className='block min-w-0 truncate font-medium text-primary hover:underline'
              title={p.title}
            >
              {p.title}
            </Link>
            {isEndorsed(p) && (
              <span className='shrink-0'>
                <EndorsedBadge />
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'year',
        header: 'Año',
        cell: (p) => (
          <span className='text-sm'>
            {p.year ?? (String(p.publication_date ?? '').slice(0, 4) || '—')}
          </span>
        ),
      },
      {
        key: 'subtype',
        header: 'Tipología',
        searchable: (p) => {
          const s = p.subtype_id ? subtypeById.get(p.subtype_id) : undefined
          return s ? `${s.code ?? ''} ${s.name}` : ''
        },
        cell: (p) => {
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
        key: 'quality',
        header: 'Calidad',
        searchable: (p) => {
          const c = p.quality_category_id ? qualityCategoryById.get(p.quality_category_id) : undefined
          return c ? `${c.code ?? ''} ${c.name}` : ''
        },
        cell: (p) => {
          const c = p.quality_category_id ? qualityCategoryById.get(p.quality_category_id) : undefined
          return c ? (
            <Badge variant='secondary' className='font-mono text-xs' title={c.name}>
              {c.code ?? c.name}
            </Badge>
          ) : (
            <span className='text-xs text-muted-foreground'>—</span>
          )
        },
      },
      {
        key: 'doi',
        header: 'DOI',
        className: 'whitespace-nowrap pe-6',
        searchable: (p) => p.doi ?? '',
        cell: (p) =>
          p.doi ? (
            <a
              href={`https://doi.org/${p.doi}`}
              target='_blank'
              rel='noreferrer'
              className='font-mono text-xs hover:underline'
            >
              {p.doi}
            </a>
          ) : (
            <span className='text-muted-foreground'>—</span>
          ),
      },
      {
        key: 'validation',
        header: 'Validación',
        cell: (p) => <ValidationBadge status={p.validation_status} />,
      },
    ]

    if (isAdmin) {
      columns.push({
        key: 'actions',
        header: 'Acciones',
        className: 'w-[1%] whitespace-nowrap text-right',
        cell: (p) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 w-8 p-0'>
                <span className='sr-only'>Abrir menú</span>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => onEdit(p)}>
                <Pencil className='mr-2 h-4 w-4' />
                Editar
              </DropdownMenuItem>
              {(p.validation_status ?? 'pending') !== 'valid' && (
                <DropdownMenuItem
                  onClick={() => p.id != null && onEnqueue(p.id)}
                  disabled={isEnqueuePending}
                >
                  <ClipboardCheck className='mr-2 h-4 w-4' />
                  Encolar validación
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {p.status === 'inactive' ? (
                <DropdownMenuItem onClick={() => p.id != null && onRestore(p.id)}>
                  <RotateCcw className='mr-2 h-4 w-4' />
                  Restaurar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={() => onDelete(p)}
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      })
    }

    return columns
  }, [
    isAdmin,
    subtypeById,
    qualityCategoryById,
    onEdit,
    onDelete,
    onRestore,
    onEnqueue,
    isEnqueuePending,
  ])
}
