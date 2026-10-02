import { createFileRoute } from '@tanstack/react-router'
import { Researchers } from '@/features/researchers'

export const Route = createFileRoute('/admin/researchers/')({
  component: () => <Researchers isAdmin={true} />,
})
