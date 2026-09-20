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
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="flex items-center gap-1 overflow-hidden">
        <code
          className={cn(
            "flex-1 break-all text-foreground",
            mono ? "font-mono text-xs" : "text-[10px]",
          )}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="ml-2 text-muted-foreground transition-colors hover:text-foreground"
          title={ariaLabel}
          aria-label={ariaLabel}
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
