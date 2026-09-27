import axios from 'axios'
import type {
  Group,
  Researcher,
  Product,
  Project,
  ProductFilters,
  ValidationQueueItem,
  GruplacPreview,
  ImportResult,
  GroupSearchResult,
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
export async function getGroupProjects(id: number) {
  const { data } = await api.get<Project[]>(`/groups/${id}/projects`)
  return data
}
export async function getGroupResearchLines(id: number) {
  const { data } = await api.get<string[]>(`/groups/${id}/research-lines`)
  return data
}
export async function linkMember(groupId: number, researcherId: number, req: { role?: string, start_date?: string, end_date?: string }) {
  const { data } = await api.post(`/groups/${groupId}/members/${researcherId}`, req)
  return data
}
export interface GroupMembership {
  researcher_external_code: string
  role: string
  start_date: string
  end_date: string
  status: string
  researcher_id: number | null
  researcher_name: string
}
export async function getGroupMemberships(id: number) {
  const { data } = await api.get<GroupMembership[]>(`/groups/${id}/memberships`)
  return data
}
export async function updateMember(
  groupId: number,
  researcherId: number,
  req: { role?: string; start_date?: string; end_date?: string }
) {
  const { data } = await api.put(`/groups/${groupId}/members/${researcherId}`, req)
  return data
}
export async function unlinkMember(groupId: number, researcherId: number) {
  const { data } = await api.delete(`/groups/${groupId}/members/${researcherId}`)
  return data
}
export async function linkProduct(groupId: number, productId: number) {
  const { data } = await api.post(`/groups/${groupId}/products/${productId}`)
  return data
}
export async function unlinkProduct(groupId: number, productId: number) {
  const { data } = await api.delete(`/groups/${groupId}/products/${productId}`)
  return data
}
export async function linkProject(groupId: number, project: Partial<Project>) {
  const { data } = await api.post(`/groups/${groupId}/projects`, project)
  return data
}
export async function unlinkProject(groupId: number, projectId: number) {
  const { data } = await api.delete(`/groups/${groupId}/projects/${projectId}`)
  return data
}
export async function linkResearchLine(groupId: number, name: string) {
  const { data } = await api.post(`/groups/${groupId}/research-lines`, { name })
  return data
}
export async function unlinkResearchLine(groupId: number, name: string) {
  const { data } = await api.delete(`/groups/${groupId}/research-lines/${encodeURIComponent(name)}`)
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
export async function restoreGroup(id: number) {
  const { data } = await api.post(`/groups/${id}/restore`)
  return data
}
export async function restoreResearcher(id: number) {
  const { data } = await api.post(`/researchers/${id}/restore`)
  return data
}
export async function restoreProduct(id: number) {
  const { data } = await api.post(`/products/${id}/restore`)
  return data
}
export async function deleteGroup(id: number, soft: boolean = true) {
  const { data } = await api.delete(`/groups/${id}`, { params: { soft } })
  return data
}

// --- Researchers ---
export async function listResearchers(params?: { 
  skip?: number; 
  limit?: number; 
  search?: string; 
  status?: string;
  educational_level?: string;
  category?: string;
}) {
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
export async function getResearcherGroups(id: number) {
  const { data } = await api.get<Group[]>(`/researchers/${id}/groups`)
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
export interface ProductCatalogs {
  families: Array<{ id: number; name: string }>
  subtypes: Array<{ id: number; family_id: number; name: string }>
  quality_categories: Array<{ id: number; name: string }>
}
export async function getProductCatalogs() {
  const { data } = await api.get<ProductCatalogs>('/products/catalogs')
  return data
}
export interface ProductAuthor {
  id: number
  author_order: number
  researcher_db_id: number | null
  researcher_id: number | null
  researcher_external_code: string
  researcher_name: string
  external_author_name: string
  external_author_identifier: string
  match_status: string
}
export async function getProductAuthors(id: number) {
  const { data } = await api.get<ProductAuthor[]>(`/products/${id}/authors`)
  return data
}
export async function addProductAuthor(
  id: number,
  req: { researcher_id?: number; author_order?: number; external_author_name?: string; external_author_identifier?: string }
) {
  const { data } = await api.post(`/products/${id}/authors`, req)
  return data
}
export async function removeProductAuthor(id: number, params: { researcher_id?: number; external_author_name?: string }) {
  const { data } = await api.delete(`/products/${id}/authors`, { params })
  return data
}
export async function validateProduct(id: number, validationStatus: 'valid' | 'rejected' | 'pending', reason?: string) {
  const { data } = await api.patch<Product>(`/products/${id}/validation`, {
    validation_status: validationStatus,
    reason,
  })
  return data
}

// --- Reports ---
export function groupReportPdfUrl(id: number) {
  return `${api.defaults.baseURL}/groups/${id}/report/pdf`
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
export async function cancelValidationItem(itemId: number) {
  const { data } = await api.delete<{ status: string; item_id: number }>(
    `/system/validation-queue/${itemId}`
  )
  return data
}
export async function enqueueValidation(productId: number) {
  const { data } = await api.post<{ status: string; product_id: number; queue_size: number }>(
    '/system/validation-queue/enqueue',
    { product_id: productId }
  )
  return data
}

// --- Ingestion (GrupLAC two-phase, CvLAC) ---
export async function previewGruplac(url: string, groupCode?: string) {
  const { data } = await api.post<GruplacPreview>('/groups/import/gruplac/preview', {
    url,
    group_code: groupCode,
  })
  return data
}
export async function importGruplac(url: string, enrichCvlac: boolean = false, groupCode?: string) {
  const { data } = await api.post<ImportResult>('/groups/import/gruplac', {
    url,
    enrich_cvlac: enrichCvlac,
    group_code: groupCode,
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

export async function searchGroupsScienti(params: {
  q?: string
  departamento?: string
  institucion?: string
  clasificacion?: string
  limit?: number
}) {
  const { data } = await api.get<GroupSearchResult[]>('/groups/search/scienti', { params })
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

// --- System persistence (notas 9 y 10: init con/sin datos, archivo y BD) ---
export async function initializeEmpty() {
  const { data } = await api.post('/system/initialize/empty', { confirm: true })
  return data
}
export async function initializeFromFile(path: string) {
  const { data } = await api.post('/system/initialize/file', { path })
  return data
}
export async function initializeFromDatabase(connectionString: string) {
  const { data } = await api.post('/system/initialize/database', { connection_string: connectionString })
  return data
}
export async function saveToDatabase(connectionString: string) {
  const { data } = await api.post('/system/save/database', { connection_string: connectionString })
  return data
}
export async function exportToFile(path: string = 'pea_data.json') {
  const { data } = await api.get('/system/export', { params: { path } })
  return data
}

// --- Dashboard ---
export interface DashboardStats {
  total_groups: number
  total_researchers: number
  total_products: number
  validation: Record<string, number>
  by_year: Array<{ year: string; count: number }>
  groups_by_classification: Record<string, number>
}

export async function getDashboardStats() {
  const { data } = await api.get<DashboardStats>('/dashboard/stats')
  return data
}
