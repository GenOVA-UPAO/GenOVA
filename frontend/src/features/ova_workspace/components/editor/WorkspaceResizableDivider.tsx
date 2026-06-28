import { DotsSixVertical } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef } from 'react'
import {
  clampRatio,
  SPLIT_MAX,
  SPLIT_MIN,
  saveSplitRatio,
} from '@/features/ova_workspace/lib/workspaceUtils'

interface WorkspaceResizableDividerProps {
  ratio: number
  onRatioChange: (ratio: number) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function WorkspaceResizableDivider({
  ratio,
  onRatioChange,
  containerRef,
}: WorkspaceResizableDividerProps) {
  const dragging = useRef(false)

  const nudge = (delta: number) => {
    const next = clampRatio((ratio ?? 0.38) + delta)
    onRatioChange(next)
    saveSplitRatio(next)
  }

  const startDrag = useCallback(() => {
    dragging.current = true
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }, [])

  useEffect(() => {
    let lastRatio: number | null = null
    let rafId = 0
    let pendingX = 0

    const flush = () => {
      rafId = 0
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      lastRatio = clampRatio((pendingX - rect.left) / rect.width)
      onRatioChange(lastRatio)
    }

    const onMove = (e: MouseEvent) => {
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
    // biome-ignore lint/a11y/useSemanticElements: splitter redimensionable; role=separator con aria-valuenow es el patrón ARIA correcto (no hay elemento semántico nativo)
    <div
      className="hidden sm:flex w-3 shrink-0 cursor-col-resize items-center justify-center group outline-none transition-colors hover:bg-primary/10 active:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring/50"
      onMouseDown={startDrag}
      role="separator"
      aria-label="Ajustar paneles"
      aria-orientation="vertical"
      aria-valuenow={Math.round((ratio ?? 0.38) * 100)}
      aria-valuemin={Math.round(SPLIT_MIN * 100)}
      aria-valuemax={Math.round(SPLIT_MAX * 100)}
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
        <DotsSixVertical
          size={14}
          weight="bold"
          className="absolute rounded bg-background text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </div>
    </div>
  )
}
