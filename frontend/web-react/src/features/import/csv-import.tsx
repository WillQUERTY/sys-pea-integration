import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DownloadCloud, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { importCsv, previewCsvImport } from '@/lib/api'
import type {
  CsvImportPreview,
  CsvImportResult,
  CsvRowResult,
} from '@/lib/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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

// Con enriquecimiento cada fila son ~2 descargas al buscador/GrupLAC de Scienti:
// avisar antes de que el usuario lance un lote grande.
const ENRICH_WARN_THRESHOLD = 15

const ROW_STATUS: Record<
  CsvRowResult['status'],
  { label: string; badge: React.ReactNode }
> = {
  enriched: {
    label: 'Enriquecido (GrupLAC completo)',
    badge: (
      <Badge
        variant='outline'
        className='border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      >
        Enriquecido
      </Badge>
    ),
  },
  file_data: {
    label: 'Datos del archivo',
    badge: <Badge variant='secondary'>Datos del archivo</Badge>,
  },
  failed: {
    label: 'Fallido',
    badge: <Badge variant='destructive'>Fallido</Badge>,
  },
}

export function CsvImport() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [enrichGruplac, setEnrichGruplac] = useState(false)
  const [preview, setPreview] = useState<CsvImportPreview | null>(null)
  const [result, setResult] = useState<CsvImportResult | null>(null)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
    setPreview(null)
    setResult(null)
  }

  const doPreview = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecciona primero un archivo CSV')
      return previewCsvImport(file)
    },
    onSuccess: (data) => {
      setPreview(data)
      setResult(null)
      toast.success(
        `Vista previa: ${data.distinct_groups} grupos, ${data.row_errors.length} filas descartadas`
      )
      if (enrichGruplac && data.distinct_groups > ENRICH_WARN_THRESHOLD) {
        toast.warning(
          `Vas a enriquecer ${data.distinct_groups} grupos: son ~2 descargas a Scienti por fila (1 s entre filas). Considera dejarlo sin enriquecer y confirmar solo con los datos del archivo.`
        )
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Error en la vista previa'),
  })

  const doImport = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecciona primero un archivo CSV')
      return importCsv(file, enrichGruplac)
    },
    onSuccess: (r) => {
      const s = r.summary
      toast.success(
        `Importación CSV completa: ${s.total - s.failed} de ${s.total} grupos cargados` +
          (s.enriched > 0 ? ` · ${s.enriched} enriquecidos con GrupLAC` : '')
      )
      if (r.ram_reloaded === false) {
        toast.warning(
          'La importación se guardó en la BD, pero la vista no se pudo refrescar. Recarga la página.'
        )
      }
      setResult(r)
      setPreview(null)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Error en la importación'),
  })

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Importar grupos desde CSV</CardTitle>
          <CardDescription>
            Dataset oficial de MinCiencias en datos.gov.co («Grupos de
            Investigación Reconocidos», hrhc-c4wu). Flujo en dos fases: primero
            revisa la vista previa (no persiste nada) y luego confirma la
            importación fila por fila. Máximo 200 grupos distintos por archivo.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <Input type='file' accept='.csv' onChange={onFileChange} />
          <label className='flex items-center gap-2 text-sm'>
            <Checkbox
              checked={enrichGruplac}
              onCheckedChange={(v) => setEnrichGruplac(v === true)}
            />
            Enriquecer cada grupo con su GrupLAC completo (resuelve el nro vía
            el buscador oficial; ~2 descargas a Scienti por fila, con pausa de 1
            s entre filas). Si falla, la fila se carga con los datos del
            archivo.
          </label>
          <div className='flex flex-col gap-2 sm:flex-row'>
            <Button
              variant='outline'
              onClick={() => doPreview.mutate()}
              disabled={!file || doPreview.isPending}
            >
              <Eye className='me-2 h-4 w-4' />
              {doPreview.isPending ? 'Analizando…' : 'Vista previa'}
            </Button>
            <Button
              onClick={() => doImport.mutate()}
              disabled={!preview || doImport.isPending}
            >
              <DownloadCloud className='me-2 h-4 w-4' />
              {doImport.isPending ? 'Importando…' : 'Confirmar importación'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && <CsvPreviewCard preview={preview} />}
      {result && <CsvResultCard result={result} />}
    </div>
  )
}

