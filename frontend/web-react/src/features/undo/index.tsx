import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Eraser, Undo2 } from 'lucide-react'
import { clearUndoStack, getUndoStack, performUndo } from '@/lib/api'
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

export function UndoPage() {
  const queryClient = useQueryClient()
  const undo = useQuery({ queryKey: ['undo-stack'], queryFn: getUndoStack })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
    queryClient.invalidateQueries({ queryKey: ['researchers'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
  }

  const doUndo = useMutation({
    mutationFn: performUndo,
    onSuccess: () => {
      toast.success('Última operación revertida')
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Nada que deshacer'),
  })

  const clearAll = useMutation({
    mutationFn: clearUndoStack,
    onSuccess: () => {
      toast.success('Pila de deshacer vaciada')
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al limpiar'),
  })

  const items = undo.data ?? []

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
            <h1 className='text-2xl font-bold tracking-tight'>Historial / Deshacer</h1>
            <p className='text-muted-foreground'>
              Pila LIFO de operaciones: el último cambio es el primero en revertirse.
            </p>
          </div>
          <div className='flex gap-2'>
            <Button onClick={() => doUndo.mutate()} disabled={doUndo.isPending || items.length === 0}>
              <Undo2 className='me-2 h-4 w-4' />
              Deshacer última
            </Button>
            <Button
              variant='outline'
              onClick={() => clearAll.mutate()}
              disabled={clearAll.isPending || items.length === 0}
            >
              <Eraser className='me-2 h-4 w-4' />
              Vaciar pila
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Pila de operaciones <Badge variant='secondary'>{items.length}</Badge>
            </CardTitle>
            <CardDescription>
              Cada operación guarda el estado anterior para permitir la reversión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Operación</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {undo.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className='h-5 w-full' />
                      </TableCell>
                    </TableRow>
                  ))}
                {items.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className='font-mono text-xs'>{op.id}</TableCell>
                    <TableCell>
                      <Badge variant={op.operation_type === 'DELETE' ? 'destructive' : 'outline'}>
                        {op.operation_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{op.entity_type}</TableCell>
                    <TableCell className='font-mono text-xs'>{op.entity_id}</TableCell>
                    <TableCell>{op.performed_at ? new Date(op.performed_at).toLocaleString() : '—'}</TableCell>
                  </TableRow>
                ))}
                {!undo.isLoading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className='py-8 text-center text-muted-foreground'>
                      La pila de deshacer está vacía.
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
