import type { PhaseWithContent } from "../../lib/types";
import { ChatRegenToolbar } from "./chat-regen-toolbar";
import { ChatResourceSelect } from "./chat-resource-select";

interface Props {
  busy: boolean;
  selecting: boolean;
  selected: string[];
  phases: PhaseWithContent[];
  onRegenAll: () => void;
  onToggleSelect: () => void;
  onToggleResource: (id: string, checked: boolean) => void;
  onSelectAllResources: () => void;
}

export function ChatPanelHeader({
  busy,
  selecting,
  selected,
  phases,
  onRegenAll,
  onToggleSelect,
  onToggleResource,
  onSelectAllResources,
}: Readonly<Props>) {
  return (
    <div className="shrink-0 space-y-3 border-b bg-muted/10 p-4">
      <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
        Instrucciones
      </h2>
      <ChatRegenToolbar
        busy={busy}
        selecting={selecting}
        selectedCount={selected.length}
        onRegenAll={onRegenAll}
        onToggleSelect={onToggleSelect}
      />
      {selecting && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border/70 bg-background/50 p-3">
          <ChatResourceSelect
            phases={phases}
            selected={selected}
            onToggle={onToggleResource}
            onSelectAll={onSelectAllResources}
          />
        </div>
      )}
    </div>
  );
}