function CsvPreviewCard({ preview }: { preview: CsvImportPreview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Vista previa del CSV — {preview.distinct_groups} grupos
        </CardTitle>
        <CardDescription className='flex flex-wrap gap-2 pt-1'>
          <Badge variant='secondary'>
            {preview.total_data_rows} filas de datos
          </Badge>
          <Badge variant='secondary'>
            {preview.distinct_groups} grupos distintos
          </Badge>
          {preview.deduped_count > 0 && (
            <Badge variant='outline'>
              {preview.deduped_count} duplicadas consolidadas
            </Badge>
          )}
          {preview.row_errors.length > 0 && (
            <Badge variant='destructive'>
              {preview.row_errors.length} filas descartadas
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {preview.row_errors.length > 0 && (
          <Alert variant='destructive'>
            <AlertTitle>
              Filas descartadas ({preview.row_errors.length})
            </AlertTitle>
            <AlertDescription>
              <ul className='list-disc ps-4'>
                {preview.row_errors.slice(0, 10).map((e, i) => (
                  <li key={i} className='font-mono text-xs'>
                    Línea {e.line}: {e.error}
                  </li>
                ))}
                {preview.row_errors.length > 10 && (
                  <li className='list-none pt-1 text-xs text-muted-foreground italic'>
                    … y {preview.row_errors.length - 10} filas más
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Clasif.</TableHead>
                <TableHead>Conv.</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Institución aval</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.rows.map((r) => (
                <TableRow key={r.external_code}>
                  <TableCell className='font-mono text-xs'>
                    {r.external_code}
                  </TableCell>
                  <TableCell
                    className='max-w-[280px] truncate font-medium'
                    title={r.name}
                  >
                    {r.name}
                  </TableCell>
                  <TableCell>{r.classification || '—'}</TableCell>
                  <TableCell>{r.ano_convo ?? '—'}</TableCell>
                  <TableCell className='text-xs'>
                    {[r.city, r.department].filter(Boolean).join(', ') || '—'}
                  </TableCell>
                  <TableCell
                    className='max-w-[240px] truncate text-xs'
                    title={r.institutions.join(' | ')}
                  >
                    {r.institutions.join(' | ') || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function CsvResultCard({ result }: { result: CsvImportResult }) {
  const s = result.summary
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultado de la importación</CardTitle>
        <CardDescription className='flex flex-wrap gap-2 pt-1'>
          <Badge variant='secondary'>{s.total} filas</Badge>
          {s.enriched > 0 && (
            <Badge
              variant='outline'
              className='border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            >
              {s.enriched} enriquecidos
            </Badge>
          )}
          <Badge variant='secondary'>{s.file_data} con datos del archivo</Badge>
          {s.failed > 0 && (
            <Badge variant='destructive'>{s.failed} fallidos</Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.results.map((r, i) => (
                <TableRow key={`${r.external_code}-${i}`}>
                  <TableCell className='font-mono text-xs'>
                    {r.external_code}
                  </TableCell>
                  <TableCell
                    className='max-w-[280px] truncate font-medium'
                    title={r.name}
                  >
                    {r.name}
                  </TableCell>
                  <TableCell>
                    <span title={ROW_STATUS[r.status].label}>
                      {ROW_STATUS[r.status].badge}
                    </span>
                  </TableCell>
                  <TableCell
                    className='max-w-[280px] truncate text-xs text-muted-foreground'
                    title={r.detail ?? ''}
                  >
                    {r.detail || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
