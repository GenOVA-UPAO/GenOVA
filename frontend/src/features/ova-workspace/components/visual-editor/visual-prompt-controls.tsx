import i18n from "i18next";
import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

const QUICK_PROMPTS = [
  { get label() { return i18n.t("workspace:quitar_ejemplo"); }, get prompt() { return i18n.t("workspace:quita_el_ejemplo"); } },
  { get label() { return i18n.t("workspace:anadir_resumen"); }, get prompt() { return i18n.t("workspace:anade_un_resumen_al_final"); } },
  { get label() { return i18n.t("workspace:pregunta_al_inicio"); }, get prompt() { return i18n.t("workspace:pon_la_pregunta_al_inicio"); } },
  { get label() { return i18n.t("workspace:anadir_objetivo"); }, get prompt() { return i18n.t("workspace:agrega_un_objetivo_de_aprendizaje_al_inicio"); } },
  { get label() { return i18n.t("workspace:quitar_ultima_pregunta"); }, get prompt() { return i18n.t("workspace:quita_la_ultima_pregunta_del_quiz"); } },
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
  const { t } = useTranslation();
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-2xs">
      <div className="flex items-center justify-between">
        <label htmlFor="visual-prompt" className="block text-xs font-bold text-foreground">
          {t("workspace:instruccion_de_cambio")} </label>
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
        placeholder={t("workspace:visualPromptPlaceholder")}
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
          {isProcessing ? t("workspace:interpretando_y_aplicando_intencion") : t("workspace:interpretar_y_aplicar_cambio")}
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
