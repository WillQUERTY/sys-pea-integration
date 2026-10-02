import { createFileRoute } from '@tanstack/react-router'
import { Products } from '@/features/products'

export const Route = createFileRoute('/admin/products/')({
  component: () => <Products isAdmin={true} />,
})
