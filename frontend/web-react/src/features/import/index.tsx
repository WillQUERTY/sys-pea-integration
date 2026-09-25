import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DownloadCloud, Eye } from 'lucide-react'
import { importCvlac, importGruplac, previewGruplac } from '@/lib/api'
import type { GruplacPreview } from '@/lib/types'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

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
            Requerimiento 7: ingestión desde URL pública de GrupLAC o texto CvLAC.
          </p>
        </div>

        <Tabs defaultValue='gruplac' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='gruplac'>GrupLAC (grupo)</TabsTrigger>
            <TabsTrigger value='cvlac'>CvLAC (investigador)</TabsTrigger>
          </TabsList>
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
            Flujo en dos fases: primero revisa la vista previa (no persiste nada) y luego confirma
            la importación atómica.
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

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Vista previa — {preview.group.nombre ?? preview.group.name ?? 'Grupo'}</CardTitle>
            <CardDescription className='flex flex-wrap gap-2 pt-1'>
              <Badge variant='secondary'>{preview.counts.members} integrantes</Badge>
              <Badge variant='secondary'>{preview.counts.products} productos</Badge>
              <Badge variant='secondary'>{preview.counts.projects} proyectos</Badge>
              <Badge variant='secondary'>{preview.counts.research_lines} líneas</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {preview.warnings.length > 0 && (
              <Alert variant='destructive'>
                <AlertTitle>Advertencias del análisis</AlertTitle>
                <AlertDescription>
                  <ul className='list-disc ps-4'>
                    {preview.warnings.slice(0, 10).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h3 className='mb-2 text-sm font-semibold'>Integrantes</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código RH</TableHead>
                    <TableHead>Periodo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.members.slice(0, 15).map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className='font-medium'>{m.display_name}</TableCell>
                      <TableCell className='font-mono text-xs'>{m.cod_rh ?? '—'}</TableCell>
                      <TableCell className='text-xs'>{m.period_raw ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className='mb-2 text-sm font-semibold'>Productos</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Año</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.products.slice(0, 15).map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className='max-w-[420px] truncate font-medium'>{p.title}</TableCell>
                      <TableCell className='text-xs'>{p.subtype_name}</TableCell>
                      <TableCell>{p.year ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
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
