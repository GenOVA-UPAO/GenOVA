import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  type OnInit,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";

import { IconComponent } from "@/core/components/icon.component";
import type { PreviewResult, Resource } from "@/features/ova-workspace/lib/ova-types";

import { DEFAULT_PHASE_COLOR } from "../../lib/phase-colors";
import { phaseCfg } from "../../lib/phase-select.config";
import { getSchema } from "../../lib/resource-config";
import {
  getConfigForResource,
  mergeConfigSave,
  type ResourceConfigs,
} from "../../lib/resource-config.helpers";
import { PhaseGenerationService } from "../../services/phase-generation.service";
import { PhaseSelectService } from "../../services/phase-select.service";
import { ResourceConfigModalComponent } from "../modals/resource-config-modal.component";
import { ResourcePreviewPanelComponent } from "../modals/resource-preview-panel.component";
import { type OvaContent, OvaFiveEViewerComponent } from "../viewer/ova-five-e-viewer.component";
import { buildPhaseDemoContent } from "../viewer/ova-five-e-viewer.helpers";
import { HtmlPreviewComponent } from "./html-preview.component";
import { ResourceCardComponent } from "./resource-card.component";

interface ConfigTarget {
  resource: Resource;
  phaseKey: string;
  phaseColor: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-phase-page",
  imports: [
    FormsModule,
    IconComponent,
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
  /** Phosphor icon slug (without `ph-` prefix), e.g. "target", "magnifying-glass". */
  readonly icon = input.required<string>();
  readonly description = input.required<string>();

  private phaseService = inject(PhaseGenerationService);
  private phaseSelectService = inject(PhaseSelectService);

  readonly recursos = signal<Resource[]>([]);
  readonly loadingRecursos = signal(true);
  selectedResource: Resource | null = null;
  hovered: Resource | null = null;
  concept = "";
  readonly loading = signal(false);
  readonly result = signal<PreviewResult | null>(null);
  readonly error = signal("");
  configTarget: ConfigTarget | null = null;
  resourceConfigs: ResourceConfigs = {};
  readonly videoKeyConfigured = signal(true);

  get phaseKey() {
    return this.phase().toLowerCase();
  }

  get phaseColor() {
    return phaseCfg(this.phaseKey)?.color ?? DEFAULT_PHASE_COLOR;
  }

  get demoContent(): OvaContent {
    return buildPhaseDemoContent(this.phase());
  }

  get canGenerate() {
    return this.selectedResource && this.concept.trim().length >= 3 && !this.loading();
  }

  get previewResource(): Resource | null {
    return this.hovered ?? this.selectedResource;
  }

  ngOnInit() {
    void this.loadResources();
    void this.phaseSelectService.fetchVideoKeyConfigured().then((v) => {
      this.videoKeyConfigured.set(v);
    });
  }

  handleSelect(r: Resource) {
    this.selectedResource = r;
    this.reset();
  }

  reset() {
    this.result.set(null);
    this.error.set("");
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
    this.loading.set(true);
    this.reset();
    try {
      this.result.set(
        await this.phaseService.generateResource(
          this.phase(),
          this.selectedResource?.id,
          this.concept,
        ),
      );
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : "Error al generar recurso");
    } finally {
      this.loading.set(false);
    }
  }

  private async loadResources() {
    try {
      this.recursos.set(await this.phaseService.fetchResources(this.phase()));
    } catch {
      this.recursos.set([]);
    } finally {
      this.loadingRecursos.set(false);
    }
  }
}
