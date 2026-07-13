import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  input,
  type OnDestroy,
  output,
} from "@angular/core";

import { IconComponent } from "@/app/layout/components/icon.component";

import { clampRatio, saveSplitRatio, SPLIT_MAX, SPLIT_MIN } from "../../lib/workspace-utils";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-workspace-resizable-divider",
  imports: [IconComponent],
  template: `
    <div
      class="hidden sm:flex w-3 shrink-0 cursor-col-resize items-center justify-center group outline-none transition-colors hover:bg-primary/10 active:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring/50"
      (mousedown)="startDrag($event)"
      role="separator"
      aria-label="Ajustar paneles"
      aria-orientation="vertical"
      [attr.aria-valuenow]="ariaValueNow"
      [attr.aria-valuemin]="ariaValueMin"
      [attr.aria-valuemax]="ariaValueMax"
      tabindex="0"
      (keydown)="handleKeyDown($event)"
    >
      <div class="relative flex items-center justify-center">
        <div
          class="h-16 w-0.5 rounded-full bg-border group-hover:bg-primary/40 transition-colors"
        ></div>
        <gn-icon
          name="dots-six-vertical"
          size="text-sm"
          class="absolute rounded bg-background text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </div>
    </div>
  `,
})
export class WorkspaceResizableDividerComponent implements OnDestroy {
  readonly ratio = input(0.38);
  readonly containerRef = input.required<HTMLElement | null>();
  readonly ratioChange = output<number>();

  dragging = false;
  private rafId = 0;
  private pendingX = 0;
  private lastRatio: number | null = null;

  get ariaValueNow() {
    return Math.round(this.ratio() * 100);
  }
  get ariaValueMin() {
    return Math.round(SPLIT_MIN * 100);
  }
  get ariaValueMax() {
    return Math.round(SPLIT_MAX * 100);
  }

  nudge(delta: number) {
    const next = clampRatio(this.ratio() + delta);
    this.ratioChange.emit(next);
    saveSplitRatio(next);
  }

  startDrag(e: MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    this.dragging = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.nudge(-0.02);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this.nudge(0.02);
    }
  }

  @HostListener("window:mousemove", ["$event"])
  onMove(e: MouseEvent) {
    if (!this.dragging) return;
    this.pendingX = e.clientX;
    if (!this.rafId) {
      this.rafId = globalThis.requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  @HostListener("window:mouseup")
  onUp() {
    if (!this.dragging) return;
    this.dragging = false;

    if (this.rafId) {
      globalThis.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    if (this.lastRatio !== null) saveSplitRatio(this.lastRatio);
  }

  private flush() {
    this.rafId = 0;
    const containerRef = this.containerRef();
    if (!this.dragging || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    this.lastRatio = clampRatio((this.pendingX - rect.left) / rect.width);
    this.ratioChange.emit(this.lastRatio);
  }

  ngOnDestroy() {
    if (this.rafId) {
      globalThis.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.dragging) {
      this.dragging = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
  }
}
