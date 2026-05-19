import { useTrashList } from '../hooks/useTrashList.js'
import { ConfirmModal } from '../components/ConfirmModal.jsx'
import { TrashedOvaCard } from '../components/TrashedOvaCard.jsx'

export function PapeleraPage() {
  const {
    ovas,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    selectedIds,
    restoringId,
    deletingId,
    bulkLoading,
    confirmModal,
    allSelected,
    isEmpty,
    handleToggleSelect,
    handleSelectAll,
    handlePageChange,
    handleRestore,
    handlePermanentDelete,
    handleBulkRestore,
    handleBulkPermanentDelete,
    setConfirmModal,
    loadTrash,
  } = useTrashList()

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

      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <span className="text-sm font-semibold text-indigo-700">
            {selectedIds.size} OVA{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleSelectAll()}
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
