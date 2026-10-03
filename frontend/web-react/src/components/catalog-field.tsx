import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Selectores para catálogos de dominio finito (lib/catalogs.ts).
// - CatalogSelect: cerrado, solo valores del catálogo.
// - CatalogCombobox: flexible, sugiere del catálogo pero acepta texto libre.
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
  placeholder,
}: {
  label?: string
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const q = value.trim().toLowerCase()
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q))
    : options

  return (
    <div className='grid gap-2 min-w-0'>
      {label && <Label>{label}</Label>}
      <div className='relative min-w-0'>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          // Pequeña espera para que el click en una sugerencia dispare antes del cierre.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className='min-w-0'
          autoComplete='off'
        />
        {open && filtered.length > 0 && (
          <div className='absolute z-50 top-full mt-1 max-h-40 w-full space-y-1 overflow-y-auto rounded-lg border border-border/50 bg-popover p-1 shadow-md'>
            {filtered.slice(0, 10).map((o) => (
              <button
                key={o}
                type='button'
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(o)
                  setOpen(false)
                }}
                className='w-full truncate rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60'
                title={o}
              >
                {o}
              </button>
            ))}
            {filtered.length > 10 && (
              <p className='px-3 py-1.5 text-center text-xs italic text-muted-foreground'>
                … y {filtered.length - 10} más (escribe para filtrar)
              </p>
            )}
          </div>
        )}
        {open && q && filtered.length === 0 && (
          <div className='absolute z-50 top-full mt-1 w-full rounded-lg border border-border/50 bg-popover p-2 shadow-md'>
            <p className='text-xs text-muted-foreground'>
              Sin coincidencias — se guardará como texto libre.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
