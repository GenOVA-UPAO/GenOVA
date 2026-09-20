import { Badge } from "@/core/components/ui/badge";
import { cn } from "@/core/lib/cn";

import type { ProviderMeta } from "./platform-key-meta";

interface PlatformKeyRowHeaderProps {
  meta: ProviderMeta;
  configured: boolean;
}

export function PlatformKeyRowHeader({ meta, configured }: Readonly<PlatformKeyRowHeaderProps>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-base font-bold">{meta.label}</p>
          {meta.compat && (
            <Badge
              variant="outline"
              className="border-primary/30 text-[9px] font-bold tracking-widest text-primary uppercase"
            >
              Compatible OpenAI
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{meta.desc}</p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold tracking-widest uppercase shadow-sm",
          configured
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "border-border/50 bg-muted text-muted-foreground",
        )}
      >
        {configured ? "Conectado" : "Sin configurar"}
      </span>
    </div>
  );
}
