import {
  ArrowCounterClockwise,
  ListChecks,
  Paperclip,
} from '@phosphor-icons/react'
import { useRef } from 'react'
import { Button } from '@/core/components/ui/button'
import { Checkbox } from '@/core/components/ui/checkbox'
import { Textarea } from '@/core/components/ui/textarea'
import { FileChip } from '@/features/ova_workspace/components/shared/FileChip'
import type { Phase } from '@/features/ova_workspace/lib/types'

import type { UploadItem } from '@/features/ova_workspace/lib/uploadTypes'

interface UploadsPropBag {
  uploads: UploadItem[]
  activeUploadsCount: number
  maxUploadFiles: number
  isUploadingFiles: boolean
  uploadError: string
  disabled?: boolean
  onFilesSelected: (files: FileList | File[]) => void
  onRemove: (clientId: string) => void
}

interface RegenProgress {
  percentage: number
  stage: string
}

interface WorkspaceChatPanelProps {
  prompt: string
  setPrompt: (value: string) => void
  isRegenerating: boolean
  onSubmit: () => void
  uploads: UploadsPropBag
  regenProgress: RegenProgress
  onRegenAll?: () => void
  phases: Phase[]
  selectionMode: boolean
  selectedPhaseIds: string[]
  onToggleSelectionMode: () => void
  onTogglePhaseSelection: (phaseId: string) => void
  onSelectAll?: () => void
}

export function WorkspaceChatPanel({
  prompt,
  setPrompt,
  isRegenerating,
  onSubmit,
  uploads,
  regenProgress,
  onRegenAll,
  phases,
  selectionMode,
  selectedPhaseIds,
  onToggleSelectionMode,
  onTogglePhaseSelection,
  onSelectAll,
}: WorkspaceChatPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    uploads: files,
    activeUploadsCount,
    maxUploadFiles,
    isUploadingFiles,
    onFilesSelected,
    onRemove,
    uploadError,
    disabled,
  } = uploads

  const canUploadMore = activeUploadsCount < maxUploadFiles
  const hasFiles = files.length > 0
  const phaseList = Array.isArray(phases) ? phases : []
  const selectedCount = selectedPhaseIds?.length ?? 0
  const allSelected = phaseList.length > 0 && selectedCount === phaseList.length
  const pct = regenProgress?.percentage ?? 0
  const stage = regenProgress?.stage ?? ''

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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <p className="text-xs text-muted-foreground font-medium">
          Describe los cambios que quieres aplicar al OVA.
        </p>

        {isRegenerating ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-primary truncate">
                {stage || 'Regenerando…'}
              </span>
              <span className="font-bold text-primary tabular-nums">
                {pct}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : null}

        {onRegenAll ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={onRegenAll}
            disabled={isRegenerating}
          >
            <ArrowCounterClockwise size={14} weight="duotone" /> Regenerar OVA
            completo
          </Button>
        ) : null}

        <Button
          variant={selectionMode ? 'default' : 'outline'}
          size="sm"
          className="w-full text-xs"
          onClick={onToggleSelectionMode}
          disabled={isRegenerating}
        >
          <ListChecks size={14} weight="duotone" />
          {selectionMode
            ? `Seleccionando recursos (${selectedCount} elegido${selectedCount !== 1 ? 's' : ''})`
            : 'Seleccionar recursos'}
        </Button>

        {selectionMode && phaseList.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                El prompt aplicará solo a los recursos marcados.
              </p>
              {onSelectAll ? (
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="text-[10px] font-medium text-primary hover:underline"
                >
                  {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
              ) : null}
            </div>
            {phaseList.map((phase) => (
              <label
                key={phase.id}
                htmlFor={`phase-sel-${phase.id}`}
                className="flex items-center gap-2 cursor-pointer rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted/50"
              >
                <Checkbox
                  id={`phase-sel-${phase.id}`}
                  checked={selectedPhaseIds?.includes(phase.id) ?? false}
                  onCheckedChange={() => onTogglePhaseSelection?.(phase.id)}
                />
                <span className="capitalize">
                  {(phase as Record<string, unknown>).phase_type as string}
                </span>
                {(phase as Record<string, unknown>).title ? (
                  <span className="text-muted-foreground truncate">
                    — {(phase as Record<string, unknown>).title as string}
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        ) : null}
      </div>

      {/* biome-ignore lint/a11y: drop-zone de archivos; alternativa accesible vía botón de adjuntar (input file) */}
      <div
        className="border-t border-border p-3 space-y-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {hasFiles ? (
          <div className="flex flex-wrap gap-2">
            {files.map((u) => (
              <FileChip
                key={u.clientId}
                file={u}
                onRemove={onRemove}
                disabled={isRegenerating || disabled}
              />
            ))}
          </div>
        ) : null}

        {uploadError ? (
          <p className="text-xs text-destructive">{uploadError}</p>
        ) : null}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                selectionMode && selectedCount > 0
                  ? `Cambio para ${selectedCount} recurso${selectedCount !== 1 ? 's' : ''}…`
                  : 'Escribe un cambio o mejora para el OVA…'
              }
              className="resize-none pr-8"
              disabled={isRegenerating}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSubmit()
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isRegenerating || disabled || isUploadingFiles}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRegenerating || !canUploadMore}
              title="Adjuntar archivo de apoyo"
              className="absolute right-1 bottom-1"
            >
              <Paperclip size={16} weight="duotone" />
            </Button>
          </div>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!prompt.trim() || isRegenerating}
            size="sm"
            className="shrink-0 self-end"
          >
            {isRegenerating ? 'Generando…' : 'Aplicar'}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Ctrl+Enter para enviar
        </p>
      </div>
    </div>
  )
}
