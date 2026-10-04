import { useId, type SVGProps } from 'react'
import { cn } from '@/lib/utils'

type Point = readonly [number, number]

const CHAIN_NODES: Point[] = [
  [36, 96],
  [64, 114],
  [50, 138],

  [76, 153],
  [76, 183],
  [50, 198],
  [24, 183],
  [24, 153],

  [50, 232],
  [76, 247],
  [76, 277],
  [50, 292],
  [24, 277],
  [24, 247],

  [50, 326],
  [76, 341],
  [76, 371],
  [50, 386],
  [24, 371],
  [24, 341],

  [36, 410],
]

const DATA_NODES = {
  origin: [96, 382],
  center: [200, 178],
  upperLeft: [214, 92],
  upperTop: [242, 62],
  core: [260, 110],
  lowerRight: [266, 158],
  farRight: [312, 136],
  gemLink: [278, 92],
} satisfies Record<string, Point>

const hexagonPath =
  'M0 -7 L6 -3.5 L6 3.5 L0 7 L-6 3.5 L-6 -3.5 Z'

/**
 * Logo de Khemia.
 *
 * Combina:
 * - Una K esmeralda.
 * - Una cadena molecular.
 * - Una red de datos dorada.
 * - Una gema de oro alquímico.
 */
export function KhemiaLogo({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  const uid = useId().replace(/:/g, '')
  const id = (name: string) => `kh-${name}-${uid}`
  const url = (name: string) => `url(#${id(name)})`

  return (
    <svg
      viewBox='0 0 380 440'
      xmlns='http://www.w3.org/2000/svg'
      role='img'
      aria-labelledby={id('title')}
      className={cn('h-10 w-auto', className)}
      {...props}
    >
      <title id={id('title')}>Khemia</title>

      <defs>
        <linearGradient id={id('stem')} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#1FA374' />
          <stop offset='1' stopColor='#0B5C46' />
        </linearGradient>

        <linearGradient
          id={id('stem-side')}
          x1='0'
          y1='0'
          x2='1'
          y2='0'
        >
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
          <stop offset='0.5' stopColor='#F7B83B' />
          <stop offset='1' stopColor='#D98A0F' />
        </linearGradient>

        <radialGradient id={id('glow')}>
          <stop offset='0' stopColor='#FFF6D6' stopOpacity='1' />
          <stop offset='0.35' stopColor='#FFC94D' stopOpacity='0.7' />
          <stop offset='1' stopColor='#FFB020' stopOpacity='0' />
        </radialGradient>

        <filter
          id={id('node-shadow')}
          x='-50%'
          y='-50%'
          width='200%'
          height='200%'
        >
          <feDropShadow
            dx='0'
            dy='2'
            stdDeviation='2'
            floodColor='#583000'
            floodOpacity='0.3'
          />
        </filter>
      </defs>

      {/*
       * Cadena molecular.
       * Primero se dibujan los enlaces y después los nodos.
       */}
      <g
        fill='none'
        stroke='#136B51'
        strokeWidth='6'
        strokeLinejoin='round'
        strokeLinecap='round'
        vectorEffect='non-scaling-stroke'
      >
        {/* Conector superior */}
        <path d='M36 96 L64 114 L50 138' />

        {/* Primer anillo */}
        <path d='M50 138 L76 153 L76 183 L50 198 L24 183 L24 153 Z' />

        {/* Unión vertical entre anillos */}
        <path d='M50 198 L50 232' />

        {/* Segundo anillo */}
        <path d='M50 232 L76 247 L76 277 L50 292 L24 277 L24 247 Z' />

        {/* Unión física del segundo anillo con la K */}
        <path d='M76 247 L80 247' />

        {/* Segunda unión vertical */}
        <path d='M50 292 L50 326' />

        {/* Tercer anillo */}
        <path d='M50 326 L76 341 L76 371 L50 386 L24 371 L24 341 Z' />

        {/* Unión física del tercer anillo con la K */}
        <path d='M76 371 L80 371' />

        {/* Terminación inferior */}
        <path d='M50 386 L36 410' />
      </g>

      {/* Letra K */}
      <g>
        {/* Tallo principal */}
        <path
          d='M80 90 H138 V400 H80 Z'
          fill={url('stem')}
        />

        {/* Profundidad lateral del tallo */}
        <path
          d='M126 96 L138 90 V400 L126 394 Z'
          fill={url('stem-side')}
        />

        {/* Brazo superior */}
        <path
          d='M138 228 L262 96 H318 L167 257 H138 Z'
          fill={url('arm')}
          stroke='#0A5944'
          strokeWidth='1.5'
          strokeLinejoin='round'
          vectorEffect='non-scaling-stroke'
        />

        {/* Brazo inferior */}
        <path
          d='M138 257 H167 L320 400 H250 L138 295 Z'
          fill={url('leg')}
          stroke='#073E31'
          strokeWidth='1.5'
          strokeLinejoin='round'
          vectorEffect='non-scaling-stroke'
        />

        {/* Sombra del brazo inferior */}
        <path
          d='M167 257 L320 400 H298 L156 268 Z'
          fill='#073B2E'
          opacity='0.48'
        />

        {/* Luz del tallo */}
        <path
          d='M80 90 H88 V400 H80 Z'
          fill='#FFFFFF'
          opacity='0.12'
        />

        {/*
         * Pieza central que disimula la superposición
         * entre el tallo y los brazos.
         */}
        <path
          d='M138 226 L171 257 L138 298 Z'
          fill='#0D684F'
          stroke='#084837'
          strokeWidth='1.5'
          strokeLinejoin='round'
          vectorEffect='non-scaling-stroke'
        />
      </g>

      {/* Nodos de la cadena molecular */}
      <g
        fill='#17936A'
        stroke='#0B5240'
        strokeWidth='2'
        strokeLinejoin='round'
        vectorEffect='non-scaling-stroke'
      >
        {CHAIN_NODES.map(([x, y], index) => (
          <path
            key={`${index}-${x}-${y}`}
            d={hexagonPath}
            transform={`translate(${x} ${y})`}
          />
        ))}
      </g>

      {/*
       * Puntos de anclaje entre la cadena y la K.
       * Estos círculos hacen que la conexión parezca intencional.
       */}
      <g
        fill='#1CA276'
        stroke='#093F31'
        strokeWidth='2'
        vectorEffect='non-scaling-stroke'
      >
        <circle cx='80' cy='247' r='5' />
        <circle cx='80' cy='371' r='5' />
      </g>

      {/*
       * Red de datos.
       *
       * El borde oscuro inferior mejora la lectura de las conexiones
       * cuando atraviesan la K.
       */}
      <g
        fill='none'
        stroke='#70450B'
        strokeWidth='7'
        strokeLinecap='round'
        strokeLinejoin='round'
        opacity='0.28'
        vectorEffect='non-scaling-stroke'
      >
        <path d='M96 382 L200 178 L214 92 L242 62' />
        <path d='M96 382 L266 158 L312 136' />
        <path d='M200 178 L260 110 L266 158' />
        <path d='M214 92 L260 110 L312 136' />
        <path d='M260 110 L278 92' />
      </g>

      <g
        fill='none'
        stroke='#E3A12F'
        strokeWidth='4'
        strokeLinecap='round'
        strokeLinejoin='round'
        vectorEffect='non-scaling-stroke'
      >
        {/* Eje principal */}
        <path d='M96 382 L200 178 L214 92 L242 62' />

        {/* Rama inferior derecha */}
        <path d='M96 382 L266 158 L312 136' />

        {/* Triangulación central */}
        <path d='M200 178 L260 110 L266 158' />
        <path d='M214 92 L260 110' />
        <path d='M214 92 L242 62 L260 110' />

        {/* Triangulación derecha */}
        <path d='M260 110 L266 158 L312 136 Z' />

        {/* Enlace real entre la red y la gema */}
        <path d='M260 110 L278 92' />
      </g>

      {/* Resplandor del núcleo */}
      <circle
        cx={DATA_NODES.core[0]}
        cy={DATA_NODES.core[1]}
        r='28'
        fill={url('glow')}
        pointerEvents='none'
      />

      {/* Nodos dorados */}
      <g
        fill={url('node')}
        stroke='#A96108'
        strokeWidth='2'
        filter={url('node-shadow')}
        vectorEffect='non-scaling-stroke'
      >
        <circle cx='96' cy='382' r='8' />
        <circle cx='200' cy='178' r='9' />
        <circle cx='214' cy='92' r='7' />
        <circle cx='242' cy='62' r='6' />
        <circle cx='266' cy='158' r='8' />
        <circle cx='312' cy='136' r='8' />
        <circle cx='278' cy='92' r='6' />
      </g>

      {/* Núcleo principal de la red */}
      <circle
        cx='260'
        cy='110'
        r='11'
        fill='#FFF4CF'
        stroke='#C77A0C'
        strokeWidth='3'
        vectorEffect='non-scaling-stroke'
      />
      <circle cx='257' cy='107' r='3' fill='#FFFFFF' opacity='0.9' />

      {/* Gema de oro alquímico */}
      <g>
        <circle
          cx='306'
          cy='76'
          r='52'
          fill={url('glow')}
          opacity='0.82'
          pointerEvents='none'
        />

        {/* Cuerpo exterior */}
        <path
          d='M306 44 L334 60 L334 92 L306 108 L278 92 L278 60 Z'
          fill={url('gem')}
          stroke='#A96108'
          strokeWidth='3'
          strokeLinejoin='round'
          vectorEffect='non-scaling-stroke'
        />

        {/* Corazón de la gema */}
        <path
          d='M306 58 L320 66 L320 86 L306 94 L292 86 L292 66 Z'
          fill='#FFE29A'
          stroke='#C98110'
          strokeWidth='2'
          strokeLinejoin='round'
          vectorEffect='non-scaling-stroke'
        />

        {/* Facetas */}
        <g
          fill='none'
          stroke='#C98110'
          strokeWidth='2'
          strokeLinecap='round'
          vectorEffect='non-scaling-stroke'
        >
          <path d='M306 44 L306 58' />
          <path d='M334 60 L320 66' />
          <path d='M334 92 L320 86' />
          <path d='M306 108 L306 94' />
          <path d='M278 92 L292 86' />
          <path d='M278 60 L292 66' />
        </g>

        {/* Reflejo */}
        <path
          d='M295 68 L306 61 L306 75 Z'
          fill='#FFFFFF'
          opacity='0.72'
        />
      </g>

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