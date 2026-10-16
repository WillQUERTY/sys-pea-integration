import { api } from './client'
import type { ValidationQueueResponse } from '../types'

export interface ValidationQueueFilters {
  skip?: number
  limit?: number
  status?: string
  search?: string
}

export async function listValidationQueue(filters?: ValidationQueueFilters) {
  const { data } = await api.get<ValidationQueueResponse>(
    '/system/validation-queue',
    {
      params: filters,
    }
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
  const { data } = await api.post<{
    status: string
    product_id: number
    queue_size: number
  }>('/system/validation-queue/enqueue', { product_id: productId })
  return data
}
