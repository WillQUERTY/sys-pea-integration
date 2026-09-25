import { createFileRoute } from '@tanstack/react-router'
import { Groups } from '@/features/groups'

export const Route = createFileRoute('/_authenticated/groups/')({
  component: Groups,
})
