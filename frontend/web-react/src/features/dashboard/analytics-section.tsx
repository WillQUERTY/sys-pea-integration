import { TrendingUp, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardStats } from '@/lib/api'
import {
  StrategicKpiCards,
  ProductionHistogram,
  FamiliesDonut,
  EducationDonut,
  TopSubtypesRanking,
} from '@/components/charts'

interface AnalyticsSectionProps {
  stats?: DashboardStats
  isLoading: boolean
}

export function AnalyticsSection({ stats, isLoading }: AnalyticsSectionProps) {
  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-8 w-64' />
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-24 w-full rounded-xl' />
          ))}
        </div>
        <div className='grid gap-4 lg:grid-cols-7'>
          <Skeleton className='h-80 col-span-4 rounded-xl' />
          <Skeleton className='h-80 col-span-3 rounded-xl' />
        </div>
      </div>
    )
  }

  const byYear = stats?.by_year ?? []
  const families = stats?.families_distribution ?? []
  const education = stats?.researchers_education ?? []
  const topSubtypes = stats?.top_subtypes ?? []
  const ratios = stats?.strategic_ratios
  const totalProducts = stats?.total_products ?? 0
  const totalResearchers = stats?.total_researchers ?? 0

  return (
    <div className='space-y-6 pt-2'>
      {/* Encabezado de la Sección de Analítica */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3.5'>
        <div className='flex items-center gap-2.5'>
          <div className='p-2 rounded-xl bg-primary/10 text-primary'>
            <TrendingUp className='h-5 w-5' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-lg sm:text-xl font-bold tracking-tight text-foreground'>
                Analítica y Rendimiento Institucional
              </h2>
              <Badge variant='outline' className='text-[10px] font-medium border-primary/30 text-primary'>
                Minciencias 2024
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Indicadores estratégicos, balance tipológico y dinámica temporal de la investigación en UPC.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <Sparkles className='h-3.5 w-3.5 text-amber-500' />
          <span>Datos en tiempo real</span>
        </div>
      </div>

      {/* 1. SMART RATIOS / KPIs ESTRATÉGICOS */}
      <StrategicKpiCards
        ratios={ratios}
        endorsedProducts={stats?.modelo_2024?.endorsed_products}
        researchersWithOrcid={stats?.modelo_2024?.researchers_with_orcid}
        totalResearchers={totalResearchers}
      />

      {/* 2. FILA 1: HISTOGRAMA DINÁMICO & DONUT DE FAMILIAS MINCIENCIAS */}
      <div className='grid gap-4 grid-cols-1 lg:grid-cols-7'>
        <div className='col-span-1 lg:col-span-4'>
          <ProductionHistogram
            data={byYear}
            totalProducts={totalProducts}
            initialWindow='5y'
            height={260}
          />
        </div>
        <div className='col-span-1 lg:col-span-3'>
          <FamiliesDonut data={families} height={170} />
        </div>
      </div>

      {/* 3. FILA 2: COMPOSICIÓN DEL TALENTO HUMANO & TOP TIPOLOGÍAS */}
      <div className='grid gap-4 grid-cols-1 lg:grid-cols-7'>
        <div className='col-span-1 lg:col-span-3'>
          <EducationDonut
            data={education}
            totalResearchers={totalResearchers}
            height={170}
          />
        </div>
        <div className='col-span-1 lg:col-span-4'>
          <TopSubtypesRanking data={topSubtypes} limit={6} />
        </div>
      </div>
    </div>
  )
}
