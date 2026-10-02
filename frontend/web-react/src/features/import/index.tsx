import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DownloadCloud, Eye } from 'lucide-react'
import { importCvlac, importGruplac, previewGruplac } from '@/lib/api'
import type { GruplacPreview } from '@/lib/types'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { GroupSearchImport } from './group-search'
import { GruplacPreviewCard } from './gruplac-preview-card'

export function ImportPage() {
  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-4'>
          <h1 className='text-2xl font-bold tracking-tight'>Importación de datos</h1>
          <p className='text-muted-foreground'>
            Búsqueda en el buscador oficial de Scienti, ingestión desde URL
            pública de GrupLAC o texto CvLAC.
          </p>
        </div>

        <Tabs defaultValue='buscar' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='buscar'>Buscar grupo</TabsTrigger>
            <TabsTrigger value='gruplac'>GrupLAC (URL)</TabsTrigger>
            <TabsTrigger value='cvlac'>CvLAC (investigador)</TabsTrigger>
          </TabsList>
          <TabsContent value='buscar'>
            <GroupSearchImport />
          </TabsContent>
          <TabsContent value='gruplac'>
            <GruplacImport />
          </TabsContent>
          <TabsContent value='cvlac'>
            <CvlacImport />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

function GruplacImport() {
  const queryClient = useQueryClient()
  const [url, setUrl] = useState('')
  const [enrichCvlac, setEnrichCvlac] = useState(true)
  const [preview, setPreview] = useState<GruplacPreview | null>(null)

  const doPreview = useMutation({
    mutationFn: () => previewGruplac(url),
    onSuccess: (data) => {
      setPreview(data)
      toast.success(`Vista previa: ${data.counts.members} integrantes, ${data.counts.products} productos`)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error en la vista previa'),
  })

  const doImport = useMutation({
    mutationFn: () => importGruplac(url, enrichCvlac),
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
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error en la importación'),
  })

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Importar grupo desde GrupLAC</CardTitle>
          <CardDescription>
            Flujo en dos fases: primero revisa la vista previa (no persiste nada) y luego
            confirma la importación atómica. También acepta el código del grupo
            (ej. COL0016283) o el nro de GrupLAC.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <Input
            placeholder='https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualparam.jsp?nro=...'
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <label className='flex items-center gap-2 text-sm'>
            <Checkbox
              checked={enrichCvlac}
              onCheckedChange={(v) => setEnrichCvlac(v === true)}
            />
            Enriquecer integrantes con su CvLAC automáticamente (1 solicitud/segundo)
          </label>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() => doPreview.mutate()}
              disabled={!url || doPreview.isPending}
            >
              <Eye className='me-2 h-4 w-4' />
              {doPreview.isPending ? 'Descargando…' : 'Vista previa'}
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

function CvlacImport() {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [groupCode, setGroupCode] = useState('')

  const doImport = useMutation({
    mutationFn: () => importCvlac(text, groupCode || undefined),
    onSuccess: (r) => {
      toast.success(r.summary ?? 'CvLAC importado correctamente')
      setText('')
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['validation-queue'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error en la importación'),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar investigador desde CvLAC</CardTitle>
        <CardDescription>
          Pega el texto completo de la hoja de vida (copy-paste desde la página CvLAC de
          Minciencias). Se crean sus productos y se enlazan al grupo indicado.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-3'>
        <Input
          placeholder='Código del grupo destino (opcional, ej. COL0011545)'
          value={groupCode}
          onChange={(e) => setGroupCode(e.target.value)}
          className='max-w-sm'
        />
        <Textarea
          placeholder='Pega aquí el texto del CvLAC…'
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          className='font-mono text-xs'
        />
        <Button onClick={() => doImport.mutate()} disabled={text.trim().length < 50 || doImport.isPending}>
          {doImport.isPending ? 'Importando…' : 'Importar CvLAC'}
        </Button>
      </CardContent>
    </Card>
  )
}
