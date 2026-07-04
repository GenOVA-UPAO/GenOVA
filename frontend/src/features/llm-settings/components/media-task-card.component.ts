import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, input, type OnInit } from "@angular/core";

import { toast } from "@/core/lib/toast";

import { taskMeta } from "../lib/task-meta";
import { OvaSettingsService } from "../services/ova-settings.service";
import { UserLlmSettingsService } from "../services/user-llm-settings.service";
import { IMAGE_PROVIDERS } from "./media-task-card.helpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-media-task-card",
  imports: [CommonModule],
  templateUrl: "./media-task-card.component.html",
})
export class MediaTaskCardComponent implements OnInit {
  readonly task = input.required<string>();
  readonly index = input(0);

  private ovaSettings = inject(OvaSettingsService);
  private llmApi = inject(UserLlmSettingsService);

  meta = taskMeta("");
  providers = IMAGE_PROVIDERS;
  enabled = true;
  provider = "huggingface";
  imageModel: string | null = null;
  models: { id: string; label?: string }[] = [];
  saving = false;
  loaded = false;
  loadingModels = false;

  ngOnInit() {
    this.meta = taskMeta(this.task());
    if (this.task() !== "imagen") {
      this.loaded = true;
      return;
    }
    void this.ovaSettings
      .getOvaSettings()
      .then(({ settings }) => {
        const p = settings.image_provider ?? "huggingface";
        this.enabled = p !== "none";
        this.provider = p === "none" ? "huggingface" : p;
        this.imageModel = settings.image_model ?? null;
      })
      .catch(() => {})
      .finally(() => {
        this.loaded = true;
        if (this.enabled) void this.loadModels();
      });
  }

  async loadModels() {
    this.loadingModels = true;
    try {
      this.models = await this.llmApi.getImageModels(this.provider);
      if (this.models.length > 0 && !this.models.find((x) => x.id === this.imageModel)) {
        this.imageModel = this.models[0].id;
      }
    } catch {
      this.models = [];
    } finally {
      this.loadingModels = false;
    }
  }

  async persist(nextEnabled: boolean, nextProvider: string, nextModel: string | null) {
    this.saving = true;
    try {
      await this.ovaSettings.saveOvaSettings({
        image_provider: nextEnabled ? nextProvider : "none",
        image_model: nextEnabled ? nextModel : null,
      });
    } catch {
      toast.error("No se pudo guardar la configuración de imágenes");
    } finally {
      this.saving = false;
    }
  }

  toggleEnabled() {
    const next = !this.enabled;
    this.enabled = next;
    void this.persist(next, this.provider, this.imageModel);
  }

  changeProvider(value: string) {
    this.provider = value;
    this.imageModel = null;
    void this.persist(true, value, null);
    void this.loadModels();
  }

  changeModel(value: string) {
    this.imageModel = value;
    void this.persist(true, this.provider, value);
  }
}
