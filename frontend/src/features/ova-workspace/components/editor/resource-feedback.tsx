import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";

import { useResourceFeedback } from "../../hooks/use-resource-feedback";
import { FeedbackThumb } from "./feedback-thumb";
import { ResourceFeedbackForm } from "./resource-feedback-form";

interface Props {
  ovaId: string;
  phaseId: string;
  /** Nombre del recurso: da contexto a los lectores de pantalla. */
  resourceName: string;
}

/**
 * 👍/👎 discreto del recurso visible. «Me sirvió» guarda al instante (y pulsado de nuevo
 * lo quita); «No me sirvió» abre un popover con el motivo y un comentario opcional. El
 * motivo alimenta la mejora de las plantillas.
 */
export function ResourceFeedback({ ovaId, phaseId, resourceName }: Readonly<Props>) {
  const { t } = useTranslation();
  const feedback = useResourceFeedback(ovaId, phaseId);
  const [open, setOpen] = useState(false);
  const down = feedback.current?.rating === "down" ? feedback.current : null;
  return (
    <span role="group" aria-label={t("workspace:valorar_value", { p0: resourceName })} className="flex shrink-0 items-center">
      <FeedbackThumb
        icon="thumbs-up"
        tone="text-primary"
        pressed={feedback.current?.rating === "up"}
        aria-label={t("workspace:este_recurso_me_sirvio")}
        title={t("workspace:me_sirvio")}
        disabled={feedback.busy}
        onClick={feedback.toggleUp}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FeedbackThumb
            icon="thumbs-down"
            tone="text-destructive"
            pressed={down !== null}
            aria-label={t("workspace:este_recurso_no_me_sirvio")}
            title={t("workspace:no_me_sirvio")}
          />
        </PopoverTrigger>
        <PopoverContent align="end" side="top" className="w-80 max-w-[calc(100vw-2rem)] p-4">
          {/* key: cada vez que se abre, o cambia el recurso, el formulario parte de lo guardado. */}
          <ResourceFeedbackForm
            key={`${phaseId}:${String(open)}`}
            initialReason={down?.reason ?? null}
            initialComment={down?.comment ?? ""}
            pending={feedback.saving}
            onSubmit={(reason, comment) => {
              feedback.sendDown(reason, comment, () => {
                setOpen(false);
              });
            }}
          />
        </PopoverContent>
      </Popover>
    </span>
  );
}
