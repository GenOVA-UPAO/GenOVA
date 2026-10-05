import i18n from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/core/lib/cn";

import { InteractiveReveal } from "./interactive-reveal";

interface Choice {
  value: string;
  text: string;
  correct: boolean;
  feedback?: string;
}

interface Props {
  id: string;
  prompt: string;
  choices?: Choice[];
  explanation?: string;
}

function choiceClass(isPicked: boolean, isCorrect: boolean): string {
  if (!isPicked) return "border-border bg-background hover:bg-muted/50";
  return isCorrect
    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
    : "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20";
}

function feedbackClass(isCorrect: boolean): string {
  return isCorrect
    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200"
    : "bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-200";
}

function feedbackText(choice: Choice): string {
  if (choice.feedback) return choice.feedback;
  return choice.correct ? i18n.t("workspace:correcto") : i18n.t("workspace:opcion_incorrecta");
}

export function InteractiveQuestion({ id, prompt, choices = [], explanation }: Readonly<Props>) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const selectedChoice = choices.find((c) => c.value === selected);

  return (
    <div key={id} className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          ?
        </span>
        <h3 className="font-heading text-sm font-bold text-foreground">{prompt}</h3>
      </div>

      {choices.length > 0 && (
        <div className="mt-3 space-y-2">
          {choices.map((choice) => {
            const isPicked = selected === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                onClick={() => {
                  setSelected(choice.value);
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                  choiceClass(isPicked, choice.correct)
                )}
              >
                <span className="font-mono text-xs font-bold text-muted-foreground">{choice.value}</span>
                <span className="flex-1">{choice.text}</span>
              </button>
            );
          })}
          {selectedChoice && (
            <div className={cn("mt-2 rounded-lg p-2.5 text-xs font-medium", feedbackClass(selectedChoice.correct))}>
              {feedbackText(selectedChoice)}
            </div>
          )}
        </div>
      )}

      {explanation && (
        <InteractiveReveal
          id={`${id}-explanation`}
          label={t("workspace:ver_respuesta_fundamentada")}
          content={explanation}
        />
      )}
    </div>
  );
}
