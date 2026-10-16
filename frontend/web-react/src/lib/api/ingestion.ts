import { api, fileForm } from './client'
import type {
  GruplacPreview,
  ImportResult,
  CsvImportPreview,
  CsvImportResult,
  GroupSearchResult,
} from '../types'

// --- Ingestion (GrupLAC two-phase, CvLAC) ---
export async function previewGruplac(url: string, groupCode?: string) {
  const { data } = await api.post<GruplacPreview>(
    '/groups/import/gruplac/preview',
    {
      url,
      group_code: groupCode,
    }
  )
  return data
}

export async function importGruplac(
  url: string,
  enrichCvlac: boolean = false,
  groupCode?: string
) {
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

export async function importCvlacByCodRh(
  codRh: string,
  targetGroupCode?: string
) {
  const { data } = await api.post<ImportResult>(
    '/researchers/import/cvlac/by-cod-rh',
    {
      cod_rh: codRh,
      target_group_code: targetGroupCode,
    }
  )
  return data
}

// --- Importación por archivo (T-12 CSV / T-13 PDF) ---
export async function previewCsvImport(file: File) {
  const { data } = await api.post<CsvImportPreview>(
    '/groups/import/csv/preview',
    fileForm(file)
  )
  return data
}

// timeout: 0 = sin timeout del navegador: cada fila es una transacción
// idempotente y el backend sigue aunque el cliente se cancele.
export async function importCsv(file: File, enrichGruplac: boolean = false) {
  const { data } = await api.post<CsvImportResult>(
    '/groups/import/csv',
    fileForm(file, { enrich_gruplac: String(enrichGruplac) }),
    { timeout: 0 }
  )
  return data
}

export async function previewPdfImport(file: File) {
  const { data } = await api.post<GruplacPreview>(
    '/groups/import/pdf/preview',
    fileForm(file)
  )
  return data
}

export async function importPdf(file: File) {
  const { data } = await api.post<ImportResult>(
    '/groups/import/pdf',
    fileForm(file),
    {
      timeout: 0,
    }
  )
  return data
}

export async function previewPdfScientiImport(file: File) {
  const { data } = await api.post<GruplacPreview>(
    '/groups/import/pdf-scienti/preview',
    fileForm(file)
  )
  return data
}

export async function importPdfScienti(file: File) {
  const { data } = await api.post<ImportResult>(
    '/groups/import/pdf-scienti',
    fileForm(file),
    {
      timeout: 0,
    }
  )
  return data
}

export async function searchGroupsScienti(params: {
  q?: string
  departamento?: string
  institucion?: string
  clasificacion?: string
  limit?: number
}) {
  const { data } = await api.get<GroupSearchResult[]>(
    '/groups/search/scienti',
    { params }
  )
  return data
}
