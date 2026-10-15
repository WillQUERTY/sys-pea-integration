import { api } from './client'
import type { Product, ProductFilters, PagedResponse } from '../types'

export async function listProducts(filters?: ProductFilters) {
  const { data } = await api.get<PagedResponse<Product>>('/products', {
    params: filters,
  })
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

export async function restoreProduct(id: number) {
  const { data } = await api.post(`/products/${id}/restore`)
  return data
}

// Catálogo del modelo 2024. Los campos nuevos son opcionales: el fallback
// C++ (get_product_catalogs_json) sirve la forma vieja id/name cuando pyodbc
// no está disponible; la ruta primaria (pyodbc) trae todo.
export interface CatalogFamily {
  id: number
  name: string
  /** GNC/DTI/ASC/DPC/FRH */
  code?: string | null
  sort_order?: number | null
}

export interface CatalogSubtype {
  id: number
  family_id: number
  name: string
  /** Tipología 2024 (ART/SF/EC/...) */
  code?: string | null
  /** Numeral del documento oficial (p.ej. 2.2.2.1.3) */
  model_ref?: string | null
  sort_order?: number | null
}

export interface CatalogQualityCategory {
  id: number
  /** Etiqueta visible; se repite entre tipologías, la clave real es code */
  name: string
  code?: string | null
  /** Tipología a la que aplica la categoría (NULL = legado) */
  subtype_id?: number | null
  /** TOP/A/B/ASC/DPC/FRH-A/FRH-B (par. 3.7) */
  measurement_class?: string | null
  /** Peso relativo (Anexo 1) */
  weight?: number | null
  /** Peso global (Tabla 6, par. 3.6) */
  global_weight?: number | null
  sort_order?: number | null
}

export interface ProductCatalogs {
  families: CatalogFamily[]
  subtypes: CatalogSubtype[]
  quality_categories: CatalogQualityCategory[]
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
  req: {
    researcher_id?: number
    author_order?: number
    external_author_name?: string
    external_author_identifier?: string
  }
) {
  const { data } = await api.post(`/products/${id}/authors`, req)
  return data
}

export async function removeProductAuthor(
  id: number,
  params: { researcher_id?: number; external_author_name?: string }
) {
  const { data } = await api.delete(`/products/${id}/authors`, { params })
  return data
}

export async function validateProduct(
  id: number,
  validationStatus: 'valid' | 'rejected' | 'pending',
  reason?: string,
  /** Categoría de calidad 2024: obligatoria para validar como 'valid' */
  qualityCategoryId?: number
) {
  const { data } = await api.patch<Product>(`/products/${id}/validation`, {
    validation_status: validationStatus,
    reason,
    quality_category_id: qualityCategoryId,
  })
  return data
}
