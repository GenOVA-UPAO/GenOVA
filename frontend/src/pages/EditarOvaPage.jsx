import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  downloadEditedScorm,
  fetchOvaEditorData,
  pollRegenProgress,
  savePhaseContent,
  triggerRegen,
} from '../services/ovaEditService.js'

const PHASE_LABELS = {
  motivacion: 'Motivación',
  contenido: 'Contenido',
  explicacion: 'Explicación',
  actividad: 'Actividad',
  evaluacion: 'Evaluación',
}

function ConfirmModal({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{message}</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PhaseCard({
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

  useEffect(() => {
    if (!editing) setDraft(phase.content)
  }, [phase.content, editing])

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
          <div className="grid grid-cols-2 gap-3">
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
            onClick={() => setEditing(true)}
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

function VersionHistory({ versions, open, onToggle }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>Historial de versiones ({versions.length})</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-5 py-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                v{v.version_number}
                {v.is_active && ' (actual)'}
              </span>
              <span className="text-xs text-slate-500 flex-1 truncate">
                {v.prompt ? `"${v.prompt.slice(0, 60)}${v.prompt.length > 60 ? '…' : ''}"` : '—'}
              </span>
              <span className="text-xs text-slate-400 shrink-0">
                {v.created_at ? new Date(v.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EditarOvaPage() {
  const { ovaId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [ovaData, setOvaData] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [phases, setPhases] = useState([])
  const [versions, setVersions] = useState([])
  const [currentVersionNum, setCurrentVersionNum] = useState(null)
  const [ovaStatus, setOvaStatus] = useState('')

  const [checkedPhases, setCheckedPhases] = useState(new Set())
  const [historyOpen, setHistoryOpen] = useState(false)

  const [confirmModal, setConfirmModal] = useState(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenProgress, setRegenProgress] = useState({ percentage: 0, stage: '' })
  const [downloading, setDownloading] = useState(false)

  const pollIntervalRef = useRef(null)

  const loadEditorData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchOvaEditorData(ovaId)
      setOvaData(data)
      setOvaStatus(data.status)
      setPrompt(data.current_version?.prompt || '')
      setPhases(data.current_version?.phases || [])
      setVersions(data.version_history || [])
      setCurrentVersionNum(data.current_version?.version_number || null)
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar el editor del OVA.')
      if (err.message?.includes('permiso') || err.message?.includes('403')) {
        navigate('/mis-ovas')
      }
    } finally {
      setLoading(false)
    }
  }, [ovaId, navigate])

  useEffect(() => {
    loadEditorData()
    return () => clearInterval(pollIntervalRef.current)
  }, [loadEditorData])

  const startPolling = (jobId) => {
    setIsRegenerating(true)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const prog = await pollRegenProgress(ovaId, jobId)
        setRegenProgress({ percentage: prog.percentage, stage: prog.stage })

        if (prog.status === 'success') {
          clearInterval(pollIntervalRef.current)
          setIsRegenerating(false)
          toast.success(`OVA regenerado. Nueva versión v${prog.new_version_number} creada.`)
          await loadEditorData()
        } else if (prog.status === 'error') {
          clearInterval(pollIntervalRef.current)
          setIsRegenerating(false)
          toast.error('Error al regenerar el OVA.')
          await loadEditorData()
        }
      } catch {
        clearInterval(pollIntervalRef.current)
        setIsRegenerating(false)
      }
    }, 1500)
  }

  const handleToggleCheck = (phaseId) => {
    setCheckedPhases((prev) => {
      const next = new Set(prev)
      next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId)
      return next
    })
  }

  const handleToggleAll = () => {
    if (checkedPhases.size === phases.length) {
      setCheckedPhases(new Set())
    } else {
      setCheckedPhases(new Set(phases.map((p) => p.id)))
    }
  }

  const handleSavePhase = async (phaseId, content) => {
    try {
      const res = await savePhaseContent(ovaId, phaseId, content)
      toast.success(res.message || 'Fase guardada.')
      await loadEditorData()
    } catch (err) {
      toast.error(err.message || 'Error al guardar la fase.')
      throw err
    }
  }

  const executeRegen = async (regenPrompt, faseIds) => {
    try {
      const res = await triggerRegen(ovaId, { prompt: regenPrompt, faseIds })
      setOvaStatus('generando')
      setCheckedPhases(new Set())
      startPolling(res.job_id)
    } catch (err) {
      toast.error(err.message || 'Error al iniciar la regeneración.')
    }
  }

  const handleRegenSingle = (phaseId, label) => {
    setConfirmModal({
      title: 'Regenerar fase',
      message: `¿Regenerar la fase "${label}"?\n\nEl contenido actual quedará archivado en la versión ${currentVersionNum}.`,
      onConfirm: () => {
        setConfirmModal(null)
        executeRegen(prompt, [phaseId])
      },
    })
  }

  const handleRegenSelected = () => {
    const selectedLabels = phases
      .filter((p) => checkedPhases.has(p.id))
      .map((p) => PHASE_LABELS[p.phase_type] || p.phase_type)
      .join(', ')

    setConfirmModal({
      title: 'Regenerar fases seleccionadas',
      message: `Se regenerarán las fases:\n• ${selectedLabels}\n\nEsto creará la versión v${(currentVersionNum || 0) + 1}. Las demás fases no se modificarán.`,
      onConfirm: () => {
        setConfirmModal(null)
        executeRegen(prompt, [...checkedPhases])
      },
    })
  }

  const handleRegenFull = () => {
    setConfirmModal({
      title: 'Regenerar OVA completo',
      message: `Se regenerarán TODAS las fases usando ${prompt !== ovaData?.current_version?.prompt ? 'el nuevo prompt' : 'el prompt actual'}.\n\nEsto creará la versión v${(currentVersionNum || 0) + 1}. El contenido actual quedará archivado.`,
      onConfirm: () => {
        setConfirmModal(null)
        executeRegen(prompt, [])
      },
    })
  }

  const handleExportScorm = async () => {
    setDownloading(true)
    try {
      await downloadEditedScorm(ovaId)
    } catch (err) {
      toast.error(err.message || 'Error al exportar SCORM.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="text-xs text-slate-400">Cargando editor...</p>
        </div>
      </div>
    )
  }

  if (!ovaData) return null

  const selectedCount = checkedPhases.size
  const isReady = ovaStatus === 'listo'

  return (
    <div className="space-y-6">
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          loading={isRegenerating}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            onClick={() => navigate('/mis-ovas')}
            className="mb-1 text-xs text-indigo-600 hover:underline font-medium"
          >
            ← Volver a Mis OVAs
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Editar OVA
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{ovaData.title}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currentVersionNum && (
            <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
              v{currentVersionNum}
            </span>
          )}
          <button
            onClick={handleExportScorm}
            disabled={!isReady || downloading || isRegenerating}
            title={!isReady ? 'El OVA debe estar listo para exportar' : 'Exportar como SCORM'}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {downloading ? 'Exportando...' : 'Exportar SCORM'}
          </button>
        </div>
      </div>

      {/* Regen progress bar */}
      {isRegenerating && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-indigo-700">{regenProgress.stage}</span>
            <span className="text-indigo-600 font-bold">{regenProgress.percentage}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-indigo-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${regenProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Prompt section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Prompt original</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isRegenerating}
          rows={4}
          className="w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none disabled:opacity-50 disabled:bg-slate-50"
          placeholder="Prompt del OVA..."
        />
        <button
          onClick={handleRegenFull}
          disabled={isRegenerating}
          className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ↺ Regenerar OVA completo
        </button>
      </div>

      {/* Phases section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Fases del OVA</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAll}
              disabled={isRegenerating}
              className="text-xs text-indigo-600 hover:underline font-medium disabled:opacity-40"
            >
              {checkedPhases.size === phases.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </button>
            {selectedCount > 0 && (
              <button
                onClick={handleRegenSelected}
                disabled={isRegenerating}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-40"
              >
                ↺ Regenerar seleccionadas ({selectedCount})
              </button>
            )}
          </div>
        </div>

        {phases.map((phase) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            checked={checkedPhases.has(phase.id)}
            onCheckToggle={handleToggleCheck}
            onRegenSingle={handleRegenSingle}
            onSave={handleSavePhase}
            isRegenerating={isRegenerating}
            regenProgress={regenProgress}
          />
        ))}
      </div>

      {/* Version history */}
      <VersionHistory
        versions={versions}
        open={historyOpen}
        onToggle={() => setHistoryOpen((o) => !o)}
      />
    </div>
  )
}
