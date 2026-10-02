import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { listProjects, deleteProject, restoreProject, listResearchers } from '@/lib/api'
import type { Project } from '@/lib/types'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable, type DataColumn, type DataFilter } from '@/components/data-table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProjectFormDialog } from './project-form-dialog'

const projectFilters: DataFilter[] = [
  {
    key: 'status',
    label: 'Estado del registro',
    defaultValue: 'active',
    options: [
      { value: 'all', label: 'Todos' },
      { value: 'active', label: 'Activos' },
      { value: 'inactive', label: 'Inactivos' },
    ],
  },
]

// Formato de presupuesto: 2.500.000
function fmtBudget(b?: number | null) {
  if (b == null || b === 0) return '—'
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(b)
}

export function Projects() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  // Estado server-side: búsqueda (debounced), página y filtro de estado
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: 'active',
  })

  const params = useMemo(
    () => ({
      skip: page * pageSize,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      status: filterValues.status !== 'all' ? filterValues.status : undefined,
    }),
    [page, pageSize, debouncedSearch, filterValues]
  )

  const projects = useQuery({
    queryKey: ['projects', 'list', params],
    queryFn: () => listProjects(params),
    placeholderData: keepPreviousData,
  })

  // Mapa id -> nombre para mostrar el investigador principal (Req. 3)
  const { data: researchers } = useQuery({
    queryKey: ['researchers', 'for-projects-page'],
    queryFn: () => listResearchers({ limit: 1000 }),
  })
  const researcherName = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of researchers?.items ?? []) {
      map.set(r.id!, `${r.first_names} ${r.last_names}`)
    }
    return map
  }, [researchers])

  // Si un delete/restauración deja la última página vacía, volver a una página válida
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil((projects.data?.total ?? 0) / pageSize) - 1)
    if (page > maxPage) setPage(maxPage)
  }, [projects.data?.total, pageSize, page])

  const delMutation = useMutation({
    mutationFn: (id: number) => deleteProject(id, true),
    onSuccess: () => {
      toast.success('Proyecto eliminado (baja lógica)')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreProject(id),
    onSuccess: () => {
      toast.success('Proyecto restaurado')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al restaurar'),
  })

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este proyecto?')) {
      delMutation.mutate(id)
    }
  }

  const columns = useMemo<DataColumn<Project>[]>(() => [
    {
      key: 'title',
      header: 'Título',
      className: 'max-w-[420px]',
      searchable: (p) => p.title,
      cell: (p) => (
        <div className='flex items-center gap-2'>
          <span className='truncate font-medium'>{p.title}</span>
          {p.status === 'inactive' && (
            <span className='shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground'>
              inactivo
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'project_type',
      header: 'Tipo',
      searchable: (p) => p.project_type ?? '',
      cell: (p) => <span className='text-sm'>{p.project_type || '—'}</span>,
    },
    {
      key: 'period',
      header: 'Periodo',
      cell: (p) => (
        <span className='text-sm text-muted-foreground'>
          {[p.start_date, p.end_date].filter(Boolean).join(' – ') || '—'}
        </span>
      ),
    },
    {
      key: 'budget',
      header: 'Presupuesto',
      cell: (p) => <span className='text-sm tabular-nums'>{fmtBudget(p.budget)}</span>,
    },
    {
      key: 'pi',
      header: 'Investigador principal',
      searchable: (p) => researcherName.get(p.principal_investigator_id ?? -1) ?? '',
      cell: (p) => (
        <span className='text-sm'>
          {researcherName.get(p.principal_investigator_id ?? -1) ?? '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (p) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='h-8 w-8 p-0'>
              <span className='sr-only'>Abrir menú</span>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => handleEdit(p)}>
              <Pencil className='mr-2 h-4 w-4' />
              Editar
            </DropdownMenuItem>
            {p.status === 'inactive' ? (
              <DropdownMenuItem onClick={() => restoreMutation.mutate(p.id!)}>
                <RotateCcw className='mr-2 h-4 w-4' />
                Restaurar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => handleDelete(p.id!)}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [delMutation, restoreMutation, researcherName])

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
            <h1 className='text-2xl font-bold tracking-tight'>Proyectos de investigación</h1>
            <p className='text-muted-foreground'>
              Gestión independiente de proyectos y su vínculo con grupos.
            </p>
          </div>
          <Button onClick={() => { setEditingProject(null); setFormOpen(true) }}>
            <Plus className='mr-2 h-4 w-4' /> Agregar Proyecto
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={projects.data?.items ?? []}
          loading={projects.isLoading}
          rowKey={(p) => p.id ?? p.title}
          searchPlaceholder='Buscar por título o tipo…'
          filters={projectFilters}
          emptyMessage='Sin proyectos para los filtros seleccionados.'
          server={{
            total: projects.data?.total ?? 0,
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
            isFetching: projects.isFetching,
          }}
        />
      </Main>

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editingProject}
      />
    </>
  )
}
