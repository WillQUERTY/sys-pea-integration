import { api } from './client'
import type { WorkPlan } from '../types'

export async function getGroupPlans(groupId: number) {
  const { data } = await api.get<WorkPlan[]>(`/groups/${groupId}/plans`)
  return data
}

export async function createPlan(groupId: number, plan: Partial<WorkPlan>) {
  const { data } = await api.post<WorkPlan>(`/groups/${groupId}/plans`, plan)
  return data
}

export async function updatePlan(planId: number, plan: Partial<WorkPlan>) {
  const { data } = await api.put<WorkPlan>(`/plans/${planId}`, plan)
  return data
}

export async function deletePlan(planId: number, soft = true) {
  const { data } = await api.delete(`/plans/${planId}`, { params: { soft } })
  return data
}

export async function restorePlan(planId: number) {
  const { data } = await api.post(`/plans/${planId}/restore`)
  return data
}
