import { Link } from '@tanstack/react-router'
import { GraduationCap, Atom, Compass, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ProfileDropdown() {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='h-8 gap-1.5 rounded-full px-2.5 text-xs font-medium border-border/80 hover:bg-muted/80'
          title='Información Institucional PEA-i'
        >
          <GraduationCap className='h-3.5 w-3.5 text-primary' />
          <span className='font-bold text-foreground'>UPC</span>
          <span className='hidden sm:inline text-muted-foreground text-[11px]'>· Abierto</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-72 p-3 shadow-lg' align='end' forceMount>
        <DropdownMenuLabel className='p-0 font-normal'>
          <div className='flex items-start gap-2.5 pb-2'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs'>
              <Atom className='h-4.5 w-4.5' />
            </div>
            <div className='min-w-0 flex-1 leading-tight'>
              <div className='flex items-center gap-1.5'>
                <p className='text-sm font-bold text-foreground'>PEA-i</p>
                <Badge variant='outline' className='text-[10px] border-primary/40 text-primary font-semibold py-0 px-1'>
                  v2.1
                </Badge>
              </div>
              <p className='text-xs text-muted-foreground mt-0.5 truncate'>
                Universidad Popular del Cesar
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <div className='rounded-lg bg-muted/50 p-2.5 my-2 space-y-1.5 text-xs text-muted-foreground'>
          <div className='flex items-center gap-1.5 font-medium text-foreground'>
            <ShieldCheck className='h-3.5 w-3.5 text-emerald-500' />
            <span>Portal Abierto de Investigación</span>
          </div>
          <p className='text-[11px] leading-relaxed'>
            Plataforma pública para la consulta, visibilidad y evaluación de grupos, investigadores y producción científica.
          </p>
        </div>

        <DropdownMenuSeparator />

        <div className='py-1 space-y-0.5'>
          <DropdownMenuItem asChild className='cursor-pointer text-xs'>
            <Link to='/' className='flex items-center gap-2'>
              <Compass className='h-3.5 w-3.5 text-primary' />
              <span>Portal de Inicio</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className='cursor-pointer text-xs'>
            <Link to='/groups' className='flex items-center gap-2'>
              <BookOpen className='h-3.5 w-3.5 text-blue-500' />
              <span>Explorar Grupos Minciencias</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className='cursor-pointer text-xs'>
            <a
              href='https://scienti.minciencias.gov.co'
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center justify-between text-muted-foreground'
            >
              <span>Minciencias Scienti</span>
              <ExternalLink className='h-3 w-3' />
            </a>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
