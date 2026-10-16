import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Users, UserPlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EntityCombobox, type EntityItem } from '@/components/entity-combobox'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ActionTooltip } from '@/components/action-tooltip'
import { ResearcherAvatar } from '@/components/researcher-avatar'
import {
  getProductAuthors,
  addProductAuthor,
  removeProductAuthor,
  listResearchers,
  type ProductAuthor,
} from '@/lib/api'

interface ProductAuthorsCardProps {
  productId: number
  authors?: ProductAuthor[]
  isAdmin?: boolean
}

export function ProductAuthorsCard({
  productId,
  authors: propsAuthors,
  isAdmin = false,
}: ProductAuthorsCardProps) {
  const queryClient = useQueryClient()

  const { data: fetchedAuthors } = useQuery({
    queryKey: ['products', productId, 'authors'],
    queryFn: () => getProductAuthors(productId),
    enabled: !propsAuthors,
  })

  const authors = propsAuthors ?? fetchedAuthors ?? []

  // Diálogo "Vincular Autor"
  const [authorOpen, setAuthorOpen] = useState(false)
  const [authorSearch, setAuthorSearch] = useState('')
  const [selectedResearcherId, setSelectedResearcherId] = useState<number | null>(null)
  const [authorOrder, setAuthorOrder] = useState('1')
  const [extName, setExtName] = useState('')
  const [extIdentifier, setExtIdentifier] = useState('')

  // Confirmación desvincular autor
  const [unlinkingAuthor, setUnlinkingAuthor] = useState<{
    researcher_id?: number | null
    external_author_name?: string | null
    name: string
  } | null>(null)

  const { data: pickerResults } = useQuery({
    queryKey: ['researchers', 'picker', authorSearch],
    queryFn: () => listResearchers({ search: authorSearch, limit: 8 }),
    enabled: authorOpen,
  })

  const linkableResearchers = (pickerResults?.items ?? []).filter(
    (r) => !(authors ?? []).some((a) => a.researcher_id === r.id)
  )

  const researcherItems = useMemo<EntityItem[]>(() => {
    return linkableResearchers.map((r) => ({
      id: r.id!,
      label: `${r.first_names} ${r.last_names}`,
      subLabel: r.orcid ? `ORCID: ${r.orcid}` : r.institutional_email ?? null,
      badge: r.highest_education_level ?? null,
    }))
  }, [linkableResearchers])

  const selectedResearcher = (pickerResults?.items ?? []).find(
    (r) => r.id === selectedResearcherId
  )

  const invalidateAuthors = () => {
    queryClient.invalidateQueries({ queryKey: ['products', productId, 'authors'] })
  }

  const addAuthorMutation = useMutation({
    mutationFn: () =>
      selectedResearcherId
        ? addProductAuthor(productId, {
            researcher_id: selectedResearcherId,
            author_order: Number(authorOrder) || 1,
          })
        : addProductAuthor(productId, {
            external_author_name: extName.trim(),
            external_author_identifier: extIdentifier.trim(),
            author_order: Number(authorOrder) || 1,
          }),
    onSuccess: () => {
      toast.success('Autor vinculado al producto')
      setAuthorOpen(false)
      setSelectedResearcherId(null)
      setAuthorSearch('')
      setExtName('')
      setExtIdentifier('')
      setAuthorOrder('1')
      invalidateAuthors()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al vincular autor'),
  })

  const removeAuthorMutation = useMutation({
    mutationFn: (params: { researcher_id?: number; external_author_name?: string }) =>
      removeProductAuthor(productId, params),
    onSuccess: () => {
      toast.success('Autor desvinculado')
      invalidateAuthors()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al desvincular autor'),
  })

  return (
    <div className='rounded-2xl border border-border/50 bg-card p-6 shadow-sm lg:col-span-2'>
      <div className='mb-5 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='rounded-lg bg-cyan-500/10 p-2'>
            <Users className='h-4 w-4 text-cyan-500' />
          </div>
          <h3 className='text-lg font-semibold'>Autores</h3>
        </div>
        {isAdmin && (
          <Button size='sm' variant='outline' onClick={() => setAuthorOpen(true)}>
            <UserPlus className='mr-2 h-4 w-4' /> Vincular Autor
          </Button>
        )}
      </div>

      {!authors || authors.length === 0 ? (
        <p className='text-sm text-muted-foreground'>Sin autores registrados.</p>
      ) : (
        <ScrollArea className='max-h-[360px] pr-2'>
          <ul className='divide-y divide-border/50'>
            {authors.map((a) => (
              <li key={a.id} className='flex items-center justify-between gap-3 py-2.5'>
                <div className='flex min-w-0 items-center gap-3'>
                  <Badge variant='outline' className='shrink-0 font-mono text-xs'>
                    #{a.author_order}
                  </Badge>
                  <ResearcherAvatar
                    name={
                      a.researcher_id
                        ? a.researcher_name?.trim() || a.researcher_external_code
                        : a.external_author_name
                    }
                    size='sm'
                  />
                  <div className='min-w-0'>
                    {a.researcher_id ? (
                      <Link
                        to={isAdmin ? '/admin/researchers/$id' : '/researchers/$id'}
                        params={{ id: String(a.researcher_id) }}
                        className='truncate text-sm font-medium text-primary hover:underline'
                      >
                        {a.researcher_name.trim() || a.researcher_external_code}
                      </Link>
                    ) : (
                      <p className='truncate text-sm font-medium'>
                        {a.external_author_name}
                        <span className='ml-2 text-xs text-muted-foreground'>(externo)</span>
                      </p>
                    )}
                    <p className='text-xs text-muted-foreground'>
                      {a.researcher_id
                        ? a.researcher_external_code
                        : a.external_author_identifier || a.match_status}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <ActionTooltip label='Desvincular autor'>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-8 w-8 shrink-0 text-destructive'
                      disabled={removeAuthorMutation.isPending}
                      onClick={() =>
                        setUnlinkingAuthor({
                          researcher_id: a.researcher_id,
                          external_author_name: a.external_author_name,
                          name: a.researcher_id
                            ? a.researcher_name?.trim() || a.researcher_external_code || 'Investigador'
                            : a.external_author_name || 'Autor externo',
                        })
                      }
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </ActionTooltip>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}

      {/* Diálogo: vincular autor */}
      <Dialog open={authorOpen} onOpenChange={setAuthorOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Vincular Autor</DialogTitle>
            <DialogDescription>
              Busca un investigador del sistema o registra un autor externo.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-2'>
              <Label>Investigador del sistema</Label>
              <EntityCombobox
                items={researcherItems}
                value={selectedResearcherId}
                onChange={(id) => setSelectedResearcherId(id)}
                onSearchChange={setAuthorSearch}
                placeholder='Buscar o seleccionar investigador...'
                searchPlaceholder='Nombre, apellido u ORCID...'
                emptyMessage='No se encontraron investigadores.'
                allowClear
              />
            </div>
            {!selectedResearcher && (
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label>Autor externo (nombre)</Label>
                  <Input
                    value={extName}
                    onChange={(e) => setExtName(e.target.value)}
                    placeholder='Ej: JOHN DOE'
                  />
                </div>
                <div className='grid gap-2'>
                  <Label>Identificador externo</Label>
                  <Input
                    value={extIdentifier}
                    onChange={(e) => setExtIdentifier(e.target.value)}
                    placeholder='ORCID, documento...'
                  />
                </div>
              </div>
            )}
            <div className='grid gap-2'>
              <Label>Orden de autoría</Label>
              <Input
                type='number'
                min={1}
                value={authorOrder}
                onChange={(e) => setAuthorOrder(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setAuthorOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addAuthorMutation.mutate()}
              disabled={addAuthorMutation.isPending || (!selectedResearcherId && !extName.trim())}
            >
              {addAuthorMutation.isPending ? 'Vinculando...' : 'Vincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación: desvincular autor */}
      <ConfirmDialog
        open={unlinkingAuthor !== null}
        onOpenChange={(open) => !open && setUnlinkingAuthor(null)}
        title="¿Desvincular autor?"
        desc={`¿Estás seguro de que deseas desvincular a «${unlinkingAuthor?.name ?? ''}» como autor de este producto?`}
        confirmText="Desvincular"
        cancelBtnText="Cancelar"
        destructive
        isLoading={removeAuthorMutation.isPending}
        handleConfirm={() => {
          if (unlinkingAuthor) {
            removeAuthorMutation.mutate(
              unlinkingAuthor.researcher_id
                ? { researcher_id: unlinkingAuthor.researcher_id }
                : { external_author_name: unlinkingAuthor.external_author_name ?? undefined },
              {
                onSettled: () => setUnlinkingAuthor(null),
              }
            )
          }
        }}
      />
    </div>
  )
}
