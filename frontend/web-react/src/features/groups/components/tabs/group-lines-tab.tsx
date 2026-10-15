import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ActionTooltip } from '@/components/action-tooltip'
import { linkResearchLine, unlinkResearchLine, getGroupResearchLines } from '@/lib/api'

export interface GroupLinesTabProps {
  groupId: number
  isAdmin?: boolean
  researchLines?: string[]
  isLoadingLines?: boolean
}

export function GroupLinesTab({
  groupId,
  isAdmin = false,
  researchLines: propsLines,
  isLoadingLines: propsIsLoadingLines,
}: GroupLinesTabProps) {
  const queryClient = useQueryClient()

  const { data: fetchedLines, isLoading: isFetchingLines } = useQuery({
    queryKey: ['groups', groupId, 'lines'],
    queryFn: () => getGroupResearchLines(groupId),
    enabled: !propsLines,
  })

  const researchLines = propsLines ?? fetchedLines ?? []
  const isLoadingLines = propsIsLoadingLines ?? isFetchingLines
  const [lineOpen, setLineOpen] = useState(false)
  const [newLine, setNewLine] = useState('')
  const [unlinkingLine, setUnlinkingLine] = useState<string | null>(null)

  const linkLineMutation = useMutation({
    mutationFn: () => linkResearchLine(groupId, newLine),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'researchLines'] })
      toast.success('Línea añadida correctamente')
      setLineOpen(false)
      setNewLine('')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al añadir'),
  })

  const unlinkLineMutation = useMutation({
    mutationFn: (name: string) => unlinkResearchLine(groupId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'researchLines'] })
      toast.success('Línea desvinculada')
      setUnlinkingLine(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al desvincular'),
  })

  return (
    <div className='bg-card border border-border/50 rounded-2xl p-6 shadow-sm'>
      <div className='flex justify-between items-center mb-4'>
        <h3 className='font-semibold text-lg'>Líneas de Investigación Declaradas</h3>
        {isAdmin && (
          <Dialog open={lineOpen} onOpenChange={setLineOpen}>
            <DialogTrigger asChild>
              <Button size='sm'>
                <Plus className='w-4 h-4 mr-2' /> Añadir Línea
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Línea de Investigación</DialogTitle>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label>Nombre de la Línea</Label>
                  <Input value={newLine} onChange={(e) => setNewLine(e.target.value)} />
                </div>
                <Button
                  className='w-full'
                  onClick={() => linkLineMutation.mutate()}
                  disabled={!newLine || linkLineMutation.isPending}
                >
                  Guardar Línea
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoadingLines ? (
        <div className='space-y-2'>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
        </div>
      ) : researchLines?.length ? (
        <ul className='space-y-2'>
          {researchLines.map((line, idx) => (
            <li
              key={idx}
              className='bg-muted/30 p-3 rounded-lg border border-border/50 flex items-center justify-between text-sm font-medium'
            >
              <div className='flex items-center'>
                <div className='h-2 w-2 rounded-full bg-primary mr-3' />
                {line}
              </div>
              {isAdmin && (
                <ActionTooltip label='Eliminar línea de investigación'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => setUnlinkingLine(line)}
                  >
                    <Trash2 className='w-4 h-4 text-red-500' />
                  </Button>
                </ActionTooltip>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className='text-muted-foreground text-sm'>No se encontraron líneas de investigación.</p>
      )}

      {/* Confirmación: eliminar línea de investigación */}
      <ConfirmDialog
        open={unlinkingLine !== null}
        onOpenChange={(open) => !open && setUnlinkingLine(null)}
        title='¿Eliminar línea de investigación?'
        desc={`¿Estás seguro de que deseas eliminar la línea de investigación «${unlinkingLine ?? ''}» de este grupo?`}
        confirmText='Eliminar'
        cancelBtnText='Cancelar'
        destructive
        isLoading={unlinkLineMutation.isPending}
        handleConfirm={() => {
          if (unlinkingLine) {
            unlinkLineMutation.mutate(unlinkingLine, {
              onSettled: () => setUnlinkingLine(null),
            })
          }
        }}
      />
    </div>
  )
}
