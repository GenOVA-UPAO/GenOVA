import i18n from "i18next";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

import { examplePrompt } from "../../lib/creation-form";
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
    return i18n.t("workspace:faltan_value_caracteres_para_generar", { p0: String(missing) });
  return i18n.t("workspace:incluye_el_tema_los_objetivos_de_aprendizaje__aefed8");
}

/** Campo principal de /crear: label visible, ayuda debajo y error solo tras interactuar. */
export function CreationPromptField({
  prompt,
  onPrompt,
  showError,
  onBlur,
  onSubmitShortcut,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const invalid = showError && missingPromptChars(prompt) > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // El ejemplo sustituye lo escrito: si había texto propio, se ofrece deshacerlo.
  const applyExample = () => {
    const previous = prompt;
    const example = examplePrompt();
    onPrompt(example);
    textareaRef.current?.focus();
    if (previous.trim() === "" || previous === example) return;
    toast(t("workspace:se_reemplazo_tu_descripcion_por_el_ejemplo"), {
      action: {
        label: t("workspace:deshacer"),
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
          {t("workspace:describe_el_tema_del_ova")} </label>
        <Button
          variant="link"
          size="sm"
          className="-my-2 -mr-2.5 h-9 text-sm max-sm:h-11"
          aria-label={t("workspace:usar_ejemplo_de_prompt")}
          onClick={applyExample}
        >
          {t("workspace:usar_ejemplo")} </Button>
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
        placeholder={t("workspace:ej_control_de_concurrencia_en_oracle_objetivo_51e6e2")}
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
        <p className="hidden shrink-0 text-muted-foreground sm:block">{t("workspace:ctrl_enter_para_generar")}</p>
      </div>
    </div>
  );
}
