import { useRef, useState } from 'react'
import { Button } from '@/core/components/ui/button'
import { Textarea } from '@/core/components/ui/textarea'
import { LlmEnginesPanel } from '@/core/components/LlmEnginesPanel.jsx'
import { SelectionChips } from '@/features/ova_workspace/components/shared/SelectionChips.jsx'
import { FileChip } from '@/features/ova_workspace/components/shared/FileChip.jsx'

export function PromptPanel({
  prompt, setPrompt, minChars, canConfigure, canGenerate, isGenerating,
  isDone, openModal, selections, totalResources,
  generate, reset, error, uploadsProps,
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files?.length > 0) {
      void uploadsProps.onFilesSelected(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e) => {
    void uploadsProps.onFilesSelected(e.target.files)
    e.target.value = ''
  }

  const hasUploads = uploadsProps.uploads.length > 0
  const canUploadMore = uploadsProps.activeUploadsCount < uploadsProps.maxUploadFiles

  return (
    <div className="rounded-xl border border-border bg-background p-4 sm:p-5 shadow-sm space-y-4">
      <h2 className="text-base font-semibold">Tema del OVA</h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {/* biome-ignore lint/a11y: zona drag&drop; la carga de archivos tiene alternativa accesible vía botón */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 flex flex-col rounded-lg border transition duration-200 ${
            isDragOver ? 'border-dashed border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <Textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Árboles de decisión para clasificación supervisada en ML..."
            className="rounded-b-none border-0 resize-none focus-visible:ring-0"
            disabled={isGenerating}
          />

          {hasUploads ? (
            <div className="flex flex-wrap gap-2 px-3 pb-2.5 bg-background">
              {uploadsProps.uploads.map((u) => (
                <FileChip
                  key={u.clientId}
                  file={u}
                  onRemove={uploadsProps.onRemove}
                  disabled={isGenerating || uploadsProps.disabled}
                />
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-border px-3 py-2 bg-muted/20 rounded-b-lg">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={isGenerating || uploadsProps.disabled || uploadsProps.isUploadingFiles}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating || uploadsProps.disabled || !canUploadMore}
                title="Adjuntar archivos de apoyo (PDF, Word, PowerPoint, Audio, Imagen)"
              >
                <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </Button>
              <span className="text-[10px] text-muted-foreground font-medium">
                PDF, Word, PowerPoint, Audio o Imagen ({uploadsProps.activeUploadsCount}/{uploadsProps.maxUploadFiles})
              </span>
            </div>

            {uploadsProps.isUploadingFiles ? (
              <div className="flex items-center gap-1.5 text-xs text-primary font-medium select-none">
                <div className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span>Subiendo...</span>
              </div>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          onClick={openModal}
          disabled={!canConfigure || isGenerating}
          className="w-full sm:w-auto sm:shrink-0"
        >
          {totalResources > 0 ? 'Editar recursos 5E' : 'Configurar recursos 5E'}
        </Button>
      </div>

      {uploadsProps.uploadError ? (
        <p className="text-xs text-destructive font-medium mt-1">{uploadsProps.uploadError}</p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Mínimo {minChars} caracteres · elige 1-4 recursos por cada una de las 5 fases 5E.
      </p>

      <p className="rounded bg-accent-brand/10 border border-accent-brand/30 px-2.5 py-1.5 text-xs text-accent-brand shadow-sm">
        <b>Video:</b> Sin modelo disponible. Usa HeyGen, Synthesia o Sora con el contenido generado por GenOVA.
      </p>

      <SelectionChips
        selections={selections}
        onEdit={openModal}
        editable={!isGenerating && !isDone}
      />

      <LlmEnginesPanel />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-border">
        <Button
          type="button"
          onClick={generate}
          disabled={!canGenerate}
          className="w-full sm:w-auto"
        >
          {isGenerating
            ? 'Generando…'
            : totalResources > 0
              ? `Generar OVA (${totalResources} recurso${totalResources === 1 ? '' : 's'})`
              : 'Generar OVA'}
        </Button>
        {isDone ? (
          <Button type="button" variant="link" onClick={reset} className="self-start sm:self-auto">
            Crear otro OVA
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive font-medium">{error}</p> : null}
    </div>
  )
}
