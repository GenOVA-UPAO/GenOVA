import { Icon } from "@/core/components/icon";

import { SegmentedTabs } from "../shared/segmented-tabs";

export type OvaPanelTab = "preview" | "edit";

interface Props {
  tab: OvaPanelTab;
  onChange: (tab: OvaPanelTab) => void;
  /** Sin «Editar»: solo se puede ver el OVA. */
  readOnly?: boolean;
}

/** Barra del panel del OVA: «Vista previa» / «Editar» y qué se hace en cada una. */
export function WorkspaceOvaPanelTabs({ tab, onChange, readOnly = false }: Readonly<Props>) {
  if (readOnly)
    return (
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 text-sm font-medium sm:px-4">
        <Icon name="eye" className="text-muted-foreground" />
        Vista previa
      </div>
    );
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
      <SegmentedTabs
        label="Contenido del OVA"
        value={tab}
        onChange={onChange}
        options={[
          {
            value: "preview",
            label: "Vista previa",
            icon: "eye",
            controls: "workspace-ova-preview",
          },
          {
            value: "edit",
            label: "Editar",
            icon: "pencil-simple",
            controls: "workspace-ova-edit",
          },
        ]}
      />
      <p className="hidden truncate text-xs text-muted-foreground lg:block">
        {tab === "preview"
          ? "Así lo verán tus estudiantes."
          : "Reordena, regenera o ajusta cada recurso."}
      </p>
    </div>
  );
}
