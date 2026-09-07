import { computed, inject, Injectable, signal } from "@angular/core";

import { toast } from "@/core/lib/toast";

import type { GroupBy, SortKey } from "../lib/catalog-sort";
import { CATEGORY_LABELS, TASK_LABELS, TYPE_LABELS } from "../lib/llm-settings-labels";
import {
  addFallbackIn,
  removeFallbackIn,
  resetTipoIn,
  setFallbackIn,
  setModelIn,
  setTimeoutIn,
  type SettingsMap,
} from "../lib/llm-settings-mutations";
import type { CatalogModel, EnabledModel, LoadOpts } from "../lib/user-llm-settings.types";
import { UserLlmSettingsService } from "./user-llm-settings.service";

const DEFAULT_TIMEOUT = 120;

// Estado en signals: la app es zoneless y los consumidores son OnPush — con
// campos de clase mutados desde callbacks async, el modal quedaba en
// "cargando" hasta que un evento no relacionado disparaba CD.
@Injectable({ providedIn: "root" })
export class UserLlmSettingsStore {
  private api = inject(UserLlmSettingsService);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly settings = signal<SettingsMap | null>(null);
  readonly catalog = signal<Record<string, CatalogModel[]>>({});
  readonly catalogFull = signal<CatalogModel[]>([]);
  readonly fullTotal = signal(0);
  readonly fullPage = signal(1);
  readonly fullHasMore = signal(false);
  readonly categories = signal<string[]>([]);
  readonly types = signal<string[]>([]);
  readonly enabledModels = signal<EnabledModel[]>([]);
  readonly defaults = signal<Record<string, EnabledModel>>({});
  readonly bounds = signal<number[]>([30, 300]);
  readonly hasOwnLlmKey = signal(false);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly saving = signal(false);
  /** True once the user changed settings locally and hasn't saved yet. */
  readonly dirty = signal(false);
  readonly error = signal("");
  readonly catalogStatus = signal<Record<string, { ok: boolean; last_success_at?: string }> | null>(
    null,
  );
  readonly refreshingCatalog = signal(false);
  readonly searchQuery = signal("");
  readonly categoryFilter = signal("all");
  readonly typeFilter = signal("all");
  /** Orden del catálogo en cliente (ver loadAllSorted para el por qué). */
  readonly sortKey = signal<SortKey>("default");
  /** Criterio de agrupación visual del catálogo. */
  readonly groupBy = signal<GroupBy>("provider");

  readonly taskLabels = TASK_LABELS;
  readonly categoryLabels = CATEGORY_LABELS;
  readonly typeLabels = TYPE_LABELS;

  readonly catalogEnabled = computed(() => Object.values(this.catalog()).flat());

  async load(opts: LoadOpts = {}): Promise<void> {
    const append = opts.append ?? false;
    const reqPage = opts.page ?? 1;
    const s = opts.search !== undefined ? opts.search : this.searchQuery();
    const c = opts.category !== undefined ? opts.category : this.categoryFilter();
    const t = opts.type !== undefined ? opts.type : this.typeFilter();

    if (!append) this.loading.set(true);
    else this.loadingMore.set(true);
    this.error.set("");

    try {
      const data = await this.api.getLlmSettings({
        search: s,
        category: c,
        type: t,
        page: reqPage,
        page_size: 500,
      });
      this.applyResponse(data, append);
    } catch (err) {
      this.error.set((err as Error)?.message || "No se pudo cargar la configuración.");
    } finally {
      this.loading.set(false);
      this.loadingMore.set(false);
    }
    if (!append && this.sortKey() !== "default" && this.fullHasMore()) {
      void this.loadAllPages();
    }
  }

  /**
   * Ordenar en CLIENTE exige tener el catálogo entero: el servidor pagina y
   * ordenar una sola página daría un orden incorrecto en cuanto el catálogo
   * supere una página. Tras un filtro del servidor (page 1), si hay más
   * páginas y hay orden activo, se terminan de cargar de una vez. El guard
   * evita recursión: el append entra por aquí con `append: true` y no re-dispara.
   */
  private async loadAllPages(): Promise<void> {
    let guard = 0;
    while (this.fullHasMore() && guard < 20) {
      await this.load({ append: true, page: this.fullPage() + 1 });
      guard++;
    }
  }

