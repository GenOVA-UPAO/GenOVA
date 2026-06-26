import { useEffect, useState } from 'react'
import { Button } from '@/core/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/core/components/ui/dialog'
import { fetchPhaseVersions, revertPhaseVersion } from '@/features/ova_workspace/services/ovaEditService'

/**
 * HU-029 — Micro-version history for a single phase.
 * Shows vN.M list; allows reverting to any minor version.
 */
export function PhaseVersionHistory({ open, onOpenChange, ovaId, phaseId, onReverted }) {
  const [mvs, setMvs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !ovaId || !phaseId) return
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      setLoading(true)
      try {
        const data = await fetchPhaseVersions(ovaId, phaseId)
        if (!cancelled) setMvs(data.micro_versions ?? [])
      } catch {
        if (!cancelled) setMvs([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, ovaId, phaseId])

  async function handleRevert(mv) {
    if (!window.confirm(`¿Revertir el recurso a la micro-versión ${mv.minor_number}?`)) return
    try {
      await revertPhaseVersion(ovaId, phaseId, mv.id)
      onReverted?.()
      onOpenChange(false)
    } catch {
      // error handled by toast in parent if needed
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial del recurso</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Cargando…</p>
        ) : mvs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Sin micro-versiones registradas aún.
          </p>
        ) : (
          <div className="space-y-2 mt-2">
            {mvs.map((mv) => (
              <div key={mv.id} className="rounded-md border border-border px-3 py-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">v.{mv.minor_number}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {mv.created_at ? new Date(mv.created_at).toLocaleString('es-PE') : '—'}
                  </span>
                  <Button
                    type="button" size="sm" variant="outline"
                    className="ml-auto h-5 text-[10px] px-1.5 shrink-0"
                    onClick={() => handleRevert(mv)}
                  >
                    Revertir
                  </Button>
                </div>
                <pre className="text-[10px] text-muted-foreground max-h-16 overflow-auto whitespace-pre-wrap">
                  {mv.content || '—'}
                </pre>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
