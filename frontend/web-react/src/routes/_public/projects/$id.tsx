import { createFileRoute } from '@tanstack/react-router'
import { ProjectDetail } from '@/features/projects/detail'

export const Route = createFileRoute('/_public/projects/$id')({
  component: ProjectDetail,
})
