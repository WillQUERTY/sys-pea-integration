/* eslint-disable react-refresh/only-export-components */
/**
 * Este módulo es compartido a propósito: exporta datos, formateadores y
 * componentes en un solo lugar (misma convención que los context providers
 * del repo, que también desactivan esta regla).
 */
import type { ReactNode } from 'react'
import { ListTree } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Piezas compartidas por los dos paneles del modelo de medición Minciencias
 * 2024: el de GRUPO (`official-indicator-panel.tsx`) y el de la ADAPTACIÓN
 * INDIVIDUAL (`researcher-official-adaptation-panel.tsx`).
 *
 * Antes de P0-1/P0-2 ambos paneles tenían sus propias copias de estos
 * helpers y de estas constantes; duplicarlas hacía imposible que la cadena
 * §3.6 (peso relativo × ancla = peso global) y el catálogo de variables de
 * entrada/salida se mantuvieran iguales en los dos lugares. Ahora hay una
 * sola fuente: este módulo.
 */

/**
 * §3.10 — coeficientes normativos de la fórmula del indicador.
 * Se usan SOLO como respaldo: cuando el índice normalizado es > 0 el
 * coeficiente se deriva de los propios datos (`término ÷ índice`), de modo
 * que la UI no puede contradecir al backend aunque el modelo cambie.
 */
export const COEFICIENTES_310: Record<string, number> = {
  'Nc.Top': 3.7,
  'Nc.A': 2.3,
  'Nc.B': 0.4,
  AP: 1.5,
  DPC: 0.5,
  'Fr.A': 1,
  'Fr.B': 0.2,
  Cohe: 0.1,
  Coop: 0.3,
}

/** Los nueve términos de la fórmula §3.10, en el orden normativo. */
export const TERMINOS_310 = [
  { clave: 'Nc.Top', nombre: 'Nuevos conocimientos TOP' },
  { clave: 'Nc.A', nombre: 'Producción de calidad A' },
  { clave: 'Nc.B', nombre: 'Producción de calidad B' },
  { clave: 'AP', nombre: 'Apropiación social del conocimiento' },
  { clave: 'DPC', nombre: 'Divulgación pública de la ciencia' },
  { clave: 'Fr.A', nombre: 'Formación de recurso humano A' },
  { clave: 'Fr.B', nombre: 'Formación de recurso humano B' },
  { clave: 'Cohe', nombre: 'Coautoría interna' },
  { clave: 'Coop', nombre: 'Cooperación entre grupos' },
]

/** Clases de medición §3.7 y su lectura en el panel. */
export const CLASES_37 = [
  { clave: 'TOP', nombre: 'TOP' },
  { clave: 'A', nombre: 'Tipo A' },
  { clave: 'B', nombre: 'Tipo B' },
  { clave: 'ASC', nombre: 'Apropiación social' },
  { clave: 'DPC', nombre: 'Divulgación pública' },
  { clave: 'FRH-A', nombre: 'Formación RH A' },
  { clave: 'FRH-B', nombre: 'Formación RH B' },
]

/** Cuántas razones de exclusión se detallan antes de resumir el resto. */
export const MAX_EXCLUSIONES_DETALLADAS = 8

