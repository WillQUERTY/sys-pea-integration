import { useEffect, useMemo, useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { NetworkEdge, NetworkNode } from '@/lib/api'
import {
  clamp,
  computeLayout,
  shortName,
  toSvgPoint,
} from './layout'
import { IsolatedNodesList } from './isolated-nodes-list'
import { NetworkCanvas } from './network-canvas'
import { NetworkHeader } from './network-header'
import { NodeInspectorPanel } from './node-inspector-panel'
import {
  type GroupCollaborationNetworkProps,
  H,
  MAX_ZOOM,
  MIN_ZOOM,
  type ViewState,
  W,
} from './types'

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
  const [showLegendMobile, setShowLegendMobile] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<NetworkEdge | null>(null)
  const [view, setView] = useState<ViewState>({ x: 0, y: 0, k: 1 })

  const svgRef = useRef<SVGSVGElement>(null)
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

  const activeNode = activeFocusId ? (nodeMap.get(activeFocusId) ?? null) : null

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

  return (
    <Card className={cn('border-border/60 shadow-xs overflow-hidden', className)}>
      <NetworkHeader
        title={title}
        description={description}
        groupName={groupName}
        metrics={data.metrics}
        minWeightFilter={minWeightFilter}
        onMinWeightChange={setMinWeightFilter}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q)
          const term = q.toLowerCase().trim()
          if (term) {
            const match = (data.nodes ?? []).find((n) => n.name.toLowerCase().includes(term))
            if (match) {
              setSelectedNodeId(match.id)
              if (isolatedNodes.some((n) => n.id === match.id)) setIsoOpen(true)
            }
          } else {
            setSelectedNodeId(null)
          }
        }}
      />

      <CardContent className='p-0 relative flex flex-col xl:flex-row'>
        <div className='flex-1 min-w-0 flex flex-col'>
          <NetworkCanvas
            svgRef={svgRef}
            view={view}
            setView={setView}
            fit={fit}
            zoomBy={zoomBy}
            canvasNodes={canvasNodes}
            filteredEdges={filteredEdges}
            positions={positions}
            nodeMap={nodeMap}
            activeFocusId={activeFocusId}
            activeNeighbors={activeNeighbors}
            hubIds={hubIds}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            hoveredNodeId={hoveredNodeId}
            setHoveredNodeId={setHoveredNodeId}
            hoveredEdge={hoveredEdge}
            setHoveredEdge={setHoveredEdge}
            searchTerm={searchTerm}
            labels={labels}
            getNodeRadius={getNodeRadius}
            getEdgeWidth={getEdgeWidth}
            maxWeight={maxWeight}
            showLegendMobile={showLegendMobile}
            setShowLegendMobile={setShowLegendMobile}
          />

          <IsolatedNodesList
            nodes={isolatedNodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => setSelectedNodeId(selectedNodeId === id ? null : id)}
            isOpen={isoOpen}
            onToggleOpen={() => setIsoOpen((o) => !o)}
            minWeightFilter={minWeightFilter}
          />
        </div>

        <NodeInspectorPanel
          activeNode={activeNode}
          collaborators={activeCollaborators}
          onSelectNode={setSelectedNodeId}
        />
      </CardContent>
    </Card>
  )
}
