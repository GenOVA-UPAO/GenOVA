import { Component, inject, type OnInit } from "@angular/core";
import { UserLlmSettingsService } from "../services/user-llm-settings.service";
import { PROVIDER_META } from "./platformKeyMeta";
import { UserKeyRowComponent } from "./user-key-row.component";

const LLM_PROVIDERS = ["groq", "openrouter", "opencode"];
const IMG_PROVIDERS = ["siliconflow", "runware", "falai"];

@Component({
  selector: "gn-user-api-keys-card",
  standalone: true,
  imports: [UserKeyRowComponent],
  template: `
    <section class="rounded-xl border border-border bg-background p-6 shadow-sm space-y-6">
      <div>
        <h2 class="text-lg font-semibold text-foreground">Mis API Keys</h2>
        <p class="text-sm text-muted-foreground">
          Tus keys tienen prioridad sobre las de la plataforma. Déjalas vacías para usar las
          predeterminadas.
        </p>
      </div>

      @if (loading) {
        <div class="space-y-3">
          @for (i of [0, 1, 2]; track i) {
            <div class="h-10 animate-pulse rounded-lg bg-muted"></div>
          }
        </div>
      } @else if (error) {
        <p class="text-sm text-destructive">{{ error }}</p>
      } @else {
        <div class="space-y-6">
          <div class="space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wide text-muted-foreground">LLM</h3>
            @for (p of llmProviders; track p) {
              <gn-user-key-row
                [provider]="p"
                [maskedValue]="apiKeys[p]"
                (onSaved)="handleSaved($event)"
              />
            }
          </div>
          <div class="space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Imagen / video
            </h3>
            @for (p of imgProviders; track p) {
              <gn-user-key-row
                [provider]="p"
                [maskedValue]="apiKeys[p]"
                (onSaved)="handleSaved($event)"
              />
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class UserApiKeysCardComponent implements OnInit {
  private service = inject(UserLlmSettingsService);

  apiKeys: Record<string, string> = {};
  loading = true;
  error: string | null = null;

  llmProviders = LLM_PROVIDERS.filter((p) => PROVIDER_META[p]);
  imgProviders = IMG_PROVIDERS.filter((p) => PROVIDER_META[p]);

  async ngOnInit() {
    try {
      const result = await this.service.getApiKeys();
      this.apiKeys = result.api_keys ?? {};
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : "No se pudo cargar.";
    } finally {
      this.loading = false;
    }
  }

  handleSaved(updated: Record<string, string>) {
    this.apiKeys = updated;
  }
}
