import {
  Compass,
  Users,
  UserRound,
  FlaskConical,
  Lightbulb,
  ClipboardCheck,
  Upload,
  Atom,
  History,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Portal Institucional',
    email: 'investigacion@unicesar.edu.co',
    avatar: '',
  },
  teams: [
    {
      name: 'PEA-i',
      logo: Atom,
      plan: 'Universidad Popular del Cesar',
    },
  ],
  navGroups: [
    {
      title: 'Exploración Abierta',
      items: [
        {
          title: 'Portal Principal',
          url: '/',
          icon: Compass,
        },
        {
          title: 'Grupos de Investigación',
          url: '/groups',
          icon: Users,
        },
        {
          title: 'Directorio Investigadores',
          url: '/researchers',
          icon: UserRound,
        },
        {
          title: 'Producción Científica',
          url: '/products',
          icon: FlaskConical,
        },
        {
          title: 'Proyectos de I+D',
          url: '/projects',
          icon: Lightbulb,
        },
      ],
    },
    {
      title: 'Gestión Institucional',
      items: [
        {
          title: 'Importar GrupLAC / CvLAC',
          url: '/import',
          icon: Upload,
        },
        {
          title: 'Cola de Validación FIFO',
          url: '/validation-queue',
          icon: ClipboardCheck,
        },
        {
          title: 'Historial & Deshacer',
          url: '/undo',
          icon: History,
        },
      ],
    },
  ],
}
