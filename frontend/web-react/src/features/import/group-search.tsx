import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DownloadCloud, Eye, Search as SearchIcon } from 'lucide-react'
import { importGruplac, previewGruplac, searchGroupsScienti } from '@/lib/api'
import type { GroupSearchResult, GruplacPreview } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { GruplacPreviewCard } from './gruplac-preview-card'

/**
 * Buscador de grupos sobre el buscador oficial de Scienti (fuente de verdad),
 * con flujo de vista previa/importación reutilizando el de la pestaña URL.
 */
export function GroupSearchImport() {
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [institucion, setInstitucion] = useState('')
  const [clasificacion, setClasificacion] = useState('')
  const [results, setResults] = useState<GroupSearchResult[] | null>(null)
  const [preview, setPreview] = useState<GruplacPreview | null>(null)
  const [previewTarget, setPreviewTarget] = useState<GroupSearchResult | null>(null)
  const [enrichCvlac, setEnrichCvlac] = useState(true)
  const [importTarget, setImportTarget] = useState<GroupSearchResult | null>(null)

  const doSearch = useMutation({
    mutationFn: () =>
      searchGroupsScienti({
        q,
        departamento: departamento || undefined,
        institucion: institucion || undefined,
        clasificacion: clasificacion || undefined,
      }),
    onSuccess: (data) => {
      setResults(data)
      setPreview(null)
      if (data.length === 0) {
        toast.info('Sin resultados en el buscador de Scienti. Prueba otra subcadena del nombre.')
      } else {
        toast.success(`${data.length} grupo(s) encontrados`)
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error en la búsqueda'),
  })

  const doPreview = useMutation({
    mutationFn: (g: GroupSearchResult) => previewGruplac(g.gruplac_url, g.cod_grupo),
    onSuccess: (data, g) => {
      setPreview(data)
      setPreviewTarget(g)
      toast.success(`Vista previa: ${data.counts.members} integrantes, ${data.counts.products} productos`)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error en la vista previa'),
  })

  const doImport = useMutation({
    mutationFn: (g: GroupSearchResult) => importGruplac(g.gruplac_url, enrichCvlac, g.cod_grupo),
    onSuccess: (r) => {
      const enr = r.cvlac_enrichment
      toast.success(
        `Importación completa: ${r.group_name ?? ''} (${r.new_records ?? 0} registros nuevos)` +
          (enr ? ` · CvLAC: ${enr.enriched} enriquecidos, ${enr.failed} fallidos` : '')
      )
      if (r.ram_reloaded === false) {
        toast.warning('La importación se guardó en la BD, pero la vista no se pudo refrescar. Recarga la página.')
      }
      setPreview(null)
      setPreviewTarget(null)
      setImportTarget(null)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error en la importación'),
  })

  const canSearch = q.trim().length >= 3 || !!(departamento || institucion || clasificacion)

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Buscar grupo en Scienti (Minciencias)</CardTitle>
          <CardDescription>
            Búsqueda directa en el buscador oficial de GrupLAC: cada resultado trae su
            página real lista para vista previa e importación. Si no encuentras el grupo,
            pega su URL exacta en la pestaña «GrupLAC (URL)».
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
            <Input
              placeholder='Nombre del grupo (mín. 3 letras)'
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSearch && doSearch.mutate()}
            />
            <Input
              placeholder='Departamento (ej. CESAR)'
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
            />
            <Input
              placeholder='Institución (ej. POPULAR DEL CESAR)'
              value={institucion}
              onChange={(e) => setInstitucion(e.target.value)}
            />
            <Input
              placeholder='Clasificación (ej. A1)'
              value={clasificacion}
              onChange={(e) => setClasificacion(e.target.value)}
            />
          </div>
          <label className='flex items-center gap-2 text-sm'>
            <Checkbox
              checked={enrichCvlac}
              onCheckedChange={(v) => setEnrichCvlac(v === true)}
            />
            Enriquecer integrantes con su CvLAC al importar
          </label>
          <Button
            variant='outline'
            onClick={() => doSearch.mutate()}
            disabled={!canSearch || doSearch.isPending}
          >
            <SearchIcon className='me-2 h-4 w-4' />
            {doSearch.isPending ? 'Buscando…' : 'Buscar'}
          </Button>
        </CardContent>
      </Card>

      {results && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Institución</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Clasificación</TableHead>
                  <TableHead className='text-end'>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((g) => (
                  <TableRow key={g.cod_grupo}>
                    <TableCell className='max-w-[320px] truncate font-medium' title={g.nombre ?? ''}>
                      {g.nombre ?? '—'}
                    </TableCell>
                    <TableCell className='font-mono text-xs'>{g.cod_grupo}</TableCell>
                    <TableCell className='max-w-[220px] truncate text-xs' title={g.institucion ?? ''}>
                      {g.institucion ?? '—'}
                    </TableCell>
                    <TableCell className='text-xs'>{g.departamento ?? '—'}</TableCell>
                    <TableCell>
                      {g.clasificacion ? (
                        <span className='font-semibold'>{g.clasificacion}</span>
                      ) : (
                        '—'
                      )}
                      {g.convocatoria ? <span className='ms-1 text-xs text-muted-foreground'>({g.convocatoria})</span> : null}
                    </TableCell>
                    <TableCell className='text-end'>
                      <div className='flex justify-end gap-1'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => doPreview.mutate(g)}
                          disabled={doPreview.isPending}
                        >
                          <Eye className='me-1 h-3.5 w-3.5' />
                          Vista previa
                        </Button>
                        <Button
                          size='sm'
                          onClick={() => setImportTarget(g)}
                          disabled={doImport.isPending}
                        >
                          <DownloadCloud className='me-1 h-3.5 w-3.5' />
                          Importar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {preview && previewTarget && (
        <>
          <GruplacPreviewCard preview={preview} />
          <div className='flex justify-end'>
            <Button onClick={() => doImport.mutate(previewTarget)} disabled={doImport.isPending}>
              <DownloadCloud className='me-2 h-4 w-4' />
              {doImport.isPending ? 'Importando…' : 'Confirmar importación'}
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={importTarget !== null}
        onOpenChange={(open) => !open && setImportTarget(null)}
        title='Importar sin revisar vista previa'
        desc={
          <>
            Se importará <strong>{importTarget?.nombre ?? importTarget?.cod_grupo}</strong>{' '}
            directamente desde GrupLAC sin revisar la vista previa.
            {enrichCvlac && ' Además se enriquecerán los integrantes con su CvLAC.'}
          </>
        }
        confirmText='Importar'
        isLoading={doImport.isPending}
        handleConfirm={() => importTarget && doImport.mutate(importTarget)}
      />
    </div>
  )
}
