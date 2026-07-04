import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, type OnInit } from "@angular/core";

import { toast } from "@/core/lib/toast";

import { criticRoundsVisible, hasUnsavedChanges } from "../lib/nodesConfigDraft";
import { PlatformSettingsService } from "../services/platform-settings.service";
import { getNodeBadgeColor, getNodeInitials } from "./platform-nodes-card.helpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-platform-nodes-card",
  imports: [CommonModule],
  templateUrl: "./platform-nodes-card.component.html",
})
export class PlatformNodesCardComponent implements OnInit {
  service = inject(PlatformSettingsService);

  loading = true;
  error = "";
  saving = false;
  data: any = null;
  draft: Record<string, string> | null = null;
  rounds = 1;

  async ngOnInit() {
    this.loading = true;
    try {
      this.data = await this.service.getAdminNodesConfig();
      if (this.data?.config) {
        this.draft = { ...this.data.config };
        this.rounds = Number(this.data.config.ova_reflection_rounds ?? 1);
      }
    } catch (e: any) {
      this.error = e.message || "No se pudo cargar la configuración de nodos.";
    } finally {
      this.loading = false;
    }
  }

  get hasChanges(): boolean {
    return hasUnsavedChanges(this.draft, this.data?.config, this.rounds);
  }

  async handleSave() {
    this.saving = true;
    try {
      const payload = { ...this.draft, ova_reflection_rounds: String(this.rounds) };
      await this.service.saveAdminNodesConfig(payload);
      this.data.config = payload;
      toast.success("Configuración de nodos guardada.");
    } catch (e: any) {
      toast.error(e.message || "No se pudo guardar.");
    } finally {
      this.saving = false;
    }
  }

  get configurableNodes(): any[] {
    return (this.data?.nodes ?? []).filter((n: any) => n.configurable);
  }

  get alwaysOnNodes(): any[] {
    return (this.data?.nodes ?? []).filter((n: any) => n.always_on && n.id !== "video");
  }

  get videoNode(): any {
    return (this.data?.nodes ?? []).find((n: any) => n.id === "video");
  }

  get videoWarning(): boolean {
    return this.data ? !this.data.video_api_key_configured : false;
  }

  showParam(): boolean {
    return criticRoundsVisible(this.draft);
  }

  isNodeActive(flag: string): boolean {
    if (!this.draft) return false;
    return this.draft[flag] === "1";
  }

  toggleNode(flag: string) {
    if (this.draft) {
      this.draft[flag] = this.draft[flag] === "1" ? "0" : "1";
    }
  }

  setRounds(e: Event) {
    const el = e.target as HTMLInputElement;
    this.rounds = Number(el.value);
  }

  getInitials = getNodeInitials;
  getBadgeColor = getNodeBadgeColor;
}
