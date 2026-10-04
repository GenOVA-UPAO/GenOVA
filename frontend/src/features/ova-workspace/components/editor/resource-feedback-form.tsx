import { useId, useState } from "react";

import { Button } from "@/core/components/ui/button";
import { Textarea } from "@/core/components/ui/textarea";

import { COMMENT_MAX, FEEDBACK_REASONS, type FeedbackReason } from "../../lib/resource-feedback";

interface Props {
  initialReason: FeedbackReason | null;
  initialComment: string;
  pending: boolean;
  onSubmit: (reason: FeedbackReason | null, comment: string) => void;
}

/** Motivo (radios nativos, operables con flechas) + comentario opcional del 👎. */
export function ResourceFeedbackForm({
  initialReason,
  initialComment,
  pending,
  onSubmit,
}: Readonly<Props>) {
  const base = useId();
  const [reason, setReason] = useState<FeedbackReason | null>(initialReason);
  const [comment, setComment] = useState(initialComment);
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(reason, comment.trim());
      }}
    >
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">¿Qué falló en este recurso?</legend>
        <div className="grid grid-cols-1 gap-0.5">
          {FEEDBACK_REASONS.map((item) => (
            <label
              key={item.value}
              className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm hover:bg-muted max-sm:min-h-11"
            >
              <input
                type="radio"
                name={`${base}-reason`}
                value={item.value}
                checked={reason === item.value}
                onChange={() => {
                  setReason(item.value);
                }}
                className="size-4 accent-primary"
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1">
        <label htmlFor={`${base}-comment`} className="text-sm font-medium">
          Comentario <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Textarea
          id={`${base}-comment`}
          value={comment}
          maxLength={COMMENT_MAX}
          rows={3}
          aria-describedby={`${base}-count`}
          placeholder="Cuéntanos qué esperabas…"
          onChange={(event) => {
            setComment(event.target.value);
          }}
        />
        <p id={`${base}-count`} className="text-right text-xs text-muted-foreground tabular-nums">
          {comment.length}/{COMMENT_MAX}
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || reason === null}>
          {pending ? "Enviando…" : "Enviar valoración"}
        </Button>
      </div>
    </form>
  );
}
