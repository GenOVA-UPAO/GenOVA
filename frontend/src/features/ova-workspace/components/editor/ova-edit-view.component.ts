import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  input,
  type OnDestroy,
  type OnInit,
  signal,
  viewChild,
} from "@angular/core";
import { RouterModule } from "@angular/router";

import { IconComponent } from "@/core/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import { resourceLabel } from "../../lib/resource-label";
import type { PhaseWithContent } from "../../lib/types";
import { buildUploadsPropBag } from "../../lib/upload-chip-view-model";
import type { OvaVersionRow } from "../../lib/version-history.types";
import { getSavedRatio } from "../../lib/workspace-utils";
import { OvaUploadsService } from "../../services/ova-uploads.service";
import { OvaWorkspaceService } from "../../services/ova-workspace.service";
import { OvaWorkspaceChatService } from "../../services/ova-workspace-chat.service";
import { VersionHistoryPanelComponent } from "../versioning/version-history-panel.component";
import { OvaGeneratingPanelComponent } from "./ova-generating-panel.component";
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
    OvaGeneratingPanelComponent,
    WorkspaceChatPanelComponent,
    WorkspaceOvaPanelComponent,
    WorkspaceResizableDividerComponent,
    IconComponent,
  ],
  // host flex: el custom element es display:inline por defecto y corta la
  // cadena de alturas heredada del <main>/host de la página hacia los
  // paneles mobile (absolute inset-0 dentro de un padre flex-1 colapsado).
  host: { class: "flex min-h-0 flex-1 flex-col" },
  templateUrl: "./ova-edit-view.component.html",
})
export class OvaEditViewComponent implements OnInit, OnDestroy {
  readonly ovaId = input.required<string>();
  readonly containerElement = viewChild.required<ElementRef<HTMLDivElement>>("container");

  ws = inject(OvaWorkspaceService);
  chat = inject(OvaWorkspaceChatService);
  uploadsSvc = inject(OvaUploadsService);

  ratio = getSavedRatio(0.38);
  historyOpen = false;
  mobileTab: "chat" | "preview" = "chat";

  /** Modo "Seleccionar recursos" del chat (prompt acotado a fases marcadas). */
  readonly selectionMode = signal(false);
  readonly selectedPhaseIds = signal<string[]>([]);

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

  // computed: un getter devolvía un prop-bag NUEVO en cada ciclo de CD, lo que
  // invalidaba los inputs OnPush de los chat panels en cada tick.
  readonly uploadsProps = computed(() =>
    buildUploadsPropBag(this.uploadsSvc, this.ws.isRegenerating()),
  );

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

  ngOnDestroy() {
    // El servicio es singleton root: sin esto el retry de load() seguía
    // puleando el OVA viejo para siempre tras salir de la página.
    this.ws.teardown();
  }

  onUploadFiles(files: FileList) {
    void this.uploadsSvc.handleFilesSelected(files);
  }

  onRemoveUpload(clientId: string) {
    void this.uploadsSvc.handleRemoveUpload(clientId);
  }

  onEditPhase(event: { phaseId: string; content: string }) {
    void this.ws.savePhase(event.phaseId, event.content);
  }

  onRegenPhase(event: { phaseId: string; prompt?: string }) {
    void this.ws.runRegen({ faseIds: [event.phaseId], prompt: event.prompt ?? null });
  }

  onDeletePhase(phaseId: string) {
    void this.ws.deletePhase(phaseId);
  }

  onAddPhase(event: { phaseType: string; prompt: string }) {
    void this.ws.addPhase(event.phaseType, event.prompt);
  }

  onReorderPhases(phases: PhaseWithContent[]) {
    void this.ws.reorderPhases(phases);
  }

  toggleSelectionMode(): void {
    const next = !this.selectionMode();
    this.selectionMode.set(next);
    if (!next) this.selectedPhaseIds.set([]);
    void this.ws.logSelectionMode(next);
  }

  togglePhaseSelection(phaseId: string): void {
    const wasSelected = this.selectedPhaseIds().includes(phaseId);
    this.selectedPhaseIds.update((ids) =>
      wasSelected ? ids.filter((id) => id !== phaseId) : [...ids, phaseId],
    );
    const phase = this.ws.phases().find((p) => p.id === phaseId);
    if (phase) void this.ws.logSelectionToggle(resourceLabel(phase), !wasSelected);
  }

  selectAllPhases(): void {
    const phases = this.ws.phases();
    const allIds = phases.map((p) => p.id);
    const selectingAll = this.selectedPhaseIds().length !== allIds.length;
    this.selectedPhaseIds.set(selectingAll ? allIds : []);
    void this.ws.logSelectionAll(
      phases.map((p) => resourceLabel(p)),
      selectingAll,
    );
  }

  submitChatPrompt(): void {
    const ids = this.selectionMode() ? this.selectedPhaseIds() : [];
    void this.ws.submitPrompt(ids);
  }

  regenAll(): void {
    void this.ws.submitRegenAll();
  }

  deleteChatMessage(id: string): void {
    void this.chat.deleteMessage(id);
  }

  clearChat(): void {
    void this.chat.clearAll();
  }
}
