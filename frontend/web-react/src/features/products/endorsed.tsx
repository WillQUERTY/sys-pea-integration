import type { Product } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

type EndorsedSource = Pick<Product, 'evidence' | 'specialized_attributes'> | null | undefined

// Aval ✓ del GrupLAC/CvLAC: "avalado y validado para la última Convocatoria
// Nacional". Hoy llega como texto de evidencia y como atributo especializado
// JSON — no como campo propio — así que la detección es por contenido.
export function isEndorsed(p: EndorsedSource): boolean {
  return Boolean(
    p?.evidence?.toLowerCase().includes('avalado') ||
      p?.evidence?.includes('✓') ||
      (p?.specialized_attributes && p.specialized_attributes.includes('"minciencias_endorsed": true'))
  )
}

export function EndorsedBadge() {
  return (
    <Badge
      variant='outline'
      className='shrink-0 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs'
      title='Avalado y validado en la convocatoria previa de Minciencias'
    >
      ✓ Avalado
    </Badge>
  )
}
