import {
  Clock,
  Copy,
  DownloadSimple,
  FileText,
  PencilSimple,
  Play,
  Trash,
} from '@phosphor-icons/react'
import { memo } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/core/components/ui/badge'
import { Button } from '@/core/components/ui/button'
import { formatDate } from '@/features/ova_library/lib/formatDate'
import type { OvaListItem } from '@/features/ova_library/lib/types'
import { OvaCardShell } from './OvaCardShell'

export interface JobInfo {
  jobId?: string | null
  status?: string | null
  progress?: { done: number; total: number } | null
  isInterrupted?: boolean
}

interface OvaCardProps {
  ova: OvaListItem
  job?: JobInfo | Record<string, never>
  onResume: (ovaId: string) => Promise<void>
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onMoveToTrash: (ova: OvaListItem) => void
  onDownload: (ovaId: string, title: string) => Promise<void>
  onDuplicate: (ovaId: string) => void
  onEditMetadata: (ova: OvaListItem) => void
  isMoving: boolean
  isDownloading: boolean
  isDuplicating: boolean
}

const EMPTY_JOB: Record<string, never> = {}

function OvaCardImpl({
  ova,
  job = EMPTY_JOB,
  onResume,
  isSelected,
  onToggleSelect,
  onMoveToTrash,
  onDownload,
  onDuplicate,
  onEditMetadata,
  isMoving,
  isDownloading,
  isDuplicating,
}: OvaCardProps) {
  const navigate = useNavigate()
  const isGenerating = ova.status === 'generando'
  const isReady = ova.status === 'listo'
  const { jobId, progress, isInterrupted } = job as JobInfo

  const handleResume = () => {
    navigate('/crear-ova', { state: { resumeJobId: jobId } })
  }

  const handleContinue = async () => {
    try {
      await onResume(ova.id)
      navigate('/crear-ova', { state: { resumeJobId: jobId } })
    } catch {
      toast.error('No se pudo continuar la generación.')
    }
  }

  const extraBadges = (
    <>
      {ova.version_number ? (
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          v{ova.version_number as string}
        </Badge>
      ) : null}
      {isGenerating && progress ? (
        <Badge
          variant="outline"
          className="text-[10px] text-primary border-primary/30"
        >
          {progress.done}/{progress.total}
        </Badge>
      ) : null}
    </>
  )

  const footer = (
    <>
      {isGenerating ? (
        <div className="flex gap-2 mb-1.5">
          {isInterrupted ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleContinue}
              className="flex-1 gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
            >
              <Play size={14} weight="duotone" /> Continuar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResume}
              disabled={!jobId}
              className="flex-1 gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
            >
              <Clock size={14} weight="duotone" /> Reanudar / Ver progreso
            </Button>
          )}
        </div>
      ) : null}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/ova/${ova.id}/workspace`)}
          disabled={isGenerating || isDuplicating}
          title={isGenerating ? 'No disponible mientras se genera el OVA' : 'Abrir en workspace'}
          className="flex-1 gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
        >
          <PencilSimple size={14} weight="duotone" /> Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEditMetadata(ova)}
          disabled={isGenerating || isDuplicating}
          title={isGenerating ? 'No disponible mientras se genera el OVA' : 'Editar título y descripción'}
          className="flex-1 gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
        >
          <FileText size={14} weight="duotone" /> Metadatos
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDuplicate(ova.id)}
          disabled={isGenerating || isDuplicating}
          title={isGenerating ? 'No disponible mientras se genera el OVA' : 'Duplicar OVA'}
          className="flex-1 gap-1.5"
        >
          <Copy size={14} weight="duotone" />{' '}
          {isDuplicating ? 'Duplicando...' : 'Duplicar'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDownload(ova.id, ova.title ?? '')}
          disabled={!isReady || isDownloading || isDuplicating}
          title={!isReady ? 'Solo disponible cuando el OVA está listo' : 'Descargar paquete SCORM'}
          className="flex-1 gap-1.5"
        >
          <DownloadSimple size={14} weight="duotone" />{' '}
          {isDownloading ? 'Descargando...' : 'Descargar'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMoveToTrash(ova)}
          disabled={isGenerating || isMoving || isDuplicating}
          title={isGenerating ? 'No se puede eliminar mientras se está generando' : 'Mover a la papelera'}
          className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
        >
          <Trash size={14} weight="duotone" />{' '}
          {isMoving ? 'Moviendo...' : 'Papelera'}
        </Button>
      </div>
    </>
  )

  return (
    <OvaCardShell
      ova={ova}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      checkboxDisabled={isGenerating}
      dateValue={formatDate(ova.created_at as string | undefined)}
      extraBadges={extraBadges}
      footer={footer}
    />
  )
}

export const OvaCard = memo(OvaCardImpl)
