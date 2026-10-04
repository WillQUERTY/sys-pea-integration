import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  Eraser,
  Undo2,
  Eye,
  ExternalLink,
  Layers,
  History,
  RotateCcw,
} from 'lucide-react'
import { clearUndoStack, getUndoStack, performUndo } from '@/lib/api'
import type { UndoOperation } from '@/lib/types'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ActionTooltip } from '@/components/action-tooltip'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

function getOperationBadge(opType: string) {
  switch (opType) {
    case 'CREATE':
      return (
        <Badge className='border-emerald-500/30 bg-emerald-500/15 font-mono text-xs text-emerald-700 dark:text-emerald-400'>
          CREATE
        </Badge>
      )
    case 'DELETE':
      return (
        <Badge variant='destructive' className='font-mono text-xs'>
          DELETE
        </Badge>
      )
    case 'RESTORE':
      return (
        <Badge className='border-blue-500/30 bg-blue-500/15 font-mono text-xs text-blue-700 dark:text-blue-400'>
          RESTORE
        </Badge>
      )
    case 'UPDATE':
    case 'UPDATE_MEMBERSHIP':
      return (
        <Badge className='border-amber-500/30 bg-amber-500/15 font-mono text-xs text-amber-700 dark:text-amber-400'>
          {opType}
        </Badge>
      )
    case 'VALIDATE':
      return (
        <Badge className='border-violet-500/30 bg-violet-500/15 font-mono text-xs text-violet-700 dark:text-violet-400'>
          VALIDATE
        </Badge>
      )
    default:
      return (
        <Badge variant='outline' className='font-mono text-xs'>
          {opType}
        </Badge>
      )
  }
}

function getEntityLink(entityType: string, entityId: number): string | null {
  switch (entityType) {
    case 'Product':
      return `/admin/products/${entityId}`
    case 'Researcher':
      return `/admin/researchers/${entityId}`
    case 'Group':
      return `/admin/groups/${entityId}`
    case 'Project':
      return `/admin/projects/${entityId}`
    default:
      return null
  }
}

function formatSnapshot(state: string) {
  if (!state) return 'Sin snapshot previo registrado (operación sin estado previo).'
  if (state.startsWith('{')) {
    try {
      const obj = JSON.parse(state)
      return JSON.stringify(obj, null, 2)
    } catch {
      return state
    }
  }
  if (state.includes('\x1F')) {
    return state.split('\x1F').join(' | ')
  }
  return state
}

