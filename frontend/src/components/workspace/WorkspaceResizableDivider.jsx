import { useCallback, useEffect, useRef } from 'react'
import { DotsSixVertical } from '@phosphor-icons/react'
import { SPLIT_MIN, SPLIT_MAX, saveSplitRatio } from '../../lib/workspaceUtils.js'

/**
 * HU-025 — drag handle between workspace panels.
 * Calls onRatioChange(ratio) while dragging; arrow keys nudge ±2%.
 * Persists ratio to localStorage on drag end.
 */
export function WorkspaceResizableDivider({ ratio, onRatioChange, containerRef }) {
  const dragging = useRef(false)

  const clamp = (r) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, r))

  const nudge = (delta) => {
    const next = clamp((ratio ?? 0.38) + delta)
    onRatioChange(next)
    saveSplitRatio(next)
  }

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
      className="hidden sm:flex w-3 shrink-0 cursor-col-resize items-center justify-center group outline-none transition-colors hover:bg-primary/10 active:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring/50"
      onMouseDown={startDrag}
      role="separator"
      aria-label="Ajustar paneles"
      aria-orientation="vertical"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          nudge(-0.02)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          nudge(0.02)
        }
      }}
    >
      <div className="relative flex items-center justify-center">
        <div className="h-16 w-0.5 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
        <DotsSixVertical size={14} weight="bold" className="absolute rounded bg-background text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      </div>
    </div>
  )
}
