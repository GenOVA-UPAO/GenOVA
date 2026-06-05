import { useMemo } from 'react'
import { HtmlPreview } from '../engage/HtmlPreview.jsx'
import { useResourceContent } from '../../hooks/useResourceContent.js'

// Previews a single `done` resource by loading its HTML on demand (B3) and
// reusing the existing HtmlPreview. Done resources stay previewable even when
// another resource failed (R1).
export function ResourcePreview({ jobId, resource, concept }) {
  const enabled = Boolean(resource && resource.status === 'check')
  const { content, loading, error } = useResourceContent(jobId, resource?.id, enabled)

  const result = useMemo(() => {
    if (!content) return null
    return {
      html_content: content,
      tipo: resource.label,
      emoji: resource.emoji,
      concepto: concept || '',
      resource_type: resource.label,
      duracion: '—',
      interactividad: '—',
    }
  }, [content, resource, concept])

  if (!enabled) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Vista previa · {resource.emoji} {resource.label}
      </p>
      {loading && <p className="text-sm text-slate-500">Cargando vista previa…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {result && <HtmlPreview result={result} />}
    </div>
  )
}
