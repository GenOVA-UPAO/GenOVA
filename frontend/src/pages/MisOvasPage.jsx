import { Link } from 'react-router'
import { useOvaList } from '../hooks/useOvaList.js'
import { OvaCard } from '../components/OvaCard.jsx'
import { TrashModal } from '../components/TrashModal.jsx'
import { BulkTrashModal } from '../components/BulkTrashModal.jsx'
import { EditMetadataModal } from '../components/EditMetadataModal.jsx'

export function MisOvasPage() {
  const list = useOvaList()

  return (
    <div className="space-y-6">
      {list.ovaToTrash && (
        <TrashModal ova={list.ovaToTrash} onConfirm={list.handleTrashConfirm} onCancel={list.handleTrashCancel} isLoading={!!list.movingId} />
      )}
      {list.showBulkModal && (
        <BulkTrashModal count={list.selectedIds.size} onConfirm={list.handleBulkTrashConfirm} onCancel={() => list.setShowBulkModal(false)} isLoading={list.bulkLoading} />
      )}
      {list.metadataModalOpen && (
        <EditMetadataModal form={list.metadataForm} onChange={list.handleMetadataChange} onSubmit={list.handleMetadataSave} onCancel={list.closeMetadataModal} isLoading={list.metadataSaving} error={list.metadataError} />
      )}

      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Mis OVAs</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona y descarga tus objetos virtuales de aprendizaje generados.</p>
        </div>
        {!list.loading && !list.error && (
          <div className="bg-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-600 font-semibold self-start md:self-auto border border-slate-200 shadow-sm">
            Total: <span className="text-indigo-600 font-bold text-sm">{list.totalItems}</span> OVAs
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input type="text" placeholder="Buscar por título..." value={list.searchInput} onChange={list.handleSearchChange} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>
        <select value={list.statusFilter} onChange={list.handleStatusChange} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-44">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="generando">Generando</option>
          <option value="listo">Listo</option>
          <option value="error">Error</option>
        </select>
      </div>

      {!list.loading && !list.error && list.ovas.length > 0 && (
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 font-medium">
          <input type="checkbox" checked={list.allSelected} onChange={list.handleSelectAll} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Seleccionar todos en esta página
        </label>
      )}

      {list.selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <span className="text-sm font-semibold text-indigo-700">
            {list.selectedIds.size} OVA{list.selectedIds.size > 1 ? 's' : ''} seleccionado{list.selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button onClick={() => list.setSelectedIds(new Set())} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button onClick={() => list.setShowBulkModal(true)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors">
              Mover a la papelera ({list.selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {list.loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="text-xs text-slate-400">Cargando tus OVAs...</p>
          </div>
        </div>
      ) : list.error ? (
        <div className="flex h-64 items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <p className="text-sm text-red-600 font-medium">{list.error}</p>
            <button onClick={() => list.loadOvas(list.currentPage, list.searchInput, list.statusFilter)} className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-all">
              Reintentar
            </button>
          </div>
        </div>
      ) : list.isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <div className="mb-4 text-4xl">📂</div>
          {list.searchInput || list.statusFilter ? (
            <>
              <p className="text-sm font-semibold text-slate-700">Sin resultados para tu búsqueda</p>
              <p className="mt-1 text-xs text-slate-400">Prueba con otros términos o cambia el filtro de estado.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700">Aún no has creado ningún OVA</p>
              <p className="mt-1 text-xs text-slate-400">Genera tu primer objeto virtual de aprendizaje con ayuda de la IA.</p>
              <Link to="/crear-ova" className="mt-5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                Crear mi primer OVA
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.ovas.map((ova) => (
            <OvaCard
              key={ova.id}
              ova={ova}
              isSelected={list.selectedIds.has(ova.id)}
              onToggleSelect={list.handleToggleSelect}
              onMoveToTrash={list.handleMoveToTrashRequest}
              onDownload={(id) => list.handleDownload(id, ova.title)}
              onDuplicate={list.handleDuplicate}
              onEditMetadata={list.openMetadataModal}
              isMoving={list.movingId === ova.id}
              isDownloading={list.downloadingId === ova.id}
              isDuplicating={list.duplicatingId === ova.id}
            />
          ))}
        </div>
      )}

      {!list.loading && !list.error && list.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-1">
          <p className="text-xs text-slate-500 font-medium">
            Página <span className="text-slate-800 font-bold">{list.currentPage}</span> de <span className="text-slate-800 font-bold">{list.totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button onClick={() => list.handlePageChange(list.currentPage - 1)} disabled={list.currentPage === 1} className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              &lt;&lt; Anterior
            </button>
            <button onClick={() => list.handlePageChange(list.currentPage + 1)} disabled={list.currentPage === list.totalPages} className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              Siguiente &gt;&gt;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
