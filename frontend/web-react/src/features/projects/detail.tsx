import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Lightbulb,
  Pencil,
  ClipboardList,
  UserRound,
  FileText,
  Users,
} from 'lucide-react'

import { getProject, getResearcher, getProjectGroups } from '@/lib/api'

import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ActionTooltip } from '@/components/action-tooltip'

import { ProjectFormDialog } from '@/features/projects/project-form-dialog'

function Field({ label, value, mono = false }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div className='space-y-1'>
      <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  )
}

// Formato de presupuesto: 2.500.000
function fmtBudget(b?: number | null) {
  if (b == null || b === 0) return '—'
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(b)
}

export function ProjectDetail({ isAdmin = false }: { isAdmin?: boolean }) {
  const { id } = useParams({ strict: false }) as { id: string }
  const projectId = Number(id)

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => getProject(projectId),
  })

  // Investigador principal: se resuelve por id solo cuando existe
  const piId = project?.principal_investigator_id ?? null
  const { data: pi, isLoading: isLoadingPi } = useQuery({
    queryKey: ['researcher', piId],
    queryFn: () => getResearcher(piId!),
    enabled: piId != null,
  })

  // Grupos vinculados al proyecto (lookup inverso de la multilista)
  const { data: linkedGroups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['projects', projectId, 'groups'],
    queryFn: () => getProjectGroups(projectId),
  })

  // Estado del diálogo "Editar ficha" (reusa el modal de la tabla admin)
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return (
      <>
        <Header>
          {isAdmin && (
            <div className='ms-auto flex items-center space-x-4'>
              <ThemeSwitch />
              <ConfigDrawer />
              <ProfileDropdown />
            </div>
          )}
        </Header>
        <Main className={!isAdmin ? 'max-w-5xl mx-auto p-0 sm:p-6 w-full' : undefined}>
          <div className='space-y-6'>
            <Skeleton className='h-32 w-full rounded-xl' />
            <Skeleton className='h-[300px] w-full rounded-xl' />
          </div>
        </Main>
      </>
    )
  }

  if (!project) {
    return (
      <Main className={!isAdmin ? 'max-w-5xl mx-auto p-0 sm:p-6 w-full' : undefined}>
        <div className='py-20 text-center'>
          <h2 className='text-2xl font-bold'>Proyecto no encontrado</h2>
          <Button asChild className='mt-4'>
            <Link to={isAdmin ? '/admin/projects' : '/projects'}>Volver a Proyectos</Link>
          </Button>
        </div>
      </Main>
    )
  }

  const period = [project.start_date, project.end_date].filter(Boolean).join(' – ')

  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          <ActionTooltip label='Volver a proyectos'>
            <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
              <Link to={isAdmin ? '/admin/projects' : '/projects'}>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
          </ActionTooltip>
          <h1 className='text-sm font-medium'>Ficha del Proyecto</h1>
        </div>
        {isAdmin && (
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        )}
      </Header>

      <Main className={!isAdmin ? 'max-w-5xl mx-auto p-0 sm:p-6 w-full' : undefined}>
        {/* Encabezado */}
        <div className='mb-6 rounded-2xl border border-border/50 bg-card p-6 shadow-sm'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div className='flex items-start gap-4'>
              <div className='rounded-xl bg-amber-500/10 p-3'>
                <Lightbulb className='h-6 w-6 text-amber-500' />
              </div>
              <div>
                <h1 className='text-xl font-bold leading-snug'>{project.title}</h1>
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  {project.status && <Badge variant='outline'>{project.status}</Badge>}
                  {project.project_type && <Badge variant='secondary'>{project.project_type}</Badge>}
                  {period && (
                    <Badge variant='outline' className='font-normal text-muted-foreground'>
                      {period}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className='flex shrink-0 flex-wrap gap-2'>
                <Button size='sm' variant='outline' onClick={() => setEditOpen(true)}>
                  <Pencil className='mr-2 h-4 w-4' /> Editar ficha
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          {/* Detalles */}
          <div className='rounded-2xl border border-border/50 bg-card p-6 shadow-sm'>
            <div className='mb-5 flex items-center gap-2'>
              <div className='rounded-lg bg-blue-500/10 p-2'>
                <ClipboardList className='h-4 w-4 text-blue-500' />
              </div>
              <h3 className='text-lg font-semibold'>Detalles</h3>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <Field label='Tipo de proyecto' value={project.project_type} />
              <Field label='Estado' value={project.status} />
              <Field label='Tipo de financiación' value={project.funding_type} />
              <Field label='Presupuesto' value={fmtBudget(project.budget)} mono />
              <Field label='Fecha de inicio' value={project.start_date} />
              <Field label='Fecha de fin' value={project.end_date} />
            </div>
          </div>

          {/* Investigador principal */}
          <div className='rounded-2xl border border-border/50 bg-card p-6 shadow-sm'>
            <div className='mb-5 flex items-center gap-2'>
              <div className='rounded-lg bg-cyan-500/10 p-2'>
                <UserRound className='h-4 w-4 text-cyan-500' />
              </div>
              <h3 className='text-lg font-semibold'>Investigador Principal</h3>
            </div>
            {piId == null ? (
              <p className='text-sm text-muted-foreground'>Sin investigador principal asignado.</p>
            ) : isLoadingPi ? (
              <Skeleton className='h-6 w-48' />
            ) : pi ? (
              <div className='space-y-1'>
                <Link
                  to={isAdmin ? '/admin/researchers/$id' : '/researchers/$id'}
                  params={{ id: String(pi.id) }}
                  className='text-sm font-medium text-primary hover:underline'
                >
                  {pi.first_names} {pi.last_names}
                </Link>
                <p className='font-mono text-xs text-muted-foreground'>{pi.external_code}</p>
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>Investigador no disponible.</p>
            )}
          </div>

          {/* Grupos vinculados */}
          <div className='rounded-2xl border border-border/50 bg-card p-6 shadow-sm lg:col-span-2'>
            <div className='mb-5 flex items-center gap-2'>
              <div className='rounded-lg bg-emerald-500/10 p-2'>
                <Users className='h-4 w-4 text-emerald-500' />
              </div>
              <h3 className='text-lg font-semibold'>Grupos Vinculados</h3>
            </div>
            {isLoadingGroups ? (
              <Skeleton className='h-6 w-64' />
            ) : (linkedGroups ?? []).length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                Este proyecto no está vinculado a ningún grupo.
              </p>
            ) : (
              <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {linkedGroups!.map((g) => (
                  <li key={g.id}>
                    <Link
                      to={isAdmin ? '/admin/groups/$id' : '/groups/$id'}
                      params={{ id: String(g.id) }}
                      className='flex items-center gap-3 rounded-xl border border-border/50 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40'
                    >
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-medium text-primary hover:underline'>{g.name}</p>
                        {g.acronym && (
                          <p className='font-mono text-xs text-muted-foreground'>[{g.acronym}]</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Resumen */}
          <div className='rounded-2xl border border-border/50 bg-card p-6 shadow-sm lg:col-span-2'>
            <div className='mb-5 flex items-center gap-2'>
              <div className='rounded-lg bg-violet-500/10 p-2'>
                <FileText className='h-4 w-4 text-violet-500' />
              </div>
              <h3 className='text-lg font-semibold'>Resumen</h3>
            </div>
            <p className='whitespace-pre-wrap text-sm text-muted-foreground'>
              {project.summary || 'Sin resumen registrado.'}
            </p>
          </div>
        </div>

        {/* Diálogo: editar ficha (mismo modal de la tabla admin) */}
        <ProjectFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          project={project}
        />
      </Main>
    </>
  )
}
