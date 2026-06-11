import { useCallback, useEffect, useRef } from 'react'
import { SPLIT_MIN, SPLIT_MAX, saveSplitRatio } from '../../lib/workspaceUtils.js'

/**
 * HU-025 — drag handle between workspace panels.
 * Calls onRatioChange(ratio) while dragging.
 * Persists ratio to localStorage on drag end.
 */
export function WorkspaceResizableDivider({ onRatioChange, containerRef }) {
  const dragging = useRef(false)

  const clamp = (r) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, r))

  const startDrag = useCallback(() => {
    dragging.current = true
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }, [])

  useEffect(() => {
    let lastRatio = null
    let rafId = 0
    let pendingX = 0

    // Coalesce mousemove bursts to one ratio update per frame (Vercel:
    // rerender-transitions) — parent layout re-renders at most once per paint.
    const flush = () => {
      rafId = 0
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      lastRatio = clamp((pendingX - rect.left) / rect.width)
      onRatioChange(lastRatio)
    }

    const onMove = (e) => {
      if (!dragging.current) return
      pendingX = e.clientX
      if (!rafId) rafId = requestAnimationFrame(flush)
    }

    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      if (lastRatio !== null) saveSplitRatio(lastRatio)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseup', onUp)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onRatioChange, containerRef])

  return (
    <div
      className="hidden sm:flex w-2 shrink-0 cursor-col-resize items-center justify-center group"
      onMouseDown={startDrag}
      role="separator"
      aria-label="Ajustar paneles"
    >
      <div className="h-16 w-0.5 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
    </div>
  )
}
