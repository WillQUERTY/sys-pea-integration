import * as React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface ActionTooltipProps {
  label: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  className?: string
  asChild?: boolean
  delayDuration?: number
}

export function ActionTooltip({
  label,
  children,
  side = 'top',
  align = 'center',
  className,
  asChild = true,
  delayDuration = 100,
}: ActionTooltipProps) {
  if (!label) return <>{children}</>

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} className={className}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
