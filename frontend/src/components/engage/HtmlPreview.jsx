import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

// iframe stays in DOM via CSS hidden — never unmounted — so the blob URL is
// never revoked while toggling views (StrictMode-safe).
export function HtmlPreview({ result }) {
  const [view, setView] = useState('preview')
  const iframeRef = useRef(null)

  useEffect(() => {
    const html = result?.html_content
    if (!html) return
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    if (iframeRef.current) iframeRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [result?.html_content])

  function downloadHtml() {
    const blob = new Blob([result.html_content], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `engage-${result.resource_type}-${result.concepto.replace(/\s+/g, '_')}.html`
    a.click()
  }

  if (!result) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {result.emoji} {result.tipo} —{' '}
            <span className="text-primary">{result.concepto}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            ⏱ {result.duracion} · Interactividad: {result.interactividad}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={view === 'preview' ? 'default' : 'secondary'}
              onClick={() => setView('preview')}
            >
              Vista previa
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === 'code' ? 'default' : 'secondary'}
              onClick={() => setView('code')}
            >
              Código
            </Button>
          </div>
          <Button onClick={downloadHtml}>
            Descargar HTML
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <iframe
          ref={iframeRef}
          title="Vista previa del recurso"
          className={`w-full h-[60vh] min-h-[240px] max-h-[640px] border-0 block${view === 'preview' ? '' : ' hidden'}`}
          sandbox="allow-scripts allow-same-origin"
        />
        <div className={view === 'code' ? '' : 'hidden'}>
          <div className="flex items-center justify-between bg-slate-800 px-3 py-2">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-slate-400">
              HTML
            </span>
            <span className="text-[10px] text-slate-500">
              {(result.html_content?.length ?? 0).toLocaleString()} chars
            </span>
          </div>
          <pre className="max-h-[480px] overflow-auto bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-200">
            <code>{result.html_content}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
