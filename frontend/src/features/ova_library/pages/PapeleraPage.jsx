import { useTrashList } from '@/features/ova_library/hooks/useTrashList.js'
import { ConfirmModal } from '@/core/components/ConfirmModal.jsx'
import { TrashedOvaCard } from '@/features/ova_library/components/cards/TrashedOvaCard.jsx'
import { Button } from '@/core/components/ui/button'
import { Checkbox } from '@/core/components/ui/checkbox'
import { Badge } from '@/core/components/ui/badge'

export function PapeleraPage() {
  const {
    ovas, loading, error, currentPage, totalPages, totalItems,
    selectedIds, restoringId, deletingId, bulkLoading, confirmModal,
    allSelected, isEmpty,
    handleToggleSelect, handleSelectAll, handlePageChange,
    handleRestore, handlePermanentDelete, handleBulkRestore,
    handleBulkPermanentDelete, setConfirmModal, loadTrash,
  } = useTrashList()

  return (
    <div className="space-y-6">
      {confirmModal ? (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          isLoading={bulkLoading || !!restoringId || !!deletingId}
        />
      ) : null}

      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Papelera</h1>
          <p className="text-sm text-muted-foreground mt-1">
            OVAs movidos a la papelera. Restáuralos o elimínalos definitivamente.
          </p>
        </div>
        {!loading && !error && totalItems > 0 ? (
          <Badge variant="destructive" className="self-start md:self-auto">
            {totalItems} OVA{totalItems > 1 ? 's' : ''} en papelera
          </Badge>
        ) : null}
      </div>

      {!loading && !error && ovas.length > 0 ? (
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground font-medium">
          <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
          Seleccionar todos en esta página
        </label>
      ) : null}

      {selectedIds.size > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-sm font-semibold text-primary">
            {selectedIds.size} OVA{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => handleSelectAll()} disabled={bulkLoading}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkRestore}
              disabled={bulkLoading}
              className="text-primary border-primary/30 hover:bg-primary/5"
            >
              ↩ Restaurar ({selectedIds.size})
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkPermanentDelete} disabled={bulkLoading}>
              🗑 Borrar definitivamente ({selectedIds.size})
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-xs text-muted-foreground">Cargando papelera...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <p className="text-sm text-destructive font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadTrash(currentPage)}>
              Reintentar
            </Button>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <div className="mb-4 text-4xl">🗑️</div>
          <p className="text-sm font-semibold">Tu papelera está vacía</p>
          <p className="mt-1 text-xs text-muted-foreground">Los OVAs que muevas a la papelera aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

      {!loading && !error && totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-border pt-4 px-1">
          <p className="text-xs text-muted-foreground font-medium">
            Página <span className="text-foreground font-bold">{currentPage}</span> de{' '}
            <span className="text-foreground font-bold">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              &lt;&lt; Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
              Siguiente &gt;&gt;
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
