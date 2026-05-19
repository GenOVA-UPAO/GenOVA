import { useNavigate } from 'react-router'
import { StatusBadge } from './StatusBadge'

export function OvaCard({
  ova,
  isSelected,
  onToggleSelect,
  onMoveToTrash,
  onDownload,
  onDuplicate,
  onEditMetadata,
  isMoving,
  isDownloading,
  isDuplicating,
}) {
  const navigate = useNavigate()
  const isGenerating = ova.status === 'generando'
  const isReady = ova.status === 'listo'

  const formatDate = (iso) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all ${isSelected ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(ova.id)}
          disabled={isGenerating}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{ova.title}</h3>
            <StatusBadge status={ova.status} />
          </div>
          {ova.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mt-1">{ova.description}</p>
          )}
          {ova.owner && (
            <p className="mt-1.5 text-xs text-slate-400">
              Por: <span className="font-medium text-slate-600">{ova.owner.full_name}</span>
            </p>
          )}
          <p className="mt-1.5 text-xs text-slate-400">{formatDate(ova.created_at)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/mis-ovas/${ova.id}/editar`)}
            disabled={isGenerating || isDuplicating}
            title={isGenerating ? 'No disponible mientras se genera el OVA' : 'Editar OVA'}
            className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✏ Editar
          </button>
          <button
            onClick={() => onEditMetadata(ova)}
            disabled={isGenerating || isDuplicating}
            title={isGenerating ? 'No disponible mientras se genera el OVA' : 'Editar título y descripción'}
            className="flex-1 rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            📝 Metadatos
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDuplicate(ova.id)}
            disabled={isGenerating || isDuplicating}
            title={isGenerating ? 'No disponible mientras se genera el OVA' : 'Duplicar OVA'}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDuplicating ? 'Duplicando...' : '⧉ Duplicar'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDownload(ova.id)}
            disabled={!isReady || isDownloading || isDuplicating}
            title={!isReady ? 'Solo disponible cuando el OVA está listo' : 'Descargar paquete SCORM'}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDownloading ? 'Descargando...' : 'Descargar'}
          </button>
          <button
            onClick={() => onMoveToTrash(ova)}
            disabled={isGenerating || isMoving || isDuplicating}
            title={isGenerating ? 'No se puede eliminar mientras se está generando' : 'Mover a la papelera'}
            className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isMoving ? 'Moviendo...' : 'Papelera'}
          </button>
        </div>
      </div>
    </div>
  )
}
