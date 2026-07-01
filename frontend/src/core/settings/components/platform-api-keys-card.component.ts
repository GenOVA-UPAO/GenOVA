import { CommonModule } from "@angular/common";
import { Component, inject, type OnInit } from "@angular/core";
import { AdminSettingsService } from "../../../features/admin/services/admin-settings.service";
import { PlatformKeyRowComponent } from "./platform-key-row.component";
import { PROVIDER_META } from "./platformKeyMeta";

@Component({
  selector: "gn-platform-api-keys-card",
  standalone: true,
  imports: [CommonModule, PlatformKeyRowComponent],
  template: `
    <section class="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-display font-bold text-foreground">API Keys de plataforma</h2>
          <p class="text-sm font-medium text-muted-foreground mt-1">
            Keys globales usadas cuando los usuarios no tienen la suya propia. Solo admins pueden modificarlas.
          </p>
        </div>
        <div class="text-primary hidden sm:block">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M216,112H200V80a8,8,0,0,0-8-8H168V56a8,8,0,0,0-16,0v16H104V56a8,8,0,0,0-16,0v16H64a8,8,0,0,0-8,8v32H40a8,8,0,0,0,0,16h16v16a88,88,0,0,0,88,88,87.64,87.64,0,0,0,67.33-31,8,8,0,0,0-12.21-10.29A71.63,71.63,0,0,1,144,216a72,72,0,0,1-72-72V88H184v40a8,8,0,0,0,16,0V128h16a8,8,0,0,0,0-16ZM144,112a12,12,0,1,1-12-12A12,12,0,0,1,144,112Z"></path></svg>
        </div>
      </div>

      <div *ngIf="loading" class="space-y-4">
        <div class="h-28 animate-pulse rounded-3xl bg-muted"></div>
        <div class="h-28 animate-pulse rounded-3xl bg-muted"></div>
        <div class="h-28 animate-pulse rounded-3xl bg-muted"></div>
      </div>

      <p *ngIf="!loading && error" class="text-sm font-bold text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-4">
        {{ error }}
      </p>

      <div *ngIf="!loading && !error" class="space-y-4">
        <gn-platform-key-row
          *ngFor="let p of providers"
          [provider]="p"
          [maskedValue]="platformConfig[p]"
          (onSaved)="handleSaved($event)"
        ></gn-platform-key-row>
      </div>
    </section>
  `,
})
export class PlatformApiKeysCardComponent implements OnInit {
  service = inject(AdminSettingsService);

  platformConfig: Record<string, string> = {};
  providers: string[] = [];
  loading = true;
  error: string | null = null;

  async ngOnInit() {
    this.loading = true;
    try {
      const result: any = await this.service.getPlatformConfig();
      this.platformConfig = result.platform_config ?? {};
      this.providers = result.providers ?? Object.keys(PROVIDER_META);
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.loading = false;
    }
  }

  handleSaved(updated: Record<string, string>) {
    this.platformConfig = updated;
  }
}
