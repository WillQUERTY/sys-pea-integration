import { Link, useLocation } from '@tanstack/react-router'
import {
  Atom,
  Users,
  UserRound,
  FlaskConical,
  Lightbulb,
  ShieldCheck,
  Menu,
  Home,
} from 'lucide-react'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const navLinks = [
  { title: 'Inicio', href: '/', icon: Home },
  { title: 'Grupos', href: '/groups', icon: Users },
  { title: 'Investigadores', href: '/researchers', icon: UserRound },
  { title: 'Producción Científica', href: '/products', icon: FlaskConical },
  { title: 'Proyectos I+D', href: '/projects', icon: Lightbulb },
]

/**
 * Barra de marca institucional esmeralda, continua en todo el portal público:
 * se funde con el hero en las páginas que lo tienen y queda como banda de
 * identidad sobre el contenido claro de las páginas de detalle.
 */
export function PublicHeader() {
  const { pathname } = useLocation()

  return (
    <header className='sticky top-0 z-50 w-full border-b border-white/10 bg-emerald-900/85 backdrop-blur-md'>
      <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
        {/* Brand / Logo */}
        <Link to='/' className='flex items-center gap-3 transition-opacity hover:opacity-90'>
          <div className='flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-emerald-400 text-primary-foreground shadow-sm shadow-black/20'>
            <Atom className='size-5 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]' />
          </div>
          <div className='flex flex-col text-start leading-tight'>
            <div className='flex items-center gap-2'>
              <span className='font-extrabold tracking-tight text-base text-white'>Khemia</span>
              <span className='rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/90'>
                Ciencia Abierta
              </span>
            </div>
            <span className='text-[11px] font-medium text-emerald-200/80'>
              Universidad Popular del Cesar
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className='hidden md:flex items-center gap-1 lg:gap-2'>
          {navLinks.map(({ title, href, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className={cn('size-4', isActive ? 'text-amber-400' : 'text-emerald-200/60')} />
                <span>{title}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right Actions */}
        <div className='flex items-center gap-2 sm:gap-3'>
          <ThemeSwitch className='text-white/85 hover:bg-white/10' />

          <Button
            asChild
            size='sm'
            variant='outline'
            className='hidden sm:inline-flex items-center gap-2 border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 hover:border-amber-400/60 text-amber-300 transition-all duration-200'
          >
            <Link to='/admin'>
              <ShieldCheck className='size-4 text-amber-400' />
              <span>Gestión Admin</span>
            </Link>
          </Button>

          {/* Mobile Navigation Dropdown */}
          <div className='md:hidden'>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button size='icon' variant='ghost' className='size-9 text-white/85 hover:bg-white/10'>
                  <Menu className='size-4' />
                  <span className='sr-only'>Abrir menú</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56 p-1'>
                {navLinks.map(({ title, href, icon: Icon }) => {
                  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
                  return (
                    <DropdownMenuItem key={href} asChild>
                      <Link
                        to={href}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 cursor-pointer',
                          isActive ? 'bg-primary/10 font-semibold text-primary' : ''
                        )}
                      >
                        <Icon className='size-4' />
                        <span>{title}</span>
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to='/admin'
                    className='flex items-center gap-2.5 px-3 py-2 font-medium text-primary cursor-pointer'
                  >
                    <ShieldCheck className='size-4' />
                    <span>Portal de Gestión</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
