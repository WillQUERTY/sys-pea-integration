import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createGroup, updateGroup } from '@/lib/api'
import type { Group } from '@/lib/types'
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

// Entidad completa del grupo (leader_id se gestiona desde los integrantes).
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
  }
}

export function GroupFormDialog({ open, onOpenChange, group }: Props) {
  const queryClient = useQueryClient()
  const isEditing = !!group

  const [formData, setFormData] = useState<Partial<Group>>(EMPTY)

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
              <div className='grid gap-2'>
                <Label htmlFor='classification'>Clasificación</Label>
                <Input
                  id='classification'
                  value={formData.classification ?? ''}
                  onChange={(e) => set({ classification: e.target.value })}
                  placeholder='Ej: A1, A, B, C'
                />
              </div>
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
              <div className='grid gap-2'>
                <Label htmlFor='department'>Departamento</Label>
                <Input
                  id='department'
                  value={formData.department ?? ''}
                  onChange={(e) => set({ department: e.target.value })}
                />
              </div>
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
                  value={formData.declared_creation_date ?? ''}
                  onChange={(e) => set({ declared_creation_date: e.target.value })}
                  placeholder='Ej: 2010-03'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='knowledge_area'>Área de Conocimiento</Label>
                <Input
                  id='knowledge_area'
                  value={formData.knowledge_area ?? ''}
                  onChange={(e) => set({ knowledge_area: e.target.value })}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='knowledge_subarea'>Subárea</Label>
                <Input
                  id='knowledge_subarea'
                  value={formData.knowledge_subarea ?? ''}
                  onChange={(e) => set({ knowledge_subarea: e.target.value })}
                />
              </div>
            </div>

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
