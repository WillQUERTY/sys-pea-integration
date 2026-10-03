import { useState } from 'react'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DataFilter } from '@/components/data-table'

interface PublicFilterSheetProps {
  filters: DataFilter[]
  filterValues: Record<string, string>
  onChange: (key: string, value: string) => void
  /** Additional custom filter UI rendered below the standard filters */
  filterExtra?: React.ReactNode
}

/**
 * Panel de filtros del portal público, estilo Minimal:
 * panel neutro, secciones con título y controles como tarjetas blancas.
 */
export function PublicFilterSheet({
  filters,
  filterValues,
  onChange,
  filterExtra,
}: PublicFilterSheetProps) {
  const [open, setOpen] = useState(false)

  const activeCount = filters.filter(
    (f) => filterValues[f.key] && filterValues[f.key] !== (f.defaultValue ?? 'all')
  ).length

  const clearAll = () => {
    for (const f of filters) onChange(f.key, f.defaultValue ?? 'all')
  }

  return (
    <>
      {/* ── Trigger button — placed inside PublicHero via filterSlot ── */}
      <Button
        variant='outline'
        onClick={() => setOpen(true)}
        className='relative h-12 rounded-full border-0 bg-white/95 hover:bg-white px-4 shadow-lg text-foreground shrink-0 transition-all duration-200'
      >
        <SlidersHorizontal className='h-4 w-4 mr-2 text-muted-foreground' />
        <span className='text-sm font-medium'>Filtros</span>
        {activeCount > 0 && (
          <Badge
            variant='default'
            className='absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-amber-500 text-amber-950 border-0'
          >
            {activeCount}
          </Badge>
        )}
      </Button>

      {/* ── Filter Sheet ── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className='flex flex-col gap-0 border-l bg-background p-0 shadow-2xl sm:max-w-sm [&>button]:inset-e-4 [&>button]:top-4 [&>button]:flex [&>button]:size-8 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:opacity-100 [&>button]:hover:bg-muted'>
          {/* Header */}
          <SheetHeader className='flex h-16 shrink-0 flex-row items-center justify-between border-b border-border bg-background py-0 ps-6 pe-14'>
            <div className='flex items-center gap-2.5'>
              <SlidersHorizontal className='h-4.5 w-4.5 text-primary' />
              <SheetTitle className='text-lg font-bold tracking-tight'>Filtros</SheetTitle>
              {activeCount > 0 && (
                <Badge variant='secondary' className='rounded-full text-[11px] font-semibold'>
                  {activeCount} {activeCount === 1 ? 'activo' : 'activos'}
                </Badge>
              )}
            </div>
            {activeCount > 0 && (
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-muted-foreground hover:text-foreground'
                onClick={clearAll}
                title='Restablecer filtros'
              >
                <RotateCcw className='h-4 w-4' />
              </Button>
            )}
          </SheetHeader>

          {/* Body */}
          <div className='flex-1 space-y-7 overflow-y-auto bg-muted px-5 py-6'>
            {filters.map((f) => {
              const currentValue = filterValues[f.key] ?? f.defaultValue ?? 'all'
              // Select para listas largas, lista seleccionable para pocas opciones
              const useSelect = f.options.length > 4

              return (
                <div key={f.key} className='space-y-2.5'>
                  <h4 className='text-sm font-bold text-foreground'>{f.label}</h4>

                  {useSelect ? (
                    <Select value={currentValue} onValueChange={(val) => onChange(f.key, val)}>
                      <SelectTrigger className='h-11 w-full rounded-xl border-border/60 bg-background px-4 text-sm shadow-2xs transition-colors hover:border-border data-[placeholder]:text-muted-foreground'>
                        <SelectValue placeholder={`Seleccionar ${f.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent className='rounded-xl shadow-lg'>
                        {f.options.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className='rounded-lg my-0.5 cursor-pointer'
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <RadioGroup
                      value={currentValue}
                      onValueChange={(val) => onChange(f.key, val)}
                      className='space-y-1'
                    >
                      {f.options.map((opt) => {
                        const id = `public-filter-${f.key}-${opt.value}`
                        const selected = currentValue === opt.value
                        return (
                          <Label
                            key={opt.value}
                            htmlFor={id}
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors',
                              selected
                                ? 'border-primary/40 bg-background font-medium text-foreground shadow-2xs'
                                : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground'
                            )}
                          >
                            <RadioGroupItem value={opt.value} id={id} />
                            <span className='leading-none'>{opt.label}</span>
                          </Label>
                        )
                      })}
                    </RadioGroup>
                  )}
                </div>
              )
            })}

            {/* Filtros personalizados (p. ej. rango de años) */}
            {filterExtra && <div className='pt-1'>{filterExtra}</div>}
          </div>

          {/* Footer */}
          <div className='flex items-center gap-3 border-t border-border bg-background px-5 py-4'>
            <Button
              variant='outline'
              className='h-11 flex-1 rounded-xl'
              onClick={clearAll}
              disabled={activeCount === 0}
            >
              <RotateCcw className='mr-2 h-4 w-4' />
              Restablecer
            </Button>
            <Button
              className='h-11 flex-1 rounded-xl font-semibold'
              onClick={() => setOpen(false)}
            >
              Ver resultados
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
