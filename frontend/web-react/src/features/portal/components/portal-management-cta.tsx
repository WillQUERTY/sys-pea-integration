import { Link } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KnowledgeGraph } from '@/components/layout/knowledge-graph'

export function PortalManagementCta() {
  return (
    <div className='relative overflow-hidden rounded-2xl'>
      {/* Fondo esmeralda oscuro */}
      <div className='absolute inset-0 bg-gradient-to-r from-emerald-900 to-emerald-800' />
      {/* Mini grafo de fondo */}
      <div className='absolute inset-0 opacity-25'>
        <KnowledgeGraph className='h-full w-full' />
      </div>
      <div className='relative px-5 sm:px-10 py-7 sm:py-8 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6'>
        <div className='space-y-2 max-w-xl'>
          <div className='flex items-start sm:items-center gap-2'>
            <ShieldCheck className='h-5 w-5 shrink-0 text-amber-400 mt-0.5 sm:mt-0' />
            <h4 className='text-base sm:text-lg font-bold text-white'>Gestión y Validación Institucional</h4>
          </div>
          <p className='text-sm text-emerald-200/75 leading-relaxed'>
            Área técnica para evaluadores y administradores: ingesta de GrupLAC/CvLAC, cola FIFO de validación,
            reclasificación de tipologías y consola de mantenimiento.
          </p>
        </div>
        <Button
          asChild
          className='w-full md:w-auto shrink-0 bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold rounded-full px-7 shadow-lg shadow-amber-500/30 border-0'
        >
          <Link to='/admin'>
            <ShieldCheck className='mr-2 h-4 w-4' /> Ingresar a Gestión
          </Link>
        </Button>
      </div>
    </div>
  )
}