export function UndoPage() {
  const queryClient = useQueryClient()
  const undo = useQuery({ queryKey: ['undo-stack'], queryFn: getUndoStack })

  const [confirmUndoOpen, setConfirmUndoOpen] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [inspectingOp, setInspectingOp] = useState<UndoOperation | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
    queryClient.invalidateQueries({ queryKey: ['researchers'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }

  const doUndo = useMutation({
    mutationFn: performUndo,
    onSuccess: (res) => {
      toast.success(res.message || 'Última operación revertida exitosamente')
      invalidate()
      setConfirmUndoOpen(false)
      if (inspectingOp?.id === topOp?.id) {
        setInspectingOp(null)
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Nada que deshacer'),
  })

  const clearAll = useMutation({
    mutationFn: clearUndoStack,
    onSuccess: () => {
      toast.success('Pila de deshacer vaciada completamente')
      invalidate()
      setConfirmClearOpen(false)
      setInspectingOp(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al limpiar la pila'),
  })

  const items = undo.data ?? []
  const topOp = items[0] as UndoOperation | undefined

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

      <Main className='space-y-6 pb-12'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
          <div>
            <div className='flex items-center gap-2'>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                <History className='h-5 w-5' />
              </div>
              <h1 className='text-2xl font-bold tracking-tight'>Historial & Deshacer</h1>
            </div>
            <p className='mt-1 text-sm text-muted-foreground'>
              Pila LIFO de operaciones atómicas: el último cambio realizado es el primero en revertirse.
            </p>
          </div>
          <div className='flex items-center gap-2.5'>
            <Button
              onClick={() => setConfirmUndoOpen(true)}
              disabled={doUndo.isPending || items.length === 0}
              className='text-xs'
            >
              <Undo2 className='me-2 h-4 w-4' />
              Deshacer última
            </Button>
            <Button
              variant='outline'
              onClick={() => setConfirmClearOpen(true)}
              disabled={clearAll.isPending || items.length === 0}
              className='text-xs text-muted-foreground hover:text-destructive'
            >
              <Eraser className='me-2 h-4 w-4' />
              Vaciar pila
            </Button>
          </div>
        </div>

        <Card className='border-border/60 shadow-xs'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
            <div>
              <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                <Layers className='h-4 w-4 text-primary' />
                Pila de Operaciones
                <Badge variant='secondary' className='text-xs font-normal'>
                  {items.length} {items.length === 1 ? 'operación' : 'operaciones'}
                </Badge>
              </CardTitle>
              <CardDescription className='mt-1'>
                Cada registro almacena el snapshot anterior de la entidad para permitir su restauración en RAM y base de datos.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-16'>#</TableHead>
                  <TableHead className='w-32'>Operación</TableHead>
                  <TableHead className='w-36'>Entidad</TableHead>
                  <TableHead>Detalle / Nombre</TableHead>
                  <TableHead className='w-44'>Fecha y hora</TableHead>
                  <TableHead className='w-[1%] whitespace-nowrap text-right'>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {undo.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className='h-6 w-full' />
                      </TableCell>
                    </TableRow>
                  ))}
                {items.map((op, idx) => {
                  const isTop = idx === 0
                  const link = getEntityLink(op.entity_type, op.entity_id)
                  return (
                    <TableRow
                      key={op.id}
                      className={isTop ? 'bg-primary/[0.03] dark:bg-primary/[0.05]' : undefined}
                    >
                      <TableCell className='font-mono text-xs font-semibold text-muted-foreground'>
                        {op.id}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          {getOperationBadge(op.operation_type)}
                          {isTop && (
                            <Badge
                              variant='outline'
                              className='border-primary/40 text-[10px] text-primary shrink-0'
                              title='Próxima operación a revertir (Cima de la pila LIFO)'
                            >
                              Top
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className='font-medium text-foreground text-xs'>
                          {op.entity_type}
                        </span>
                        <span className='ms-1.5 font-mono text-[11px] text-muted-foreground'>
                          #{op.entity_id}
                        </span>
                      </TableCell>
                      <TableCell className='max-w-[420px]'>
                        {op.entity_name ? (
                          link ? (
                            <Link
                              to={link}
                              className='inline-flex items-center gap-1.5 truncate text-xs font-medium text-primary hover:underline'
                              title={op.entity_name}
                            >
                              <span className='truncate'>{op.entity_name}</span>
                              <ExternalLink className='h-3 w-3 shrink-0 opacity-60' />
                            </Link>
                          ) : (
                            <span className='truncate text-xs text-foreground' title={op.entity_name}>
                              {op.entity_name}
                            </span>
                          )
                        ) : (
                          <span className='text-xs italic text-muted-foreground'>
                            {op.entity_type} #{op.entity_id}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-xs text-muted-foreground'>
                        {op.performed_at
                          ? new Date(op.performed_at).toLocaleString('es-CO', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-right'>
                        <div className='flex items-center justify-end gap-1.5'>
                          <ActionTooltip label='Inspeccionar snapshot y valores previos'>
                            <Button
                              size='sm'
                              variant='ghost'
                              className='h-8 w-8 p-0'
                              onClick={() => setInspectingOp(op)}
                            >
                              <Eye className='h-4 w-4' />
                            </Button>
                          </ActionTooltip>
                          {isTop && (
                            <ActionTooltip label='Revertir esta operación ahora'>
                              <Button
                                size='sm'
                                variant='outline'
                                className='h-8 px-2.5 text-xs text-primary'
                                disabled={doUndo.isPending}
                                onClick={() => setConfirmUndoOpen(true)}
                              >
                                <RotateCcw className='mr-1.5 h-3.5 w-3.5' />
                                Deshacer
                              </Button>
                            </ActionTooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!undo.isLoading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className='py-12 text-center text-muted-foreground'>
                      <div className='flex flex-col items-center justify-center gap-2'>
                        <div className='rounded-full bg-muted p-3 text-muted-foreground'>
                          <History className='h-6 w-6' />
                        </div>
                        <p className='text-sm font-medium text-foreground'>
                          La pila de deshacer está vacía
                        </p>
                        <p className='text-xs text-muted-foreground max-w-sm'>
                          Las operaciones de creación, edición, baja lógica y validación que realices en el sistema se registrarán aquí para permitir su reversión.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Main>

      {/* Diálogo de confirmación para Deshacer */}
      <ConfirmDialog
        open={confirmUndoOpen}
        onOpenChange={setConfirmUndoOpen}
        title={`¿Revertir última operación (#${topOp?.id})?`}
        desc={
          topOp ? (
            <div className='space-y-3 pt-1 text-sm'>
              <p>
                Estás a punto de revertir la operación más reciente registrada en la cima de la pila LIFO:
              </p>
              <div className='rounded-xl border border-border/80 bg-muted/40 p-3'>
                <div className='flex items-center gap-2 mb-1.5'>
                  {getOperationBadge(topOp.operation_type)}
                  <span className='font-semibold text-foreground text-xs'>
                    {topOp.entity_type} #{topOp.entity_id}
                  </span>
                </div>
                {topOp.entity_name && (
                  <p className='text-xs text-muted-foreground font-medium truncate'>
                    «{topOp.entity_name}»
                  </p>
                )}
              </div>
              <p className='text-xs text-muted-foreground'>
                El sistema restaurará el estado previo tanto en la memoria activa del núcleo como en la base de datos SQL Server.
              </p>
            </div>
          ) : (
            'No hay operaciones pendientes en la pila.'
          )
        }
        confirmText='Revertir operación'
        cancelBtnText='Cancelar'
        isLoading={doUndo.isPending}
        handleConfirm={() => doUndo.mutate()}
      />

      {/* Diálogo de confirmación para Vaciar Pila */}
      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title='¿Vaciar la pila de operaciones?'
        desc={`Se limpiarán permanentemente las ${items.length} operaciones registradas en el historial de deshacer de esta sesión. Esta acción no se puede deshacer.`}
        confirmText='Vaciar pila completa'
        cancelBtnText='Cancelar'
        destructive
        isLoading={clearAll.isPending}
        handleConfirm={() => clearAll.mutate()}
      />

      {/* Modal Inspector de Snapshot previo */}
      <Dialog open={!!inspectingOp} onOpenChange={(open) => !open && setInspectingOp(null)}>
        <DialogContent className='max-w-2xl max-h-[85vh] flex flex-col'>
          <DialogHeader>
            <div className='flex items-center gap-2'>
              <DialogTitle className='text-base font-bold'>
                Inspección de Operación #{inspectingOp?.id}
              </DialogTitle>
              {inspectingOp && getOperationBadge(inspectingOp.operation_type)}
            </div>
            <DialogDescription className='text-xs'>
              {inspectingOp?.entity_type} #{inspectingOp?.entity_id} · Registrado el{' '}
              {inspectingOp?.performed_at
                ? new Date(inspectingOp.performed_at).toLocaleString('es-CO', {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  })
                : '—'}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2 overflow-y-auto flex-1 min-h-0'>
            {inspectingOp?.entity_name && (
              <div className='rounded-lg border bg-card p-3'>
                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                  Entidad Afectada
                </p>
                <div className='mt-1 flex items-center justify-between'>
                  <p className='text-sm font-semibold text-foreground'>
                    {inspectingOp.entity_name}
                  </p>
                  {getEntityLink(inspectingOp.entity_type, inspectingOp.entity_id) && (
                    <Button variant='outline' size='sm' asChild className='text-xs h-7'>
                      <Link
                        to={getEntityLink(inspectingOp.entity_type, inspectingOp.entity_id)!}
                        target='_blank'
                      >
                        Abrir Perfil <ExternalLink className='ms-1.5 h-3 w-3' />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'>
                Snapshot del Estado Previo (Payload)
              </p>
              <pre className='rounded-xl border border-border/80 bg-muted/60 p-4 font-mono text-xs overflow-x-auto max-h-[300px] text-foreground leading-relaxed'>
                {formatSnapshot(inspectingOp?.previous_state ?? '')}
              </pre>
            </div>
          </div>

          <div className='flex items-center justify-between border-t pt-3 mt-2'>
            <p className='text-xs text-muted-foreground'>
              {inspectingOp?.id === topOp?.id
                ? 'Esta es la operación más reciente de la pila LIFO.'
                : 'Para revertir esta operación, primero deben revertirse las operaciones posteriores.'}
            </p>
            <div className='flex items-center gap-2'>
              <Button variant='outline' size='sm' onClick={() => setInspectingOp(null)}>
                Cerrar
              </Button>
              {inspectingOp?.id === topOp?.id && (
                <Button
                  size='sm'
                  onClick={() => {
                    setInspectingOp(null)
                    setConfirmUndoOpen(true)
                  }}
                >
                  <Undo2 className='me-1.5 h-3.5 w-3.5' />
                  Revertir ahora
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

