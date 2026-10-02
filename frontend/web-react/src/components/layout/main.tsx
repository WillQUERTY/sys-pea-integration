import { cn } from '@/lib/utils'

type MainProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  fluid?: boolean
  /** Constrains content to max-w-5xl centred — use in public portal pages */
  publicWidth?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Main({ fixed, className, fluid, publicWidth, ...props }: MainProps) {
  return (
    <main
      data-layout={fixed ? 'fixed' : 'auto'}
      className={cn(
        'px-4 py-6',

        // fixed layout: flex grow column
        fixed && 'flex grow flex-col overflow-hidden',

        // public portal: comfortable reading width centred
        publicWidth && 'mx-auto w-full max-w-5xl',

        // admin: container-query based max-w-7xl
        !fluid && !publicWidth &&
          '@7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl',
        className
      )}
      {...props}
    />
  )
}
