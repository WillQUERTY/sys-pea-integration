import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ActionTooltip } from '@/components/action-tooltip'
import { linkProject, unlinkProject, getGroupProjects } from '@/lib/api'
import type { Project } from '@/lib/types'

export interface GroupProjectsTabProps {
  groupId: number
  isAdmin?: boolean
  projects?: Project[]
  isLoadingProjects?: boolean
}

export function GroupProjectsTab({
  groupId,
  isAdmin = false,
  projects: propsProjects,
  isLoadingProjects: propsIsLoadingProjects,
}: GroupProjectsTabProps) {
  const queryClient = useQueryClient()

  const { data: fetchedProjects, isLoading: isFetchingProjects } = useQuery({
    queryKey: ['groups', groupId, 'projects'],
    queryFn: () => getGroupProjects(groupId),
    enabled: !propsProjects,
  })

  const projects = propsProjects ?? fetchedProjects ?? []
  const isLoadingProjects = propsIsLoadingProjects ?? isFetchingProjects

  const [projectOpen, setProjectOpen] = useState(false)
  const [newProject, setNewProject] = useState({ title: '', start_date: '', status: 'Activo' })
  const [unlinkingProject, setUnlinkingProject] = useState<Project | null>(null)

  const linkProjMutation = useMutation({
    mutationFn: () => linkProject(groupId, newProject),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'projects'] })
      toast.success('Proyecto añadido correctamente')
      setProjectOpen(false)
      setNewProject({ title: '', start_date: '', status: 'Activo' })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al añadir'),
  })

  const unlinkProjMutation = useMutation({
    mutationFn: (pid: number) => unlinkProject(groupId, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'projects'] })
      toast.success('Proyecto desvinculado')
      setUnlinkingProject(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al desvincular'),
  })

  const columns: DataColumn<Project>[] = [
    {
      key: 'title',
      header: 'Título del Proyecto',
      searchable: (p: Project) => p.title,
      className: 'max-w-[400px]',
      cell: (p: Project) => (
        <Link
          to={isAdmin ? '/admin/projects/$id' : '/projects/$id'}
          params={{ id: String(p.id) }}
          className='block truncate font-medium text-sm text-primary hover:underline'
        >
          {p.title}
        </Link>
      ),
    },
    {
      key: 'start_date',
      header: 'Fecha de Inicio',
      cell: (p: Project) => (
        <span className='text-muted-foreground'>{p.start_date || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (p: Project) =>
        p.status === 'Activo' || !p.status ? (
          <Badge
            variant='outline'
            className='border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium'
          >
            Activo
          </Badge>
        ) : (
          <Badge variant='outline' className='text-muted-foreground border-border/60 bg-muted/30'>
            {p.status}
          </Badge>
        ),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            cell: (p: Project) => (
              <ActionTooltip label='Desvincular proyecto del grupo'>
                <Button variant='ghost' size='icon' onClick={() => setUnlinkingProject(p)}>
                  <Trash2 className='w-4 h-4 text-red-500' />
                </Button>
              </ActionTooltip>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center mb-4'>
        <h3 className='font-semibold text-lg'>Proyectos Asociados</h3>
        {isAdmin && (
          <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
            <DialogTrigger asChild>
              <Button size='sm'>
                <Plus className='w-4 h-4 mr-2' /> Añadir Proyecto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Proyecto</DialogTitle>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='proj_title'>Título del Proyecto</Label>
                  <Input
                    id='proj_title'
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='proj_date'>Fecha de Inicio</Label>
                  <Input
                    id='proj_date'
                    type='date'
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                  />
                </div>
                <Button
                  className='w-full'
                  disabled={!newProject.title || linkProjMutation.isPending}
                  onClick={() => linkProjMutation.mutate()}
                >
                  Guardar Proyecto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <DataTable<Project>
        columns={columns}
        data={projects}
        loading={isLoadingProjects}
        rowKey={(p: Project) => p.id!}
        emptyMessage='Este grupo no tiene proyectos asociados.'
        searchPlaceholder='Buscar por título de proyecto...'
      />

      {/* Confirmación: desvincular proyecto */}
      <ConfirmDialog
        open={unlinkingProject !== null}
        onOpenChange={(open) => !open && setUnlinkingProject(null)}
        title='¿Desvincular proyecto?'
        desc={`¿Estás seguro de que deseas desvincular el proyecto «${unlinkingProject?.title ?? ''}» de este grupo?`}
        confirmText='Desvincular'
        cancelBtnText='Cancelar'
        destructive
        isLoading={unlinkProjMutation.isPending}
        handleConfirm={() => {
          if (unlinkingProject?.id != null) {
            unlinkProjMutation.mutate(unlinkingProject.id, {
              onSettled: () => setUnlinkingProject(null),
            })
          }
        }}
      />
    </div>
  )
}
