import type { GruplacPreview } from '@/lib/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/** Card de vista previa GrupLAC, compartida por las pestañas URL y Buscar grupo. */
export function GruplacPreviewCard({ preview }: { preview: GruplacPreview }) {
  return (
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

        {preview.skipped_sections?.length > 0 && (
          <Alert>
            <AlertTitle>Secciones sin tipología 2024</AlertTitle>
            <AlertDescription>
              Estas secciones de GrupLAC no tienen equivalente en el modelo 2024 y sus
              filas no se importarán como productos:
              <ul className='list-disc ps-4'>
                {preview.skipped_sections.slice(0, 10).map((s, i) => (
                  <li key={i} className='font-mono text-xs'>
                    {s}
                  </li>
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
                  <TableCell className='font-mono text-xs'>{p.subtype_code ?? 'sin clasificar'}</TableCell>
                  <TableCell>{p.year ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
