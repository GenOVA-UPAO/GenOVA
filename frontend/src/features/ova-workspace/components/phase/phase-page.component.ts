import { Component, inject, type OnInit, input } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ResourceConfigModalComponent } from "../modals/resource-config-modal.component";
import { ResourcePreviewPanelComponent } from "../modals/resource-preview-panel.component";
import { OvaFiveEViewerComponent, type OvaContent } from "../viewer/ova-five-e-viewer.component";
import { buildPhaseDemoContent } from "../viewer/ova-five-e-viewer.helpers";
import { phaseCfg } from "../../lib/phase-select.config";
import {
  getConfigForResource,
  mergeConfigSave,
  type ResourceConfigs,
} from "../../lib/resource-config.helpers";
import { getSchema } from "../../lib/resource-config";
import { PhaseSelectService } from "../../services/phase-select.service";
import { HtmlPreviewComponent } from "./html-preview.component";
import { ResourceCardComponent } from "./resource-card.component";
import type { PreviewResult, Resource } from "@/core/lib/ova-types";
import { PhaseGenerationService } from "../../services/phase-generation.service";

interface ConfigTarget {
  resource: Resource;
  phaseKey: string;
  phaseColor: string;
}

@Component({
  selector: "gn-phase-page",
  standalone: true,
  imports: [
    FormsModule,
    ResourceCardComponent,
    HtmlPreviewComponent,
    ResourcePreviewPanelComponent,
    OvaFiveEViewerComponent,
    ResourceConfigModalComponent,
  ],
  templateUrl: "./phase-page.component.html",
})
export class PhasePageComponent implements OnInit {
  readonly phase = input.required<string>();
  readonly emoji = input.required<string>();
  readonly description = input.required<string>();

  private phaseService = inject(PhaseGenerationService);
  private phaseSelectService = inject(PhaseSelectService);

  recursos: Resource[] = [];
  loadingRecursos = true;
  selectedResource: Resource | null = null;
  hovered: Resource | null = null;
  concept = "";
  loading = false;
  result: PreviewResult | null = null;
  error = "";
  configTarget: ConfigTarget | null = null;
  resourceConfigs: ResourceConfigs = {};
  videoKeyConfigured = true;

  get phaseKey() {
    return this.phase().toLowerCase();
  }

  get phaseColor() {
    return phaseCfg(this.phaseKey)?.color ?? "#3B82F6";
  }

  get demoContent(): OvaContent {
    return buildPhaseDemoContent(this.phase());
  }

  get canGenerate() {
    return this.selectedResource && this.concept.trim().length >= 3 && !this.loading;
  }

  get previewResource(): Resource | null {
    return this.hovered ?? this.selectedResource;
  }

  ngOnInit() {
    void this.loadResources();
    void this.phaseSelectService
      .fetchVideoKeyConfigured()
      .then((v) => (this.videoKeyConfigured = v));
  }

  handleSelect(r: Resource) {
    this.selectedResource = r;
    this.reset();
  }

  reset() {
    this.result = null;
    this.error = "";
  }

  hasConfig(r: Resource) {
    return getSchema(this.phaseKey, String(r.id)).length > 0;
  }

  openConfig(r: Resource) {
    this.configTarget = { resource: r, phaseKey: this.phaseKey, phaseColor: this.phaseColor };
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

  async generate() {
    if (!this.canGenerate) return;
    this.loading = true;
    this.reset();
    try {
      this.result = await this.phaseService.generateResource(
        this.phase(),
        this.selectedResource?.id,
        this.concept,
      );
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : "Error al generar recurso";
    } finally {
      this.loading = false;
    }
  }

  private async loadResources() {
    try {
      this.recursos = await this.phaseService.fetchResources(this.phase());
    } catch {
      this.recursos = [];
    } finally {
      this.loadingRecursos = false;
    }
  }
}
