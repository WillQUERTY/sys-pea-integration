import { createFileRoute } from '@tanstack/react-router'
import { ResearcherDetail } from '@/features/researchers/detail'

export const Route = createFileRoute('/admin/researchers/$id')({
  component: () => <ResearcherDetail isAdmin={true} />,
})
