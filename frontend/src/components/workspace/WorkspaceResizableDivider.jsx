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

    const onMove = (e) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      lastRatio = clamp((e.clientX - rect.left) / rect.width)
      onRatioChange(lastRatio)
    }

    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      if (lastRatio !== null) saveSplitRatio(lastRatio)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
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
