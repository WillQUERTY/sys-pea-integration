import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createProject, updateProject, listResearchers } from '@/lib/api'
import type { Project } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
}

// Ficha completa del proyecto. El backend fusiona None con el estado previo,
// asi que "quitar investigador principal" se envia como 0 explicito.
const EMPTY: Partial<Project> = {
  title: '',
  summary: '',
  project_type: '',
  start_date: '',
  end_date: '',
  funding_type: '',
  budget: undefined,
  principal_investigator_id: undefined,
}

function fromProject(p: Project): Partial<Project> {
  return {
    title: p.title,
    summary: p.summary ?? '',
    project_type: p.project_type ?? '',
    start_date: p.start_date ?? '',
    end_date: p.end_date ?? '',
    funding_type: p.funding_type ?? '',
    budget: p.budget ?? undefined,
    principal_investigator_id: p.principal_investigator_id ?? undefined,
  }
}

// Selector con búsqueda sobre los investigadores (investigador principal).
function ResearcherPicker({
  value,
  onChange,
}: {
  value?: number
  onChange: (id: number | undefined) => void
}) {
  const [search, setSearch] = useState('')
  const { data } = useQuery({
    queryKey: ['researchers', 'for-project-form'],
    queryFn: () => listResearchers({ limit: 1000 }),
  })
  const options = useMemo(
    () =>
      (data?.items ?? []).map((r) => ({
        id: r.id!,
        name: `${r.first_names} ${r.last_names}`,
      })),
    [data]
  )
  const selected = options.find((o) => o.id === value)
  const filtered = options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className='grid gap-2'>
      <Label>Investigador principal</Label>
      {selected ? (
        <div className='flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm'>
          <span className='truncate font-medium'>{selected.name}</span>
          <Button type='button' variant='ghost' size='sm' onClick={() => onChange(undefined)}>
            Quitar
          </Button>
        </div>
      ) : (
        <>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Buscar investigador...'
          />
          {search && (
            <div className='max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border/50 p-1'>
              {filtered.length === 0 ? (
                <p className='p-2 text-sm text-muted-foreground'>Sin resultados.</p>
              ) : (
                <>
                  {filtered.slice(0, 8).map((o) => (
                    <button
                      key={o.id}
                      type='button'
                      onClick={() => { onChange(o.id); setSearch('') }}
                      className='w-full truncate rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60'
                    >
                      {o.name}
                    </button>
                  ))}
                  {filtered.length > 8 && (
                    <p className='px-3 py-1.5 text-center text-xs italic text-muted-foreground'>
                      … y {filtered.length - 8} más coincidencias (escribe para filtrar)
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function ProjectFormDialog({ open, onOpenChange, project }: Props) {
  const queryClient = useQueryClient()
  const isEditing = !!project

  const [formData, setFormData] = useState<Partial<Project>>(EMPTY)

  // Sync state when editing
  useEffect(() => {
    if (project && open) {
      setFormData(fromProject(project))
    } else if (open) {
      setFormData(EMPTY)
    }
  }, [project, open])

  const mutation = useMutation({
    mutationFn: (data: Partial<Project>) =>
      isEditing ? updateProject(project.id!, data) : createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
      toast.success(isEditing ? 'Proyecto actualizado' : 'Proyecto creado')
      onOpenChange(false)
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Error al guardar el proyecto')
    },
  })

  const set = (patch: Partial<Project>) => setFormData({ ...formData, ...patch })
  const numOrUndefined = (v: string) => (v ? Number(v) : undefined)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title) {
      toast.error('El título es obligatorio')
      return
    }
    mutation.mutate({
      ...formData,
      // 0 explicito = sin investigador principal (None conservaría el actual)
      principal_investigator_id: formData.principal_investigator_id ?? 0,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
            <DialogDescription>
              Ficha del proyecto de investigación.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='title'>Título del Proyecto *</Label>
              <Input
                id='title'
                value={formData.title ?? ''}
                onChange={(e) => set({ title: e.target.value })}
                required
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='summary'>Resumen</Label>
              <Textarea
                id='summary'
                value={formData.summary ?? ''}
                onChange={(e) => set({ summary: e.target.value })}
                rows={3}
                className='resize-none'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='project_type'>Tipo de proyecto</Label>
                <Input
                  id='project_type'
                  value={formData.project_type ?? ''}
                  onChange={(e) => set({ project_type: e.target.value })}
                  placeholder='Ej: Investigación y desarrollo'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='funding_type'>Tipo de financiación</Label>
                <Input
                  id='funding_type'
                  value={formData.funding_type ?? ''}
                  onChange={(e) => set({ funding_type: e.target.value })}
                  placeholder='Ej: Interna'
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='start_date'>Fecha de inicio</Label>
                <Input
                  id='start_date'
                  value={formData.start_date ?? ''}
                  onChange={(e) => set({ start_date: e.target.value })}
                  placeholder='Ej: 2026-01'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='end_date'>Fecha de fin</Label>
                <Input
                  id='end_date'
                  value={formData.end_date ?? ''}
                  onChange={(e) => set({ end_date: e.target.value })}
                  placeholder='Ej: 2026-12'
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='budget'>Presupuesto</Label>
                <Input
                  id='budget'
                  type='number'
                  min={0}
                  value={formData.budget ?? ''}
                  onChange={(e) => set({ budget: numOrUndefined(e.target.value) })}
                  placeholder='0'
                />
              </div>
              <ResearcherPicker
                value={formData.principal_investigator_id ?? undefined}
                onChange={(id) => set({ principal_investigator_id: id })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
