import { useEffect } from 'react'

/**
 * Cierre por teclado para modales custom (no-radix).
 *
 * Los modales con backdrop propio solo cerraban con click en el backdrop, sin
 * paridad de teclado (Web Interface Guidelines: las acciones interactivas
 * necesitan handler de teclado). Este hook escucha Escape a nivel documento y
 * llama a onClose, replicando lo que radix Dialog hace por defecto.
 *
 * Usa la fase de captura para no chocar con otros listeners de Escape (p. ej.
 * selects abiertos) y se limpia al desmontar.
 */
export function useModalDismiss(onClose) {
  useEffect(() => {
    if (!onClose) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])
}
