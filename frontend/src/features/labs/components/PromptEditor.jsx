import { Button } from '@/core/components/ui/button'
import { Textarea } from '@/core/components/ui/textarea'
import { Label } from '@/core/components/ui/label'

export function PromptEditor({ promptText, setPromptText, loadingPrompts, onResetBase }) {
  return (
    <div className="flex flex-col gap-3">
      <Label className="text-sm font-semibold">
        Prompt{' '}
        <span className="font-normal text-muted-foreground text-xs">
          — usa <code className="bg-muted px-1 rounded">{'{concept}'}</code> como marcador
        </span>
      </Label>

      {loadingPrompts ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      ) : (
        <Textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          rows={14}
          className="font-mono text-xs resize-y"
          placeholder="Selecciona un recurso para cargar el prompt base..."
        />
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onResetBase}
        className="self-start"
      >
        ↺ Prompt base
      </Button>

      <p className="text-xs text-muted-foreground">
        Los cambios al prompt son solo para esta prueba — Labs es un sandbox. Para
        producción, edita los prompts en el código del backend.
      </p>
    </div>
  )
}
