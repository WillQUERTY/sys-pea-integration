import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createResearcher, updateResearcher } from '@/lib/api'
import type { Researcher } from '@/lib/types'
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
  researcher?: Researcher | null
}

export function ResearcherFormDialog({ open, onOpenChange, researcher }: Props) {
  const queryClient = useQueryClient()
  const isEditing = !!researcher

  const [formData, setFormData] = useState<Partial<Researcher>>({
    first_names: '',
    last_names: '',
    external_code: '',
    highest_education_level: '',
    institutional_email: '',
    orcid: '',
  })

  // Sync state when editing
  useEffect(() => {
    if (researcher && open) {
      setFormData({
        first_names: researcher.first_names,
        last_names: researcher.last_names,
        external_code: researcher.external_code,
        highest_education_level: researcher.highest_education_level ?? '',
        institutional_email: researcher.institutional_email ?? '',
        orcid: researcher.orcid ?? '',
      })
    } else if (open) {
      setFormData({
        first_names: '',
        last_names: '',
        external_code: '',
        highest_education_level: '',
        institutional_email: '',
        orcid: '',
      })
    }
  }, [researcher, open])

  const mutation = useMutation({
    mutationFn: (data: Partial<Researcher>) =>
      isEditing ? updateResearcher(researcher.id!, data) : createResearcher(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
      queryClient.invalidateQueries({ queryKey: ['undo-stack'] })
      toast.success(isEditing ? 'Investigador actualizado' : 'Investigador creado')
      onOpenChange(false)
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Error al guardar el investigador')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.first_names || !formData.last_names || !formData.external_code) {
      toast.error('Nombres, Apellidos y Código RH son obligatorios')
      return
    }
    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Investigador' : 'Nuevo Investigador'}</DialogTitle>
            <DialogDescription>
              Completa los datos personales y académicos.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='first_names'>Nombres *</Label>
                <Input
                  id='first_names'
                  value={formData.first_names}
                  onChange={(e) => setFormData({ ...formData, first_names: e.target.value })}
                  required
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='last_names'>Apellidos *</Label>
                <Input
                  id='last_names'
                  value={formData.last_names}
                  onChange={(e) => setFormData({ ...formData, last_names: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='external_code'>Código RH *</Label>
                <Input
                  id='external_code'
                  value={formData.external_code}
                  onChange={(e) => setFormData({ ...formData, external_code: e.target.value })}
                  placeholder='Ej: 0000000001'
                  required
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='orcid'>ORCID</Label>
                <Input
                  id='orcid'
                  value={formData.orcid || ''}
                  onChange={(e) => setFormData({ ...formData, orcid: e.target.value })}
                  placeholder='0000-0000-0000-0000'
                />
              </div>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='highest_education_level'>Formación Máxima</Label>
              <Input
                id='highest_education_level'
                value={formData.highest_education_level || ''}
                onChange={(e) => setFormData({ ...formData, highest_education_level: e.target.value })}
                placeholder='Ej: Doctorado en...'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='institutional_email'>Correo Institucional</Label>
              <Input
                id='institutional_email'
                type='email'
                value={formData.institutional_email || ''}
                onChange={(e) => setFormData({ ...formData, institutional_email: e.target.value })}
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
