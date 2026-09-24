import { SegmentedTabs } from "../shared/segmented-tabs";

export type OvaPanelTab = "preview" | "edit";

interface Props {
  tab: OvaPanelTab;
  onChange: (tab: OvaPanelTab) => void;
}

/** Barra del panel del OVA: «Vista previa» / «Editar» y qué se hace en cada una. */
export function WorkspaceOvaPanelTabs({ tab, onChange }: Readonly<Props>) {
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
