import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

/**
 * HU-028 — Version history dialog.
 * Shows all OVA versions; allows selecting two to diff side-by-side,
 * and reverting to any prior version with confirmation.
 */
export function VersionHistoryPanel({ open, onOpenChange, versions, currentVersionId, onRevert, onDiff }) {
  const [diffLeft, setDiffLeft] = useState(null)
  const [diffRight, setDiffRight] = useState(null)
  const [diffData, setDiffData] = useState(null)
  const [diffLoading, setDiffLoading] = useState(false)

  async function handleDiff() {
    if (!diffLeft || !diffRight || !onDiff) return
    setDiffLoading(true)
    try {
      const data = await onDiff(diffLeft, diffRight)
      setDiffData(data)
    } catch {
      setDiffData(null)
    } finally {
      setDiffLoading(false)
    }
  }

  async function handleRevert(version) {
    if (!window.confirm(`¿Revertir al OVA v${version.version_number}? Se perderán los cambios no guardados.`)) return
    await onRevert?.(version.id)
    onOpenChange(false)
  }

  const sorted = [...(versions ?? [])].sort((a, b) => b.version_number - a.version_number)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de versiones</DialogTitle>
          <DialogDescription>Compara o revierte a una versión anterior del OVA.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {sorted.map((v) => {
            const isCurrent = v.id === currentVersionId || v.is_active
            return (
              <div key={v.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <Badge variant={isCurrent ? 'default' : 'outline'} className="shrink-0">
                  v{v.version_number}
                </Badge>
                <span className="flex-1 text-xs text-muted-foreground truncate">
                  {v.created_at ? new Date(v.created_at).toLocaleString() : '—'}
                </span>
                {!isCurrent ? (
                  <Button
                    type="button" size="sm" variant="outline"
                    className="h-6 text-xs px-2 shrink-0"
                    onClick={() => handleRevert(v)}
                  >
                    Revertir
                  </Button>
                ) : (
                  <span className="text-[10px] text-muted-foreground">actual</span>
                )}
                <input
                  type="checkbox"
                  className="h-3 w-3 shrink-0"
                  title="Seleccionar para comparar"
                  checked={diffLeft === v.id || diffRight === v.id}
                  onChange={(e) => {
                    if (e.target.checked) {
                      if (!diffLeft) setDiffLeft(v.id)
                      else if (!diffRight && v.id !== diffLeft) setDiffRight(v.id)
                    } else {
                      if (diffLeft === v.id) setDiffLeft(null)
                      if (diffRight === v.id) setDiffRight(null)
                      setDiffData(null)
                    }
                  }}
                />
              </div>
            )
          })}
        </div>

        {diffLeft && diffRight ? (
          <Button
            type="button" size="sm" variant="secondary" className="mt-2 w-full text-xs"
            onClick={handleDiff} disabled={diffLoading}
          >
            {diffLoading ? 'Cargando diff…' : 'Ver comparación'}
          </Button>
        ) : null}

        {diffData ? (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div>
              <p className="font-semibold mb-1">v{diffData.v1?.version?.version_number}</p>
              {(diffData.v1?.phases ?? []).map((p) => (
                <div key={p.id} className="mb-2 rounded bg-muted/40 p-1.5">
                  <span className="font-semibold text-muted-foreground">{p.phase_type}</span>
                  <pre className="mt-0.5 whitespace-pre-wrap max-h-24 overflow-auto">{p.content || '—'}</pre>
                </div>
              ))}
            </div>
            <div>
              <p className="font-semibold mb-1">v{diffData.v2?.version?.version_number}</p>
              {(diffData.v2?.phases ?? []).map((p) => (
                <div key={p.id} className="mb-2 rounded bg-muted/40 p-1.5">
                  <span className="font-semibold text-muted-foreground">{p.phase_type}</span>
                  <pre className="mt-0.5 whitespace-pre-wrap max-h-24 overflow-auto">{p.content || '—'}</pre>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
