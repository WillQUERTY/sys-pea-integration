import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createGroup, updateGroup } from '@/lib/api'
import type { Group } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export function GroupFormDialog({ open, onOpenChange, group }: Props) {
  const queryClient = useQueryClient()
  const isEditing = !!group

  const [formData, setFormData] = useState<Partial<Group>>({
    name: '',
    acronym: '',
    external_code: '',
    institution: '',
    classification: '',
    city: '',
    department: '',
  })

  // Sync state when editing
  useEffect(() => {
    if (group && open) {
      setFormData({
        name: group.name,
        acronym: group.acronym ?? '',
        external_code: group.external_code,
        institution: group.institution ?? '',
        classification: group.classification ?? '',
        city: group.city ?? '',
        department: group.department ?? '',
      })
    } else if (open) {
      setFormData({
        name: '',
        acronym: '',
        external_code: '',
        institution: '',
        classification: '',
        city: '',
        department: '',
      })
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
      <DialogContent className='sm:max-w-[425px]'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Grupo' : 'Nuevo Grupo'}</DialogTitle>
            <DialogDescription>
              Completa los datos básicos del grupo de investigación.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='name'>Nombre del Grupo *</Label>
              <Input
                id='name'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='external_code'>Código *</Label>
                <Input
                  id='external_code'
                  value={formData.external_code}
                  onChange={(e) => setFormData({ ...formData, external_code: e.target.value })}
                  placeholder='Ej: COL0000000'
                  required
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='acronym'>Sigla</Label>
                <Input
                  id='acronym'
                  value={formData.acronym || ''}
                  onChange={(e) => setFormData({ ...formData, acronym: e.target.value })}
                />
              </div>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='institution'>Institución</Label>
              <Input
                id='institution'
                value={formData.institution || ''}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='classification'>Clasificación</Label>
              <Input
                id='classification'
                value={formData.classification || ''}
                onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                placeholder='Ej: A, B, C'
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
