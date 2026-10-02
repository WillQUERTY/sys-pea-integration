import { createFileRoute } from '@tanstack/react-router'
import { Groups } from '@/features/groups'

export const Route = createFileRoute('/_authenticated/groups/')({
  // El hero-search del dashboard navega aquí con el término (antes se perdía).
  // El tipo de retorno con propiedad opcional evita exigir search en cada Link.
  validateSearch: (search: Record<string, unknown>): { search?: string } => ({
    search: typeof search.search === 'string' ? search.search : undefined,
  }),
  component: Groups,
})
