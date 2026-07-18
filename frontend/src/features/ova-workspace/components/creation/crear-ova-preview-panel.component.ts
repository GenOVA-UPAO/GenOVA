import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  type OnChanges,
  output,
  signal,
  type SimpleChanges,
} from "@angular/core";

import { OvaJobsApiService } from "@/core/services/ova-jobs-api.service";
import { HtmlPreviewFrameComponent } from "@/features/ova-workspace/components/shared/html-preview-frame.component";

import type { ResourceVM } from "../../lib/ova-job-view-model";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-crear-ova-preview-panel",
  imports: [HtmlPreviewFrameComponent],
  // host flex: sin esto el custom element no estira en el split y el iframe
  // queda como una franja pequeña arriba del panel derecho.
  host: { class: "flex min-h-0 flex-1 flex-col" },
  template: `
    <section class="flex min-h-0 flex-1 flex-col">
      @if (doneTabs.length > 0) {
        <nav
          aria-label="Recursos generados"
          class="flex flex-wrap gap-1 border-b border-border bg-muted/20 px-3 py-2 shrink-0"
        >
          @for (r of doneTabs; track r) {
            <button
              type="button"
              (click)="selectTab(r.id)"
              class="flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors"
              [class.bg-primary]="active?.id === r.id"
              [class.text-primary-foreground]="active?.id === r.id"
              [class.bg-background]="active?.id !== r.id"
              [class.text-muted-foreground]="active?.id !== r.id"
              [class.border]="active?.id !== r.id"
              [class.border-border]="active?.id !== r.id"
            >
              @if (r.emoji) {
                <span>{{ r.emoji }}</span>
              }
              {{ r.label || r.phase }}
            </button>
          }
          @for (r of pendingTabs; track r) {
            <span
              class="flex items-center gap-1 rounded-md px-3 py-1 text-xs text-muted-foreground/50 border border-dashed border-border"
            >
              <span
                class="inline-block h-2 w-2 rounded-full border border-current animate-pulse"
              ></span>
              {{ r.label || r.phase }}
            </span>
          }
        </nav>
      }

      <div class="flex-1 min-h-0 overflow-hidden">
        @if (active) {
          @if (loading()) {
            <div class="flex h-full items-center justify-center">
              <div
                class="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary"
              ></div>
            </div>
          }
          @if (!loading() && html()) {
            <gn-html-preview-frame
              class="block h-full min-h-0 w-full"
              [html]="html()"
              className="h-full min-h-0 w-full border-0 block"
              height=""
            ></gn-html-preview-frame>
          }
        } @else {
          <div class="flex flex-col h-full items-center justify-center gap-4 px-6 text-center">
            <p class="text-sm font-medium text-muted-foreground">Vista previa del OVA</p>
            <p class="text-xs text-muted-foreground/70">
              Los recursos aparecerán aquí a medida que se generen.
            </p>
          </div>
        }
      </div>

      @if (active) {
        <div
          class="shrink-0 border-t border-border px-3 py-1 bg-muted/20 flex items-center gap-2 min-w-0"
        >
          <span
            class="text-[10px] shrink-0 rounded border px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20"
          >
            {{ active.phaseLabel }}
          </span>
          @if (active.label) {
            <span class="text-xs text-muted-foreground truncate">{{ active.label }}</span>
          }
        </div>
      }
    </section>
  `,
})
export class CrearOvaPreviewPanelComponent implements OnChanges {
  private creation = inject(OvaJobsApiService);

  readonly jobId = input<string | null>(null);
  readonly viewModel = input.required<ResourceVM[]>();
  readonly pinnedId = input<string | null>(null);
  readonly onPin = output<string | null>();

  activeTabId = signal<string | null>(null);
  html = signal("");
  loading = signal(false);

  get doneTabs() {
    return this.viewModel().filter((r) => r.status === "check");
  }

  get pendingTabs() {
    return this.viewModel().filter((r) => r.status !== "check" && r.status !== "X");
  }

  get active() {
    const tabs = this.doneTabs;
    const tabId = this.activeTabId();
    return (
      (tabId ? tabs.find((r) => r.id === tabId) : undefined) ??
      (this.pinnedId() ? tabs.find((r) => r.id === this.pinnedId()) : undefined) ??
      tabs[0] ??
      null
    );
  }

  selectTab(id: string) {
    this.activeTabId.set(id);
    this.onPin.emit(id);
    void this.loadContent(id);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["viewModel"] || changes["pinnedId"]) {
      const active = this.active;
      if (active && this.jobId()) void this.loadContent(active.id);
    }
  }

  private async loadContent(resourceId: string) {
    const jobId = this.jobId();
    if (!jobId) return;
    this.loading.set(true);
    this.html.set("");
    try {
      const data = (await this.creation.getResourceContent(jobId, resourceId)) as {
        html?: string;
        content?: string;
      };
      this.html.set(data.html || data.content || JSON.stringify(data));
    } catch {
      this.html.set("");
    } finally {
      this.loading.set(false);
    }
  }
}
