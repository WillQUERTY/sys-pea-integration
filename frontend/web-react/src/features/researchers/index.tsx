import { useState, useMemo, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sparkles, Plus, MoreHorizontal, Pencil, Trash2, DownloadCloud, RotateCcw } from 'lucide-react'
import { enrichAllResearchers, enrichResearcher, importCvlacByCodRh, listResearchers, deleteResearcher, restoreResearcher } from '@/lib/api'
import type { Researcher } from '@/lib/types'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
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
import { ResearcherFormDialog } from './researcher-form-dialog'

function CvlacFetchButton({ codRh }: { codRh?: string }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => importCvlacByCodRh(codRh!),
    onSuccess: (r) => {
      toast.success(r.summary ?? 'CvLAC importado')
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al traer el CvLAC'),
  })
  return (
    <Button
      size='sm'
      variant='outline'
      disabled={!codRh || mutation.isPending}
      onClick={() => mutation.mutate()}
      title='Descargar e importar CvLAC completo desde Scienti'
    >
      <DownloadCloud className='h-3.5 w-3.5' />
    </Button>
  )
}

function EnrichButton({ id }: { id?: number }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => enrichResearcher(id!),
    onSuccess: (r) => {
      if (r.status === 'enriched') {
        toast.success(`Enriquecido: ${r.fields_updated?.join(', ')}`)
      } else if (r.status === 'not_found') {
        toast.info('Sin registro en datos abiertos')
      } else {
        toast.info('Ya está actualizado')
      }
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al enriquecer'),
  })
  return (
    <Button
      size='sm'
      variant='outline'
      disabled={!id || mutation.isPending}
      onClick={() => mutation.mutate()}
      title="Enriquecer con datos abiertos de Minciencias"
    >
      <Sparkles className='h-3.5 w-3.5' />
    </Button>
  )
}

