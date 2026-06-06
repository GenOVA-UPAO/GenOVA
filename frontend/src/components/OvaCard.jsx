import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from './StatusBadge'
import { useJobByOva } from '../hooks/useJobByOva.js'
import { toast } from 'sonner'

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

  // HU-023: poll job state for generating OVAs (lightweight, per-card).
  const { jobId, progress, isInterrupted, resume } = useJobByOva(ova.id, isGenerating)

  const formatDate = (iso) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  const handleResume = () => {
    navigate('/crear-ova', { state: { resumeJobId: jobId } })
  }

  const handleContinue = async () => {
    try {
      await resume()
      navigate('/crear-ova', { state: { resumeJobId: jobId } })
    } catch {
      toast.error('No se pudo continuar la generación.')
    }
  }

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all ${isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'}`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(ova.id)}
          disabled={isGenerating}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{ova.title}</h3>
            <StatusBadge status={ova.status} />
            {ova.version_number ? (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                v{ova.version_number}
              </Badge>
            ) : null}
            {isGenerating && progress ? (
              <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                {progress.done}/{progress.total}
              </Badge>
            ) : null}
          </div>
          {ova.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{ova.description}</p>
          ) : null}
          {ova.owner ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Por: <span className="font-medium text-foreground">{ova.owner.full_name}</span>
            </p>
          ) : null}
          <p className="mt-1.5 text-xs text-muted-foreground">{formatDate(ova.created_at)}</p>
        </div>
      </div>

      {/* HU-023 R4/R7: resume or continue generating OVA */}
      {isGenerating ? (
        <div className="mt-3 flex gap-2">
          {isInterrupted ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleContinue}
              className="flex-1 text-primary border-primary/30 hover:bg-primary/5"
            >
              ▶ Continuar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResume}
              disabled={!jobId}
              className="flex-1 text-primary border-primary/30 hover:bg-primary/5"
            >
              ⏳ Reanudar / Ver progreso
            </Button>
          )}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/ova/${ova.id}/workspace`)}
            disabled={isGenerating || isDuplicating}
            title={isGenerating ? 'No disponible mientras se genera el OVA' : 'Abrir en workspace'}
            className="flex-1 text-primary border-primary/30 hover:bg-primary/5"
          >
            ✏ Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditMetadata(ova)}
            disabled={isGenerating || isDuplicating}
            title={isGenerating ? 'No disponible mientras se genera el OVA' : 'Editar título y descripción'}
            className="flex-1 text-primary border-primary/30 hover:bg-primary/5"
          >
            📝 Metadatos
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDuplicate(ova.id)}
            disabled={isGenerating || isDuplicating}
            title={isGenerating ? 'No disponible mientras se genera el OVA' : 'Duplicar OVA'}
            className="flex-1"
          >
            {isDuplicating ? 'Duplicando...' : '⧉ Duplicar'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(ova.id)}
            disabled={!isReady || isDownloading || isDuplicating}
            title={!isReady ? 'Solo disponible cuando el OVA está listo' : 'Descargar paquete SCORM'}
            className="flex-1"
          >
            {isDownloading ? 'Descargando...' : 'Descargar'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMoveToTrash(ova)}
            disabled={isGenerating || isMoving || isDuplicating}
            title={isGenerating ? 'No se puede eliminar mientras se está generando' : 'Mover a la papelera'}
            className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            {isMoving ? 'Moviendo...' : 'Papelera'}
          </Button>
        </div>
      </div>
    </div>
  )
}