export function numero(valor: number, decimales = 3): string {
  if (!Number.isFinite(valor)) return '—'
  return valor.toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

export function entero(valor: number): string {
  if (!Number.isFinite(valor)) return '—'
  return valor.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}

/**
 * Barra de magnitud horizontal: extremo de dato redondeado (4px) y extremo de
 * línea base recto. La pista es el "resto" disponible (p. ej. el máximo de la
 * población); el relleno es el valor medido.
 */
export function Barra({
  valor,
  maximo,
  color,
  etiqueta,
}: {
  valor: number
  maximo: number
  color: string
  etiqueta: string
}) {
  const pct =
    maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0
  return (
    <div
      className='h-2 w-full overflow-hidden rounded-r-[4px] bg-muted/70'
      title={etiqueta}
      role='img'
      aria-label={etiqueta}
    >
      <div
        className={cn(
          'h-full rounded-r-[4px] transition-all duration-500',
          color
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Seccion({
  icono,
  titulo,
  nota,
  testid,
  children,
}: {
  icono: ReactNode
  titulo: string
  nota?: string
  testid?: string
  children: ReactNode
}) {
  return (
    <section className='space-y-3' data-testid={testid}>
      <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border/40 pb-2'>
        <h4 className='flex items-center gap-2 text-xs font-bold tracking-wider text-foreground uppercase'>
          <span className='text-primary'>{icono}</span>
          {titulo}
        </h4>
        {nota && (
          <span className='text-[11px] text-muted-foreground'>{nota}</span>
        )}
      </div>
      {children}
    </section>
  )
}

/**
 * Una variable del modelo (de entrada o de salida) tal como la nombra el
 * enunciado del Parcial 2, con su valor y la ruta del payload del que sale.
 */
export interface VariableModelo {
  /** Clave estable: se usa como `data-testid` de la fila. */
  clave: string
  /** Nombre de la variable. */
  variable: string
  /** Valor ya formateado para pantalla. */
  valor: string
  /** De dónde sale el valor (ruta del payload). */
  origen?: string
}

function Subtitulo({ children }: { children: ReactNode }) {
  return (
    <h5 className='text-[10px] font-bold tracking-wider text-muted-foreground uppercase'>
      {children}
    </h5>
  )
}

function TablaVariables({
  titulo,
  filas,
}: {
  titulo: string
  filas: VariableModelo[]
}) {
  return (
    <div className='space-y-2'>
      <Subtitulo>{titulo}</Subtitulo>
      <div className='overflow-x-auto rounded-lg border border-border/60'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='text-[10px]'>Variable</TableHead>
              <TableHead className='text-right text-[10px]'>Valor</TableHead>
              <TableHead className='text-[10px]'>Origen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila) => (
              <TableRow key={fila.clave} data-testid={`dato-${fila.clave}`}>
                <TableCell className='text-[11px] text-foreground'>
                  {fila.variable}
                </TableCell>
                <TableCell
                  className='text-right font-mono text-[11px] text-foreground tabular-nums'
                  data-testid={`valor-${fila.clave}`}
                >
                  {fila.valor}
                </TableCell>
                <TableCell className='text-[10px] text-muted-foreground'>
                  {fila.origen ?? ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/**
 * P0‑1 — catálogo de variables de ENTRADA y de SALIDA del modelo.
 *
 * La UI deriva el catálogo de lo que ya viaja en el payload (contrato único);
 * no calcula nada ni inventa datos. Es el gemelo en pantalla de lo que
 * declaran `Taller2_WP-DN-EO.py` (entradas:439-441 / salidas:123-134) y
 * `Taller2_WP-DN-EO.cpp`.
 *
 * ⚠️ La nota final es obligatoria: los conteos crudos (clasificación previa,
 * NO oficial) y los valores en puntos (índice §3.9 / término §3.10) son
 * magnitudes INCOMPARABLES. Mezclarlos en una misma columna sin rótulo
 * haría mentir al panel.
 */
export function EntradasSalidasModelo({
  entradas,
  salidas,
  nota,
  titulo = 'Entradas y salidas del modelo',
}: {
  entradas: VariableModelo[]
  salidas: VariableModelo[]
  nota?: string
  titulo?: string
}) {
  return (
    <Seccion
      icono={<ListTree className='h-3.5 w-3.5' />}
      titulo={titulo}
      nota={nota}
      testid='entradas-salidas-modelo'
    >
      <div className='grid grid-cols-1 gap-6 2xl:grid-cols-2'>
        <TablaVariables titulo='Entradas' filas={entradas} />
        <TablaVariables titulo='Salidas' filas={salidas} />
      </div>
      <p
        className='text-[10px] text-muted-foreground'
        data-testid='nota-conteo-vs-puntos'
      >
        <span className='font-semibold text-foreground'>
          Conteo crudo
        </span>{' '}
        = clasificación previa (no oficial): cantidad de productos, sin
        normalizar. <span className='font-semibold text-foreground'>
          Valor en puntos
        </span>{' '}
        = índice normalizado (§3.9) o término ponderado (§3.10) del modelo
        oficial. Magnitudes incomparables: un conteo crudo no se compara ni se
        suma con un valor en puntos.
      </p>
    </Seccion>
  )
}
