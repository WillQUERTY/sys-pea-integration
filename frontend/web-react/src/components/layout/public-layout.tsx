import { Outlet } from '@tanstack/react-router'
import { PublicHeader } from './public-header'
import { PublicFooter } from './public-footer'
import { SearchProvider } from '@/context/search-provider'

export function PublicLayout() {
  return (
    <SearchProvider>
      <div className='relative flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20'>
        <PublicHeader />
        <main className='flex-1'>
          <Outlet />
        </main>
        <PublicFooter />
      </div>
    </SearchProvider>
  )
}
