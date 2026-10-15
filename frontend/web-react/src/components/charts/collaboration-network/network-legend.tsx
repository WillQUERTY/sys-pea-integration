import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EDUCATION_COLORS } from '../chart-tokens'

interface NetworkLegendProps {
  showMobile: boolean
  onToggleMobile: () => void
  onCloseMobile: () => void
}

export function NetworkLegend({
  showMobile,
  onToggleMobile,
  onCloseMobile,
}: NetworkLegendProps) {
  return (
    <>
      {/* Botón flotante móvil para Leyenda */}
      <div className='sm:hidden absolute bottom-3 right-3 z-10'>
        <Button
          type='button'
          variant='secondary'
          size='sm'
          className='h-7 px-2 text-[10px] gap-1 shadow-sm bg-background/90 backdrop-blur-xs border border-border/60'
          onClick={onToggleMobile}
        >
          <Info className='h-3 w-3 text-primary' />
          <span>Leyenda</span>
        </Button>
      </div>

      {/* Tarjeta de Leyenda (desktop siempre visible, móvil condicional) */}
      <div
        className={cn(
          'absolute right-3 bg-background/95 backdrop-blur-xs border border-border/60 rounded-md p-2 shadow-sm text-[10px] space-y-1 z-10 transition-all',
          showMobile ? 'block bottom-11' : 'hidden sm:block sm:bottom-3'
        )}
      >
        <div className='flex items-center justify-between gap-2 font-semibold text-muted-foreground mb-1'>
          <div className='flex items-center gap-1'>
            <Info className='h-3 w-3' /> Nivel Formación
          </div>
          {showMobile && (
            <button
              type='button'
              onClick={onCloseMobile}
              className='sm:hidden text-muted-foreground hover:text-foreground text-xs font-bold px-1'
            >
              ×
            </button>
          )}
        </div>
        {Object.entries(EDUCATION_COLORS).map(([lvl, col]) => (
          <div key={lvl} className='flex items-center gap-1.5'>
            <span className='h-2 w-2 rounded-full shrink-0' style={{ backgroundColor: col }} />
            <span className='text-muted-foreground'>{lvl}</span>
          </div>
        ))}
        <div className='pt-1 mt-1 border-t border-border/50 text-muted-foreground/80 leading-tight'>
          Tamaño = productos
          <br />
          Grosor = coautorías
        </div>
      </div>
    </>
  )
}
