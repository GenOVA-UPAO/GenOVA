import { useState } from "react";

import { Button } from "@/core/components/ui/button";

import type { OvaTheme } from "../../lib/types";
import { ModalActions } from "../shared/modal-actions";
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
    <WorkspaceModal
      title="Tema visual del OVA"
      description={themeTitle(draft)}
      size="md"
      onClose={onClose}
      footer={
        <ModalActions>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onChange(draft);
              onClose();
            }}
          >
            Aplicar tema
          </Button>
        </ModalActions>
      }
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <OvaThemeSelector theme={draft} onChange={setDraft} />
        </div>
        <OvaThemePreview draft={draft} />
      </div>
    </WorkspaceModal>
  );
}
