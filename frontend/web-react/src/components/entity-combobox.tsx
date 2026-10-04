import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface EntityItem {
  id: string | number
  label: string
  subLabel?: string | null
  badge?: string | null
}

export interface EntityComboboxProps {
  label?: string
  items: EntityItem[]
  value?: string | number | null
  onChange: (id: any | null) => void
  onSearchChange?: (query: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  isLoading?: boolean
  disabled?: boolean
  className?: string
  allowClear?: boolean
}

/**
 * Combobox accesible de Shadcn (Popover + Command) para selección de entidades
 * como Investigadores, Grupos o Proyectos con búsqueda integrada.
 */
export function EntityCombobox({
  label,
  items,
  value,
  onChange,
  onSearchChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No se encontraron resultados.',
  isLoading = false,
  disabled = false,
  className,
  allowClear = true,
}: EntityComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedItem = useMemo(() => {
    if (value === null || value === undefined || value === '') return null
    return items.find((item) => String(item.id) === String(value)) ?? null
  }, [items, value])

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.subLabel && item.subLabel.toLowerCase().includes(q)) ||
        (item.badge && item.badge.toLowerCase().includes(q))
    )
  }, [items, query])

  const handleSelect = (id: string | number) => {
    if (String(value) === String(id)) {
      if (allowClear) onChange(null)
    } else {
      onChange(id)
    }
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setQuery('')
  }

  return (
    <div className={cn('grid gap-2 min-w-0', className)}>
      {label && <Label>{label}</Label>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal h-10 px-3',
              !selectedItem && 'text-muted-foreground'
            )}
          >
            <div className='flex items-center gap-2 truncate text-left min-w-0 flex-1'>
              <span className='truncate font-medium text-foreground'>
                {selectedItem ? selectedItem.label : placeholder}
              </span>
              {selectedItem?.subLabel && (
                <span className='text-xs text-muted-foreground font-mono truncate hidden sm:inline'>
                  ({selectedItem.subLabel})
                </span>
              )}
            </div>

            <div className='flex items-center gap-1.5 shrink-0 ml-2'>
              {allowClear && selectedItem && !disabled && (
                <span
                  role='button'
                  tabIndex={0}
                  onClick={handleClear}
                  className='rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
                  title='Quitar selección'
                >
                  <X className='h-3.5 w-3.5' />
                </span>
              )}
              <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className='p-0 w-(--radix-popover-trigger-width) min-w-[300px] shadow-xl'
          align='start'
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={(val) => {
                setQuery(val)
                onSearchChange?.(val)
              }}
              placeholder={searchPlaceholder}
            />
            <CommandList className='max-h-60'>
              {isLoading ? (
                <div className='flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground'>
                  <Loader2 className='h-4 w-4 animate-spin text-primary' />
                  <span>Buscando...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredItems.map((item) => {
                    const isSelected = String(item.id) === String(value)
                    return (
                      <CommandItem
                        key={String(item.id)}
                        value={String(item.id)}
                        onSelect={() => handleSelect(item.id)}
                        className='flex items-center justify-between gap-2 py-2 px-2.5 cursor-pointer'
                      >
                        <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                          <Check
                            className={cn(
                              'h-4 w-4 shrink-0 text-primary transition-opacity',
                              isSelected ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className='min-w-0 flex-1 leading-tight'>
                            <p className='truncate text-sm font-medium text-foreground'>
                              {item.label}
                            </p>
                            {item.subLabel && (
                              <p className='truncate text-xs text-muted-foreground font-mono mt-0.5'>
                                {item.subLabel}
                              </p>
                            )}
                          </div>
                        </div>

                        {item.badge && (
                          <Badge
                            variant='secondary'
                            className='text-[10px] shrink-0 font-normal'
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
