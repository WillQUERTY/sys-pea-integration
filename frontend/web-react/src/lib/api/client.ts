import axios from 'axios'

export const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1'

export const api = axios.create({ baseURL, timeout: 120_000 })

/**
 * Primer multipart de la app: axios fija el boundary del FormData solo si el
 * body es FormData (sin Content-Type manual).
 */
export function fileForm(file: File, extra?: Record<string, string>): FormData {
  const form = new FormData()
  form.append('file', file)
  for (const [key, value] of Object.entries(extra ?? {})) {
    form.append(key, value)
  }
  return form
}
