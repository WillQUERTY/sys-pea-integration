import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Selectores para catálogos de dominio finito (lib/catalogs.ts).
// - CatalogSelect: cerrado, solo valores del catálogo (shadcn Select).
// - CatalogCombobox: flexible, sugiere del catálogo pero acepta texto libre
//   (shadcn Combobox: Popover + Command).
// Ambos respetan el valor actual aunque no esté en la lista (datos históricos
// importados de GrupLAC que no matchean el catálogo, p.ej. clasificaciones
// concatenadas del importador).

const NONE = '__none__'

/**
 * Fechas históricas del importador: membresías vienen como 'YYYY-MM-DD' y la
 * conformación de grupos como 'YYYY - M'. Los inputs type="month" necesitan
 * 'YYYY-MM'; esta normalización evita que se vacíen al abrir el formulario.
 */
export function toMonthInput(v: string | null | undefined): string {
  if (!v) return ''
  const m = v.trim().match(/^(\d{4})\s*-\s*(\d{1,2})/)
  if (!m) return v
  return `${m[1]}-${m[2].padStart(2, '0')}`
}

export function CatalogSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  allowClear = true,
}: {
  label?: string
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  allowClear?: boolean
}) {
  // Si el valor actual no está en el catálogo (dato histórico), se muestra
  // como opción adicional para no ocultarlo ni perderlo al abrir el form.
  const known = options.includes(value)
  return (
    <div className='grid gap-2'>
      {label && <Label>{label}</Label>}
      <Select
        value={value || NONE}
        onValueChange={(v) => onChange(v === NONE ? '' : v)}
      >
        <SelectTrigger className='w-full'>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowClear && <SelectItem value={NONE}>— Sin especificar —</SelectItem>}
          {!known && value && (
            <SelectItem value={value}>{value} (actual)</SelectItem>
          )}
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function CatalogCombobox({
  label,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  emptyMessage = 'Sin coincidencias — se guardará como texto libre.',
}: {
  label?: string
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  emptyMessage?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className='grid gap-2 min-w-0'>
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <span className='truncate'>{value || placeholder}</span>
            <ChevronsUpDown className='ms-2 size-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='p-0'
          align='start'
          style={{ width: 'max(var(--radix-popover-trigger-width), 12rem)' }}
        >
          <Command>
            {/* Input controlado por el valor del form: lo que se escribe ES
                el valor, así el texto libre (fuera de catálogo) se conserva. */}
            <CommandInput
              value={value}
              onValueChange={onChange}
              placeholder='Escribe para filtrar...'
            />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o}
                    value={o}
                    onSelect={() => {
                      onChange(o)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn('size-4', o === value ? 'opacity-100' : 'opacity-0')}
                    />
                    {o}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
