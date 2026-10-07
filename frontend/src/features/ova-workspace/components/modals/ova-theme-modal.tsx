import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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

function themeTitle(draft: OvaTheme, t: TFunction): string {
  if (draft.color === "custom" && draft.palette) return t("workspace:paleta_value", { p0: draft.palette.name });
  if (draft.color === "upao" && draft.design === "upao") return t("workspace:marca_institucional_upao");
  if (draft.color === "free" && draft.design === "free") return t("workspace:la_ia_elige_colores_y_diseno");
  return t("workspace:combinado");
}

export default function OvaThemeModal({ theme, onChange, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<OvaTheme>(theme);
  return (
    <WorkspaceModal
      title={t("workspace:tema_visual_del_ova")}
      description={themeTitle(draft, t)}
      size="md"
      onClose={onClose}
      footer={
        <ModalActions>
          <Button variant="outline" onClick={onClose}>
            {t("workspace:cancelar")} </Button>
          <Button
            onClick={() => {
              onChange(draft);
              onClose();
            }}
          >
            {t("workspace:aplicar_tema")} </Button>
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
