import axios from 'axios'
import type {
  Group,
  Researcher,
  Product,
  ProductFilters,
  ValidationQueueItem,
  GruplacPreview,
  ImportResult,
  UndoOperation,
} from './types'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

export const api = axios.create({ baseURL, timeout: 120_000 })

// --- Groups ---
export async function listGroups(params?: { skip?: number; limit?: number; search?: string }) {
  const { data } = await api.get<Group[]>('/groups', { params: { limit: 500, ...params } })
  return data
}
export async function getGroup(id: number) {
  const { data } = await api.get<Group>(`/groups/${id}`)
  return data
}
export async function getGroupMembers(id: number) {
  const { data } = await api.get<Researcher[]>(`/groups/${id}/members`)
  return data
}
export async function getGroupProducts(id: number) {
  const { data } = await api.get<Product[]>(`/groups/${id}/products`)
  return data
}
export async function createGroup(group: Partial<Group>) {
  const { data } = await api.post<Group>('/groups', group)
  return data
}
export async function updateGroup(id: number, group: Partial<Group>) {
  const { data } = await api.put<Group>(`/groups/${id}`, group)
  return data
}
export async function deleteGroup(id: number, soft: boolean = true) {
  const { data } = await api.delete(`/groups/${id}`, { params: { soft } })
  return data
}

// --- Researchers ---
export async function listResearchers(params?: { skip?: number; limit?: number; search?: string; status?: string }) {
  const { data } = await api.get<Researcher[]>('/researchers', { params: { limit: 1000, ...params } })
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
export async function createResearcher(researcher: Partial<Researcher>) {
  const { data } = await api.post<Researcher>('/researchers', researcher)
  return data
}
export async function updateResearcher(id: number, researcher: Partial<Researcher>) {
  const { data } = await api.put<Researcher>(`/researchers/${id}`, researcher)
  return data
}
export async function deleteResearcher(id: number, soft: boolean = true) {
  const { data } = await api.delete(`/researchers/${id}`, { params: { soft } })
  return data
}

// --- Products ---
export async function listProducts(filters?: ProductFilters) {
  const { data } = await api.get<Product[]>('/products', { params: { limit: 1000, ...filters } })
  return data
}
export async function getProduct(id: number) {
  const { data } = await api.get<Product>(`/products/${id}`)
  return data
}
export async function createProduct(product: Partial<Product>) {
  const { data } = await api.post<Product>('/products', product)
  return data
}
export async function updateProduct(id: number, product: Partial<Product>) {
  const { data } = await api.put<Product>(`/products/${id}`, product)
  return data
}
export async function deleteProduct(id: number, soft: boolean = true) {
  const { data } = await api.delete(`/products/${id}`, { params: { soft } })
  return data
}
export async function validateProduct(id: number, validationStatus: 'valid' | 'rejected' | 'pending', reason?: string) {
  const { data } = await api.patch<Product>(`/products/${id}/validation`, {
    validation_status: validationStatus,
    reason,
  })
  return data
}

// --- Validation queue (FIFO) ---
export async function listValidationQueue() {
  const { data } = await api.get<ValidationQueueItem[]>('/system/validation-queue')
  return data
}
export async function processNextValidation() {
  const { data } = await api.post<{ status: string; remaining_pending: number }>(
    '/system/validation-queue/process-next'
  )
  return data
}

// --- Ingestion (GrupLAC two-phase, CvLAC) ---
export async function previewGruplac(url: string) {
  const { data } = await api.post<GruplacPreview>('/groups/import/gruplac/preview', { url })
  return data
}
export async function importGruplac(url: string, enrichCvlac: boolean = false) {
  const { data } = await api.post<ImportResult>('/groups/import/gruplac', {
    url,
    enrich_cvlac: enrichCvlac,
  })
  return data
}
export async function importCvlac(text: string, targetGroupCode?: string) {
  const { data } = await api.post<ImportResult>('/researchers/import/cvlac', {
    text,
    target_group_code: targetGroupCode,
  })
  return data
}
export async function importCvlacByCodRh(codRh: string, targetGroupCode?: string) {
  const { data } = await api.post<ImportResult>('/researchers/import/cvlac/by-cod-rh', {
    cod_rh: codRh,
    target_group_code: targetGroupCode,
  })
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
  const { data } = await api.post<EnrichResult>(`/researchers/${id}/enrich/datos-abiertos`)
  return data
}
export async function enrichAllResearchers(opts?: { only_missing?: boolean; limit?: number }) {
  const { data } = await api.post<EnrichAllResult>('/researchers/enrich/datos-abiertos', {
    only_missing: opts?.only_missing ?? true,
    limit: opts?.limit ?? 0,
  })
  return data
}

// --- System Undo (LIFO) ---
export async function getUndoStack() {
  const { data } = await api.get<UndoOperation[]>('/system/undo')
  return data
}
export async function performUndo() {
  const { data } = await api.post('/system/undo')
  return data
}
export async function clearUndoStack() {
  const { data } = await api.delete('/system/undo')
  return data
}
