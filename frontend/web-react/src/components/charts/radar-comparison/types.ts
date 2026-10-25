import type React from 'react'
import {
  BookOpen,
  Cpu,
  Globe,
  GraduationCap,
  Share2,
  TrendingUp,
} from 'lucide-react'

export interface PaletteItem {
  stroke: string
  fill: string
  badge: string
  dot: string
  pill: string
}

export const COMPARISON_GROUP_PALETTE: PaletteItem[] = [
  {
    stroke: '#059669', // Emerald
    fill: '#059669',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  },
  {
    stroke: '#2563eb', // Blue
    fill: '#2563eb',
    badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    dot: 'bg-blue-500',
    pill: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
  },
  {
    stroke: '#d97706', // Amber
    fill: '#d97706',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
    pill: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  },
  {
    stroke: '#7c3aed', // Violet
    fill: '#7c3aed',
    badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30',
    dot: 'bg-violet-500',
    pill: 'bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 border-violet-300 dark:border-violet-800',
  },
  {
    stroke: '#e11d48', // Rose
    fill: '#e11d48',
    badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
    dot: 'bg-rose-500',
    pill: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  },
  {
    stroke: '#0891b2', // Cyan
    fill: '#0891b2',
    badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
    dot: 'bg-cyan-500',
    pill: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
  },
]

export interface BenchmarkOption {
  id: number
  acronym: string
  name: string
  description: string
  badgeText: string
}

export const BENCHMARK_OPTIONS: BenchmarkOption[] = [
  {
    id: -1,
    acronym: 'Media UPC',
    name: 'Promedio Institucional UPC',
    description: 'Línea base institucional calculada',
    badgeText: 'Línea Base',
  },
  {
    id: -2,
    acronym: 'Meta A1',
    name: 'Estándar Minciencias (Cat. A1)',
    description: 'Meta normativa de investigación de excelencia',
    badgeText: 'Meta A1',
  },
]

export const DIMENSION_ICONS: Record<string, React.ElementType> = {
  gnc: BookOpen,
  dti: Cpu,
  asc: Globe,
  frh: GraduationCap,
  cohesion: Share2,
  productivity: TrendingUp,
}

export interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any
  }>
}

export interface SharedResearcher {
  name: string
  education: string
  groups: string[]
}

export interface GroupsRadarComparisonProps {
  initialGroupIds?: number[]
  className?: string
  showGroupSelector?: boolean
}
