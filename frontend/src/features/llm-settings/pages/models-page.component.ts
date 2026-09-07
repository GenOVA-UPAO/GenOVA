import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  signal,
} from "@angular/core";
import { Router } from "@angular/router";

import { AuthService } from "@/core/auth/auth.service";
import { ButtonComponent } from "@/core/components/ui/button.component";
import {
  TabsComponent,
  TabsContentComponent,
  TabsListComponent,
  TabsTriggerComponent,
} from "@/core/components/ui/tabs.component";
import { toast } from "@/core/lib/toast";

import { ManageModelsModalComponent } from "../components/manage-models-modal.component";
import { ModelsMasterDetailComponent } from "../components/models-master-detail.component";
import { PlatformApiKeysCardComponent } from "../components/platform-api-keys-card.component";
import { PlatformCapabilitiesCardComponent } from "../components/platform-capabilities-card.component";
import { PlatformNodesCardComponent } from "../components/platform-nodes-card.component";
import { UserApiKeysCardComponent } from "../components/user-api-keys-card.component";
import { type Draft, toDraft, toPayload } from "../lib/llm-config-draft";
import type { ChipModel } from "../lib/model-task-card.helpers";
import { PlatformSettingsService } from "../services/platform-settings.service";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";

function canAccessModels(user: ReturnType<AuthService["user"]>): boolean {
  if (!user) return true;
  if (user.role === "administrador") return true;
  const perms = user.permissions ?? [];
  return perms.includes("ai:models:self") || perms.includes("ai:models:platform");
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-models-page",
  imports: [
    ButtonComponent,
    ModelsMasterDetailComponent,
    ManageModelsModalComponent,
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

  readonly isAdmin = signal(false);
  readonly manageOpen = signal(false);
  readonly activeTab = signal("models");
  readonly adminDraft = signal<Draft | null>(null);
  readonly adminTasks = signal<string[]>([]);
  readonly adminModels = signal<ChipModel[]>([]);
  readonly adminSaving = signal(false);
  readonly adminLoading = signal(true);
  private readonly adminBaseline = signal("");

  // Gateado por adminLoading: hasta que la config termina de cargar, draft y
  // baseline divergen transitoriamente y el strip mostraba "Cambios sin
  // guardar: Sí"; ngOnInit fija el baseline real al finalizar la carga.
  readonly adminDirty = computed(
    () => !this.adminLoading() && this.adminBaseline() !== JSON.stringify(this.adminDraft()),
  );
  readonly dirty = computed(() => this.store.dirty() || this.adminDirty());

  readonly connectedProviders = computed(() => {
    const status = this.store.catalogStatus() ?? {};
    const entries = Object.values(status);
    return { ok: entries.filter((s) => s.ok).length, total: entries.length };
  });

  async ngOnInit() {
    const user = (await this.auth.revalidate()) ?? this.auth.user();
    if (user && !canAccessModels(user)) {
      void this.router.navigate(["/dashboard"], { replaceUrl: true });
      return;
    }
    this.isAdmin.set(user?.role === "administrador");
    await this.store.load({ search: "", category: "all", page: 1 });
    await this.loadAdminConfig();
    this.adminBaseline.set(JSON.stringify(this.adminDraft()));
  }

  private buildDraftFromStoreDefaults(): Draft {
    const draft: Draft = {};
    for (const t of this.adminTasks()) {
      if (t === "imagen" || t === "video") continue;
      const d = this.store.defaults()[t];
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
    this.adminLoading.set(true);
    const baseTasks = ["texto", "codigo", "orquestador", "razonamiento"];
    this.adminTasks.set([...new Set([...baseTasks, "imagen", "video"])]);

    if (!this.isAdmin()) {
      this.adminModels.set(
        (this.store.catalogFull() ?? []).filter(
          (m) => (m as { active?: boolean }).active !== false,
        ),
      );
      this.adminDraft.set(this.buildDraftFromStoreDefaults());
      this.adminLoading.set(false);
      return;
    }

    try {
      const data = (await this.adminSettings.getAdminLlmConfig()) as {
        tasks?: string[];
        catalog?: ChipModel[];
        config?: Parameters<typeof toDraft>[0];
      };
      const tasks = data?.tasks ?? baseTasks;
      this.adminTasks.set([...new Set([...tasks, "imagen", "video"])]);
      this.adminModels.set(
        (data?.catalog?.length ? data.catalog : (this.store.catalogFull() ?? [])).filter(
          (m) => (m as { active?: boolean }).active !== false,
        ),
      );
      this.adminDraft.set(toDraft(data?.config, this.adminTasks()));
    } catch {
      this.adminTasks.set(["texto", "codigo", "orquestador", "razonamiento", "imagen", "video"]);
      this.adminModels.set([]);
      this.adminDraft.set(null);
    } finally {
      this.adminLoading.set(false);
    }
  }

  onDraftChange(next: Draft) {
    this.adminDraft.set(next);
  }

  private async saveAdminPlatform() {
    const draft = this.adminDraft();
    if (!draft) return;
    await this.adminSettings.saveAdminLlmConfig(toPayload(draft, this.adminTasks()));
    this.adminBaseline.set(JSON.stringify(draft));
  }

  async saveAll() {
    this.adminSaving.set(true);
    try {
      if (this.adminDirty()) await this.saveAdminPlatform();
      if (this.store.dirty()) await this.store.save();
      toast.success("Cambios guardados.");
    } catch (e) {
      toast.error((e as Error)?.message || "No se pudo guardar.");
    } finally {
      this.adminSaving.set(false);
    }
  }

  discardChanges() {
    this.adminDraft.set(this.adminBaseline() ? (JSON.parse(this.adminBaseline()) as Draft) : null);
    this.store.dirty.set(false);
  }

  openManageModels(): void {
    this.manageOpen.set(true);
  }

  goToApiKeys(_provider?: string): void {
    this.manageOpen.set(false);
    this.activeTab.set("credentials");
  }
}
