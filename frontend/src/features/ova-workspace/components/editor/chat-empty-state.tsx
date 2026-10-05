import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";


interface Props {
  onSelectPrompt?: (prompt: string) => void;
}

export function ChatEmptyState({ onSelectPrompt }: Readonly<Props>) {
  const { t } = useTranslation();
  const PROMPT_SUGGESTIONS = [
    t("workspace:simplificar_explicaciones_teoricas"),
    t("workspace:anadir_actividades_practicas"),
    t("workspace:ajustar_el_tono_a_universitario"),
  ];
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name="chat-text" className="size-5" />
      </span>
      <h3 className="mt-3 font-display text-base font-semibold text-foreground">
        {t("workspace:como_deseas_mejorar_este_ova")} </h3>
      <p className="mt-1 max-w-64 text-sm text-muted-foreground">
        {t("workspace:chatEmptyHint")} </p>
      {onSelectPrompt && (
        <div className="mt-5 flex w-full max-w-72 flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("workspace:prueba_con")}</p>
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