export function Researchers() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingResearcher, setEditingResearcher] = useState<Researcher | null>(null)

  // Estado server-side: búsqueda (debounced), página y filtros
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: 'active',
    educational_level: 'all',
    category: 'all',
  })

  const params = useMemo(
    () => ({
      skip: page * pageSize,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      status: filterValues.status !== 'all' ? filterValues.status : undefined,
      educational_level:
        filterValues.educational_level !== 'all' ? filterValues.educational_level : undefined,
      category: filterValues.category !== 'all' ? filterValues.category : undefined,
    }),
    [page, pageSize, debouncedSearch, filterValues]
  )

  const researchers = useQuery({
    queryKey: ['researchers', 'list', params],
    queryFn: () => listResearchers(params),
    placeholderData: keepPreviousData,
  })

  // Si un delete/restauración deja la última página vacía, volver a una página válida
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil((researchers.data?.total ?? 0) / pageSize) - 1)
    if (page > maxPage) setPage(maxPage)
  }, [researchers.data?.total, pageSize, page])

  const delMutation = useMutation({
    mutationFn: (id: number) => deleteResearcher(id, true),
    onSuccess: () => {
      toast.success('Investigador eliminado (baja lógica)')
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreResearcher(id),
    onSuccess: () => {
      toast.success('Investigador restaurado')
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al restaurar'),
  })

  const enrichAll = useMutation({
    mutationFn: () => enrichAllResearchers({ only_missing: true }),
    onSuccess: (r) => {
      toast.success(
        `Enriquecidos: ${r.enriched} · Sin registro: ${r.not_found} · Ya al día: ${r.up_to_date}`
      )
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al enriquecer'),
  })

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este investigador?')) {
      delMutation.mutate(id)
    }
  }

  const columns = useMemo<DataColumn<Researcher>[]>(() => [
    {
      key: 'name',
      header: 'Nombre completo',
      searchable: (r) => `${r.first_names} ${r.last_names}`,
      cell: (r) => {
        const initial = r.first_names?.[0]?.toUpperCase() ?? '?'
        const hue = (r.first_names?.charCodeAt(0) ?? 0) * 23 % 360
        return (
          <div className='flex items-center gap-3'>
            <div
              className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white'
              style={{ background: `hsl(${hue} 50% 45%)` }}
            >
              {initial}
            </div>
            <div className='min-w-0'>
              <Link to="/researchers/$id" params={{ id: String(r.id) }} className='truncate text-sm font-medium hover:underline text-primary'>
                {r.first_names} {r.last_names}
              </Link>
              {r.institutional_email && (
                <p className='truncate text-xs text-muted-foreground'>{r.institutional_email}</p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'code',
      header: 'Código RH',
      cell: (r) => <span className='font-mono text-xs'>{r.external_code}</span>,
      searchable: (r) => r.external_code,
    },
    {
      key: 'education',
      header: 'Formación máxima',
      cell: (r) =>
        r.highest_education_level ? (
          <Badge variant='secondary' className='text-xs font-normal'>
            {r.highest_education_level}
          </Badge>
        ) : (
          <span className='text-muted-foreground'>—</span>
        ),
    },
    {
      key: 'orcid',
      header: 'ORCID',
      cell: (r) =>
        r.orcid ? (
          <a
            href={`https://orcid.org/${r.orcid}`}
            target='_blank'
            rel='noreferrer'
            className='font-mono text-xs hover:underline'
          >
            {r.orcid}
          </a>
        ) : (
          <span className='text-muted-foreground'>—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      cell: (r) => (
        <div className="flex items-center gap-2 justify-end">
          <EnrichButton id={r.id} />
          <CvlacFetchButton codRh={r.external_code} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 w-8 p-0'>
                <span className='sr-only'>Abrir menú</span>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem asChild>
                <Link to="/researchers/$id" params={{ id: String(r.id) }} className='cursor-pointer w-full'>
                  <Pencil className='mr-2 h-4 w-4' />
                  Ver / Editar Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {r.status === 'inactive' ? (
                <DropdownMenuItem onClick={() => restoreMutation.mutate(r.id!)}>
                  <RotateCcw className='mr-2 h-4 w-4' />
                  Restaurar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={() => handleDelete(r.id!)}
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [delMutation, restoreMutation])

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
        <div className='mb-4'>
          <h1 className='text-2xl font-bold tracking-tight'>Investigadores</h1>
          <p className='text-muted-foreground'>
            Integrantes importados desde GrupLAC / CvLAC o creados manualmente.
          </p>
        </div>

        <DataTable
          columns={columns}
          data={researchers.data?.items ?? []}
          loading={researchers.isLoading}
          rowKey={(r) => r.id ?? r.external_code}
          searchPlaceholder='Buscar por nombre o código…'
          emptyMessage='No hay investigadores que coincidan.'
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
              key: 'educational_level',
              label: 'Formación',
              options: [
                { value: 'all', label: 'Cualquiera' },
                { value: 'Pregrado', label: 'Pregrado' },
                { value: 'Especialización', label: 'Especialización' },
                { value: 'Maestría', label: 'Maestría' },
                { value: 'Doctorado', label: 'Doctorado' },
              ]
            },
            {
              key: 'category',
              label: 'Categoría',
              options: [
                { value: 'all', label: 'Cualquiera' },
                { value: 'Investigador Emérito', label: 'Emérito' },
                { value: 'Investigador Senior', label: 'Senior' },
                { value: 'Investigador Asociado', label: 'Asociado' },
                { value: 'Investigador Junior', label: 'Junior' },
              ]
            }
          ]}
          server={{
            total: researchers.data?.total ?? 0,
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
            isFetching: researchers.isFetching,
          }}
          toolbarActions={
            <>
              <Button variant='outline' onClick={() => enrichAll.mutate()} disabled={enrichAll.isPending}>
                <Sparkles className='me-2 h-4 w-4' />
                {enrichAll.isPending ? 'Enriqueciendo…' : 'Enriquecer Todo'}
              </Button>
              <Button onClick={() => { setEditingResearcher(null); setFormOpen(true) }}>
                <Plus className='mr-2 h-4 w-4' /> Agregar Investigador
              </Button>
            </>
          }
        />
      </Main>

      <ResearcherFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        researcher={editingResearcher} 
      />
    </>
  )
}

