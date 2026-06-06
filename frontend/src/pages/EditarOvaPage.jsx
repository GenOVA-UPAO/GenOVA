import { useNavigate, useParams } from 'react-router'
import { useRegenEditor } from '../hooks/useRegenEditor.js'
import { ConfirmModal } from '../components/ConfirmModal.jsx'
import { PhaseCard } from '../components/PhaseCard.jsx'
import { VersionHistory } from '../components/VersionHistory.jsx'
import { downloadEditedScorm } from '../services/ovaEditService.js'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function EditarOvaPage() {
  const { ovaId } = useParams()
  const navigate = useNavigate()

  const {
    loading, ovaData, prompt, setPrompt, phases, versions, currentVersionNum,
    checkedPhases, historyOpen, setHistoryOpen, confirmModal, setConfirmModal,
    isRegenerating, regenProgress, downloading, setDownloading, selectedCount,
    isReady, handleToggleCheck, handleToggleAll, handleSavePhase,
    handleRegenSingle, handleRegenSelected, handleRegenFull,
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-xs text-muted-foreground">Cargando editor...</p>
        </div>
      </div>
    )
  }

  if (!ovaData) return null

  return (
    <div className="space-y-6">
      {confirmModal ? (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel="Confirmar"
          danger={false}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          isLoading={isRegenerating}
        />
      ) : null}

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate('/mis-ovas')}
            className="mb-1 h-auto p-0 text-xs"
          >
            ← Volver a Mis OVAs
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Editar OVA</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{ovaData.title}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currentVersionNum ? (
            <Badge variant="outline" className="rounded-full">v{currentVersionNum}</Badge>
          ) : null}
          <Button
            onClick={handleExportScorm}
            disabled={!isReady || downloading || isRegenerating}
            title={!isReady ? 'El OVA debe estar listo para exportar' : 'Exportar como SCORM'}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {downloading ? 'Exportando...' : 'Exportar SCORM'}
          </Button>
        </div>
      </div>

      {isRegenerating ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-primary">{regenProgress.stage}</span>
            <span className="text-primary font-bold">{regenProgress.percentage}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-primary/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${regenProgress.percentage}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-background p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">Prompt original</h2>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isRegenerating}
          rows={4}
          className="resize-none"
          placeholder="Prompt del OVA..."
        />
        <Button
          variant="outline"
          onClick={handleRegenFull}
          disabled={isRegenerating}
          className="text-primary border-primary/30 hover:bg-primary/5"
        >
          ↺ Regenerar OVA completo
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Fases del OVA</h2>
          <div className="flex items-center gap-2">
            <Button variant="link" size="sm" onClick={handleToggleAll} disabled={isRegenerating} className="h-auto p-0 text-xs">
              {checkedPhases.size === phases.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </Button>
            {selectedCount > 0 ? (
              <Button size="sm" onClick={handleRegenSelected} disabled={isRegenerating}>
                ↺ Regenerar seleccionadas ({selectedCount})
              </Button>
            ) : null}
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
