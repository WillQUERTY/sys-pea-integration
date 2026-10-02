import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { listGroups, deleteGroup, restoreGroup } from '@/lib/api'
import type { Group } from '@/lib/types'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { parseMincienciasClassification } from '@/lib/utils'
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

  // Estado server-side: búsqueda (debounced), página y filtros
  // El término llega por URL desde el hero-search del dashboard
  const urlSearch = useSearch({ from: '/_authenticated/groups/' })
  const [search, setSearch] = useState(urlSearch.search ?? '')
  const debouncedSearch = useDebouncedValue(search, 300)
  useEffect(() => {
    if (urlSearch.search !== undefined) setSearch(urlSearch.search)
  }, [urlSearch.search])
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: 'active',
    classification: 'all',
  })

  const params = useMemo(
    () => ({
      skip: page * pageSize,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      status: filterValues.status !== 'all' ? filterValues.status : undefined,
      classification:
        filterValues.classification !== 'all' ? filterValues.classification : undefined,
    }),
    [page, pageSize, debouncedSearch, filterValues]
  )

  const groups = useQuery({
    queryKey: ['groups', 'list', params],
    queryFn: () => listGroups(params),
    placeholderData: keepPreviousData,
  })

  // Si un delete/restauración deja la última página vacía, volver a una página válida
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil((groups.data?.total ?? 0) / pageSize) - 1)
    if (page > maxPage) setPage(maxPage)
  }, [groups.data?.total, pageSize, page])

  const delMutation = useMutation({
    mutationFn: (id: number) => deleteGroup(id, true),
    onSuccess: () => {
      toast.success('Grupo eliminado (baja lógica)')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreGroup(id),
    onSuccess: () => {
      toast.success('Grupo restaurado')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al restaurar'),
  })

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
          to='/groups/$id'
          params={{ id: String(g.id) }}
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
      cell: (g) => {
        if (!g.classification) return <span className='text-muted-foreground'>—</span>
        const info = parseMincienciasClassification(g.classification)
        return (
          <Badge
            variant='outline'
            className={`text-xs font-semibold px-2 py-0.5 ${info.badgeVariant}`}
            title={g.classification}
          >
            {info.badgeText}
          </Badge>
        )
      },
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
            <DropdownMenuItem asChild>
              <Link to='/groups/$id' params={{ id: String(g.id) }} className='cursor-pointer w-full'>
                <Pencil className='mr-2 h-4 w-4' />
                Ver / Editar Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {g.status === 'inactive' ? (
              <DropdownMenuItem onClick={() => restoreMutation.mutate(g.id!)}>
                <RotateCcw className='mr-2 h-4 w-4' />
                Restaurar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => handleDelete(g.id!)}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [delMutation, restoreMutation])

  // Filtering is now handled by DataTable

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
          data={groups.data?.items ?? []}
          loading={groups.isLoading}
          rowKey={(g) => g.id ?? g.external_code}
          searchPlaceholder='Buscar por nombre, sigla o código…'
          emptyMessage='No hay grupos que coincidan.'
          filters={[
            {
              key: 'status',
              label: 'Estado',
              options: [
                { value: 'all', label: 'Todos' },
                { value: 'active', label: 'Activos' },
                { value: 'inactive', label: 'Inactivos' },
              ],
              defaultValue: 'active',
            },
            {
              key: 'classification',
              label: 'Clasificación',
              options: [
                { value: 'all', label: 'Cualquiera' },
                { value: 'A1', label: 'A1' },
                { value: 'A', label: 'A' },
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
                { value: 'Reconocido', label: 'Reconocido' },
              ]
            }
          ]}
          server={{
            total: groups.data?.total ?? 0,
            pageIndex: page,
            pageSize,
            onPageChange: setPage,
            onPageSizeChange: (ps) => {
              setPageSize(ps)
              setPage(0)
            },
            searchValue: search,
            onSearchChange: (v) => {
              setSearch(v)
              setPage(0)
            },
            filterValues,
            onFilterChange: (v) => {
              setFilterValues(v)
              setPage(0)
            },
            isFetching: groups.isFetching,
          }}
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
