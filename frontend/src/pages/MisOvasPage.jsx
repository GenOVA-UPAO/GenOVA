import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { deleteOva, downloadOvaFile, fetchOvas } from '../services/ovaHistoryService.js'

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

const STATUS_ICONS = {
  borrador: '○',
  generando: '⟳',
  listo: '●',
  error: '⚠',
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[status] || STATUS_CLASSES.borrador}`}
    >
      <span>{STATUS_ICONS[status] || '○'}</span>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function OvaCard({ ova, onDelete, onDownload, isDeleting, isDownloading }) {
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
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
        <button
          onClick={() => navigate(`/mis-ovas/${ova.id}/editar`)}
          disabled={isGenerating}
          title={isGenerating ? 'No disponible mientras se genera el OVA' : 'Editar OVA'}
          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ✏ Editar
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDownload(ova.id)}
            disabled={!isReady || isDownloading}
            title={!isReady ? 'Solo disponible cuando el OVA está listo' : 'Descargar paquete SCORM'}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDownloading ? 'Descargando...' : 'Descargar'}
          </button>
          <button
            onClick={() => onDelete(ova)}
            disabled={isGenerating || isDeleting}
            title={isGenerating ? 'No se puede eliminar mientras se está generando' : 'Eliminar OVA'}
            className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ ova, onConfirm, onCancel, isDeleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-bold text-slate-900">Eliminar OVA</h2>
        <p className="mt-2 text-sm text-slate-600">
          ¿Estás seguro de que deseas eliminar{' '}
          <span className="font-semibold text-slate-800">"{ova.title}"</span>?
        </p>
        <p className="mt-1 text-xs text-slate-400">Esta acción no se puede deshacer.</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function MisOvasPage() {
  const [ovas, setOvas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [ovaToDelete, setOvaToDelete] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [downloadingId, setDownloadingId] = useState('')

  const searchDebounceRef = useRef(null)

  const loadOvas = useCallback(
    async (page = 1, searchTerm = search, statusTerm = statusFilter) => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchOvas({ page, limit: 10, search: searchTerm, status: statusTerm })
        setOvas(data.ovas || [])
        setTotalPages(data.total_pages || 1)
        setCurrentPage(data.page || 1)
        setTotalItems(data.total_items || 0)
      } catch (err) {
        setError('No se pudo cargar el historial de OVAs.')
      } finally {
        setLoading(false)
      }
    },
    [search, statusFilter]
  )

  useEffect(() => {
    loadOvas(1, search, statusFilter)
  }, [search, statusFilter])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchInput(value)
    clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearch(value)
      setCurrentPage(1)
    }, 400)
  }

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value)
    setCurrentPage(1)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadOvas(newPage, search, statusFilter)
    }
  }

  const handleDeleteRequest = (ova) => setOvaToDelete(ova)
  const handleDeleteCancel = () => setOvaToDelete(null)

  const handleDeleteConfirm = async () => {
    if (!ovaToDelete) return
    setDeletingId(ovaToDelete.id)
    try {
      await deleteOva(ovaToDelete.id)
      toast.success('OVA eliminado correctamente.')
      setOvaToDelete(null)
      const newTotal = totalItems - 1
      const newTotalPages = Math.max(1, Math.ceil(newTotal / 10))
      const targetPage = currentPage > newTotalPages ? newTotalPages : currentPage
      loadOvas(targetPage, search, statusFilter)
    } catch (err) {
      toast.error(err.message || 'Error al eliminar el OVA.')
    } finally {
      setDeletingId('')
    }
  }

  const handleDownload = async (ovaId, title) => {
    setDownloadingId(ovaId)
    try {
      await downloadOvaFile(ovaId, title)
    } catch (err) {
      toast.error(err.message || 'No se pudo descargar el archivo.')
    } finally {
      setDownloadingId('')
    }
  }

  const isEmpty = !loading && !error && ovas.length === 0

  return (
    <div className="space-y-6">
      {ovaToDelete && (
        <DeleteModal
          ova={ovaToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDeleting={!!deletingId}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Mis OVAs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona y descarga tus objetos virtuales de aprendizaje generados.
          </p>
        </div>
        {!loading && !error && (
          <div className="bg-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-600 font-semibold self-start md:self-auto border border-slate-200 shadow-sm">
            Total:{' '}
            <span className="text-indigo-600 font-bold text-sm">{totalItems}</span> OVAs
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar por título..."
            value={searchInput}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={handleStatusChange}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-44"
        >
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="generando">Generando</option>
          <option value="listo">Listo</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="text-xs text-slate-400">Cargando tus OVAs...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button
              onClick={() => loadOvas(currentPage, search, statusFilter)}
              className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-all"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <div className="mb-4 text-4xl">📂</div>
          {search || statusFilter ? (
            <>
              <p className="text-sm font-semibold text-slate-700">Sin resultados para tu búsqueda</p>
              <p className="mt-1 text-xs text-slate-400">
                Prueba con otros términos o cambia el filtro de estado.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700">Aún no has creado ningún OVA</p>
              <p className="mt-1 text-xs text-slate-400">
                Genera tu primer objeto virtual de aprendizaje con ayuda de la IA.
              </p>
              <Link
                to="/crear-ova"
                className="mt-5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Crear mi primer OVA
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ovas.map((ova) => (
            <OvaCard
              key={ova.id}
              ova={ova}
              onDelete={handleDeleteRequest}
              onDownload={(id) => handleDownload(id, ova.title)}
              isDeleting={deletingId === ova.id}
              isDownloading={downloadingId === ova.id}
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
