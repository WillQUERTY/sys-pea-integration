import { api } from './client'
import type { UndoOperation } from '../types'

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
  const { data } = await api.post('/system/initialize/database', {
    connection_string: connectionString,
  })
  return data
}

export async function saveToDatabase(connectionString: string) {
  const { data } = await api.post('/system/save/database', {
    connection_string: connectionString,
  })
  return data
}

export async function exportToFile(path: string = 'pea_data.json') {
  const { data } = await api.get('/system/export', { params: { path } })
  return data
}
