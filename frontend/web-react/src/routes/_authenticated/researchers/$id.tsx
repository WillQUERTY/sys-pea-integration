import { createFileRoute } from '@tanstack/react-router'
import { ResearcherDetail } from '@/features/researchers/detail'

export const Route = createFileRoute('/_authenticated/researchers/$id')({
  component: ResearcherDetail,
})
