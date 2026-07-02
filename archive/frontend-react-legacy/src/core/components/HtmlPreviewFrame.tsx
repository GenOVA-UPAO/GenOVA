/**
 * Componente base de iframe sandboxed para preview HTML.
 * Gestiona el ciclo de vida del blob URL (crear → revocar en cleanup).
 *
 * Usado por:
 *   - core/components/HtmlCodePreview.tsx
 *   - features/student/components/engage/HtmlPreview.tsx
 *   - features/ova_workspace/components/editor/WorkspaceHtmlPreview.tsx
 */
import { useEffect, useRef } from 'react'

export interface HtmlPreviewFrameProps {
  html: string
  height?: string
  className?: string
  title?: string
}

export function HtmlPreviewFrame({
  html,
  height = '60vh',
  className = 'w-full border-0 block',
  title = 'Vista previa del recurso',
}: HtmlPreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!html) return
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    if (iframeRef.current) iframeRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [html])

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className={className}
      style={height ? { height } : undefined}
      sandbox="allow-scripts allow-same-origin"
    />
  )
}
