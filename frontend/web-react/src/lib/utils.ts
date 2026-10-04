import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generates page numbers for pagination with ellipsis
 * @param currentPage - Current page number (1-based)
 * @param totalPages - Total number of pages
 * @returns Array of page numbers and ellipsis strings
 *
 * Examples:
 * - Small dataset (≤5 pages): [1, 2, 3, 4, 5]
 * - Near beginning: [1, 2, 3, 4, '...', 10]
 * - In middle: [1, '...', 4, 5, 6, '...', 10]
 * - Near end: [1, '...', 7, 8, 9, 10]
 */
export function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5 // Maximum number of page buttons to show
  const rangeWithDots = []

  if (totalPages <= maxVisiblePages) {
    // If total pages is 5 or less, show all pages
    for (let i = 1; i <= totalPages; i++) {
      rangeWithDots.push(i)
    }
  } else {
    // Always show first page
    rangeWithDots.push(1)

    if (currentPage <= 3) {
      // Near the beginning: [1] [2] [3] [4] ... [10]
      for (let i = 2; i <= 4; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      // Near the end: [1] ... [7] [8] [9] [10]
      rangeWithDots.push('...')
      for (let i = totalPages - 3; i <= totalPages; i++) {
        rangeWithDots.push(i)
      }
    } else {
      // In the middle: [1] ... [4] [5] [6] ... [10]
      rangeWithDots.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    }
  }

  return rangeWithDots
}

/**
 * Initials from a display name: first character of the first word + first
 * character of the last word. One word only: first two characters. Empty: `?`.
 */
export function getDisplayNameInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  const first = parts[0][0] ?? ''
  const last = parts[parts.length - 1]?.[0] ?? ''
  return (first + last).toUpperCase()
}

/**
 * Normaliza las cadenas de clasificación de GrupLAC / Minciencias
 * (que con frecuencia vienen como "Bcon vigencia hasta la publicación de los resultados..."
 * o "A1 con vigencia...") a códigos limpios, etiquetas legibles y estilos temáticos.
 */
export function parseMincienciasClassification(raw?: string | null) {
  if (!raw) {
    return {
      code: 'Sin clasificar',
      badgeText: 'Sin clasificar',
      tier: 'No reconocido',
      colorClass: 'bg-slate-400',
      badgeVariant: 'border-slate-500/30 text-slate-700 dark:text-slate-300 bg-slate-500/10',
      priority: 99,
      rawText: '',
    }
  }

  const clean = raw.trim()

  let code = 'Sin clasificar'
  let tier = 'Institucional'
  let colorClass = 'bg-slate-400'
  let badgeVariant = 'border-slate-500/30 text-slate-700 dark:text-slate-300 bg-slate-500/10'
  let priority = 50

  if (/^(?:CAT(?:EGOR[IÍ]A)?\.?\s*)?A1(\b|CON|\s|$)/i.test(clean) || /\bA1\b/i.test(clean)) {
    code = 'A1'
    tier = 'Máxima Excelencia'
    colorClass = 'bg-amber-500'
    badgeVariant = 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10'
    priority = 1
  } else if (/^(?:CAT(?:EGOR[IÍ]A)?\.?\s*)?A(\b|CON|\s|$)/i.test(clean) || /\bCAT(?:EGOR[IÍ]A)?\s+A\b/i.test(clean)) {
    code = 'A'
    tier = 'Nivel Avanzado'
    colorClass = 'bg-emerald-500'
    badgeVariant = 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
    priority = 2
  } else if (/^(?:CAT(?:EGOR[IÍ]A)?\.?\s*)?B(\b|CON|\s|$)/i.test(clean) || /\bCAT(?:EGOR[IÍ]A)?\s+B\b/i.test(clean)) {
    code = 'B'
    tier = 'Consolidado'
    colorClass = 'bg-blue-500'
    badgeVariant = 'border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10'
    priority = 3
  } else if (/^(?:CAT(?:EGOR[IÍ]A)?\.?\s*)?C(\b|CON|\s|$)/i.test(clean) || /\bCAT(?:EGOR[IÍ]A)?\s+C\b/i.test(clean)) {
    code = 'C'
    tier = 'En Formación'
    colorClass = 'bg-indigo-500'
    badgeVariant = 'border-indigo-500/40 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10'
    priority = 4
  } else if (/NO\s+RECONOCIDO|SIN\s+CLASIFICAR/i.test(clean)) {
    code = 'Sin clasificar'
    tier = 'No categorizado'
    colorClass = 'bg-slate-400'
    badgeVariant = 'border-slate-500/30 text-slate-700 dark:text-slate-300 bg-slate-500/10'
    priority = 6
  } else if (/RECONOCIDO/i.test(clean)) {
    code = 'Reconocido'
    tier = 'Aval Institucional'
    colorClass = 'bg-teal-500'
    badgeVariant = 'border-teal-500/40 text-teal-700 dark:text-teal-300 bg-teal-500/10'
    priority = 5
  } else {
    code = clean.length > 12 ? clean.slice(0, 10) + '…' : clean
    tier = 'Institucional'
    priority = 10
  }

  const badgeText = ['A1', 'A', 'B', 'C'].includes(code) ? `Cat. ${code}` : code

  return {
    code,
    badgeText,
    tier,
    colorClass,
    badgeVariant,
    priority,
    rawText: clean,
  }
}


/** Normaliza nombres en MAY�SCULAS/min�sculas a Title Case (es), preservando part�culas (de, del, la�). */
export function toTitleCase(value?: string | null): string {
  if (!value) return ''
  const small = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e'])
  return value
    .toLocaleLowerCase('es-CO')
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && small.has(w) ? w : w.charAt(0).toLocaleUpperCase('es-CO') + w.slice(1)
    )
    .join(' ')
}