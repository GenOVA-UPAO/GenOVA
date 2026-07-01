import {
  Lightning,
  Paperclip,
  SlidersHorizontal,
  Swatches,
} from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { Button } from '@/core/components/ui/button'
import { Textarea } from '@/core/components/ui/textarea'
import { OvaFilesModal } from '@/features/ova_workspace/components/modals/OvaFilesModal'
import { OvaThemeModal } from '@/features/ova_workspace/components/modals/OvaThemeModal'
import { FileChip } from '@/features/ova_workspace/components/shared/FileChip'
import type { OvaTheme } from '@/features/ova_workspace/lib/types'
import type { UploadsProps } from '@/features/ova_workspace/lib/uploadTypes'

interface OvaCreateFormCardProps {
  prompt: string
  setPrompt: (value: string) => void
  minChars: number
  canGenerate: boolean
  openModal: () => void
  selections: Record<string, unknown[]>
  totalResources: number
  theme: OvaTheme
  setTheme: (theme: OvaTheme) => void
  generate: () => void
  error: string
  uploadsProps: UploadsProps
}

export function OvaCreateFormCard({
  prompt,
  setPrompt,
  minChars,
  canGenerate,
  openModal,
  selections,
  totalResources,
  theme,
  setTheme,
  generate,
  error,
  uploadsProps,
}: OvaCreateFormCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showFiles, setShowFiles] = useState(false)
  const [showTheme, setShowTheme] = useState(false)

  const {
    uploads,
    activeUploadsCount,
    maxUploadFiles,
    onFilesSelected,
    onRemove,
    uploadError,
  } = uploadsProps
  const hasFiles = uploads.length > 0

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files?.length > 0)
      void onFilesSelected(e.dataTransfer.files)
  }

  const resourceSummary =
    totalResources > 0
      ? Object.entries(selections)
          .filter(([, v]) => (v as unknown[]).length > 0)
          .map(([k, v]) => `${k} (${(v as unknown[]).length})`)
          .join(' · ')
      : null

  const themeLabel = `Color: ${theme.color === 'free' ? 'Libre' : 'UPAO'} · Diseño: ${theme.design === 'free' ? 'Libre' : 'UPAO'}`

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* biome-ignore lint/a11y: drop-zone de archivos; alternativa accesible vía botón de adjuntar (input file) */}
      <div
        className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-8"
        style={{
          background:
            'radial-gradient(ellipse 90% 50% at 50% 0%, oklch(0.4 0.15 264 / 0.07) 0%, transparent 65%)',
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="my-auto w-full max-w-2xl space-y-5">
          <div className="text-center space-y-1.5 px-2">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary/40">
              GenOVA
            </p>
            <h1 className="font-display text-[1.75rem] sm:text-3xl font-semibold leading-tight">
              Crear nuevo OVA
            </h1>
            <p className="text-sm text-muted-foreground">
              Describe el tema y configura los recursos a generar con IA
            </p>
          </div>

          <div
            className="rounded-2xl border border-border/70 bg-card overflow-hidden"
            style={{
              boxShadow:
                '0 4px 24px -4px oklch(0.4 0.15 264 / 0.10), 0 1px 4px oklch(0 0 0 / 0.06)',
            }}
          >
            <Textarea
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe el tema, objetivos de aprendizaje y nivel educativo del OVA… (mín. ${minChars} caracteres)`}
              className="w-full resize-none border-0 rounded-none bg-transparent px-5 pt-5 pb-3 text-sm leading-relaxed placeholder:text-muted-foreground/50 focus-visible:ring-0"
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  (e.ctrlKey || e.metaKey) &&
                  canGenerate
                )
                  generate()
              }}
            />

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                if (e.target.files) void onFilesSelected(e.target.files)
                e.target.value = ''
              }}
            />

            {hasFiles && (
              <div className="flex flex-wrap gap-1.5 px-5 pb-3">
                {uploads.map((u) => (
                  <FileChip key={u.clientId} file={u} onRemove={onRemove} />
                ))}
              </div>
            )}

            {totalResources > 0 && (
              <p className="px-5 pb-3 text-xs text-muted-foreground">
                <span className="font-semibold text-primary">
                  {totalResources} recurso{totalResources !== 1 ? 's' : ''}
                </span>
                {' — '}
                {resourceSummary}
              </p>
            )}

            <div className="px-5 pb-3">
              <button
                type="button"
                onClick={() => setShowTheme(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 hover:bg-muted px-3 py-1 text-xs font-medium border border-border/60 transition-colors"
              >
                <span
                  className={`h-2 w-2 rounded-full ${theme.color === 'free' ? 'bg-purple-500' : 'bg-primary'}`}
                />
                {themeLabel}
              </button>
            </div>

            <div className="flex items-center gap-0.5 border-t border-border/60 px-3 py-2.5 bg-muted/20">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={openModal}
                title="Configurar recursos 5E"
                className={`rounded-lg ${totalResources > 0 ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <SlidersHorizontal
                  size={19}
                  weight={totalResources > 0 ? 'fill' : 'regular'}
                />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowFiles(true)}
                title={`Archivos de referencia (${activeUploadsCount}/${maxUploadFiles})`}
                className={`rounded-lg ${hasFiles ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Paperclip size={19} weight={hasFiles ? 'fill' : 'regular'} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowTheme(true)}
                title="Tema visual del OVA"
                className="rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Swatches size={19} />
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                onClick={generate}
                disabled={!canGenerate}
                className="gap-1.5 font-semibold text-sm px-4 h-8 rounded-xl"
              >
                <Lightning size={14} weight="fill" />
                Generar OVA
              </Button>
            </div>

            {(error || uploadError) && (
              <p className="px-5 pb-3 text-xs text-destructive">
                {error || uploadError}
              </p>
            )}
          </div>

          <p className="text-center text-[11px] text-muted-foreground/60 tracking-wide">
            Ctrl+Enter para generar
          </p>
        </div>
      </div>

      {showFiles && (
        <OvaFilesModal
          uploads={uploads}
          activeUploadsCount={activeUploadsCount}
          maxUploadFiles={maxUploadFiles}
          onFilesSelected={onFilesSelected}
          onRemove={onRemove}
          onClose={() => setShowFiles(false)}
        />
      )}

      {showTheme && (
        <OvaThemeModal
          theme={theme}
          onThemeChange={setTheme}
          onClose={() => setShowTheme(false)}
        />
      )}
    </div>
  )
}
