import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listValidationQueue, processNextValidation, validateProduct, cancelValidationItem } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

export function ValidationQueue() {
  const queryClient = useQueryClient()
  const queue = useQuery({ queryKey: ['validation-queue'], queryFn: listValidationQueue })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const processNext = useMutation({
    mutationFn: processNextValidation,
    onSuccess: (r) => {
      toast.success(`Procesado. Pendientes restantes: ${r.remaining_pending}`)
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al procesar'),
  })

  const validate = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'valid' | 'rejected' }) =>
      validateProduct(id, status, 'Decisión desde la cola de validación'),
    onSuccess: () => {
      toast.success('Producto actualizado')
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al validar'),
  })

  const cancelItem = useMutation({
    mutationFn: (itemId: number) => cancelValidationItem(itemId),
    onSuccess: () => {
      toast.success('Ítem cancelado y retirado de la cola')
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al cancelar'),
  })

  const pending = (queue.data ?? []).filter((i) => i.status === 'pending')

  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Cola de validación técnica</h1>
            <p className='text-muted-foreground'>
              Estructura FIFO (Requerimiento 13): el primero en entrar es el primero en procesarse.
            </p>
          </div>
          <Button onClick={() => processNext.mutate()} disabled={processNext.isPending || pending.length === 0}>
            Procesar siguiente (FIFO)
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Ítems en cola <Badge variant='secondary'>{pending.length} pendientes</Badge>
            </CardTitle>
            <CardDescription>
              Los productos importados por scraping entran aquí con estado «pending».
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Encolado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className='text-right'>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className='h-5 w-full' />
                      </TableCell>
                    </TableRow>
                  ))}
                {(queue.data ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className='font-mono text-xs'>{item.id}</TableCell>
                    <TableCell className='font-mono text-xs'>Producto #{item.product_id}</TableCell>
                    <TableCell>{item.enqueued_at ? new Date(item.enqueued_at).toLocaleString() : '—'}</TableCell>
                    <TableCell>
                      {item.status === 'pending' ? (
                        <Badge variant='secondary'>Pendiente</Badge>
                      ) : (
                        <Badge variant='outline'>{item.status ?? 'procesado'}</Badge>
                      )}
                    </TableCell>
                    <TableCell className='space-x-2 text-right'>
                      {item.status === 'pending' && (
                        <>
                          <Button
                            size='sm'
                            variant='outline'
                            disabled={validate.isPending}
                            onClick={() => validate.mutate({ id: item.product_id, status: 'valid' })}
                          >
                            Validar
                          </Button>
                          <Button
                            size='sm'
                            variant='destructive'
                            disabled={validate.isPending}
                            onClick={() => validate.mutate({ id: item.product_id, status: 'rejected' })}
                          >
                            Rechazar
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            disabled={cancelItem.isPending}
                            onClick={() => cancelItem.mutate(item.id)}
                            title='Retirar de la cola sin procesar'
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!queue.isLoading && (queue.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className='py-8 text-center text-muted-foreground'>
                      La cola está vacía.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
