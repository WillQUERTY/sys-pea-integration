import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ProductionHistogram,
  FamiliesDonut,
  EducationDonut,
} from '@/components/charts'
import { getDashboardStats, listGroups } from '@/lib/api'
import { parseMincienciasClassification } from '@/lib/utils'
import {
  HeroSection,
  DiscoveryCardsSection,
  MincienciasClassificationCard,
  FeaturedGroupsShowcase,
  PortalManagementCta,
} from './components'

export function PublicPortal() {
  const statsQuery = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats })
  const featuredGroupsQuery = useQuery({
    queryKey: ['featured-groups'],
    queryFn: () => listGroups({ limit: 4 }),
  })

  const stats = statsQuery.data
  const byYear = stats?.by_year ?? []

  const normalizedClassifications = useMemo(() => {
    const map = new Map<string, { info: ReturnType<typeof parseMincienciasClassification>; count: number }>()
    for (const [rawKey, count] of Object.entries(stats?.groups_by_classification ?? {})) {
      const info = parseMincienciasClassification(rawKey)
      const existing = map.get(info.code)
      if (existing) {
        existing.count += count
      } else {
        map.set(info.code, { info, count })
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => a.info.priority - b.info.priority || b.count - a.count
    )
  }, [stats?.groups_by_classification])

  const validCount = stats?.validation?.['valid'] ?? 0
  const totalProducts = stats?.total_products ?? 0
  const totalGroups = stats?.total_groups ?? 0
  const totalResearchers = stats?.total_researchers ?? 0
  const validationRate = totalProducts > 0 ? ((validCount / totalProducts) * 100).toFixed(1) : '0'

  return (
    <div className='animate-in fade-in-50 duration-300'>
      {/* HERO — Full-width emerald + knowledge graph + stats */}
      <HeroSection
        totalGroups={totalGroups}
        totalResearchers={totalResearchers}
        totalProducts={totalProducts}
        totalProjects={stats?.modelo_2024?.total_projects ?? 0}
        loading={statsQuery.isLoading}
      />

      {/* BODY — Cards + Charts + Showcase + Management CTA */}
      <div className='mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 pb-12 sm:pb-16 space-y-10 sm:space-y-14'>
        {/* Navigation tiles */}
        <DiscoveryCardsSection
          a1Count={normalizedClassifications.find((c) => c.info.code === 'A1')?.count}
          orcidCount={stats?.modelo_2024?.researchers_with_orcid}
          hasResearchers={totalResearchers > 0}
          validationRate={validationRate}
          hasValidProducts={validCount > 0}
        />

        {/* Analytics: Histogram + Minciencias Classification */}
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
          <ProductionHistogram
            data={byYear}
            totalProducts={totalProducts}
            height={290}
            className='col-span-1 lg:col-span-4'
          />
          <MincienciasClassificationCard
            loading={statsQuery.isLoading}
            totalGroups={totalGroups}
            classifications={normalizedClassifications}
          />
        </div>

        {/* Balance de Familias y Formación Humana */}
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
          <FamiliesDonut data={stats?.families_distribution} />
          <EducationDonut data={stats?.researchers_education} totalResearchers={totalResearchers} />
        </div>

        {/* Vitrina de Grupos Destacados */}
        <FeaturedGroupsShowcase
          loading={featuredGroupsQuery.isLoading}
          groups={featuredGroupsQuery.data?.items}
        />

        {/* CTA — Portal de Gestión */}
        <PortalManagementCta />
      </div>
    </div>
  )
}
