import { api } from './client'
import type { Group, Project, PagedResponse } from '../types'

export async function listProjects(params?: {
  skip?: number
  limit?: number
  search?: string
  status?: string
  project_type?: string
}) {
  const { data } = await api.get<PagedResponse<Project>>('/projects', {
    params,
  })
  return data
}

export async function getProject(id: number) {
  const { data } = await api.get<Project>(`/projects/${id}`)
  return data
}

export async function getProjectGroups(id: number) {
  const { data } = await api.get<Group[]>(`/projects/${id}/groups`)
  return data
}

export async function createProject(project: Partial<Project>) {
  const { data } = await api.post<Project>('/projects', project)
  return data
}

export async function updateProject(id: number, project: Partial<Project>) {
  const { data } = await api.put<Project>(`/projects/${id}`, project)
  return data
}

export async function deleteProject(id: number, soft: boolean = true) {
  const { data } = await api.delete(`/projects/${id}`, { params: { soft } })
  return data
}

export async function restoreProject(id: number) {
  const { data } = await api.post(`/projects/${id}/restore`)
  return data
}
