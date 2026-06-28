import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { API_BASE } from '@/core/lib/http/client'

// F2: consume el stream SSE de progreso del job y vuelca cada snapshot en la
// cache de TanStack Query (['ovaJob', jobId]) para que la UI se actualice en
// vivo. Devuelve `streaming`: useOvaJob lo usa para ralentizar el poll mientras
// el stream está sano y caer de nuevo a polling rápido si la conexión falla
// (algunos proxies bufferean SSE, por eso el poll sigue como red de seguridad).
export function useJobStream(jobId: string | null, enabled: boolean): boolean {
  const qc = useQueryClient()
  const [streaming, setStreaming] = useState(false)

  useEffect(() => {
    if (!jobId || !enabled) {
      setStreaming(false)
      return
    }
    const ctrl = new AbortController()
    let active = true

    fetchEventSource(`${API_BASE}/api/ova/jobs/${jobId}/stream`, {
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      signal: ctrl.signal,
      openWhenHidden: true,
      onopen: async (res) => {
        if (active) setStreaming(Boolean(res?.ok))
      },
      onmessage: (ev) => {
        if (ev.event !== 'progress' && ev.event !== 'done') return
        try {
          qc.setQueryData(['ovaJob', jobId], JSON.parse(ev.data))
        } catch {
          /* frame malformado: lo ignora, el poll de fallback corrige */
        }
      },
      onerror: () => {
        // Corta el reintento automático de fetchEventSource: el poll toma el relevo.
        if (active) setStreaming(false)
        throw new Error('sse-stream-failed')
      },
      onclose: () => {
        if (active) setStreaming(false)
      },
    }).catch(() => {
      if (active) setStreaming(false)
    })

    return () => {
      active = false
      setStreaming(false)
      ctrl.abort()
    }
  }, [jobId, enabled, qc])

  return streaming
}
