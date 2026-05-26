export function FileChip({ file, onRemove, disabled }) {
  const extension = file.filename.split('.').pop().toLowerCase()
  let icon = '📄'
  let colorClass = 'bg-slate-50 text-slate-700 border-slate-200'

  if (extension === 'pdf') {
    icon = '📕'
    colorClass = 'bg-rose-50 text-rose-700 border-rose-100'
  } else if (['docx', 'pptx'].includes(extension)) {
    icon = '📘'
    colorClass = 'bg-blue-50 text-blue-700 border-blue-100'
  } else if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm'].includes(extension)) {
    icon = '🎵'
    colorClass = 'bg-amber-50 text-amber-700 border-amber-100'
  } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) {
    icon = '🖼️'
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100'
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  let ragBadge = null
  if (file.status === 'uploading') {
    ragBadge = <span className="text-[10px] text-indigo-500 animate-pulse font-medium">Subiendo...</span>
  } else if (file.status === 'error') {
    ragBadge = (
      <span className="text-[10px] text-rose-500 font-semibold" title={file.message}>
        Error
      </span>
    )
  } else if (file.ragStatus) {
    const status = file.ragStatus.status
    if (status === 'success') {
      const count = file.ragStatus.chunks || 0
      ragBadge = (
        <span
          className="text-[10px] text-emerald-600 font-bold bg-emerald-100/80 px-1 rounded-sm"
          title={`Ingestado en RAG: ${count} fragmentos`}
        >
          RAG ({count})
        </span>
      )
    } else if (status === 'error') {
      ragBadge = (
        <span className="text-[10px] text-rose-500 font-medium" title={file.ragStatus.message || 'Error RAG'}>
          Fallo RAG
        </span>
      )
    } else {
      ragBadge = <span className="text-[10px] text-slate-400">Listo</span>
    }
  } else if (file.status === 'success') {
    ragBadge = <span className="text-[10px] text-indigo-500 font-medium">Listo</span>
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md ${colorClass}`}
    >
      <span className="text-sm select-none">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="max-w-[130px] truncate font-semibold" title={file.filename}>
          {file.filename}
        </span>
        <span className="text-[9px] opacity-75">{formatSize(file.sizeBytes)}</span>
      </div>
      <div className="ml-1 flex items-center gap-1">
        {ragBadge}
        <button
          type="button"
          onClick={() => void onRemove(file.clientId)}
          disabled={disabled}
          className="p-0.5 rounded-full hover:bg-black/5 text-current/60 hover:text-current cursor-pointer transition-colors"
          title="Quitar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
