import { Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResearcherAvatar } from '@/components/researcher-avatar'
import type { Researcher } from '@/lib/types'

interface ResearcherProfileHeaderProps {
  researcher: Researcher
  isAdmin?: boolean
  onSave?: () => void
  isSaving?: boolean
}

export function ResearcherProfileHeader({
  researcher,
  isAdmin = false,
  onSave,
  isSaving = false,
}: ResearcherProfileHeaderProps) {
  return (
    <div className='relative mb-8 rounded-b-none sm:rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm'>
      <div className='h-32 bg-gradient-to-r from-primary/15 via-background to-secondary/15 relative'>
        <div className='absolute inset-0 bg-radial from-transparent to-card/50' />
      </div>

      <div className='px-6 pb-6 pt-0 relative'>
        <div className='flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12'>
          <ResearcherAvatar
            firstName={researcher.first_names}
            lastName={researcher.last_names}
            size='xl'
            shape='rounded'
            className='border-4 border-card shadow-lg shrink-0'
          />

          <div className='flex-1 pb-1'>
            <h1 className='text-2xl font-bold'>
              {researcher.first_names} {researcher.last_names}
            </h1>
            <div className='flex flex-wrap gap-2 mt-2'>
              {researcher.classification_records && (
                <Badge
                  variant='outline'
                  className='text-xs font-semibold border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 max-w-64 truncate'
                >
                  {researcher.classification_records}
                </Badge>
              )}
              {researcher.highest_education_level && (
                <Badge
                  variant='outline'
                  className='text-xs font-normal border-primary/30 bg-primary/5 text-primary'
                >
                  {researcher.highest_education_level}
                </Badge>
              )}
              <Badge variant='outline' className='text-xs font-normal text-muted-foreground'>
                {researcher.external_code}
              </Badge>
            </div>
          </div>

          {isAdmin && (
            <div className='pb-1 w-full sm:w-auto'>
              <Button
                onClick={onSave}
                disabled={isSaving}
                className='w-full sm:w-auto rounded-xl shadow-md'
              >
                <Save className='mr-2 h-4 w-4' />
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
