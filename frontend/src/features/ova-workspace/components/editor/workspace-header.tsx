import { Link } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { SegmentedTabs } from "../shared/segmented-tabs";
import { WorkspacePanelToolbar } from "./workspace-panel-toolbar";

export type WorkspaceMobileView = "chat" | "ova";

interface Props {
  ovaId: string;
  title: string;
  version: number | undefined;
  mobileView: WorkspaceMobileView;
  onMobileView: (view: WorkspaceMobileView) => void;
}

/**
 * Cabecera única del workspace: volver, título y versión a la izquierda;
 * acciones del OVA a la derecha. En móvil la segunda fila lleva el cambio
 * de vista (Instrucciones / OVA) junto a las acciones.
 */
export function WorkspaceHeader({ ovaId, title, version, mobileView, onMobileView }: Readonly<Props>) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-card px-3 py-2 sm:px-4 md:h-14 md:flex-nowrap md:py-0">
      <div className="flex min-w-0 basis-full items-center gap-2 md:flex-1 md:basis-auto">
        <Button asChild variant="ghost" size="sm" className="-ml-1 shrink-0 text-muted-foreground">
          <Link to="/mis-ovas" aria-label="Volver a Mis OVAs">
            <Icon name="arrow-left" />
            <span className="hidden sm:inline">Mis OVAs</span>
          </Link>
        </Button>
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
        <h1 className="min-w-0 truncate font-display text-lg font-semibold" title={title}>
          {title}
        </h1>
        {version !== undefined && (
          <span
            title={`Versión ${String(version)}`}
            className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground"
          >
            v{version}
          </span>
        )}
      </div>
      <SegmentedTabs
        label="Vista del workspace"
        className="md:hidden"
        value={mobileView}
        onChange={onMobileView}
        options={[
          { value: "chat", label: "Instrucciones", controls: "workspace-chat-column" },
          { value: "ova", label: "OVA", controls: "workspace-ova-column" },
        ]}
      />
      <WorkspacePanelToolbar ovaId={ovaId} className="ml-auto shrink-0" />
    </header>
  );
}
