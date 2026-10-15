import React from 'react'
import { Users as GroupIcon, Trophy } from 'lucide-react'
import type { Group } from '@/lib/types'
import { cn } from '@/lib/utils'
import { GRAND_AREAS_OCDE, DEPARTMENTS, citiesOfDepartment } from '@/lib/catalogs'
import { CatalogCombobox } from '@/components/catalog-field'
import { MonthPicker } from '@/components/month-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

function Field({
  label,
  value,
  mono = false,
  className = '',
}: {
  label: string
  value?: React.ReactNode
  mono?: boolean
  className?: string
}) {
  if (!value) return null
  return (
    <div className={cn('flex flex-col gap-1.5 min-w-0', className)}>
      <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>{label}</span>
      <span className={`text-sm text-foreground leading-relaxed break-words ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

interface GroupProfileTabProps {
  group: Group
  formData: Partial<Group>
  setFormData: React.Dispatch<React.SetStateAction<Partial<Group>>>
  isAdmin?: boolean
  onSubmit: (e: React.FormEvent) => void
}

export function GroupProfileTab({
  group,
  formData,
  setFormData,
  isAdmin = false,
  onSubmit,
}: GroupProfileTabProps) {
  if (isAdmin) {
    return (
      <form onSubmit={onSubmit} className="grid min-w-0 grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Información Básica */}
        <div className="min-w-0 space-y-6">
          <div className="min-w-0 bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className='flex items-center gap-2 mb-6'>
              <div className='p-2 bg-blue-500/10 rounded-lg'>
                <GroupIcon className='h-4 w-4 text-blue-500' />
              </div>
              <h3 className="font-semibold text-lg">Información Básica</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Grupo</Label>
                <Input
                  id="name"
                  value={formData.name ?? ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                />
              </div>
              <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="acronym">Sigla</Label>
                  <Input
                    id="acronym"
                    value={formData.acronym ?? ''}
                    onChange={(e) => setFormData({ ...formData, acronym: e.target.value })}
                    className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="external_code">Código GrupLAC</Label>
                  <Input
                    id="external_code"
                    value={formData.external_code ?? ''}
                    onChange={(e) => setFormData({ ...formData, external_code: e.target.value })}
                    required
                    className='bg-muted/30 focus-visible:bg-transparent rounded-xl font-mono text-sm'
                  />
                </div>
              </div>
              {/* Institución & Año/Mes de Formación */}
              <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="institution">Institución</Label>
                  <Input
                    id="institution"
                    value={formData.institution ?? ''}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="declared_creation_date">Año / Mes de Formación</Label>
                  <MonthPicker
                    id="declared_creation_date"
                    value={formData.declared_creation_date ?? ''}
                    onChange={(v) => setFormData({ ...formData, declared_creation_date: v })}
                    placeholder='Mes y año...'
                  />
                </div>
              </div>

              {/* Departamento & Ciudad */}
              <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <CatalogCombobox
                    label="Departamento"
                    options={DEPARTMENTS}
                    value={formData.department ?? ''}
                    onChange={(v) => setFormData({ ...formData, department: v })}
                    placeholder='Seleccionar departamento...'
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <CatalogCombobox
                    label="Ciudad / Municipio"
                    options={citiesOfDepartment(formData.department ?? '')}
                    value={formData.city ?? ''}
                    onChange={(v) => setFormData({ ...formData, city: v })}
                    placeholder={formData.department ? 'Seleccionar ciudad...' : 'Ciudad (elige depto primero)'}
                    emptyMessage='Elige un departamento para ver sus municipios, o escribe la ciudad libre.'
                  />
                </div>
              </div>

              {/* Email & Página Web */}
              <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email ?? ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="website">Página Web</Label>
                  <Input
                    id="website"
                    value={formData.website ?? ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                  />
                </div>
              </div>

              {/* Área de Conocimiento (OCDE) */}
              <div className="space-y-2 min-w-0">
                <CatalogCombobox
                  label="Área de Conocimiento (OCDE)"
                  options={GRAND_AREAS_OCDE}
                  value={formData.knowledge_area ?? ''}
                  onChange={(v) => setFormData({ ...formData, knowledge_area: v })}
                  placeholder='Ej: Ingeniería y Tecnología'
                />
              </div>
            </div>
          </div>
        </div>

        {/* Misión y Visión */}
        <div className="min-w-0 bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <div className='flex items-center gap-2 mb-6'>
            <div className='p-2 bg-purple-500/10 rounded-lg'>
              <Trophy className='h-4 w-4 text-purple-500' />
            </div>
            <h3 className="font-semibold text-lg">Misión y Visión</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mission">Misión</Label>
              <Textarea
                id="mission"
                value={formData.mission ?? ''}
                onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                rows={4}
                className='bg-muted/30 focus-visible:bg-transparent rounded-xl resize-none'
                placeholder="Misión del grupo..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vision">Visión</Label>
              <Textarea
                id="vision"
                value={formData.vision ?? ''}
                onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                rows={4}
                className='bg-muted/30 focus-visible:bg-transparent rounded-xl resize-none'
                placeholder="Visión del grupo..."
              />
            </div>
          </div>
        </div>
      </form>
    )
  }

  return (
    <div className="grid min-w-0 grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="min-w-0 space-y-6">
        <div className="min-w-0 bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
          <div className='flex items-center gap-2 mb-2'>
            <div className='p-2 bg-blue-500/10 rounded-lg'>
              <GroupIcon className='h-4 w-4 text-blue-500' />
            </div>
            <h3 className="font-semibold text-lg">Información Básica</h3>
          </div>
          <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Nombre del Grupo" value={group.name} className="col-span-1 sm:col-span-2" />
            <Field label="Sigla" value={group.acronym} />
            <Field label="Código GrupLAC" value={group.external_code} mono />
            <Field label="Institución" value={group.institution} />
            <Field label="Ciudad / Depto" value={[group.city, group.department].filter(Boolean).join(' / ')} />
            <Field label="Email" value={group.email} />
            <Field label="Página Web" value={group.website} />
            <Field label="Año / Mes de Formación" value={group.declared_creation_date} />
            <Field label="Área de Conocimiento" value={group.knowledge_area} className="col-span-1 sm:col-span-2" />
          </div>
        </div>
      </div>

      <div className="min-w-0 bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
        <div className='flex items-center gap-2 mb-2'>
          <div className='p-2 bg-purple-500/10 rounded-lg'>
            <Trophy className='h-4 w-4 text-purple-500' />
          </div>
          <h3 className="font-semibold text-lg">Misión y Visión</h3>
        </div>
        <div className="space-y-6">
          <Field label="Misión" value={group.mission} />
          <Field label="Visión" value={group.vision} />
        </div>
      </div>
    </div>
  )
}
