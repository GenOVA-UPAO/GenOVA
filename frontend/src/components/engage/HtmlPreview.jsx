import { useEffect, useMemo, useRef } from 'react'

export function HtmlPreview({ result }) {
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
            {result.emoji} {result.tipo} — <span className="text-indigo-600">{result.concepto}</span>
          </p>
          <p className="text-xs text-slate-500">⏱ {result.duracion} · Interactividad: {result.interactividad}</p>
        </div>
        <button
          onClick={downloadHtml}
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Descargar HTML
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {blobUrl && (
          <iframe
            ref={iframeRef}
            src={blobUrl}
            title="Vista previa del recurso"
            className="w-full h-[60vh] min-h-[320px] max-h-[640px] border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </div>
  )
}
