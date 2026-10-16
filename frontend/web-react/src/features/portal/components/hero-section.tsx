import { useState, useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Compass, Search as SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { KnowledgeGraph } from '@/components/layout/knowledge-graph'
import { cn } from '@/lib/utils'

// ─── Animated counter ─────────────────────────────────────────────────────────
function CountUp({ value, duration = 1100 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{display.toLocaleString()}</>
}

// ─── Hero stat ───────────────────────────────────────────────────────────────
function HeroStat({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <div className='flex flex-col lg:flex-row lg:items-baseline lg:gap-5 lg:py-4 lg:border-b lg:border-white/10 lg:last:border-0'>
      {loading ? (
        <Skeleton className='h-10 w-20 bg-white/15' />
      ) : (
        <span className='text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tabular-nums tracking-tight lg:min-w-[5.5rem]'>
          <CountUp value={value ?? 0} />
        </span>
      )}
      <span className='text-xs sm:text-sm text-emerald-100/70 leading-snug mt-1 lg:mt-0'>{label}</span>
    </div>
  )
}

interface HeroSectionProps {
  totalGroups: number
  totalResearchers: number
  totalProducts: number
  totalProjects: number
  loading: boolean
}

export function HeroSection({
  totalGroups,
  totalResearchers,
  totalProducts,
  totalProjects,
  loading,
}: HeroSectionProps) {
  const navigate = useNavigate()
  const [heroSearch, setHeroSearch] = useState('')

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!heroSearch.trim()) return
    navigate({
      to: '/groups',
      search: { search: heroSearch.trim() } as any,
    })
  }

  return (
    <div className='relative overflow-hidden lg:min-h-[580px] flex flex-col justify-center'>
      {/* Dark emerald background */}
      <div className='absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950' />

      {/* Animated knowledge graph */}
      <div className='absolute inset-0'>
        <KnowledgeGraph className='h-full w-full opacity-70' />
      </div>

      {/* Fade to page body — 5-stop eased gradient */}
      <div
        className='absolute inset-x-0 bottom-0 h-20 sm:h-36 lg:h-56 pointer-events-none'
        style={{
          background:
            'linear-gradient(to top, var(--background) 0%, color-mix(in oklch, var(--background) 92%, transparent) 18%, color-mix(in oklch, var(--background) 70%, transparent) 38%, color-mix(in oklch, var(--background) 35%, transparent) 58%, color-mix(in oklch, var(--background) 10%, transparent) 78%, transparent 100%)',
        }}
      />

      {/* Hero content */}
      <div className='relative mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 pt-10 pb-24 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32'>
        <div className='grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16 lg:items-center'>

          {/* Left: voice + search */}
          <div className='min-w-0'>
            <p className='flex items-center gap-3 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] sm:tracking-[0.22em] text-amber-300/90 mb-5 sm:mb-6'>
              <span className='h-px w-6 sm:w-8 shrink-0 bg-amber-300/70' />
              <span>Khemia · Universidad Popular del Cesar</span>
            </p>

            <h1 className='text-[2.15rem] sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] sm:leading-[1.08] mb-4 sm:mb-5 text-balance'>
              Lo que investiga la UPC,{' '}
              <span className='text-amber-400'>al alcance de todos.</span>
            </h1>

            <p className='text-[15px] sm:text-lg text-emerald-100/75 leading-relaxed mb-7 sm:mb-9 max-w-xl'>
              Conoce a los grupos, las personas y los trabajos que hacen ciencia en la universidad,
              con la categorización oficial de Minciencias a un clic.
            </p>

            {/* Search */}
            <form onSubmit={handleHeroSearch} className='flex flex-col sm:flex-row gap-2.5 max-w-xl mb-6'>
              <div className='relative flex-1'>
                <SearchIcon className='absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground pointer-events-none' />
                <Input
                  type='text'
                  placeholder='Busca un grupo, una persona o un artículo…'
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  className={cn(
                    'pl-12 h-12 text-sm rounded-full shadow-lg',
                    'bg-white/95 border-0 ring-2 ring-transparent focus-visible:ring-amber-400/60',
                    'placeholder:text-muted-foreground text-foreground'
                  )}
                />
              </div>
              <Button
                type='submit'
                className='h-12 w-full sm:w-auto px-7 rounded-full font-semibold bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-lg shadow-amber-500/30 border-0 transition-all duration-200'
              >
                <Compass className='mr-2 h-4 w-4' /> Explorar
              </Button>
            </form>

            {/* Quick links */}
            <div className='flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 text-sm text-emerald-100/80'>
              <span className='w-full sm:w-auto text-emerald-100/50'>O entra directo a</span>
              {[
                { label: 'Grupos', to: '/groups' },
                { label: 'Investigadores', to: '/researchers' },
                { label: 'Publicaciones', to: '/products' },
                { label: 'Proyectos', to: '/projects' },
              ].map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  className='font-medium text-white underline decoration-amber-400/50 underline-offset-4 hover:decoration-amber-400 hover:text-amber-300 transition-colors'
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: stats numbers */}
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-6 border-t border-white/15 pt-7 lg:grid-cols-1 lg:gap-0 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-12'>
            <HeroStat label='grupos de investigación' value={totalGroups} loading={loading} />
            <HeroStat label='investigadores' value={totalResearchers} loading={loading} />
            <HeroStat label='productos científicos' value={totalProducts} loading={loading} />
            <HeroStat label='proyectos de I+D' value={totalProjects} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  )
}
