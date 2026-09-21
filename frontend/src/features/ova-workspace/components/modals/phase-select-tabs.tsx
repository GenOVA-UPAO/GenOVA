import { Icon } from "@/core/components/icon";

import { PHASE_SELECT_CFG, type PhaseResourceMap } from "../../lib/phase-select.config";

interface Props {
  phase: string;
  picks: PhaseResourceMap;
  onChange: (phase: string) => void;
}

export function PhaseSelectTabs({ phase, picks, onChange }: Readonly<Props>) {
  return (
    <nav className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-2 sm:grid-cols-5" aria-label="Fases">
      {PHASE_SELECT_CFG.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={phase === item.key}
          onClick={() => { onChange(item.key); }}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border px-2 py-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${phase === item.key ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-transparent text-foreground hover:bg-background"}`}
        >
          <Icon name={item.icon} size="text-base" />
          <span>{item.label} ({picks[item.key].length})</span>
          {picks[item.key].length > 0 && <Icon name="check-circle" weight="fill" />}
        </button>
      ))}
    </nav>
  );
}
