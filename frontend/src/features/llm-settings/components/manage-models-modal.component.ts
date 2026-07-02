import { CommonModule } from "@angular/common";
import {
  Component,
  inject,
  type AfterViewInit,
  type ElementRef,
  input,
  output,
  viewChild,
} from "@angular/core";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { ModalDismissDirective } from "@/core/directives/modal-dismiss.directive";
import { groupByProvider, PROVIDER_LABELS } from "../lib/llm-catalog.utils";
import type { CatalogModel } from "../lib/user-llm-settings.types";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { ConnectProviderModalComponent } from "./connect-provider-modal.component";
import { ManageModelRowComponent } from "./manage-model-row.component";
import { ManageModelsToolbarComponent } from "./manage-models-toolbar.component";

@Component({
  selector: "gn-manage-models-modal",
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    ModalDismissDirective,
    ConnectProviderModalComponent,
    ManageModelRowComponent,
    ManageModelsToolbarComponent,
  ],
  templateUrl: "./manage-models-modal.component.html",
})
export class ManageModelsModalComponent implements AfterViewInit {
  readonly open = input(false);
  readonly onClose = output<void>();
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
          this.store.fullHasMore &&
          !this.store.loadingMore &&
          !this.store.loading
        ) {
          this.store.loadMore();
        }
      },
      { rootMargin: "200px", root: this.scrollRoot()?.nativeElement ?? null },
    );
    this.observer.observe(el);
  }

  grouped(): Record<string, CatalogModel[]> {
    return groupByProvider(this.store.catalogFull);
  }

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

  dismissModal = (): void => {
    this.onClose.emit();
  };
}
