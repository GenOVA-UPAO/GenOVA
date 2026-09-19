import { NgClass } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import { toast } from "@/core/lib/toast";
import { PlatformSettingsService } from "@/core/services/platform-settings.service";

import {
  type GuardrailsConfig,
  type GuardrailsDraft,
  guardrailsHasChanges,
  normalizeTerms,
  parseGuardrailsConfig,
  parseModerationModel,
  toGuardrailsPayload,
  topicImpact,
} from "../lib/guardrails";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { LlmModelSelectComponent } from "./llm-model-select.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-guardrails-card",
  imports: [NgClass, IconComponent, LlmModelSelectComponent],
  template: `
    <section class="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <gn-icon name="shield" size="text-lg" class="text-primary" /> Guardrails de generación
          </h2>
          <p class="text-sm font-medium text-muted-foreground mt-1">
            Aplican a los prompts de todo el que genere un OVA en la plataforma.
          </p>
        </div>
        <button
          (click)="handleSave()"
          [disabled]="!hasChanges || saving()"
          class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 font-bold shadow-md shrink-0"
        >
          {{ saving() ? "Guardando..." : "Guardar cambios" }}
        </button>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          <div class="h-20 animate-pulse rounded-2xl bg-muted"></div>
          <div class="h-28 animate-pulse rounded-2xl bg-muted"></div>
        </div>
      }

      @if (!loading() && error()) {
        <p
          class="text-sm font-bold text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-4"
        >
          {{ error() }}
        </p>
      }

      @if (!loading() && !error() && draft()) {
        <div class="space-y-6">
          <div class="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
            <div
              class="flex items-start justify-between gap-4 px-6 py-4 border-b border-border/50 bg-muted/20"
            >
              <div class="min-w-0">
                <p class="text-sm font-bold text-foreground">Área temática permitida</p>
                <p class="text-xs text-muted-foreground mt-1">
                  Vacío o desactivado = se puede generar sobre
                  <span class="font-bold">cualquier tema</span>. Un área demasiado estrecha puede
                  dejar la app sin generar nada.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                [attr.aria-checked]="draft()!.topicEnabled"
                (click)="!saving() && toggleTopic()"
                [disabled]="saving()"
                class="relative h-6 w-11 rounded-full transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                [ngClass]="draft()!.topicEnabled ? 'bg-primary' : 'bg-muted-foreground/30'"
              >
                <span
                  class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
                  [ngClass]="draft()!.topicEnabled ? 'translate-x-5' : 'translate-x-0'"
                ></span>
              </button>
            </div>
            @if (draft()!.topicEnabled) {
              <div class="px-6 py-4 space-y-2">
                <label
                  class="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                  for="guardrail-topic-area"
                  >Área permitida</label
                >
                <input
                  id="guardrail-topic-area"
                  type="text"
                  [value]="draft()!.topicArea"
                  (input)="onTopicArea($event)"
                  placeholder="p. ej. machine learning y ciencia de datos"
                  class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            }
            <div class="px-6 py-3 bg-muted/10 border-t border-border/40">
              <p
                class="text-xs"
                [ngClass]="
                  impact().restricted ? 'text-foreground' : 'text-amber-700 dark:text-amber-400'
                "
              >
                @if (impact().restricted) {
                  AHORA MISMO: solo se permite generar sobre
                  <span class="font-bold">«{{ impact().area }}»</span>.
                } @else {
                  AHORA MISMO: sin restricción temática — cualquier tema.
                }
              </p>
            </div>
          </div>

          <div class="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
            <div
              class="flex items-start justify-between gap-4 px-6 py-4 border-b border-border/50 bg-muted/20"
            >
              <div class="min-w-0">
                <p class="text-sm font-bold text-foreground">Moderación</p>
                <p class="text-xs text-muted-foreground mt-1">
                  Dos niveles: si eliges un modelo de moderación se usa el modelo; si lo dejas vacío
                  se aplica la lista de términos. La lista es el suelo que siempre existe.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                [attr.aria-checked]="draft()!.moderationEnabled"
                (click)="!saving() && toggleModeration()"
                [disabled]="saving()"
                class="relative h-6 w-11 rounded-full transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                [ngClass]="draft()!.moderationEnabled ? 'bg-primary' : 'bg-muted-foreground/30'"
              >
                <span
                  class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
                  [ngClass]="draft()!.moderationEnabled ? 'translate-x-5' : 'translate-x-0'"
                ></span>
              </button>
            </div>
            @if (draft()!.moderationEnabled) {
              <div class="px-6 py-4 space-y-4">
                <div class="space-y-2">
                  <label
                    class="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                    for="guardrail-terms"
                    >Lista de términos</label
                  >
                  <textarea
                    id="guardrail-terms"
                    rows="5"
                    [value]="draft()!.termsText"
                    (input)="onTermsInput($event)"
                    class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  ></textarea>
                  <p class="text-[11px] text-muted-foreground">
                    {{ termCount }} término(s). Uno por línea; se ignoran líneas vacías y
                    duplicados.
                  </p>
                </div>
                <div class="space-y-2">
                  <span
                    class="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                    >Modelo de moderación (opcional)</span
                  >
                  <gn-llm-model-select
                    [models]="modelPool"
                    [provider]="draft()!.model.provider || undefined"
                    [modelId]="draft()!.model.modelId || undefined"
                    (onChange)="onModerationModel($event)"
                  ></gn-llm-model-select>
                </div>
              </div>
            }
            <div class="px-6 py-3 bg-muted/10 border-t border-border/40">
              <p class="text-xs text-muted-foreground">
                AHORA MISMO: moderación
                {{ draft()!.moderationEnabled ? "activada" : "desactivada" }} —
                @if (
                  draft()!.moderationEnabled && draft()!.model.provider && draft()!.model.modelId
                ) {
                  se usa el modelo
                  <span class="font-bold"
                    >{{ draft()!.model.provider }}/{{ draft()!.model.modelId }}</span
                  >.
                } @else if (draft()!.moderationEnabled) {
                  se aplica la lista de términos
                  <span class="font-bold">({{ termCount }})</span>.
                } @else {
                  sin moderación activa.
                }
              </p>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class GuardrailsCardComponent implements OnInit {
  service = inject(PlatformSettingsService);
  store = inject(UserLlmSettingsStore);

  readonly loading = signal(true);
  readonly error = signal("");
  readonly saving = signal(false);

  readonly config = signal<GuardrailsConfig | null>(null);
  readonly draft = signal<GuardrailsDraft | null>(null);

  async ngOnInit() {
    this.loading.set(true);
    try {
      this.config.set(parseGuardrailsConfig(await this.service.getAdminGuardrails()));
      const cfg = this.config();
      if (cfg) this.draft.set(this.toDraft(cfg));
    } catch (e: any) {
      this.error.set(e.message || "No se pudo cargar la configuración de guardrails.");
    } finally {
      this.loading.set(false);
    }
  }

  get hasChanges(): boolean {
    const d = this.draft();
    return d ? guardrailsHasChanges(this.config(), d) : false;
  }

  get termCount(): number {
    return normalizeTerms(this.draft()?.termsText ?? "").length;
  }

  get modelPool() {
    return this.store.catalogFull();
  }

  impact() {
    return topicImpact(this.draft()!);
  }

  toggleTopic() {
    this.draft.update((d) => (d ? { ...d, topicEnabled: !d.topicEnabled } : d));
  }

  toggleModeration() {
    this.draft.update((d) => (d ? { ...d, moderationEnabled: !d.moderationEnabled } : d));
  }

  onTopicArea(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.draft.update((d) => (d ? { ...d, topicArea: value } : d));
  }

  onTermsInput(e: Event) {
    const value = (e.target as HTMLTextAreaElement).value;
    this.draft.update((d) => (d ? { ...d, termsText: value } : d));
  }

  onModerationModel(e: { provider: string; modelId: string }) {
    this.draft.update((d) => (d ? { ...d, model: e } : d));
  }

  async handleSave() {
    this.saving.set(true);
    try {
      const payload = toGuardrailsPayload(this.draft()!);
      await this.service.saveAdminGuardrails(payload);
      const saved = parseGuardrailsConfig(payload)!;
      this.config.set(saved);
      this.draft.set(this.toDraft(saved));
      toast.success("Guardrails guardados.");
    } catch (e: any) {
      toast.error(e.message || "No se pudo guardar la configuración de guardrails.");
    } finally {
      this.saving.set(false);
    }
  }

  private toDraft(cfg: GuardrailsConfig): GuardrailsDraft {
    return {
      topicEnabled: cfg.topicEnabled,
      topicArea: cfg.topicArea,
      moderationEnabled: cfg.moderationEnabled,
      termsText: cfg.terms.join("\n"),
      model: parseModerationModel(cfg.moderationModel) ?? { provider: "", modelId: "" },
    };
  }
}
