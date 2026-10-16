import type { GroupCollaborationNetworkData } from '@/lib/api'

export interface GroupCollaborationNetworkProps {
  data?: GroupCollaborationNetworkData
  groupName?: string
  className?: string
  title?: string
  description?: string
  isLoading?: boolean
}

export interface Point {
  x: number
  y: number
}

export interface ViewState {
  x: number
  y: number
  k: number
}

export const W = 800
export const H = 540
export const MIN_ZOOM = 0.3
export const MAX_ZOOM = 5
export const VW = W * 1.7
export const VH = H * 1.7
