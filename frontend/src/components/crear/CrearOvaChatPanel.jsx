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
import { PhaseRow, SectionLabel } from './CrearOvaPanelHelpers.jsx'
import { GridFour, Palette, Brain, Paperclip } from '@phosphor-icons/react'

export function CrearOvaChatPanel({
  prompt, setPrompt, minChars,
  canConfigure, canGenerate, isGenerating, isDone,
  openModal, selections, totalResources,
  theme, setTheme,
  generate, reset, error,
  uploadsProps,
  hasJob, job: jobData, viewModel, outcome, selectedFailedIds,
  jobToggleFailed, jobRetryOne, jobSelectAllFailed, jobRetrySelected, onPreviewPin, activeId,
}) {
  const fileInputRef = useRef(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { uploads, activeUploadsCount, maxUploadFiles, isUploadingFiles,
    uploadError, onFilesSelected, onRemove, disabled } = uploadsProps
  const canUploadMore = activeUploadsCount < maxUploadFiles
  const hasFiles = uploads.length > 0
  const hasResources = totalResources > 0
  const locked = isGenerating || isDone

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files?.length > 0) void onFilesSelected(e.dataTransfer.files)
  }
  const handleFileChange = (e) => { void onFilesSelected(e.target.files); e.target.value = '' }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <LlmSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-primary/50">GenOVA</p>
            <h2 className="font-heading text-[13px] font-semibold leading-tight">Crear OVA</h2>
          </div>
          <GearButton onClick={() => setSettingsOpen(true)} />
        </div>

        {/* 01 — Recursos 5E */}
        <div className={`px-4 pt-3 pb-3 border-b border-border transition-opacity duration-300 ${isGenerating ? 'opacity-40 pointer-events-none' : ''}`}>
          <SectionLabel num="01" title="Recursos 5E" Icon={GridFour} />
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <PhaseRow selections={selections} />
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs shrink-0"
              onClick={openModal} disabled={!canConfigure || isGenerating}>
              {hasResources ? 'Editar' : 'Configurar'}
            </Button>
          </div>
          {hasResources
            ? <SelectionChips selections={selections} onEdit={openModal} editable={false} />
            : <p className="text-xs text-muted-foreground">Elige hasta 4 recursos por cada una de las 5 fases 5E.</p>}
        </div>

        {/* 02 — Tema del OVA */}
        <div className={`px-4 pt-3 pb-3 border-b border-border transition-opacity duration-300 ${isGenerating ? 'opacity-40 pointer-events-none' : ''}`}>
          <SectionLabel num="02" title="Tema del OVA" Icon={Palette} />
          <OvaThemeSelector theme={theme} onChange={setTheme} disabled={isGenerating} />
        </div>

        {/* 03 — Modelos */}
        <div className={`px-4 pt-3 pb-4 transition-opacity duration-300 ${isGenerating ? 'opacity-40 pointer-events-none' : ''}`}>
          <SectionLabel num="03" title="Modelos" Icon={Brain} />
          <LlmEnginesPanel />
          <p className="mt-2 rounded-md bg-accent-brand/10 border border-accent-brand/30 px-2.5 py-1.5 text-[11px] text-accent-brand">
            <b>Video:</b> Sin modelo disponible. Usa HeyGen, Synthesia o Sora con el contenido generado.
          </p>
        </div>

        {hasJob && viewModel.length > 0 ? (
          <div className="border-t border-border px-4 pt-3 pb-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Generación</p>
            <ProgressPanel job={jobData} viewModel={viewModel} selectedIds={selectedFailedIds} activeId={activeId}
              onToggle={jobToggleFailed} onRetryOne={jobRetryOne} onPreview={onPreviewPin}
              onSelectAll={jobSelectAllFailed} onRetrySelected={jobRetrySelected} />
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

      {/* Bottom: prompt + generate */}
      {/* biome-ignore lint/a11y: zona drag&drop; la carga de archivos tiene alternativa accesible vía botón */}
      <div className="border-t border-border bg-muted/10 p-3 space-y-2 shrink-0"
        onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
        {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {hasFiles ? (
          <div className="flex flex-wrap gap-1.5">
            {uploads.map((u) => <FileChip key={u.clientId} file={u} onRemove={onRemove} disabled={locked || disabled} />)}
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe el tema de tu OVA… (mín. ${minChars} caracteres)`}
              className="resize-none pr-8 text-sm" disabled={locked}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canGenerate) generate() }} />
            <input ref={fileInputRef} type="file" multiple className="hidden"
              accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange} disabled={locked || disabled || isUploadingFiles} />
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => fileInputRef.current?.click()}
              disabled={locked || !canUploadMore || disabled} title={`Adjuntar (${activeUploadsCount}/${maxUploadFiles})`}
              className="absolute right-1 bottom-1">
              <Paperclip size={16} weight="duotone" />
            </Button>
          </div>
          <Button type="button" onClick={generate} disabled={!canGenerate || locked} size="sm"
            className="shrink-0 self-end font-semibold">
            {isGenerating ? 'Generando…' : `Generar${totalResources > 0 ? ` (${totalResources})` : ''}`}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Ctrl+Enter para generar</p>
      </div>
    </div>
  )
}
