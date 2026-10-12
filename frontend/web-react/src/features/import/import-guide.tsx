import { useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Lightbulb,
  Printer,
  Search,
  Sparkles,
  Table as TableIcon,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,

  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function ImportGuideDialog() {
  const [copiedUrl, setCopiedUrl] = useState(false)

  const copyExampleUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(true)
    toast.success('URL copiada al portapapeles')
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' className='gap-2 border-primary/30 text-primary hover:bg-primary/10'>
          <BookOpen className='h-4 w-4' />
          <span>Guía paso a paso</span>
          <Badge variant='secondary' className='bg-primary/15 text-primary text-[10px] px-1.5 py-0'>
            Ayuda
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[88vh] max-w-3xl overflow-y-auto sm:max-w-4xl'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Lightbulb className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-xl'>Instructivo de Importación a Prueba de Fallos</DialogTitle>
              <DialogDescription>
                Aprende cómo traer los datos de grupos de investigación e investigadores sin errores.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue='pdf' className='mt-2 space-y-4'>
          <TabsList className='grid grid-cols-5 w-full'>
            <TabsTrigger value='pdf' className='text-xs gap-1.5'>
              <FileText className='h-3.5 w-3.5' /> PDF Web
            </TabsTrigger>
            <TabsTrigger value='gruplac' className='text-xs gap-1.5'>
              <Globe className='h-3.5 w-3.5' /> GrupLAC URL
            </TabsTrigger>
            <TabsTrigger value='buscar' className='text-xs gap-1.5'>
              <Search className='h-3.5 w-3.5' /> Buscador
            </TabsTrigger>
            <TabsTrigger value='csv' className='text-xs gap-1.5'>
              <TableIcon className='h-3.5 w-3.5' /> CSV Oficial
            </TabsTrigger>
            <TabsTrigger value='cvlac' className='text-xs gap-1.5'>
              <User className='h-3.5 w-3.5' /> CvLAC
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PDF SCIENTI */}
          <TabsContent value='pdf' className='space-y-4 text-sm'>
            <div className='rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-4'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <h3 className='font-semibold text-base text-foreground flex items-center gap-2'>
                    <Printer className='h-5 w-5 text-primary' />
                    ¿Cómo exportar el PDF desde Minciencias Scienti?
                  </h3>
                  <p className='text-muted-foreground text-xs mt-1'>
                    Sigue estos 5 pasos exactos para generar un PDF perfecto desde cualquier navegador (Chrome, Edge, Firefox).
                  </p>
                </div>
                <Badge variant='default' className='shrink-0 bg-primary/90'>Recomendado</Badge>
              </div>

              <div className='mt-4 grid gap-3'>
                <div className='flex items-start gap-3 rounded-lg bg-card p-3 border'>
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs'>
                    1
                  </div>
                  <div>
                    <p className='font-medium text-foreground'>Abre la página oficial del grupo en Scienti</p>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      Ve a la vista pública del grupo en Scienti Minciencias. Por ejemplo, el grupo AITICE de la UPC.
                    </p>
                    <div className='mt-2 flex items-center gap-2'>
                      <a
                        href='https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000002668'
                        target='_blank'
                        rel='noreferrer'
                        className='inline-flex items-center gap-1 text-xs text-primary underline hover:text-primary/80 font-medium'
                      >
                        Abrir grupo de prueba AITICE <ExternalLink className='h-3 w-3' />
                      </a>
                    </div>
                  </div>
                </div>

                <div className='flex items-start gap-3 rounded-lg bg-card p-3 border'>
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs'>
                    2
                  </div>
                  <div>
                    <p className='font-medium text-foreground'>Presiona Imprimir en tu navegador</p>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      Usa el atajo de teclado <kbd className='px-1.5 py-0.5 text-xs font-semibold bg-muted rounded border'>Ctrl</kbd> + <kbd className='px-1.5 py-0.5 text-xs font-semibold bg-muted rounded border'>P</kbd> (o <kbd className='px-1.5 py-0.5 text-xs font-semibold bg-muted rounded border'>Cmd</kbd> + <kbd className='px-1.5 py-0.5 text-xs font-semibold bg-muted rounded border'>P</kbd> en Mac), o haz clic derecho en la página y selecciona <strong>«Imprimir…»</strong>.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3 rounded-lg bg-card p-3 border'>
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs'>
                    3
                  </div>
                  <div>
                    <p className='font-medium text-foreground'>Configura las opciones de impresión</p>
                    <ul className='mt-1 space-y-1 text-xs text-muted-foreground list-disc list-inside'>
                      <li><strong>Destino:</strong> Selecciona <em>«Guardar como PDF»</em> (o <em>«Microsoft Print to PDF»</em>).</li>
                      <li><strong>Páginas:</strong> <em>«Todas»</em>.</li>
                      <li>
                        <strong>Opciones / Más ajustes:</strong> Activa <strong>«Encabezados y pies de página»</strong> (fundamental: aquí el navegador imprime la URL con el identificador del grupo).
                      </li>
                      <li><strong>Gráficos de fondo:</strong> Opcional (puede estar activo o inactivo).</li>
                    </ul>
                  </div>
                </div>

                <div className='flex items-start gap-3 rounded-lg bg-card p-3 border'>
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs'>
                    4
                  </div>
                  <div>
                    <p className='font-medium text-foreground'>Guarda y carga el archivo</p>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      Haz clic en <strong>Guardar</strong>, dale un nombre y súbelo en esta plataforma seleccionando el modo <strong>«Impresión Web Scienti»</strong>.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-3 rounded-lg bg-card p-3 border'>
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs'>
                    5
                  </div>
                  <div>
                    <p className='font-medium text-foreground'>Revisa la vista previa y confirma</p>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      Haz clic en <strong>«Vista previa»</strong>. El sistema te mostrará cuántos integrantes, productos y proyectos detectó sin alterar la base de datos. Si todo coincide, haz clic en <strong>«Confirmar importación»</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <Alert className='mt-3 bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'>
                <AlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400' />
                <AlertTitle className='text-xs font-semibold'>Importante sobre el archivo</AlertTitle>
                <AlertDescription className='text-xs'>
                  No es necesario escanear documentos físicos. Debe ser un PDF exportado digitalmente desde el navegador web para que contenga texto real y enlaces de los investigadores.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          {/* TAB 2: GRUPLAC URL */}
          <TabsContent value='gruplac' className='space-y-4 text-sm'>
            <div className='rounded-xl border p-4 bg-card'>
              <h3 className='font-semibold text-base flex items-center gap-2'>
                <Globe className='h-5 w-5 text-primary' />
                Importación por URL directa de GrupLAC
              </h3>
              <p className='text-muted-foreground text-xs mt-1'>
                Extrae toda la información en vivo directamente desde los servidores de Minciencias.
              </p>

              <div className='mt-4 space-y-3'>
                <div className='rounded-lg bg-muted/60 p-3 text-xs'>
                  <p className='font-medium text-foreground'>Formato de URL válido:</p>
                  <code className='mt-1 block font-mono text-[11px] text-primary break-all bg-background p-2 rounded border'>
                    https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000002668
                  </code>
                  <div className='mt-2 flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-7 text-xs gap-1.5'
                      onClick={() =>
                        copyExampleUrl(
                          'https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000002668'
                        )
                      }
                    >
                      <Copy className='h-3 w-3' />
                      {copiedUrl ? '¡Copiado!' : 'Copiar URL de AITICE'}
                    </Button>
                    <span className='text-[11px] text-muted-foreground'>También acepta el número pelado (ej: 2668) o código COL (ej: COL0016283)</span>
                  </div>
                </div>

                <div className='rounded-lg border p-3'>
                  <p className='font-medium text-xs text-foreground'>¿Qué hace la opción «Enriquecer con CvLAC»?</p>
                  <p className='text-xs text-muted-foreground mt-1'>
                    Visita el currículo público CvLAC de cada integrante a razón de 1 petición por segundo para registrar automáticamente sus identificadores de investigación y producción personal.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: BUSCADOR SCIENTI */}
          <TabsContent value='buscar' className='space-y-4 text-sm'>
            <div className='rounded-xl border p-4 bg-card'>
              <h3 className='font-semibold text-base flex items-center gap-2'>
                <Search className='h-5 w-5 text-primary' />
                Búsqueda oficial en Scienti
              </h3>
              <p className='text-muted-foreground text-xs mt-1'>
                ¿No conoces el enlace o número interno del grupo? Búscalo en tiempo real.
              </p>

              <div className='mt-3 space-y-2 text-xs text-muted-foreground'>
                <div className='flex items-center gap-2 text-foreground font-medium'>
                  <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                  <span>Escribe parte del nombre del grupo (ej: «AITICE», «Ingeniería», «Biotecnología»).</span>
                </div>
                <div className='flex items-center gap-2 text-foreground font-medium'>
                  <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                  <span>Filtra opcionalmente por Institución (ej: «Universidad Popular del Cesar») o Departamento («Cesar»).</span>
                </div>
                <div className='flex items-center gap-2 text-foreground font-medium'>
                  <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                  <span>En los resultados, haz clic en el botón del ojo para ver la vista previa o en la nube para importar directamente.</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: CSV DATOS.GOV.CO */}
          <TabsContent value='csv' className='space-y-4 text-sm'>
            <div className='rounded-xl border p-4 bg-card'>
              <h3 className='font-semibold text-base flex items-center gap-2'>
                <TableIcon className='h-5 w-5 text-primary' />
                Importación masiva desde CSV oficial (Datos.gov.co)
              </h3>
              <p className='text-muted-foreground text-xs mt-1'>
                Ingestión masiva a partir del dataset abierto oficial de Minciencias.
              </p>

              <div className='mt-3 space-y-3 text-xs'>
                <div className='rounded-lg bg-muted/60 p-3'>
                  <p className='font-medium text-foreground'>¿Dónde obtener el archivo CSV?</p>
                  <p className='text-muted-foreground mt-0.5'>
                    Ingresa al portal de datos abiertos del gobierno colombiano y descarga el dataset en formato CSV con delimitación por comas.
                  </p>
                  <a
                    href='https://www.datos.gov.co/Ciencia-Tecnolog-a-e-Innovaci-n/Grupos-de-Investigaci-n-en-Colombia/ap7c-uhg8'
                    target='_blank'
                    rel='noreferrer'
                    className='mt-2 inline-flex items-center gap-1 text-primary underline font-medium'
                  >
                    Dataset oficial de Grupos en datos.gov.co <ExternalLink className='h-3 w-3' />
                  </a>
                </div>

                <div className='rounded-lg border p-3'>
                  <p className='font-medium text-foreground'>Columnas requeridas:</p>
                  <p className='text-muted-foreground mt-0.5'>
                    El archivo debe incluir como mínimo las columnas oficiales: <code>cod_grupo_gr</code> (ej: COL0016283) y <code>nme_grupo_gr</code>.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 5: CVLAC INVESTIGADOR */}
          <TabsContent value='cvlac' className='space-y-4 text-sm'>
            <div className='rounded-xl border p-4 bg-card'>
              <h3 className='font-semibold text-base flex items-center gap-2'>
                <User className='h-5 w-5 text-primary' />
                Importación individual de Investigador desde CvLAC
              </h3>
              <p className='text-muted-foreground text-xs mt-1'>
                Permite registrar un investigador copiando y pegando el texto completo de su hoja de vida CvLAC.
              </p>

              <div className='mt-3 space-y-2 text-xs text-muted-foreground'>
                <p>1. Abre el perfil del investigador en la plataforma CvLAC de Minciencias.</p>
                <p>2. Selecciona todo el contenido de la página (<kbd className='px-1 py-0.5 bg-muted rounded border text-[11px]'>Ctrl</kbd> + <kbd className='px-1 py-0.5 bg-muted rounded border text-[11px]'>A</kbd>) y cópialo (<kbd className='px-1 py-0.5 bg-muted rounded border text-[11px]'>Ctrl</kbd> + <kbd className='px-1 py-0.5 bg-muted rounded border text-[11px]'>C</kbd>).</p>
                <p>3. Pégalo en el cuadro de texto, indica opcionalmente el código del grupo y pulsa <strong>Importar CvLAC</strong>.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Tarjeta colapsable y didáctica para incluir directamente en la pestaña de Importación de PDF
 */
