import { createFileRoute } from '@tanstack/react-router'
import { GroupDetail } from '@/features/groups/detail'

export const Route = createFileRoute('/admin/groups/$id')({
  component: () => <GroupDetail isAdmin={true} />,
})
