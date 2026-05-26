import { useEffect, useMemo, useRef, useState } from 'react'

export function HtmlPreview({ result }) {
  const [view, setView] = useState('preview')
  const iframeRef = useRef(null)

  const blobUrl = useMemo(() => {
    const html = result?.html_content
    if (!html) return null
    return URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  }, [result?.html_content])

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

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
          <p className="text-sm font-semibold text-slate-800">
            {result.emoji} {result.tipo} —{' '}
            <span className="text-indigo-600">{result.concepto}</span>
          </p>
          <p className="text-xs text-slate-500">
            ⏱ {result.duracion} · Interactividad: {result.interactividad}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setView('preview')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                view === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Vista previa
            </button>
            <button
              type="button"
              onClick={() => setView('code')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                view === 'code'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Código
            </button>
          </div>
          <button
            onClick={downloadHtml}
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Descargar HTML
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {view === 'preview' ? (
          blobUrl && (
            <iframe
              ref={iframeRef}
              src={blobUrl}
              title="Vista previa del recurso"
              className="w-full h-[60vh] min-h-[240px] max-h-[640px] border-0 block"
              sandbox="allow-scripts allow-same-origin"
            />
          )
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
