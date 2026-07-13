import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from "@angular/core";

import { IconComponent } from "@/app/layout/components/icon.component";
import { toast } from "@/core/lib/toast";

import { criticRoundsVisible, hasUnsavedChanges } from "../lib/nodesConfigDraft";
import { PlatformSettingsService } from "../services/platform-settings.service";
import { getNodeBadgeColor, getNodeInitials } from "./platform-nodes-card.helpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-platform-nodes-card",
  imports: [CommonModule, IconComponent],
  templateUrl: "./platform-nodes-card.component.html",
})
export class PlatformNodesCardComponent implements OnInit {
  service = inject(PlatformSettingsService);

  readonly loading = signal(true);
  readonly error = signal("");
  readonly saving = signal(false);
  readonly data = signal<any>(null);
  readonly draft = signal<Record<string, string> | null>(null);
  readonly rounds = signal(1);

  async ngOnInit() {
    this.loading.set(true);
    try {
      this.data.set(await this.service.getAdminNodesConfig());
      const config = this.data()?.config;
      if (config) {
        this.draft.set({ ...config });
        this.rounds.set(Number(config.ova_reflection_rounds ?? 1));
      }
    } catch (e: any) {
      this.error.set(e.message || "No se pudo cargar la configuración de nodos.");
    } finally {
      this.loading.set(false);
    }
  }

  get hasChanges(): boolean {
    return hasUnsavedChanges(this.draft(), this.data()?.config, this.rounds());
  }

  async handleSave() {
    this.saving.set(true);
    try {
      const payload = { ...this.draft(), ova_reflection_rounds: String(this.rounds()) };
      await this.service.saveAdminNodesConfig(payload);
      this.data.update((d: any) => (d ? { ...d, config: payload } : d));
      toast.success("Configuración de nodos guardada.");
    } catch (e: any) {
      toast.error(e.message || "No se pudo guardar.");
    } finally {
      this.saving.set(false);
    }
  }

  get configurableNodes(): any[] {
    return (this.data()?.nodes ?? []).filter((n: any) => n.configurable);
  }

  get alwaysOnNodes(): any[] {
    return (this.data()?.nodes ?? []).filter((n: any) => n.always_on && n.id !== "video");
  }

  get videoNode(): any {
    return (this.data()?.nodes ?? []).find((n: any) => n.id === "video");
  }

  get videoWarning(): boolean {
    const d = this.data();
    return d ? !d.video_api_key_configured : false;
  }

  showParam(): boolean {
    return criticRoundsVisible(this.draft());
  }

  isNodeActive(flag: string): boolean {
    return this.draft()?.[flag] === "1";
  }

  toggleNode(flag: string) {
    this.draft.update((d) => (d ? { ...d, [flag]: d[flag] === "1" ? "0" : "1" } : d));
  }

  setRounds(e: Event) {
    const el = e.target as HTMLInputElement;
    this.rounds.set(Number(el.value));
  }

  getInitials = getNodeInitials;
  getBadgeColor = getNodeBadgeColor;
}
