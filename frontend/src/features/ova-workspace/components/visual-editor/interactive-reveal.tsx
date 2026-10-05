import i18n from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";

interface Props {
  id: string;
  label?: string;
  content: string;
  prompt?: string;
}

export function InteractiveReveal({ id, label = i18n.t("workspace:comprobar_respuesta"), content, prompt }: Readonly<Props>) {
  useTranslation();
  const [open, setOpen] = useState(false);
  const toggle = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div key={id} className="mt-3 rounded-lg border border-border/80 bg-background/80 p-3">
      {prompt && <p className="mb-2 text-sm font-semibold text-foreground">{prompt}</p>}
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 rounded-xs text-xs font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon name={open ? "caret-down" : "caret-right"} className="size-3.5" />
        {label}
      </button>
      {open && (
        <div className="mt-2 rounded-md bg-muted/40 p-2.5 text-xs leading-relaxed text-foreground">
          {content}
        </div>
      )}
    </div>
  );
}
