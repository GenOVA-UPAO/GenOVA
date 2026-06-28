import { Button } from '@/core/components/ui/button'
import { StateBadge } from '@/core/components/ui/StateBadge'
import {
  checkHtmlQuality,
  type HtmlQuality,
} from '@/features/labs/lib/labQuality'

interface QualityBadgeProps {
  ok: boolean
  label: string
}

interface LabResult {
  result_id: string
  model_id?: string
  provider?: string
  status: string
  html_content?: string
  error?: string
  generation_ms?: number
  quality_checks?: HtmlQuality
}

interface ResultCardProps {
  result: LabResult | null
  isWinner: boolean
  onSelectWinner: (resultId: string) => void
  onExportScorm: (resultId: string) => void
}

function QualityBadge({ ok, label }: QualityBadgeProps) {
  return (
    <StateBadge status={ok ? 'success' : 'error'} className="gap-1 text-[10px]">
      {ok ? '✓' : '✗'} {label}
    </StateBadge>
  )
}

export function ResultCard({
  result,
  isWinner,
  onSelectWinner,
  onExportScorm,
}: ResultCardProps) {
  if (!result) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">Generando...</p>
      </div>
    )
  }

  const q = result.quality_checks || checkHtmlQuality(result.html_content || '')
  const isDone = result.status === 'done'
  const isError = result.status === 'error'

  return (
    <div
      className={`flex flex-col rounded-xl border-2 transition ${
        isWinner ? 'border-primary shadow-lg' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between rounded-t-xl bg-muted/30 px-4 py-2.5">
        <div>
          <span className="text-xs font-semibold text-foreground">
            {result.model_id?.split('/').pop() || result.model_id}
          </span>
          <StateBadge
            status={result.provider === 'groq' ? 'success' : 'info'}
            className="ml-2 text-[10px]"
          >
            {result.provider}
          </StateBadge>
        </div>
        {isDone ? (
          <span className="text-[10px] text-muted-foreground">
            {result.generation_ms
              ? `${(result.generation_ms / 1000).toFixed(1)}s`
              : ''}
          </span>
        ) : null}
      </div>

      <div className="relative flex-1">
        {isError ? (
          <div className="flex min-h-[300px] items-center justify-center bg-destructive/5 p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-destructive">
                Error al generar
              </p>
              <p className="mt-1 text-xs text-destructive/70 max-w-xs break-words">
                {result.error}
              </p>
            </div>
          </div>
        ) : isDone && result.html_content ? (
          <iframe
            srcDoc={result.html_content}
            sandbox="allow-scripts allow-same-origin"
            className="h-[360px] w-full rounded-none border-0"
            title={`Lab result ${result.result_id}`}
          />
        ) : (
          <div className="flex h-[360px] items-center justify-center bg-muted/20">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
              <p className="text-xs text-muted-foreground">
                Generando recurso...
              </p>
            </div>
          </div>
        )}
      </div>

      {isDone ? (
        <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-2">
          <QualityBadge ok={q.cdn_ok} label="CDN libre" />
          <QualityBadge ok={q.scorm_ok} label="SCORM OK" />
          <QualityBadge
            ok={q.min_length_ok}
            label={`${(q.char_count / 1000).toFixed(1)}k chars`}
          />
        </div>
      ) : null}

      {isDone && !isError ? (
        <div className="flex gap-2 border-t border-border px-4 py-3">
          <Button
            variant={isWinner ? 'default' : 'secondary'}
            size="sm"
            onClick={() => onSelectWinner(result.result_id)}
            className="flex-1"
          >
            {isWinner ? '✓ Seleccionado' : 'Seleccionar ganador'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportScorm(result.result_id)}
            title="Exportar como SCORM"
          >
            ⬇ SCORM
          </Button>
        </div>
      ) : null}
    </div>
  )
}
