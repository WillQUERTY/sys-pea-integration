import { createFileRoute } from '@tanstack/react-router'
import { PublicPortal } from '@/features/portal'

export const Route = createFileRoute('/_public/')({
  component: PublicPortal,
})
