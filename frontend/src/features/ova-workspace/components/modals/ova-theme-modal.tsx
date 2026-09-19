import { useState } from "react";

import { Button } from "@/core/components/ui/button";

import type { OvaTheme } from "../../lib/types";
import { WorkspaceModal } from "../shared/workspace-modal";
import { OvaThemePreview } from "./ova-theme-preview";
import { OvaThemeSelector } from "./ova-theme-selector";

interface Props {
  theme: OvaTheme;
  onChange: (theme: OvaTheme) => void;
  onClose: () => void;
}

function themeTitle(draft: OvaTheme): string {
  if (draft.color === "upao" && draft.design === "upao") return "Marca institucional UPAO";
  if (draft.color === "free" && draft.design === "free") return "Estilo libre (IA elige)";
  return "Personalizado";
}

export default function OvaThemeModal({ theme, onChange, onClose }: Readonly<Props>) {
  const [draft, setDraft] = useState<OvaTheme>(theme);
  return (
    <WorkspaceModal title="Tema visual del OVA" onClose={onClose}>
      <p className="-mt-2 text-[10px] text-muted-foreground">{themeTitle(draft)}</p>
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <OvaThemeSelector theme={draft} onChange={setDraft} />
        </div>
        <div className="hidden sm:block">
          <OvaThemePreview draft={draft} />
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <Button
          className="w-full"
          onClick={() => {
            onChange(draft);
            onClose();
          }}
        >
          Aplicar tema
        </Button>
      </div>
    </WorkspaceModal>
  );
}
