import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FileChip } from './FileChip.jsx'
import { SelectionChips } from './SelectionChips.jsx'
import { OvaThemeSelector } from './OvaThemeSelector.jsx'
import { LlmEnginesPanel } from '../LlmEnginesPanel.jsx'
import { ProgressPanel } from './ProgressPanel.jsx'
import { TotalFailurePanel } from './TotalFailurePanel.jsx'
import { LlmSettingsModal } from '../workspace/LlmSettingsModal.jsx'
import { GearButton } from '../settings/GearButton.jsx'

/**
 * Left panel for creation workspace. Mirrors WorkspaceChatPanel structure:
 * - Scrollable body: resource config + progress during generation
 * - Bottom-docked: prompt textarea + file attach + generate button
 */
export function CrearOvaChatPanel({
  prompt, setPrompt, minChars,
  canConfigure, canGenerate, isGenerating, isDone,
  openModal, engageSelection, exploreSelection, totalResources,
  theme, setTheme,
  generate, reset, error,
  uploadsProps,
  // generation state (shown in scrollable body during/after gen)
  hasJob, job: jobData, viewModel, outcome, selectedFailedIds,
  jobToggleFailed, jobRetryOne, jobSelectAllFailed, jobRetrySelected, onPreviewPin, activeId,
}) {
  const fileInputRef = useRef(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { uploads, activeUploadsCount, maxUploadFiles, isUploadingFiles,
    uploadError, onFilesSelected, onRemove, disabled } = uploadsProps

  const canUploadMore = activeUploadsCount < maxUploadFiles
  const hasFiles = uploads.length > 0
  const hasResources = engageSelection.length > 0 || exploreSelection.length > 0

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files?.length > 0) void onFilesSelected(e.dataTransfer.files)
  }

  const handleFileChange = (e) => {
    void onFilesSelected(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <LlmSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Scrollable body — resource config + progress */}
      <div className="flex-1 overflow-y-auto">

        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Crear OVA
          </p>
          <GearButton onClick={() => setSettingsOpen(true)} />
        </div>

        {/* Resource selection */}
        <div className="px-4 space-y-3 pb-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">Recursos 5E</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs shrink-0"
              onClick={openModal}
              disabled={!canConfigure || isGenerating}
            >
              {hasResources ? 'Editar selección' : 'Configurar recursos'}
            </Button>
          </div>

          {hasResources ? (
            <SelectionChips
              engage={engageSelection}
              explore={exploreSelection}
              onEdit={openModal}
              editable={false}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Elige hasta 4 recursos por fase (ENGAGE + EXPLORE).
            </p>
          )}

          <OvaThemeSelector theme={theme} onChange={setTheme} disabled={isGenerating} />

          <LlmEnginesPanel />

          <p className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px] text-amber-800">
            <b>Video:</b> Sin modelo disponible. Usa HeyGen, Synthesia o Sora con el contenido generado.
          </p>
        </div>

        {/* Progress (shown during/after generation) */}
        {hasJob && viewModel.length > 0 ? (
          <div className="border-t border-border px-4 pt-3 pb-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Generación
            </p>
            <ProgressPanel
              job={jobData} viewModel={viewModel}
              selectedIds={selectedFailedIds} activeId={activeId}
              onToggle={jobToggleFailed} onRetryOne={jobRetryOne}
              onPreview={onPreviewPin}
              onSelectAll={jobSelectAllFailed} onRetrySelected={jobRetrySelected}
            />
          </div>
        ) : null}

        {isDone && outcome?.totalFail ? (
          <div className="border-t border-border px-4 pt-3 pb-4">
            <TotalFailurePanel viewModel={viewModel} onRetryAll={reset} />
          </div>
        ) : null}

        {isDone && !outcome?.totalFail ? (
          <div className="border-t border-border px-4 pt-3 pb-4">
            <Button type="button" variant="link" size="sm" className="p-0 h-auto text-xs" onClick={reset}>
              ← Crear otro OVA
            </Button>
          </div>
        ) : null}
      </div>

      {/* Bottom-docked: prompt + file attach + generate */}
      <div
        className="border-t border-border bg-muted/20 p-3 space-y-2 shrink-0"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {hasFiles ? (
          <div className="flex flex-wrap gap-1.5">
            {uploads.map((u) => (
              <FileChip key={u.clientId} file={u} onRemove={onRemove} disabled={isGenerating || disabled} />
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe el tema de tu OVA… (mín. ${minChars} caracteres)`}
              className="resize-none pr-8 text-sm"
              disabled={isGenerating || isDone}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canGenerate) generate()
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isGenerating || disabled || isUploadingFiles}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating || !canUploadMore || disabled}
              title={`Adjuntar archivo (${activeUploadsCount}/${maxUploadFiles})`}
              className="absolute right-1 bottom-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </Button>
          </div>

          <Button
            type="button"
            onClick={generate}
            disabled={!canGenerate || isGenerating || isDone}
            size="sm"
            className="shrink-0 self-end"
          >
            {isGenerating ? 'Generando…' : `Generar${totalResources > 0 ? ` (${totalResources})` : ''}`}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Ctrl+Enter para generar</p>
      </div>
    </div>
  )
}
