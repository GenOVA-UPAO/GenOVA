export function UploadsPanel({
  uploads,
  activeUploadsCount,
  maxUploadFiles,
  isUploadingFiles,
  uploadError,
  onFilesSelected,
  onRemove,
  disabled,
}) {
  function handleChange(e) {
    void onFilesSelected(e.target.files)
    e.target.value = ''
  }

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-medium text-slate-700 flex items-center gap-2 list-none select-none">
        <span className="text-slate-400 group-open:rotate-90 transition-transform inline-block">▶</span>
        Archivos de contexto — RAG (opcional) ·{' '}
        <span className="font-semibold text-indigo-600">
          {activeUploadsCount}/{maxUploadFiles}
        </span>
      </summary>
      <div className="mt-3 space-y-2 pl-1 sm:pl-4">
        <p className="text-xs text-slate-500">
          PDF / DOCX / PPTX · Audio → Whisper STT · Imágenes → Visión IA · 20 MB máx. por archivo.
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
          className="text-sm text-slate-700 w-full"
          onChange={handleChange}
          disabled={disabled || isUploadingFiles}
        />
        {uploadError && <p className="text-xs text-rose-600">{uploadError}</p>}
        <p className="rounded bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs text-amber-800">
          <b>Video:</b> Sin modelo disponible. Usa HeyGen, Synthesia o Sora con el contenido generado por GenOVA.
        </p>
        {uploads.length > 0 && (
          <ul className="space-y-1">
            {uploads.map((u) => (
              <li
                key={u.clientId}
                className="flex items-center justify-between rounded border border-slate-200 px-3 py-1.5 text-xs"
              >
                <span className="truncate text-slate-700">{u.filename}</span>
                <button
                  type="button"
                  onClick={() => void onRemove(u.clientId)}
                  disabled={disabled}
                  className="ml-3 text-slate-400 hover:text-rose-600 disabled:opacity-40"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  )
}
