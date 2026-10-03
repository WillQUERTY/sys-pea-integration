import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createGroup, updateGroup, getGroupMembers } from '@/lib/api'
import type { Group } from '@/lib/types'
import { GROUP_CLASSIFICATIONS, GRAND_AREAS_OCDE, DEPARTMENTS } from '@/lib/catalogs'
import { CatalogSelect, CatalogCombobox } from '@/components/catalog-field'
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
  group?: Group | null
}

// Entidad completa del grupo; el líder se elige entre los integrantes vinculados.
const EMPTY: Partial<Group> = {
  name: '',
  external_code: '',
  acronym: '',
  institution: '',
  classification: '',
  city: '',
  department: '',
  email: '',
  website: '',
  declared_creation_date: '',
  knowledge_area: '',
  knowledge_subarea: '',
  description: '',
  mission: '',
  vision: '',
  leader_id: undefined,
}

function fromGroup(g: Group): Partial<Group> {
  return {
    name: g.name,
    external_code: g.external_code,
    acronym: g.acronym ?? '',
    institution: g.institution ?? '',
    classification: g.classification ?? '',
    city: g.city ?? '',
    department: g.department ?? '',
    email: g.email ?? '',
    website: g.website ?? '',
    declared_creation_date: g.declared_creation_date ?? '',
    knowledge_area: g.knowledge_area ?? '',
    knowledge_subarea: g.knowledge_subarea ?? '',
    description: g.description ?? '',
    mission: g.mission ?? '',
    vision: g.vision ?? '',
    leader_id: g.leader_id ?? undefined,
  }
}

