import { useState, useMemo } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MONTH_ABBR = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

export interface MonthPickerProps {
  value?: string | null
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
  className?: string
  id?: string
}

/**
 * Selector de mes y año basado en Popover de Shadcn/UI.
 * Produce y consume cadenas en formato 'YYYY-MM'.
 * Evita la inconsistencia visual de <input type="month"> entre navegadores.
 */
export function MonthPicker({
  value,
  onChange,
  placeholder = 'Seleccionar mes...',
  disabled = false,
  allowClear = true,
  className,
  id,
}: MonthPickerProps) {
  const [open, setOpen] = useState(false)

  // Parsear valor actual (YYYY-MM o 'YYYY - M')
  const parsed = useMemo(() => {
    if (!value) return null
    const match = value.trim().match(/^(\d{4})\s*-\s*(\d{1,2})/)
    if (!match) return null
    const y = parseInt(match[1], 10)
    const m = parseInt(match[2], 10) - 1
    if (m < 0 || m > 11) return null
    return { year: y, month: m }
  }, [value])

  const [viewYear, setViewYear] = useState<number>(() => {
    return parsed?.year ?? new Date().getFullYear()
  })

  // Sincronizar año si cambia el valor externo
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setViewYear(parsed?.year ?? new Date().getFullYear())
    }
    setOpen(isOpen)
  }

  const selectMonth = (monthIndex: number) => {
    const formatted = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`
    onChange(formatted)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    onChange(formatted)
    setOpen(false)
  }

  const displayLabel = useMemo(() => {
    if (!parsed) return null
    return `${MONTH_NAMES[parsed.month]} ${parsed.year}`
  }, [parsed])

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type='button'
          variant='outline'
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal text-left h-10 px-3',
            !displayLabel && 'text-muted-foreground',
            className
          )}
        >
          <span className='flex items-center gap-2 truncate'>
            <CalendarIcon className='h-4 w-4 shrink-0 opacity-60' />
            <span className='truncate'>{displayLabel || placeholder}</span>
          </span>

          <span className='flex items-center gap-1 shrink-0'>
            {allowClear && value && !disabled && (
              <span
                role='button'
                tabIndex={0}
                onClick={handleClear}
                className='rounded-full p-0.5 hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors'
                title='Limpiar fecha'
              >
                <X className='h-3.5 w-3.5' />
              </span>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-64 p-3 shadow-xl' align='start'>
        {/* Encabezado del año */}
        <div className='flex items-center justify-between pb-3 border-b border-border/50'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-7 w-7 rounded-md'
            onClick={() => setViewYear((y) => y - 1)}
          >
            <ChevronLeft className='h-4 w-4' />
            <span className='sr-only'>Año anterior</span>
          </Button>

          <span className='font-bold text-sm tracking-tight text-foreground'>
            {viewYear}
          </span>

          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-7 w-7 rounded-md'
            onClick={() => setViewYear((y) => y + 1)}
          >
            <ChevronRight className='h-4 w-4' />
            <span className='sr-only'>Año siguiente</span>
          </Button>
        </div>

        {/* Cuadrícula de 12 meses */}
        <div className='grid grid-cols-3 gap-1.5 pt-3'>
          {MONTH_ABBR.map((abbr, index) => {
            const isSelected =
              parsed !== null && parsed.year === viewYear && parsed.month === index
            const isCurrent =
              viewYear === currentYear && index === currentMonth

            return (
              <Button
                key={abbr}
                type='button'
                variant={isSelected ? 'default' : 'ghost'}
                size='sm'
                className={cn(
                  'h-9 text-xs font-medium rounded-lg transition-colors',
                  isSelected && 'font-bold shadow-xs',
                  !isSelected && isCurrent && 'border border-primary/40 text-primary font-semibold',
                  !isSelected && !isCurrent && 'hover:bg-muted'
                )}
                onClick={() => selectMonth(index)}
              >
                {abbr}
              </Button>
            )
          })}
        </div>

        {/* Acceso rápido a mes actual */}
        <div className='pt-3 mt-3 border-t border-border/50 flex items-center justify-between'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='text-xs h-7 px-2 text-muted-foreground hover:text-foreground'
            onClick={handleCurrentMonth}
          >
            Mes actual
          </Button>
          {allowClear && value && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='text-xs h-7 px-2 text-destructive hover:text-destructive'
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            >
              Limpiar
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
