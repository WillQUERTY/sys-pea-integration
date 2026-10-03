import {
  Compass,
  Users,
  UserRound,
  FlaskConical,
  Lightbulb,
  ClipboardCheck,
  Upload,
  History,
  Cpu,
  Globe,
} from 'lucide-react'
import { KhemiaLogo } from '@/assets/khemia-logo'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Gestión Institucional',
    email: 'investigacion@unicesar.edu.co',
    avatar: '',
  },
  teams: [
    {
      name: 'Khemia',
      logo: KhemiaLogo,
      plan: 'Universidad Popular del Cesar',
    },
  ],
  navGroups: [
    {
      title: 'Panel & Control',
      items: [
        {
          title: 'Métricas de Gestión',
          url: '/admin',
          icon: Compass,
        },
        {
          title: 'Consola del Núcleo & ODBC',
          url: '/admin/system',
          icon: Cpu,
        },
      ],
    },
    {
      title: 'Gestión Institucional',
      items: [
        {
          title: 'Importar GrupLAC / CvLAC',
          url: '/admin/import',
          icon: Upload,
        },
        {
          title: 'Cola de Validación FIFO',
          url: '/admin/validation-queue',
          icon: ClipboardCheck,
        },
        {
          title: 'Historial & Deshacer',
          url: '/admin/undo',
          icon: History,
        },
      ],
    },
    {
      title: 'Gestión de Entidades',
      items: [
        {
          title: 'Grupos de Investigación',
          url: '/admin/groups',
          icon: Users,
        },
        {
          title: 'Directorio Investigadores',
          url: '/admin/researchers',
          icon: UserRound,
        },
        {
          title: 'Producción Científica',
          url: '/admin/products',
          icon: FlaskConical,
        },
        {
          title: 'Proyectos de I+D',
          url: '/admin/projects',
          icon: Lightbulb,
        },
      ],
    },
    {
      title: 'Portal de Acceso',
      items: [
        {
          title: 'Ver Portal Abierto',
          url: '/',
          icon: Globe,
        },
      ],
    },
  ],
}
