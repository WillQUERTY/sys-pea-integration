import { SearchX, Inbox, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DataTableEmptyProps {
  isFiltered: boolean
  activeSearchValue: string
  emptyMessage?: string
  onClearAll: () => void
}

export function DataTableEmpty({
  isFiltered,
  activeSearchValue,
  emptyMessage = 'No hay resultados.',
  onClearAll,
}: DataTableEmptyProps) {
  return (
    <div className='flex flex-col items-center justify-center p-4 text-center'>
      {isFiltered ? (
        <>
          <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400'>
            <SearchX className='h-6 w-6' />
          </div>
          <p className='text-sm font-semibold text-foreground'>
            No se encontraron coincidencias
          </p>
          <p className='mt-1 max-w-sm text-xs text-muted-foreground'>
            {activeSearchValue.trim()
              ? `Ningún registro coincide con "${activeSearchValue.trim()}" o con los filtros seleccionados.`
              : 'Ningún registro coincide con los filtros aplicados.'}
          </p>
          <Button
            variant='outline'
            size='sm'
            className='mt-4 h-8 gap-1.5 rounded-lg text-xs font-medium'
            onClick={onClearAll}
          >
            <RotateCcw className='h-3.5 w-3.5' />
            Limpiar búsqueda y filtros
          </Button>
        </>
      ) : (
        <>
          <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground/80 ring-1 ring-border/50'>
            <Inbox className='h-6 w-6' />
          </div>
          <p className='text-sm font-semibold text-foreground'>
            {emptyMessage || 'No hay registros disponibles'}
          </p>
          <p className='mt-1 max-w-sm text-xs text-muted-foreground'>
            Actualmente no existen elementos para mostrar en esta tabla.
          </p>
        </>
      )}
    </div>
  )
}
