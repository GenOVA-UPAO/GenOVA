import i18n from "i18next";
import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";

import { SegmentedTabs } from "../shared/segmented-tabs";

export type OvaPanelTab = "preview" | "edit" | "visual_editor";

const FEATURE_VISUAL_EDITOR =
  import.meta.env.VITE_FEATURE_VISUAL_EDITOR === "1" ||
  import.meta.env.VITE_FEATURE_VISUAL_EDITOR === "true";

interface Props {
  tab: OvaPanelTab;
  onChange: (tab: OvaPanelTab) => void;
  /** Sin «Editar»: solo se puede ver el OVA. */
  readOnly?: boolean;
}

interface TabOption {
  value: OvaPanelTab;
  label: string;
  icon: string;
  controls: string;
}

function getTabSubtitle(tab: OvaPanelTab): string {
  if (tab === "preview") return i18n.t("workspace:asi_lo_veran_tus_estudiantes");
  if (tab === "edit") return i18n.t("workspace:reordena_regenera_o_ajusta_cada_recurso");
  return i18n.t("workspace:visualEditorTabHint");
}

/** Barra del panel del OVA: «Vista previa» / «Editar» / «Editor visual» y qué se hace en cada una. */
export function WorkspaceOvaPanelTabs({ tab, onChange, readOnly = false }: Readonly<Props>) {
  const { t } = useTranslation();
  if (readOnly)
    return (
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 text-sm font-medium sm:px-4">
        <Icon name="eye" className="text-muted-foreground" />
        {t("workspace:vista_previa")} </div>
    );

  const options: TabOption[] = [
    {
      value: "preview",
      label: t("workspace:vista_previa"),
      icon: "eye",
      controls: "workspace-ova-preview",
    },
    {
      value: "edit",
      label: t("workspace:editar"),
      icon: "pencil-simple",
      controls: "workspace-ova-edit",
    },
  ];

  if (FEATURE_VISUAL_EDITOR) {
    options.push({
      value: "visual_editor",
      label: t("workspace:editor_visual_beta"),
      icon: "sparkle",
      controls: "workspace-ova-visual-editor",
    });
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
      <SegmentedTabs
        label={t("workspace:contenido_del_ova")}
        value={tab}
        onChange={onChange}
        options={options}
      />
      <p className="hidden truncate text-xs text-muted-foreground lg:block">
        {getTabSubtitle(tab)}
      </p>
    </div>
  );
}
