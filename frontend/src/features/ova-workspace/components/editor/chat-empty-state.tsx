import { Icon } from "@/core/components/icon";

const PROMPT_SUGGESTIONS = [
  "Simplificar explicaciones teóricas",
  "Añadir actividades prácticas",
  "Ajustar el tono a universitario",
] as const;

interface Props {
  onSelectPrompt?: (prompt: string) => void;
}

export function ChatEmptyState({ onSelectPrompt }: Readonly<Props>) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon name="sparkle" className="size-5" />
      </div>
      <h3 className="mt-3 font-display text-sm font-semibold text-foreground">
        ¿Cómo deseas mejorar este OVA?
      </h3>
      <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
        Escribe abajo tus instrucciones de cambio o regenera el OVA según tus necesidades.
      </p>
      {onSelectPrompt && (
        <div className="mt-4 flex w-full max-w-[280px] flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Ideas de prompt:</span>
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                onSelectPrompt(suggestion);
              }}
              className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 text-left text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            >
              «{suggestion}»
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
