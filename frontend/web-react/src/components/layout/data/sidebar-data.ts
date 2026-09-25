import {
  LayoutDashboard,
  Users,
  UserRound,
  FlaskConical,
  ClipboardCheck,
  Upload,
  Bell,
  Monitor,
  Palette,
  Settings,
  UserCog,
  Wrench,
  Atom,
  History,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'PEA-i',
    email: 'adithperez@unicesar.edu.co',
    avatar: '',
  },
  teams: [
    {
      name: 'PEA-i',
      logo: Atom,
      plan: 'Taller 2 · Estructura de Datos',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Grupos',
          url: '/groups',
          icon: Users,
        },
        {
          title: 'Investigadores',
          url: '/researchers',
          icon: UserRound,
        },
        {
          title: 'Productos',
          url: '/products',
          icon: FlaskConical,
        },
      ],
    },
    {
      title: 'Procesos',
      items: [
        {
          title: 'Cola de Validación',
          url: '/validation-queue',
          icon: ClipboardCheck,
        },
        {
          title: 'Importar',
          url: '/import',
          icon: Upload,
        },
        {
          title: 'Historial / Deshacer',
          url: '/undo',
          icon: History,
        },
      ],
    },
    {
      title: 'Otros',
      items: [
        {
          title: 'Ajustes',
          icon: Settings,
          items: [
            {
              title: 'Perfil',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Cuenta',
              url: '/settings/account',
              icon: Wrench,
            },
            {
              title: 'Apariencia',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: 'Notificaciones',
              url: '/settings/notifications',
              icon: Bell,
            },
            {
              title: 'Pantalla',
              url: '/settings/display',
              icon: Monitor,
            },
          ],
        },
      ],
    },
  ],
}
