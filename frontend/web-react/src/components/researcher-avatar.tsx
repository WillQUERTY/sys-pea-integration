import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export type ResearcherAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ResearcherAvatarShape = 'circle' | 'rounded'

export interface ResearcherAvatarProps extends React.ComponentProps<typeof Avatar> {
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  image?: string | null
  size?: ResearcherAvatarSize
  shape?: ResearcherAvatarShape
  fallbackClassName?: string
}

function getInitials(name?: string | null, firstName?: string | null, lastName?: string | null): string {
  if (firstName || lastName) {
    const f = (firstName ?? '').trim()[0] ?? ''
    const l = (lastName ?? '').trim()[0] ?? ''
    const res = `${f}${l}`.toUpperCase()
    if (res) return res
  }

  if (!name || !name.trim()) return '?'

  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  const first = parts[0][0] ?? ''
  const second = parts[1][0] ?? ''
  return `${first}${second}`.toUpperCase()
}

function getHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

const sizeClasses: Record<ResearcherAvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl font-bold',
}

const shapeClasses: Record<ResearcherAvatarShape, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-2xl',
}

export function ResearcherAvatar({
  name,
  firstName,
  lastName,
  image,
  size = 'md',
  shape = 'circle',
  className,
  fallbackClassName,
  ...props
}: ResearcherAvatarProps) {
  const displayName = name || [firstName, lastName].filter(Boolean).join(' ') || 'Investigador'
  const initials = getInitials(name, firstName, lastName)
  const hue = getHue(displayName)

  return (
    <Avatar
      className={cn(
        'shrink-0 select-none shadow-xs',
        sizeClasses[size],
        shapeClasses[shape],
        className
      )}
      {...props}
    >
      {image && <AvatarImage src={image} alt={displayName} className={shapeClasses[shape]} />}
      <AvatarFallback
        className={cn(
          'flex h-full w-full items-center justify-center font-bold text-white shadow-inner',
          shapeClasses[shape],
          fallbackClassName
        )}
        style={{
          backgroundColor: `hsl(${hue}, 56%, 42%)`,
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
