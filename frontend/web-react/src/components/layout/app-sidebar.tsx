import { Link } from '@tanstack/react-router'
import { GraduationCap } from 'lucide-react'
import { KhemiaLogo } from '@/assets/khemia-logo'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'

export function AppSidebar() {
  const { variant } = useLayout()

  return (
    <Sidebar collapsible='icon' variant={variant}>
      {/* Institutional Brand Header */}
      <SidebarHeader className='border-b border-sidebar-border/50'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild className='hover:bg-sidebar-accent/50'>
              <Link to='/'>
                <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-950/20 text-primary font-bold shadow-xs border border-sidebar-border/40'>
                  <KhemiaLogo className='h-6 w-auto' />
                </div>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <div className='flex items-center gap-1.5'>
                    <span className='truncate font-bold tracking-tight text-foreground'>Khemia</span>
                    <span className='rounded bg-primary/15 text-primary text-[10px] font-semibold px-1 py-0.5 leading-none'>
                      Abierto
                    </span>
                  </div>
                  <span className='truncate text-[11px] text-muted-foreground'>
                    Universidad Popular del Cesar
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>

      {/* Open Science Institutional Footer */}
      <SidebarFooter className='border-t border-sidebar-border/50'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' className='cursor-default hover:bg-transparent'>
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <GraduationCap className='size-4.5' />
              </div>
              <div className='grid flex-1 text-start text-xs leading-tight'>
                <span className='truncate font-semibold text-foreground'>Ecosistema Científico</span>
                <span className='truncate text-[10px] text-muted-foreground flex items-center gap-1'>
                  <span className='inline-block h-1.5 w-1.5 rounded-full bg-emerald-500'></span>
                  UPC · Datos Abiertos
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
