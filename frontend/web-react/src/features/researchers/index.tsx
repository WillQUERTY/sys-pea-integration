import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sparkles, Plus, MoreHorizontal, Pencil, Trash2, DownloadCloud } from 'lucide-react'
import { enrichAllResearchers, enrichResearcher, importCvlacByCodRh, listResearchers, deleteResearcher } from '@/lib/api'
import type { Researcher } from '@/lib/types'
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

  const researchers = useQuery({
    queryKey: ['researchers'],
    queryFn: () => listResearchers({ limit: 1000 }),
  })

  const delMutation = useMutation({
    mutationFn: (id: number) => deleteResearcher(id, true),
    onSuccess: () => {
      toast.success('Investigador eliminado (baja lógica)')
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
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
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => handleDelete(r.id!)}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [delMutation])

  // Filters to exclude inactive researchers
  const activeResearchers = (researchers.data ?? []).filter(r => r.status !== 'inactive')

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
          data={activeResearchers}
          loading={researchers.isLoading}
          rowKey={(r) => r.id ?? r.external_code}
          searchPlaceholder='Buscar por nombre o código…'
          emptyMessage='No hay investigadores activos registrados.'
          defaultPageSize={10}
          filters={[
            {
              key: 'status',
              label: 'Estado',
              options: [
                { value: 'all', label: 'Todos' },
                { value: 'active', label: 'Activos' },
                { value: 'inactive', label: 'Inactivos' },
              ]
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
          filterFn={(r, filterValues) => {
            if (filterValues.status && filterValues.status !== 'all' && r.status !== filterValues.status) return false
            if (filterValues.educational_level && filterValues.educational_level !== 'all' && r.highest_education_level !== filterValues.educational_level) return false
            if (filterValues.category && filterValues.category !== 'all' && r.classification_records !== filterValues.category) return false
            return true
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

