import { Brain, GridFour, Palette } from '@phosphor-icons/react'
import { useState } from 'react'
import { LlmEnginesPanel } from '@/core/settings/components/LlmEnginesPanel'
import { GearButton } from '@/core/settings/components/GearButton'
import { Button } from '@/core/components/ui/button'
import { CrearOvaInputBar } from '@/features/ova_workspace/components/creation/CrearOvaInputBar'
import {
  PhaseRow,
  SectionLabel,
} from '@/features/ova_workspace/components/creation/CrearOvaPanelHelpers'
import { CrearOvaProgressSection } from '@/features/ova_workspace/components/creation/CrearOvaProgressSection'
import { LlmSettingsModal } from '@/features/ova_workspace/components/modals/LlmSettingsModal'
import { OvaThemeSelector } from '@/features/ova_workspace/components/modals/OvaThemeSelector'
import { FileChip } from '@/features/ova_workspace/components/shared/FileChip'
import { SelectionChips } from '@/features/ova_workspace/components/shared/SelectionChips'
import type { OvaTheme, Selections } from '@/features/ova_workspace/lib/types'

import type { ResourceVM } from '@/features/ova_workspace/lib/ovaJobViewModel'
import type { UploadItem } from '@/features/ova_workspace/lib/uploadTypes'

interface UploadsProps {
  uploads: UploadItem[]
  activeUploadsCount: number
  maxUploadFiles: number
  isUploadingFiles: boolean
  uploadError: string
  disabled?: boolean
  onFilesSelected: (files: FileList | File[]) => void
  onRemove: (clientId: string) => void
}

interface JobOutcome {
  isTerminal: boolean
  anyDone: boolean
  totalFail: boolean
}

interface CrearOvaChatPanelProps {
  prompt: string
  setPrompt: (value: string) => void
  minChars: number
  canConfigure?: boolean
  canGenerate: boolean
  isGenerating: boolean
  isDone: boolean
  openModal: () => void
  selections: Selections
  totalResources: number
  theme: OvaTheme
  setTheme: (theme: OvaTheme) => void
  generate: () => void
  reset: () => void
  error: string
  uploadsProps: UploadsProps
  hasJob: boolean
  job: Record<string, unknown> | null
  viewModel: ResourceVM[]
  outcome: JobOutcome | null
  selectedFailedIds: string[]
  jobToggleFailed: (id: string) => void
  jobRetryOne: (id: string) => void
  jobSelectAllFailed: () => void
  jobRetrySelected: () => void
  onPreviewPin: (id: string | null) => void
  activeId: string | null
}

export function CrearOvaChatPanel({
  prompt,
  setPrompt,
  minChars,
  canConfigure,
  canGenerate,
  isGenerating,
  isDone,
  openModal,
  selections,
  totalResources,
  theme,
  setTheme,
  generate,
  reset,
  error,
  uploadsProps,
  hasJob,
  job: jobData,
  viewModel,
  outcome,
  selectedFailedIds,
  jobToggleFailed,
  jobRetryOne,
  jobSelectAllFailed,
  jobRetrySelected,
  onPreviewPin,
  activeId,
}: CrearOvaChatPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const {
    uploads,
    activeUploadsCount,
    maxUploadFiles,
    isUploadingFiles,
    uploadError,
    onFilesSelected,
    onRemove,
    disabled,
  } = uploadsProps
  const canUploadMore = activeUploadsCount < maxUploadFiles
  const hasFiles = uploads.length > 0
  const hasResources = totalResources > 0
  const locked = isGenerating || isDone

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files?.length > 0)
      void onFilesSelected(e.dataTransfer.files)
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void onFilesSelected(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <LlmSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-primary/50">
              GenOVA
            </p>
            <h2 className="font-heading text-[13px] font-semibold leading-tight">
              Crear OVA
            </h2>
          </div>
          <GearButton onClick={() => setSettingsOpen(true)} />
        </div>

        <div
          className={`px-4 pt-3 pb-3 border-b border-border transition-opacity duration-300 ${isGenerating ? 'opacity-40 pointer-events-none' : ''}`}
        >
          <SectionLabel num="01" title="Recursos 5E" Icon={GridFour} />
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <PhaseRow selections={selections} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs shrink-0"
              onClick={openModal}
              disabled={!canConfigure || isGenerating}
            >
              {hasResources ? 'Editar' : 'Configurar'}
            </Button>
          </div>
          {hasResources ? (
            <SelectionChips
              selections={selections}
              onEdit={openModal}
              editable={false}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Elige hasta 4 recursos por cada una de las 5 fases 5E.
            </p>
          )}
        </div>

        <div
          className={`px-4 pt-3 pb-3 border-b border-border transition-opacity duration-300 ${isGenerating ? 'opacity-40 pointer-events-none' : ''}`}
        >
          <SectionLabel num="02" title="Tema del OVA" Icon={Palette} />
          <OvaThemeSelector
            theme={theme}
            onChange={setTheme}
            disabled={isGenerating}
          />
        </div>

        <div
          className={`px-4 pt-3 pb-4 transition-opacity duration-300 ${isGenerating ? 'opacity-40 pointer-events-none' : ''}`}
        >
          <SectionLabel num="03" title="Modelos" Icon={Brain} />
          <LlmEnginesPanel />
          <p className="mt-2 rounded-md bg-accent-brand/10 border border-accent-brand/30 px-2.5 py-1.5 text-[11px] text-accent-brand">
            <b>Video:</b> Sin modelo disponible. Usa HeyGen, Synthesia o Sora
            con el contenido generado.
          </p>
        </div>

        <CrearOvaProgressSection
          hasJob={hasJob}
          isDone={isDone}
          viewModel={viewModel}
          jobData={jobData}
          selectedFailedIds={selectedFailedIds}
          activeId={activeId}
          outcome={outcome}
          jobToggleFailed={jobToggleFailed}
          jobRetryOne={jobRetryOne}
          onPreviewPin={onPreviewPin}
          jobSelectAllFailed={jobSelectAllFailed}
          jobRetrySelected={jobRetrySelected}
          reset={reset}
        />
      </div>

      {/* biome-ignore lint/a11y: drop-zone de archivos; alternativa accesible vía botón de adjuntar (input file) */}
      <div
        className="border-t border-border bg-muted/10 p-3 space-y-2 shrink-0"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {uploadError ? (
          <p className="text-xs text-destructive">{uploadError}</p>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {hasFiles ? (
          <div className="flex flex-wrap gap-1.5">
            {uploads.map((u) => (
              <FileChip
                key={u.clientId}
                file={u}
                onRemove={onRemove}
                disabled={locked || disabled}
              />
            ))}
          </div>
        ) : null}

        <CrearOvaInputBar
          prompt={prompt}
          setPrompt={setPrompt}
          minChars={minChars}
          locked={locked}
          disabled={disabled}
          canGenerate={canGenerate}
          isGenerating={isGenerating}
          canUploadMore={canUploadMore}
          isUploadingFiles={isUploadingFiles}
          activeUploadsCount={activeUploadsCount}
          maxUploadFiles={maxUploadFiles}
          totalResources={totalResources}
          generate={generate}
          handleFileChange={handleFileChange}
        />
        <p className="text-[10px] text-muted-foreground">
          Ctrl+Enter para generar
        </p>
      </div>
    </div>
  )
}
