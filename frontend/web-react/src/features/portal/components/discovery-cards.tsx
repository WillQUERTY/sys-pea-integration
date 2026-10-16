import { Link } from '@tanstack/react-router'
import {
  FlaskConical,
  UserRound,
  Users,
  Lightbulb,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TINTS = {
  emerald: {
    box: 'bg-emerald-500/[0.07] border-emerald-500/15 hover:border-emerald-500/40 hover:bg-emerald-500/[0.12]',
    icon: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  violet: {
    box: 'bg-violet-500/[0.07] border-violet-500/15 hover:border-violet-500/40 hover:bg-violet-500/[0.12]',
    icon: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  },
  blue: {
    box: 'bg-sky-500/[0.07] border-sky-500/15 hover:border-sky-500/40 hover:bg-sky-500/[0.12]',
    icon: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
  amber: {
    box: 'bg-amber-500/[0.08] border-amber-500/20 hover:border-amber-500/45 hover:bg-amber-500/[0.14]',
    icon: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  },
} as const

function DiscoveryCard({
  title,
  description,
  icon,
  tint,
  to,
  label,
  note,
}: {
  title: string
  description: string
  icon: React.ReactNode
  tint: keyof typeof TINTS
  to: string
  label: string
  note?: string
}) {
  const t = TINTS[tint]
  return (
    <Link
      to={to}
      className={cn(
        'group flex flex-col rounded-2xl sm:rounded-3xl border p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1',
        t.box
      )}
    >
      <div className={cn('flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl', t.icon)}>
        {icon}
      </div>
      <h3 className='mt-3 sm:mt-5 text-[15px] sm:text-lg font-bold tracking-tight leading-snug text-foreground'>
        {title}
      </h3>
      <p className='hidden sm:block mt-2 text-sm text-muted-foreground leading-relaxed flex-1'>
        {description}
      </p>
      {note && <p className='mt-1.5 sm:mt-3 text-[11px] sm:text-xs font-medium text-foreground/70'>{note}</p>}
      <span className='mt-auto pt-3 sm:pt-5 inline-flex items-center text-xs sm:text-sm font-semibold text-foreground'>
        <span className='hidden sm:inline'>{label}</span>
        <span className='sm:hidden'>Entrar</span>
        <ArrowRight className='ml-1.5 sm:ml-2 h-4 w-4 transition-transform group-hover:translate-x-1.5' />
      </span>
    </Link>
  )
}

interface DiscoveryCardsSectionProps {
  a1Count?: number
  orcidCount?: number
  hasResearchers?: boolean
  validationRate?: string
  hasValidProducts?: boolean
}

export function DiscoveryCardsSection({
  a1Count,
  orcidCount,
  hasResearchers,
  validationRate,
  hasValidProducts,
}: DiscoveryCardsSectionProps) {
  return (
    <section className='space-y-5 sm:space-y-6'>
      <div className='max-w-xl'>
        <h2 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
          ¿Por dónde quieres empezar?
        </h2>
        <p className='text-sm text-muted-foreground mt-1.5'>
          Cada puerta lleva a una parte distinta de la ciencia que se hace en la UPC.
        </p>
      </div>
      <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:pb-6 lg:[&>*:nth-child(even)]:translate-y-6'>
        <DiscoveryCard
          title='Grupos de investigación'
          description='Las unidades que investigan en la universidad, con sus líneas de trabajo y su categoría Minciencias.'
          icon={<Users className='h-5 w-5' />}
          tint='emerald'
          to='/groups'
          label='Ver los grupos'
          note={a1Count ? `${a1Count} en categoría A1` : undefined}
        />
        <DiscoveryCard
          title='Investigadores'
          description='Docentes, líderes de grupo y autores: quiénes son y en qué proyectos y publicaciones participan.'
          icon={<UserRound className='h-5 w-5' />}
          tint='violet'
          to='/researchers'
          label='Conocer a las personas'
          note={orcidCount !== undefined && hasResearchers ? `${orcidCount} con ORCID` : undefined}
        />
        <DiscoveryCard
          title='Producción científica'
          description='Artículos, libros, capítulos, software y patentes publicados por los grupos.'
          icon={<FlaskConical className='h-5 w-5' />}
          tint='blue'
          to='/products'
          label='Explorar el catálogo'
          note={hasValidProducts ? `${validationRate}% verificada` : undefined}
        />
        <DiscoveryCard
          title='Proyectos de I+D'
          description='Iniciativas en marcha, planes de trabajo y transferencia de conocimiento al territorio.'
          icon={<Lightbulb className='h-5 w-5' />}
          tint='amber'
          to='/projects'
          label='Ver los proyectos'
        />
      </div>
    </section>
  )
}
