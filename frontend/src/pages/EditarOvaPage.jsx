import { useNavigate, useParams } from 'react-router'
import { useRegenEditor } from '../hooks/useRegenEditor.js'
import { ConfirmModal } from '../components/ConfirmModal.jsx'
import { PhaseCard } from '../components/PhaseCard.jsx'
import { VersionHistory } from '../components/VersionHistory.jsx'
import { downloadEditedScorm } from '../services/ovaEditService.js'
import { toast } from 'sonner'

export function EditarOvaPage() {
  const { ovaId } = useParams()
  const navigate = useNavigate()

  const {
    loading,
    ovaData,
    prompt,
    setPrompt,
    phases,
    versions,
    currentVersionNum,
    checkedPhases,
    historyOpen,
    setHistoryOpen,
    confirmModal,
    setConfirmModal,
    isRegenerating,
    regenProgress,
    downloading,
    setDownloading,
    selectedCount,
    isReady,
    handleToggleCheck,
    handleToggleAll,
    handleSavePhase,
    handleRegenSingle,
    handleRegenSelected,
    handleRegenFull,
  } = useRegenEditor()

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

  return (
    <div className="space-y-6">
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel="Confirmar"
          danger={false}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          isLoading={isRegenerating}
        />
      )}

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

      <VersionHistory
        versions={versions}
        open={historyOpen}
        onToggle={() => setHistoryOpen((o) => !o)}
      />
    </div>
  )
}
