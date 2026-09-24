import { useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

import { EXAMPLE_PROMPT } from "../../lib/creation-form";
import { missingPromptChars } from "../../lib/creation-guidance";

interface Props {
  prompt: string;
  onPrompt: (prompt: string) => void;
  /** Muestra la validación como error (tras salir del campo o intentar generar). */
  showError: boolean;
  onBlur: () => void;
  onSubmitShortcut: () => void;
}

const HELP_ID = "ova-create-prompt-help";

function helpText(prompt: string): string {
  const missing = missingPromptChars(prompt);
  if (prompt.trim().length > 0 && missing > 0)
    return `Faltan ${String(missing)} caracteres para generar`;
  return "Incluye el tema, los objetivos de aprendizaje y el nivel. Mínimo 10 caracteres.";
}

/** Campo principal de /crear: label visible, ayuda debajo y error solo tras interactuar. */
export function CreationPromptField({
  prompt,
  onPrompt,
  showError,
  onBlur,
  onSubmitShortcut,
}: Readonly<Props>) {
  const invalid = showError && missingPromptChars(prompt) > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // El ejemplo sustituye lo escrito: si había texto propio, se ofrece deshacerlo.
  const applyExample = () => {
    const previous = prompt;
    onPrompt(EXAMPLE_PROMPT);
    textareaRef.current?.focus();
    if (previous.trim() === "" || previous === EXAMPLE_PROMPT) return;
    toast("Se reemplazó tu descripción por el ejemplo.", {
      action: {
        label: "Deshacer",
        onClick: () => {
          onPrompt(previous);
        },
      },
    });
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="ova-create-prompt" className="text-sm font-medium text-foreground">
          Describe el tema del OVA
        </label>
        <Button
          variant="link"
          size="sm"
          className="-my-2 -mr-2.5 h-9 text-sm max-sm:h-11"
          aria-label="Usar ejemplo de prompt"
          onClick={applyExample}
        >
          Usar ejemplo
        </Button>
      </div>
      <textarea
        ref={textareaRef}
        id="ova-create-prompt"
        rows={5}
        aria-describedby={HELP_ID}
        aria-invalid={invalid || undefined}
        className={cn(
          "block w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-base leading-relaxed placeholder:text-muted-foreground sm:text-sm",
          "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring",
          "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/40",
        )}
        placeholder="Ej.: Ley de Ohm para un primer curso de ingeniería. Objetivo: resolver circuitos en serie y paralelo."
        value={prompt}
        onChange={(event) => {
          onPrompt(event.target.value);
        }}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault();
            onSubmitShortcut();
          }
        }}
      />
      <div className="flex items-start justify-between gap-3 text-xs">
        <p
          id={HELP_ID}
          className={invalid ? "font-medium text-destructive" : "text-muted-foreground"}
        >
          {helpText(prompt)}
        </p>
        <p className="hidden shrink-0 text-muted-foreground sm:block">Ctrl+Enter para generar</p>
      </div>
    </div>
  );
}
