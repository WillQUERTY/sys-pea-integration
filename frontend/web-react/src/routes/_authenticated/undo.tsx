import { createFileRoute } from '@tanstack/react-router'
import { UndoPage } from '@/features/undo'

export const Route = createFileRoute('/_authenticated/undo')({
  component: UndoPage,
})
