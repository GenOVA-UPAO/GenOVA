import { CommonModule } from "@angular/common";
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  input,
  output,
  viewChild,
} from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { ModalDismissDirective } from "@/core/directives/modal-dismiss.directive";

import { groupModels, sortModels } from "../lib/catalog-sort";
import { PROVIDER_LABELS } from "../lib/llm-catalog.utils";
import type { CatalogModel } from "../lib/user-llm-settings.types";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { ConnectProviderModalComponent } from "./connect-provider-modal.component";
import { ManageModelRowComponent } from "./manage-model-row.component";
import { ManageModelsToolbarComponent } from "./manage-models-toolbar.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-manage-models-modal",
  imports: [
    CommonModule,
    ButtonComponent,
    ModalDismissDirective,
    ConnectProviderModalComponent,
    ManageModelRowComponent,
    ManageModelsToolbarComponent,
    IconComponent,
  ],
  templateUrl: "./manage-models-modal.component.html",
})
export class ManageModelsModalComponent implements AfterViewInit {
  readonly open = input(false);
  readonly onClose = output();
  readonly onGoToApiKeys = output<string | undefined>();

  store = inject(UserLlmSettingsStore);
  providerLabels = PROVIDER_LABELS;
  connectOpen = false;
  localSearch = "";

  readonly sentinel = viewChild<ElementRef<HTMLDivElement>>("sentinel");
  readonly scrollRoot = viewChild<ElementRef<HTMLDivElement>>("scrollRoot");
  private observer: IntersectionObserver | null = null;

  ngAfterViewInit(): void {
    this.setupObserver();
  }

  private setupObserver(): void {
    const el = this.sentinel()?.nativeElement;
    if (!el) return;
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry?.isIntersecting &&
          this.store.fullHasMore() &&
          !this.store.loadingMore() &&
          !this.store.loading()
        ) {
          this.store.loadMore();
        }
      },
      { rootMargin: "200px", root: this.scrollRoot()?.nativeElement ?? null },
    );
    this.observer.observe(el);
  }

  /** Grupos a pintar: orden en cliente (catálogo ya completo si hay sort activo).
   *
   * `computed` y no un método: la plantilla llama a `grouped()` dos veces por
   * ciclo de detección y aquí se ordenan y agrupan ~430 modelos.
   */
  readonly grouped = computed<{ key: string; label: string; models: CatalogModel[] }[]>(() => {
    const ordenados = sortModels(this.store.catalogFull(), this.store.sortKey());
    return groupModels(
      ordenados,
      this.store.groupBy(),
      this.providerLabels,
      this.store.sortKey() !== "default",
    );
  });

  onSearchChange(v: string): void {
    this.localSearch = v;
    this.store.handleSearch(v);
  }

  handleConnectSelect(provider: string): void {
    this.connectOpen = false;
    this.onGoToApiKeys.emit(provider);
  }

  async handleToggle(provider: string, modelId: string): Promise<void> {
    await this.store.toggleFavorite(provider, modelId);
  }

  clearFilters(): void {
    this.localSearch = "";
    this.store.handleSearch("");
    this.store.handleCategory("all");
    this.store.handleType("all");
  }

  dismissModal = (): void => {
    this.onClose.emit();
  };
}
