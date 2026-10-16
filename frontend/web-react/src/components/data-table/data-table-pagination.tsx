import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DataTablePaginationBarProps {
  from: number
  to: number
  totalRows: number
  activePage: number
  activePageSize: number
  totalPages: number
  pageSizeOptions: number[]
  onPageSizeChange: (size: number) => void
  onPageChange: (page: number) => void
}

export function DataTablePaginationBar({
  from,
  to,
  totalRows,
  activePage,
  activePageSize,
  totalPages,
  pageSizeOptions,
  onPageSizeChange,
  onPageChange,
}: DataTablePaginationBarProps) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-3 text-sm'>
      {/* Info */}
      <p className='text-muted-foreground'>
        Mostrando <span className='font-medium text-foreground'>{from}–{to}</span> de{' '}
        <span className='font-medium text-foreground'>{totalRows}</span> resultados
      </p>

      <div className='flex items-center gap-3'>
        {/* Page size selector */}
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground text-xs'>Filas</span>
          <Select
            value={String(activePageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className='h-8 w-[72px] text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page info */}
        <span className='text-muted-foreground text-xs'>
          Pág. {activePage + 1} de {totalPages}
        </span>

        {/* Navigation */}
        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            disabled={activePage === 0}
            onClick={() => onPageChange(0)}
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            disabled={activePage === 0}
            onClick={() => onPageChange(Math.max(0, activePage - 1))}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            disabled={activePage >= totalPages - 1}
            onClick={() => onPageChange(Math.min(totalPages - 1, activePage + 1))}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            disabled={activePage >= totalPages - 1}
            onClick={() => onPageChange(totalPages - 1)}
          >
            <ChevronsRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
