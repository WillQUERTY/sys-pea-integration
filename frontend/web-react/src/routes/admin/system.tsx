import { createFileRoute } from '@tanstack/react-router'
import { SystemConsole } from '@/features/system'

export const Route = createFileRoute('/admin/system')({
  component: SystemConsole,
})
