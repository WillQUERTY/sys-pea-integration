import { api } from './client'
import type {
  Group,
  Researcher,
  Product,
  Project,
  PagedResponse,
} from '../types'

export interface GroupListParams {
  skip?: number
  limit?: number
  search?: string
  status?: string
  classification?: string
}

export async function listGroups(params?: GroupListParams) {
  const { data } = await api.get<PagedResponse<Group>>('/groups', { params })
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

export async function linkMember(
  groupId: number,
  researcherId: number,
  req: { role?: string; start_date?: string; end_date?: string }
) {
  const { data } = await api.post(
    `/groups/${groupId}/members/${researcherId}`,
    req
  )
  return data
}

export interface GroupMembership {
  researcher_external_code: string
  role: string
  start_date: string
  end_date: string
  /** true = vinculación vigente (sin fecha de fin, convención GrupLAC) */
  is_current: boolean
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
  const { data } = await api.put(
    `/groups/${groupId}/members/${researcherId}`,
    req
  )
  return data
}

export async function unlinkMember(groupId: number, researcherId: number) {
  const { data } = await api.delete(
    `/groups/${groupId}/members/${researcherId}`
  )
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
  const { data } = await api.delete(
    `/groups/${groupId}/research-lines/${encodeURIComponent(name)}`
  )
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

export async function deleteGroup(id: number, soft: boolean = true) {
  const { data } = await api.delete(`/groups/${id}`, { params: { soft } })
  return data
}
