import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  batchPermanentDelete,
  batchRestore,
  fetchTrashedOvas,
  permanentDeleteOva,
  restoreOva,
} from '../services/ovaHistoryService.js'

const STATUS_LABELS = {
  borrador: 'Borrador',
  generando: 'Generando',
  listo: 'Listo',
  error: 'Error',
}

const STATUS_CLASSES = {
  borrador: 'bg-slate-100 text-slate-700 border-slate-200',
  generando: 'bg-amber-50 text-amber-700 border-amber-200',
  listo: 'bg-green-50 text-green-700 border-green-200',
  error: 'bg-red-50 text-red-700 border-red-200',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[status] || STATUS_CLASSES.borrador}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, isLoading, danger = true }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{message}</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isLoading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function TrashedOvaCard({ ova, isSelected, onToggleSelect, onRestore, onPermanentDelete, isRestoring, isDeleting }) {
  const formatDate = (iso) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm transition-all ${isSelected ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(ova.id)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
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
          <p className="mt-1.5 text-xs text-red-400 font-medium">
            Eliminado el {formatDate(ova.deleted_at)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <button
          onClick={() => onRestore(ova.id)}
          disabled={isRestoring || isDeleting}
          className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRestoring ? 'Restaurando...' : '↩ Restaurar'}
        </button>
        <button
          onClick={() => onPermanentDelete(ova)}
          disabled={isRestoring || isDeleting}
          className="flex-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isDeleting ? 'Eliminando...' : '🗑 Borrar definitivamente'}
        </button>
      </div>
    </div>
  )
}

