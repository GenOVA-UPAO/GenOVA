import { Link } from 'react-router'
import { FolderOpen, Search, SearchX } from 'lucide-react'
import { useOvaList } from '../hooks/ova/useOvaList.js'
import { useGeneratingJobs } from '../hooks/ova/useGeneratingJobs.js'
import { OvaCard } from '../components/OvaCard.jsx'
import { OvaGridSkeleton } from '../components/OvaGridSkeleton.jsx'
import { OvaListPagination } from '../components/OvaListPagination.jsx'
import { TrashModal } from '../components/TrashModal.jsx'
import { BulkTrashModal } from '../components/BulkTrashModal.jsx'
import { EditMetadataModal } from '../components/EditMetadataModal.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function MisOvasPage() {
  const list = useOvaList()
  const { jobs, resume } = useGeneratingJobs(list.ovas)

  return (
    <div className="space-y-6">
      {list.ovaToTrash ? (
        <TrashModal ova={list.ovaToTrash} onConfirm={list.handleTrashConfirm} onCancel={list.handleTrashCancel} isLoading={!!list.movingId} />
      ) : null}
      {list.showBulkModal ? (
        <BulkTrashModal count={list.selectedIds.size} onConfirm={list.handleBulkTrashConfirm} onCancel={() => list.setShowBulkModal(false)} isLoading={list.bulkLoading} />
      ) : null}
      {list.metadataModalOpen ? (
        <EditMetadataModal form={list.metadataForm} onChange={list.handleMetadataChange} onSubmit={list.handleMetadataSave} onCancel={list.closeMetadataModal} isLoading={list.metadataSaving} error={list.metadataError} />
      ) : null}

      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mis OVAs</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona y descarga tus objetos virtuales de aprendizaje generados.</p>
        </div>
        {!list.loading && !list.error ? (
          <div className="bg-muted rounded-lg px-3 py-1.5 text-xs text-muted-foreground font-semibold self-start md:self-auto border border-border shadow-sm">
            Total: <span className="text-primary font-bold text-sm">{list.totalItems}</span> OVAs
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por título..."
            value={list.searchInput}
            onChange={list.handleSearchChange}
            className="pl-9"
          />
        </div>
        <Select
          value={list.statusFilter || 'all'}
          onValueChange={(val) => list.handleStatusChange({ target: { value: val === 'all' ? '' : val } })}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="generando">Generando</SelectItem>
            <SelectItem value="listo">Listo</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!list.loading && !list.error && list.ovas.length > 0 ? (
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground font-medium">
          <Checkbox checked={list.allSelected} onCheckedChange={list.handleSelectAll} />
          Seleccionar todos en esta página
        </label>
      ) : null}

      {list.selectedIds.size > 0 ? (
        <div className="sticky top-2 z-20 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-primary/5">
          <span className="text-sm font-semibold text-primary">
            {list.selectedIds.size} OVA{list.selectedIds.size > 1 ? 's' : ''} seleccionado{list.selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => list.setSelectedIds(new Set())}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => list.setShowBulkModal(true)}>
              Mover a la papelera ({list.selectedIds.size})
            </Button>
          </div>
        </div>
      ) : null}

      {list.loading ? (
        <OvaGridSkeleton />
      ) : list.error ? (
        <div className="flex h-64 items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <p className="text-sm text-destructive font-medium">{list.error}</p>
            <Button variant="outline" size="sm" onClick={() => list.loadOvas(list.currentPage, list.searchInput, list.statusFilter)}>
              Reintentar
            </Button>
          </div>
        </div>
      ) : list.isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
          {list.searchInput || list.statusFilter ? (
            <SearchX className="mb-4 h-10 w-10 text-muted-foreground/60" />
          ) : (
            <FolderOpen className="mb-4 h-10 w-10 text-muted-foreground/60" />
          )}
          {list.searchInput || list.statusFilter ? (
            <>
              <p className="text-sm font-semibold">Sin resultados para tu búsqueda</p>
              <p className="mt-1 text-xs text-muted-foreground">Prueba con otros términos o cambia el filtro de estado.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">Aún no has creado ningún OVA</p>
              <p className="mt-1 text-xs text-muted-foreground">Genera tu primer objeto virtual de aprendizaje con ayuda de la IA.</p>
              <Button asChild className="mt-5">
                <Link to="/crear-ova">Crear mi primer OVA</Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.ovas.map((ova) => (
            <OvaCard
              key={ova.id}
              ova={ova}
              job={jobs[ova.id]}
              onResume={resume}
              isSelected={list.selectedIds.has(ova.id)}
              onToggleSelect={list.handleToggleSelect}
              onMoveToTrash={list.handleMoveToTrashRequest}
              onDownload={list.handleDownload}
              onDuplicate={list.handleDuplicate}
              onEditMetadata={list.openMetadataModal}
              isMoving={list.movingId === ova.id}
              isDownloading={list.downloadingId === ova.id}
              isDuplicating={list.duplicatingId === ova.id}
            />
          ))}
        </div>
      )}

      {!list.loading && !list.error ? (
        <OvaListPagination
          currentPage={list.currentPage}
          totalPages={list.totalPages}
          onPageChange={list.handlePageChange}
        />
      ) : null}
    </div>
  )
}
