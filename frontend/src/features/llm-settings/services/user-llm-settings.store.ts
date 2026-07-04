import { inject, Injectable } from "@angular/core";

import { toast } from "@/core/lib/toast";

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

@Injectable({ providedIn: "root" })
export class UserLlmSettingsStore {
  private api = inject(UserLlmSettingsService);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  settings: SettingsMap | null = null;
  catalog: Record<string, CatalogModel[]> = {};
  catalogFull: CatalogModel[] = [];
  fullTotal = 0;
  fullPage = 1;
  fullHasMore = false;
  categories: string[] = [];
  types: string[] = [];
  enabledModels: EnabledModel[] = [];
  defaults: Record<string, EnabledModel> = {};
  bounds: number[] = [30, 300];
  hasOwnLlmKey = false;
  loading = false;
  loadingMore = false;
  saving = false;
  error = "";
  catalogStatus: Record<string, { ok: boolean; last_success_at?: string }> | null = null;
  refreshingCatalog = false;
  searchQuery = "";
  categoryFilter = "all";
  typeFilter = "all";

  readonly taskLabels = TASK_LABELS;
  readonly categoryLabels = CATEGORY_LABELS;
  readonly typeLabels = TYPE_LABELS;

  get catalogEnabled() {
    return Object.values(this.catalog).flat();
  }

  async load(opts: LoadOpts = {}): Promise<void> {
    const append = opts.append ?? false;
    const reqPage = opts.page ?? 1;
    const s = opts.search !== undefined ? opts.search : this.searchQuery;
    const c = opts.category !== undefined ? opts.category : this.categoryFilter;
    const t = opts.type !== undefined ? opts.type : this.typeFilter;

    if (!append) this.loading = true;
    else this.loadingMore = true;
    this.error = "";

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
      this.error = (err as Error)?.message || "No se pudo cargar la configuración.";
    } finally {
      this.loading = false;
      this.loadingMore = false;
    }
  }

  private applyResponse(
    data: Awaited<ReturnType<UserLlmSettingsService["getLlmSettings"]>>,
    append: boolean,
  ): void {
    this.settings = data.settings || {};
    this.hasOwnLlmKey = data.has_own_llm_key ?? false;
    this.catalog = data.catalog || {};
    this.enabledModels = Array.isArray(data.enabled_models) ? data.enabled_models : [];
    this.defaults = data.defaults || {};
    if (Array.isArray(data.timeout_bounds)) this.bounds = data.timeout_bounds;
    if (Array.isArray(data.catalog_full)) {
      this.catalogFull = append ? [...this.catalogFull, ...data.catalog_full] : data.catalog_full;
    }
    this.fullTotal = data.full_total || 0;
    this.fullPage = data.full_page || 1;
    this.fullHasMore = data.full_has_more || false;
    if (Array.isArray(data.categories)) this.categories = data.categories;
    if (Array.isArray(data.types)) this.types = data.types;
    this.catalogStatus = data.catalog_status || null;
  }

  loadMore(): void {
    if (this.loadingMore || !this.fullHasMore) return;
    void this.load({ append: true, page: this.fullPage + 1 });
  }

  handleSearch(q: string): void {
    this.searchQuery = q;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => void this.load({ page: 1 }), 300);
  }

  handleCategory(cat: string): void {
    this.categoryFilter = cat;
    void this.load({ page: 1, category: cat });
  }

  handleType(typeVal: string): void {
    this.typeFilter = typeVal;
    void this.load({ page: 1, type: typeVal });
  }

  isDefaultModel(provider: string, modelId: string): boolean {
    return Object.values(this.defaults).some(
      (d) => d.provider === provider && d.model_id === modelId,
    );
  }

  isModelEnabled(provider: string, modelId: string): boolean {
    return this.enabledModels.some((e) => e.provider === provider && e.model_id === modelId);
  }

  async toggleFavorite(provider: string, modelId: string): Promise<void> {
    const current = [...this.enabledModels];
    const exists = current.some((e) => e.provider === provider && e.model_id === modelId);
    const next = exists
      ? current.filter((e) => !(e.provider === provider && e.model_id === modelId))
      : [...current, { provider, model_id: modelId }];
    this.enabledModels = next;
    try {
      const data = await this.api.saveEnabledModels(next);
      if (Array.isArray(data?.models)) this.enabledModels = data.models;
    } catch (err) {
      this.enabledModels = current;
      toast.error((err as Error)?.message || "No se pudo guardar el favorito.");
    }
  }

  setModel(tipo: string, provider: string, modelId: string): void {
    this.settings = setModelIn(this.settings, tipo, provider, modelId);
  }

  setTipoTimeout(tipo: string, timeoutS: number): void {
    this.settings = setTimeoutIn(this.settings, tipo, timeoutS);
  }

  resetTipo(tipo: string): void {
    this.settings = resetTipoIn(this.settings, tipo, this.defaults, DEFAULT_TIMEOUT);
  }

  setFallback(tipo: string, index: number, provider: string, modelId: string): void {
    this.settings = setFallbackIn(this.settings, tipo, index, provider, modelId);
  }

  addFallback(tipo: string): void {
    this.settings = addFallbackIn(this.settings, tipo);
  }

  removeFallback(tipo: string, index: number): void {
    this.settings = removeFallbackIn(this.settings, tipo, index);
  }

  async save(): Promise<boolean> {
    if (!this.settings) return false;
    this.saving = true;
    try {
      const data = await this.api.saveLlmSettings(this.settings);
      if (data?.settings) this.settings = data.settings;
      toast.success("Configuración de IA guardada.");
      return true;
    } catch (err) {
      toast.error((err as Error)?.message || "No se pudo guardar la configuración.");
      return false;
    } finally {
      this.saving = false;
    }
  }

  async retryRefresh(): Promise<void> {
    this.refreshingCatalog = true;
    try {
      await this.api.refreshLlmCatalog();
      await this.load({});
    } catch {
      toast.error("No se pudo actualizar el catálogo.");
    } finally {
      this.refreshingCatalog = false;
    }
  }
}
