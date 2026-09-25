import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { listGroups, deleteGroup } from '@/lib/api'
import type { Group } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable, type DataColumn } from '@/components/data-table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { GroupFormDialog } from './group-form-dialog'

export function Groups() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  const groups = useQuery({
    queryKey: ['groups'],
    queryFn: () => listGroups({ limit: 500 }),
  })

  const delMutation = useMutation({
    mutationFn: (id: number) => deleteGroup(id, true),
    onSuccess: () => {
      toast.success('Grupo eliminado (baja lógica)')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  const handleEdit = (group: Group) => {
    setEditingGroup(group)
    setFormOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este grupo?')) {
      delMutation.mutate(id)
    }
  }

  const columns = useMemo<DataColumn<Group>[]>(() => [
    {
      key: 'name',
      header: 'Nombre',
      className: 'max-w-[350px]',
      searchable: (g) => `${g.name} ${g.acronym ?? ''}`,
      cell: (g) => (
        <Link
          to='/groups/$groupId'
          params={{ groupId: String(g.id) }}
          className='flex items-center gap-3 hover:underline'
        >
          <div
            className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white'
            style={{ background: `hsl(${(g.name?.charCodeAt(0) ?? 0) * 17 % 360} 55% 50%)` }}
          >
            {g.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className='min-w-0'>
            <p className='truncate text-sm font-medium'>{g.name}</p>
            {g.institution && (
              <p className='truncate text-xs text-muted-foreground'>{g.institution}</p>
            )}
          </div>
        </Link>
      ),
    },
    {
      key: 'acronym',
      header: 'Sigla',
      cell: (g) => <span className='text-sm'>{g.acronym ?? '—'}</span>,
      searchable: (g) => g.acronym ?? '',
    },
    {
      key: 'code',
      header: 'Código',
      cell: (g) => <span className='font-mono text-xs'>{g.external_code}</span>,
      searchable: (g) => g.external_code,
    },
    {
      key: 'classification',
      header: 'Clasificación',
      cell: (g) =>
        g.classification ? (
          <Badge variant='outline'>{g.classification}</Badge>
        ) : (
          <span className='text-muted-foreground'>—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      cell: (g) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='h-8 w-8 p-0'>
              <span className='sr-only'>Abrir menú</span>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => handleEdit(g)}>
              <Pencil className='mr-2 h-4 w-4' />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-destructive focus:text-destructive'
              onClick={() => handleDelete(g.id!)}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [delMutation])

  // Filters to exclude inactive groups
  const activeGroups = (groups.data ?? []).filter(g => g.status !== 'inactive')

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
            <h1 className='text-2xl font-bold tracking-tight'>Grupos de investigación</h1>
            <p className='text-muted-foreground'>
              Grupos importados desde GrupLAC o creados manualmente.
            </p>
          </div>
          <Button onClick={() => { setEditingGroup(null); setFormOpen(true) }}>
            <Plus className='mr-2 h-4 w-4' /> Agregar Grupo
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={activeGroups}
          loading={groups.isLoading}
          rowKey={(g) => g.id ?? g.external_code}
          searchPlaceholder='Buscar por nombre, sigla o código…'
          emptyMessage='No hay grupos activos.'
          defaultPageSize={10}
        />
      </Main>

      <GroupFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        group={editingGroup} 
      />
    </>
  )
}
