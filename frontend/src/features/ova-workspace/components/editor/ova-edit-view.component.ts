import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  input,
  type OnInit,
  viewChild,
} from "@angular/core";
import { RouterModule } from "@angular/router";

import { IconComponent } from "@/core/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import { buildUploadsPropBag } from "../../lib/upload-chip-view-model";
import type { OvaVersionRow } from "../../lib/version-history.types";
import { getSavedRatio } from "../../lib/workspace-utils";
import { OvaUploadsService } from "../../services/ova-uploads.service";
import { OvaWorkspaceService } from "../../services/ova-workspace.service";
import { VersionHistoryPanelComponent } from "../versioning/version-history-panel.component";
import { WorkspaceChatPanelComponent } from "./workspace-chat-panel.component";
import { WorkspaceOvaPanelComponent } from "./workspace-ova-panel.component";
import { WorkspaceResizableDividerComponent } from "./workspace-resizable-divider.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-edit-view",
  imports: [
    RouterModule,
    ButtonComponent,
    VersionHistoryPanelComponent,
    WorkspaceChatPanelComponent,
    WorkspaceOvaPanelComponent,
    WorkspaceResizableDividerComponent,
    IconComponent,
  ],
  templateUrl: "./ova-edit-view.component.html",
})
export class OvaEditViewComponent implements OnInit {
  readonly ovaId = input.required<string>();
  readonly containerElement = viewChild.required<ElementRef<HTMLDivElement>>("container");

  ws = inject(OvaWorkspaceService);
  uploadsSvc = inject(OvaUploadsService);

  ratio = getSavedRatio(0.38);
  historyOpen = false;
  mobileTab: "chat" | "preview" = "chat";

  get containerRef() {
    return this.containerElement()?.nativeElement || null;
  }

  get title() {
    const ovaAny = this.ws.ova() as { title?: string } | null;
    if (ovaAny?.title) return ovaAny.title;
    if (this.ws.generating()) return "Generando…";
    if (this.ws.loading()) return "Cargando…";
    return "Workspace OVA";
  }

  get uploadsProps() {
    return buildUploadsPropBag(this.uploadsSvc, this.ws.isRegenerating());
  }

  get versionRows(): OvaVersionRow[] {
    return (this.ws.versionHistory() ?? []) as OvaVersionRow[];
  }

  get currentVersionId(): string | undefined {
    const cv = this.ws.ova()?.current_version as { id?: string } | undefined;
    return cv?.id;
  }

  ngOnInit() {
    const ovaId = this.ovaId();
    if (ovaId) {
      this.ws.init(ovaId);
    }
  }

  onUploadFiles(files: FileList) {
    void this.uploadsSvc.handleFilesSelected(files);
  }

  onRemoveUpload(clientId: string) {
    void this.uploadsSvc.handleRemoveUpload(clientId);
  }
}
