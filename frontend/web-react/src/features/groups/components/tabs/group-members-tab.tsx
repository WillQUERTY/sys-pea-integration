import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserPlus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table'
import { ResearcherAvatar } from '@/components/researcher-avatar'
import { EntityCombobox, type EntityItem } from '@/components/entity-combobox'
import { CatalogSelect, toMonthInput } from '@/components/catalog-field'
import { MonthPicker } from '@/components/month-picker'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ActionTooltip } from '@/components/action-tooltip'
import { MEMBER_ROLES } from '@/lib/catalogs'
import { listResearchers, linkMember, unlinkMember, updateMember, getGroupMembers, getGroupMemberships } from '@/lib/api'
import type { Researcher } from '@/lib/types'

export interface GroupMembersTabProps {
  groupId: number
  isAdmin?: boolean
  members?: Researcher[]
  isLoadingMembers?: boolean
  memberships?: any[]
}

export function GroupMembersTab({
  groupId,
  isAdmin = false,
  members: propsMembers,
  isLoadingMembers: propsIsLoadingMembers,
  memberships: propsMemberships,
}: GroupMembersTabProps) {
  const queryClient = useQueryClient()

  const { data: fetchedMembers, isLoading: isFetchingMembers } = useQuery({
    queryKey: ['groups', groupId, 'members'],
    queryFn: () => getGroupMembers(groupId),
    enabled: !propsMembers,
  })

  const { data: fetchedMemberships } = useQuery({
    queryKey: ['groups', groupId, 'memberships'],
    queryFn: () => getGroupMemberships(groupId),
    enabled: !propsMemberships,
  })

  const members = propsMembers ?? fetchedMembers ?? []
  const isLoadingMembers = propsIsLoadingMembers ?? isFetchingMembers
  const memberships = propsMemberships ?? fetchedMemberships ?? []

  // Vinculación de investigadores
  const [memberOpen, setMemberOpen] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedResearcherId, setSelectedResearcherId] = useState<number | null>(null)
  const [memberRole, setMemberRole] = useState('Investigador')
  const [memberStartDate, setMemberStartDate] = useState('')

  const { data: researcherResults, isFetching: isSearchingResearchers } = useQuery({
    queryKey: ['researchers', 'picker', memberSearch],
    queryFn: () => listResearchers({ search: memberSearch, limit: 8 }),
    enabled: memberOpen,
  })

  const linkableResearchers = (researcherResults?.items ?? []).filter(
    (r) => !(members ?? []).some((m) => m.id === r.id)
  )

  const researcherItems = useMemo<EntityItem[]>(() => {
    return linkableResearchers.map((r) => ({
      id: r.id!,
      label: `${r.first_names} ${r.last_names}`,
      subLabel: r.orcid ? `ORCID: ${r.orcid}` : r.institutional_email ?? null,
      badge: r.highest_education_level ?? null,
    }))
  }, [linkableResearchers])

  // Diálogo de edición de membresía
  const [editingMember, setEditingMember] = useState<Researcher | null>(null)
  const [editRole, setEditRole] = useState('Investigador')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')

  const openEditMember = (r: Researcher) => {
    const ms = (memberships ?? []).find((m) => m.researcher_id === r.id)
    setEditingMember(r)
    setEditRole(ms?.role || 'Investigador')
    setEditStartDate(toMonthInput(ms?.start_date))
    setEditEndDate(toMonthInput(ms?.end_date))
  }

  // Diálogo de desvinculación
  const [unlinkingMember, setUnlinkingMember] = useState<Researcher | null>(null)

  const linkMemberMutation = useMutation({
    mutationFn: () =>
      linkMember(groupId, selectedResearcherId!, {
        role: memberRole,
        start_date: memberStartDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['researcher-groups'] })
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'memberships'] })
      toast.success('Investigador vinculado al grupo')
      setMemberOpen(false)
      setSelectedResearcherId(null)
      setMemberSearch('')
      setMemberRole('Investigador')
      setMemberStartDate('')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al vincular'),
  })

  const unlinkMemberMutation = useMutation({
    mutationFn: (rid: number) => unlinkMember(groupId, rid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['researcher-groups'] })
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'memberships'] })
      toast.success('Investigador desvinculado del grupo')
      setUnlinkingMember(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al desvincular'),
  })

  const updateMemberMutation = useMutation({
    mutationFn: () =>
      updateMember(groupId, editingMember!.id!, {
        role: editRole,
        start_date: editStartDate,
        end_date: editEndDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'memberships'] })
      toast.success('Membresía actualizada')
      setEditingMember(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al actualizar membresía'),
  })

  return (
    <div className='bg-card border border-border/50 rounded-2xl p-6 shadow-sm'>
      <div className='flex justify-between items-center mb-4'>
        <h3 className='font-semibold text-lg'>Investigadores vinculados</h3>
        {isAdmin && (
          <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
            <DialogTrigger asChild>
              <Button size='sm'>
                <UserPlus className='w-4 h-4 mr-2' /> Vincular Investigador
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogTitle>Vincular Investigador al Grupo</DialogTitle>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                <EntityCombobox
                  label='Investigador a vincular'
                  items={researcherItems}
                  value={selectedResearcherId}
                  onChange={(id) => setSelectedResearcherId(id)}
                  onSearchChange={setMemberSearch}
                  isLoading={isSearchingResearchers}
                  placeholder='Seleccionar o buscar investigador...'
                  searchPlaceholder='Nombre, apellido u ORCID...'
                  emptyMessage='No se encontraron investigadores disponibles.'
                />
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <CatalogSelect
                    label='Rol en el grupo'
                    options={MEMBER_ROLES}
                    value={memberRole}
                    onChange={setMemberRole}
                    allowClear={false}
                  />
                  <div className='space-y-2'>
                    <Label>Fecha de vinculación</Label>
                    <MonthPicker
                      value={memberStartDate}
                      onChange={setMemberStartDate}
                      placeholder='Mes y año...'
                    />
                  </div>
                </div>
                <Button
                  className='w-full'
                  onClick={() => linkMemberMutation.mutate()}
                  disabled={!selectedResearcherId || linkMemberMutation.isPending}
                >
                  Vincular
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Nombre',
            searchable: (r: Researcher) => `${r.first_names} ${r.last_names}`,
            cell: (r: Researcher) => (
              <div className='flex items-center gap-2.5'>
                <ResearcherAvatar firstName={r.first_names} lastName={r.last_names} size='sm' />
                <Link
                  to={isAdmin ? '/admin/researchers/$id' : '/researchers/$id'}
                  params={{ id: String(r.id) }}
                  className='font-medium text-primary hover:underline'
                >
                  {r.first_names} {r.last_names}
                </Link>
              </div>
            ),
          },
          {
            key: 'orcid',
            header: 'ORCID',
            cell: (r: Researcher) => (
              <span className='text-muted-foreground font-mono text-xs'>{r.orcid || '-'}</span>
            ),
          },
          {
            key: 'role',
            header: 'Rol y Periodo',
            cell: (r: Researcher) => {
              const ms = (memberships ?? []).find((m) => m.researcher_id === r.id)
              if (!ms) return '-'
              const period = ms.start_date
                ? `${ms.start_date} – ${ms.is_current ? 'Actual' : ms.end_date || ''}`
                : ''
              return (
                <div className='flex flex-col gap-1'>
                  <span className='font-medium'>{ms.role}</span>
                  {period && <span className='text-xs text-muted-foreground'>{period}</span>}
                </div>
              )
            },
          },
          {
            key: 'education',
            header: 'Formación',
            cell: (r: Researcher) =>
              r.highest_education_level ? (
                <Badge variant='outline'>{r.highest_education_level}</Badge>
              ) : (
                '-'
              ),
          },
          isAdmin
            ? {
                key: 'actions',
                header: '',
                cell: (r: Researcher) => (
                  <div className='flex items-center gap-1'>
                    <ActionTooltip label='Editar membresía'>
                      <Button variant='ghost' size='icon' onClick={() => openEditMember(r)}>
                        <Pencil className='w-4 h-4' />
                      </Button>
                    </ActionTooltip>
                    <ActionTooltip label='Desvincular integrante'>
                      <Button variant='ghost' size='icon' onClick={() => setUnlinkingMember(r)}>
                        <Trash2 className='w-4 h-4 text-red-500' />
                      </Button>
                    </ActionTooltip>
                  </div>
                ),
              }
            : null,
        ].filter(Boolean) as any}
        data={members ?? []}
        loading={isLoadingMembers}
        rowKey={(r) => r.id!}
        emptyMessage='No hay integrantes vinculados a este grupo.'
        searchPlaceholder='Buscar por nombre...'
      />

      {/* Diálogo: editar membresía */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Editar Membresía</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <p className='text-sm text-muted-foreground'>
              {editingMember ? `${editingMember.first_names} ${editingMember.last_names}` : ''}
            </p>
            <CatalogSelect
              label='Rol en el grupo'
              options={MEMBER_ROLES}
              value={editRole}
              onChange={setEditRole}
              allowClear={false}
            />
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Fecha de vinculación</Label>
                <MonthPicker
                  value={editStartDate}
                  onChange={setEditStartDate}
                  placeholder='Mes y año...'
                />
              </div>
              <div className='space-y-2'>
                <Label>Fecha de retiro</Label>
                <MonthPicker
                  value={editEndDate}
                  onChange={setEditEndDate}
                  placeholder='Vigente (sin retiro)'
                  allowClear
                />
              </div>
            </div>
            <Button
              className='w-full'
              onClick={() => updateMemberMutation.mutate()}
              disabled={updateMemberMutation.isPending}
            >
              {updateMemberMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación para desvincular integrante */}
      <ConfirmDialog
        open={unlinkingMember !== null}
        onOpenChange={(open) => !open && setUnlinkingMember(null)}
        title='¿Desvincular integrante?'
        desc={`¿Estás seguro de que deseas desvincular a «${unlinkingMember?.first_names ?? ''} ${unlinkingMember?.last_names ?? ''}» de este grupo? Esta acción se puede revertir volviendo a vincular al investigador.`}
        confirmText='Desvincular'
        cancelBtnText='Cancelar'
        destructive
        isLoading={unlinkMemberMutation.isPending}
        handleConfirm={() => {
          if (unlinkingMember?.id != null) {
            unlinkMemberMutation.mutate(unlinkingMember.id, {
              onSettled: () => setUnlinkingMember(null),
            })
          }
        }}
      />
    </div>
  )
}
