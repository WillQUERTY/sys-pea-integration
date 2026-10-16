import type { CustomTooltipProps } from './types'

export function RadarCustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className='rounded-xl border border-border/80 bg-popover/95 p-3.5 shadow-xl backdrop-blur-md text-xs min-w-[260px]'>
      <div className='border-b border-border/60 pb-1.5 mb-2'>
        <p className='font-bold text-sm text-foreground'>{row.dimension}</p>
        <p className='text-[11px] text-muted-foreground leading-tight'>{row.description}</p>
      </div>
      <div className='space-y-1.5'>
        {payload.map((item) => {
          const rawVal = item.dataKey ? row[`${item.dataKey}_raw`] : row[`${item.name}_raw`]
          return (
            <div key={item.name} className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-1.5 min-w-0'>
                <span
                  className='h-2.5 w-2.5 rounded-full shrink-0'
                  style={{ backgroundColor: item.color }}
                />
                <span className='font-medium text-foreground truncate'>{item.name}:</span>
              </div>
              <div className='text-right font-mono font-semibold text-foreground'>
                {rawVal !== undefined && rawVal !== null ? rawVal : ''} {row.unit}{' '}
                <span className='text-[10px] font-normal text-muted-foreground'>
                  ({item.value}%)
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
