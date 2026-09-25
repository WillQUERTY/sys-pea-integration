import { createFileRoute } from '@tanstack/react-router'
import { Researchers } from '@/features/researchers'

export const Route = createFileRoute('/_authenticated/researchers/')({
  component: Researchers,
})