export function GroupFormDialog({ open, onOpenChange, group }: Props) {
  const queryClient = useQueryClient()
  const isEditing = !!group

  const [formData, setFormData] = useState<Partial<Group>>(EMPTY)
  const [leaderSearch, setLeaderSearch] = useState('')

  // El líder debe ser un integrante del grupo: se lista desde la multilista.
  const { data: members } = useQuery({
    queryKey: ['groups', group?.id, 'members'],
    queryFn: () => getGroupMembers(group!.id!),
    enabled: open && !!group?.id,
  })
  const filteredMembers = (members ?? []).filter((r) =>
    `${r.first_names} ${r.last_names}`.toLowerCase().includes(leaderSearch.toLowerCase())
  )
  const selectedLeader = (members ?? []).find((r) => r.id === formData.leader_id)

  // Sync state when editing
  useEffect(() => {
    if (group && open) {
      setFormData(fromGroup(group))
    } else if (open) {
      setFormData(EMPTY)
    }
  }, [group, open])

  const mutation = useMutation({
    mutationFn: (data: Partial<Group>) =>
      isEditing ? updateGroup(group.id!, data) : createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
      toast.success(isEditing ? 'Grupo actualizado' : 'Grupo creado')
      onOpenChange(false)
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Error al guardar el grupo')
    },
  })

  const set = (patch: Partial<Group>) => setFormData({ ...formData, ...patch })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.external_code) {
      toast.error('Nombre y Código son obligatorios')
      return
    }
    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Grupo' : 'Nuevo Grupo'}</DialogTitle>
            <DialogDescription>
              Ficha completa del grupo de investigación.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='name'>Nombre del Grupo *</Label>
              <Input
                id='name'
                value={formData.name ?? ''}
                onChange={(e) => set({ name: e.target.value })}
                required
              />
            </div>

            <div className='grid grid-cols-3 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='external_code'>Código GrupLAC *</Label>
                <Input
                  id='external_code'
                  value={formData.external_code ?? ''}
                  onChange={(e) => set({ external_code: e.target.value })}
                  placeholder='Ej: COL0000000'
                  required
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='acronym'>Sigla</Label>
                <Input
                  id='acronym'
                  value={formData.acronym ?? ''}
                  onChange={(e) => set({ acronym: e.target.value })}
                />
              </div>
              <CatalogSelect
                label='Clasificación'
                options={GROUP_CLASSIFICATIONS}
                value={formData.classification ?? ''}
                onChange={(v) => set({ classification: v })}
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='institution'>Institución</Label>
              <Input
                id='institution'
                value={formData.institution ?? ''}
                onChange={(e) => set({ institution: e.target.value })}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='city'>Ciudad</Label>
                <Input
                  id='city'
                  value={formData.city ?? ''}
                  onChange={(e) => set({ city: e.target.value })}
                />
              </div>
              <CatalogCombobox
                label='Departamento'
                options={DEPARTMENTS}
                value={formData.department ?? ''}
                onChange={(v) => set({ department: v })}
                placeholder='Ej: Cesar'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='email'>Correo</Label>
                <Input
                  id='email'
                  type='email'
                  value={formData.email ?? ''}
                  onChange={(e) => set({ email: e.target.value })}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='website'>Página Web</Label>
                <Input
                  id='website'
                  value={formData.website ?? ''}
                  onChange={(e) => set({ website: e.target.value })}
                  placeholder='https://...'
                />
              </div>
            </div>

            <div className='grid grid-cols-3 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='declared_creation_date'>Año/Mes de Formación</Label>
                <Input
                  id='declared_creation_date'
                  type='month'
                  value={formData.declared_creation_date ?? ''}
                  onChange={(e) => set({ declared_creation_date: e.target.value })}
                />
              </div>
              <CatalogCombobox
                label='Área de Conocimiento (OCDE)'
                options={GRAND_AREAS_OCDE}
                value={formData.knowledge_area ?? ''}
                onChange={(v) => set({ knowledge_area: v })}
                placeholder='Ej: Ingeniería y Tecnología'
              />
              <div className='grid gap-2'>
                <Label htmlFor='knowledge_subarea'>Subárea</Label>
                <Input
                  id='knowledge_subarea'
                  value={formData.knowledge_subarea ?? ''}
                  onChange={(e) => set({ knowledge_subarea: e.target.value })}
                />
              </div>
            </div>

            {isEditing && (
              <div className='grid gap-2'>
                <Label>Líder del Grupo</Label>
                {selectedLeader ? (
                  <div className='flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm'>
                    <span className='font-medium'>
                      {selectedLeader.first_names} {selectedLeader.last_names}
                    </span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => set({ leader_id: undefined })}
                    >
                      Quitar
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={leaderSearch}
                      onChange={(e) => setLeaderSearch(e.target.value)}
                      placeholder='Buscar entre los integrantes...'
                    />
                    <div className='max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border/50 p-1'>
                      {filteredMembers.length === 0 ? (
                        <p className='p-2 text-sm text-muted-foreground'>
                          {(members ?? []).length === 0
                            ? 'El grupo aún no tiene integrantes.'
                            : 'Sin resultados.'}
                        </p>
                      ) : (
                        <>
                          {filteredMembers.slice(0, 8).map((r) => (
                            <button
                              key={r.id}
                              type='button'
                              onClick={() => { set({ leader_id: r.id }); setLeaderSearch('') }}
                              className='w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60'
                            >
                              {r.first_names} {r.last_names}
                            </button>
                          ))}
                          {filteredMembers.length > 8 && (
                            <p className='px-3 py-1.5 text-center text-xs italic text-muted-foreground'>
                              … y {filteredMembers.length - 8} más coincidencias (escribe para filtrar)
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className='grid gap-2'>
              <Label htmlFor='description'>Descripción</Label>
              <Textarea
                id='description'
                value={formData.description ?? ''}
                onChange={(e) => set({ description: e.target.value })}
                rows={2}
                className='resize-none'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='mission'>Misión</Label>
                <Textarea
                  id='mission'
                  value={formData.mission ?? ''}
                  onChange={(e) => set({ mission: e.target.value })}
                  rows={3}
                  className='resize-none'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='vision'>Visión</Label>
                <Textarea
                  id='vision'
                  value={formData.vision ?? ''}
                  onChange={(e) => set({ vision: e.target.value })}
                  rows={3}
                  className='resize-none'
                />
              </div>
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
