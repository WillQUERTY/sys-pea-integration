import { createFileRoute } from '@tanstack/react-router'
import { ValidationQueue } from '@/features/validation-queue'

export const Route = createFileRoute('/_authenticated/validation-queue/')({
  component: ValidationQueue,
})
