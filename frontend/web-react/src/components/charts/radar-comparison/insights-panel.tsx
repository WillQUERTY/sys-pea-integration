import { Sparkles, CheckCircle2, Info } from 'lucide-react'

interface InsightsPanelProps {
  insights: string[]
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <div className='lg:col-span-4 space-y-4 flex flex-col justify-between'>
      <div className='p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-3 flex-1'>
        <div className='flex items-center gap-2'>
          <Sparkles className='h-4 w-4 text-primary' />
          <h4 className='text-sm font-bold text-foreground'>
            Hallazgos Clave de Benchmarking
          </h4>
        </div>
        <ul className='space-y-2.5 text-xs text-muted-foreground'>
          {insights.slice(0, 5).map((insight, idx) => (
            <li key={idx} className='flex items-start gap-2'>
              <CheckCircle2 className='h-3.5 w-3.5 text-primary shrink-0 mt-0.5' />
              <span className='leading-snug text-foreground/90'>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className='p-3.5 rounded-2xl border border-border/70 bg-card/40 space-y-1.5 text-xs'>
        <div className='flex items-center gap-1.5 font-semibold text-foreground'>
          <Info className='h-3.5 w-3.5 text-muted-foreground' />
          <span>Metodología de Normalización</span>
        </div>
        <p className='text-muted-foreground leading-relaxed text-[11px]'>
          El 100% representa el puntaje del colectivo o referente líder en cada categoría.
          GNC, DTI, ASC y FRH corresponden a las 4 familias de Minciencias 2024.
        </p>
      </div>
    </div>
  )
}
