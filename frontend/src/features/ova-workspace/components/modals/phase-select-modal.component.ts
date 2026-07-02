import { Component, inject, type OnInit, input, output } from "@angular/core";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { ModalDismissDirective } from "@/core/directives/modal-dismiss.directive";
import { isVideoResource } from "../../lib/phase-select.config";
import { ResourceCardComponent } from "../phase/resource-card.component";
import type { Resource } from "@/core/lib/ova-types";
import { getSchema } from "../../lib/resource-config";
import {
  getConfigForResource,
  mergeConfigSave,
  type ResourceConfigs,
} from "../../lib/resource-config.helpers";
import {
  MAX_PER_PHASE,
  PHASE_SELECT_CFG,
  emptyPicks,
  toggleSelection,
  type PhaseResourceMap,
} from "../../lib/phase-select.config";
import { PhaseSelectService } from "../../services/phase-select.service";
import { ResourceConfigModalComponent } from "./resource-config-modal.component";
import { ResourcePreviewPanelComponent } from "./resource-preview-panel.component";

interface ConfigTarget {
  resource: Resource;
  phaseKey: string;
  phaseColor: string;
}

@Component({
  selector: "gn-phase-select-modal",
  standalone: true,
  imports: [
    ButtonComponent,
    ModalDismissDirective,
    ResourceCardComponent,
    ResourceConfigModalComponent,
    ResourcePreviewPanelComponent,
  ],
  templateUrl: "./phase-select-modal.component.html",
})
export class PhaseSelectModalComponent implements OnInit {
  private phaseSelectService = inject(PhaseSelectService);

  readonly initialSelections = input<PhaseResourceMap | undefined>(undefined);
  readonly initialResourceConfigs = input<ResourceConfigs | undefined>(undefined);

  readonly onClose = output<void>();
  readonly onConfirm = output<{
    picks: PhaseResourceMap;
    configs: ResourceConfigs;
  }>();

  readonly PHASES = PHASE_SELECT_CFG;
  readonly MAX_PER_PHASE = MAX_PER_PHASE;

  step = 0;
  picks: PhaseResourceMap = emptyPicks();
  recursos: PhaseResourceMap = emptyPicks();
  failedPhases: Record<string, boolean> = Object.fromEntries(
    PHASE_SELECT_CFG.map((p) => [p.key, false]),
  );
  loading = true;
  resourceConfigs: ResourceConfigs = {};
  configTarget: ConfigTarget | null = null;
  hovered: Resource | null = null;
  videoKeyConfigured = true;

  ngOnInit() {
    const initialSelections = this.initialSelections();
    if (initialSelections) this.picks = { ...emptyPicks(), ...initialSelections };
    const initialResourceConfigs = this.initialResourceConfigs();
    if (initialResourceConfigs) this.resourceConfigs = { ...initialResourceConfigs };
    void this.loadAll();
    void this.phaseSelectService
      .fetchVideoKeyConfigured()
      .then((v) => (this.videoKeyConfigured = v));
  }

  get currentPhase() {
    return this.PHASES[this.step];
  }

  get currentList() {
    return this.recursos[this.currentPhase.key] || [];
  }

  get currentFailed() {
    return this.failedPhases[this.currentPhase.key];
  }

  get limitReached() {
    return this.picks[this.currentPhase.key].length >= MAX_PER_PHASE;
  }

  get total() {
    return this.PHASES.reduce((s, p) => s + this.picks[p.key].length, 0);
  }

  get phasesSelected() {
    return this.PHASES.filter((p) => this.picks[p.key].length > 0).length;
  }

  get canConfirm() {
    return this.phasesSelected >= 2 && this.total > 0;
  }

  get previewResource(): Resource | null {
    const current = this.picks[this.currentPhase.key];
    return this.hovered ?? (current.length > 0 ? current[current.length - 1] : null);
  }

  isSelected(r: Resource) {
    return this.picks[this.currentPhase.key].some((x) => String(x.id) === String(r.id));
  }

  selectionIndex(r: Resource): number | null {
    const idx = this.picks[this.currentPhase.key].findIndex((x) => String(x.id) === String(r.id));
    return idx >= 0 ? idx + 1 : null;
  }

  toggleResource(r: Resource) {
    const key = this.currentPhase.key;
    this.picks = { ...this.picks, [key]: toggleSelection(this.picks[key], r) };
  }

  setHovered(r: Resource | null) {
    this.hovered = r;
  }

  showVideoHint(r: Resource) {
    return isVideoResource(this.currentPhase.key, r.id) && !this.videoKeyConfigured;
  }

  hasConfig(r: Resource) {
    return getSchema(this.currentPhase.key, String(r.id)).length > 0;
  }

  openConfig(r: Resource) {
    this.configTarget = {
      resource: r,
      phaseKey: this.currentPhase.key,
      phaseColor: this.currentPhase.color,
    };
  }

  configForTarget() {
    if (!this.configTarget) return {};
    return getConfigForResource(
      this.resourceConfigs,
      this.configTarget.phaseKey,
      this.configTarget.resource.id,
    );
  }

  saveConfig(event: { phaseKey: string; resource: Resource; config: Record<string, number> }) {
    this.resourceConfigs = mergeConfigSave(
      this.resourceConfigs,
      event.phaseKey,
      event.resource,
      event.config,
    );
    this.configTarget = null;
  }

  confirm() {
    if (!this.canConfirm) return;
    this.onConfirm.emit({ picks: this.picks, configs: this.resourceConfigs });
  }

  retryLoad() {
    void this.loadAll();
  }

  private async loadAll() {
    this.loading = true;
    const results = await Promise.allSettled(
      PHASE_SELECT_CFG.map((p) =>
        this.phaseSelectService
          .fetchPhaseResources(p.key)
          .then((recursos) => ({ key: p.key, recursos })),
      ),
    );
    const next = emptyPicks();
    const failed = Object.fromEntries(PHASE_SELECT_CFG.map((p) => [p.key, false]));
    results.forEach((r, i) => {
      const key = PHASE_SELECT_CFG[i].key;
      if (r.status === "fulfilled") next[key] = r.value.recursos;
      else failed[key] = true;
    });
    this.recursos = next;
    this.failedPhases = failed;
    this.loading = false;
  }

  dismissModal = (): void => {
    this.onClose.emit();
  };
}
