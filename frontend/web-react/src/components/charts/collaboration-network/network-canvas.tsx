import { useRef } from 'react'
import { GitFork, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { NetworkEdge, NetworkNode } from '@/lib/api'
import { EDUCATION_COLORS } from '../chart-tokens'
import {
  curvedPath,
  eduKey,
  getNodeColor,
  lighten,
  toSvgPoint,
} from './layout'
import { NetworkLegend } from './network-legend'
import { H, type Point, type ViewState, W } from './types'

interface NetworkCanvasProps {
  svgRef: React.RefObject<SVGSVGElement | null>
  view: ViewState
  setView: React.Dispatch<React.SetStateAction<ViewState>>
  fit: ViewState
  zoomBy: (factor: number) => void
  canvasNodes: NetworkNode[]
  filteredEdges: NetworkEdge[]
  positions: Record<number, Point>
  nodeMap: Map<number, NetworkNode>
  activeFocusId: number | null
  activeNeighbors: Set<number>
  hubIds: Set<number>
  selectedNodeId: number | null
  setSelectedNodeId: (id: number | null) => void
  hoveredNodeId: number | null
  setHoveredNodeId: (id: number | null) => void
  hoveredEdge: NetworkEdge | null
  setHoveredEdge: (edge: NetworkEdge | null) => void
  searchTerm: string
  labels: Map<number, { x: number; y: number; fs: number; text: string }>
  getNodeRadius: (count: number) => number
  getEdgeWidth: (weight: number) => number
  maxWeight: number
  showLegendMobile: boolean
  setShowLegendMobile: React.Dispatch<React.SetStateAction<boolean>>
}

export function NetworkCanvas({
  svgRef,
  view,
  setView,
  fit,
  zoomBy,
  canvasNodes,
  filteredEdges,
  positions,
  nodeMap,
  activeFocusId,
  activeNeighbors,
  hubIds,
  selectedNodeId,
  setSelectedNodeId,
  hoveredNodeId,
  setHoveredNodeId,
  hoveredEdge,
  setHoveredEdge,
  searchTerm,
  labels,
  getNodeRadius,
  getEdgeWidth,
  maxWeight,
  showLegendMobile,
  setShowLegendMobile,
}: NetworkCanvasProps) {
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const movedRef = useRef(false)

  return (
    <div
      className='relative min-h-[360px] sm:min-h-[520px] flex items-center justify-center overflow-hidden'
      style={{
        background:
          'radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--primary) 9%, transparent) 0%, transparent 68%), color-mix(in srgb, var(--muted) 35%, transparent)',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className='w-full h-full max-h-[560px] select-none touch-none cursor-grab active:cursor-grabbing'
        onPointerDown={(e) => {
          const el = svgRef.current
          if (!el) return
          const p = toSvgPoint(el, e.clientX, e.clientY)
          dragRef.current = { sx: p.x, sy: p.y, ox: view.x, oy: view.y }
          movedRef.current = false
        }}
        onPointerMove={(e) => {
          const el = svgRef.current
          const d = dragRef.current
          if (!el || !d) return
          const p = toSvgPoint(el, e.clientX, e.clientY)
          const dx = p.x - d.sx
          const dy = p.y - d.sy
          if (Math.hypot(dx, dy) > 3) movedRef.current = true
          if (movedRef.current) setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }))
        }}
        onPointerUp={() => {
          dragRef.current = null
        }}
        onPointerLeave={() => {
          dragRef.current = null
        }}
        onClick={() => {
          if (movedRef.current) {
            movedRef.current = false
            return
          }
          setSelectedNodeId(null)
          setHoveredNodeId(null)
        }}
      >
        <defs>
          <pattern id='gcn-grid' width='28' height='28' patternUnits='userSpaceOnUse'>
            <circle cx='1.5' cy='1.5' r='1' fill='currentColor' opacity='0.14' />
          </pattern>
          <filter id='gcn-glow' x='-80%' y='-80%' width='260%' height='260%'>
            <feGaussianBlur stdDeviation='7' />
          </filter>
          <filter id='gcn-shadow' x='-30%' y='-30%' width='160%' height='170%'>
            <feDropShadow dx='0' dy='1.2' stdDeviation='1.6' floodColor='#000' floodOpacity='0.28' />
          </filter>
          {Object.entries(EDUCATION_COLORS).map(([key, col]) => (
            <radialGradient key={key} id={`gcn-n-${key}`} cx='34%' cy='28%' r='80%'>
              <stop offset='0%' stopColor={lighten(col, 0.55)} />
              <stop offset='55%' stopColor={col} />
              <stop offset='100%' stopColor={col} stopOpacity='0.92' />
            </radialGradient>
          ))}
          {filteredEdges.map((edge, i) => {
            const a = positions[edge.source]
            const b = positions[edge.target]
            const sn = nodeMap.get(edge.source)
            const tn = nodeMap.get(edge.target)
            if (!a || !b || !sn || !tn) return null
            return (
              <linearGradient
                key={i}
                id={`gcn-e-${i}`}
                gradientUnits='userSpaceOnUse'
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              >
                <stop offset='0%' stopColor={getNodeColor(sn.education)} />
                <stop offset='100%' stopColor={getNodeColor(tn.education)} />
              </linearGradient>
            )
          })}
        </defs>

        {/* Retícula de fondo (estática) */}
        <rect width={W} height={H} fill='url(#gcn-grid)' className='text-foreground' pointerEvents='none' />

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* Aristas curvas con gradiente */}
          <g>
            {filteredEdges.map((edge, i) => {
              const a = positions[edge.source]
              const b = positions[edge.target]
              if (!a || !b) return null
              const d = curvedPath(a, b, i)
              const connected =
                !!activeFocusId && (edge.source === activeFocusId || edge.target === activeFocusId)
              const dimmed = !!activeFocusId && !connected
              const w = getEdgeWidth(edge.weight)
              return (
                <g key={i}>
                  <path
                    d={d}
                    fill='none'
                    stroke={connected ? 'var(--primary)' : `url(#gcn-e-${i})`}
                    strokeWidth={connected ? w * 1.4 + 0.8 : w}
                    strokeLinecap='round'
                    strokeOpacity={
                      connected ? 0.95 : dimmed ? 0.06 : Math.max(0.28, Math.min(0.78, 0.28 + (edge.weight / maxWeight) * 0.5))
                    }
                    className='transition-all duration-200'
                    pointerEvents='none'
                  />
                  <path
                    d={d}
                    fill='none'
                    stroke='transparent'
                    strokeWidth={Math.max(w, 10)}
                    pointerEvents='stroke'
                    onMouseEnter={() => setHoveredEdge(edge)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                </g>
              )
            })}
          </g>

          {/* Auras de los hubs */}
          <g pointerEvents='none'>
            {canvasNodes
              .filter((n) => hubIds.has(n.id))
              .map((n) => {
                const p = positions[n.id]
                if (!p) return null
                return (
                  <circle
                    key={n.id}
                    cx={p.x}
                    cy={p.y}
                    r={getNodeRadius(n.products_count) + 9}
                    fill={getNodeColor(n.education)}
                    opacity={activeFocusId && activeFocusId !== n.id ? 0.08 : 0.38}
                    filter='url(#gcn-glow)'
                  />
                )
              })}
          </g>

          {/* Nodos */}
          <g>
            {canvasNodes.map((node) => {
              const pos = positions[node.id]
              if (!pos) return null
              const isSelected = selectedNodeId === node.id
              const isHovered = hoveredNodeId === node.id
              const isNeighbor = activeNeighbors.has(node.id)
              const highlighted = isSelected || isHovered || isNeighbor
              const dimmed = !!activeFocusId && !highlighted
              const radius = getNodeRadius(node.products_count)
              const isMatch = !!searchTerm && node.name.toLowerCase().includes(searchTerm)

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className={cn(
                    'cursor-pointer transition-opacity duration-200',
                    dimmed ? 'opacity-25' : 'opacity-100'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedNodeId(isSelected ? null : node.id)
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {(isSelected || isMatch) && (
                    <circle
                      r={radius + 8}
                      className='animate-pulse'
                      fill='var(--primary)'
                      fillOpacity={0.18}
                      stroke='var(--primary)'
                      strokeWidth={2}
                    />
                  )}
                  {isNeighbor && (
                    <circle
                      r={radius + 5}
                      fill='none'
                      stroke='var(--primary)'
                      strokeWidth={1.5}
                      strokeDasharray='3 3'
                    />
                  )}
                  <circle
                    r={radius}
                    fill={`url(#gcn-n-${eduKey(node.education)})`}
                    stroke='var(--background)'
                    strokeWidth={isSelected ? 3 : 1.8}
                    filter='url(#gcn-shadow)'
                  />
                  {radius >= 14 && (
                    <text
                      textAnchor='middle'
                      dy='.34em'
                      fill='#ffffff'
                      fontSize={Math.min(11, radius * 0.62)}
                      fontWeight={700}
                      pointerEvents='none'
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,.45)' }}
                    >
                      {node.products_count}
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          {/* Etiquetas con halo y sin colisión */}
          <g pointerEvents='none'>
            {canvasNodes.map((node) => {
              const l = labels.get(node.id)
              if (!l) return null
              const strong = node.id === activeFocusId
              const neighbor = activeNeighbors.has(node.id)
              return (
                <text
                  key={node.id}
                  x={l.x}
                  y={l.y}
                  textAnchor='middle'
                  fontSize={l.fs}
                  fontWeight={strong ? 700 : neighbor ? 600 : 500}
                  paintOrder='stroke'
                  stroke='var(--background)'
                  strokeWidth={l.fs * 0.32}
                  strokeLinejoin='round'
                  className={strong ? 'fill-foreground' : neighbor ? 'fill-primary' : 'fill-muted-foreground'}
                >
                  {l.text}
                </text>
              )
            })}
          </g>
        </g>
      </svg>

      {/* Controles de zoom */}
      <div className='absolute top-3 right-3 z-10 flex flex-col gap-1 rounded-lg border border-border/60 bg-background/90 p-1 shadow-sm backdrop-blur-xs'>
        <Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => zoomBy(1.3)} aria-label='Acercar'>
          <ZoomIn className='h-3.5 w-3.5' />
        </Button>
        <Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => zoomBy(1 / 1.3)} aria-label='Alejar'>
          <ZoomOut className='h-3.5 w-3.5' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7'
          onClick={() => setView(fit)}
          aria-label='Restablecer vista'
        >
          <Maximize2 className='h-3.5 w-3.5' />
        </Button>
      </div>

      {hoveredEdge && (
        <div className='absolute bottom-3 left-3 bg-popover/95 backdrop-blur-xs text-popover-foreground border border-border/80 rounded-lg p-2.5 shadow-lg text-xs pointer-events-none z-10 max-w-xs animate-in fade-in-50'>
          <div className='font-semibold text-primary flex items-center gap-1.5'>
            <GitFork className='h-3.5 w-3.5' /> Vínculo de Coautoría
          </div>
          <div className='mt-1 text-[11px] leading-snug'>
            <div className='font-medium'>{nodeMap.get(hoveredEdge.source)?.name}</div>
            <div className='text-muted-foreground my-0.5 text-center'>— con —</div>
            <div className='font-medium'>{nodeMap.get(hoveredEdge.target)?.name}</div>
          </div>
          <div className='mt-1.5 pt-1 border-t border-border/40 font-bold text-emerald-600 dark:text-emerald-400'>
            {hoveredEdge.weight} {hoveredEdge.weight === 1 ? 'producto conjunto' : 'productos conjuntos'}
          </div>
        </div>
      )}

      <NetworkLegend
        showMobile={showLegendMobile}
        onToggleMobile={() => setShowLegendMobile((v) => !v)}
        onCloseMobile={() => setShowLegendMobile(false)}
      />
    </div>
  )
}
