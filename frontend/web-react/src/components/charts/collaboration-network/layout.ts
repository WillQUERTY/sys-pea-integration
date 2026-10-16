import type { NetworkEdge, NetworkNode } from '@/lib/api'
import { EDUCATION_COLORS } from '../chart-tokens'
import {
  H,
  MIN_ZOOM,
  type Point,
  VH,
  type ViewState,
  VW,
  W,
} from './types'

export function lighten(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

export function eduKey(education: string): string {
  const e = (education || '').toLowerCase()
  for (const key of Object.keys(EDUCATION_COLORS)) {
    if (e.includes(key.toLowerCase())) return key
  }
  return 'Pregrado'
}

export function getNodeColor(education: string): string {
  return EDUCATION_COLORS[eduKey(education)] ?? '#64748b'
}

export function shortName(full: string): string {
  const w = full.trim().split(/\s+/).filter(Boolean)
  if (w.length <= 2) return w.join(' ')
  if (w.length === 3) return `${w[0]} ${w[1]}`
  return `${w[0]} ${w[w.length - 2]}`
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

export function curvedPath(a: Point, b: Point, idx: number): string {
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

export function toSvgPoint(el: SVGSVGElement, clientX: number, clientY: number): Point {
  const pt = el.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const m = el.getScreenCTM()
  if (!m) return { x: clientX, y: clientY }
  const r = pt.matrixTransform(m.inverse())
  return { x: r.x, y: r.y }
}

export function computeLayout(
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
