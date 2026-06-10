import { useEffect, useRef, useState } from 'react'
import { getResourceContent } from '../services/ovaCreationService.js'

// Loads the HTML of a `done` resource for preview (B3). State + service call
// only — the fetch itself lives in ovaCreationService (R9). Ignores stale
// responses when the selected resource changes mid-flight. `loading` is derived
// (no synchronous setState in the effect body) to avoid cascading renders.
export function useResourceContent(jobId, resourceId, enabled) {
  const [state, setState] = useState({ key: null, content: null, error: '' })
  const reqRef = useRef(0)
  const key = enabled && jobId && resourceId ? `${jobId}:${resourceId}` : null

  useEffect(() => {
    if (!key) return
    const reqId = reqRef.current + 1
    reqRef.current = reqId
    getResourceContent(jobId, resourceId)
      .then((data) => {
        if (reqRef.current === reqId) setState({ key, content: data?.content ?? '', error: '' })
      })
      .catch((err) => {
        if (reqRef.current === reqId) {
          setState({ key, content: null, error: err?.message || 'No se pudo cargar la vista previa.' })
        }
      })
  }, [key, jobId, resourceId])

  const settled = state.key === key
  return {
    content: settled ? state.content : null,
    error: settled ? state.error : '',
    loading: Boolean(key) && !settled,
  }
}
