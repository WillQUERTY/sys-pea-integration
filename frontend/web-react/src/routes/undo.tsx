import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/undo')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/undo' })
  },
})
