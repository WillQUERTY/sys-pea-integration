import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DownloadCloud, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { importPdf, previewPdfImport } from '@/lib/api'
import type { GruplacPreview } from '@/lib/types'
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

export function PdfImport() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<GruplacPreview | null>(null)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
    setPreview(null)
  }

  const doPreview = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecciona primero un archivo PDF')
      return previewPdfImport(file)
    },
    onSuccess: (data) => {
      setPreview(data)
      toast.success(
        `Vista previa: ${data.counts.members} integrantes, ${data.counts.products} productos`
      )
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Error en la vista previa'),
  })

  const doImport = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecciona primero un archivo PDF')
      return importPdf(file)
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
      <Card>
        <CardHeader>
          <CardTitle>Importar grupo desde PDF</CardTitle>
          <CardDescription>
            PDF con estructura de secciones estilo GrupLAC: el informe que
            genera este sistema (reporte de grupo) o un «imprimir a PDF» del
            visor de Scienti. El PDF debe traer el código GrupLAC (COL…) del
            grupo. Flujo en dos fases: primero revisa la vista previa (no
            persiste nada) y luego confirma la importación atómica.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <Input type='file' accept='.pdf' onChange={onFileChange} />
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

      {preview && <GruplacPreviewCard preview={preview} />}
    </div>
  )
}
