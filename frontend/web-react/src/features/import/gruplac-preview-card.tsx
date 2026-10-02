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
import { EndorsedBadge } from '@/features/products/endorsed'

/** Card de vista previa GrupLAC, compartida por las pestañas URL y Buscar grupo. */
export function GruplacPreviewCard({ preview }: { preview: GruplacPreview }) {
  const warningsCount = preview.warnings.length
  const skippedCount = preview.skipped_sections?.length ?? 0
  const membersCount = preview.members.length
  const productsCount = preview.products.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista previa — {preview.group.nombre ?? preview.group.name ?? 'Grupo'}</CardTitle>
        <CardDescription className='flex flex-wrap gap-2 pt-1'>
          <Badge variant='secondary'>{preview.counts.members} integrantes</Badge>
          <Badge variant='secondary'>{preview.counts.products} productos</Badge>
          {preview.counts.endorsed_products != null && preview.counts.endorsed_products > 0 && (
            <Badge
              variant='outline'
              className='border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            >
              {preview.counts.endorsed_products} con aval ✓
            </Badge>
          )}
          <Badge variant='secondary'>{preview.counts.projects} proyectos</Badge>
          <Badge variant='secondary'>{preview.counts.research_lines} líneas</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {warningsCount > 0 && (
          <Alert variant='destructive'>
            <AlertTitle>Advertencias del análisis ({warningsCount})</AlertTitle>
            <AlertDescription>
              <ul className='list-disc ps-4'>
                {preview.warnings.slice(0, 10).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {warningsCount > 10 && (
                  <li className='list-none pt-1 text-xs italic text-muted-foreground'>
                    … y {warningsCount - 10} advertencias más
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {skippedCount > 0 && (
          <Alert>
            <AlertTitle>Secciones sin tipología 2024 ({skippedCount})</AlertTitle>
            <AlertDescription>
              Estas secciones de GrupLAC no tienen equivalente en el modelo 2024 y sus
              filas no se importarán como productos:
              <ul className='list-disc ps-4'>
                {preview.skipped_sections.slice(0, 10).map((s, i) => (
                  <li key={i} className='font-mono text-xs'>
                    {s}
                  </li>
                ))}
                {skippedCount > 10 && (
                  <li className='list-none pt-1 text-xs italic text-muted-foreground'>
                    … y {skippedCount - 10} secciones más
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className='mb-2 text-sm font-semibold'>
            Integrantes {membersCount > 0 && <span className='text-xs font-normal text-muted-foreground'>({membersCount})</span>}
          </h3>
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
              {membersCount > 15 && (
                <TableRow>
                  <TableCell colSpan={3} className='py-2 text-center text-xs italic text-muted-foreground'>
                    … y {membersCount - 15} integrantes más
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div>
          <h3 className='mb-2 text-sm font-semibold'>
            Productos {productsCount > 0 && <span className='text-xs font-normal text-muted-foreground'>({productsCount})</span>}
          </h3>
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
                  <TableCell className='max-w-[420px] font-medium'>
                    <div className='flex items-center gap-2'>
                      <span className='truncate'>{p.title}</span>
                      {p.is_endorsed && <EndorsedBadge />}
                    </div>
                  </TableCell>
                  <TableCell className='font-mono text-xs'>{p.subtype_code ?? 'sin clasificar'}</TableCell>
                  <TableCell>{p.year ?? '—'}</TableCell>
                </TableRow>
              ))}
              {productsCount > 15 && (
                <TableRow>
                  <TableCell colSpan={3} className='py-2 text-center text-xs italic text-muted-foreground'>
                    … y {productsCount - 15} productos más
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
