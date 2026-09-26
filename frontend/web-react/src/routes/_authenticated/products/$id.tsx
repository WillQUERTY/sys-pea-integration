import { createFileRoute } from '@tanstack/react-router'
import { ProductDetail } from '@/features/products/detail'

export const Route = createFileRoute('/_authenticated/products/$id')({
  component: ProductDetail,
})
