import { createFileRoute } from '@tanstack/react-router'
import { Projects } from '@/features/projects'

export const Route = createFileRoute('/admin/projects/')({
  component: () => <Projects isAdmin={true} />,
})
