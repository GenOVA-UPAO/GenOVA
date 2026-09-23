import { useState } from "react";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

interface CopyFieldProps {
  label: string;
  value: string;
  ariaLabel: string;
  mono?: boolean;
}

export function CopyField({ label, value, ariaLabel, mono = false }: Readonly<CopyFieldProps>) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-start gap-2">
        <code
          className={cn(
            "min-w-0 flex-1 pt-1.5 text-xs [overflow-wrap:anywhere] text-foreground",
            mono && "font-mono",
          )}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          title={ariaLabel}
          aria-label={copied ? "Copiado" : ariaLabel}
        >
          <Icon
            name={copied ? "check" : "copy"}
            size="text-sm"
            className={copied ? "text-success" : undefined}
          />
        </button>
      </div>
    </div>
  );
}
