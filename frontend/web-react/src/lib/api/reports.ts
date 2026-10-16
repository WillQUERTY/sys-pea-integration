import { api } from './client'

export function groupReportPdfUrl(
  id: number,
  window?: { start_year?: number; end_year?: number; window_years?: number }
) {
  const base = `${api.defaults.baseURL}/groups/${id}/report/pdf`
  if (!window) return base
  const qs = new URLSearchParams()
  if (window.start_year) qs.set('start_year', String(window.start_year))
  if (window.end_year) qs.set('end_year', String(window.end_year))
  if (window.window_years) qs.set('window_years', String(window.window_years))
  const s = qs.toString()
  return s ? `${base}?${s}` : base
}

export function groupDossierPdfUrl(
  id: number | string,
  window?: { start_year?: number; end_year?: number; window_years?: number }
) {
  const base = `${api.defaults.baseURL}/groups/${id}/dossier/pdf`
  if (!window) return base
  const qs = new URLSearchParams()
  if (window.start_year) qs.set('start_year', String(window.start_year))
  if (window.end_year) qs.set('end_year', String(window.end_year))
  if (window.window_years) qs.set('window_years', String(window.window_years))
  const s = qs.toString()
  return s ? `${base}?${s}` : base
}

export function groupExportRankingCsvUrl(id: number | string) {
  return `${api.defaults.baseURL}/groups/${id}/export/ranking.csv`
}

export function groupExportProductsCsvUrl(
  id: number | string,
  window?: { start_year?: number; end_year?: number; window_years?: number }
) {
  const base = `${api.defaults.baseURL}/groups/${id}/export/products.csv`
  if (!window) return base
  const qs = new URLSearchParams()
  if (window.start_year) qs.set('start_year', String(window.start_year))
  if (window.end_year) qs.set('end_year', String(window.end_year))
  if (window.window_years) qs.set('window_years', String(window.window_years))
  const s = qs.toString()
  return s ? `${base}?${s}` : base
}
