import { api } from './client'

// --- Dashboard ---
export interface Modelo2024Stats {
  products_without_subtype: number
  products_with_quality: number
  endorsed_products: number
  researchers_with_orcid: number
  total_projects: number
}

export interface FamilyDistributionItem {
  family_id: number
  code: string
  name: string
  count: number
  percentage: number
}

export interface ResearcherEducationItem {
  level: string
  count: number
  percentage: number
}

export interface TopSubtypeItem {
  subtype_id: number
  name: string
  code: string
  count: number
}

export interface StrategicRatios {
  endorsement_rate: number
  postgraduate_rate: number
  avg_products_per_researcher: number
  orcid_coverage_rate: number
}

export interface DashboardStats {
  total_groups: number
  total_researchers: number
  total_products: number
  validation: Record<string, number>
  by_year: Array<{ year: string; count: number }>
  groups_by_classification: Record<string, number>
  /** Métricas del Modelo de Medición 2024 (calculadas en la API sobre la RAM) */
  modelo_2024?: Modelo2024Stats
  families_distribution?: FamilyDistributionItem[]
  researchers_education?: ResearcherEducationItem[]
  top_subtypes?: TopSubtypeItem[]
  strategic_ratios?: StrategicRatios
}

export async function getDashboardStats() {
  const { data } = await api.get<DashboardStats>('/dashboard/stats')
  return data
}

export interface GroupTopResearcherItem {
  id: number
  name: string
  highest_education: string
  orcid: string
  role: string
  products_count: number
  total_authored_count: number
  percentage_of_group: number
}

export interface GroupStrategicRatios {
  endorsed_count: number
  endorsement_rate: number
  valid_count: number
  validation_rate: number
  postgraduate_count: number
  postgraduate_rate: number
  avg_products_per_member: number
  orcid_count: number
  orcid_coverage_rate: number
}

export interface GroupStats {
  total_products: number
  total_members: number
  by_year: Array<{ year: string; count: number }>
  families_distribution?: FamilyDistributionItem[]
  researchers_education?: ResearcherEducationItem[]
  top_researchers?: GroupTopResearcherItem[]
  top_subtypes?: TopSubtypeItem[]
  strategic_ratios?: GroupStrategicRatios
}

export async function getGroupStats(groupId: number) {
  const { data } = await api.get<GroupStats>(`/groups/${groupId}/stats`)
  return data
}

export interface MincienciasRequirement {
  id: string
  label: string
  description: string
  target: number | string
  current: number | string
  met: boolean
  unit?: string
}

export interface MincienciasTierDiagnosis {
  tier: 'Reconocido' | 'C' | 'B' | 'A' | 'A1'
  title: string
  description: string
  qualifies: boolean
  completion_percentage: number
  requirements: MincienciasRequirement[]
  missing_summary: string[]
}

export interface MincienciasGroupDiagnosis {
  group_id: number
  group_name: string
  current_classification: string
  raw_classification: string
  max_qualified_tier: string
  next_tier: string | null
  next_tier_progress: number
  next_tier_gap: string[]
  summary: {
    years_active: number
    creation_year?: number
    total_members: number
    phd_count: number
    masters_count: number
    total_products: number
    products_in_window: number
    gnc_count: number
    dti_count: number
    frh_count: number
    asc_count: number
    dpc_count: number
    projects_count: number
    cohesion_index?: number
    cohesion_met?: boolean
    top_count?: number
    type_a_count?: number
    type_b_count?: number
    frh_a_count?: number
    frh_b_count?: number
    asc_dpc_count?: number
    coauthored_products_count?: number
  }
  tiers: MincienciasTierDiagnosis[]
}

export async function getGroupMincienciasDiagnosis(groupId: number) {
  const { data } = await api.get<MincienciasGroupDiagnosis>(
    `/groups/${groupId}/minciencias-diagnosis`
  )
  return data
}

export interface ResearcherGroupContributionItem {
  id: number
  name: string
  acronym?: string
  role?: string
  products_count: number
  percentage: number
}

export interface ResearcherTopCoauthorItem {
  id: number
  name: string
  highest_education?: string
  shared_products: number
}

export interface ResearcherStrategicRatios {
  endorsed_count: number
  endorsement_rate: number
  valid_count: number
  validation_rate: number
  total_coauthors: number
}

export interface ResearcherStats {
  total_products: number
  by_year: Array<{ year: string; count: number }>
  families_distribution?: FamilyDistributionItem[]
  top_subtypes?: TopSubtypeItem[]
  groups_contribution?: ResearcherGroupContributionItem[]
  top_coauthors?: ResearcherTopCoauthorItem[]
  strategic_ratios?: ResearcherStrategicRatios
}

export async function getResearcherStats(researcherId: number) {
  const { data } = await api.get<ResearcherStats>(
    `/researchers/${researcherId}/stats`
  )
  return data
}

// --- Collaboration Network (Phase 3) ---
export interface NetworkNode {
  id: number
  name: string
  education: string
  role: string
  products_count: number
  degree: number
}

export interface NetworkEdge {
  source: number
  target: number
  weight: number
}

export interface NetworkMetrics {
  total_nodes: number
  total_edges: number
  isolated_nodes: number
  max_weight: number
  density: number
  cohesion_index: number
}

export interface GroupCollaborationNetworkData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  metrics: NetworkMetrics
}

export async function getGroupCollaborationNetwork(groupId: number) {
  const { data } = await api.get<GroupCollaborationNetworkData>(
    `/groups/${groupId}/network`
  )
  return data
}

// --- Inter-Group Benchmarking & Radar Comparison (Phase 5) ---
export interface GroupComparisonGroupItem {
  id: number
  name: string
  acronym: string
  classification: string
  institution: string
  external_code: string
  status: string
  total_products: number
  total_members: number
  top_researchers: Array<{
    id: number
    name: string
    products_count: number
    percentage_of_group: number
  }>
  strategic_ratios: {
    avg_products_per_member: number
    postgraduate_rate: number
    postgraduate_count: number
    endorsement_rate: number
    validation_rate: number
  }
  network_summary: {
    cohesion_index: number
    density: number
    total_edges: number
  }
  raw_dimensions: Record<string, number>
  radar_scores: Record<string, number>
}

export interface GroupRadarChartRow {
  dimension: string
  short_label: string
  key: string
  unit: string
  description: string
  [key: string]: string | number
}

export interface DimensionLeaderItem {
  dimension_key: string
  dimension_label: string
  leader_group_id: number
  leader_group_name: string
  leader_acronym: string
  value: number
  unit: string
}

export interface ComparisonMatrixRow {
  indicator: string
  category: string
  values: Record<string, string | number>
  unit: string
  leader_id?: number | null
}

export interface GroupsComparisonResponse {
  groups: GroupComparisonGroupItem[]
  radar_chart_data: GroupRadarChartRow[]
  dimension_leaders: DimensionLeaderItem[]
  insights: string[]
  comparison_matrix: ComparisonMatrixRow[]
}

export async function compareGroupsAnalytics(groupIds?: number[]) {
  const params =
    groupIds && groupIds.length > 0
      ? { group_ids: groupIds.join(',') }
      : undefined
  const { data } = await api.get<GroupsComparisonResponse>(
    '/analytics/compare-groups',
    {
      params,
    }
  )
  return data
}