export function PdfFoolproofGuideCard() {
  const [open, setOpen] = useState(false)

  return (
    <div className='rounded-lg border border-primary/20 bg-primary/5 p-3.5 transition-all'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2.5'>
          <div className='flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground'>
            <Sparkles className='h-4 w-4' />
          </div>
          <div>
            <h4 className='font-semibold text-sm text-foreground flex items-center gap-2'>
              ¿Cómo obtener el PDF desde la web de Minciencias?
              <Badge variant='outline' className='text-[10px] py-0 border-primary/40 text-primary'>
                Paso a paso fácil
              </Badge>
            </h4>
            <p className='text-xs text-muted-foreground'>
              3 pasos simples usando Ctrl+P en tu navegador para generar un PDF 100% compatible.
            </p>
          </div>
        </div>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => setOpen(!open)}
          className='text-xs text-primary hover:bg-primary/10'
        >
          {open ? 'Ocultar guía' : 'Ver instructivo'}
        </Button>
      </div>

      {open && (
        <div className='mt-3.5 pt-3 border-t border-primary/15 grid gap-2.5 text-xs text-foreground'>
          <div className='flex items-start gap-2'>
            <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary text-[11px]'>
              1
            </span>
            <span>
              Abre el perfil del grupo en Scienti Minciencias (ej:{' '}
              <a
                href='https://scienti.minciencias.gov.co/gruplac/jsp/visualiza/visualizagr.jsp?nro=00000000002668'
                target='_blank'
                rel='noreferrer'
                className='text-primary underline font-medium'
              >
                AITICE en Minciencias
              </a>
              ).
            </span>
          </div>

          <div className='flex items-start gap-2'>
            <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary text-[11px]'>
              2
            </span>
            <span>
              Presiona <kbd className='px-1 py-0.5 font-mono bg-background rounded border text-[11px]'>Ctrl + P</kbd> (o <kbd className='px-1 py-0.5 font-mono bg-background rounded border text-[11px]'>Cmd + P</kbd>), elige destino <strong>«Guardar como PDF»</strong> y asegúrate de dejar marcados los <strong>«Encabezados y pies de página»</strong>.
            </span>
          </div>

          <div className='flex items-start gap-2'>
            <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary text-[11px]'>
              3
            </span>
            <span>
              Guarda el PDF, súbelo abajo seleccionando <strong>«Impresión Web Scienti»</strong> y haz clic en <strong>«Vista previa»</strong> para auditar antes de guardar.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
