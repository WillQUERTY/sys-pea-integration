import { ShieldCheck, GraduationCap, TrendingUp, Fingerprint } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StrategicRatios } from '@/lib/api'

export interface StrategicKpiCardsProps {
  ratios?: StrategicRatios
  endorsedProducts?: number
  researchersWithOrcid?: number
  totalResearchers?: number
}

export function StrategicKpiCards({
  ratios,
  endorsedProducts = 903,
  researchersWithOrcid = 23,
  totalResearchers = 166,
}: StrategicKpiCardsProps) {
  return (
    <div className='grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4'>
      <Card className='border-border/60 shadow-xs relative overflow-hidden'>
        <div className='absolute top-0 inset-x-0 h-1 bg-emerald-500' />
        <CardHeader className='flex flex-row items-center justify-between pb-1.5 pt-4'>
          <CardTitle className='text-xs font-medium text-muted-foreground'>
            Tasa de Aval Institucional
          </CardTitle>
          <ShieldCheck className='h-4 w-4 text-emerald-600' />
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline gap-2'>
            <div className='text-2xl font-extrabold text-foreground tracking-tight'>
              {ratios?.endorsement_rate ?? 50.8}%
            </div>
            <Badge variant='secondary' className='text-[10px] font-normal text-emerald-700 dark:text-emerald-400'>
              ✓ Minciencias
            </Badge>
          </div>
          <p className='text-[11px] text-muted-foreground mt-1'>
            {endorsedProducts.toLocaleString('es-CO')} obras avaladas oficialmente
          </p>
        </CardContent>
      </Card>

      <Card className='border-border/60 shadow-xs relative overflow-hidden'>
        <div className='absolute top-0 inset-x-0 h-1 bg-amber-500' />
        <CardHeader className='flex flex-row items-center justify-between pb-1.5 pt-4'>
          <CardTitle className='text-xs font-medium text-muted-foreground'>
            Densidad de Posgrados
          </CardTitle>
          <GraduationCap className='h-4 w-4 text-amber-600' />
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline gap-2'>
            <div className='text-2xl font-extrabold text-foreground tracking-tight'>
              {ratios?.postgraduate_rate ?? 66.9}%
            </div>
            <Badge variant='secondary' className='text-[10px] font-normal text-amber-700 dark:text-amber-400'>
              Masa Crítica
            </Badge>
          </div>
          <p className='text-[11px] text-muted-foreground mt-1'>
            Doc/Mag/Esp activos en grupos de investigación
          </p>
        </CardContent>
      </Card>

      <Card className='border-border/60 shadow-xs relative overflow-hidden'>
        <div className='absolute top-0 inset-x-0 h-1 bg-blue-500' />
        <CardHeader className='flex flex-row items-center justify-between pb-1.5 pt-4'>
          <CardTitle className='text-xs font-medium text-muted-foreground'>
            Productividad Media
          </CardTitle>
          <TrendingUp className='h-4 w-4 text-blue-600' />
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline gap-2'>
            <div className='text-2xl font-extrabold text-foreground tracking-tight'>
              {ratios?.avg_products_per_researcher ?? 10.7}
            </div>
            <span className='text-xs text-muted-foreground'>obras / persona</span>
          </div>
          <p className='text-[11px] text-muted-foreground mt-1'>
            Promedio general en el claustro científico
          </p>
        </CardContent>
      </Card>

      <Card className='border-border/60 shadow-xs relative overflow-hidden'>
        <div className='absolute top-0 inset-x-0 h-1 bg-violet-500' />
        <CardHeader className='flex flex-row items-center justify-between pb-1.5 pt-4'>
          <CardTitle className='text-xs font-medium text-muted-foreground'>
            Cobertura ORCID
          </CardTitle>
          <Fingerprint className='h-4 w-4 text-violet-600' />
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline gap-2'>
            <div className='text-2xl font-extrabold text-foreground tracking-tight'>
              {ratios?.orcid_coverage_rate ?? 13.9}%
            </div>
            <Badge variant='outline' className='text-[10px] font-normal border-violet-500/30 text-violet-600'>
              Visibilidad
            </Badge>
          </div>
          <p className='text-[11px] text-muted-foreground mt-1'>
            {researchersWithOrcid} de {totalResearchers} investigadores normalizados
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
