import { Component, inject, type OnInit } from "@angular/core";
import { Router } from "@angular/router";
import {
  TabsComponent,
  TabsContentComponent,
  TabsListComponent,
  TabsTriggerComponent,
} from "@/core/components/ui/tabs.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { toast } from "@/core/lib/toast";
import { ModelAssignmentPanelComponent } from "../components/model-assignment-panel.component";
import { ManageModelsModalComponent } from "../components/manage-models-modal.component";
import { ModelCatalogBrowserComponent } from "../components/model-catalog-browser.component";
import { PlatformApiKeysCardComponent } from "../components/platform-api-keys-card.component";
import { PlatformCapabilitiesCardComponent } from "../components/platform-capabilities-card.component";
import { PlatformNodesCardComponent } from "../components/platform-nodes-card.component";
import { UserApiKeysCardComponent } from "../components/user-api-keys-card.component";
import { type Draft, toDraft, toPayload } from "../lib/llmConfigDraft";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { PlatformSettingsService } from "../services/platform-settings.service";
import { AuthService } from "@/core/auth/auth.service";
import type { ChipModel } from "../lib/model-task-card.helpers";

function canAccessModels(user: ReturnType<AuthService["user"]>): boolean {
  if (!user) return true;
  if (user.role === "administrador") return true;
  const perms = user.permissions ?? [];
  return perms.includes("ai:models:self") || perms.includes("ai:models:platform");
}

@Component({
  selector: "gn-models-page",
  standalone: true,
  imports: [
    ButtonComponent,
    ModelAssignmentPanelComponent,
    ManageModelsModalComponent,
    ModelCatalogBrowserComponent,
    PlatformApiKeysCardComponent,
    PlatformCapabilitiesCardComponent,
    PlatformNodesCardComponent,
    UserApiKeysCardComponent,
    TabsComponent,
    TabsListComponent,
    TabsTriggerComponent,
    TabsContentComponent,
  ],
  templateUrl: "./models-page.component.html",
})
export class ModelsPageComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private adminSettings = inject(PlatformSettingsService);
  store = inject(UserLlmSettingsStore);

  isAdmin = false;
  manageOpen = false;
  activeTab = "tasks";
  adminDraft: Draft | null = null;
  adminTasks: string[] = [];
  adminModels: ChipModel[] = [];
  adminSaving = false;
  adminLoading = true;

  async ngOnInit() {
    const user = (await this.auth.revalidate()) ?? this.auth.user();
    if (user && !canAccessModels(user)) {
      void this.router.navigate(["/dashboard"], { replaceUrl: true });
      return;
    }
    this.isAdmin = user?.role === "administrador";
    await this.store.load({ search: "", category: "all", page: 1 });
    await this.loadAdminConfig();
  }

  private buildDraftFromStoreDefaults(): Draft {
    const draft: Draft = {};
    for (const t of this.adminTasks) {
      if (t === "imagen" || t === "video") continue;
      const d = this.store.defaults[t];
      draft[t] = {
        default: d
          ? { provider: d.provider, model_id: d.model_id }
          : { provider: "", model_id: "" },
        fallbacks: [],
      };
    }
    return draft;
  }

  private async loadAdminConfig() {
    this.adminLoading = true;
    const baseTasks = ["texto", "codigo", "orquestador", "razonamiento"];
    this.adminTasks = [...new Set([...baseTasks, "imagen", "video"])];

    if (!this.isAdmin) {
      this.adminModels = (this.store.catalogFull ?? []).filter(
        (m) => (m as { active?: boolean }).active !== false,
      ) as ChipModel[];
      this.adminDraft = this.buildDraftFromStoreDefaults();
      this.adminLoading = false;
      return;
    }

    try {
      const data = (await this.adminSettings.getAdminLlmConfig()) as {
        tasks?: string[];
        catalog?: ChipModel[];
        config?: Parameters<typeof toDraft>[0];
      };
      const tasks = data?.tasks ?? baseTasks;
      this.adminTasks = [...new Set([...tasks, "imagen", "video"])];
      this.adminModels = (
        data?.catalog?.length ? data.catalog : (this.store.catalogFull ?? [])
      ).filter((m) => (m as { active?: boolean }).active !== false) as ChipModel[];
      this.adminDraft = toDraft(data?.config, this.adminTasks);
    } catch {
      this.adminTasks = ["texto", "codigo", "orquestador", "razonamiento", "imagen", "video"];
      this.adminModels = [];
      this.adminDraft = null;
    } finally {
      this.adminLoading = false;
    }
  }

  onDraftChange(next: Draft) {
    this.adminDraft = next;
  }

  async saveAdminPlatform() {
    if (!this.adminDraft) return;
    this.adminSaving = true;
    try {
      await this.adminSettings.saveAdminLlmConfig(toPayload(this.adminDraft, this.adminTasks));
      toast.success("Configuración de plataforma guardada.");
    } catch (e) {
      toast.error((e as Error)?.message || "No se pudo guardar.");
    } finally {
      this.adminSaving = false;
    }
  }

  openManageModels(): void {
    this.manageOpen = true;
  }

  goToApiKeys(_provider?: string): void {
    this.manageOpen = false;
    this.activeTab = "apikeys";
  }
}
