import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserPlus, Trash2 } from 'lucide-react'
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
import { DataTable, type DataColumn } from '@/components/data-table'
import { EntityCombobox, type EntityItem } from '@/components/entity-combobox'
import { CatalogSelect } from '@/components/catalog-field'
import { MonthPicker } from '@/components/month-picker'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ActionTooltip } from '@/components/action-tooltip'
import { MEMBER_ROLES } from '@/lib/catalogs'
import {
  getResearcherGroups,
  listGroups,
  linkMember,
  unlinkMember,
} from '@/lib/api'
import type { Group } from '@/lib/types'

interface ResearcherGroupsTabProps {
  researcherId: number
  isAdmin?: boolean
  groups?: Group[]
  isLoadingGroups?: boolean
}

export function ResearcherGroupsTab({
  researcherId,
  isAdmin = false,
  groups: propsGroups,
  isLoadingGroups: propsIsLoadingGroups,
}: ResearcherGroupsTabProps) {
  const queryClient = useQueryClient()

  const { data: fetchedGroups, isLoading: isFetchingGroups } = useQuery({
    queryKey: ['researcher-groups', researcherId],
    queryFn: () => getResearcherGroups(researcherId),
    enabled: !propsGroups,
  })

  const groups = propsGroups ?? fetchedGroups ?? []
  const isLoadingGroups = propsIsLoadingGroups ?? isFetchingGroups

  const [unlinkingGroup, setUnlinkingGroup] = useState<Group | null>(null)
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [memberRole, setMemberRole] = useState('Investigador')
  const [memberStartDate, setMemberStartDate] = useState('')

  const { data: groupResults, isFetching: isSearchingGroups } = useQuery({
    queryKey: ['groups', 'picker', groupSearch],
    queryFn: () => listGroups({ search: groupSearch, limit: 8 }),
    enabled: groupOpen,
  })

  const linkableGroups = (groupResults?.items ?? []).filter(
    (g) => !(groups ?? []).some((gg) => gg.id === g.id)
  )

  const groupItems = useMemo<EntityItem[]>(() => {
    return linkableGroups.map((g) => ({
      id: g.id!,
      label: g.name,
      subLabel: g.acronym || g.external_code || null,
      badge: g.classification ?? null,
    }))
  }, [linkableGroups])

  const linkGroupMutation = useMutation({
    mutationFn: () =>
      linkMember(selectedGroupId!, researcherId, {
        role: memberRole,
        start_date: memberStartDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researcher-groups', researcherId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Investigador vinculado al grupo')
      setGroupOpen(false)
      setSelectedGroupId(null)
      setGroupSearch('')
      setMemberRole('Investigador')
      setMemberStartDate('')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al vincular'),
  })

  const unlinkGroupMutation = useMutation({
    mutationFn: (gid: number) => unlinkMember(gid, researcherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researcher-groups', researcherId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Vinculación eliminada')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al desvincular'),
  })

  const columns: DataColumn<Group>[] = [
    {
      key: 'name',
      header: 'Nombre del Grupo',
      searchable: (g: Group) => `${g.name} ${g.acronym ?? ''}`,
      cell: (g: Group) => (
        <Link
          to={isAdmin ? '/admin/groups/$id' : '/groups/$id'}
          params={{ id: String(g.id) }}
          className='font-medium text-sm text-primary hover:underline'
        >
          {g.name}
        </Link>
      ),
    },
    {
      key: 'acronym',
      header: 'Sigla',
      cell: (g: Group) => <span className='text-muted-foreground'>{g.acronym || '-'}</span>,
    },
    {
      key: 'classification',
      header: 'Clasificación',
      cell: (g: Group) =>
        g.classification ? (
          <Badge variant='secondary'>{g.classification}</Badge>
        ) : (
          <span className='text-muted-foreground'>Sin clasificar</span>
        ),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            cell: (g: Group) => (
              <ActionTooltip label="Desvincular del grupo">
                <Button variant="ghost" size="icon" onClick={() => setUnlinkingGroup(g)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </ActionTooltip>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Grupos de Investigación</h3>
        {isAdmin && (
          <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" /> Vincular a Grupo
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogTitle>Vincular a un Grupo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <EntityCombobox
                  label="Grupo de investigación"
                  items={groupItems}
                  value={selectedGroupId}
                  onChange={(id) => setSelectedGroupId(id)}
                  onSearchChange={setGroupSearch}
                  isLoading={isSearchingGroups}
                  placeholder="Seleccionar o buscar grupo..."
                  searchPlaceholder="Nombre, sigla o código..."
                  emptyMessage="No se encontraron grupos disponibles."
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CatalogSelect
                    label="Rol en el grupo"
                    options={MEMBER_ROLES}
                    value={memberRole}
                    onChange={setMemberRole}
                    allowClear={false}
                  />
                  <div className="space-y-2">
                    <Label>Fecha de vinculación</Label>
                    <MonthPicker
                      value={memberStartDate}
                      onChange={setMemberStartDate}
                      placeholder="Mes y año..."
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => linkGroupMutation.mutate()}
                  disabled={!selectedGroupId || linkGroupMutation.isPending}
                >
                  Vincular
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <DataTable<Group>
        columns={columns}
        data={groups}
        loading={isLoadingGroups}
        rowKey={(g: Group) => g.id!}
        emptyMessage="Este investigador no está vinculado a ningún grupo."
        searchPlaceholder="Buscar grupos..."
      />

      {/* Confirmación: desvincular de grupo */}
      <ConfirmDialog
        open={unlinkingGroup !== null}
        onOpenChange={(open) => !open && setUnlinkingGroup(null)}
        title="¿Desvincular del grupo?"
        desc={`¿Estás seguro de que deseas desvincular a este investigador del grupo «${unlinkingGroup?.name ?? ''}»?`}
        confirmText="Desvincular"
        cancelBtnText="Cancelar"
        destructive
        isLoading={unlinkGroupMutation.isPending}
        handleConfirm={() => {
          if (unlinkingGroup?.id != null) {
            unlinkGroupMutation.mutate(unlinkingGroup.id, {
              onSettled: () => setUnlinkingGroup(null),
            })
          }
        }}
      />
    </div>
  )
}
