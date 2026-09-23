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
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name="chat-text" className="size-5" />
      </span>
      <h3 className="mt-3 font-display text-base font-semibold text-foreground">
        ¿Cómo deseas mejorar este OVA?
      </h3>
      <p className="mt-1 max-w-64 text-sm text-muted-foreground">
        Escribe abajo qué quieres cambiar. La IA lo aplicará y quedará una nueva versión.
      </p>
      {onSelectPrompt && (
        <div className="mt-5 flex w-full max-w-72 flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Prueba con:</p>
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                onSelectPrompt(suggestion);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors duration-150 outline-none hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
