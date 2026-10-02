import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/validation-queue')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/validation-queue' })
  },
})
