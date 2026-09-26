import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import { phaseMeta } from "../../lib/phase-meta";
import { PHASE_SELECT_CFG, type PhaseResourceMap } from "../../lib/phase-select.config";

interface Props {
  phase: string;
  picks: PhaseResourceMap;
  onChange: (phase: string) => void;
}

function tabClass(active: boolean): string {
  return cn(
    "flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 sm:flex-1",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active ? "bg-background text-foreground shadow-xs dark:bg-input/60" : "text-muted-foreground hover:text-foreground",
  );
}

function recursosElegidos(count: number): string {
  if (count === 0) return "ningún recurso elegido";
  return count === 1 ? "1 recurso elegido" : `${String(count)} recursos elegidos`;
}

/** Conmutador de fases 5E: nombre en español y cuántos recursos lleva elegidos cada una. */
export function PhaseSelectTabs({ phase, picks, onChange }: Readonly<Props>) {
  return (
    <nav aria-label="Fases" className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
      <div className="flex w-max min-w-full gap-1 rounded-lg bg-muted p-1">
        {PHASE_SELECT_CFG.map((item) => {
          const count = picks[item.key].length;
          const label = phaseMeta(item.key).label;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={phase === item.key}
              aria-label={`${label}: ${recursosElegidos(count)}`}
              onClick={() => {
                onChange(item.key);
              }}
              className={tabClass(phase === item.key)}
            >
              <Icon name={item.icon} className="size-4" />
              <span>{label}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums",
                  count > 0 ? "bg-primary text-primary-foreground" : "bg-foreground/5 text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
