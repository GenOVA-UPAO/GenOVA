import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

const QUICK_PROMPTS = [
  { label: "Quitar ejemplo", prompt: "quita el ejemplo" },
  { label: "Añadir resumen", prompt: "añade un resumen al final" },
  { label: "Pregunta al inicio", prompt: "pon la pregunta al inicio" },
  { label: "Añadir objetivo", prompt: "agrega un objetivo de aprendizaje al inicio" },
  { label: "Quitar última pregunta", prompt: "quita la última pregunta del quiz" },
] as const;

interface Props {
  prompt: string;
  onChangePrompt: (value: string) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  isDisabled: boolean;
  statusMessage: string | null;
  errorMessage: string | null;
}

export function VisualPromptControls({
  prompt,
  onChangePrompt,
  onSubmit,
  isProcessing,
  isDisabled,
  statusMessage,
  errorMessage,
}: Readonly<Props>) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-2xs">
      <div className="flex items-center justify-between">
        <label htmlFor="visual-prompt" className="block text-xs font-bold text-foreground">
          Instrucción de cambio
        </label>
      </div>

      <textarea
        id="visual-prompt"
        rows={3}
        value={prompt}
        onChange={(e) => {
          onChangePrompt(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !isDisabled) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Ej. pon la pregunta al inicio, quita el ejemplo, añade un resumen..."
        className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        disabled={isProcessing}
      />

      <div className="flex flex-wrap gap-1.5">
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.label}
            type="button"
            onClick={() => {
              onChangePrompt(qp.prompt);
            }}
            className="rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            {qp.label}
          </button>
        ))}
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isDisabled}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-xs transition-colors",
            "hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <Icon
            name={isProcessing ? "spinner" : "lightning"}
            className={cn("size-3.5", isProcessing && "animate-spin")}
          />
          {isProcessing ? "Interpretando y aplicando intención…" : "Interpretar y aplicar cambio"}
        </button>
      </div>

      {statusMessage && <p className="text-[11px] font-medium text-primary">{statusMessage}</p>}
      {errorMessage && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