export function PapeleraPage() {
  const [ovas, setOvas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [restoringId, setRestoringId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  const [confirmModal, setConfirmModal] = useState(null)

  const loadTrash = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchTrashedOvas({ page, limit: 10 })
      setOvas(data.ovas || [])
      setTotalPages(data.total_pages || 1)
      setCurrentPage(data.page || 1)
      setTotalItems(data.total_items || 0)
    } catch {
      setError('No se pudo cargar la papelera.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrash(1)
  }, [loadTrash])

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = ovas.length > 0 && ovas.every((o) => selectedIds.has(o.id))

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(ovas.map((o) => o.id)))
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadTrash(newPage)
      setSelectedIds(new Set())
    }
  }

  // Individual restore
  const handleRestore = (ovaId) => {
    setConfirmModal({
      title: 'Restaurar OVA',
      message: '¿Restaurar este OVA al historial activo?',
      confirmLabel: 'Restaurar',
      danger: false,
      onConfirm: async () => {
        setRestoringId(ovaId)
        setConfirmModal(null)
        try {
          await restoreOva(ovaId)
          toast.success('OVA restaurado correctamente.')
          const newTotal = totalItems - 1
          const newTotalPages = Math.max(1, Math.ceil(newTotal / 10))
          const targetPage = currentPage > newTotalPages ? newTotalPages : currentPage
          loadTrash(targetPage)
        } catch (err) {
          toast.error(err.message || 'Error al restaurar el OVA.')
        } finally {
          setRestoringId('')
        }
      },
    })
  }

  // Individual permanent delete
  const handlePermanentDelete = (ova) => {
    setConfirmModal({
      title: 'Borrar definitivamente',
      message: `¿Eliminar permanentemente "${ova.title}"?\n\nEsta acción eliminará el OVA y su paquete SCORM del servidor. No se puede deshacer.`,
      confirmLabel: 'Borrar',
      danger: true,
      onConfirm: async () => {
        setDeletingId(ova.id)
        setConfirmModal(null)
        try {
          await permanentDeleteOva(ova.id)
          toast.success('OVA eliminado permanentemente.')
          const newTotal = totalItems - 1
          const newTotalPages = Math.max(1, Math.ceil(newTotal / 10))
          const targetPage = currentPage > newTotalPages ? newTotalPages : currentPage
          loadTrash(targetPage)
        } catch (err) {
          toast.error(err.message || 'Error al eliminar el OVA.')
        } finally {
          setDeletingId('')
        }
      },
    })
  }

  // Bulk restore
  const handleBulkRestore = () => {
    const count = selectedIds.size
    setConfirmModal({
      title: 'Restaurar OVAs',
      message: `¿Restaurar ${count} OVA${count > 1 ? 's' : ''} al historial activo?`,
      confirmLabel: `Restaurar ${count}`,
      danger: false,
      onConfirm: async () => {
        setBulkLoading(true)
        setConfirmModal(null)
        try {
          const res = await batchRestore([...selectedIds])
          toast.success(res.message || `${res.restored?.length} OVAs restaurados.`)
          setSelectedIds(new Set())
          const newTotal = totalItems - (res.restored?.length || 0)
          const newTotalPages = Math.max(1, Math.ceil(newTotal / 10))
          const targetPage = currentPage > newTotalPages ? newTotalPages : currentPage
          loadTrash(targetPage)
        } catch (err) {
          toast.error(err.message || 'Error al restaurar los OVAs.')
        } finally {
          setBulkLoading(false)
        }
      },
    })
  }

  // Bulk permanent delete
  const handleBulkPermanentDelete = () => {
    const count = selectedIds.size
    setConfirmModal({
      title: 'Borrar definitivamente',
      message: `¿Eliminar permanentemente ${count} OVA${count > 1 ? 's' : ''}?\n\nEsta acción eliminará los OVAs y sus paquetes SCORM del servidor. No se puede deshacer.`,
      confirmLabel: `Borrar ${count}`,
      danger: true,
      onConfirm: async () => {
        setBulkLoading(true)
        setConfirmModal(null)
        try {
          const res = await batchPermanentDelete([...selectedIds])
          toast.success(res.message || `${res.deleted?.length} OVAs eliminados permanentemente.`)
          setSelectedIds(new Set())
          const newTotal = totalItems - (res.deleted?.length || 0)
          const newTotalPages = Math.max(1, Math.ceil(newTotal / 10))
          const targetPage = currentPage > newTotalPages ? newTotalPages : currentPage
          loadTrash(targetPage)
        } catch (err) {
          toast.error(err.message || 'Error al eliminar los OVAs.')
        } finally {
          setBulkLoading(false)
        }
      },
    })
  }

  const isEmpty = !loading && !error && ovas.length === 0

  return (
    <div className="space-y-6">
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          isLoading={bulkLoading || !!restoringId || !!deletingId}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Papelera</h1>
          <p className="text-sm text-slate-500 mt-1">
            OVAs movidos a la papelera. Restáuralos o elimínalos definitivamente.
          </p>
        </div>
        {!loading && !error && totalItems > 0 && (
          <div className="bg-red-50 rounded-lg px-3 py-1.5 text-xs text-red-600 font-semibold self-start md:self-auto border border-red-200">
            {totalItems} OVA{totalItems > 1 ? 's' : ''} en papelera
          </div>
        )}
      </div>

      {/* Select-all bar */}
      {!loading && !error && ovas.length > 0 && (
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 font-medium">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Seleccionar todos en esta página
        </label>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <span className="text-sm font-semibold text-indigo-700">
            {selectedIds.size} OVA{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkLoading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleBulkRestore}
              disabled={bulkLoading}
              className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-40"
            >
              ↩ Restaurar ({selectedIds.size})
            </button>
            <button
              onClick={handleBulkPermanentDelete}
              disabled={bulkLoading}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-40"
            >
              🗑 Borrar definitivamente ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="text-xs text-slate-400">Cargando papelera...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button onClick={() => loadTrash(currentPage)} className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-all">
              Reintentar
            </button>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <div className="mb-4 text-4xl">🗑️</div>
          <p className="text-sm font-semibold text-slate-700">Tu papelera está vacía</p>
          <p className="mt-1 text-xs text-slate-400">
            Los OVAs que muevas a la papelera aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ovas.map((ova) => (
            <TrashedOvaCard
              key={ova.id}
              ova={ova}
              isSelected={selectedIds.has(ova.id)}
              onToggleSelect={handleToggleSelect}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
              isRestoring={restoringId === ova.id}
              isDeleting={deletingId === ova.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-1">
          <p className="text-xs text-slate-500 font-medium">
            Página <span className="text-slate-800 font-bold">{currentPage}</span> de{' '}
            <span className="text-slate-800 font-bold">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &lt;&lt; Anterior
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Siguiente &gt;&gt;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
