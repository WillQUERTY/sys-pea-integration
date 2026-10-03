import { useId, type SVGProps } from 'react'
import { cn } from '@/lib/utils'

/** Nodos (vértices) de la cadena molecular de anillos hexagonales. */
const CHAIN_NODES: [number, number][] = [
  [36, 96], [64, 114],
  [50, 138], [76, 153], [76, 183], [50, 198], [24, 183], [24, 153],
  [50, 232], [76, 247], [76, 277], [50, 292], [24, 277], [24, 247],
  [50, 326], [76, 341], [76, 371], [50, 386], [24, 371], [24, 341],
  [36, 410],
]

/**
 * Logo de Khemia: una K esmeralda con cadena molecular, red de datos
 * dorada y la gema de "oro alquímico". Vectorial, escala sin perder calidad.
 */
export function KhemiaLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  const uid = useId().replace(/:/g, '')
  const id = (name: string) => `kh-${name}-${uid}`
  const url = (name: string) => `url(#${id(name)})`

  return (
    <svg
      viewBox='0 0 380 440'
      xmlns='http://www.w3.org/2000/svg'
      role='img'
      aria-label='Khemia'
      className={cn('h-10 w-auto', className)}
      {...props}
    >
      <title>Khemia</title>
      <defs>
        <linearGradient id={id('stem')} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#1FA374' />
          <stop offset='1' stopColor='#0B5C46' />
        </linearGradient>
        <linearGradient id={id('stem-side')} x1='0' y1='0' x2='1' y2='0'>
          <stop offset='0' stopColor='#0E6F54' />
          <stop offset='1' stopColor='#084535' />
        </linearGradient>
        <linearGradient id={id('arm')} x1='0' y1='1' x2='1' y2='0'>
          <stop offset='0' stopColor='#0F7356' />
          <stop offset='1' stopColor='#27B583' />
        </linearGradient>
        <linearGradient id={id('leg')} x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor='#0A4E3C' />
          <stop offset='1' stopColor='#14855F' />
        </linearGradient>
        <linearGradient id={id('node')} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#F8BE4F' />
          <stop offset='1' stopColor='#D98912' />
        </linearGradient>
        <linearGradient id={id('gem')} x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor='#FFD978' />
          <stop offset='1' stopColor='#D98A0F' />
        </linearGradient>
        <radialGradient id={id('glow')}>
          <stop offset='0' stopColor='#FFF6D6' stopOpacity='1' />
          <stop offset='0.35' stopColor='#FFC94D' stopOpacity='0.7' />
          <stop offset='1' stopColor='#FFB020' stopOpacity='0' />
        </radialGradient>
      </defs>

      {/* Cadena molecular */}
      <g
        fill='none'
        stroke='#136B51'
        strokeWidth='6'
        strokeLinejoin='round'
        strokeLinecap='round'
      >
        <path d='M36 96 L64 114 L50 138' />
        <path d='M50 138 L76 153 L76 183 L50 198 L24 183 L24 153 Z' />
        <path d='M50 198 L50 232' />
        <path d='M50 232 L76 247 L76 277 L50 292 L24 277 L24 247 Z' />
        <path d='M50 292 L50 326' />
        <path d='M50 326 L76 341 L76 371 L50 386 L24 371 L24 341 Z' />
        <path d='M50 386 L36 410' />
        <path d='M76 247 L92 238' />
        <path d='M76 371 L92 380' />
      </g>

      {/* Letra K */}
      <polygon points='80,90 138,90 138,400 80,400' fill={url('stem')} />
      <polygon points='126,96 138,90 138,400 126,400' fill={url('stem-side')} />
      <polygon points='138,228 262,96 318,96 167,257 138,257' fill={url('arm')} />
      <polygon points='138,257 167,257 320,400 250,400 138,295' fill={url('leg')} />
      <polygon points='167,257 320,400 298,400 156,268' fill='#0A4636' opacity='0.55' />
      <polygon points='80,90 88,90 88,400 80,400' fill='#FFFFFF' opacity='0.12' />

      {/* Nodos de la cadena */}
      <g fill='#17936A' stroke='#0B5240' strokeWidth='2'>
        {CHAIN_NODES.map(([x, y]) => (
          <path
            key={`${x}-${y}`}
            d='M0 -7 L6 -3.5 L6 3.5 L0 7 L-6 3.5 L-6 -3.5 Z'
            transform={`translate(${x} ${y})`}
          />
        ))}
      </g>

      {/* Red de datos dorada */}
      <g stroke='#E3A12F' strokeWidth='4' strokeLinecap='round' fill='none'>
        <path d='M96 382 L200 178' />
        <path d='M96 382 L266 158' />
        <path d='M200 178 L214 92' />
        <path d='M200 178 L260 110' />
        <path d='M214 92 L242 62 L260 110' />
        <path d='M214 92 L260 110' />
        <path d='M260 110 L266 158 L312 136 L260 110' />
      </g>
      <circle cx='260' cy='110' r='26' fill={url('glow')} />
      <g fill={url('node')} stroke='#B9710C' strokeWidth='2'>
        <circle cx='96' cy='382' r='8' />
        <circle cx='200' cy='178' r='9' />
        <circle cx='214' cy='92' r='7' />
        <circle cx='242' cy='62' r='6' />
        <circle cx='266' cy='158' r='8' />
        <circle cx='312' cy='136' r='8' />
      </g>
      <circle cx='260' cy='110' r='9' fill='#FFF4CF' stroke='#F2B53A' strokeWidth='2' />

      {/* Gema (oro alquímico) */}
      <circle cx='306' cy='76' r='50' fill={url('glow')} opacity='0.8' />
      <path
        d='M306 44 L334 60 L334 92 L306 108 L278 92 L278 60 Z'
        fill={url('gem')}
        stroke='#B9710C'
        strokeWidth='3'
        strokeLinejoin='round'
      />
      <path
        d='M306 58 L320 66 L320 86 L306 94 L292 86 L292 66 Z'
        fill='#FFE29A'
        stroke='#C98110'
        strokeWidth='2'
        strokeLinejoin='round'
      />
      <g stroke='#C98110' strokeWidth='2' strokeLinecap='round'>
        <path d='M306 44 L306 58' />
        <path d='M334 60 L320 66' />
        <path d='M334 92 L320 86' />
        <path d='M306 108 L306 94' />
        <path d='M278 92 L292 86' />
        <path d='M278 60 L292 66' />
      </g>
      <path d='M296 68 L306 62 L306 74 Z' fill='#FFFFFF' opacity='0.7' />

      {/* Destellos */}
      <g fill='#F5B33A'>
        <circle cx='290' cy='22' r='4' />
        <circle cx='346' cy='38' r='3.5' />
        <circle cx='356' cy='100' r='3' />
        <circle cx='352' cy='64' r='2' />
        <circle cx='268' cy='34' r='2' />
      </g>
    </svg>
  )
}
