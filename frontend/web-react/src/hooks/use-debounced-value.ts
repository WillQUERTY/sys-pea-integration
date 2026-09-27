import { useEffect, useState } from 'react'

/**
 * Devuelve el valor con retardo (debounce). Útil para búsquedas server-side:
 * la vista guarda el texto crudo y consulta con el valor debounceado.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])

  return debounced
}
