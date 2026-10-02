import { Link } from '@tanstack/react-router'
import { Atom, ExternalLink, ShieldCheck } from 'lucide-react'

export function PublicFooter() {
  return (
    <footer className='border-t border-border/40 bg-muted/20 text-muted-foreground'>
      <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 gap-8 md:grid-cols-4'>
          {/* Col 1: Identity */}
          <div className='space-y-4 md:col-span-2'>
            <div className='flex items-center gap-3'>
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs font-bold'>
                <Atom className='size-4.5' />
              </div>
              <div>
                <span className='font-bold text-foreground tracking-tight text-base'>PEA-i</span>
                <span className='ms-2 text-xs font-medium text-muted-foreground'>
                  Universidad Popular del Cesar
                </span>
              </div>
            </div>
            <p className='text-sm text-muted-foreground max-w-md leading-relaxed'>
              Plataforma de Ecosistemas Académicos e Investigación. Sistema institucional de visualización,
              trazabilidad y validación de la producción científica y tecnológica acorde a los lineamientos del
              Modelo de Medición de Grupos de Minciencias.
            </p>
            <div className='text-xs text-muted-foreground pt-1'>
              <span>Vicerrectoría de Investigación y Extensión · Valledupar, Cesar, Colombia</span>
            </div>
          </div>

          {/* Col 2: Exploración */}
          <div className='space-y-3'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-foreground'>
              Exploración Pública
            </h4>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link to='/groups' className='hover:text-primary transition-colors'>
                  Grupos de Investigación
                </Link>
              </li>
              <li>
                <Link to='/researchers' className='hover:text-primary transition-colors'>
                  Directorio de Investigadores
                </Link>
              </li>
              <li>
                <Link to='/products' className='hover:text-primary transition-colors'>
                  Producción Científica
                </Link>
              </li>
              <li>
                <Link to='/projects' className='hover:text-primary transition-colors'>
                  Proyectos de I+D
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Enlaces Institucionales & Admin */}
          <div className='space-y-3'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-foreground'>
              Ecosistema Minciencias
            </h4>
            <ul className='space-y-2 text-sm'>
              <li>
                <a
                  href='https://scienti.minciencias.gov.co'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1.5 hover:text-primary transition-colors'
                >
                  <span>Minciencias Scienti</span>
                  <ExternalLink className='size-3' />
                </a>
              </li>
              <li>
                <a
                  href='https://www.unicesar.edu.co'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1.5 hover:text-primary transition-colors'
                >
                  <span>Portal UPC Institucional</span>
                  <ExternalLink className='size-3' />
                </a>
              </li>
              <li className='pt-2'>
                <Link
                  to='/admin'
                  className='inline-flex items-center gap-1.5 font-medium text-primary hover:underline'
                >
                  <ShieldCheck className='size-3.5' />
                  <span>Portal de Gestión & Validación</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className='mt-10 border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3'>
          <p>© {new Date().getFullYear()} Universidad Popular del Cesar — Todos los derechos reservados.</p>
          <p className='flex items-center gap-2'>
            <span>Datos Abiertos</span>
            <span>·</span>
            <span>Minciencias Modelo 2024</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
