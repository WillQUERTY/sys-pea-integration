import { useState, useMemo } from 'react'
import { FileDown, FileText, FileSpreadsheet } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  groupDossierPdfUrl,
  groupReportPdfUrl,
  groupExportRankingCsvUrl,
  groupExportProductsCsvUrl,
} from '@/lib/api'

export interface GroupExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: number
  groupName: string
  groupExternalCode: string
}

export function GroupExportDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  groupExternalCode,
}: GroupExportDialogProps) {
  const [reportWindow, setReportWindow] = useState('all')
  const [reportStart, setReportStart] = useState('')
  const [reportEnd, setReportEnd] = useState('')

  const reportWindowParams = useMemo(
    () =>
      reportWindow === 'custom'
        ? {
            start_year: Number(reportStart) || undefined,
            end_year: Number(reportEnd) || undefined,
          }
        : reportWindow !== 'all'
          ? { window_years: Number(reportWindow) }
          : undefined,
    [reportWindow, reportStart, reportEnd]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[620px] rounded-2xl'>
        <DialogHeader>
          <div className='flex items-center gap-2.5 mb-1'>
            <div className='p-2.5 rounded-xl bg-primary/10 text-primary'>
              <FileDown className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold'>Centro de Exportación & Dossier de Gestión</DialogTitle>
              <p className='text-xs text-muted-foreground'>Universidad Popular del Cesar · Sistema Institucional Khemia</p>
            </div>
          </div>
          <DialogDescription className='text-xs text-muted-foreground pt-1'>
            Descarga informes oficiales para Decanatura y Vicerrectoría, o exporta los datos analíticos para{' '}
            <span className='font-semibold text-foreground'>{groupName}</span> ({groupExternalCode}).
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue='dossier' className='space-y-4 py-1'>
          <TabsList className='grid grid-cols-3 w-full rounded-xl bg-muted/60 p-1'>
            <TabsTrigger value='dossier' className='rounded-lg text-xs font-semibold gap-1.5'>
              <FileText className='h-3.5 w-3.5 text-primary' />
              Dossier Ejecutivo
            </TabsTrigger>
            <TabsTrigger value='gruplac' className='rounded-lg text-xs font-semibold gap-1.5'>
              <FileDown className='h-3.5 w-3.5 text-blue-600' />
              Informe GrupLAC
            </TabsTrigger>
            <TabsTrigger value='csv' className='rounded-lg text-xs font-semibold gap-1.5'>
              <FileSpreadsheet className='h-3.5 w-3.5 text-emerald-600' />
              Excel / CSV
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DOSSIER EJECUTIVO */}
          <TabsContent value='dossier' className='space-y-4 pt-1'>
            <div className='p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5 text-xs'>
              <div className='flex items-center justify-between font-semibold text-foreground'>
                <span>Dossier Ejecutivo Oficial (3 Páginas)</span>
                <Badge variant='outline' className='border-primary/40 text-primary text-[10px] font-bold'>
                  DECANATURA & VICERRECTORÍA
                </Badge>
              </div>
              <p className='text-muted-foreground text-[11px] leading-relaxed'>
                Resumen condensado de alto impacto con: Portada institucional, 4 KPIs clave, Diagnóstico Minciencias 2024
                (criterios y brechas), Dinámica de familias de conocimiento, Ranking de investigadores, Red de colaboración
                y Bloque de formalización de firmas.
              </p>
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Ventana de observación de la producción
              </Label>
              <Select value={reportWindow} onValueChange={setReportWindow}>
                <SelectTrigger className='w-full rounded-xl'>
                  <SelectValue placeholder='Seleccione una ventana...' />
                </SelectTrigger>
                <SelectContent className='rounded-xl'>
                  <SelectItem value='all'>
                    <div className='py-0.5 text-left'>
                      <span className='font-medium block'>Toda la producción</span>
                      <span className='text-[11px] text-muted-foreground block'>Histórico completo sin restricciones de año</span>
                    </div>
                  </SelectItem>
                  <SelectItem value='5'>
                    <div className='py-0.5 text-left'>
                      <span className='font-medium block'>Últimos 5 años (Recomendado Minciencias)</span>
                      <span className='text-[11px] text-muted-foreground block'>Ventana estándar de convocatorias institucionales</span>
                    </div>
                  </SelectItem>
                  <SelectItem value='2'>
                    <div className='py-0.5 text-left'>
                      <span className='font-medium block'>Últimos 2 años</span>
                      <span className='text-[11px] text-muted-foreground block'>Monitoreo de producción reciente</span>
                    </div>
                  </SelectItem>
                  <SelectItem value='custom'>
                    <div className='py-0.5 text-left'>
                      <span className='font-medium block'>Rango de años personalizado…</span>
                      <span className='text-[11px] text-muted-foreground block'>Definir año inicial y final manualmente</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportWindow === 'custom' && (
              <div className='p-3 rounded-xl border border-border/60 bg-muted/30 space-y-2.5 animate-in fade-in-50 duration-200'>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-1'>
                    <Label htmlFor='dossier-start' className='text-xs text-muted-foreground'>Año inicial</Label>
                    <Input
                      id='dossier-start'
                      type='number'
                      value={reportStart}
                      onChange={(e) => setReportStart(e.target.value)}
                      placeholder='Ej. 2019'
                      className='rounded-lg h-8 text-xs'
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label htmlFor='dossier-end' className='text-xs text-muted-foreground'>Año final</Label>
                    <Input
                      id='dossier-end'
                      type='number'
                      value={reportEnd}
                      onChange={(e) => setReportEnd(e.target.value)}
                      placeholder='Ej. 2024'
                      className='rounded-lg h-8 text-xs'
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className='pt-2'>
              <Button
                onClick={() => {
                  window.open(groupDossierPdfUrl(groupId, reportWindowParams), '_blank')
                  onOpenChange(false)
                }}
                className='w-full rounded-xl shadow-md'
              >
                <FileDown className='mr-2 h-4 w-4' />
                Descargar Dossier Ejecutivo (PDF)
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* TAB 2: INFORME GRUPLAC COMPLETO */}
          <TabsContent value='gruplac' className='space-y-4 pt-1'>
            <div className='p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1.5 text-xs'>
              <div className='flex items-center justify-between font-semibold text-foreground'>
                <span>Informe Exhaustivo GrupLAC</span>
                <Badge variant='outline' className='border-blue-500/40 text-blue-600 text-[10px] font-bold'>
                  FORMATO SCIENTI MINCIENCIAS
                </Badge>
              </div>
              <p className='text-muted-foreground text-[11px] leading-relaxed'>
                Reporte técnico extendido con el inventario detallado de cada producto bibliográfico, subtipos Minciencias, integrantes y proyectos registrados en la plataforma.
              </p>
            </div>

            <div className='space-y-2'>
              <Label className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Ventana de observación de la producción
              </Label>
              <Select value={reportWindow} onValueChange={setReportWindow}>
                <SelectTrigger className='w-full rounded-xl'>
                  <SelectValue placeholder='Seleccione una ventana...' />
                </SelectTrigger>
                <SelectContent className='rounded-xl'>
                  <SelectItem value='all'>Toda la producción (Histórico completo)</SelectItem>
                  <SelectItem value='5'>Últimos 5 años (Ventana Minciencias)</SelectItem>
                  <SelectItem value='2'>Últimos 2 años</SelectItem>
                  <SelectItem value='10'>Últimos 10 años</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className='pt-2'>
              <Button
                variant='default'
                onClick={() => {
                  window.open(groupReportPdfUrl(groupId, reportWindowParams), '_blank')
                  onOpenChange(false)
                }}
                className='w-full rounded-xl shadow-md'
              >
                <FileDown className='mr-2 h-4 w-4' />
                Descargar Informe GrupLAC (PDF)
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* TAB 3: EXCEL / CSV EXPORTS */}
          <TabsContent value='csv' className='space-y-3 pt-1'>
            <div className='p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed'>
              Archivos CSV delimitados por punto y coma (;) con codificación UTF-8 BOM, optimizados para abrirse directamente en Microsoft Excel sin problemas de formato ni caracteres especiales.
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {/* Tarjeta Ranking */}
              <div className='p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between space-y-3'>
                <div className='space-y-1'>
                  <div className='flex items-center gap-1.5 font-bold text-xs text-emerald-800 dark:text-emerald-300'>
                    <FileSpreadsheet className='h-4 w-4 text-emerald-600' />
                    Ranking de Investigadores
                  </div>
                  <p className='text-[11px] text-muted-foreground leading-normal'>
                    Matriz de integrantes con sus niveles académicos, obras en grupo, % de contribución y obras totales.
                  </p>
                </div>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => window.open(groupExportRankingCsvUrl(groupId), '_blank')}
                  className='w-full rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 text-xs font-semibold'
                >
                  <FileSpreadsheet className='mr-1.5 h-3.5 w-3.5' />
                  Descargar Ranking (.CSV)
                </Button>
              </div>

              {/* Tarjeta Productos */}
              <div className='p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col justify-between space-y-3'>
                <div className='space-y-1'>
                  <div className='flex items-center gap-1.5 font-bold text-xs text-blue-800 dark:text-blue-300'>
                    <FileSpreadsheet className='h-4 w-4 text-blue-600' />
                    Catálogo de Productos
                  </div>
                  <p className='text-[11px] text-muted-foreground leading-normal'>
                    Inventario completo de obras con familia Minciencias, subtipo, año, DOI, aval y coautores.
                  </p>
                </div>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => window.open(groupExportProductsCsvUrl(groupId, reportWindowParams), '_blank')}
                  className='w-full rounded-xl border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 text-xs font-semibold'
                >
                  <FileSpreadsheet className='mr-1.5 h-3.5 w-3.5' />
                  Descargar Productos (.CSV)
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
