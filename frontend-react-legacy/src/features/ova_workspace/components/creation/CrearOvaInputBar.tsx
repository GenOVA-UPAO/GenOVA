// Barra de entrada del panel de creación: textarea de prompt, adjuntar archivos
// y botón generar. Extraído de CrearOvaChatPanel para mantener archivos ≤200 líneas.
import { Paperclip } from '@phosphor-icons/react'
import { useRef } from 'react'
import { Button } from '@/core/components/ui/button'
import { Textarea } from '@/core/components/ui/textarea'

interface CrearOvaInputBarProps {
  prompt: string
  setPrompt: (value: string) => void
  minChars: number
  locked: boolean
  disabled?: boolean
  canGenerate: boolean
  isGenerating: boolean
  canUploadMore: boolean
  isUploadingFiles: boolean
  activeUploadsCount: number
  maxUploadFiles: number
  totalResources: number
  generate: () => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function CrearOvaInputBar({
  prompt,
  setPrompt,
  minChars,
  locked,
  disabled = false,
  canGenerate,
  isGenerating,
  canUploadMore,
  isUploadingFiles,
  activeUploadsCount,
  maxUploadFiles,
  totalResources,
  generate,
  handleFileChange,
}: CrearOvaInputBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 relative">
        <Textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Describe el tema de tu OVA… (mín. ${minChars} caracteres)`}
          className="resize-none pr-8 text-sm"
          disabled={locked}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canGenerate)
              generate()
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
          disabled={locked || disabled || isUploadingFiles}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={locked || !canUploadMore || disabled}
          title={`Adjuntar (${activeUploadsCount}/${maxUploadFiles})`}
          className="absolute right-1 bottom-1"
        >
          <Paperclip size={16} weight="duotone" />
        </Button>
      </div>
      <Button
        type="button"
        onClick={generate}
        disabled={!canGenerate || locked}
        size="sm"
        className="shrink-0 self-end font-semibold"
      >
        {isGenerating
          ? 'Generando…'
          : `Generar${totalResources > 0 ? ` (${totalResources})` : ''}`}
      </Button>
    </div>
  )
}
