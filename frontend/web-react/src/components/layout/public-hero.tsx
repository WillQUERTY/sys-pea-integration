import { type LucideIcon, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { KnowledgeGraph } from './knowledge-graph'

interface PublicHeroProps {
  title: string
  subtitle: string
  icon: LucideIcon
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (val: string) => void
  /** Optional filter trigger rendered inline next to the search bar */
  filterSlot?: React.ReactNode
}

export function PublicHero({
  title,
  subtitle,
  icon: Icon,
  searchPlaceholder = 'Buscar...',
  searchValue,
  onSearchChange,
  filterSlot,
}: PublicHeroProps) {
  return (
    <div className='relative overflow-hidden'>
      {/* ── Deep emerald background ── */}
      <div className='absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950' />

      {/* ── Animated knowledge-graph canvas ── */}
      <div className='absolute inset-0'>
        <KnowledgeGraph className='h-full w-full opacity-80' />
      </div>

      {/* ── Vignette fade — 5-stop eased gradient ── */}
      <div
        className='absolute inset-x-0 bottom-0 pointer-events-none h-52'
        style={{
          background:
            'linear-gradient(to top, var(--background) 0%, color-mix(in oklch, var(--background) 92%, transparent) 18%, color-mix(in oklch, var(--background) 70%, transparent) 38%, color-mix(in oklch, var(--background) 35%, transparent) 58%, color-mix(in oklch, var(--background) 10%, transparent) 78%, transparent 100%)',
        }}
      />

      {/* ── Content ── */}
      <div className='relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 flex flex-col items-center text-center'>
        {/* Section pill */}
        <div className='inline-flex items-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white/90 mb-6 shadow-md'>
          <Icon className='mr-2 h-4 w-4 text-amber-400' />
          Directorio de {title}
        </div>

        {/* Headline */}
        <h1 className='text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 drop-shadow-sm'>
          {title}
        </h1>

        {/* Subtitle */}
        <p className='max-w-xl text-base sm:text-lg text-emerald-100/80 mb-10 font-light'>
          {subtitle}
        </p>

        {/* Search + optional Filter trigger */}
        {onSearchChange && (
          <div className='w-full max-w-2xl flex items-center gap-2'>
            {/* Search field */}
            <div className='relative flex-1 group'>
              <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none z-10' />
              <Input
                className={cn(
                  'w-full pl-12 pr-4 py-6 text-base sm:text-lg rounded-full shadow-xl',
                  'bg-white/95 backdrop-blur-sm text-foreground placeholder:text-muted-foreground',
                  'border-0 ring-2 ring-transparent focus-visible:ring-amber-400/60 focus-visible:ring-offset-0',
                  'transition-all duration-300'
                )}
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            {/* Filter button — injected by the parent feature */}
            {filterSlot}
          </div>
        )}
      </div>
    </div>
  )
}
