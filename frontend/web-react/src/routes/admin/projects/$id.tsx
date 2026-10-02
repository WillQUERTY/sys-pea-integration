import { createFileRoute } from '@tanstack/react-router'
import { ProjectDetail } from '@/features/projects/detail'

export const Route = createFileRoute('/admin/projects/$id')({
  component: () => <ProjectDetail isAdmin={true} />,
})
