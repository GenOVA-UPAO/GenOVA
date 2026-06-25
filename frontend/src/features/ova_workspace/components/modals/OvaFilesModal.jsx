import { useRef, useState } from 'react'
import { m as motion } from 'motion/react'
import { CloudArrowUp, X } from '@phosphor-icons/react'
import { FileChip } from '@/features/ova_workspace/components/shared/FileChip.jsx'
import { useModalDismiss } from '@/core/hooks/useModalDismiss.js'

const ACCEPTED_LABEL = 'PDF, DOCX, PPTX · MP3, WAV, M4A · JPG, PNG, WEBP'
const ACCEPTED_ATTR = '.pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp'

export function OvaFilesModal({ uploads, activeUploadsCount, maxUploadFiles, onFilesSelected, onRemove, onClose }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  useModalDismiss(onClose)
  const canAdd = activeUploadsCount < maxUploadFiles
  const hasFiles = uploads.length > 0

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files?.length) void onFilesSelected(e.dataTransfer.files)
  }
  const handleChange = (e) => { void onFilesSelected(e.target.files); e.target.value = '' }

  return (
    <>
      {/* biome-ignore lint/a11y: backdrop dismiss */}
      <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        <motion.div
          className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold">Archivos de referencia</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {activeUploadsCount} de {maxUploadFiles} · la IA los usa como contexto RAG
              </p>
            </div>
            <button type="button" onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors" aria-label="Cerrar">
              <X size={14} weight="bold" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            {/* Drop zone */}
            <input ref={inputRef} type="file" multiple accept={ACCEPTED_ATTR} className="hidden" onChange={handleChange} />
            {/* biome-ignore lint/a11y: zona drag&drop; alternativa accesible vía inputRef */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => canAdd && inputRef.current?.click()}
              className={[
                'rounded-xl border-2 border-dashed transition duration-200 py-9 px-6',
                'flex flex-col items-center gap-2.5 text-center select-none',
                dragging
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : canAdd
                    ? 'border-border hover:border-primary/50 hover:bg-accent/30 cursor-pointer'
                    : 'border-border/30 opacity-50 pointer-events-none',
              ].join(' ')}
            >
              <motion.div animate={{ y: dragging ? -4 : 0 }} transition={{ duration: 0.2 }}>
                <CloudArrowUp size={40} weight="thin"
                  className={dragging ? 'text-primary' : 'text-muted-foreground/60'} />
              </motion.div>
              <div>
                <p className="text-sm font-semibold">
                  {dragging ? 'Suelta aquí' : canAdd ? 'Arrastra archivos' : 'Límite alcanzado'}
                </p>
                {canAdd && <p className="text-xs text-muted-foreground mt-0.5">o haz clic para seleccionar</p>}
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">{ACCEPTED_LABEL}</p>
              </div>
            </div>

            {/* File list */}
            {hasFiles ? (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {uploads.map((u) => <FileChip key={u.clientId} file={u} onRemove={onRemove} />)}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground/50 py-1">
                Sin archivos · la IA generará sin contexto adicional
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}
