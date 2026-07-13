import { CommonModule } from "@angular/common";
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  viewChild,
} from "@angular/core";

import { IconComponent } from "@/app/layout/components/icon.component";

import { groupByProvider, PROVIDER_LABELS } from "../lib/llm-catalog.utils";
import type { CatalogModel } from "../lib/user-llm-settings.types";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { ModelCatalogFilterRowComponent } from "./model-catalog-filter-row.component";
import { ModelCatalogRowComponent } from "./model-catalog-row.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-model-catalog-browser",
  imports: [CommonModule, ModelCatalogFilterRowComponent, ModelCatalogRowComponent, IconComponent],
  templateUrl: "./model-catalog-browser.component.html",
})
export class ModelCatalogBrowserComponent implements AfterViewInit {
  store = inject(UserLlmSettingsStore);
  providerLabels = PROVIDER_LABELS;
  open = true;
  savingKey: string | null = null;

  readonly sentinel = viewChild<ElementRef<HTMLDivElement>>("sentinel");
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
      { rootMargin: "200px" },
    );
    this.observer.observe(el);
  }

  grouped(): Record<string, CatalogModel[]> {
    return groupByProvider(this.store.catalogFull);
  }

  isEmpty(): boolean {
    return this.store.catalogFull.length === 0 && !this.store.loading;
  }

  async handleToggle(provider: string, modelId: string): Promise<void> {
    const key = `${provider}:${modelId}`;
    this.savingKey = key;
    await this.store.toggleFavorite(provider, modelId);
    this.savingKey = null;
  }
}
