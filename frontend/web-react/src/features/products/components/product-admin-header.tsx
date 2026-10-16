import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ProductAdminHeaderProps {
  onAddProduct: () => void
}

export function ProductAdminHeader({ onAddProduct }: ProductAdminHeaderProps) {
  return (
    <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Productos científicos</h1>
        <p className='text-muted-foreground'>
          Catálogo de productos con ventana de observación dinámica.
        </p>
      </div>
      <Button onClick={onAddProduct}>
        <Plus className='mr-2 h-4 w-4' /> Agregar Producto
      </Button>
    </div>
  )
}
