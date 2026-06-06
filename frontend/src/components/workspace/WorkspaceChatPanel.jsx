import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FileChip } from '../crear/FileChip.jsx'

/**
 * HU-025 — workspace left panel: prompt + file attachments.
 * Anchors for HU-027 (resource selection) are present as disabled placeholders.
 */
export function WorkspaceChatPanel({
  prompt, setPrompt, isRegenerating, onSubmit, uploads,
}) {
  const fileInputRef = useRef(null)
  const { uploads: files, activeUploadsCount, maxUploadFiles, isUploadingFiles,
    onFilesSelected, onRemove, uploadError, disabled } = uploads

  const canUploadMore = activeUploadsCount < maxUploadFiles
  const hasFiles = files.length > 0

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files?.length > 0) {
      void onFilesSelected(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e) => {
    void onFilesSelected(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <p className="text-xs text-muted-foreground font-medium">
          Describe los cambios que quieres aplicar al OVA.
        </p>

        {/* HU-027 anchor — resource selection button (no logic yet) */}
        <Button
          variant="outline"
          size="sm"
          disabled
          className="w-full text-xs text-muted-foreground"
          title="Seleccionar recursos (próximamente)"
        >
          ☐ Seleccionar recursos
        </Button>
      </div>

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
              placeholder="Escribe un cambio o mejora para el OVA…"
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
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
        <p className="text-[10px] text-muted-foreground">Ctrl+Enter para enviar</p>
      </div>
    </div>
  )
}