  private applyResponse(
    data: Awaited<ReturnType<UserLlmSettingsService["getLlmSettings"]>>,
    append: boolean,
  ): void {
    this.settings.set(data.settings || {});
    this.hasOwnLlmKey.set(data.has_own_llm_key ?? false);
    this.catalog.set(data.catalog || {});
    this.enabledModels.set(Array.isArray(data.enabled_models) ? data.enabled_models : []);
    this.defaults.set(data.defaults || {});
    if (Array.isArray(data.timeout_bounds)) this.bounds.set(data.timeout_bounds);
    if (Array.isArray(data.catalog_full)) {
      this.catalogFull.set(
        append ? [...this.catalogFull(), ...data.catalog_full] : data.catalog_full,
      );
    }
    this.fullTotal.set(data.full_total || 0);
    this.fullPage.set(data.full_page || 1);
    this.fullHasMore.set(data.full_has_more || false);
    if (Array.isArray(data.categories)) this.categories.set(data.categories);
    if (Array.isArray(data.types)) this.types.set(data.types);
    this.catalogStatus.set(data.catalog_status || null);
  }

  loadMore(): void {
    if (this.loadingMore() || !this.fullHasMore()) return;
    void this.load({ append: true, page: this.fullPage() + 1 });
  }

  handleSearch(q: string): void {
    this.searchQuery.set(q);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => void this.load({ page: 1 }), 300);
  }

  handleCategory(cat: string): void {
    this.categoryFilter.set(cat);
    void this.load({ page: 1, category: cat });
  }

  handleType(typeVal: string): void {
    this.typeFilter.set(typeVal);
    void this.load({ page: 1, type: typeVal });
  }

  /**
   * Cambia el orden del catálogo. Como se ordena en CLIENTE (para no tocar el
   * backend, que ya pagina), primero se asegura el catálogo completo si hay
   * más de una página en el vuelo.
   */
  handleSort(key: SortKey): void {
    this.sortKey.set(key);
    if (key !== "default" && this.fullHasMore() && !this.loadingMore()) {
      void this.loadAllPages();
    }
  }

  handleGroup(group: GroupBy): void {
    this.groupBy.set(group);
  }

  isDefaultModel(provider: string, modelId: string): boolean {
    return Object.values(this.defaults()).some(
      (d) => d.provider === provider && d.model_id === modelId,
    );
  }

  isModelEnabled(provider: string, modelId: string): boolean {
    return this.enabledModels().some((e) => e.provider === provider && e.model_id === modelId);
  }

  async toggleFavorite(provider: string, modelId: string): Promise<void> {
    const current = [...this.enabledModels()];
    const exists = current.some((e) => e.provider === provider && e.model_id === modelId);
    const next = exists
      ? current.filter((e) => !(e.provider === provider && e.model_id === modelId))
      : [...current, { provider, model_id: modelId }];
    this.enabledModels.set(next);
    try {
      const data = await this.api.saveEnabledModels(next);
      if (Array.isArray(data?.models)) this.enabledModels.set(data.models);
    } catch (err) {
      this.enabledModels.set(current);
      toast.error((err as Error)?.message || "No se pudo guardar el favorito.");
    }
  }

  setModel(tipo: string, provider: string, modelId: string): void {
    this.settings.set(setModelIn(this.settings(), tipo, provider, modelId));
    this.dirty.set(true);
  }

  setTipoTimeout(tipo: string, timeoutS: number): void {
    this.settings.set(setTimeoutIn(this.settings(), tipo, timeoutS));
    this.dirty.set(true);
  }

  resetTipo(tipo: string): void {
    this.settings.set(resetTipoIn(this.settings(), tipo, this.defaults(), DEFAULT_TIMEOUT));
    this.dirty.set(true);
  }

  setFallback(tipo: string, index: number, provider: string, modelId: string): void {
    this.settings.set(setFallbackIn(this.settings(), tipo, index, provider, modelId));
    this.dirty.set(true);
  }

  addFallback(tipo: string): void {
    this.settings.set(addFallbackIn(this.settings(), tipo));
    this.dirty.set(true);
  }

  removeFallback(tipo: string, index: number): void {
    this.settings.set(removeFallbackIn(this.settings(), tipo, index));
    this.dirty.set(true);
  }

  async save(): Promise<boolean> {
    const current = this.settings();
    if (!current) return false;
    this.saving.set(true);
    try {
      const data = await this.api.saveLlmSettings(current);
      if (data?.settings) this.settings.set(data.settings);
      this.dirty.set(false);
      toast.success("Configuración de IA guardada.");
      return true;
    } catch (err) {
      toast.error((err as Error)?.message || "No se pudo guardar la configuración.");
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  async retryRefresh(): Promise<void> {
    this.refreshingCatalog.set(true);
    try {
      await this.api.refreshLlmCatalog();
      await this.load({});
    } catch {
      toast.error("No se pudo actualizar el catálogo.");
    } finally {
      this.refreshingCatalog.set(false);
    }
  }
}
