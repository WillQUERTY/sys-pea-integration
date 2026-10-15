import { api } from './client'
import type { Researcher, Product, Group, PagedResponse } from '../types'

export async function listResearchers(params?: {
  skip?: number
  limit?: number
  search?: string
  status?: string
  educational_level?: string
  category?: string
  group_id?: number
}) {
  const { data } = await api.get<PagedResponse<Researcher>>('/researchers', {
    params,
  })
  return data
}

export async function getResearcher(id: number) {
  const { data } = await api.get<Researcher>(`/researchers/${id}`)
  return data
}

export async function getResearcherProducts(id: number) {
  const { data } = await api.get<Product[]>(`/researchers/${id}/products`)
  return data
}

export async function getResearcherGroups(id: number) {
  const { data } = await api.get<Group[]>(`/researchers/${id}/groups`)
  return data
}

export async function createResearcher(researcher: Partial<Researcher>) {
  const { data } = await api.post<Researcher>('/researchers', researcher)
  return data
}

export async function updateResearcher(
  id: number,
  researcher: Partial<Researcher>
) {
  const { data } = await api.put<Researcher>(`/researchers/${id}`, researcher)
  return data
}

export async function deleteResearcher(id: number, soft: boolean = true) {
  const { data } = await api.delete(`/researchers/${id}`, { params: { soft } })
  return data
}

export async function restoreResearcher(id: number) {
  const { data } = await api.post(`/researchers/${id}/restore`)
  return data
}

// --- Enriquecimiento desde datos abiertos (Socrata Minciencias) ---
export interface EnrichResult {
  status: string
  researcher_id?: number
  external_code?: string
  fields_updated?: string[]
  clasificacion?: string
  convocatoria?: string
  message?: string
}

export interface EnrichAllResult {
  status: string
  processed: number
  enriched: number
  not_found: number
  up_to_date: number
  details: EnrichResult[]
}

export async function enrichResearcher(id: number) {
  const { data } = await api.post<EnrichResult>(
    `/researchers/${id}/enrich/datos-abiertos`
  )
  return data
}

export async function enrichAllResearchers(opts?: {
  only_missing?: boolean
  limit?: number
}) {
  const { data } = await api.post<EnrichAllResult>(
    '/researchers/enrich/datos-abiertos',
    {
      only_missing: opts?.only_missing ?? true,
      limit: opts?.limit ?? 0,
    }
  )
  return data
}
