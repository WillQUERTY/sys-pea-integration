import { useEffect, useRef } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  golden: boolean
}

interface Edge {
  a: number
  b: number
}

function buildGraph(w: number, h: number, count = 38): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = Array.from({ length: count }, (_, i) => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    r: Math.random() * 2.5 + 2,
    golden: i < 5, // first 5 are amber accent nodes
  }))

  const edges: Edge[] = []
  const maxDist = w * 0.22
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      const dx = nodes[a].x - nodes[b].x
      const dy = nodes[a].y - nodes[b].y
      if (Math.sqrt(dx * dx + dy * dy) < maxDist) {
        edges.push({ a, b })
      }
    }
  }
  return { nodes, edges }
}

interface KnowledgeGraphProps {
  className?: string
}

export function KnowledgeGraph({ className }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const stateRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    let W = canvas.offsetWidth
    let H = canvas.offsetHeight

    const resize = () => {
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.scale(dpr, dpr)
      stateRef.current = buildGraph(W, H)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // Usuarios con movimiento reducido: un solo marco estático, sin bucle de rAF
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const tick = () => {
      if (!stateRef.current) return
      const { nodes, edges } = stateRef.current

      // update positions
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
      }

      // recompute edges dynamically
      const maxDist = W * 0.2
      edges.length = 0
      for (let a = 0; a < nodes.length; a++) {
        let conn = 0
        for (let b = a + 1; b < nodes.length && conn < 4; b++) {
          const dx = nodes[a].x - nodes[b].x
          const dy = nodes[a].y - nodes[b].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < maxDist) {
            edges.push({ a, b })
            conn++
          }
        }
      }

      ctx.clearRect(0, 0, W, H)

      // draw edges
      for (const { a, b } of edges) {
        const na = nodes[a]
        const nb = nodes[b]
        const dx = na.x - nb.x
        const dy = na.y - nb.y
        const d = Math.sqrt(dx * dx + dy * dy)
        const alpha = Math.max(0, 1 - d / (W * 0.2))

        const isGolden = na.golden || nb.golden
        ctx.beginPath()
        ctx.moveTo(na.x, na.y)
        ctx.lineTo(nb.x, nb.y)
        ctx.strokeStyle = isGolden
          ? `rgba(245, 158, 11, ${alpha * 0.4})`
          : `rgba(255, 255, 255, ${alpha * 0.22})`
        ctx.lineWidth = isGolden ? 1.2 : 0.8
        ctx.stroke()
      }

      // draw nodes
      for (const n of nodes) {
        if (n.golden) {
          // amber glow
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 5)
          grad.addColorStop(0, 'rgba(245, 158, 11, 0.6)')
          grad.addColorStop(1, 'rgba(245, 158, 11, 0)')
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.r * 5, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = n.golden ? '#f59e0b' : 'rgba(255,255,255,0.75)'
        ctx.fill()
      }

      if (!reducedMotion) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    if (reducedMotion) {
      tick()
    } else {
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
