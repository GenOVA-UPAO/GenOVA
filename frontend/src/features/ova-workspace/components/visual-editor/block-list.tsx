import { useState } from "react";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import type { ResourceBlock } from "../../lib/visual-editor.types";

interface Props {
  blocks: ResourceBlock[];
  isLoading?: boolean;
}

const MUTED_BADGE = "bg-muted text-muted-foreground";

const BLOCK_META_MAP: Record<string, { label: string; icon: string; badgeClass: string }> = {
  "upao-header": { label: "Encabezado", icon: "article", badgeClass: "bg-primary/10 text-primary" },
  header: { label: "Encabezado", icon: "article", badgeClass: "bg-primary/10 text-primary" },
  p: { label: "Párrafo", icon: "text-align-left", badgeClass: MUTED_BADGE },
  paragraph: { label: "Párrafo", icon: "text-align-left", badgeClass: MUTED_BADGE },
  "upao-example": { label: "Ejemplo", icon: "magnifying-glass", badgeClass: "bg-primary/15 text-primary" },
  example: { label: "Ejemplo", icon: "magnifying-glass", badgeClass: "bg-primary/15 text-primary" },
  "upao-question": { label: "Pregunta", icon: "question", badgeClass: "bg-accent-brand/15 text-accent-brand" },
  question: { label: "Pregunta", icon: "question", badgeClass: "bg-accent-brand/15 text-accent-brand" },
  "upao-summary": { label: "Resumen", icon: "check-circle", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  summary: { label: "Resumen", icon: "check-circle", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  "upao-comic-panel": { label: "Cómic", icon: "cards", badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  panel: { label: "Cómic", icon: "cards", badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  "upao-card": { label: "DBA Panel", icon: "wrench", badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  card: { label: "DBA Panel", icon: "wrench", badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
};

function blockMeta(tipo: string): { label: string; icon: string; badgeClass: string } {
  return BLOCK_META_MAP[tipo] ?? {
    label: tipo,
    icon: "cube",
    badgeClass: MUTED_BADGE,
  };
}

function blockSummary(block: ResourceBlock): string {
  const p = block.props;
  const candidateKeys = ["title", "prompt", "dialogue", "text", "content"] as const;
  for (const key of candidateKeys) {
    const val = p[key];
    if (typeof val === "string" && val.length > 0) {
      return val.slice(0, 60);
    }
  }
  return block.id;
}

export function BlockList({ blocks, isLoading = false }: Readonly<Props>) {
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs text-muted-foreground">
        <Icon name="spinner" className="size-3.5 animate-spin" />
        Extrayendo bloques del recurso…
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
        No se detectaron bloques en el HTML actual del recurso.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/80 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-heading text-xs font-bold text-foreground">Bloques detectados</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.2 text-[11px] font-bold text-primary tabular-nums">
            {blocks.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => { setCollapsed(!collapsed); }}
          className="text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
        >
          {collapsed ? "Mostrar" : "Plegar"}
        </button>
      </div>

      {!collapsed && (
        <div className="max-h-56 divide-y divide-border/60 overflow-y-auto px-1 py-1">
          {blocks.map((block) => {
            const meta = blockMeta(block.tipo);
            return (
              <div key={block.id} className="flex items-start gap-2.5 px-2.5 py-2 text-xs">
                <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-xs px-1.5 py-0.5 font-bold uppercase text-[10px]", meta.badgeClass)}>
                  <Icon name={meta.icon} className="size-3" />
                  {meta.label}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground font-medium">
                  {blockSummary(block)}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
                  {block.id}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
