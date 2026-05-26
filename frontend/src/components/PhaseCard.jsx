import { useState } from 'react'
import { toast } from 'sonner'

const PHASE_LABELS = {
  motivacion: 'Motivación',
  contenido: 'Contenido',
  explicacion: 'Explicación',
  actividad: 'Actividad',
  evaluacion: 'Evaluación',
}

export function PhaseCard({
  phase,
  checked,
  onCheckToggle,
  onRegenSingle,
  onSave,
  isRegenerating,
  regenProgress,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(phase.content)
  const [saving, setSaving] = useState(false)
  const label = PHASE_LABELS[phase.phase_type] || phase.phase_type

  const handleSave = async () => {
    if (!draft.trim()) {
      toast.error('El contenido no puede estar vacío.')
      return
    }
    setSaving(true)
    try {
      await onSave(phase.id, draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const isLoading = isRegenerating && regenProgress?.regenningPhases?.includes(phase.id)

  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm transition-all ${checked ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3 mb-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onCheckToggle(phase.id)}
          disabled={isRegenerating}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
        <span className="text-sm font-semibold text-slate-800">
          {phase.phase_order}. {label}
        </span>
        {phase.regenerated && (
          <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-indigo-600 font-medium">
            IA
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          <span className="text-xs text-slate-500">Regenerando fase...</span>
        </div>
      ) : editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Editor</p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Vista previa</p>
              <div className="h-full min-h-[120px] rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap overflow-auto">
                {draft || <span className="text-slate-300 italic">Sin contenido</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar fase'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-4 mb-3">
          {phase.content}
        </p>
      )}

      {!editing && !isLoading && (
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => {
              setDraft(phase.content)
              setEditing(true)
            }}
            disabled={isRegenerating}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✏ Editar
          </button>
          <button
            onClick={() => onRegenSingle(phase.id, label)}
            disabled={isRegenerating}
            className="flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↺ Regenerar
          </button>
        </div>
      )}
    </div>
  )
}
