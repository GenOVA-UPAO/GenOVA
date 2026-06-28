import { useState } from 'react'
import { Button } from '@/core/components/ui/button'
import { HtmlPreviewFrame } from '@/core/components/HtmlPreviewFrame'
import type { PreviewResult } from '../../lib/types'

// El iframe permanece en DOM via CSS hidden — nunca se desmonta —
// así el blob URL no se revoca al alternar vistas (StrictMode-safe).
export function HtmlPreview({ result }: { result?: PreviewResult }) {
  const [view, setView] = useState<'preview' | 'code'>('preview')

  function downloadHtml() {
    if (!result?.html_content) return
    const blob = new Blob([result.html_content], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `engage-${result.resource_type}-${result.concepto?.replace(/\s+/g, '_')}.html`
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
          <Button onClick={downloadHtml}>Descargar HTML</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <HtmlPreviewFrame
          html={result.html_content ?? ''}
          className={`w-full h-[60vh] min-h-[240px] max-h-[640px] border-0 block${view === 'preview' ? '' : ' hidden'}`}
          height=""
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
