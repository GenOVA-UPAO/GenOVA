import {
  FolderOpen,
  MagnifyingGlass,
  MagnifyingGlassMinus,
  Plus,
} from '@phosphor-icons/react'
import { AnimatePresence, m as motion, type Variants } from 'motion/react'
import { Link } from 'react-router'
import { OvaGridSkeleton } from '@/core/components/OvaGridSkeleton'
import { Button } from '@/core/components/ui/button'
import { Checkbox } from '@/core/components/ui/checkbox'
import { Input } from '@/core/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select'
import { OvaCard } from '@/features/ova_library/components/cards/OvaCard'
import { OvaListPagination } from '@/features/ova_library/components/cards/OvaListPagination'
import { BulkTrashModal } from '@/features/ova_library/components/modals/BulkTrashModal'
import { EditMetadataModal } from '@/features/ova_library/components/modals/EditMetadataModal'
import { TrashModal } from '@/features/ova_library/components/modals/TrashModal'
import { useGeneratingJobs } from '@/features/ova_library/hooks/useGeneratingJobs'
import { useOvaList } from '@/features/ova_library/hooks/useOvaList'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
}

export function MisOvasPage() {
  const list = useOvaList()
  const { jobs, resume } = useGeneratingJobs(list.ovas)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 mx-auto max-w-7xl"
    >
      <AnimatePresence>
        {list.ovaToTrash && (
          <TrashModal
            ova={list.ovaToTrash}
            onConfirm={list.handleTrashConfirm}
            onCancel={list.handleTrashCancel}
            isLoading={!!list.movingId}
          />
        )}
        {list.showBulkModal && (
          <BulkTrashModal
            count={list.selectedIds.size}
            onConfirm={list.handleBulkTrashConfirm}
            onCancel={() => list.setShowBulkModal(false)}
            isLoading={list.bulkLoading}
          />
        )}
        {list.metadataModalOpen && (
          <EditMetadataModal
            initial={list.metadataInitial}
            onSave={list.saveMetadata}
            onCancel={list.closeMetadataModal}
            isLoading={list.metadataSaving}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">
            Biblioteca de OVAs
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1.5">
            Gestiona, edita y descarga tus recursos educativos generados.
          </p>
        </div>
        {!list.loading && !list.error && (
          <div className="glass-card rounded-xl px-4 py-2 text-xs text-muted-foreground font-semibold self-start md:self-auto shadow-sm">
            Total:{' '}
            <span className="text-primary font-bold text-sm ml-1">
              {list.totalItems}
            </span>{' '}
            OVAs
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            weight="bold"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder="Buscar por título de la OVA..."
            value={list.searchInput}
            onChange={list.handleSearchChange}
            className="pl-10 border-muted bg-background/50 h-10 shadow-inner focus-visible:ring-primary/30"
          />
        </div>
        <Select
          value={list.statusFilter || 'all'}
          onValueChange={(val) =>
            list.handleStatusChange({
              target: { value: val === 'all' ? '' : val },
            })
          }
        >
          <SelectTrigger className="sm:w-48 h-10 border-muted bg-background/50 font-medium">
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

      {!list.loading && !list.error && list.ovas.length > 0 && (
        <label
          htmlFor="misovas-select-all"
          className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground font-semibold px-2 hover:text-foreground transition-colors w-fit"
        >
          <Checkbox
            id="misovas-select-all"
            checked={list.allSelected}
            onCheckedChange={list.handleSelectAll}
            className="rounded-sm"
          />
          Seleccionar todos en esta página
        </label>
      )}

      <AnimatePresence>
        {list.selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="sticky top-4 z-30 flex items-center justify-between rounded-2xl border-2 border-primary/30 bg-primary/10 px-5 py-3.5 shadow-lg backdrop-blur-md"
          >
            <span className="text-sm font-bold text-primary flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                {list.selectedIds.size}
              </span>
              OVA{list.selectedIds.size > 1 ? 's' : ''} seleccionado
              {list.selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => list.setSelectedIds(new Set())}
                className="hover:bg-primary/20 text-primary font-semibold"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => list.setShowBulkModal(true)}
                className="shadow-md"
              >
                Eliminar ({list.selectedIds.size})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {list.loading ? (
        <OvaGridSkeleton />
      ) : list.error ? (
        <div className="flex h-64 items-center justify-center p-6 text-center">
          <div className="space-y-4">
            <p className="text-sm text-destructive font-semibold bg-destructive/10 px-4 py-2 rounded-lg inline-block">
              {list.error}
            </p>
            <div>
              <Button
                variant="outline"
                onClick={() => list.loadOvas(list.currentPage)}
              >
                Reintentar conexión
              </Button>
            </div>
          </div>
        </div>
      ) : list.isEmpty ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 glass-card py-20 text-center"
        >
          {list.searchInput || list.statusFilter ? (
            <MagnifyingGlassMinus
              size={48}
              weight="duotone"
              className="mb-5 text-muted-foreground/40"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-5">
              <FolderOpen size={40} weight="duotone" />
            </div>
          )}

          {list.searchInput || list.statusFilter ? (
            <>
              <p className="font-display text-xl font-semibold">
                Sin resultados para tu búsqueda
              </p>
              <p className="mt-2 text-sm text-muted-foreground font-medium max-w-md">
                Prueba con otros términos de búsqueda o cambia el filtro de
                estado actual.
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl font-semibold text-primary">
                Aún no has creado ningún OVA
              </p>
              <p className="mt-2 text-sm text-muted-foreground font-medium max-w-md">
                Empieza generando tu primer objeto virtual de aprendizaje.
                Nuestro asistente de IA te guiará en el proceso.
              </p>
              <Button
                asChild
                className="mt-6 shadow-lg shadow-primary/20 rounded-xl px-6"
              >
                <Link to="/crear-ova">
                  <Plus size={18} weight="bold" className="mr-2" /> Crear mi
                  primer OVA
                </Link>
              </Button>
            </>
          )}
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          {list.ovas.map((ova) => (
            <motion.div key={ova.id} variants={itemVariants}>
              <OvaCard
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
            </motion.div>
          ))}
        </motion.div>
      )}

      {!list.loading && !list.error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <OvaListPagination
            currentPage={list.currentPage}
            totalPages={list.totalPages}
            onPageChange={list.handlePageChange}
          />
        </motion.div>
      )}
    </motion.div>
  )
}
