import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Renders HTML content with a toggle between iframe preview and raw code view.
 * Falls back to plain text when content is not HTML.
 */

function looksLikeHtml(content) {
  if (!content) return false
  const t = content.trimStart()
  return t.startsWith('<')
}

function ViewToggle({ view, onSwitch, charCount }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onSwitch('preview')}
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
        onClick={() => onSwitch('code')}
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
          view === 'code'
            ? 'bg-slate-700 text-white shadow-sm'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        Código
      </button>
      {view === 'code' && (
        <span className="ml-auto text-[10px] text-slate-400">
          {charCount.toLocaleString()} chars
        </span>
      )}
    </div>
  )
}

export function HtmlCodePreview({ htmlContent, defaultView = 'preview', height = '60vh' }) {
  const [view, setView] = useState(defaultView)
  const iframeRef = useRef(null)

  const blobUrl = useMemo(() => {
    if (!htmlContent) return null
    return URL.createObjectURL(new Blob([htmlContent], { type: 'text/html' }))
  }, [htmlContent])

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  if (!htmlContent) return null

  if (!looksLikeHtml(htmlContent)) {
    return <p className="text-sm text-slate-700 whitespace-pre-wrap">{htmlContent}</p>
  }

  return (
    <div className="space-y-2">
      <ViewToggle view={view} onSwitch={setView} charCount={htmlContent.length} />

      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {view === 'preview' ? (
          blobUrl && (
            <iframe
              ref={iframeRef}
              src={blobUrl}
              title="Vista previa del recurso"
              className="w-full border-0 block"
              style={{ height }}
              sandbox="allow-scripts allow-same-origin"
            />
          )
        ) : (
          <>
            <div className="flex items-center bg-slate-800 px-3 py-2">
              <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-slate-400">
                HTML
              </span>
            </div>
            <pre className="max-h-[420px] overflow-auto bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-200">
              <code>{htmlContent}</code>
            </pre>
          </>
        )}
      </div>
    </div>
  )
}
