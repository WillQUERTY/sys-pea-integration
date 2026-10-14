import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Share2,
  Users,
  GitFork,
  Activity,
  Award,
  Search,
  Filter,
  Eye,
  EyeOff,
  ExternalLink,
  Info,
  Sparkles,
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

// Compute deterministic force-directed layout for nodes
function computeLayout(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  width = 800,
  height = 540
): Record<number, Point> {
  const positions: Record<number, Point> = {}
  if (!nodes.length) return positions

  const cx = width / 2
  const cy = height / 2

  // Separate connected and isolated nodes
  const connectedNodes = nodes.filter((n) => n.degree > 0)
  const isolatedNodes = nodes.filter((n) => n.degree === 0)

  // 1. Position isolated nodes in an elegant perimeter orbit
  const isoCount = isolatedNodes.length
  const rxIso = (width / 2) - 44
  const ryIso = (height / 2) - 38
  isolatedNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(isoCount, 1) - Math.PI / 2
    positions[node.id] = {
      x: cx + rxIso * Math.cos(angle),
      y: cy + ryIso * Math.sin(angle),
    }
  })

  // 2. Position connected nodes initially in inner clusters
  const connCount = connectedNodes.length
  const sortedConn = [...connectedNodes].sort((a, b) => b.degree - a.degree)
  sortedConn.forEach((node, i) => {
    const layer = node.degree >= 5 ? 0.35 : node.degree >= 2 ? 0.6 : 0.8
    const r = Math.min(width, height) * 0.32 * layer
    const angle = (2 * Math.PI * i) / Math.max(connCount, 1)
    positions[node.id] = {
      x: cx + r * Math.cos(angle) + (Math.sin(i * 3) * 12),
      y: cy + r * Math.sin(angle) + (Math.cos(i * 2) * 12),
    }
  })

  // 3. Iterative relaxation for connected nodes
  const iterations = 60
  const k = Math.sqrt((width * height * 0.5) / Math.max(connCount, 1)) * 0.85

  for (let iter = 0; iter < iterations; iter++) {
    const temp = (1 - iter / iterations) * 18
    const disp: Record<number, { dx: number; dy: number }> = {}

    for (const node of connectedNodes) {
      disp[node.id] = { dx: 0, dy: 0 }
    }

    // Repulsion between connected nodes
    for (let i = 0; i < connCount; i++) {
      const u = connectedNodes[i].id
      const pU = positions[u]
      for (let j = i + 1; j < connCount; j++) {
        const v = connectedNodes[j].id
        const pV = positions[v]
        let dx = pU.x - pV.x
        let dy = pU.y - pV.y
        let dist = Math.sqrt(dx * dx + dy * dy) || 1
        if (dist > 280) continue

        const force = (k * k) / dist
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        disp[u].dx += fx
        disp[u].dy += fy
        disp[v].dx -= fx
        disp[v].dy -= fy
      }
    }

    // Attraction along edges (proportional to weight)
    for (const edge of edges) {
      const pSrc = positions[edge.source]
      const pTgt = positions[edge.target]
      if (!pSrc || !pTgt) continue

      let dx = pSrc.x - pTgt.x
      let dy = pSrc.y - pTgt.y
      let dist = Math.sqrt(dx * dx + dy * dy) || 1

      const weightMultiplier = Math.min(Math.log2(edge.weight + 1) + 1, 3.2)
      const force = ((dist * dist) / k) * weightMultiplier * 0.16
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      if (disp[edge.source]) {
        disp[edge.source].dx -= fx
        disp[edge.source].dy -= fy
      }
      if (disp[edge.target]) {
        disp[edge.target].dx += fx
        disp[edge.target].dy += fy
      }
    }

    // Gentle center gravity & oval bounding for connected nodes
    const maxCoreRx = (width / 2) - 80
    const maxCoreRy = (height / 2) - 70

    for (const node of connectedNodes) {
      const p = positions[node.id]
      const d = disp[node.id]
      const cdx = cx - p.x
      const cdy = cy - p.y
      d.dx += cdx * 0.05
      d.dy += cdy * 0.05

      const dLen = Math.sqrt(d.dx * d.dx + d.dy * d.dy) || 1
      const step = Math.min(dLen, temp)

      p.x += (d.dx / dLen) * step
      p.y += (d.dy / dLen) * step

      // Oval boundary check
      const ox = (p.x - cx) / maxCoreRx
      const oy = (p.y - cy) / maxCoreRy
      const ovalDist = Math.sqrt(ox * ox + oy * oy)
      if (ovalDist > 1.0) {
        p.x = cx + (ox / ovalDist) * maxCoreRx
        p.y = cy + (oy / ovalDist) * maxCoreRy
      }
    }
  }

  return positions
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
  const [hideIsolated, setHideIsolated] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<NetworkEdge | null>(null)

  const activeFocusId = selectedNodeId ?? hoveredNodeId

  // Filter edges by minWeight
  const filteredEdges = useMemo(() => {
    if (!data?.edges) return []
    return data.edges.filter((e) => e.weight >= minWeightFilter)
  }, [data?.edges, minWeightFilter])

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!data?.nodes) return []
    let nodes = data.nodes

    if (hideIsolated) {
      // Keep only nodes with at least 1 edge in the filtered edges
      const connectedIds = new Set<number>()
      filteredEdges.forEach((e) => {
        connectedIds.add(e.source)
        connectedIds.add(e.target)
      })
      nodes = nodes.filter((n) => connectedIds.has(n.id))
    }

    return nodes
  }, [data?.nodes, filteredEdges, hideIsolated])

  // Map of nodes by id for quick lookup
  const nodeMap = useMemo(() => {
    const map = new Map<number, NetworkNode>()
    data?.nodes?.forEach((n) => map.set(n.id, n))
    return map
  }, [data?.nodes])

  // Layout positions
  const positions = useMemo(() => {
    return computeLayout(filteredNodes, filteredEdges, 800, 540)
  }, [filteredNodes, filteredEdges])

  // Neighbors of active node
  const activeNeighbors = useMemo(() => {
    if (!activeFocusId) return new Set<number>()
    const set = new Set<number>()
    filteredEdges.forEach((e) => {
      if (e.source === activeFocusId) set.add(e.target)
      if (e.target === activeFocusId) set.add(e.source)
    })
    return set
  }, [activeFocusId, filteredEdges])

  // Collaborators with joint count for the selected/active node
  const activeCollaborators = useMemo(() => {
    if (!activeFocusId) return []
    const collabs: Array<{ node: NetworkNode; weight: number }> = []
    filteredEdges.forEach((e) => {
      if (e.source === activeFocusId) {
        const neighbor = nodeMap.get(e.target)
        if (neighbor) collabs.push({ node: neighbor, weight: e.weight })
      } else if (e.target === activeFocusId) {
        const neighbor = nodeMap.get(e.source)
        if (neighbor) collabs.push({ node: neighbor, weight: e.weight })
      }
    })
    return collabs.sort((a, b) => b.weight - a.weight)
  }, [activeFocusId, filteredEdges, nodeMap])

  // Node scale helper: radius based on products_count (8px to 22px)
  const maxProducts = useMemo(() => {
    return Math.max(...(data?.nodes?.map((n) => n.products_count) || [1]), 1)
  }, [data?.nodes])

  const getNodeRadius = (count: number) => {
    const minR = 8
    const maxR = 22
    return minR + (Math.sqrt(count) / Math.sqrt(maxProducts)) * (maxR - minR)
  }

  // Edge stroke width helper: 1.2px to 6px based on weight
  const maxWeight = data?.metrics?.max_weight || 1
  const getEdgeWidth = (weight: number) => {
    return 1.2 + (weight / Math.max(maxWeight, 1)) * 4.8
  }

  // Education color helper
  const getNodeColor = (education: string) => {
    for (const [key, color] of Object.entries(EDUCATION_COLORS)) {
      if (education.toLowerCase().includes(key.toLowerCase())) {
        return color
      }
    }
    return EDUCATION_COLORS['Pregrado'] || '#64748b'
  }

  // Selected node object
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

  return (
    <Card className={cn('border-border/60 shadow-xs overflow-hidden', className)}>
      {/* Header with Title and Strategic Network Metrics */}
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
                <Badge variant='outline' className='text-[10px] py-0 px-1.5 font-normal border-primary/30 text-primary bg-primary/5'>
                  Fase 3
                </Badge>
              </div>
              <CardDescription className='text-xs mt-0.5 line-clamp-1'>
                {description} {groupName ? `— ${groupName}` : ''}
              </CardDescription>
            </div>
          </div>

          {/* KPI Mini-Cards Bar */}
          <div className='flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs'>
            <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border/60 shadow-2xs'>
              <Users className='h-3.5 w-3.5 text-blue-500' />
              <span className='text-muted-foreground'>Nodos:</span>
              <span className='font-bold tabular-nums'>{data.metrics.total_nodes}</span>
            </div>
            <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border/60 shadow-2xs'>
              <GitFork className='h-3.5 w-3.5 text-emerald-500' />
              <span className='text-muted-foreground'>Lazos:</span>
              <span className='font-bold tabular-nums'>{data.metrics.total_edges}</span>
            </div>
            <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border/60 shadow-2xs'>
              <Activity className='h-3.5 w-3.5 text-indigo-500' />
              <span className='text-muted-foreground'>Cohesión:</span>
              <span className='font-bold tabular-nums'>{data.metrics.cohesion_index}%</span>
            </div>
            <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border/60 shadow-2xs'>
              <Award className='h-3.5 w-3.5 text-amber-500' />
              <span className='text-muted-foreground'>Máx. Coautoría:</span>
              <span className='font-bold tabular-nums'>{data.metrics.max_weight} docs</span>
            </div>
          </div>
        </div>

        {/* Toolbar / Filters */}
        <div className='flex flex-wrap items-center justify-between gap-2 pt-2 text-xs'>
          {/* Quick Filters */}
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

            <Button
              variant={hideIsolated ? 'secondary' : 'ghost'}
              size='sm'
              className='h-6 text-[10px] px-2 ml-1 text-muted-foreground'
              onClick={() => setHideIsolated(!hideIsolated)}
            >
              {hideIsolated ? <EyeOff className='h-3 w-3 mr-1 text-primary' /> : <Eye className='h-3 w-3 mr-1' />}
              {hideIsolated ? 'Mostrando con enlaces' : 'Ocultar aislados'}
            </Button>
          </div>

          {/* Search Box */}
          <div className='relative w-full sm:w-48'>
            <Search className='absolute left-2 top-1.5 h-3 w-3 text-muted-foreground' />
            <Input
              placeholder='Buscar integrante...'
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                const query = e.target.value.toLowerCase().trim()
                if (query) {
                  const match = filteredNodes.find((n) => n.name.toLowerCase().includes(query))
                  if (match) setSelectedNodeId(match.id)
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
        {/* Main Interactive SVG Canvas */}
        <div className='flex-1 relative bg-slate-950/5 dark:bg-black/20 min-h-[440px] sm:min-h-[520px] flex items-center justify-center overflow-hidden'>
          <svg
            viewBox='0 0 800 540'
            className='w-full h-full max-h-[540px] select-none cursor-default'
            onClick={() => {
              setSelectedNodeId(null)
              setHoveredNodeId(null)
            }}
          >
            <defs>
              {/* Radial gradient backgrounds for focus */}
              <radialGradient id='focusGlow' cx='50%' cy='50%' r='50%'>
                <stop offset='0%' stopColor='hsl(var(--primary))' stopOpacity='0.4' />
                <stop offset='100%' stopColor='hsl(var(--primary))' stopOpacity='0' />
              </radialGradient>
            </defs>

            {/* Background subtle connection web */}
            <g className='edges-layer'>
              {filteredEdges.map((edge) => {
                const pSrc = positions[edge.source]
                const pTgt = positions[edge.target]
                if (!pSrc || !pTgt) return null

                const isConnectedToFocus =
                  activeFocusId &&
                  (edge.source === activeFocusId || edge.target === activeFocusId)

                const isDimmed = activeFocusId && !isConnectedToFocus

                const strokeWidth = isConnectedToFocus
                  ? getEdgeWidth(edge.weight) * 1.5 + 1
                  : getEdgeWidth(edge.weight)

                const strokeColor = isConnectedToFocus
                  ? 'hsl(var(--primary))'
                  : 'currentColor'

                const opacity = isConnectedToFocus
                  ? 0.95
                  : isDimmed
                  ? 0.08
                  : Math.max(0.18, Math.min(0.65, edge.weight / maxWeight))

                return (
                  <line
                    key={`${edge.source}-${edge.target}`}
                    x1={pSrc.x}
                    y1={pSrc.y}
                    x2={pTgt.x}
                    y2={pTgt.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    className='transition-all duration-200 text-slate-400 dark:text-slate-600'
                    onMouseEnter={() => setHoveredEdge(edge)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                )
              })}
            </g>

            {/* Nodes Layer */}
            <g className='nodes-layer'>
              {filteredNodes.map((node) => {
                const pos = positions[node.id]
                if (!pos) return null

                const isSelected = selectedNodeId === node.id
                const isHovered = hoveredNodeId === node.id
                const isDirectNeighbor = activeNeighbors.has(node.id)
                const isHighlighted = isSelected || isHovered || isDirectNeighbor
                const isDimmed = activeFocusId && !isHighlighted

                const radius = getNodeRadius(node.products_count)
                const color = getNodeColor(node.education)

                // Search query match highlight
                const isSearchMatch =
                  searchQuery.trim() &&
                  node.name.toLowerCase().includes(searchQuery.toLowerCase().trim())

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className={cn(
                      'cursor-pointer transition-opacity duration-200',
                      isDimmed ? 'opacity-20' : 'opacity-100'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedNodeId(isSelected ? null : node.id)
                    }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                  >
                    {/* Glowing ring if selected or search match */}
                    {(isSelected || isSearchMatch) && (
                      <circle
                        r={radius + 8}
                        className='animate-pulse fill-primary/20 stroke-primary stroke-2'
                      />
                    )}

                    {/* Neighbor ring */}
                    {isDirectNeighbor && (
                      <circle
                        r={radius + 5}
                        fill='none'
                        stroke='hsl(var(--primary))'
                        strokeWidth='1.5'
                        strokeDasharray='3 3'
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      r={radius}
                      fill={color}
                      stroke='#ffffff'
                      strokeWidth={isSelected ? 3 : 1.5}
                      className='shadow-md transition-transform duration-150 hover:scale-115'
                    />

                    {/* Degree or count label inside node if large enough */}
                    {radius >= 14 && (
                      <text
                        textAnchor='middle'
                        dy='.32em'
                        fill='#ffffff'
                        fontSize='9px'
                        fontWeight='bold'
                        className='pointer-events-none drop-shadow-xs'
                      >
                        {node.products_count}
                      </text>
                    )}

                    {/* Name Label (shown on highlight, top nodes, or search match) */}
                    {(isHighlighted || isSearchMatch || node.products_count >= 25 || radius >= 16) && (
                      <text
                        x={0}
                        y={radius + 12}
                        textAnchor='middle'
                        fontSize='9.5px'
                        className={cn(
                          'pointer-events-none font-medium drop-shadow-2xs',
                          isSelected || isSearchMatch
                            ? 'fill-foreground font-bold text-[10px]'
                            : isDirectNeighbor
                            ? 'fill-primary font-semibold'
                            : 'fill-muted-foreground'
                        )}
                      >
                        {node.name.split(' ').slice(0, 2).join(' ')}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>

          {/* Floating Edge Tooltip */}
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

          {/* Canvas Bottom-Right Legend */}
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
          </div>
        </div>

        {/* Right Details Panel for Active Researcher Focus */}
        <div className='w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-border/60 bg-card p-4 flex flex-col justify-between'>
          {activeNode ? (
            <div className='space-y-4'>
              {/* Header with avatar & name */}
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

              {/* Node Metrics */}
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

              {/* Direct Collaborators List */}
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

              {/* Link to Researcher Profile */}
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
                  Haz clic o sitúa el cursor sobre cualquier nodo del grafo para examinar sus lazos de
                  coautoría, publicaciones conjuntas y centralidad en el grupo.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
