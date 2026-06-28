import type { UploadItem } from '@/features/ova_workspace/lib/uploadTypes'
import { formatSize } from '@/features/ova_workspace/lib/uploadFormatters'

interface FileChipProps {
  file: UploadItem
  onRemove: (clientId: string) => void
  disabled?: boolean
}

export function FileChip({ file, onRemove, disabled }: FileChipProps) {
  const extension = file.filename.split('.').pop()?.toLowerCase() ?? ''
  const colorClass = 'bg-muted text-foreground border-border'
  let icon = '📄'
  if (extension === 'pdf') icon = '📕'
  else if (['docx', 'pptx'].includes(extension)) icon = '📘'
  else if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm'].includes(extension))
    icon = '🎵'
  else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) icon = '🖼️'

  let ragBadge: React.ReactNode = null
  if (file.status === 'uploading') {
    ragBadge = (
      <span className="text-[10px] text-primary animate-pulse font-medium">
        Subiendo...
      </span>
    )
  } else if (file.status === 'error') {
    ragBadge = (
      <span
        className="text-[10px] text-destructive font-semibold"
        title={file.message}
      >
        Error
      </span>
    )
  } else if (file.ragStatus) {
    const rs = file.ragStatus
    if (rs.status === 'success') {
      const count = rs.chunks || 0
      ragBadge = (
        <span
          className="text-[10px] text-primary font-bold bg-primary/10 px-1 rounded-sm"
          title={`Ingestado en RAG: ${count} fragmentos`}
        >
          RAG ({count})
        </span>
      )
    } else if (rs.status === 'error') {
      ragBadge = (
        <span
          className="text-[10px] text-destructive font-medium"
          title={rs.message || 'Error RAG'}
        >
          Fallo RAG
        </span>
      )
    } else {
      ragBadge = (
        <span className="text-[10px] text-muted-foreground">Listo</span>
      )
    }
  } else if (file.status === 'success') {
    ragBadge = (
      <span className="text-[10px] text-primary font-medium">Listo</span>
    )
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium shadow-sm transition duration-200 hover:shadow-md ${colorClass}`}
    >
      <span className="text-sm select-none">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span
          className="max-w-[130px] truncate font-semibold"
          title={file.filename}
        >
          {file.filename}
        </span>
        <span className="text-[9px] opacity-75">
          {file.sizeBytes ? formatSize(file.sizeBytes) : ''}
        </span>
      </div>
      <div className="ml-1 flex items-center gap-1">
        {ragBadge}
        <button
          type="button"
          onClick={() => void onRemove(file.clientId)}
          disabled={disabled}
          className="p-0.5 rounded-full hover:bg-foreground/5 text-current/60 hover:text-current cursor-pointer transition-colors"
          title="Quitar"
        >
          <svg
            aria-hidden="true"
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
