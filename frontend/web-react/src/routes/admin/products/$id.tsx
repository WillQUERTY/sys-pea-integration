import { createFileRoute } from '@tanstack/react-router'
import { ProductDetail } from '@/features/products/detail'

export const Route = createFileRoute('/admin/products/$id')({
  component: () => <ProductDetail isAdmin={true} />,
})
