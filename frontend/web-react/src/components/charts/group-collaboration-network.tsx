import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Share2,
  Users,
  GitFork,
  Activity,
  Award,
  Search,
  Filter,
  ExternalLink,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { GroupCollaborationNetworkData, NetworkNode, NetworkEdge } from '@/lib/api'
import { EDUCATION_COLORS } from './chart-tokens'

export interface GroupCollaborationNetworkProps {
  data?: GroupCollaborationNetworkData
  groupName?: string
  className?: string
  title?: string
  description?: string
  isLoading?: boolean
}

interface Point {
  x: number
  y: number
}

interface ViewState {
  x: number
  y: number
  k: number
}

const W = 800
const H = 540
const MIN_ZOOM = 0.3
const MAX_ZOOM = 5
// Espacio virtual donde se calcula el layout; luego se ajusta al lienzo vía zoom inicial
const VW = W * 1.7
const VH = H * 1.7

// ---------- Helpers de color y texto ----------

function lighten(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function eduKey(education: string): string {
  const e = (education || '').toLowerCase()
  for (const key of Object.keys(EDUCATION_COLORS)) {
    if (e.includes(key.toLowerCase())) return key
  }
  return 'Pregrado'
}

function getNodeColor(education: string): string {
  return EDUCATION_COLORS[eduKey(education)] ?? '#64748b'
}

// "Maria del Carmen Jimenez Barriosnuevo" -> "Maria Jimenez"
function shortName(full: string): string {
  const w = full.trim().split(/\s+/).filter(Boolean)
  if (w.length <= 2) return w.join(' ')
  if (w.length === 3) return `${w[0]} ${w[1]}`
  return `${w[0]} ${w[w.length - 2]}`
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// ---------- Layout ----------

// Fruchterman-Reingold determinista: espiral áurea inicial + repulsión/atracción
// ponderada + separación por colisión + ajuste final al lienzo.
function computeLayout(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  radiusOf: (n: NetworkNode) => number
): { pos: Record<number, Point>; fit: ViewState } {
  const pos: Record<number, Point> = {}
  const n = nodes.length
  if (!n) return { pos, fit: { x: 0, y: 0, k: 1 } }

  const cx = VW / 2
  const cy = VH / 2
  const golden = Math.PI * (3 - Math.sqrt(5))
  const sorted = [...nodes].sort((a, b) => b.degree - a.degree)
  const spread = (Math.min(VW, VH) * 0.42) / Math.sqrt(n)

  sorted.forEach((node, i) => {
    const r = spread * Math.sqrt(i + 0.5)
    pos[node.id] = {
      x: cx + r * Math.cos(i * golden) * 1.35,
      y: cy + r * Math.sin(i * golden),
    }
  })

  const radii: Record<number, number> = {}
  nodes.forEach((nd) => (radii[nd.id] = radiusOf(nd)))

  const k = Math.sqrt((VW * VH * 0.55) / n)
  const iterations = 140

  for (let iter = 0; iter < iterations; iter++) {
    const temp = (1 - iter / iterations) * 22 + 0.5
    const disp: Record<number, { dx: number; dy: number }> = {}
    nodes.forEach((nd) => (disp[nd.id] = { dx: 0, dy: 0 }))

    for (let i = 0; i < n; i++) {
      const u = nodes[i].id
      for (let j = i + 1; j < n; j++) {
        const v = nodes[j].id
        const dx = pos[u].x - pos[v].x
        const dy = pos[u].y - pos[v].y
        const dist = Math.hypot(dx, dy) || 0.01
        const force = (k * k) / dist
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        disp[u].dx += fx
        disp[u].dy += fy
        disp[v].dx -= fx
        disp[v].dy -= fy
      }
    }

    for (const e of edges) {
      const a = pos[e.source]
      const b = pos[e.target]
      if (!a || !b) continue
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dist = Math.hypot(dx, dy) || 0.01
      const wMul = Math.min(Math.log2(e.weight + 1) + 1, 3.2)
      const force = ((dist * dist) / k) * wMul * 0.08
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      disp[e.source].dx -= fx
      disp[e.source].dy -= fy
      disp[e.target].dx += fx
      disp[e.target].dy += fy
    }

    for (const nd of nodes) {
      const p = pos[nd.id]
      const d = disp[nd.id]
      d.dx += (cx - p.x) * 0.11
      d.dy += (cy - p.y) * 0.11
      const len = Math.hypot(d.dx, d.dy) || 1
      const step = Math.min(len, temp)
      p.x += (d.dx / len) * step
      p.y += (d.dy / len) * step
      // Límite elíptico: evita que nodos periféricos agranden el encuadre
      const ox = (p.x - cx) / (VW * 0.36)
      const oy = (p.y - cy) / (VH * 0.36)
      const od = Math.hypot(ox, oy)
      if (od > 1) {
        p.x = cx + (ox / od) * VW * 0.36
        p.y = cy + (oy / od) * VH * 0.36
      }
    }
  }

  // Separación por colisión (círculos + margen para etiquetas)
  for (let pass = 0; pass < 120; pass++) {
    let moved = false
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = pos[nodes[i].id]
        const b = pos[nodes[j].id]
        const min = radii[nodes[i].id] + radii[nodes[j].id] + 26
        let dx = b.x - a.x
        let dy = b.y - a.y
        let dist = Math.hypot(dx, dy)
        if (dist < min) {
          if (dist < 0.01) {
            dx = 1
            dy = 0
            dist = 1
          }
          const push = (min - dist) / 2
          const ux = dx / dist
          const uy = dy / dist
          a.x -= ux * push
          a.y -= uy * push
          b.x += ux * push
          b.y += uy * push
          moved = true
        }
      }
    }
    if (!moved) break
  }

  // Ajuste al lienzo como transformación de vista (no altera separaciones)
  const pad = 40
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  nodes.forEach((nd) => {
    const p = pos[nd.id]
    const r = radii[nd.id]
    minX = Math.min(minX, p.x - r)
    maxX = Math.max(maxX, p.x + r)
    minY = Math.min(minY, p.y - r)
    maxY = Math.max(maxY, p.y + r)
  })
  const bw = Math.max(maxX - minX, 1)
  const bh = Math.max(maxY - minY, 1)
  const scale = clamp(Math.min((W - pad * 2) / bw, (H - pad * 2) / bh), MIN_ZOOM, 1.6)
  const bcx = (minX + maxX) / 2
  const bcy = (minY + maxY) / 2

  return { pos, fit: { k: scale, x: W / 2 - bcx * scale, y: H / 2 - bcy * scale } }
}

