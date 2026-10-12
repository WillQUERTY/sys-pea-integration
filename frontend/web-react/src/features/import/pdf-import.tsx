import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DownloadCloud, Eye, Globe, FileText } from 'lucide-react'
import { toast } from 'sonner'
import {
  importPdf,
  previewPdfImport,
  importPdfScienti,
  previewPdfScientiImport,
} from '@/lib/api'
import type { GruplacPreview } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { GruplacPreviewCard } from './gruplac-preview-card'
import { PdfFoolproofGuideCard } from './import-guide'

export function PdfImport() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<GruplacPreview | null>(null)
  const [parserType, setParserType] = useState<'scienti' | 'system'>('scienti')

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
    setPreview(null)
  }

  const doPreview = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecciona primero un archivo PDF')
      return parserType === 'scienti'
        ? previewPdfScientiImport(file)
        : previewPdfImport(file)
    },
    onSuccess: (data) => {
      setPreview(data)
      toast.success(
        `Vista previa: ${data.counts.members} integrantes, ${data.counts.products} productos (${
          parserType === 'scienti' ? 'Scienti Web' : 'Informe Institucional'
        })`
      )
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Error en la vista previa'),
  })

  const doImport = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecciona primero un archivo PDF')
      return parserType === 'scienti' ? importPdfScienti(file) : importPdf(file)
    },
    onSuccess: (r) => {
      toast.success(
        `Importación completa: ${r.group_name ?? ''} (${r.new_records ?? 0} registros nuevos)`
      )
      if (r.ram_reloaded === false) {
        toast.warning(
          'La importación se guardó en la BD, pero la vista no se pudo refrescar. Recarga la página.'
        )
      }
      setPreview(null)
      setFile(null)
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
      <PdfFoolproofGuideCard />

      <Card>
        <CardHeader>
          <CardTitle>Importar grupo desde PDF</CardTitle>
          <CardDescription>
            Selecciona el motor de importación según el origen del documento PDF.
            Puedes probar ambos importadores para comparar la extracción.
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-4'>
          {/* Selector de Importador */}
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div
              onClick={() => {
                setParserType('scienti')
                setPreview(null)
              }}
              className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                parserType === 'scienti'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2 font-medium'>
                  <Globe className='h-4 w-4 text-primary' />
                  <span>Impresión Web Scienti</span>
                </div>
                <Badge variant='default' className='text-xs'>
                  Nuevo / Web
                </Badge>
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Para PDFs generados con «Imprimir a PDF» (Ctrl+P) directamente
                desde el visor público de Scienti Minciencias.
              </p>
            </div>

            <div
              onClick={() => {
                setParserType('system')
                setPreview(null)
              }}
              className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                parserType === 'system'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2 font-medium'>
                  <FileText className='h-4 w-4 text-muted-foreground' />
                  <span>Informe Institucional</span>
                </div>
                <Badge variant='outline' className='text-xs'>
                  Sistema
                </Badge>
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Para el informe estructurado generado internamente por este
                sistema (requiere etiqueta «Código GrupLAC COL…»).
              </p>
            </div>
          </div>

          <Input type='file' accept='.pdf' onChange={onFileChange} />

          <div className='flex flex-col gap-2 sm:flex-row'>
            <Button
              variant='outline'
              onClick={() => doPreview.mutate()}
              disabled={!file || doPreview.isPending}
            >
              <Eye className='me-2 h-4 w-4' />
              {doPreview.isPending
                ? 'Analizando…'
                : `Vista previa (${parserType === 'scienti' ? 'Scienti Web' : 'Informe'})`}
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

      {preview && <GruplacPreviewCard preview={preview} />}
    </div>
  )
}

