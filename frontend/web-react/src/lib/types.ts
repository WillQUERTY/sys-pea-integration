// PEA-i domain types — mirror of backend/app/models.py

export interface Group {
  id?: number
  external_code: string
  name: string
  acronym?: string | null
  institution?: string | null
  classification?: string | null
  description?: string | null
  mission?: string | null
  vision?: string | null
  declared_creation_date?: string | null
  knowledge_area?: string | null
  knowledge_subarea?: string | null
  city?: string | null
  department?: string | null
  website?: string | null
  email?: string | null
  leader_id?: number | null
  status?: string | null
}

export interface Researcher {
  id?: number
  external_code: string
  identification_type?: string | null
  identification_number?: string | null
  first_names: string
  last_names: string
  nationality?: string | null
  country_of_residence?: string | null
  institutional_email?: string | null
  orcid?: string | null
  highest_education_level?: string | null
  education_records?: string | null
  classification_records?: string | null
  status?: string | null
}

export interface Product {
  id?: number
  external_code: string
  title: string
  description?: string | null
  family_id?: number | null
  subtype_id?: number | null
  quality_category_id?: number | null
  obtained_date?: string | null
  publication_date?: string | null
  validation_status?: string | null
  language?: string | null
  country?: string | null
  doi?: string | null
  isbn?: string | null
  issn?: string | null
  url?: string | null
  evidence?: string | null
  specialized_attributes?: string | null
  status?: string | null
  year?: number | null
}

export interface ValidationQueueItem {
  id: number
  product_id: number
  enqueued_at?: string | null
  status?: string | null
  attempts?: number | null
  assigned_to?: string | null
  result?: string | null
  processed_at?: string | null
}

export interface GruplacPreviewMember {
  display_name: string
  cod_rh?: string | null
  role?: string | null
  period_raw?: string
  start_date?: string | null
  end_date?: string | null
  is_current?: boolean
  is_leader_candidate?: boolean
}

export interface GruplacPreviewProduct {
  title: string
  section: string
  subtype_name: string
  year?: number | null
  doi?: string | null
  external_code?: string
  authors: string[]
}

export interface GruplacPreview {
  status: string
  group: Record<string, string>
  institutions: string[]
  research_lines: string[]
  members: GruplacPreviewMember[]
  products: GruplacPreviewProduct[]
  projects: { title: string; year?: number | null }[]
  warnings: string[]
  counts: { members: number; products: number; projects: number; research_lines: number }
}

export interface ImportResult {
  status: string
  job_id?: number
  group_name?: string
  total_records?: number
  new_records?: number
  reconciliation_summary?: string
  summary?: string
  researcher_name?: string
  articles?: number
  events?: number
  projects?: number
  cvlac_enrichment?: {
    attempted: number
    enriched: number
    failed: number
    details: { cod_rh: string; name: string; status: string; error?: string }[]
  }
}

export interface ProductFilters {
  skip?: number
  limit?: number
  search?: string
  validation_status?: string
  family_id?: number
  group_id?: number
  start_year?: number
  end_year?: number
  window_years?: number
}

export interface UndoOperation {
  id: number
  operation_type: string
  entity_type: string
  entity_id: number
  previous_state: string
  performed_at: string
}