function curvedPath(a: Point, b: Point, idx: number): string {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.hypot(dx, dy) || 1
  const off = d * 0.14 * (idx % 2 ? 1 : -1)
  const qx = mx - (dy / d) * off
  const qy = my + (dx / d) * off
  return `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`
}

function toSvgPoint(el: SVGSVGElement, clientX: number, clientY: number): Point {
  const pt = el.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const m = el.getScreenCTM()
  if (!m) return { x: clientX, y: clientY }
  const r = pt.matrixTransform(m.inverse())
  return { x: r.x, y: r.y }
}

export function GroupCollaborationNetwork({
  data,
  groupName,
  className,
  title = 'Red de Colaboración y Coautorías',
  description = 'Topología de coautorías internas, núcleos de producción científica y grado de interacción.',
  isLoading = false,
}: GroupCollaborationNetworkProps) {
  const [minWeightFilter, setMinWeightFilter] = useState<number>(1)
  const [isoOpen, setIsoOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<NetworkEdge | null>(null)
  const [view, setView] = useState<ViewState>({ x: 0, y: 0, k: 1 })

  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const movedRef = useRef(false)

  const ready = !isLoading && !!data?.nodes?.length
  const activeFocusId = selectedNodeId ?? hoveredNodeId

  // Zoom con rueda (listener no pasivo para poder evitar el scroll de la página)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const pt = toSvgPoint(el, e.clientX, e.clientY)
      setView((v) => {
        const k = clamp(v.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15), MIN_ZOOM, MAX_ZOOM)
        const r = k / v.k
        return { k, x: pt.x - (pt.x - v.x) * r, y: pt.y - (pt.y - v.y) * r }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ready])

  const zoomBy = (factor: number) =>
    setView((v) => {
      const k = clamp(v.k * factor, MIN_ZOOM, MAX_ZOOM)
      const r = k / v.k
      const c = { x: W / 2, y: H / 2 }
      return { k, x: c.x - (c.x - v.x) * r, y: c.y - (c.y - v.y) * r }
    })

  const filteredEdges = useMemo(() => {
    if (!data?.edges) return []
    return data.edges.filter((e) => e.weight >= minWeightFilter)
  }, [data?.edges, minWeightFilter])

  // Con el filtro actual: nodos con al menos un lazo van al lienzo; el resto, al panel de aislados
  const { canvasNodes, isolatedNodes } = useMemo(() => {
    const connected = new Set<number>()
    filteredEdges.forEach((e) => {
      connected.add(e.source)
      connected.add(e.target)
    })
    const all = data?.nodes ?? []
    return {
      canvasNodes: all.filter((n) => connected.has(n.id)),
      isolatedNodes: all
        .filter((n) => !connected.has(n.id))
        .sort((a, b) => b.products_count - a.products_count),
    }
  }, [data?.nodes, filteredEdges])

  const nodeMap = useMemo(() => {
    const map = new Map<number, NetworkNode>()
    data?.nodes?.forEach((n) => map.set(n.id, n))
    return map
  }, [data?.nodes])

  const maxProducts = useMemo(
    () => Math.max(...(data?.nodes?.map((n) => n.products_count) || [1]), 1),
    [data?.nodes]
  )

  const getNodeRadius = (count: number) => {
    const minR = 9
    const maxR = 26
    return minR + (Math.sqrt(count) / Math.sqrt(maxProducts)) * (maxR - minR)
  }

  const layout = useMemo(
    () => computeLayout(canvasNodes, filteredEdges, (n) => getNodeRadius(n.products_count)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canvasNodes, filteredEdges, maxProducts]
  )
  const positions = layout.pos
  const fit = layout.fit

  // Cada vez que cambia el layout (datos o filtro) se re-encuadra la vista
  useEffect(() => {
    setView(fit)
  }, [fit])

  const activeNeighbors = useMemo(() => {
    const set = new Set<number>()
    if (!activeFocusId) return set
    filteredEdges.forEach((e) => {
      if (e.source === activeFocusId) set.add(e.target)
      if (e.target === activeFocusId) set.add(e.source)
    })
    return set
  }, [activeFocusId, filteredEdges])

  const activeCollaborators = useMemo(() => {
    if (!activeFocusId) return []
    const collabs: Array<{ node: NetworkNode; weight: number }> = []
    filteredEdges.forEach((e) => {
      const otherId =
        e.source === activeFocusId ? e.target : e.target === activeFocusId ? e.source : null
      if (otherId === null) return
      const neighbor = nodeMap.get(otherId)
      if (neighbor) collabs.push({ node: neighbor, weight: e.weight })
    })
    return collabs.sort((a, b) => b.weight - a.weight)
  }, [activeFocusId, filteredEdges, nodeMap])

  const maxWeight = data?.metrics?.max_weight || 1
  const getEdgeWidth = (weight: number) => 1 + (weight / Math.max(maxWeight, 1)) * 4.5

  // Hubs con aura: los 4 nodos de mayor grado
  const hubIds = useMemo(
    () =>
      new Set(
        [...canvasNodes]
          .sort((a, b) => b.degree - a.degree)
          .slice(0, 4)
          .map((n) => n.id)
      ),
    [canvasNodes]
  )

  const searchTerm = searchQuery.toLowerCase().trim()

  // Etiquetas sin colisión: prioridad al foco, vecinos y coincidencias; luego por volumen
  const labels = useMemo(() => {
    const result = new Map<number, { x: number; y: number; fs: number; text: string }>()
    const fs = Math.min(15, 11 / Math.pow(view.k, 0.85))
    const boxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    const hit = (a: { x1: number; y1: number; x2: number; y2: number }) =>
      boxes.some((b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1)

    const isForced = (n: NetworkNode) =>
      n.id === activeFocusId ||
      activeNeighbors.has(n.id) ||
      (!!searchTerm && n.name.toLowerCase().includes(searchTerm))

    const ordered = [...canvasNodes].sort((a, b) => {
      const fa = isForced(a) ? 1 : 0
      const fb = isForced(b) ? 1 : 0
      if (fa !== fb) return fb - fa
      return b.products_count - a.products_count
    })

    // Los círculos de los nodos también son obstáculos para etiquetas no forzadas
    const circleBoxes = canvasNodes.map((n) => {
      const p = positions[n.id]
      const r = getNodeRadius(n.products_count)
      return { id: n.id, x1: p.x - r, y1: p.y - r, x2: p.x + r, y2: p.y + r }
    })

    for (const n of ordered) {
      const p = positions[n.id]
      if (!p) continue
      const forced = isForced(n)
      if (activeFocusId && !forced) continue
      const text = shortName(n.name)
      const w = text.length * fs * 0.56 + 4
      const r = getNodeRadius(n.products_count)
      const box = {
        x1: p.x - w / 2,
        x2: p.x + w / 2,
        y1: p.y + r + 1,
        y2: p.y + r + fs * 1.35,
      }
      if (!forced) {
        if (hit(box)) continue
        const overCircle = circleBoxes.some(
          (c) =>
            c.id !== n.id && box.x1 < c.x2 && box.x2 > c.x1 && box.y1 < c.y2 && box.y2 > c.y1
        )
        if (overCircle) continue
      }
      boxes.push(box)
      result.set(n.id, { x: p.x, y: p.y + r + fs * 1.05, fs, text })
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasNodes, positions, activeFocusId, activeNeighbors, view.k, searchTerm, maxProducts])

  const activeNode = activeFocusId ? nodeMap.get(activeFocusId) : null

  if (isLoading) {
    return (
      <Card className={cn('border-border/60 shadow-xs', className)}>
        <CardHeader className='pb-3'>
          <div className='flex items-center gap-2'>
            <div className='h-7 w-7 rounded-lg bg-muted animate-pulse' />
            <div className='space-y-1.5'>
              <div className='h-4 w-48 bg-muted rounded animate-pulse' />
              <div className='h-3 w-64 bg-muted/60 rounded animate-pulse' />
            </div>
          </div>
        </CardHeader>
        <CardContent className='h-[480px] flex items-center justify-center'>
          <div className='flex flex-col items-center gap-3 text-muted-foreground'>
            <Share2 className='h-8 w-8 animate-spin opacity-40 text-primary' />
            <span className='text-xs'>Calculando grafo de coautorías del grupo...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data?.nodes?.length) {
    return (
      <Card className={cn('border-border/60 shadow-xs', className)}>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm sm:text-base font-bold'>{title}</CardTitle>
          <CardDescription className='text-xs'>{description}</CardDescription>
        </CardHeader>
        <CardContent className='flex h-[240px] flex-col items-center justify-center gap-2 text-xs text-muted-foreground'>
          <Share2 className='h-8 w-8 opacity-30' />
          <span>No hay suficientes datos de coautoría para estructurar la red en este grupo.</span>
        </CardContent>
      </Card>
    )
  }

  const kpi = 'flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border/60 shadow-2xs'

  return (
    <Card className={cn('border-border/60 shadow-xs overflow-hidden', className)}>
      <CardHeader className='pb-3 border-b border-border/40 bg-muted/15'>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 shadow-2xs'>
              <Share2 className='h-4 w-4' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <CardTitle className='text-sm sm:text-base font-bold tracking-tight'>
                  {title}
                </CardTitle>
                <Badge
                  variant='outline'
                  className='text-[10px] py-0 px-1.5 font-normal border-primary/30 text-primary bg-primary/5'
                >
                  Fase 3
                </Badge>
              </div>
              <CardDescription className='text-xs mt-0.5 line-clamp-1'>
                {description} {groupName ? `— ${groupName}` : ''}
              </CardDescription>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs'>
            <div className={kpi}>
              <Users className='h-3.5 w-3.5 text-blue-500' />
              <span className='text-muted-foreground'>Nodos:</span>
              <span className='font-bold tabular-nums'>{data.metrics.total_nodes}</span>
            </div>
            <div className={kpi}>
              <GitFork className='h-3.5 w-3.5 text-emerald-500' />
              <span className='text-muted-foreground'>Lazos:</span>
              <span className='font-bold tabular-nums'>{data.metrics.total_edges}</span>
            </div>
            <div className={kpi}>
              <Activity className='h-3.5 w-3.5 text-indigo-500' />
              <span className='text-muted-foreground'>Cohesión:</span>
              <span className='font-bold tabular-nums'>{data.metrics.cohesion_index}%</span>
            </div>
            <div className={kpi}>
              <Award className='h-3.5 w-3.5 text-amber-500' />
              <span className='text-muted-foreground'>Máx. Coautoría:</span>
              <span className='font-bold tabular-nums'>{data.metrics.max_weight} docs</span>
            </div>
          </div>
        </div>

        <div className='flex flex-wrap items-center justify-between gap-2 pt-2 text-xs'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <span className='text-[11px] text-muted-foreground flex items-center gap-1 mr-1'>
              <Filter className='h-3 w-3' /> Filtrar lazos:
            </span>
            {[
              { label: 'Todos', value: 1 },
              { label: '≥ 2 art.', value: 2 },
              { label: '≥ 5 art.', value: 5 },
              { label: '≥ 10 art.', value: 10 },
            ].map((f) => (
              <Button
                key={f.value}
                variant={minWeightFilter === f.value ? 'default' : 'outline'}
                size='sm'
                className='h-6 text-[10px] px-2 py-0'
                onClick={() => setMinWeightFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <div className='relative w-full sm:w-48'>
            <Search className='absolute left-2 top-1.5 h-3 w-3 text-muted-foreground' />
            <Input
              placeholder='Buscar integrante...'
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                const q = e.target.value.toLowerCase().trim()
                if (q) {
                  const match = (data.nodes ?? []).find((n) => n.name.toLowerCase().includes(q))
                  if (match) {
                    setSelectedNodeId(match.id)
                    if (isolatedNodes.some((n) => n.id === match.id)) setIsoOpen(true)
                  }
                } else {
                  setSelectedNodeId(null)
                }
              }}
              className='h-6 text-[11px] pl-6 py-0'
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className='p-0 relative flex flex-col xl:flex-row'>
        <div className='flex-1 min-w-0 flex flex-col'>
          {/* Lienzo */}
          <div
            className='relative min-h-[440px] sm:min-h-[540px] flex items-center justify-center overflow-hidden'
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
                            connected ? 0.95 : dimmed ? 0.06 : clamp(0.28 + (edge.weight / maxWeight) * 0.5, 0.28, 0.78)
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

            <div className='absolute bottom-3 right-3 bg-background/90 backdrop-blur-xs border border-border/60 rounded-md p-2 shadow-sm text-[10px] space-y-1 z-10'>
              <div className='font-semibold text-muted-foreground mb-1 flex items-center gap-1'>
                <Info className='h-3 w-3' /> Nivel Formación
              </div>
              {Object.entries(EDUCATION_COLORS).map(([lvl, col]) => (
                <div key={lvl} className='flex items-center gap-1.5'>
                  <span className='h-2 w-2 rounded-full shrink-0' style={{ backgroundColor: col }} />
                  <span className='text-muted-foreground'>{lvl}</span>
                </div>
              ))}
              <div className='pt-1 mt-1 border-t border-border/50 text-muted-foreground/80 leading-tight'>
                Tamaño = productos
                <br />
                Grosor = coautorías
              </div>
            </div>
          </div>

          {/* Integrantes sin coautoría interna (colapsable) */}
          {isolatedNodes.length > 0 && (
            <div className='border-t border-border/50 bg-muted/10'>
              <button
                type='button'
                onClick={() => setIsoOpen((o) => !o)}
                className='flex w-full items-center justify-between px-4 py-2.5 text-left text-xs hover:bg-muted/30 transition-colors'
                aria-expanded={isoOpen}
              >
                <span className='flex items-center gap-2 font-semibold text-foreground'>
                  <Users className='h-3.5 w-3.5 text-muted-foreground' />
                  Sin coautoría interna
                  <Badge variant='secondary' className='text-[10px] py-0 px-1.5'>
                    {isolatedNodes.length}
                  </Badge>
                  <span className='hidden sm:inline font-normal text-muted-foreground'>
                    {minWeightFilter > 1
                      ? `· sin lazos de ≥ ${minWeightFilter} artículos`
                      : '· integrantes sin publicaciones conjuntas en el grupo'}
                  </span>
                </span>
                {isoOpen ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
              </button>
              {isoOpen && (
                <div className='flex max-h-44 flex-wrap gap-1.5 overflow-y-auto px-4 pb-3'>
                  {isolatedNodes.map((n) => {
                    const active = selectedNodeId === n.id
                    return (
                      <button
                        key={n.id}
                        type='button'
                        onClick={() => setSelectedNodeId(active ? null : n.id)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/60 bg-background hover:bg-muted/60'
                        )}
                      >
                        <span
                          className='h-2 w-2 rounded-full shrink-0'
                          style={{ backgroundColor: getNodeColor(n.education) }}
                        />
                        <span className='font-medium'>{shortName(n.name)}</span>
                        <span className='text-muted-foreground tabular-nums'>{n.products_count}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div className='w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-border/60 bg-card p-4 flex flex-col justify-between'>
          {activeNode ? (
            <div className='space-y-4'>
              <div>
                <div className='flex items-start justify-between gap-2'>
                  <Badge
                    variant='secondary'
                    className='text-[10px] py-0.5 font-medium'
                    style={{
                      backgroundColor: `${getNodeColor(activeNode.education)}20`,
                      color: getNodeColor(activeNode.education),
                      borderColor: `${getNodeColor(activeNode.education)}40`,
                    }}
                  >
                    {activeNode.education}
                  </Badge>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-5 text-[10px] px-1 text-muted-foreground'
                    onClick={() => setSelectedNodeId(null)}
                  >
                    Cerrar foco
                  </Button>
                </div>
                <h4 className='text-sm font-bold mt-1 text-foreground'>{activeNode.name}</h4>
                <p className='text-xs text-muted-foreground'>{activeNode.role}</p>
              </div>

              <div className='grid grid-cols-2 gap-2 text-xs'>
                <div className='p-2.5 rounded-lg bg-muted/30 border border-border/50'>
                  <div className='text-muted-foreground text-[10px]'>En este Grupo</div>
                  <div className='text-base font-bold text-foreground mt-0.5'>
                    {activeNode.products_count}
                    <span className='text-[10px] font-normal text-muted-foreground ml-1'>prod.</span>
                  </div>
                </div>
                <div className='p-2.5 rounded-lg bg-muted/30 border border-border/50'>
                  <div className='text-muted-foreground text-[10px]'>Coautores Directos</div>
                  <div className='text-base font-bold text-primary mt-0.5'>
                    {activeCollaborators.length}
                    <span className='text-[10px] font-normal text-muted-foreground ml-1'>pares</span>
                  </div>
                </div>
              </div>

              <div>
                <div className='text-xs font-semibold text-foreground flex items-center justify-between mb-2'>
                  <span>Colaboradores Directos</span>
                  <Badge variant='outline' className='text-[10px] py-0 px-1'>
                    {activeCollaborators.length}
                  </Badge>
                </div>
                {activeCollaborators.length > 0 ? (
                  <div className='space-y-1.5 max-h-[220px] overflow-y-auto pr-1'>
                    {activeCollaborators.map(({ node: collab, weight }) => (
                      <div
                        key={collab.id}
                        onClick={() => setSelectedNodeId(collab.id)}
                        className='flex items-center justify-between p-1.5 rounded-md hover:bg-muted/60 transition-colors text-xs cursor-pointer border border-transparent hover:border-border/60'
                      >
                        <div className='flex items-center gap-2 min-w-0'>
                          <span
                            className='h-2 w-2 rounded-full shrink-0'
                            style={{ backgroundColor: getNodeColor(collab.education) }}
                          />
                          <span className='truncate font-medium text-[11px]'>{collab.name}</span>
                        </div>
                        <Badge
                          variant='secondary'
                          className='text-[10px] py-0 px-1.5 shrink-0 bg-primary/10 text-primary font-bold'
                        >
                          {weight} {weight === 1 ? 'doc' : 'docs'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='p-3 text-center text-xs text-muted-foreground bg-muted/20 rounded-md'>
                    No registra publicaciones conjuntas con otros integrantes actuales del grupo.
                  </div>
                )}
              </div>

              <div className='pt-2'>
                <Button variant='outline' size='sm' className='w-full text-xs h-8 gap-1.5' asChild>
                  <Link to='/admin/researchers/$id' params={{ id: String(activeNode.id) }}>
                    <ExternalLink className='h-3.5 w-3.5' /> Ver Perfil Analítico Completo
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className='h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-3'>
              <div className='h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center'>
                <Sparkles className='h-5 w-5' />
              </div>
              <div className='space-y-1'>
                <p className='text-xs font-semibold text-foreground'>Explora la Red Científica</p>
                <p className='text-[11px] text-muted-foreground leading-relaxed'>
                  Haz clic o sitúa el cursor sobre cualquier nodo para examinar sus lazos de coautoría.
                  Usa la rueda para acercar y arrastra para moverte por el grafo.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
