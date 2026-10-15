import {
  BookOpen,
  Pencil,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ValidationBadge } from '@/features/groups/detail'
import { isEndorsed, EndorsedBadge } from '@/features/products/endorsed'
import type { Product } from '@/lib/types'

interface ProductHeaderProps {
  product: Product
  isAdmin?: boolean
  onEdit: () => void
  onValidate: () => void
  onReject: () => void
  onEnqueue: () => void
  isEnqueuing?: boolean
  isRejecting?: boolean
}

export function ProductHeader({
  product,
  isAdmin = false,
  onEdit,
  onValidate,
  onReject,
  onEnqueue,
  isEnqueuing = false,
  isRejecting = false,
}: ProductHeaderProps) {
  const isValid = (product.validation_status ?? 'pending') === 'valid'

  return (
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
              <Button size='sm' variant='outline' onClick={onEdit}>
                <Pencil className='mr-2 h-4 w-4' /> Editar ficha
              </Button>
              {!isValid && (
                <>
                  <Button size='sm' onClick={onValidate}>
                    <CheckCircle2 className='mr-2 h-4 w-4' /> Validar
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    onClick={onReject}
                    disabled={isRejecting}
                  >
                    <XCircle className='mr-2 h-4 w-4' /> Rechazar
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={onEnqueue}
                    disabled={isEnqueuing}
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
  )
}
