import { createFileRoute } from '@tanstack/react-router'
import { Groups } from '@/features/groups'

export const Route = createFileRoute('/admin/groups/')({
  validateSearch: (search: Record<string, unknown>): { search?: string } => ({
    search: typeof search.search === 'string' ? search.search : undefined,
  }),
  component: () => <Groups isAdmin={true} />,
})
