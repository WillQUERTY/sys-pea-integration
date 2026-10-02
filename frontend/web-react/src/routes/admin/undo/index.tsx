import { createFileRoute } from '@tanstack/react-router'
import { UndoPage } from '@/features/undo'

export const Route = createFileRoute('/admin/undo/')({
  component: UndoPage,
})
