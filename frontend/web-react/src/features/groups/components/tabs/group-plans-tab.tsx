import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DataTable, type DataColumn } from '@/components/data-table'
import { MonthPicker } from '@/components/month-picker'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ActionTooltip } from '@/components/action-tooltip'
import { toMonthInput } from '@/components/catalog-field'
import { createPlan, updatePlan, deletePlan, getGroupPlans } from '@/lib/api'
import type { WorkPlan } from '@/lib/types'

export interface GroupPlansTabProps {
  groupId: number
  isAdmin?: boolean
  plans?: WorkPlan[]
  isLoadingPlans?: boolean
}

const emptyPlanForm = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  status: 'active',
}

export function GroupPlansTab({
  groupId,
  isAdmin = false,
  plans: propsPlans,
  isLoadingPlans: propsIsLoadingPlans,
}: GroupPlansTabProps) {
  const queryClient = useQueryClient()

  const { data: fetchedPlans, isLoading: isFetchingPlans } = useQuery({
    queryKey: ['groups', groupId, 'plans'],
    queryFn: () => getGroupPlans(groupId),
    enabled: !propsPlans,
  })

  const plans = propsPlans ?? fetchedPlans ?? []
  const isLoadingPlans = propsIsLoadingPlans ?? isFetchingPlans

  const [planOpen, setPlanOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<WorkPlan | null>(null)
  const [planForm, setPlanForm] = useState(emptyPlanForm)
  const [deactivatingPlan, setDeactivatingPlan] = useState<WorkPlan | null>(null)

  const openCreatePlan = () => {
    setEditingPlan(null)
    setPlanForm(emptyPlanForm)
    setPlanOpen(true)
  }

  const openEditPlan = (p: WorkPlan) => {
    setEditingPlan(p)
    setPlanForm({
      title: p.title,
      description: p.description ?? '',
      start_date: toMonthInput(p.start_date),
      end_date: toMonthInput(p.end_date),
      status: p.status ?? 'active',
    })
    setPlanOpen(true)
  }

  const savePlanMutation = useMutation({
    mutationFn: () =>
      editingPlan
        ? updatePlan(editingPlan.id!, { ...planForm, group_id: groupId })
        : createPlan(groupId, planForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'plans'] })
      toast.success(editingPlan ? 'Plan actualizado' : 'Plan creado correctamente')
      setPlanOpen(false)
      setEditingPlan(null)
      setPlanForm(emptyPlanForm)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al guardar el plan'),
  })

  const deletePlanMutation = useMutation({
    mutationFn: (pid: number) => deletePlan(pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'plans'] })
      toast.success('Plan desactivado')
      setDeactivatingPlan(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al desactivar el plan'),
  })

  const columns: DataColumn<WorkPlan>[] = [
    {
      key: 'title',
      header: 'Título del Plan',
      searchable: (p: WorkPlan) => p.title,
      className: 'max-w-[300px]',
      cell: (p: WorkPlan) => <span className='block truncate font-medium text-sm'>{p.title}</span>,
    },
    {
      key: 'period',
      header: 'Periodo',
      cell: (p: WorkPlan) => (
        <span className='text-muted-foreground'>
          {p.start_date || '—'} → {p.end_date || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (p: WorkPlan) =>
        p.status === 'active' ? (
          <Badge className='bg-green-600 text-white hover:bg-green-700'>Activo</Badge>
        ) : (
          <Badge variant='outline' className='text-muted-foreground border-border/60 bg-muted/30'>
            {p.status || 'Inactivo'}
          </Badge>
        ),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            cell: (p: WorkPlan) => (
              <div className='flex items-center gap-1'>
                <ActionTooltip label='Editar plan'>
                  <Button variant='ghost' size='icon' onClick={() => openEditPlan(p)}>
                    <Pencil className='w-4 h-4' />
                  </Button>
                </ActionTooltip>
                {p.status === 'active' && (
                  <ActionTooltip label='Desactivar plan'>
                    <Button variant='ghost' size='icon' onClick={() => setDeactivatingPlan(p)}>
                      <Trash2 className='w-4 h-4 text-red-500' />
                    </Button>
                  </ActionTooltip>
                )}
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className='bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4'>
      <div className='flex justify-between items-center mb-4'>
        <h3 className='font-semibold text-lg'>Planes de Trabajo del Grupo</h3>
        {isAdmin && (
          <Dialog open={planOpen} onOpenChange={setPlanOpen}>
            <DialogTrigger asChild>
              <Button size='sm' onClick={openCreatePlan}>
                <Plus className='w-4 h-4 mr-2' /> Añadir Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPlan ? 'Editar Plan de Trabajo' : 'Añadir Plan de Trabajo'}</DialogTitle>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label>Título del Plan</Label>
                  <Input
                    value={planForm.title}
                    onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                  />
                </div>
                <div className='space-y-2'>
                  <Label>Descripción</Label>
                  <Textarea
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    rows={3}
                    className='bg-muted/30 focus-visible:bg-transparent rounded-xl resize-none'
                    placeholder='Objetivos y actividades del plan...'
                  />
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>Fecha de Inicio</Label>
                    <MonthPicker
                      value={planForm.start_date}
                      onChange={(v) => setPlanForm({ ...planForm, start_date: v })}
                      placeholder='Mes de inicio...'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Fecha de Fin</Label>
                    <MonthPicker
                      value={planForm.end_date}
                      onChange={(v) => setPlanForm({ ...planForm, end_date: v })}
                      placeholder='Mes de fin...'
                      allowClear
                    />
                  </div>
                </div>
                <Button
                  className='w-full'
                  onClick={() => savePlanMutation.mutate()}
                  disabled={!planForm.title || savePlanMutation.isPending}
                >
                  {savePlanMutation.isPending ? 'Guardando...' : editingPlan ? 'Guardar Cambios' : 'Guardar Plan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <DataTable<WorkPlan>
        columns={columns}
        data={plans}
        loading={isLoadingPlans}
        rowKey={(p: WorkPlan) => p.id!}
        emptyMessage='Este grupo no tiene planes de trabajo registrados.'
        searchPlaceholder='Buscar por título del plan...'
      />

      {/* Confirmación: desactivar plan de trabajo */}
      <ConfirmDialog
        open={deactivatingPlan !== null}
        onOpenChange={(open) => !open && setDeactivatingPlan(null)}
        title='¿Desactivar plan de trabajo?'
        desc={`¿Estás seguro de que deseas desactivar el plan «${deactivatingPlan?.title ?? ''}»? Su estado pasará a inactivo.`}
        confirmText='Desactivar'
        cancelBtnText='Cancelar'
        destructive
        isLoading={deletePlanMutation.isPending}
        handleConfirm={() => {
          if (deactivatingPlan?.id != null) {
            deletePlanMutation.mutate(deactivatingPlan.id, {
              onSettled: () => setDeactivatingPlan(null),
            })
          }
        }}
      />
    </div>
  )
}
