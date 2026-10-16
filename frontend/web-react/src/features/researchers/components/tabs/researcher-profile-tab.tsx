import React from 'react'
import {
  User as UserIcon,
  BookOpen,
  GraduationCap,
  Mail,
  Fingerprint,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CatalogCombobox } from '@/components/catalog-field'
import { EDUCATION_LEVELS } from '@/lib/catalogs'
import type { Researcher } from '@/lib/types'

function Field({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className='space-y-1'>
      <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  )
}

interface ResearcherProfileTabProps {
  researcher: Researcher
  formData: Partial<Researcher>
  setFormData: React.Dispatch<React.SetStateAction<Partial<Researcher>>>
  isAdmin?: boolean
  onSubmit: (e: React.FormEvent) => void
}

export function ResearcherProfileTab({
  researcher,
  formData,
  setFormData,
  isAdmin = false,
  onSubmit,
}: ResearcherProfileTabProps) {
  const educationList = (researcher.education_records ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  if (isAdmin) {
    return (
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información Personal */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <div className='flex items-center gap-2 mb-6'>
            <div className='p-2 bg-primary/10 rounded-lg'>
              <UserIcon className='h-4 w-4 text-primary' />
            </div>
            <h3 className="font-semibold text-lg">Información Personal</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="first_names">Nombres</Label>
              <Input
                id="first_names"
                value={formData.first_names ?? ''}
                onChange={(e) => setFormData({ ...formData, first_names: e.target.value })}
                required
                className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_names">Apellidos</Label>
              <Input
                id="last_names"
                value={formData.last_names ?? ''}
                onChange={(e) => setFormData({ ...formData, last_names: e.target.value })}
                required
                className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="external_code">Código CvLAC / Identificación</Label>
              <div className='relative'>
                <Fingerprint className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  id="external_code"
                  value={formData.external_code ?? ''}
                  onChange={(e) => setFormData({ ...formData, external_code: e.target.value })}
                  required
                  className='pl-9 bg-muted/30 focus-visible:bg-transparent rounded-xl'
                />
              </div>
            </div>
          </div>
        </div>

        {/* Información Académica y Contacto */}
        <div className="space-y-6">
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className='flex items-center gap-2 mb-6'>
              <div className='p-2 bg-secondary/10 rounded-lg'>
                <GraduationCap className='h-4 w-4 text-secondary' />
              </div>
              <h3 className="font-semibold text-lg">Académico & Contacto</h3>
            </div>
            
            <div className="space-y-4">
              <CatalogCombobox
                label="Formación Máxima"
                options={EDUCATION_LEVELS}
                value={formData.highest_education_level ?? ''}
                onChange={(v) => setFormData({ ...formData, highest_education_level: v })}
                placeholder="Ej: Doctorado"
              />
              <div className="space-y-2">
                <Label htmlFor="institutional_email">Correo Institucional</Label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                    id="institutional_email"
                    type="email"
                    value={formData.institutional_email ?? ''}
                    onChange={(e) => setFormData({ ...formData, institutional_email: e.target.value })}
                    className='pl-9 bg-muted/30 focus-visible:bg-transparent rounded-xl'
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orcid">ORCID</Label>
                <Input
                  id="orcid"
                  value={formData.orcid ?? ''}
                  onChange={(e) => setFormData({ ...formData, orcid: e.target.value })}
                  placeholder="Ej: 0000-0002-1825-0097"
                  className='bg-muted/30 focus-visible:bg-transparent rounded-xl font-mono text-sm'
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Información Personal (solo lectura) */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
        <div className='flex items-center gap-2 mb-6'>
          <div className='p-2 bg-primary/10 rounded-lg'>
            <UserIcon className='h-4 w-4 text-primary' />
          </div>
          <h3 className="font-semibold text-lg">Información Personal</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label='Nombres' value={researcher.first_names} />
          <Field label='Apellidos' value={researcher.last_names} />
          <Field label='Código CvLAC' value={researcher.external_code} mono />
          <Field label='Nacionalidad' value={researcher.nationality} />
          <Field label='País de residencia' value={researcher.country_of_residence} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Académico (solo lectura) */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <div className='flex items-center gap-2 mb-6'>
            <div className='p-2 bg-secondary/10 rounded-lg'>
              <GraduationCap className='h-4 w-4 text-secondary' />
            </div>
            <h3 className="font-semibold text-lg">Académico</h3>
          </div>
          <div className="space-y-4">
            <Field label='Formación Máxima' value={researcher.highest_education_level} />
            {researcher.orcid && (
              <div className='space-y-1'>
                <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>ORCID</p>
                <a
                  href={`https://orcid.org/${researcher.orcid}`}
                  target='_blank'
                  rel='noreferrer'
                  className='text-sm font-mono text-primary hover:underline'
                >
                  {researcher.orcid}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Formación detallada (registros CvLAC separados por ";") */}
        {educationList.length > 0 && (
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className='flex items-center gap-2 mb-4'>
              <div className='p-2 bg-violet-500/10 rounded-lg'>
                <BookOpen className='h-4 w-4 text-violet-500' />
              </div>
              <h3 className="font-semibold text-lg">Formación Académica</h3>
            </div>
            <ul className='list-disc pl-5 space-y-1 text-sm text-muted-foreground'>
              {educationList.map((entry, i) => (
                <li key={i}>{entry}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
