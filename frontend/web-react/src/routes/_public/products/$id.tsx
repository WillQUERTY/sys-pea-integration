import { createFileRoute } from '@tanstack/react-router'
import { ProductDetail } from '@/features/products/detail'

export const Route = createFileRoute('/_public/products/$id')({
  component: ProductDetail,
})
